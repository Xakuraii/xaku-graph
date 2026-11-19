import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.core.config import settings


@dataclass(frozen=True)
class DatasetRecord:
    """Persistent metadata record for an imported dataset stored in SQLite."""

    id: str
    name: str
    source_format: str
    original_filename: str
    raw_path: str
    processed_path: str
    row_count: int
    column_count: int
    columns: list[str]
    memory_bytes: int
    file_size_bytes: int
    created_at: datetime


class DatasetRepository:
    """SQLite-backed metadata repository for uploaded and processed datasets."""

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
                CREATE TABLE IF NOT EXISTS datasets (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    source_format TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    raw_path TEXT NOT NULL,
                    processed_path TEXT NOT NULL,
                    row_count INTEGER NOT NULL,
                    column_count INTEGER NOT NULL,
                    columns_json TEXT NOT NULL,
                    memory_bytes INTEGER NOT NULL,
                    file_size_bytes INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )

    def save(self, record: DatasetRecord) -> DatasetRecord:
        self.ensure_schema()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO datasets (
                    id, name, source_format, original_filename,
                    raw_path, processed_path, row_count, column_count,
                    columns_json, memory_bytes, file_size_bytes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.name,
                    record.source_format,
                    record.original_filename,
                    record.raw_path,
                    record.processed_path,
                    record.row_count,
                    record.column_count,
                    json.dumps(record.columns),
                    record.memory_bytes,
                    record.file_size_bytes,
                    record.created_at.isoformat(),
                ),
            )
        return record

    def get(self, dataset_id: str) -> DatasetRecord | None:
        self.ensure_schema()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM datasets WHERE id = ?",
                (dataset_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_record(row)

    def list_all(self) -> list[DatasetRecord]:
        self.ensure_schema()
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
        return [self._row_to_record(row) for row in rows]

    def delete(self, dataset_id: str) -> bool:
        self.ensure_schema()
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM datasets WHERE id = ?",
                (dataset_id,),
            )
            return cursor.rowcount > 0

    @staticmethod
    def _row_to_record(row: sqlite3.Row) -> DatasetRecord:
        return DatasetRecord(
            id=row["id"],
            name=row["name"],
            source_format=row["source_format"],
            original_filename=row["original_filename"],
            raw_path=row["raw_path"],
            processed_path=row["processed_path"],
            row_count=row["row_count"],
            column_count=row["column_count"],
            columns=json.loads(row["columns_json"]),
            memory_bytes=row["memory_bytes"],
            file_size_bytes=row["file_size_bytes"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )


dataset_repository = DatasetRepository()
