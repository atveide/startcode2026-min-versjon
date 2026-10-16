"""Pure helpers for the Adressa scraper: the URL policy, RSS parsing, the student selection, images
and atomic writes. Nothing here touches the network or the browser profile.
"""

import os
import re
import secrets
import xml.etree.ElementTree as ET
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

HOME = "https://www.adressa.no/"
RSS_URL = "https://www.adressa.no/rss"
IMAGE_HOST = "vcdn.polarismedia.no"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_FEED_BYTES = 2 * 1024 * 1024
OSLO = ZoneInfo("Europe/Oslo")


class ScraperError(Exception):
    """A known failure with a code and a message the user can act on."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def safe_url(value: str, *, article: bool = False) -> str:
    """An https URL on adressa.no without query or fragment. Raises ScraperError otherwise."""
    try:
        url = urlsplit(urljoin(HOME, value))
        port = url.port
    except ValueError:
        raise ScraperError("INVALID_URL", "Ugyldig nettadresse.") from None
    host = (url.hostname or "").lower()
    if (
        url.scheme != "https"
        or host not in ("adressa.no", "www.adressa.no")
        or url.username
        or url.password
        or port not in (None, 443)
    ):
        raise ScraperError("INVALID_URL", "Bare HTTPS-adresser på adressa.no er tillatt.")
    if article and not re.search(r"/i/[A-Za-z0-9]+(?:/|$)", url.path):
        raise ScraperError(
            "INVALID_ARTICLE", "Bruk en artikkellenke fra adressa.no som inneholder /i/."
        )
    return urlunsplit(("https", host, url.path or "/", "", ""))


def safe_link(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return safe_url(value)
    except ScraperError:
        return None


# News sections and their label in the feed. Longest prefix wins, so «nyheter/trondheim»
# becomes Trondheim while plain «nyheter» stays Nyheter. Opinion, ads, video, live briefs
# and service journalism are left out of the feed on purpose, and so is MN24: its links
# redirect to mn24.no, outside adressa.no.
SECTIONS = sorted(
    [
        ("nyheter/trondheim", "Trondheim"),
        ("nyheter/trondelag", "Trøndelag"),
        ("nyheter/innenriks", "Innenriks"),
        ("nyheter/utenriks", "Utenriks"),
        ("nyheter", "Nyheter"),
        ("sport", "Sport"),
        ("kultur", "Kultur"),
        ("politikk", "Politikk"),
        ("okonomi", "Økonomi"),
    ],
    key=lambda section: -len(section[0]),
)

EXCLUDED_TAGS = {
    "annonse", "debatt", "debatt og kronikk", "kommentarer", "kommentar", "leder", "video",
    "nyhetsstudio", "anmeldelse", "bokanmeldelse", "filmanmeldelse", "restaurantanmeldelse",
    "podkast",
}  # fmt: skip


def article_key(url: str) -> str | None:
    """The short article key in an Adressa URL, e.g. «gdBzx0» in /nyheter/trondheim/i/gdBzx0/…"""
    try:
        match = re.search(r"/i/([A-Za-z0-9]+)(?:/|$)", urlsplit(url).path)
    except ValueError:
        return None
    return match[1] if match else None


def stable_id(key: str) -> str:
    """Stable app id for an article. The quiz links to articles by this id."""
    return f"adressa-{key}"


def section_of(url: str) -> str | None:
    try:
        path = urlsplit(url).path
    except ValueError:
        return None
    index = path.find("/i/")
    return path[1:index] if index > 0 else None


def category_for(url: str) -> str | None:
    section = section_of(url)
    if not section:
        return None
    for prefix, label in SECTIONS:
        if section == prefix or section.startswith(f"{prefix}/"):
            return label
    return None


def parse_time(value: Any) -> datetime | None:
    """A time from RSS (RFC 822) or page metadata (ISO 8601). Times without a zone are Oslo's."""
    if not isinstance(value, str) or not value.strip():
        return None
    value = value.strip()
    try:
        time = datetime.fromisoformat(value)
    except ValueError:
        try:
            time = parsedate_to_datetime(value)
        except (TypeError, ValueError, IndexError):
            return None
    return time if time.tzinfo else time.replace(tzinfo=OSLO)


def iso(time: datetime) -> str:
    """UTC with milliseconds, like JavaScript's toISOString(), which the cache has always used."""
    return time.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def to_iso(value: Any) -> str | None:
    time = parse_time(value)
    return iso(time) if time else None


def _timestamp(value: Any) -> float:
    time = parse_time(value)
    return time.timestamp() if time else 0.0


def _newest_first(article: dict) -> float:
    return -_timestamp(article.get("publishedAt"))


def parse_rss(xml: str) -> list[dict]:
    """The items of Adressa's RSS feed. Only links to articles on adressa.no are kept."""
    # Custom entities and DOCTYPEs are refused, so only XML's own five entities are expanded.
    if len(xml.encode()) > MAX_FEED_BYTES or re.search(r"<!DOCTYPE|<!ENTITY", xml, re.IGNORECASE):
        raise ScraperError("INVALID_FEED", "RSS-feeden har et format som ikke støttes.")
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        raise ScraperError("INVALID_FEED", "RSS-feeden har et format som ikke støttes.") from None
    raw = root.findall("./channel/item") if root.tag == "rss" else []
    if not raw:
        raise ScraperError("INVALID_FEED", "RSS-feeden inneholder ingen artikler.")
    items = []
    for item in raw:
        try:
            url = safe_url(item.findtext("link") or "", article=True)
        except ScraperError:
            continue
        title = (item.findtext("title") or "").strip()
        if not title:
            continue
        description = re.sub(r"<[^>]*>", " ", item.findtext("description") or "")
        description = re.sub(r"\s+", " ", description).strip()[:1000]
        enclosure = item.find("enclosure")
        items.append(
            {
                "title": title[:500],
                "url": url,
                "published": item.findtext("pubDate") or None,
                "description": description or None,
                "categories": [c.text for c in item.findall("category") if c.text],
                "image": enclosure.get("url") if enclosure is not None else None,
            }
        )
    return items


# What a student in Trondheim needs to know. Matched against the title, the RSS description
# and Adressa's own topic tags. Each topic counts once, at its highest weight.
STUDENT_TOPICS = [
    (3, "Studentliv", ["student", "ntnu", "samfundet", "studentersamfundet", "studentby", "studentbolig", "sit ", "campus", "gløshaugen", "dragvoll", "universitet", "høgskole", "lånekassen", "studielån", "eksamen", "utdanning", "hybel"]),
    (2, "Kollektiv og transport", ["kollektiv", "buss", "metrobuss", "atb", "gråkallbanen", "bybane", "trikk", "elsparkesykkel", "bysykkel", "sykkelvei", "bompenger"]),
    (2, "Bolig", ["bolig", "husleie", "leiemarked", "leilighet", "borettslag", "utleie"]),
    (2, "Økonomi i hverdagen", ["strøm", "norgespris", "rente", "prisøkning", "priser", "dagligvare", "matpris", "inflasjon"]),
    (2, "Jobb", ["jobb", "arbeidsliv", "karriere", "arbeidsledig", "sommerjobb", "deltid"]),
    (2, "Helse", ["psykisk helse", "helse", "legevakt", "fastlege", "samtykke"]),
    (2, "Politikk og samfunn", ["politikk", "valg", "ordfører", "bystyret", "formannskapet", "byutvikling", "trondheim kommune", "klima", "beredskap"]),
    (1, "Verden", ["ukraina", "russland", "trump", "usa", "nato", "krig", "forsvaret", "eu "]),
]  # fmt: skip

# Match at the start of a word: «buss» matches «bussen», but «student» not inside other words.
_TOPIC_PATTERNS = [
    (weight, topic, re.compile("|".join(rf"(?<![^\W_]){re.escape(word)}" for word in words)))
    for weight, topic, words in STUDENT_TOPICS
]


def student_relevance(item: dict) -> dict:
    """How relevant an RSS item is for students, with the topics that matched.

    A topic in the title or description counts fully. A topic only in the tags counts half: a
    story tagged «NTNU» because an NTNU researcher is quoted is not a story about student life.
    """
    told = f" {item.get('title') or ''} {item.get('description') or ''} ".lower()
    tagged = f" {' | '.join(item.get('categories') or [])} ".lower()
    score, topics = 0, []
    for weight, topic, pattern in _TOPIC_PATTERNS:
        points = weight if pattern.search(told) else weight // 2 if pattern.search(tagged) else 0
        if points:
            score += points
            topics.append(topic)
    return {"score": score, "topics": topics}


def select_candidates(
    items: list[dict],
    *,
    now: datetime | None = None,
    days: int = 7,
    limit: int = 8,
    min_score: int = 2,
) -> list[dict]:
    """Pick the week's news that matters most to students.

    Items are ranked on student relevance, then on their own publication time, since RSS order
    is not chronological. The result is sorted newest first, which is how the feed shows it.
    """
    now = now or datetime.now(UTC)
    oldest = now - timedelta(days=days)
    seen: set[str] = set()
    eligible = []
    for item in items:
        key = article_key(item["url"])
        category = category_for(item["url"])
        published = parse_time(item.get("published"))
        if not key or not category or not published:
            continue
        if published < oldest or published > now + timedelta(hours=1):
            continue
        tags = item.get("categories") or []
        if any(str(tag).strip().lower() in EXCLUDED_TAGS for tag in tags):
            continue
        story_id = stable_id(key)
        if story_id in seen:
            continue
        seen.add(story_id)
        relevance = student_relevance(item)
        if relevance["score"] < min_score:
            continue
        eligible.append(
            {
                "id": story_id,
                "key": key,
                "url": item["url"],
                "title": item["title"],
                "description": item.get("description"),
                "category": category,
                "publishedAt": to_iso(item["published"]),
                "relevance": relevance,
                "rssImage": item.get("image"),
            }
        )
    eligible.sort(key=lambda c: (-c["relevance"]["score"], _newest_first(c)))
    return sorted(eligible[:limit], key=_newest_first)


def split_caption(text: str | None) -> tuple[str | None, str | None]:
    """Split «Tekst. FOTO: NAVN» into the caption and the photographer credit."""
    value = re.sub(r"\s+", " ", text or "").strip()
    if not value:
        return None, None
    match = re.match(r"^(.*?)\s*\bfoto\s*:\s*(.+)$", value, re.IGNORECASE)
    if not match:
        return value, None
    return match[1].strip() or None, match[2].strip() or None


IMAGE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
}


def image_type(data: bytes) -> str | None:
    """The image format from its first bytes, or None when it isn't an image we accept."""
    if len(data) > 3 and data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(data) > 8 and data[:4] == b"\x89PNG":
        return "image/png"
    if len(data) > 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if len(data) > 12 and data[4:8] == b"ftyp" and data[8:12] in (b"avif", b"avis"):
        return "image/avif"
    return None


def merge_articles(previous: list[dict], fresh: list[dict], limit: int = 12) -> list[dict]:
    """Newer imports replace older copies of the same article; the newest `limit` are kept."""
    by_id = {article["id"]: article for article in [*previous, *fresh]}
    return sorted(by_id.values(), key=_newest_first)[:limit]


def write_file_atomic(path: Path, data: bytes | str, mode: int = 0o644) -> None:
    """Write a file so readers never see a half-written version: write a temporary file in the
    same folder, flush it to disk, then rename it over the target in one step."""
    if isinstance(data, str):
        data = data.encode()
    temp = path.parent / f".{path.name}.{os.getpid()}.{secrets.token_hex(6)}.tmp"
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
    try:
        with os.fdopen(fd, "wb") as file:
            file.write(data)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temp, path)
    except BaseException:
        temp.unlink(missing_ok=True)
        raise
