import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def isolated(tmp_path, monkeypatch) -> None:
    """Every test gets its own database and an empty video folder, never the local ones."""
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "test.db"))
    monkeypatch.setattr(settings, "video_media_dir", str(tmp_path / "no-videos"))
    monkeypatch.setattr(settings, "video_public_url", "")
