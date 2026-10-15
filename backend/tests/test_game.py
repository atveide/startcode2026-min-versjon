from fastapi.testclient import TestClient

from app.api import routes
from app.headlines import HEADLINES, QUIZ_ID
from app.judge import Judgement
from app.main import app
from app.stories import STORIES, STORIES_BY_ID

client = TestClient(app)


def test_headlines_hide_answers() -> None:
    response = client.get("/api/headlines")
    assert response.status_code == 200
    for item, headline in zip(response.json(), HEADLINES):
        assert set(item) == {"id", "text", "story_id"}
        assert headline.answer.lower() not in item["text"].lower()


def test_every_answer_is_in_its_story() -> None:
    # Players who get stuck are sent to the story, so it must hold the answer.
    for headline in HEADLINES:
        story = STORIES_BY_ID[headline.story_id]
        assert headline.answer.lower() in story.text.lower(), headline.id


def test_quiz() -> None:
    body = client.get("/api/quiz").json()
    assert body["id"] == QUIZ_ID
    assert [h["id"] for h in body["headlines"]] == [h.id for h in HEADLINES]
    assert all(set(h) == {"id", "text", "story_id"} for h in body["headlines"])


def test_stories() -> None:
    body = client.get("/api/stories").json()
    assert [s["id"] for s in body["stories"]] == [s.id for s in STORIES]
    story = client.get(f"/api/stories/{STORIES[1].id}").json()
    assert story["title"] == STORIES[1].title
    assert client.get("/api/stories/finnes-ikke").status_code == 404


def test_guess_below_threshold(monkeypatch) -> None:
    monkeypatch.setattr(routes, "judge_guess", lambda h, g: Judgement(correct=False, score=42))
    response = client.post("/api/guess", json={"headline_id": 1, "guess": "Lofoten"})
    assert response.json() == {"score": 42, "solved": False, "answer": None, "full_text": None}


def test_guess_solved(monkeypatch) -> None:
    monkeypatch.setattr(routes, "judge_guess", lambda h, g: Judgement(correct=True, score=100))
    response = client.post("/api/guess", json={"headline_id": 1, "guess": "kontroll"})
    body = response.json()
    assert body["solved"] is True
    assert body["answer"] == "billettkontroll"


def test_unknown_headline() -> None:
    response = client.post("/api/guess", json={"headline_id": 999, "guess": "x"})
    assert response.status_code == 404


def test_exact_answer_skips_model() -> None:
    from app.judge import judge_guess

    assert judge_guess(HEADLINES[0], "  BILLETTKONTROLL ") == Judgement(correct=True, score=100)


def test_hints_reveal_letters_progressively() -> None:
    levels = [client.get(f"/api/headlines/4/hint/{n}").json()["hint"] for n in (1, 2, 3)]
    assert levels == ["_ _ _ _ _", "V _ _ _ _", "V E _ _ _"]
    assert client.get("/api/headlines/4/hint/4").status_code == 422


def test_reveal() -> None:
    response = client.post("/api/headlines/2/reveal")
    assert response.json()["answer"] == "isolat"
