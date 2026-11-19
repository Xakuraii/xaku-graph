from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.services.embeddings.adapters import EmbeddingModality
from app.services.visualization.reducers import ReductionMethod


class EmbeddingModelSchema(BaseModel):
    model_id: str
    name: str
    modality: EmbeddingModality
    dimensions: int
    description: str
    available: bool
    is_local_lightweight: bool
    install_hint: str | None = None


class ReducerInfoSchema(BaseModel):
    method: ReductionMethod
    name: str
    description: str
    available: bool
    supports_3d: bool = True
    install_hint: str | None = None


class EmbeddingItemInput(BaseModel):
    text: str = Field(..., min_length=1)
    label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreateTextEmbeddingSpaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    model_id: str = Field(default="local-text-hash-128")
    items: list[EmbeddingItemInput] = Field(..., min_length=2)


class CreateDatasetEmbeddingSpaceRequest(BaseModel):
    dataset_id: str
    text_column: str
    metadata_columns: list[str] = Field(default_factory=list)
    model_id: str = Field(default="local-text-hash-128")
    name: str | None = None
    max_rows: int = Field(default=300, ge=2, le=2000)


class EmbeddingSpaceSummary(BaseModel):
    id: str
    name: str
    modality: EmbeddingModality
    model_id: str
    dimensions: int
    item_count: int
    metadata_keys: list[str]
    source_dataset_id: str | None = None
    is_sample: bool = False
    created_at: datetime | None = None


class EmbeddingSpaceListResponse(BaseModel):
    spaces: list[EmbeddingSpaceSummary]
    total: int


class EmbeddingSpaceDeleteResponse(BaseModel):
    id: str
    deleted: bool
    message: str


class ProjectionRequest(BaseModel):
    method: ReductionMethod = "pca"
    dimensions: Literal[2, 3] = 2
    n_clusters: int = Field(default=3, ge=0, le=20)
    perplexity: float = Field(default=10.0, ge=2.0, le=100.0)
    filter_key: str | None = None
    filter_value: str | None = None


class ProjectedPoint(BaseModel):
    index: int
    label: str
    snippet: str
    x: float
    y: float
    z: float | None = None
    cluster: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ClusterSummary(BaseModel):
    cluster_id: int
    count: int
    percentage: float


class ProjectionResponse(BaseModel):
    space: EmbeddingSpaceSummary
    method: ReductionMethod
    dimensions: Literal[2, 3]
    points: list[ProjectedPoint]
    clusters: list[ClusterSummary]
    explained_variance_ratio: list[float] | None = None
    total_points: int
    filtered_points: int
    effective_params: dict[str, Any] = Field(default_factory=dict)


class NearestNeighborItem(BaseModel):
    index: int
    label: str
    snippet: str
    cosine_similarity: float
    euclidean_distance: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class PointInspectionResponse(BaseModel):
    space_id: str
    index: int
    label: str
    content: str
    modality: EmbeddingModality
    metadata: dict[str, Any] = Field(default_factory=dict)
    original_dimension: int
    vector_norm: float
    vector_min: float
    vector_max: float
    vector_mean: float
    vector_preview: list[float]
    neighbors: list[NearestNeighborItem]
    similarity_basis: str = "original_high_dimensional_vectors"
