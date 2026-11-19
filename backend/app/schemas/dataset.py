from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ColumnDetail(BaseModel):
    name: str
    dtype: str
    null_count: int
    null_percentage: float = 0.0
    unique_count: int
    min_value: Any | None = None
    max_value: Any | None = None
    mean_value: float | None = None
    median_value: float | None = None
    std_value: float | None = None
    q1_value: float | None = None
    q3_value: float | None = None


class DatasetSummary(BaseModel):
    id: str
    name: str
    row_count: int
    column_count: int
    columns: list[str]
    memory_bytes: int
    is_sample: bool = False
    source_format: str
    file_size_bytes: int | None = None
    created_at: datetime | None = None


class DatasetInspectionResponse(BaseModel):
    summary: DatasetSummary
    columns: list[ColumnDetail]
    preview_rows: list[dict[str, Any]]
    metadata: dict[str, Any] = Field(default_factory=dict)


class DatasetListResponse(BaseModel):
    datasets: list[DatasetSummary]
    total: int


class DatasetDeleteResponse(BaseModel):
    id: str
    deleted: bool
    message: str


class DatasetRowsResponse(BaseModel):
    dataset_id: str
    total_rows: int
    filtered_rows: int
    offset: int
    limit: int
    columns: list[str]
    rows: list[dict[str, Any]]


class HistogramBin(BaseModel):
    start: float
    end: float
    count: int


class BoxPlotStats(BaseModel):
    min: float
    q1: float
    median: float
    q3: float
    max: float
    iqr: float
    lower_fence: float
    upper_fence: float
    outlier_count: int
    sample_outliers: list[float]


class CategoryCount(BaseModel):
    value: str
    count: int
    percentage: float


class ColumnDistribution(BaseModel):
    column: str
    dtype: str
    kind: Literal["numeric", "categorical"]
    total_count: int
    non_null_count: int
    histogram: list[HistogramBin] | None = None
    boxplot: BoxPlotStats | None = None
    categories: list[CategoryCount] | None = None


class DatasetDistributionsResponse(BaseModel):
    dataset_id: str
    bins: int
    distributions: list[ColumnDistribution]


class ColumnQualityMetric(BaseModel):
    column: str
    dtype: str
    null_count: int
    null_percentage: float
    unique_count: int
    is_constant: bool
    iqr_outlier_count: int
    zscore_outlier_count: int
    outlier_percentage: float


class DatasetQualityResponse(BaseModel):
    dataset_id: str
    row_count: int
    column_count: int
    total_cells: int
    total_missing_cells: int
    completeness_percentage: float
    duplicate_row_count: int
    columns: list[ColumnQualityMetric]


class CorrelationMatrixResponse(BaseModel):
    dataset_id: str
    method: Literal["pearson", "spearman"]
    columns: list[str]
    matrix: list[list[float | None]]
