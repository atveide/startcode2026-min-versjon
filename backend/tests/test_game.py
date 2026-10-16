import json
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.api import routes
from app.config import settings
from app.generate_questions import gives_away, problems
from app.headlines import (
    BLANK,
    HEADLINES,
    HEADLINES_BY_ID,
    QUESTIONS_FILE,
    QUESTIONS_PER_DAY,
    Headline,
    daily_headlines,
    load_pool,
    quiz_id,
    today,
)
from app.judge import Judgement
from app.main import app
from app.stories import WEEK, load_stories

client = TestClient(app)
WEEK_BY_ID = {s.id: s for s in WEEK.stories}
# A fixed question, so the API tests don't depend on this week's pool.
KNOWN = Headline(
    999, f"MDG vil ha bybane i stedet for flere {BLANK} gjennom Midtbyen", "busser", "x"
)


@pytest.fixture
def no_cache(monkeypatch) -> None:
    monkeypatch.setattr(settings, "adressa_cache_dir", None)


@pytest.fixture
def known(monkeypatch) -> Headline:
    monkeypatch.setitem(HEADLINES_BY_ID, KNOWN.id, KNOWN)
    return KNOWN


@pytest.fixture
def cache(tmp_path, monkeypatch):
    """A tiny local Adressa cache with one imported article and its photo."""
    story = WEEK.stories[0]
    (tmp_path / "images").mkdir()
    (tmp_path / "images" / f"{story.id}.jpg").write_bytes(b"\xff\xd8\xff\xe0" + b"0" * 2048)
    (tmp_path / "articles.json").write_text(
        json.dumps(
            {
                "importedAt": "2026-10-15T18:00:00.000Z",
                "articles": [
                    {
                        "id": story.id,
                        "title": story.title,
                        "url": story.url,
                        "category": story.category,
                        "publishedAt": story.publishedAt,
                        "lead": "Ingress",
                        "authors": ["Journalist"],
                        "summary": {
                            "heading": "Kort oppsummert",
                            "bullets": ["Ett", "To"],
                            "source": "Adresseavisen",
                            "sourceUrl": story.url,
                            "disclosure": "Laget av KI og kvalitetssikret.",
                            "disclosureUrl": "https://www.adressa.no/forbruker/i/xgovkl",
                        },
                        "image": {
                            "file": f"{story.id}.jpg",
                            "src": "/media/adressa/x.jpg",
                            "credit": "FOTOGRAF",
                        },
                        "body": [{"type": "paragraph", "text": "Brødtekst"}],
                        "access": "available",
                    }
                ],
            }
        )
    )
    monkeypatch.setattr(settings, "adressa_cache_dir", str(tmp_path))
    return story


def test_every_question_points_to_a_story_of_the_week() -> None:
    for headline in HEADLINES:
        assert headline.story_id in WEEK_BY_ID, headline.id
        assert headline.text.count(BLANK) == 1, headline.id
        assert not gives_away(headline.answer, headline.text), headline.id


def test_story_titles_do_not_give_the_answer_away() -> None:
    # The quiz shows the story's title under «Saken bak spørsmålet».
    for headline in HEADLINES:
        assert not gives_away(headline.answer, WEEK_BY_ID[headline.story_id].title), headline.id


def test_pool_has_enough_stories_for_a_day() -> None:
    assert len({h.story_id for h in HEADLINES}) >= QUESTIONS_PER_DAY


def test_pool_file_holds_only_questions(tmp_path) -> None:
    pool = json.loads(QUESTIONS_FILE.read_text(encoding="utf-8"))
    assert all(set(q) == {"text", "answer", "story_id"} for q in pool)
    file = tmp_path / "questions.json"
    file.write_text(json.dumps([{"text": f"En {BLANK}", "answer": "sak", "story_id": "a"}] * 2))
    assert [h.id for h in load_pool(file)] == [1, 2]


@pytest.mark.skipif(
    not settings.adressa_cache_dir, reason="needs the local Adressa import (ADRESSA_CACHE_DIR)"
)
def test_every_answer_is_in_its_story() -> None:
    # Players who get stuck are sent to the story, so it must hold the answer.
    stories = {s.id: s for s in load_stories()[0]}
    for headline in HEADLINES:
        story = stories[headline.story_id]
        assert story.imported, story.id
        assert problems(headline, story) == [], headline.id


def test_daily_game_is_stable_within_a_day_and_changes_between_days() -> None:
    day = date(2026, 10, 15)
    game = daily_headlines(day)
    assert len(game) == QUESTIONS_PER_DAY
    assert len({h.story_id for h in game}) == QUESTIONS_PER_DAY
    assert [h.id for h in daily_headlines(day)] == [h.id for h in game]
    week = [[h.id for h in daily_headlines(day + timedelta(days=n))] for n in range(7)]
    assert len({tuple(g) for g in week}) > 1
    assert quiz_id(day) == "dag-2026-10-15-" + ".".join(str(h.id) for h in game)


def test_quiz_is_todays_game() -> None:
    body = client.get("/api/quiz").json()
    assert body["id"] == quiz_id(today())
    assert body["week"] == WEEK.week
    assert len(body["headlines"]) == QUESTIONS_PER_DAY
    assert all(set(h) == {"id", "text", "story_id"} for h in body["headlines"])


def test_stories_without_a_local_import_are_public_facts_only(no_cache) -> None:
    body = client.get("/api/stories").json()
    assert body["importedAt"] is None
    assert [s["id"] for s in body["stories"]] == sorted(
        (s.id for s in WEEK.stories), key=lambda i: WEEK_BY_ID[i].publishedAt, reverse=True
    )
    for story in body["stories"]:
        assert story["imported"] is False
        assert story["summary"] is None and story["body"] == []
        assert story["url"].startswith("https://www.adressa.no/")
        # Only Adressa's public share image, linked from their image service, never a copy.
        if story["image"]:
            assert story["image"]["src"].startswith("https://vcdn.polarismedia.no/")
    assert client.get("/api/stories/finnes-ikke").status_code == 404


def test_stories_use_the_local_import_when_there_is_one(cache) -> None:
    story = client.get(f"/api/stories/{cache.id}").json()
    assert story["imported"] is True
    assert story["summary"]["bullets"] == ["Ett", "To"]
    assert story["image"]["src"] == f"/api/media/adressa/{cache.id}.jpg"
    assert story["body"][0]["text"] == "Brødtekst"
    assert client.get("/api/stories").json()["importedAt"] == "2026-10-15T18:00:00.000Z"
    image = client.get(story["image"]["src"])
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/jpeg"
    for name in ["..%2Farticles.json", "articles.json", f"{cache.id}.exe"]:
        assert client.get(f"/api/media/adressa/{name}").status_code == 404, name


def test_guess_below_threshold(monkeypatch, known) -> None:
    monkeypatch.setattr(routes, "judge_guess", lambda h, g: Judgement(correct=False, score=42))
    response = client.post("/api/guess", json={"headline_id": known.id, "guess": "trikker"})
    assert response.json() == {"score": 42, "solved": False, "answer": None, "full_text": None}


def test_guess_solved(monkeypatch, known) -> None:
    monkeypatch.setattr(routes, "judge_guess", lambda h, g: Judgement(correct=True, score=100))
    response = client.post("/api/guess", json={"headline_id": known.id, "guess": "bussene"})
    body = response.json()
    assert body["solved"] is True
    assert body["answer"] == "busser"
    assert body["full_text"] == "MDG vil ha bybane i stedet for flere busser gjennom Midtbyen"


def test_unknown_headline() -> None:
    response = client.post("/api/guess", json={"headline_id": 999, "guess": "x"})
    assert response.status_code == 404


def test_exact_answer_skips_model() -> None:
    from app.judge import judge_guess

    assert judge_guess(KNOWN, "  BUSSER ") == Judgement(correct=True, score=100)


def test_hints_reveal_letters_progressively(known) -> None:
    url = f"/api/headlines/{known.id}/hint"
    levels = [client.get(f"{url}/{n}").json()["hint"] for n in (1, 2, 3)]
    assert levels == ["_ _ _ _ _ _", "B _ _ _ _ _", "B U _ _ _ _"]
    assert client.get(f"{url}/4").status_code == 422


def test_reveal(known) -> None:
    response = client.post(f"/api/headlines/{known.id}/reveal")
    assert response.json()["answer"] == "busser"
