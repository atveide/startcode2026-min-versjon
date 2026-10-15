import random
from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

BLANK = "___"
MAX_HINTS = 3
QUESTIONS_PER_DAY = 5
OSLO = ZoneInfo("Europe/Oslo")


@dataclass(frozen=True)
class Headline:
    id: int
    text: str  # contains BLANK where the hidden word goes
    answer: str
    story_id: str  # the story that holds the answer, for players who get stuck

    @property
    def full_text(self) -> str:
        return self.text.replace(BLANK, self.answer)


# The week's question pool, written from this week's Adresseavisen stories. Every answer is in
# its story but not in the story's title, which the quiz shows under «Saken bak spørsmålet».
HEADLINES = [
    Headline(
        1,
        f"NTNU-studenter må ta eksamen med penn og papir på grunn av {BLANK} i eksamenslokalene",
        "plassmangel",
        "adressa-b85jlv",
    ),
    Headline(
        2,
        f"Veidekke og Norconsult skal bygge et nytt {BLANK} for NTNU på Gløshaugen",
        "musikkhus",
        "adressa-gdR99q",
    ),
    Headline(
        3,
        f"MDG mener det ikke går an å ha flere {BLANK} gjennom Midtbyen, og vil heller ha bybane",
        "busser",
        "adressa-eGkEja",
    ),
    Headline(
        4,
        f"For å få råd til bybane vil MDG droppe store veiprosjekter som {BLANK}",
        "Byåstunnelen",
        "adressa-eGkEja",
    ),
    Headline(
        5,
        f"Politiet fant den stjålne elsykkelen fra garasjen på Havstein, men {BLANK} mangler fortsatt",
        "batteriet",
        "adressa-gdBzx0",
    ),
    Headline(
        6,
        f"På Rinnleiret i Levanger skal det bygges 37 nye {BLANK} til Forsvaret",
        "stridsvogner",
        "adressa-X9ev8o",
    ),
    Headline(
        7,
        f"Sigrid Strømmens debutroman handler om en 27-åring som flytter fra Trondheim til {BLANK}",
        "Oslo",
        "adressa-PdX23e",
    ),
    Headline(
        8,
        f"Trondhjems Kunstforening har gått til sak mot restauranten Bifrons over manglende {BLANK}",
        "husleie",
        "adressa-4OV4lR",
    ),
]

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
    """A new id every day starts a fresh game for every player."""
    return f"dag-{day.isoformat()}"


def hint(answer: str, level: int) -> str:
    """Level 1 shows the word length; each further level reveals one more letter."""
    revealed = min(level - 1, len(answer) - 1)
    return " ".join(answer[:revealed].upper() + "_" * (len(answer) - revealed))
