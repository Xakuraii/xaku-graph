from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "XakuGraph Backend Engine"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "tauri://localhost",
    ]

    # Storage paths relative to project root or configured via env
    DATA_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent / "data"
    UPLOADS_DIR: Path = DATA_DIR / "uploads"
    PROCESSED_DIR: Path = DATA_DIR / "processed"
    CACHE_DIR: Path = DATA_DIR / "cache"
    SAMPLES_DIR: Path = DATA_DIR / "samples"

    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_PREVIEW_ROWS: int = 100

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
