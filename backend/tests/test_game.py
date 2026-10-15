from fastapi.testclient import TestClient

from app.api import routes
from app.headlines import HEADLINES
from app.main import app

client = TestClient(app)


def test_headlines_hide_answers() -> None:
    response = client.get("/api/headlines")
    assert response.status_code == 200
    for item, headline in zip(response.json(), HEADLINES):
        assert set(item) == {"id", "text"}
        assert headline.answer not in item["text"]


def test_guess_below_threshold(monkeypatch) -> None:
    monkeypatch.setattr(routes, "word_similarity", lambda guess, target: 42)
    response = client.post("/api/guess", json={"headline_id": 1, "guess": "Lofoten"})
    assert response.json() == {"score": 42, "solved": False, "answer": None, "full_text": None}


def test_guess_solved(monkeypatch) -> None:
    monkeypatch.setattr(routes, "word_similarity", lambda guess, target: 95)
    response = client.post("/api/guess", json={"headline_id": 1, "guess": "nordkapp"})
    body = response.json()
    assert body["solved"] is True
    assert body["answer"] == "Nordkapp"


def test_unknown_headline() -> None:
    response = client.post("/api/guess", json={"headline_id": 999, "guess": "x"})
    assert response.status_code == 404
