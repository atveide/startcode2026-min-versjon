"""Judge a guess for the blank word in a Norwegian headline, using Claude.

Run as a script:
    uv run python -m app.judge <headline_id> <guess>
"""

import sys

import anthropic
from pydantic import BaseModel

from app import judgement_cache
from app.config import settings
from app.headlines import BLANK, HEADLINES_BY_ID, Headline

MODEL = "claude-sonnet-5-5"

SYSTEM_PROMPT = f"""\
You are the judge in a Norwegian word-guessing game. The player sees a news \
headline with one word replaced by {BLANK} and tries to guess the missing word.

You get the headline, the original word, and the player's guess. Everything is \
Norwegian (bokmål or nynorsk); judge by Norwegian meaning.

correct: true if the headline, with the guess filled in, says essentially the \
same thing as with the original word. Judge the meaning in this headline, not \
the words in isolation: a word that only works as a synonym in this context \
counts. Ignore inflection and spelling variants: singular/plural, \
definite/indefinite, bokmål/nynorsk forms and minor typos of the right word \
are all correct.

score: 0-100, how close the guess is to the original meaning in this headline, \
so the player knows if they are getting warmer.
- 100: correct
- 70-99: close, but changes the meaning of the headline noticeably
- 40-69: clearly related (same category, part/whole, typical association)
- 10-39: loosely related, same broad domain
- 0-9: unrelated

Rate meaning only. Spelling or sound similarity does not count."""


class Judgement(BaseModel):
    correct: bool
    score: int


# An empty ANTHROPIC_API_KEY= in .env counts as unset.
client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None)


def judge_guess(headline: Headline, guess: str) -> Judgement:
    guess = guess.strip()
    if guess.lower() == headline.answer.lower():
        return Judgement(correct=True, score=100)

    cached = judgement_cache.get(headline, guess)
    if cached is not None:
        correct, score = cached
        return Judgement(correct=correct, score=score)

    judgement = _ask_model(headline, guess)
    judgement_cache.put(headline, guess, judgement.correct, judgement.score)
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
        return Judgement(correct=True, score=100)
    return Judgement(correct=False, score=max(0, min(99, judgement.score)))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python -m app.judge <headline_id> <guess>")
    print(judge_guess(HEADLINES_BY_ID[int(sys.argv[1])], sys.argv[2]))
