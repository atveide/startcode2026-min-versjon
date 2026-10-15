from dataclasses import dataclass

BLANK = "___"


@dataclass(frozen=True)
class Headline:
    id: int
    text: str  # contains BLANK where the hidden word goes
    answer: str

    @property
    def full_text(self) -> str:
        return self.text.replace(BLANK, self.answer)


HEADLINES = [
    Headline(1, f"Rekordmange turister besøkte {BLANK} i sommer", "Nordkapp"),
    Headline(2, f"Kraftig {BLANK} skapte trafikkaos på Østlandet", "snøfall"),
    Headline(3, f"Regjeringen vil øke {BLANK} til forsvaret", "bevilgningene"),
    Headline(4, f"Ny studie: {BLANK} gjør deg lykkeligere", "søvn"),
    Headline(5, f"Elg sperret {BLANK} i over en time", "motorveien"),
]

HEADLINES_BY_ID = {h.id: h for h in HEADLINES}
