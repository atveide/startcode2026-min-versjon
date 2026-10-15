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
    Headline(
        9,
        f"NTNU-studentene fikk velge mellom papireksamen før jul eller {BLANK} eksamen etter jul",
        "digital",
        "adressa-b85jlv",
    ),
    Headline(
        10,
        f"Det nye musikkhuset for NTNU på Gløshaugen skal hete {BLANK}",
        "Resonans",
        "adressa-gdR99q",
    ),
    Headline(
        11,
        f"Byplankontoret har {BLANK} bygging på den østre tomta ved Søndre Halset borettslag",
        "avvist",
        "adressa-77RoE4",
    ),
    Headline(
        12,
        f"Familien på Havstein hadde installert {BLANK} i garasjen før innbruddet",
        "overvåkningskamera",
        "adressa-gdBzx0",
    ),
    Headline(
        13,
        f"Sjefen for Hærens våpenskole kaller Norges nye Leopard 2 A8 NOR «en helt fantastisk {BLANK}»",
        "vogn",
        "adressa-X9ev8o",
    ),
    Headline(
        14,
        f"Sigrid Strømmens roman er delt i tre deler: «Trondheim», «Oslo» og «{BLANK}»",
        "Skogen",
        "adressa-PdX23e",
    ),
    Headline(
        15,
        f"Restauranten Bifrons holder til i Bispegata 9A, rett ved {BLANK}",
        "Nidarosdomen",
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
    """A new id every day starts a fresh game for every player.

    It includes the questions, so a game that changes during the day (a new question pool)
    also starts fresh instead of reusing progress made on other questions.
    """
    return f"dag-{day.isoformat()}-" + ".".join(str(h.id) for h in daily_headlines(day))


def hint(answer: str, level: int) -> str:
    """Level 1 shows the word length; each further level reveals one more letter."""
    revealed = min(level - 1, len(answer) - 1)
    return " ".join(answer[:revealed].upper() + "_" * (len(answer) - revealed))
