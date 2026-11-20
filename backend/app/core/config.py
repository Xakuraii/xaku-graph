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
    EMBEDDING_CACHE_DIR: Path = CACHE_DIR / "embeddings"
    RAG_CACHE_DIR: Path = CACHE_DIR / "rag"
    SAMPLES_DIR: Path = DATA_DIR / "samples"
    SQLITE_DB_PATH: Path = DATA_DIR / "xakugraph.db"

    ALLOWED_DATASET_EXTENSIONS: tuple[str, ...] = (
        ".csv",
        ".json",
        ".jsonl",
        ".parquet",
        ".xlsx",
    )
    ALLOWED_IMAGE_EXTENSIONS: tuple[str, ...] = (
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".bmp",
    )
    MAX_UPLOAD_SIZE_MB: int = 100
    MAX_PREVIEW_ROWS: int = 100
    MAX_EMBEDDING_ITEMS: int = 2000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    def ensure_storage_dirs(self) -> None:
        """Create required local storage directories if they do not exist."""
        for directory in (
            self.DATA_DIR,
            self.UPLOADS_DIR,
            self.PROCESSED_DIR,
            self.CACHE_DIR,
            self.EMBEDDING_CACHE_DIR,
            self.RAG_CACHE_DIR,
        ):
            directory.mkdir(parents=True, exist_ok=True)


settings = Settings()
