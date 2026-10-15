import io
import json
import stat
import zipfile

import pytest
from fastapi.testclient import TestClient

from app import videos
from app.config import settings
from app.import_videos import (
    extract,
    faststart,
    parse_listing,
    safe_members,
    title_from,
    without_hashtags,
)
from app.main import app
from app.videos import FeedEntry, Video, build_feed, load_manifest

client = TestClient(app)

LISTING = """Adresseavisen – TikTok-videoer fra uke 42, 2026

Videooversikt:

2026-10-12_Skudd_gjennom_verandadora.mp4
Publisert: 2026-10-12T15:00:00+02:00
Barna satt i stua da det gikk et skudd gjennom verandadøra. #adressa #politi
https://www.tiktok.com/@adresseavisen/video/7695749568738118934

2026-10-14_Student_med_reklameide.mp4
Publisert: 2026-10-14T13:26:06+02:00
En idé rett foran nesa på folk. #adressa #student #trondheim
https://www.tiktok.com/@adresseavisen/video/7696483302638636291
"""

CLIP = {
    "id": "tiktok-1",
    "title": "Skudd gjennom verandadøra",
    "titleSource": "Filnavnet i arkivet",
    "description": "Barna satt i stua.",
    "publishedAt": "2026-10-12T15:00:00+02:00",
    "platform": "TikTok",
    "account": "@adresseavisen",
    "sourceUrl": "https://www.tiktok.com/@adresseavisen/video/1",
    "articleId": None,
    "duration": 41.9,
    "width": 1080,
    "height": 1920,
    "original": {
        "archive": "a.zip",
        "file": "2026-10-12_Skudd.mp4",
        "sha256": "0" * 64,
        "bytes": 10,
        "video": "hevc/hvc1 1080×1920 25 fps yuv420p",
        "audio": "aac/mp4a",
    },
    "web": {"video": "h264/avc1", "audio": "aac/mp4a", "bytes": 10, "faststart": True},
}


def video(id: str, published: str, article: str | None = None) -> Video:
    return Video(
        id=id,
        title=id,
        description=None,
        publishedAt=published,
        source="Adresseavisen",
        platform="TikTok",
        sourceUrl=f"https://www.tiktok.com/@adresseavisen/video/{id}",
        articleId=article,
        duration=10,
        width=1080,
        height=1920,
        src=f"/api/media/video/{id}.mp4",
        poster=f"/api/media/video/{id}.jpg",
    )


@pytest.fixture
def media(tmp_path, monkeypatch):
    """A manifest with one clip, and its web copy and poster on disk."""
    folder = tmp_path / "media"
    folder.mkdir()
    (folder / "tiktok-1.mp4").write_bytes(bytes(range(256)) * 40)
    (folder / "tiktok-1.jpg").write_bytes(b"\xff\xd8\xff\xe0" + b"0" * 64)
    (folder / "secret.txt").write_text("nei")
    manifest = tmp_path / "videos.json"
    second = {**CLIP, "id": "tiktok-2", "publishedAt": "2026-10-13T19:00:00+02:00"}
    manifest.write_text(json.dumps({"importedAt": None, "videos": [CLIP, second]}))
    monkeypatch.setattr(settings, "video_media_dir", str(folder))
    monkeypatch.setattr(videos, "MANIFEST_FILE", manifest)
    return folder


def test_committed_manifest_is_valid_and_has_no_unverified_links() -> None:
    manifest = load_manifest()
    for clip in manifest.videos:
        assert clip.id.startswith("tiktok-")
        assert clip.sourceUrl.startswith("https://www.tiktok.com/@adresseavisen/video/")
        assert clip.sourceUrl.endswith(clip.id.removeprefix("tiktok-"))
        # None of the clips has a documented link to a story in the import yet.
        assert clip.articleId is None
        assert clip.web.faststart and clip.web.video.startswith("h264/avc1")


def test_only_clips_with_files_on_disk_reach_the_feed(media) -> None:
    body = client.get("/api/stories").json()
    assert [v["id"] for v in body["videos"]] == ["tiktok-1"]
    clip = body["videos"][0]
    assert clip["src"] == "/api/media/video/tiktok-1.mp4"
    assert clip["poster"] == "/api/media/video/tiktok-1.jpg"
    assert clip["articleId"] is None
    assert "original" not in clip and "account" not in clip
    assert {"type": "video", "id": "tiktok-1"} in body["feed"]
    assert [e["id"] for e in body["feed"] if e["type"] == "article"] == [
        s["id"] for s in body["stories"]
    ]


def test_without_video_files_the_feed_is_the_stories() -> None:
    body = client.get("/api/stories").json()
    assert body["videos"] == []
    assert body["feed"] == [{"type": "article", "id": s["id"]} for s in body["stories"]]


def test_video_is_served_with_its_type_and_byte_ranges(media) -> None:
    full = client.get("/api/media/video/tiktok-1.mp4")
    assert full.status_code == 200
    assert full.headers["content-type"] == "video/mp4"
    assert full.headers["accept-ranges"] == "bytes"

    part = client.get("/api/media/video/tiktok-1.mp4", headers={"Range": "bytes=100-199"})
    assert part.status_code == 206
    assert part.headers["content-range"] == f"bytes 100-199/{256 * 40}"
    assert part.content == (bytes(range(256)) * 40)[100:200]

    poster = client.get("/api/media/video/tiktok-1.jpg")
    assert poster.headers["content-type"] == "image/jpeg"


@pytest.mark.parametrize(
    "name",
    ["tiktok-2.mp4", "tiktok-9.mp4", "secret.txt", "..%2Fvideos.json", "tiktok-1.mov", "x.mp4"],
)
def test_only_known_clips_are_served(media, name: str) -> None:
    # tiktok-2 is in the manifest but has no files here.
    assert client.get(f"/api/media/video/{name}").status_code == 404


def test_feed_spreads_videos_between_stories_in_a_stable_order() -> None:
    stories = [f"a{n}" for n in range(1, 9)]
    clips = [video(f"v{n}", f"2026-10-1{n}T12:00:00+02:00") for n in range(1, 5)]
    feed = build_feed(stories, clips)
    kinds = "".join("V" if e.type == "video" else "A" for e in feed)
    assert kinds == "AAVAVAAVAVAA"
    # Newest video first, stories in their own order.
    assert [e.id for e in feed if e.type == "video"] == ["v4", "v3", "v2", "v1"]
    assert [e.id for e in feed if e.type == "article"] == stories
    assert build_feed(stories, list(reversed(clips))) == feed


def test_feed_works_with_no_one_or_many_videos() -> None:
    assert build_feed(["a1", "a2"], []) == [FeedEntry(type="article", id=i) for i in ["a1", "a2"]]
    assert [e.id for e in build_feed([], [video("v1", "2026-10-12")])] == ["v1"]
    one = build_feed(["a1", "a2", "a3"], [video("v1", "2026-10-12")])
    assert [e.id for e in one] == ["a1", "a2", "v1", "a3"]
    many = build_feed(["a1", "a2"], [video(f"v{n}", f"2026-10-1{n}") for n in range(1, 6)])
    assert many[0].type == "article" and len(many) == 7


def test_video_never_sits_next_to_its_own_story() -> None:
    stories = ["a1", "a2", "a3", "a4"]
    linked = video("v1", "2026-10-12", article="a2")
    feed = build_feed(stories, [linked])
    i = [e.id for e in feed].index("v1")
    neighbours = {feed[j].id for j in (i - 1, i + 1) if 0 <= j < len(feed)}
    assert "a2" not in neighbours
    assert [e.id for e in feed if e.type == "article"] == stories


def test_listing_gives_time_caption_and_source() -> None:
    items = parse_listing(LISTING)
    assert [i.file for i in items] == [
        "2026-10-12_Skudd_gjennom_verandadora.mp4",
        "2026-10-14_Student_med_reklameide.mp4",
    ]
    assert items[0].published_at == "2026-10-12T15:00:00+02:00"
    assert items[0].url.endswith("/7695749568738118934")
    assert without_hashtags(items[1].caption) == "En idé rett foran nesa på folk."
    assert title_from(items[0].file) == "Skudd gjennom verandadora"


def _zip(entries: dict[str, bytes], link: str | None = None) -> io.BytesIO:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, data in entries.items():
            archive.writestr(name, data)
        if link:
            info = zipfile.ZipInfo(link)
            info.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(info, "/etc/passwd")
    buffer.seek(0)
    return buffer


@pytest.mark.parametrize(
    "entries,link",
    [
        ({"../ut.mp4": b"x"}, None),
        ({"/abs/ut.mp4": b"x"}, None),
        ({"mappe/skript.sh": b"x"}, None),
        ({"mappe/a.mp4": b"x", "annen/a.mp4": b"y"}, None),
        ({"mappe/a.mp4": b"x"}, "mappe/lenke.mp4"),
    ],
)
def test_unsafe_archives_are_refused(entries, link) -> None:
    with zipfile.ZipFile(_zip(entries, link)) as archive, pytest.raises(ValueError):
        safe_members(archive)


def test_extract_keeps_files_flat_and_never_overwrites_other_content(tmp_path) -> None:
    archive = tmp_path / "a.zip"
    entries = {"uke/a.mp4": b"film", "uke/LES_MEG.txt": b"tekst", "__MACOSX/uke/._a.mp4": b"x"}
    archive.write_bytes(_zip(entries).getvalue())
    target = tmp_path / "original"
    assert sorted(p.name for p in extract(archive, target)) == ["LES_MEG.txt", "a.mp4"]
    assert extract(archive, target)  # the same files again are fine
    (target / "a.mp4").write_bytes(b"endret")
    with pytest.raises(ValueError):
        extract(archive, target)


def test_faststart_reads_the_box_order(tmp_path) -> None:
    def box(kind: bytes, size: int = 16) -> bytes:
        return size.to_bytes(4, "big") + kind + b"\0" * (size - 8)

    first = tmp_path / "first.mp4"
    first.write_bytes(box(b"ftyp") + box(b"moov") + box(b"mdat"))
    last = tmp_path / "last.mp4"
    last.write_bytes(box(b"ftyp") + box(b"mdat") + box(b"moov"))
    assert faststart(first) and not faststart(last)


def test_without_local_files_clips_point_to_the_public_copies(media, monkeypatch) -> None:
    monkeypatch.setattr(settings, "video_public_url", "https://opplyst.example/media/video/")
    clips = {v["id"]: v for v in client.get("/api/stories").json()["videos"]}
    # tiktok-1 is on this machine, tiktok-2 only in the manifest.
    assert clips["tiktok-1"]["src"] == "/api/media/video/tiktok-1.mp4"
    assert clips["tiktok-2"]["src"] == "https://opplyst.example/media/video/tiktok-2.mp4"
    assert clips["tiktok-2"]["poster"] == "https://opplyst.example/media/video/tiktok-2.jpg"
    # The API itself still serves only the files it has.
    assert client.get("/api/media/video/tiktok-2.mp4").status_code == 404
