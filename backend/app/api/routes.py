from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.headlines import HEADLINES, HEADLINES_BY_ID
from app.word_similarity import word_similarity

router = APIRouter()

SOLVED_THRESHOLD = 90


class HeadlineOut(BaseModel):
    id: int
    text: str


class GuessIn(BaseModel):
    headline_id: int
    guess: str


class GuessOut(BaseModel):
    score: int
    solved: bool
    answer: str | None = None
    full_text: str | None = None


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/headlines")
def list_headlines() -> list[HeadlineOut]:
    return [HeadlineOut(id=h.id, text=h.text) for h in HEADLINES]


@router.post("/guess")
def guess(body: GuessIn) -> GuessOut:
    headline = HEADLINES_BY_ID.get(body.headline_id)
    if headline is None:
        raise HTTPException(status_code=404, detail="Unknown headline")
    if not body.guess.strip():
        raise HTTPException(status_code=422, detail="Empty guess")

    score = word_similarity(body.guess, headline.answer)
    if score >= SOLVED_THRESHOLD:
        return GuessOut(score=score, solved=True, answer=headline.answer, full_text=headline.full_text)
    return GuessOut(score=score, solved=False)
