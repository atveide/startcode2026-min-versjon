"""Stores every judgement so the same guess on the same headline always gets the same answer.

Keyed on the headline text and answer (not just the id), so editing a headline
doesn't reuse judgements made for the old version.
"""

import sqlite3
from contextlib import closing

from app.config import settings
from app.headlines import Headline

_SCHEMA = """
CREATE TABLE IF NOT EXISTS judgements (
    headline_text TEXT NOT NULL,
    answer TEXT NOT NULL,
    guess TEXT NOT NULL,
    correct INTEGER NOT NULL,
    score INTEGER NOT NULL,
    reasoning TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (headline_text, answer, guess)
)
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.database_path)
    conn.execute(_SCHEMA)
    # Databases made before the judge gave its reasoning lack the column.
    columns = {row[1] for row in conn.execute("PRAGMA table_info(judgements)")}
    if "reasoning" not in columns:
        conn.execute("ALTER TABLE judgements ADD COLUMN reasoning TEXT NOT NULL DEFAULT ''")
    return conn


def _normalize(guess: str) -> str:
    return " ".join(guess.lower().split())


def get(headline: Headline, guess: str) -> tuple[str, bool, int] | None:
    """The stored (reasoning, correct, score); reasoning is empty for judgements made before it was kept."""
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT reasoning, correct, score FROM judgements"
            " WHERE headline_text = ? AND answer = ? AND guess = ?",
            (headline.text, headline.answer, _normalize(guess)),
        ).fetchone()
    return (row[0], bool(row[1]), row[2]) if row else None


def put(headline: Headline, guess: str, reasoning: str, correct: bool, score: int) -> None:
    with closing(_connect()) as conn, conn:
        conn.execute(
            "INSERT OR IGNORE INTO judgements (headline_text, answer, guess, correct, score, reasoning)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (headline.text, headline.answer, _normalize(guess), int(correct), score, reasoning),
        )
