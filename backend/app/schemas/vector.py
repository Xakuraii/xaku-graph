from pydantic import BaseModel, Field


class VectorSimilarityRequest(BaseModel):
    vector_a: list[float] = Field(..., description="First vector")
    vector_b: list[float] = Field(..., description="Second vector")


class VectorSimilarityResponse(BaseModel):
    cosine_similarity: float
    euclidean_distance: float
    dot_product: float
    norm_a: float
    norm_b: float
    normalized_a: list[float] | None = None
    normalized_b: list[float] | None = None
