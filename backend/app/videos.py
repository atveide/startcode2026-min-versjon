"""Adresseavisen's own vertical videos, shown as news items in the same feed as the stories.

`data/videos.json` is the manifest and is in git: public facts about each clip from the archive's
LES_MEG.txt (caption, publication time, the original URL), the title, what ffprobe measured and
where every file came from. The clips themselves stay out of git, in VIDEO_MEDIA_DIR: the
originals as they came, and our H.264 copy for the web with a poster frame, both named by the
clip's stable id. `python -m app.import_videos <zip>` fills the folder and writes the manifest.

The backend serves the clips from that folder (GET /api/media/video/<file>). Where this machine has
no copy (the backend on Render, a teammate's laptop), it points to the public copy that the
frontend's build takes from the same folder and Netlify serves, VIDEO_PUBLIC_URL. Without either,
the clip is left out of the feed, which then shows only the stories.
"""

import json
import re
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from app.config import settings

BACKEND_DIR = Path(__file__).parent.parent
MANIFEST_FILE = Path(__file__).parent / "data" / "videos.json"
# Only `<id>.mp4` (our web copy) and `<id>.jpg` (its poster) are ever served, for ids in the manifest.
MEDIA_FILE = re.compile(r"^([a-z]+-[0-9]+)\.(mp4|jpg)$")
MEDIA_TYPES = {"mp4": "video/mp4", "jpg": "image/jpeg"}


class Original(BaseModel):
    """The file as it came in the archive, kept unchanged in VIDEO_MEDIA_DIR/original/."""

    archive: str
    file: str
    sha256: str
    bytes: int
    video: str  # codec, tag, size, frame rate and pixel format, as ffprobe reports them
    audio: str | None


class WebCopy(BaseModel):
    """Our copy for the browser: H.264/AAC, yuv420p, moov first."""

    video: str
    audio: str | None
    bytes: int
    faststart: bool


class ManifestVideo(BaseModel):
    id: str  # «tiktok-<the platform's video id>», stable across imports
    title: str
    titleSource: str
    description: str | None = None  # the caption from LES_MEG.txt, without hashtags
    publishedAt: str
    source: str = "Adresseavisen"
    platform: str
    account: str
    sourceUrl: str
    # A story in the Adressa import that this clip belongs to. Null until the link is documented.
    articleId: str | None = None
    duration: float
    width: int
    height: int
    original: Original
    web: WebCopy


class Manifest(BaseModel):
    importedAt: str | None = None
    videos: list[ManifestVideo] = []


class Video(BaseModel):
    """A clip as the app gets it."""

    id: str
    title: str
    description: str | None
    publishedAt: str
    source: str
    platform: str
    sourceUrl: str
    articleId: str | None
    duration: float
    width: int
    height: int
    src: str
    poster: str


class FeedEntry(BaseModel):
    type: Literal["article", "video"]
    id: str


def media_dir() -> Path:
    folder = Path(settings.video_media_dir)
    return folder if folder.is_absolute() else BACKEND_DIR / folder


def load_manifest(path: Path | None = None) -> Manifest:
    try:
        return Manifest.model_validate(json.loads((path or MANIFEST_FILE).read_text("utf-8")))
    except (OSError, ValueError):
        return Manifest()


def media_url(name: str) -> str:
    return f"/api/media/video/{name}"


def available_videos() -> list[Video]:
    """The manifest's clips: served from this machine when it has the files, else the public copy."""
    folder = media_dir()
    public = settings.video_public_url.rstrip("/")
    found = []
    for v in load_manifest().videos:
        if (folder / f"{v.id}.mp4").is_file() and (folder / f"{v.id}.jpg").is_file():
            src, poster = media_url(f"{v.id}.mp4"), media_url(f"{v.id}.jpg")
        elif public:
            src, poster = f"{public}/{v.id}.mp4", f"{public}/{v.id}.jpg"
        else:
            continue
        fields = v.model_dump(exclude={"titleSource", "account", "original", "web"})
        found.append(Video(**fields, src=src, poster=poster))
    return sorted(found, key=lambda v: v.publishedAt, reverse=True)


def media_path(name: str) -> tuple[Path, str] | None:
    """A clip's web copy or poster, only by its exact name and only for clips in the manifest."""
    match = MEDIA_FILE.match(name)
    if match is None or match[1] not in {v.id for v in load_manifest().videos}:
        return None
    path = media_dir() / name
    return (path, MEDIA_TYPES[match[2]]) if path.is_file() else None


def build_feed(story_ids: list[str], videos: list[Video]) -> list[FeedEntry]:
    """One stream of stories and videos, in a stable order.

    The stories keep their order (newest first) and the videos, newest first, are spread evenly
    between them, as far as there are stories to spread them over. The feed opens on a story. A
    video linked to a story never sits right next to it. The same input always gives the same
    order: nothing is shuffled.
    """
    stories = [FeedEntry(type="article", id=i) for i in story_ids]
    clips = sorted(videos, key=lambda v: v.publishedAt, reverse=True)
    if not stories or not clips:
        return stories + [FeedEntry(type="video", id=v.id) for v in clips]

    # Video number i goes after story number round((i + 1) * stories / (videos + 1)).
    after = [max(1, round((i + 1) * len(stories) / (len(clips) + 1))) for i in range(len(clips))]
    feed: list[FeedEntry] = []
    pending = list(zip(after, clips))
    for n, story in enumerate(stories, start=1):
        feed.append(story)
        while pending and pending[0][0] <= n:
            feed.append(FeedEntry(type="video", id=pending.pop(0)[1].id))

    links = {v.id: v.articleId for v in clips if v.articleId}
    for video_id, article_id in links.items():
        feed = _apart(feed, FeedEntry(type="video", id=video_id), article_id)
    return feed


def _apart(feed: list[FeedEntry], video: FeedEntry, article_id: str) -> list[FeedEntry]:
    """Move the video to the nearest place, later first, where it is not next to its story."""

    def clashes(entries: list[FeedEntry], i: int) -> bool:
        near = entries[max(0, i - 1) : i] + entries[i + 1 : i + 2]
        return any(e.type == "article" and e.id == article_id for e in near)

    start = feed.index(video)
    if not clashes(feed, start):
        return feed
    rest = feed[:start] + feed[start + 1 :]
    for distance in range(1, len(feed)):
        for place in (start + distance, start - distance):
            if 0 <= place <= len(rest):
                candidate = rest[:place] + [video] + rest[place:]
                if not clashes(candidate, place):
                    return candidate
    return feed
