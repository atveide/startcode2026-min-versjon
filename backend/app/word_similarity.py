"""Score how semantically close two Norwegian words are, using Claude.

Run as a script:
    uv run python -m app.word_similarity hund katt
"""

import sys

import anthropic
from pydantic import BaseModel

from app.config import settings

MODEL = "claude-sonnet-5-5"

SYSTEM_PROMPT = """\
You are the judge in a Norwegian word-guessing game. The player is trying to \
guess a secret target word, and you rate how close their guess is in meaning.

Both words are Norwegian (bokmål). Judge them by their Norwegian \
meaning, not by an English word that looks similar.

Ignore spelling mistakes.\

Give a score from 0 to 100:
- 100: the same word, an inflected form of it, or an exact synonym
- 80-99: near synonyms, or very tightly linked concepts (hund / valp)
- 50-79: clearly related: same category, part/whole, typical association \
(hund / katt, hund / bjeffe)
- 20-49: loosely related, sharing a broad domain (hund / skog)
- 0-19: unrelated

Rate meaning only. Spelling or sound similarity does not count."""


class WordSimilarity(BaseModel):
    score: int


# An empty ANTHROPIC_API_KEY= in .env counts as unset.
client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None)


def word_similarity(guess: str, target: str) -> int:
    """Return a 0-100 score for how close `guess` is to `target` in meaning."""
    guess, target = guess.strip().lower(), target.strip().lower()
    if guess == target:
        return 100

    response = client.beta.messages.parse(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Target word: {target}\nGuess: {guess}"}],
        output_format=WordSimilarity,
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )

    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise RuntimeError(f"No score returned (stop_reason={response.stop_reason})")

    return max(0, min(100, response.parsed_output.score))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python -m app.word_similarity <guess> <target>")
    print(word_similarity(sys.argv[1], sys.argv[2]))
