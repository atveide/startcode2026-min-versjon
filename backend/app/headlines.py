from dataclasses import dataclass

BLANK = "___"
MAX_HINTS = 3

# The quiz is weekly: a new id starts a fresh round for every player.
QUIZ_ID = "2026-uke-42"
QUIZ_WEEK = 42


@dataclass(frozen=True)
class Headline:
    id: int
    text: str  # contains BLANK where the hidden word goes
    answer: str
    story_id: str  # the story that holds the answer, for players who get stuck

    @property
    def full_text(self) -> str:
        return self.text.replace(BLANK, self.answer)


HEADLINES = [
    Headline(
        1,
        f"To vektere ble angrepet under {BLANK} på en buss på Nesodden",
        "billettkontroll",
        "6aa3970d-0f96-4fa6-8317-6efda75b5d2c",
    ),
    Headline(
        2,
        f"Diddy og motstanderen havnet i {BLANK} i to uker etter fengselskampen",
        "isolat",
        "a26a6ab3-6e7f-45db-8a66-2b1315d9733c",
    ),
    Headline(
        3,
        f"Isabelle Eriksen er gravid – graviditeten var ikke {BLANK}",
        "planlagt",
        "506a1c27-8236-4bc4-b110-71d550d73a82",
    ),
    Headline(
        4,
        f"Spor fra jentas {BLANK} knyttet drap fra 1960 til en politietterforsker",
        "veske",
        "c93cbf33-0c5f-4004-a582-a847cc2b8b96",
    ),
    Headline(
        5,
        f"78 mål på 18 kamper ga ny {BLANK} i Champions League-runden",
        "rekord",
        "b21dceae-645f-465e-8df2-eb75ee43fb54",
    ),
]

HEADLINES_BY_ID = {h.id: h for h in HEADLINES}


def hint(answer: str, level: int) -> str:
    """Level 1 shows the word length; each further level reveals one more letter."""
    revealed = min(level - 1, len(answer) - 1)
    return " ".join(answer[:revealed].upper() + "_" * (len(answer) - revealed))
