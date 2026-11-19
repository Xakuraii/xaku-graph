from typing import Literal

from pydantic import BaseModel, Field

DistanceMetric = Literal[
    "cosine_similarity",
    "euclidean_distance",
    "dot_product",
    "manhattan_distance",
]


class VectorSimilarityRequest(BaseModel):
    vector_a: list[float] = Field(..., description="First vector")
    vector_b: list[float] = Field(..., description="Second vector")


class VectorSimilarityResponse(BaseModel):
    dimension: int
    cosine_similarity: float
    cosine_distance: float
    euclidean_distance: float
    manhattan_distance: float
    dot_product: float
    angle_degrees: float
    norm_a: float
    norm_b: float
    normalized_a: list[float] | None = None
    normalized_b: list[float] | None = None


class VectorInspectRequest(BaseModel):
    label: str = Field(default="Vector")
    values: list[float] = Field(..., min_length=1)


class VectorInspectResponse(BaseModel):
    label: str
    dimension: int
    norm_l2: float
    norm_l1: float
    min_value: float
    max_value: float
    mean_value: float
    std_value: float
    zero_count: int
    is_unit_normalized: bool
    values: list[float]
    normalized_values: list[float]


class NamedVectorInput(BaseModel):
    id: str = Field(..., min_length=1)
    label: str | None = None
    values: list[float] = Field(..., min_length=1)


class VectorSearchRequest(BaseModel):
    query_vector: list[float] = Field(..., min_length=1)
    vectors: list[NamedVectorInput] = Field(default_factory=list)
    space_id: str | None = None
    metric: DistanceMetric = "cosine_similarity"
    top_k: int = Field(default=10, ge=1, le=100)


class RankedVectorItem(BaseModel):
    rank: int
    id: str
    label: str
    score: float
    cosine_similarity: float
    euclidean_distance: float
    dot_product: float
    manhattan_distance: float


class VectorSearchResponse(BaseModel):
    metric: DistanceMetric
    query_dimension: int
    total_candidates: int
    results: list[RankedVectorItem]
    similarity_basis: str = "original_high_dimensional_vectors"


class VectorMatrixRequest(BaseModel):
    vectors: list[NamedVectorInput] = Field(..., min_length=2, max_length=100)
    metric: DistanceMetric = "cosine_similarity"


class VectorCoordinate2D(BaseModel):
    id: str
    label: str
    x: float
    y: float
    norm_l2: float


class VectorMatrixResponse(BaseModel):
    metric: DistanceMetric
    original_dimension: int
    labels: list[str]
    matrix: list[list[float]]
    coordinates_2d: list[VectorCoordinate2D]
    projection_method: str
    similarity_basis: str = "original_high_dimensional_vectors"
