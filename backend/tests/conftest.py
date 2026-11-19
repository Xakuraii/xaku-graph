from pathlib import Path

import pytest

from app.core.config import settings


@pytest.fixture
def isolated_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Redirect mutable dataset storage paths to a temporary directory per test."""
    uploads = tmp_path / "uploads"
    processed = tmp_path / "processed"
    cache = tmp_path / "cache"
    db_path = tmp_path / "xakugraph_test.db"

    uploads.mkdir(parents=True, exist_ok=True)
    processed.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(settings, "DATA_DIR", tmp_path)
    monkeypatch.setattr(settings, "UPLOADS_DIR", uploads)
    monkeypatch.setattr(settings, "PROCESSED_DIR", processed)
    monkeypatch.setattr(settings, "CACHE_DIR", cache)
    monkeypatch.setattr(settings, "SQLITE_DB_PATH", db_path)

    return tmp_path
