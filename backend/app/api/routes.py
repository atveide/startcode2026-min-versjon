from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.headlines import (
    HEADLINES,
    HEADLINES_BY_ID,
    MAX_HINTS,
    QUIZ_ID,
    QUIZ_WEEK,
    Headline,
    hint,
)
from app.judge import judge_guess
from app.stories import SNAPSHOT, STORIES, STORIES_BY_ID, Story

router = APIRouter()


class HeadlineOut(BaseModel):
    id: int
    text: str
    story_id: str


class QuizOut(BaseModel):
    id: str
    week: int
    max_hints: int
    headlines: list[HeadlineOut]


class StoriesOut(BaseModel):
    snapshot: str
    stories: list[Story]


class GuessIn(BaseModel):
    headline_id: int
    guess: str


class GuessOut(BaseModel):
    score: int
    solved: bool
    answer: str | None = None
    full_text: str | None = None


class HintOut(BaseModel):
    hint: str
    level: int
    max_level: int


class RevealOut(BaseModel):
    answer: str
    full_text: str


def _get_headline(headline_id: int) -> Headline:
    headline = HEADLINES_BY_ID.get(headline_id)
    if headline is None:
        raise HTTPException(status_code=404, detail="Unknown headline")
    return headline


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _headline_out(h: Headline) -> HeadlineOut:
    return HeadlineOut(id=h.id, text=h.text, story_id=h.story_id)


@router.get("/headlines")
def list_headlines() -> list[HeadlineOut]:
    return [_headline_out(h) for h in HEADLINES]


@router.get("/quiz")
def get_quiz() -> QuizOut:
    return QuizOut(
        id=QUIZ_ID,
        week=QUIZ_WEEK,
        max_hints=MAX_HINTS,
        headlines=[_headline_out(h) for h in HEADLINES],
    )


@router.get("/stories")
def list_stories() -> StoriesOut:
    return StoriesOut(snapshot=SNAPSHOT, stories=STORIES)


@router.get("/stories/{story_id}")
def get_story(story_id: str) -> Story:
    story = STORIES_BY_ID.get(story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Unknown story")
    return story


@router.post("/guess")
def guess(body: GuessIn) -> GuessOut:
    headline = _get_headline(body.headline_id)
    if not body.guess.strip():
        raise HTTPException(status_code=422, detail="Empty guess")

    judgement = judge_guess(headline, body.guess)
    if judgement.correct:
        return GuessOut(
            score=judgement.score, solved=True, answer=headline.answer, full_text=headline.full_text
        )
    return GuessOut(score=judgement.score, solved=False)


@router.get("/headlines/{headline_id}/hint/{level}")
def get_hint(headline_id: int, level: int) -> HintOut:
    headline = _get_headline(headline_id)
    if not 1 <= level <= MAX_HINTS:
        raise HTTPException(status_code=422, detail=f"Hint level must be 1-{MAX_HINTS}")
    return HintOut(hint=hint(headline.answer, level), level=level, max_level=MAX_HINTS)


@router.post("/headlines/{headline_id}/reveal")
def reveal(headline_id: int) -> RevealOut:
    headline = _get_headline(headline_id)
    return RevealOut(answer=headline.answer, full_text=headline.full_text)
