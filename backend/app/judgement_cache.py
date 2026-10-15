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
    PRIMARY KEY (headline_text, answer, guess)
)
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.database_path)
    conn.execute(_SCHEMA)
    return conn


def _normalize(guess: str) -> str:
    return " ".join(guess.lower().split())


def get(headline: Headline, guess: str) -> tuple[bool, int] | None:
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT correct, score FROM judgements"
            " WHERE headline_text = ? AND answer = ? AND guess = ?",
            (headline.text, headline.answer, _normalize(guess)),
        ).fetchone()
    return (bool(row[0]), row[1]) if row else None


def put(headline: Headline, guess: str, correct: bool, score: int) -> None:
    with closing(_connect()) as conn, conn:
        conn.execute(
            "INSERT OR IGNORE INTO judgements VALUES (?, ?, ?, ?, ?)",
            (headline.text, headline.answer, _normalize(guess), int(correct), score),
        )
