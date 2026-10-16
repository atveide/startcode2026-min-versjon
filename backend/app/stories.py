"""The week's news from Adresseavisen, which the quiz questions and the feed are built on.

Two sources, on purpose:

- `data/week.json` is in git and holds only public facts about each article: title, link,
  section, publication time and the lead that adressa.no shows to everyone.
- The scraper (`python -m app.scraper`, see app/scraper/) caches Adressa's «Kort oppsummert»,
  the article text and the photos in ADRESSA_CACHE_DIR, read with the user's own subscription.
  That content is never committed, and the hosted backend has none of it.

Without the cache the app still works: every story links to the article on adressa.no.
"""

import json
import re
from pathlib import Path

from pydantic import BaseModel

from app.config import settings

SOURCE = "Adresseavisen"
WEEK_FILE = Path(__file__).parent / "data" / "week.json"
IMAGE_FILE = re.compile(r"^adressa-[A-Za-z0-9]+\.(jpg|png|webp|avif)$")


class Summary(BaseModel):
    """Adressa's own «Kort oppsummert», unchanged, with its AI and editorial disclosure."""

    heading: str
    bullets: list[str]
    source: str
    sourceUrl: str
    disclosure: str | None = None
    disclosureUrl: str | None = None


class OpplystSummary(BaseModel):
    """Opplyst's own short version of the story, written by Claude from Adressa's article.

    Kept apart from Adressa's «Kort oppsummert» and labelled as ours (see app.summaries).
    """

    points: list[str]  # two or three short bullet points
    label: str
    model: str
    promptVersion: str
    generatedAt: str
    source: str  # whose journalism it sums up
    sourceUrl: str


class Image(BaseModel):
    src: str
    alt: str | None = None
    caption: str | None = None
    credit: str | None = None


class Block(BaseModel):
    type: str  # paragraph, heading or list
    text: str | None = None
    items: list[str] | None = None


class Story(BaseModel):
    id: str
    title: str
    url: str
    category: str
    publishedAt: str
    source: str = SOURCE
    lead: str | None = None
    modifiedAt: str | None = None
    authors: list[str] = []
    summary: Summary | None = None
    image: Image | None = None
    body: list[Block] = []
    imported: bool = False  # True when the local cache has the full article
    opplystSummary: OpplystSummary | None = None  # set by app.summaries, never from the import

    @property
    def text(self) -> str:
        """Everything a reader can learn from the story, for checking quiz answers."""
        parts = [self.title, self.lead or ""]
        if self.summary:
            parts += self.summary.bullets
        for block in self.body:
            parts += [block.text or "", *(block.items or [])]
        return " ".join(parts)


class Week(BaseModel):
    week: int
    stories: list[Story]


WEEK = Week.model_validate(json.loads(WEEK_FILE.read_text(encoding="utf-8")))


def cache_dir() -> Path | None:
    return Path(settings.adressa_cache_dir) if settings.adressa_cache_dir else None


def _read_cache() -> tuple[list[dict], str | None]:
    folder = cache_dir()
    if folder is None:
        return [], None
    try:
        data = json.loads((folder / "articles.json").read_text(encoding="utf-8"))
        return list(data.get("articles", [])), data.get("importedAt")
    except (OSError, ValueError):
        return [], None


def _from_cache(article: dict, public: Story | None) -> Story:
    image = article.get("image") or None
    file = image.get("file") if image else None
    if image and file and IMAGE_FILE.match(file):
        image = {**image, "src": f"/api/media/adressa/{file}"}
    else:
        # No local copy: fall back to the public share image from week.json, if any.
        image = public.image.model_dump() if public and public.image else None
    fields = {**(public.model_dump() if public else {}), **article, "image": image}
    fields["source"] = SOURCE
    fields["imported"] = bool(article.get("body"))
    fields.pop("opplystSummary", None)
    return Story.model_validate(fields)


def load_stories() -> tuple[list[Story], str | None]:
    """The week's stories, enriched from the local Adressa cache when there is one.

    Read on every call, so a new import shows up without restarting the server. The import
    replaces its cache file atomically, so a read never sees a half-written file.
    """
    cached, imported_at = _read_cache()
    public = {s.id: s for s in WEEK.stories}
    stories = {s.id: s for s in WEEK.stories}
    for article in cached:
        if isinstance(article, dict) and isinstance(article.get("id"), str):
            stories[article["id"]] = _from_cache(article, public.get(article["id"]))
    ordered = sorted(stories.values(), key=lambda s: s.publishedAt, reverse=True)
    return ordered, imported_at


def image_path(name: str) -> Path | None:
    """A cached photo, only by its exact generated file name."""
    folder = cache_dir()
    if folder is None or not IMAGE_FILE.match(name):
        return None
    path = folder / "images" / name
    return path if path.is_file() else None
