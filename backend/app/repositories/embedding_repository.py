import hashlib
import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np

from app.core.config import settings
from app.services.datasets.loaders import validate_safe_path
from app.services.embeddings.adapters import EmbeddingModality


@dataclass(frozen=True)
class EmbeddingSpaceRecord:
    """Metadata record for a stored embedding space (vectors live on disk as .npy)."""

    id: str
    name: str
    modality: EmbeddingModality
    model_id: str
    dimensions: int
    item_count: int
    metadata_keys: list[str]
    vectors_path: str
    items_path: str
    source_dataset_id: str | None
    is_sample: bool
    created_at: datetime


class EmbeddingRepository:
    """SQLite metadata store + dedicated .npy binary cache for embedding spaces."""

    def __init__(self, db_path: Path | None = None) -> None:
        self._db_path = db_path

    @property
    def db_path(self) -> Path:
        return self._db_path if self._db_path is not None else settings.SQLITE_DB_PATH

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS embedding_spaces (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    modality TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    dimensions INTEGER NOT NULL,
                    item_count INTEGER NOT NULL,
                    metadata_keys_json TEXT NOT NULL,
                    vectors_path TEXT NOT NULL,
                    items_path TEXT NOT NULL,
                    source_dataset_id TEXT,
                    is_sample INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                )
                """
            )

    def save_space(
        self,
        record: EmbeddingSpaceRecord,
        vectors: np.ndarray,
        items: list[dict[str, Any]],
    ) -> EmbeddingSpaceRecord:
        settings.ensure_storage_dirs()
        self.ensure_schema()

        vectors_path = validate_safe_path(settings.EMBEDDING_CACHE_DIR, Path(record.vectors_path))
        items_path = validate_safe_path(settings.EMBEDDING_CACHE_DIR, Path(record.items_path))

        np.save(vectors_path, np.asarray(vectors, dtype=np.float32))
        items_path.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")

        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO embedding_spaces (
                    id, name, modality, model_id, dimensions, item_count,
                    metadata_keys_json, vectors_path, items_path,
                    source_dataset_id, is_sample, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.name,
                    record.modality,
                    record.model_id,
                    record.dimensions,
                    record.item_count,
                    json.dumps(record.metadata_keys),
                    str(vectors_path),
                    str(items_path),
                    record.source_dataset_id,
                    1 if record.is_sample else 0,
                    record.created_at.isoformat(),
                ),
            )
        return record

    def get_record(self, space_id: str) -> EmbeddingSpaceRecord | None:
        self.ensure_schema()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM embedding_spaces WHERE id = ?",
                (space_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_record(row)

    def load_space_payload(
        self, space_id: str
    ) -> tuple[EmbeddingSpaceRecord, np.ndarray, list[dict[str, Any]]] | None:
        record = self.get_record(space_id)
        if record is None:
            return None

        vectors_path = validate_safe_path(settings.EMBEDDING_CACHE_DIR, Path(record.vectors_path))
        items_path = validate_safe_path(settings.EMBEDDING_CACHE_DIR, Path(record.items_path))
        if not vectors_path.exists() or not items_path.exists():
            return None

        vectors = np.load(vectors_path, allow_pickle=False)
        items = json.loads(items_path.read_text(encoding="utf-8"))
        return record, vectors, items

    def list_records(self) -> list[EmbeddingSpaceRecord]:
        self.ensure_schema()
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM embedding_spaces ORDER BY is_sample DESC, created_at DESC"
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    def delete_space(self, space_id: str) -> bool:
        record = self.get_record(space_id)
        if record is None:
            return False

        vectors_path = validate_safe_path(settings.EMBEDDING_CACHE_DIR, Path(record.vectors_path))
        items_path = validate_safe_path(settings.EMBEDDING_CACHE_DIR, Path(record.items_path))
        vectors_path.unlink(missing_ok=True)
        items_path.unlink(missing_ok=True)

        with self._connect() as conn:
            cursor = conn.execute("DELETE FROM embedding_spaces WHERE id = ?", (space_id,))
            return cursor.rowcount > 0

    @staticmethod
    def content_cache_key(model_id: str, payload: bytes) -> str:
        h = hashlib.sha256()
        h.update(model_id.encode("utf-8"))
        h.update(b"::")
        h.update(payload)
        return h.hexdigest()

    @staticmethod
    def _row_to_record(row: sqlite3.Row) -> EmbeddingSpaceRecord:
        return EmbeddingSpaceRecord(
            id=row["id"],
            name=row["name"],
            modality=row["modality"],
            model_id=row["model_id"],
            dimensions=row["dimensions"],
            item_count=row["item_count"],
            metadata_keys=json.loads(row["metadata_keys_json"]),
            vectors_path=row["vectors_path"],
            items_path=row["items_path"],
            source_dataset_id=row["source_dataset_id"],
            is_sample=bool(row["is_sample"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )


embedding_repository = EmbeddingRepository()
