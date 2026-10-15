import pytest

from app import judge
from app.config import settings
from app.headlines import HEADLINES
from app.judge import Judgement, judge_guess


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "test.db"))


def test_same_guess_is_judged_once(monkeypatch) -> None:
    calls = []

    def fake_model(headline, guess):
        calls.append(guess)
        return Judgement(correct=False, score=len(calls) * 10)

    monkeypatch.setattr(judge, "_ask_model", fake_model)

    first = judge_guess(HEADLINES[0], "Lofoten")
    second = judge_guess(HEADLINES[0], "  lofoten ")
    other_headline = judge_guess(HEADLINES[1], "Lofoten")

    assert first == second == Judgement(correct=False, score=10)
    assert other_headline.score == 20
    assert calls == ["Lofoten", "Lofoten"]
