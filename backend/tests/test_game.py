from fastapi.testclient import TestClient

from app.api import routes
from app.headlines import HEADLINES
from app.judge import Judgement
from app.main import app

client = TestClient(app)


def test_headlines_hide_answers() -> None:
    response = client.get("/api/headlines")
    assert response.status_code == 200
    for item, headline in zip(response.json(), HEADLINES):
        assert set(item) == {"id", "text"}
        assert headline.answer not in item["text"]


def test_guess_below_threshold(monkeypatch) -> None:
    monkeypatch.setattr(routes, "judge_guess", lambda h, g: Judgement(correct=False, score=42))
    response = client.post("/api/guess", json={"headline_id": 1, "guess": "Lofoten"})
    assert response.json() == {"score": 42, "solved": False, "answer": None, "full_text": None}


def test_guess_solved(monkeypatch) -> None:
    monkeypatch.setattr(routes, "judge_guess", lambda h, g: Judgement(correct=True, score=100))
    response = client.post("/api/guess", json={"headline_id": 1, "guess": "nordkapp"})
    body = response.json()
    assert body["solved"] is True
    assert body["answer"] == "Nordkapp"


def test_unknown_headline() -> None:
    response = client.post("/api/guess", json={"headline_id": 999, "guess": "x"})
    assert response.status_code == 404


def test_exact_answer_skips_model() -> None:
    from app.judge import judge_guess

    assert judge_guess(HEADLINES[0], "  NORDKAPP ") == Judgement(correct=True, score=100)


def test_hints_reveal_letters_progressively() -> None:
    levels = [client.get(f"/api/headlines/1/hint/{n}").json()["hint"] for n in (1, 2, 3)]
    assert levels == ["_ _ _ _ _ _ _ _", "N _ _ _ _ _ _ _", "N O _ _ _ _ _ _"]
    assert client.get("/api/headlines/1/hint/4").status_code == 422


def test_reveal() -> None:
    response = client.post("/api/headlines/1/reveal")
    assert response.json()["answer"] == "Nordkapp"
