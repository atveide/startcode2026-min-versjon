"""Judge a guess for the blank word in a Norwegian headline, using Claude.

Run as a script:
    uv run python -m app.judge <headline_id> <guess>
"""

import sys

import anthropic
from pydantic import BaseModel

from app import judgement_cache
from app.config import settings
from app.headlines import HEADLINES_BY_ID, Headline

MODEL = "claude-sonnet-5-5"

SYSTEM_PROMPT = """You are the judge in a Norwegian word-guessing game. The player sees a sentence
one word missing and tries to guess the missing word.

You get the headline, the original word and the guess. Your job is to rate the
closeness score from 0 to 100.

## correct
true if the headline, with the guess filled in, says essentially the same thing
as with the original word. Judge the meaning in this headline: a word that only
works as a synonym here still counts. Inflection, bokmål/nynorsk forms, stray
punctuation and small typos of the right word are all correct.

## score (0-100, ignored when correct)
First decide what the missing word refers to in this headline:
- An ordinary word: compare meanings.
- A name, title or place (a book, a person, a town): compare referents. Another
  work by the same author, a neighbouring place or a related institution is
  close; a word that merely shares the title's everyday meaning is only loosely
  related unless the headline is about that meaning.

Then place the guess on this scale, using the full range, not just these
anchor numbers:
- 90-99: very close, but the sentence has a different meaning
- 80-89: same specific thing seen differently, or a near-synonym that shifts
  the meaning
- 55-79: clearly related: same category, part or whole, cause or effect
- 20-54: same broad field
- 1-19: barely related or unrelated

Rules:
- Meaning only. A guess that looks or sounds like the answer gets no credit
  for that.

## reasoning
Before the score, write one short sentences: what the missing word
means here, and how the guess relates to it."""


class Judgement(BaseModel):
    reasoning: str
    correct: bool
    score: int


# An empty ANTHROPIC_API_KEY= in .env counts as unset.
client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None)


def judge_guess(headline: Headline, guess: str) -> Judgement:
    guess = guess.strip()
    if guess.lower() == headline.answer.lower():
        return Judgement(reasoning="The guess is the original word.", correct=True, score=100)

    cached = judgement_cache.get(headline, guess)
    if cached is not None:
        reasoning, correct, score = cached
        return Judgement(reasoning=reasoning, correct=correct, score=score)

    judgement = _ask_model(headline, guess)
    judgement_cache.put(headline, guess, judgement.reasoning, judgement.correct, judgement.score)
    return judgement


def _ask_model(headline: Headline, guess: str) -> Judgement:
    response = client.beta.messages.parse(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Headline: {headline.text}\n"
                f"Original word: {headline.answer}\n"
                f"Guess: {guess}",
            }
        ],
        output_format=Judgement,
        output_config={"effort": "medium"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )

    judgement = response.parsed_output
    if response.stop_reason == "refusal" or judgement is None:
        raise RuntimeError(f"No judgement returned (stop_reason={response.stop_reason})")

    if judgement.correct:
        return judgement.model_copy(update={"score": 100})
    return judgement.model_copy(update={"score": max(0, min(99, judgement.score))})


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python -m app.judge <headline_id> <guess>")
    print(judge_guess(HEADLINES_BY_ID[int(sys.argv[1])], sys.argv[2]))
