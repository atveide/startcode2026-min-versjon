"""The week's news stories. The quiz questions and the feed are both built on these."""

import json
from pathlib import Path

from pydantic import BaseModel


class Image(BaseModel):
    src: str
    alt: str
    credit: str | None = None


class Source(BaseModel):
    title: str
    url: str


class QA(BaseModel):
    q: str
    a: str
    tags: list[str]


class Story(BaseModel):
    id: str
    title: str
    category: str
    color: str
    latest: bool = False
    updated: str
    images: list[Image]
    summary: list[str]
    developments: list[str]
    background: str
    sources: list[Source]
    qa: list[QA]

    @property
    def text(self) -> str:
        """Everything a reader can learn from the story, for checking quiz answers."""
        parts = [self.title, *self.summary, *self.developments, self.background]
        parts += [item.a for item in self.qa]
        return " ".join(parts)


class Snapshot(BaseModel):
    snapshot: str
    stories: list[Story]


_DATA = Snapshot.model_validate(
    json.loads((Path(__file__).parent / "data" / "stories.json").read_text(encoding="utf-8"))
)

SNAPSHOT = _DATA.snapshot
STORIES = _DATA.stories
STORIES_BY_ID = {s.id: s for s in STORIES}
