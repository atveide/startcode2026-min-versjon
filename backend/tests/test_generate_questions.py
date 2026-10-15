import pytest

from app.generate_questions import ATTEMPTS, PER_STORY, Suggestion, build_pool, problems
from app.headlines import BLANK, Headline
from app.stories import Block, Story

STORY = Story(
    id="adressa-test",
    title="Vil bygge 140 boliger på parkeringsplassen",
    url="https://www.adressa.no/nyheter/i/test",
    category="nyheter",
    publishedAt="2026-10-15T10:00:00+02:00",
    body=[
        Block(
            type="paragraph",
            text="Borettslaget på Søndre Halset vil selge tomta. Byplankontoret har sagt nei "
            "til bygging på den østre delen av tomta, fordi den ligger nær en bekk.",
        ),
        Block(type="list", items=["Utbyggeren håper på svar fra politikerne i desember."]),
    ],
)


def question(text: str, answer: str) -> Headline:
    return Headline(0, text, answer, STORY.id)


def test_a_good_question_passes() -> None:
    q = question(
        f"Kommunen sier nei til boliger på den ene delen fordi tomta ligger ved en {BLANK}", "bekk"
    )
    assert problems(q, STORY) == []


def test_answers_in_lists_and_with_other_case_count_as_in_the_story() -> None:
    q = question(f"Utbyggeren venter på svar fra {BLANK} før jul", "Politikerne")
    assert problems(q, STORY) == []


@pytest.mark.parametrize(
    "answer",
    [
        "elv",  # not in the story at all
        "bekken",  # another form than the story uses
        "laget",  # only inside a longer word
    ],
)
def test_answer_must_be_in_the_story(answer: str) -> None:
    q = question(f"Tomta ligger ved en {BLANK}", answer)
    assert problems(q, STORY) == ["svaret står ikke i saken"]


@pytest.mark.parametrize("answer", ["boliger", "parkeringsplassen"])
def test_answer_must_not_be_in_the_title(answer: str) -> None:
    q = question(f"Borettslaget på Søndre Halset vil ha {BLANK}", answer)
    assert "svaret står i tittelen" in problems(q, STORY)


def test_another_form_of_a_title_word_gives_the_answer_away() -> None:
    more = Block(type="paragraph", text="Boligene skal stå ferdig i 2029.")
    story = STORY.model_copy(update={"title": "Vil bygge 140 boliger", "body": [*STORY.body, more]})
    q = question(f"De nye {BLANK} skal stå ferdig i 2029", "Boligene")
    assert problems(q, story) == ["svaret står i tittelen"]


def test_soft_hyphens_in_the_title_do_not_hide_the_answer() -> None:
    story = STORY.model_copy(
        update={"title": "Vil bygge 140 boliger på parke\u00adrings\u00adplassen"}
    )
    q = question(f"Borettslaget vil bygge på {BLANK}", "parkeringsplassen")
    assert "svaret står i tittelen" in problems(q, story)


def test_answer_must_not_be_in_the_sentence() -> None:
    q = question(f"Tomta ligger ved en {BLANK}, og bekken renner forbi", "bekk")
    assert problems(q, STORY) == ["svaret står i setningen"]


@pytest.mark.parametrize("text", ["Tomta ligger ved en bekk", f"{BLANK} ligger ved en {BLANK}"])
def test_sentence_needs_exactly_one_blank(text: str) -> None:
    assert f"setningen må ha nøyaktig én {BLANK}" in problems(question(text, "bekk"), STORY)


@pytest.mark.parametrize("answer", ["Søndre Halset", "", "bekk."])
def test_answer_must_be_one_word(answer: str) -> None:
    q = question(f"Borettslaget ligger på {BLANK}", answer)
    assert "svaret må være ett ord" in problems(q, STORY)


def test_sentence_must_not_be_copied_from_the_story() -> None:
    q = question(f"{BLANK} har sagt nei til bygging på den østre delen av tomta", "Byplankontoret")
    assert problems(q, STORY) == ["setningen er kopiert fra saken"]


def test_pool_keeps_the_first_valid_suggestions_and_only_question_fields() -> None:
    other = STORY.model_copy(update={"id": "adressa-annen", "title": "Noe helt annet"})
    asked: list[str] = []

    def ask(story: Story) -> list[Suggestion]:
        asked.append(story.id)
        if story.id == other.id:
            return [Suggestion(text=f"Ingen {BLANK} her", answer="ingenting")]
        return [
            Suggestion(text=f"Det skal bygges {BLANK} på tomta", answer="boliger"),  # in title
            Suggestion(text=f"Tomta ligger ved en {BLANK}", answer="bekk"),
            Suggestion(text=f"Tomta ved en liten {BLANK} er uaktuell", answer="bekk"),  # same
            Suggestion(text=f"Utbyggeren venter på {BLANK}", answer="politikerne"),
            Suggestion(text=f"{BLANK} har sagt nei til deler av planen", answer="Byplankontoret"),
        ]

    pool = build_pool([STORY, other], ask)

    assert (
        pool
        == [
            {"text": f"Tomta ligger ved en {BLANK}", "answer": "bekk", "story_id": STORY.id},
            {
                "text": f"Utbyggeren venter på {BLANK}",
                "answer": "politikerne",
                "story_id": STORY.id,
            },
        ][:PER_STORY]
    )
    # A story without a valid suggestion is asked again before it is left out.
    assert asked.count(other.id) == ATTEMPTS and asked.count(STORY.id) == 1
