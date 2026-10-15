from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app import summaries
from app.headlines import (
    HEADLINES,
    HEADLINES_BY_ID,
    MAX_HINTS,
    Headline,
    daily_headlines,
    hint,
    quiz_id,
    today,
)
from app.judge import judge_guess
from app.stories import WEEK, Story, image_path, load_stories
from app.videos import FeedEntry, Video, available_videos, build_feed, media_path

router = APIRouter()


class HeadlineOut(BaseModel):
    id: int
    text: str
    story_id: str


class QuizOut(BaseModel):
    id: str
    date: str
    week: int
    max_hints: int
    headlines: list[HeadlineOut]


class StoriesOut(BaseModel):
    week: int
    importedAt: str | None
    stories: list[Story]
    # Adressa's videos, and the order of the one feed that mixes them with the stories.
    videos: list[Video]
    feed: list[FeedEntry]


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
    """Today's game, drawn from the week's question pool."""
    day = today()
    return QuizOut(
        id=quiz_id(day),
        date=day.isoformat(),
        week=WEEK.week,
        max_hints=MAX_HINTS,
        headlines=[_headline_out(h) for h in daily_headlines(day)],
    )


@router.get("/stories")
def list_stories() -> StoriesOut:
    stories, imported_at = load_stories()
    videos = available_videos()
    return StoriesOut(
        week=WEEK.week,
        importedAt=imported_at,
        stories=summaries.attach(stories),
        videos=videos,
        feed=build_feed([s.id for s in stories], videos),
    )


@router.get("/stories/{story_id}")
def get_story(story_id: str) -> Story:
    stories = summaries.attach(load_stories()[0])
    story = next((s for s in stories if s.id == story_id), None)
    if story is None:
        raise HTTPException(status_code=404, detail="Unknown story")
    return story


@router.get("/media/adressa/{name}")
def get_image(name: str) -> FileResponse:
    path = image_path(name)
    if path is None:
        raise HTTPException(status_code=404, detail="Unknown image")
    return FileResponse(path, headers={"Cache-Control": "no-cache"})


@router.get("/media/video/{name}")
def get_video_media(name: str) -> FileResponse:
    """A video's web copy or poster. Range requests work, so phones can seek and stream."""
    found = media_path(name)
    if found is None:
        raise HTTPException(status_code=404, detail="Unknown video")
    path, media_type = found
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "no-cache"})


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
