"""Import Adresseavisen's videos from a zip archive into the feed.

    uv run python -m app.import_videos /path/to/Adresseavisen_uke_42_2026_uten_TikTok_vannmerke.zip

The archive holds MP4 files and a LES_MEG.txt that lists, for each file, when it was published,
its caption and the original URL. Every archive member is checked before anything is written: no
absolute paths, no `..`, no links, only .mp4 and .txt files. The originals are kept unchanged in
VIDEO_MEDIA_DIR/original/. For the web each clip gets an H.264/AAC copy (yuv420p, moov atom first,
same size and frame rate, nothing cropped) and a poster from a real frame, named by the clip's
stable id. ffprobe checks both the originals and the copies, and data/videos.json records the
facts and where every file came from.

Titles are made from the archive's file names. A title corrected by hand in data/videos.json, and
any articleId, are kept when the archive is imported again. articleId stays null until a link to a
story in the Adressa import is documented: a file name or a similar topic is not such a link.
"""

import hashlib
import json
import re
import shutil
import stat
import subprocess
import sys
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

from app.videos import (
    MANIFEST_FILE,
    Manifest,
    ManifestVideo,
    Original,
    WebCopy,
    load_manifest,
    media_dir,
)

ALLOWED = {".mp4", ".txt"}
IGNORED = {"__MACOSX", ".DS_Store"}
SOURCE_URL = re.compile(r"https://www\.tiktok\.com/@([\w.]+)/video/(\d+)")
POSTER_AT = "1.0"  # seconds into the clip


@dataclass(frozen=True)
class Listing:
    """What LES_MEG.txt says about one file."""

    file: str
    published_at: str
    caption: str
    url: str


def safe_members(archive: zipfile.ZipFile) -> list[zipfile.ZipInfo]:
    """The members to extract. Raises ValueError for anything that could escape the folder."""
    members = []
    for info in archive.infolist():
        path = PurePosixPath(info.filename)
        if info.is_dir() or any(part in IGNORED for part in path.parts):
            continue
        if (
            path.is_absolute()
            or ".." in path.parts
            or "\\" in info.filename
            or ":" in path.parts[0]
        ):
            raise ValueError(f"Ulovlig sti i arkivet: {info.filename}")
        if stat.S_ISLNK(info.external_attr >> 16):
            raise ValueError(f"Arkivet inneholder en lenke: {info.filename}")
        if path.suffix.lower() not in ALLOWED:
            raise ValueError(f"Uventet filtype i arkivet: {info.filename}")
        members.append(info)
    names = [PurePosixPath(m.filename).name for m in members]
    if len(names) != len(set(names)):
        raise ValueError("Arkivet har flere filer med samme navn")
    return members


def parse_listing(text: str) -> list[Listing]:
    """LES_MEG.txt: blocks of file name, «Publisert: …», the caption and the URL."""
    listings = []
    for block in re.split(r"\n\s*\n", text.replace("\r\n", "\n")):
        lines = [line.strip() for line in block.strip().split("\n") if line.strip()]
        if not lines or not lines[0].lower().endswith(".mp4"):
            continue
        published = next((ln for ln in lines if ln.startswith("Publisert:")), None)
        url = next((ln for ln in lines if SOURCE_URL.fullmatch(ln)), None)
        if not published or not url:
            continue
        caption = " ".join(ln for ln in lines[1:] if ln not in (published, url))
        listings.append(
            Listing(lines[0], published.removeprefix("Publisert:").strip(), caption, url)
        )
    return listings


def title_from(file: str) -> str:
    """«2026-10-12_Skudd_gjennom_verandadora.mp4» → «Skudd gjennom verandadora»."""
    stem = re.sub(r"^\d{4}-\d{2}-\d{2}_", "", Path(file).stem)
    return stem.replace("_", " ").strip()


def without_hashtags(caption: str) -> str | None:
    text = re.sub(r"(?:\s*#[\w\-æøåÆØÅ]+)+\s*$", "", caption).strip()
    return text or None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def probe(path: Path) -> dict:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(out.stdout)


def describe(info: dict) -> tuple[str, str | None, dict]:
    """Readable video and audio descriptions, and the video stream."""
    streams = info.get("streams", [])
    video = next(s for s in streams if s.get("codec_type") == "video")
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    rate = video.get("r_frame_rate", "0/1").split("/")
    fps = round(int(rate[0]) / int(rate[1] or 1), 2) if rate[0] != "0" else 0
    text = (
        f"{video['codec_name']}/{video.get('codec_tag_string')} {video['width']}×{video['height']}"
        f" {fps:g} fps {video.get('pix_fmt')}"
    )
    rotation = next(
        (d.get("rotation") for d in video.get("side_data_list", []) if "rotation" in d), None
    )
    if rotation:
        text += f" rotert {rotation}°"
    sound = f"{audio['codec_name']}/{audio.get('codec_tag_string')}" if audio else None
    return text, sound, video


def faststart(path: Path) -> bool:
    """True if the moov atom comes before the media data, so playback can start early."""
    order = []
    with path.open("rb") as f:
        while len(order) < 16:
            header = f.read(8)
            if len(header) < 8:
                break
            size = int.from_bytes(header[:4], "big")
            kind = header[4:].decode("latin-1")
            if size == 1:
                size = int.from_bytes(f.read(8), "big") - 8
            elif size == 0:
                order.append(kind)
                break
            order.append(kind)
            f.seek(size - 8, 1)
    return "moov" in order and "mdat" in order and order.index("moov") < order.index("mdat")


def web_copy(original: Path, target: Path) -> None:
    """H.264/AAC, yuv420p, moov first; same size and frame rate, nothing cropped or scaled."""
    if target.exists():
        return
    subprocess.run(
        [
            "ffmpeg",
            "-n",
            "-v",
            "error",
            "-i",
            str(original),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0?",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-tag:v",
            "avc1",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(target),
        ],
        check=True,
    )


def poster(clip: Path, target: Path) -> None:
    if target.exists():
        return
    subprocess.run(
        [
            "ffmpeg",
            "-n",
            "-v",
            "error",
            "-ss",
            POSTER_AT,
            "-i",
            str(clip),
            "-frames:v",
            "1",
            "-vf",
            "scale=720:-2",
            "-q:v",
            "3",
            str(target),
        ],
        check=True,
    )


def extract(archive_path: Path, folder: Path) -> list[Path]:
    """Copy the checked members into `folder`, flat. Never overwrites a different file."""
    folder.mkdir(parents=True, exist_ok=True)
    written = []
    with zipfile.ZipFile(archive_path) as archive:
        for info in safe_members(archive):
            target = (folder / PurePosixPath(info.filename).name).resolve()
            if target.parent != folder.resolve():
                raise ValueError(f"Ulovlig sti i arkivet: {info.filename}")
            partial = target.with_suffix(target.suffix + ".part")
            with archive.open(info) as src, partial.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            if target.exists():
                same = sha256(target) == sha256(partial)
                partial.unlink()
                if not same:
                    raise ValueError(f"{target.name} finnes allerede med annet innhold")
            else:
                partial.rename(target)
            written.append(target)
    return written


def import_archive(archive_path: Path) -> Manifest:
    folder = media_dir()
    originals = folder / "original"
    files = extract(archive_path, originals)
    readme = next((f for f in files if f.suffix.lower() == ".txt"), None)
    if readme is None:
        raise ValueError("Arkivet mangler LES_MEG.txt med publiseringstid og kilde")
    listings = {item.file: item for item in parse_listing(readme.read_text("utf-8"))}
    previous = {v.id: v for v in load_manifest().videos}

    videos = []
    for path in sorted(f for f in files if f.suffix.lower() == ".mp4"):
        listing = listings.get(path.name)
        if listing is None:
            print(f"  Hoppet over {path.name}: står ikke i LES_MEG.txt")
            continue
        account, platform_id = SOURCE_URL.fullmatch(listing.url).groups()
        video_id = f"tiktok-{platform_id}"
        info = probe(path)
        video_text, audio_text, stream = describe(info)

        clip = folder / f"{video_id}.mp4"
        web_copy(path, clip)
        poster(clip, folder / f"{video_id}.jpg")
        copy_text, copy_audio, copy_stream = describe(probe(clip))
        if copy_stream["codec_name"] != "h264" or copy_stream.get("pix_fmt") != "yuv420p":
            raise ValueError(f"{clip.name} ble ikke H.264/yuv420p: {copy_text}")

        kept = previous.get(video_id)
        videos.append(
            ManifestVideo(
                id=video_id,
                title=kept.title if kept else title_from(path.name),
                titleSource=kept.titleSource if kept else "Filnavnet i arkivet",
                description=without_hashtags(listing.caption),
                publishedAt=listing.published_at,
                platform="TikTok",
                account=f"@{account}",
                sourceUrl=listing.url,
                articleId=kept.articleId if kept else None,
                duration=round(float(info["format"]["duration"]), 2),
                width=int(stream["width"]),
                height=int(stream["height"]),
                original=Original(
                    archive=archive_path.name,
                    file=path.name,
                    sha256=sha256(path),
                    bytes=path.stat().st_size,
                    video=video_text,
                    audio=audio_text,
                ),
                web=WebCopy(
                    video=copy_text,
                    audio=copy_audio,
                    bytes=clip.stat().st_size,
                    faststart=faststart(clip),
                ),
            )
        )
        print(f"  {video_id}: {path.name} → {clip.name} ({copy_text})")

    videos.sort(key=lambda v: v.publishedAt, reverse=True)
    manifest = Manifest(importedAt=datetime.now(UTC).isoformat(timespec="seconds"), videos=videos)
    MANIFEST_FILE.write_text(
        manifest.model_dump_json(indent=2, exclude_none=False) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python -m app.import_videos /path/to/videos.zip")
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            sys.exit(f"Fant ikke {tool}. Installer ffmpeg og prøv igjen.")
    manifest = import_archive(Path(sys.argv[1]).expanduser())
    print(f"Skrev {len(manifest.videos)} videoer til {MANIFEST_FILE} (filer i {media_dir()})")


if __name__ == "__main__":
    main()
