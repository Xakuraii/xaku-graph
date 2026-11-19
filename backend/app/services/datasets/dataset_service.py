import math
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO

import polars as pl

from app.core.config import settings
from app.repositories.dataset_repository import DatasetRecord, DatasetRepository, dataset_repository
from app.schemas.dataset import (
    ColumnDetail,
    DatasetDeleteResponse,
    DatasetInspectionResponse,
    DatasetListResponse,
    DatasetSummary,
)
from app.services.datasets.loaders import (
    DatasetLoaderRegistry,
    loader_registry,
    sanitize_filename,
    validate_safe_path,
)

SAMPLE_DATASET_ID = "sample-iris-dataset"
UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1 MiB


class UploadTooLargeError(ValueError):
    """Raised when an uploaded dataset exceeds MAX_UPLOAD_SIZE_MB."""


class DatasetNotFoundError(FileNotFoundError):
    """Raised when a requested dataset ID does not exist."""


class DatasetProtectedError(PermissionError):
    """Raised when attempting to modify or delete a protected built-in sample."""


def _safe_number(val: Any) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def sanitize_row_values(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert NaN/Inf float values to None for JSON-compliant serialization."""
    sanitized: list[dict[str, Any]] = []
    for row in rows:
        clean_row: dict[str, Any] = {}
        for key, value in row.items():
            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                clean_row[key] = None
            else:
                clean_row[key] = value
        sanitized.append(clean_row)
    return sanitized


class DatasetService:
    def __init__(
        self,
        repository: DatasetRepository | None = None,
        loaders: DatasetLoaderRegistry | None = None,
    ) -> None:
        self._repo = repository or dataset_repository
        self._loaders = loaders or loader_registry

    @staticmethod
    def inspect_dataframe(
        df: pl.DataFrame,
        dataset_id: str,
        name: str,
        source_format: str,
        is_sample: bool = False,
        file_size_bytes: int | None = None,
        created_at: datetime | None = None,
        max_preview: int | None = None,
    ) -> DatasetInspectionResponse:
        preview_limit = max_preview if max_preview is not None else settings.MAX_PREVIEW_ROWS
        row_count = df.height
        col_count = df.width
        columns_list = df.columns
        memory_bytes = df.estimated_size()

        col_details: list[ColumnDetail] = []
        for col_name in columns_list:
            series = df[col_name]
            dtype_str = str(series.dtype)
            null_count = series.null_count()
            null_pct = round((null_count / row_count) * 100.0, 2) if row_count > 0 else 0.0
            unique_count = series.n_unique()

            min_val: Any = None
            max_val: Any = None
            mean_val: float | None = None
            median_val: float | None = None
            std_val: float | None = None
            q1_val: float | None = None
            q3_val: float | None = None

            if series.dtype.is_numeric():
                non_null = series.drop_nulls()
                if series.dtype.is_float():
                    non_null = non_null.filter(non_null.is_not_nan())
                if non_null.len() > 0:
                    min_val = _safe_number(non_null.min())
                    max_val = _safe_number(non_null.max())
                    mean_val = _safe_number(non_null.mean())
                    median_val = _safe_number(non_null.median())
                    std_val = _safe_number(non_null.std())
                    q1_val = _safe_number(non_null.quantile(0.25))
                    q3_val = _safe_number(non_null.quantile(0.75))

            col_details.append(
                ColumnDetail(
                    name=col_name,
                    dtype=dtype_str,
                    null_count=null_count,
                    null_percentage=null_pct,
                    unique_count=unique_count,
                    min_value=min_val,
                    max_value=max_val,
                    mean_value=mean_val,
                    median_value=median_val,
                    std_value=std_val,
                    q1_value=q1_val,
                    q3_value=q3_val,
                )
            )

        preview_rows = sanitize_row_values(df.head(preview_limit).to_dicts())

        summary = DatasetSummary(
            id=dataset_id,
            name=name,
            row_count=row_count,
            column_count=col_count,
            columns=columns_list,
            memory_bytes=memory_bytes,
            is_sample=is_sample,
            source_format=source_format,
            file_size_bytes=file_size_bytes,
            created_at=created_at,
        )

        return DatasetInspectionResponse(
            summary=summary,
            columns=col_details,
            preview_rows=preview_rows,
            metadata={"row_preview_limit": preview_limit},
        )

    @classmethod
    def load_sample_dataset(cls) -> DatasetInspectionResponse:
        sample_path = settings.SAMPLES_DIR / "iris_sample.csv"
        if not sample_path.exists():
            raise DatasetNotFoundError(f"Sample dataset file not found at {sample_path}")

        df = pl.read_csv(sample_path)
        return cls.inspect_dataframe(
            df=df,
            dataset_id=SAMPLE_DATASET_ID,
            name="Iris Benchmark Sample (30 samples)",
            source_format="csv",
            is_sample=True,
            file_size_bytes=sample_path.stat().st_size,
            max_preview=settings.MAX_PREVIEW_ROWS,
        )

    @classmethod
    def inspect_file(cls, file_path: Path, original_filename: str) -> DatasetInspectionResponse:
        df, format_name = loader_registry.load_file(file_path)
        return cls.inspect_dataframe(
            df=df,
            dataset_id=file_path.stem,
            name=original_filename,
            source_format=format_name,
            is_sample=False,
            file_size_bytes=file_path.stat().st_size,
            max_preview=settings.MAX_PREVIEW_ROWS,
        )

    def upload_dataset(
        self,
        filename: str,
        file_stream: BinaryIO,
        display_name: str | None = None,
    ) -> DatasetInspectionResponse:
        settings.ensure_storage_dirs()

        safe_name = sanitize_filename(filename)
        suffix = Path(safe_name).suffix.lower()
        # Validate extension before writing bytes to disk
        self._loaders.get_loader(suffix)

        dataset_id = f"ds-{uuid.uuid4().hex[:12]}"
        raw_path = validate_safe_path(
            settings.UPLOADS_DIR, settings.UPLOADS_DIR / f"{dataset_id}_{safe_name}"
        )
        processed_path = validate_safe_path(
            settings.PROCESSED_DIR, settings.PROCESSED_DIR / f"{dataset_id}.parquet"
        )

        total_bytes = 0
        max_bytes = settings.max_upload_size_bytes

        try:
            with raw_path.open("wb") as out_file:
                while True:
                    chunk = file_stream.read(UPLOAD_CHUNK_SIZE)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        raise UploadTooLargeError(
                            f"Uploaded file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB."
                        )
                    out_file.write(chunk)

            if total_bytes == 0:
                raise ValueError("Uploaded file is empty.")

            df, format_name = self._loaders.load_file(raw_path)
            df.write_parquet(processed_path)
        except Exception:
            raw_path.unlink(missing_ok=True)
            processed_path.unlink(missing_ok=True)
            raise

        created_at = datetime.now(UTC)
        resolved_name = display_name.strip() if display_name and display_name.strip() else safe_name

        record = DatasetRecord(
            id=dataset_id,
            name=resolved_name,
            source_format=format_name,
            original_filename=safe_name,
            raw_path=str(raw_path),
            processed_path=str(processed_path),
            row_count=df.height,
            column_count=df.width,
            columns=df.columns,
            memory_bytes=df.estimated_size(),
            file_size_bytes=total_bytes,
            created_at=created_at,
        )
        self._repo.save(record)

        return self.inspect_dataframe(
            df=df,
            dataset_id=dataset_id,
            name=resolved_name,
            source_format=format_name,
            is_sample=False,
            file_size_bytes=total_bytes,
            created_at=created_at,
            max_preview=settings.MAX_PREVIEW_ROWS,
        )

    def list_datasets(self) -> DatasetListResponse:
        summaries: list[DatasetSummary] = []

        try:
            sample = self.load_sample_dataset()
            summaries.append(sample.summary)
        except DatasetNotFoundError:
            pass

        for record in self._repo.list_all():
            summaries.append(
                DatasetSummary(
                    id=record.id,
                    name=record.name,
                    row_count=record.row_count,
                    column_count=record.column_count,
                    columns=record.columns,
                    memory_bytes=record.memory_bytes,
                    is_sample=False,
                    source_format=record.source_format,
                    file_size_bytes=record.file_size_bytes,
                    created_at=record.created_at,
                )
            )

        return DatasetListResponse(datasets=summaries, total=len(summaries))

    def load_dataframe(self, dataset_id: str) -> tuple[DatasetSummary, pl.DataFrame]:
        if dataset_id == SAMPLE_DATASET_ID:
            sample_path = settings.SAMPLES_DIR / "iris_sample.csv"
            if not sample_path.exists():
                raise DatasetNotFoundError(f"Sample dataset not found at {sample_path}")
            df = pl.read_csv(sample_path)
            summary = DatasetSummary(
                id=SAMPLE_DATASET_ID,
                name="Iris Benchmark Sample (30 samples)",
                row_count=df.height,
                column_count=df.width,
                columns=df.columns,
                memory_bytes=df.estimated_size(),
                is_sample=True,
                source_format="csv",
                file_size_bytes=sample_path.stat().st_size,
            )
            return summary, df

        record = self._repo.get(dataset_id)
        if record is None:
            raise DatasetNotFoundError(f"Dataset '{dataset_id}' not found.")

        processed_path = validate_safe_path(settings.PROCESSED_DIR, Path(record.processed_path))
        if processed_path.exists():
            df = pl.read_parquet(processed_path)
        else:
            raw_path = validate_safe_path(settings.UPLOADS_DIR, Path(record.raw_path))
            if not raw_path.exists():
                raise DatasetNotFoundError(f"Stored dataset files for '{dataset_id}' are missing.")
            df, _ = self._loaders.load_file(raw_path)

        summary = DatasetSummary(
            id=record.id,
            name=record.name,
            row_count=record.row_count,
            column_count=record.column_count,
            columns=record.columns,
            memory_bytes=record.memory_bytes,
            is_sample=False,
            source_format=record.source_format,
            file_size_bytes=record.file_size_bytes,
            created_at=record.created_at,
        )
        return summary, df

    def get_dataset(self, dataset_id: str) -> DatasetInspectionResponse:
        if dataset_id == SAMPLE_DATASET_ID:
            return self.load_sample_dataset()

        summary, df = self.load_dataframe(dataset_id)
        return self.inspect_dataframe(
            df=df,
            dataset_id=summary.id,
            name=summary.name,
            source_format=summary.source_format,
            is_sample=summary.is_sample,
            file_size_bytes=summary.file_size_bytes,
            created_at=summary.created_at,
            max_preview=settings.MAX_PREVIEW_ROWS,
        )

    def delete_dataset(self, dataset_id: str) -> DatasetDeleteResponse:
        if dataset_id == SAMPLE_DATASET_ID:
            raise DatasetProtectedError("Cannot delete the built-in sample dataset.")

        record = self._repo.get(dataset_id)
        if record is None:
            raise DatasetNotFoundError(f"Dataset '{dataset_id}' not found.")

        raw_path = validate_safe_path(settings.UPLOADS_DIR, Path(record.raw_path))
        processed_path = validate_safe_path(settings.PROCESSED_DIR, Path(record.processed_path))

        raw_path.unlink(missing_ok=True)
        processed_path.unlink(missing_ok=True)
        self._repo.delete(dataset_id)

        return DatasetDeleteResponse(
            id=dataset_id,
            deleted=True,
            message=f"Dataset '{record.name}' deleted successfully.",
        )


dataset_service = DatasetService()
