import json
import re
from abc import ABC, abstractmethod
from pathlib import Path

import polars as pl

from app.core.config import settings

_UNSAFE_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9._-]")


class PathSecurityError(ValueError):
    """Raised when a path validation or sanitization check fails."""


def sanitize_filename(filename: str) -> str:
    """Sanitize an uploaded filename to prevent path traversal and invalid characters."""
    if not filename or "\x00" in filename:
        raise PathSecurityError("Invalid filename.")

    if ".." in filename.replace("\\", "/").split("/"):
        raise PathSecurityError("Path traversal sequence detected in filename.")

    # Normalize Windows/POSIX separators and extract base filename only
    base_name = Path(filename.replace("\\", "/")).name.strip()
    if not base_name or base_name in {".", ".."}:
        raise PathSecurityError("Filename cannot be empty.")

    stem = Path(base_name).stem
    suffix = Path(base_name).suffix.lower()
    if not stem or not suffix:
        raise PathSecurityError("Filename must include a valid name and extension.")

    safe_stem = _UNSAFE_FILENAME_CHARS.sub("_", stem).strip("._")
    if not safe_stem:
        safe_stem = "dataset"

    return f"{safe_stem}{suffix}"


def validate_safe_path(base_dir: Path, target_path: Path) -> Path:
    """Ensure target_path resolves strictly inside base_dir."""
    resolved_base = base_dir.resolve()
    resolved_target = target_path.resolve()
    if resolved_target != resolved_base and not resolved_target.is_relative_to(resolved_base):
        raise PathSecurityError(
            f"Access denied: path '{target_path}' escapes base directory '{base_dir}'."
        )
    return resolved_target


class DatasetLoader(ABC):
    """Abstract adapter interface for tabular dataset format loaders."""

    extensions: tuple[str, ...] = ()
    format_name: str = ""

    @abstractmethod
    def load(self, file_path: Path) -> pl.DataFrame:
        """Load dataset file into a Polars DataFrame."""


class CsvLoader(DatasetLoader):
    extensions = (".csv",)
    format_name = "csv"

    def load(self, file_path: Path) -> pl.DataFrame:
        try:
            return pl.read_csv(file_path, try_parse_dates=True)
        except Exception as err:
            raise ValueError(f"Failed to parse CSV file: {err}") from err


class JsonLoader(DatasetLoader):
    extensions = (".json",)
    format_name = "json"

    def load(self, file_path: Path) -> pl.DataFrame:
        try:
            raw_text = file_path.read_text(encoding="utf-8")
            parsed = json.loads(raw_text)

            if isinstance(parsed, dict):
                # Unwrap common {"data": [...]} or {"records": [...]} envelopes
                for wrapper_key in ("data", "records", "rows", "items"):
                    if isinstance(parsed.get(wrapper_key), list):
                        parsed = parsed[wrapper_key]
                        break

            if isinstance(parsed, dict) and parsed:
                values = list(parsed.values())
                if all(isinstance(v, list) for v in values):
                    lengths = {len(v) for v in values}
                    if len(lengths) == 1:
                        return pl.DataFrame(parsed)

            if isinstance(parsed, list):
                if len(parsed) == 0:
                    raise ValueError("JSON array contains zero records.")
                return pl.DataFrame(parsed, infer_schema_length=None)

            return pl.read_json(file_path)
        except Exception as err:
            raise ValueError(f"Failed to parse JSON file: {err}") from err


class JsonlLoader(DatasetLoader):
    extensions = (".jsonl",)
    format_name = "jsonl"

    def load(self, file_path: Path) -> pl.DataFrame:
        try:
            return pl.read_ndjson(file_path)
        except Exception as err:
            raise ValueError(f"Failed to parse JSONL file: {err}") from err


class ParquetLoader(DatasetLoader):
    extensions = (".parquet",)
    format_name = "parquet"

    def load(self, file_path: Path) -> pl.DataFrame:
        try:
            return pl.read_parquet(file_path)
        except Exception as err:
            raise ValueError(f"Failed to parse Parquet file: {err}") from err


class ExcelLoader(DatasetLoader):
    extensions = (".xlsx",)
    format_name = "xlsx"

    def load(self, file_path: Path) -> pl.DataFrame:
        try:
            return pl.read_excel(file_path, engine="calamine")
        except Exception as err:
            raise ValueError(f"Failed to parse Excel (.xlsx) file: {err}") from err


class DatasetLoaderRegistry:
    """Extensible registry mapping supported file extensions to DatasetLoader adapters."""

    def __init__(self) -> None:
        self._loaders: dict[str, DatasetLoader] = {}
        for loader in (
            CsvLoader(),
            JsonLoader(),
            JsonlLoader(),
            ParquetLoader(),
            ExcelLoader(),
        ):
            self.register(loader)

    def register(self, loader: DatasetLoader) -> None:
        for ext in loader.extensions:
            self._loaders[ext.lower()] = loader

    def get_loader(self, suffix: str) -> DatasetLoader:
        normalized = suffix.lower()
        if normalized not in settings.ALLOWED_DATASET_EXTENSIONS or normalized not in self._loaders:
            allowed = ", ".join(settings.ALLOWED_DATASET_EXTENSIONS)
            raise ValueError(f"Unsupported dataset format '{suffix}'. Supported formats: {allowed}")
        return self._loaders[normalized]

    def load_file(self, file_path: Path) -> tuple[pl.DataFrame, str]:
        loader = self.get_loader(file_path.suffix)
        df = loader.load(file_path)
        if df.width == 0:
            raise ValueError("Dataset contains zero columns.")
        return df, loader.format_name


loader_registry = DatasetLoaderRegistry()
