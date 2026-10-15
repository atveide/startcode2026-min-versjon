from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.headlines import HEADLINES, HEADLINES_BY_ID, MAX_HINTS, Headline, hint
from app.judge import judge_guess

router = APIRouter()


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


@router.get("/headlines")
def list_headlines() -> list[HeadlineOut]:
    return [HeadlineOut(id=h.id, text=h.text) for h in HEADLINES]


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
