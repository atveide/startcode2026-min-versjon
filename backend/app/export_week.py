"""Write data/week.json from the local Adressa cache, keeping only public facts.

    uv run python -m app.export_week cache/adressa/articles.json

Only the title, link, section, publication time, the lead (which adressa.no shows to everyone)
and Adressa's share image are copied. The share image is the og:image Adressa publishes for link
previews; the published app shows it straight from Adressa's image service, with the photo
credit, and never stores a copy. Summaries, article text and the local photo copies stay in the
local cache.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from app.stories import WEEK_FILE

PUBLIC_FIELDS = ("id", "title", "url", "category", "publishedAt", "lead")
SHARE_IMAGE_PREFIX = "https://vcdn.polarismedia.no/"


def _share_image(article: dict) -> dict | None:
    src = article.get("shareImage")
    if not isinstance(src, str) or not src.startswith(SHARE_IMAGE_PREFIX):
        return None
    credit = (article.get("image") or {}).get("credit")
    return {"src": src, "alt": None, "caption": None, "credit": credit}


def export(cache_file: Path) -> dict:
    articles = json.loads(cache_file.read_text(encoding="utf-8"))["articles"]
    stories = [
        {**{key: article.get(key) for key in PUBLIC_FIELDS}, "image": _share_image(article)}
        for article in articles
    ]
    newest = max(datetime.fromisoformat(s["publishedAt"]) for s in stories)
    return {"week": newest.isocalendar().week, "stories": stories}


def write(cache_file: Path) -> dict:
    week = export(cache_file)
    WEEK_FILE.write_text(json.dumps(week, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return week


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -m app.export_week /path/to/articles.json")
    week = write(Path(sys.argv[1]))
    print(f"Skrev {len(week['stories'])} saker for uke {week['week']} til {WEEK_FILE}")
