import json
import random
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BLANK = "___"
MAX_HINTS = 3
QUESTIONS_PER_DAY = 3
OSLO = ZoneInfo("Europe/Oslo")
QUESTIONS_FILE = Path(__file__).parent / "data" / "questions.json"


@dataclass(frozen=True)
class Headline:
    id: int
    text: str  # contains BLANK where the hidden word goes
    answer: str
    story_id: str  # the story that holds the answer, for players who get stuck

    @property
    def full_text(self) -> str:
        return self.text.replace(BLANK, self.answer)


def load_pool(path: Path = QUESTIONS_FILE) -> list[Headline]:
    """A question pool file; ids follow the order in the file."""
    questions = json.loads(path.read_text(encoding="utf-8"))
    return [
        Headline(n, q["text"], q["answer"], q["story_id"]) for n, q in enumerate(questions, start=1)
    ]


# The week's question pool, made from this week's Adresseavisen stories by
# `python -m app.generate_questions`. Every answer is in its story but not in the story's title,
# which the quiz shows under «Saken bak spørsmålet».
HEADLINES = load_pool()

HEADLINES_BY_ID = {h.id: h for h in HEADLINES}


def today() -> date:
    return datetime.now(OSLO).date()


def daily_headlines(day: date) -> list[Headline]:
    """Today's game: questions from the week's news, a new mix every day.

    The same day always gives the same game. No two questions in a game share a story.
    """
    pool = list(HEADLINES)
    random.Random(day.toordinal()).shuffle(pool)
    picked: list[Headline] = []
    stories: set[str] = set()
    for headline in pool:
        if headline.story_id not in stories:
            picked.append(headline)
            stories.add(headline.story_id)
        if len(picked) == QUESTIONS_PER_DAY:
            break
    return picked


def quiz_id(day: date) -> str:
    """A new id every day starts a fresh game for every player.

    It includes the questions, so a game that changes during the day (a new question pool)
    also starts fresh instead of reusing progress made on other questions.
    """
    return f"dag-{day.isoformat()}-" + ".".join(str(h.id) for h in daily_headlines(day))


def hint(answer: str, level: int) -> str:
    """Level 1 shows the word length; each further level reveals one more letter."""
    revealed = min(level - 1, len(answer) - 1)
    return " ".join(answer[:revealed].upper() + "_" * (len(answer) - revealed))
