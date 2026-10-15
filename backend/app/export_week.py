"""Write data/week.json from the local Adressa cache, keeping only public facts.

    uv run python -m app.export_week /path/to/vgx-local/data/adressa/articles.json

Only the title, link, section, publication time and the lead (which adressa.no shows to
everyone) are copied. Summaries, article text and photos stay in the local cache.
"""

import json
import sys
from datetime import datetime
from pathlib import Path

from app.stories import WEEK_FILE

PUBLIC_FIELDS = ("id", "title", "url", "category", "publishedAt", "lead")


def export(cache_file: Path) -> dict:
    articles = json.loads(cache_file.read_text(encoding="utf-8"))["articles"]
    stories = [{key: article.get(key) for key in PUBLIC_FIELDS} for article in articles]
    newest = max(datetime.fromisoformat(s["publishedAt"]) for s in stories)
    return {"week": newest.isocalendar().week, "stories": stories}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -m app.export_week /path/to/articles.json")
    week = export(Path(sys.argv[1]))
    WEEK_FILE.write_text(json.dumps(week, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Skrev {len(week['stories'])} saker for uke {week['week']} til {WEEK_FILE}")
