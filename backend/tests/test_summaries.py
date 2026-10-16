import json

import anthropic
import httpx2
import pytest
from fastapi.testclient import TestClient

from app import summaries
from app.config import settings
from app.main import app
from app.stories import Block, Story, Summary
from app.summaries import (
    LABEL,
    SummaryDraft,
    SummaryError,
    attach,
    generate,
    problems,
    source_text,
)

client = TestClient(app)
MODEL = "claude-sonnet-5-5"
GOOD = SummaryDraft(
    status="ok",
    points=[
        "MDG i Trondheim vil ha bybane i stedet for Byåstunnelen",
        "Partiet foreslår å utrede bybanen etter modell fra Bergen",
    ],
)

STORY = Story(
    id="adressa-test",
    title="Vil vrake store prosjekt – går inn for bybane",
    url="https://www.adressa.no/politikk/i/test",
    category="Politikk",
    publishedAt="2026-10-15T06:39:24.000Z",
    lead="Glem Byåstunnelen.",
    summary=Summary(
        heading="Kort oppsummert",
        bullets=["Adressas eget punkt."],
        source="Adresseavisen",
        sourceUrl="https://www.adressa.no/politikk/i/test",
        disclosure="Laget med KI og kvalitetssikret av redaksjonen.",
    ),
    body=[Block(type="paragraph", text="MDG vil bruke milliarder på bybane i Trondheim.")],
    imported=True,
)


class Asker:
    """A stand-in for the model that counts its calls."""

    def __init__(self, result=GOOD):
        self.result = result
        self.calls: list[tuple[str, str]] = []

    def __call__(self, story: Story, text: str, model: str) -> SummaryDraft:
        self.calls.append((story.id, model))
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


def test_the_same_text_prompt_and_model_is_summarised_once() -> None:
    ask = Asker()
    first = generate([STORY], ask, MODEL)
    second = generate([STORY], ask, MODEL)
    assert first.made == [STORY.id] and second.cached == [STORY.id]
    assert len(ask.calls) == 1


def test_changed_text_prompt_or_model_makes_a_new_summary(monkeypatch) -> None:
    ask = Asker()
    generate([STORY], ask, MODEL)
    edited = STORY.model_copy(
        update={"body": [Block(type="paragraph", text="MDG har endret forslaget sitt.")]}
    )
    generate([edited], ask, MODEL)
    generate([edited], ask, "claude-sonnet-annen")
    monkeypatch.setattr(summaries, "PROMPT_VERSION", "2")
    generate([edited], ask, MODEL)
    assert len(ask.calls) == 4


def test_stored_summary_is_served_apart_from_adressas_own() -> None:
    generate([STORY], Asker(), MODEL)
    [story] = attach([STORY], MODEL)
    summary = story.opplystSummary
    assert summary.points == GOOD.points
    assert summary.label == LABEL == "Oppsummert av Oppdatert med KI"
    assert summary.model == MODEL and summary.promptVersion == summaries.PROMPT_VERSION
    assert summary.source == "Adresseavisen" and summary.sourceUrl == STORY.url
    # Adressa's «Kort oppsummert» and the lead are untouched.
    assert story.summary == STORY.summary and story.lead == STORY.lead


def test_summary_of_old_text_or_another_model_is_not_served() -> None:
    generate([STORY], Asker(), MODEL)
    edited = STORY.model_copy(update={"title": "Ny tittel"})
    assert attach([edited], MODEL)[0].opplystSummary is None
    assert attach([STORY], "claude-annen")[0].opplystSummary is None


def _status_error(cls, code: int):
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls("feil", response=httpx2.Response(code, request=request), body=None)


@pytest.mark.parametrize(
    "result,reason",
    [
        (_status_error(anthropic.RateLimitError, 429), "rate limit"),
        (anthropic.APITimeoutError(request=httpx2.Request("POST", "https://x")), "tidsavbrudd"),
        (_status_error(anthropic.InternalServerError, 500), "API-feil 500"),
        (SummaryError("modellen avslo (refusal)"), "refusal"),
        (SummaryDraft(status="ok", points=["Bare ett punkt om bybanen i Trondheim"]), "punkter"),
        (SummaryDraft(status="ok", points=["For kort", "Altfor kort"]), "ord"),
        (
            SummaryDraft(status="ok", points=[" ".join(["ord"] * 16), "Kort punkt her"]),
            "langt punkt",
        ),
    ],
)
def test_failures_store_nothing_and_leave_the_lead(result, reason: str) -> None:
    report = generate([STORY], Asker(result), MODEL)
    assert report.made == [] and report.failed[0][0] == STORY.id
    assert reason in report.failed[0][1]
    assert attach([STORY], MODEL)[0].opplystSummary is None
    # A failure is tried again next time.
    assert generate([STORY], Asker(), MODEL).made == [STORY.id]


def test_story_without_text_is_never_sent_to_the_model() -> None:
    bare = STORY.model_copy(update={"body": [], "imported": False})
    ask = Asker()
    report = generate([bare], ask, MODEL)
    assert ask.calls == [] and report.skipped == [(bare.id, "ingen artikkeltekst i importen")]
    assert source_text(bare) is None


def test_insufficient_source_is_remembered_but_not_shown() -> None:
    ask = Asker(SummaryDraft(status="insufficient_source", points=[]))
    assert generate([STORY], ask, MODEL).skipped
    assert generate([STORY], ask, MODEL).skipped
    assert len(ask.calls) == 1
    assert attach([STORY], MODEL)[0].opplystSummary is None


def test_without_a_key_nothing_is_made() -> None:
    report = generate([STORY], None, MODEL, why_not="mangler ANTHROPIC_API_KEY")
    assert report.skipped == [(STORY.id, "mangler ANTHROPIC_API_KEY")]


def test_source_text_marks_the_story_as_data() -> None:
    text = source_text(STORY)
    assert text.startswith("<sak>\n") and text.endswith("\n</sak>")
    assert "Kilde: Adresseavisen (https://www.adressa.no/politikk/i/test)" in text
    assert "Publisert: 2026-10-15T06:39:24.000Z" in text
    # Only the journalism: Adressa's own AI summary is not part of what we summarise.
    assert "Adressas eget punkt" not in text


def test_problems_check_the_form() -> None:
    assert problems(GOOD) == []
    assert problems(SummaryDraft(status="insufficient_source", points=["x"]))
    listed = SummaryDraft(status="ok", points=["- " + p for p in GOOD.points])
    assert "formatering eller lenke i punktet" in problems(listed)


def test_api_serves_stored_summaries_for_the_local_import(tmp_path, monkeypatch) -> None:
    article = {
        **STORY.model_dump(exclude={"opplystSummary", "imported"}),
        "opplystSummary": {"points": ["Smuglet inn fra importen"]},
    }
    (tmp_path / "articles.json").write_text(json.dumps({"articles": [article]}))
    monkeypatch.setattr(settings, "adressa_cache_dir", str(tmp_path))
    story = client.get(f"/api/stories/{STORY.id}").json()
    # Nothing from the import itself counts as an Opplyst summary.
    assert story["opplystSummary"] is None

    generate([STORY], Asker(), settings.summary_model)
    story = client.get(f"/api/stories/{STORY.id}").json()
    assert story["opplystSummary"]["points"] == GOOD.points
    assert story["opplystSummary"]["label"] == LABEL
    assert story["summary"]["bullets"] == ["Adressas eget punkt."]


def test_a_draft_with_the_wrong_form_is_asked_for_once_more() -> None:
    two_in_one = SummaryDraft(
        status="ok",
        points=["MDG vil ha bybane. Partiet vil droppe Byåstunnelen", "Kort punkt om saken"],
    )
    assert "flere setninger i ett punkt" in problems(two_in_one)
    book = "Strømmen debuterer med «Bli borte. Ikke dø. Begynn på nytt»"
    assert problems(SummaryDraft(status="ok", points=[book, GOOD.points[1]])) == []
    answers = iter([two_in_one, GOOD])
    calls = []

    def ask(story: Story, text: str, model: str) -> SummaryDraft:
        calls.append(story.id)
        return next(answers)

    assert generate([STORY], ask, MODEL).made == [STORY.id]
    assert len(calls) == 2


def test_points_lose_a_final_full_stop() -> None:
    dotted = SummaryDraft(status="ok", points=[p + "." for p in GOOD.points])
    generate([STORY], Asker(dotted), MODEL)
    assert attach([STORY], MODEL)[0].opplystSummary.points == GOOD.points


def test_export_holds_only_summaries_for_the_current_text() -> None:
    generate([STORY], Asker(), MODEL)
    edited = STORY.model_copy(update={"id": "adressa-annen", "title": "Annen sak"})
    exported = summaries.exported([STORY, edited], MODEL)
    assert list(exported) == [STORY.id]
    assert exported[STORY.id]["points"] == GOOD.points
    assert exported[STORY.id]["label"] == LABEL
