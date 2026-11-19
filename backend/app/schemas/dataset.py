from typing import Any

from pydantic import BaseModel, Field


class ColumnDetail(BaseModel):
    name: str
    dtype: str
    null_count: int
    unique_count: int
    min_value: Any | None = None
    max_value: Any | None = None
    mean_value: float | None = None


class DatasetSummary(BaseModel):
    id: str
    name: str
    row_count: int
    column_count: int
    columns: list[str]
    memory_bytes: int
    is_sample: bool = False
    source_format: str


class DatasetInspectionResponse(BaseModel):
    summary: DatasetSummary
    columns: list[ColumnDetail]
    preview_rows: list[dict[str, Any]]
    metadata: dict[str, Any] = Field(default_factory=dict)
