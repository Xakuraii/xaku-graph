from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ConnectorType = Literal["local_rag", "chromadb", "qdrant"]
RagSimilarityMetric = Literal["cosine_similarity", "euclidean_distance", "dot_product"]


class VectorDbConnectorInfo(BaseModel):
    connector_type: ConnectorType
    name: str
    description: str
    available: bool
    read_only: bool = True
    connection_fields: list[str] = Field(default_factory=list)
    install_hint: str | None = None


class ExternalConnectionConfig(BaseModel):
    connector_type: Literal["chromadb", "qdrant"]
    path: str | None = None
    host: str | None = None
    port: int | None = None
    collection_name: str | None = None


class RagCollectionSummary(BaseModel):
    id: str
    name: str
    connector_type: ConnectorType
    document_count: int
    chunk_count: int
    dimension: int
    model_id: str | None = None
    read_only: bool = True
    is_sample: bool = False
    metadata_keys: list[str] = Field(default_factory=list)
    created_at: datetime | None = None


class RagCollectionListResponse(BaseModel):
    collections: list[RagCollectionSummary]
    total: int


class RagDocumentSummary(BaseModel):
    doc_id: str
    title: str
    source: str
    chunk_count: int
    total_chars: int
    metadata: dict[str, Any] = Field(default_factory=dict)


class RagChunkDetail(BaseModel):
    chunk_id: str
    doc_id: str
    doc_title: str
    chunk_index: int
    content: str
    char_count: int
    char_start: int | None = None
    char_end: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    embedding_dimension: int
    embedding_norm: float | None = None
    embedding_preview: list[float] = Field(default_factory=list)


class RagCollectionInspectResponse(BaseModel):
    collection: RagCollectionSummary
    documents: list[RagDocumentSummary]
    chunks: list[RagChunkDetail]
    total_chunks: int
    offset: int
    limit: int


class RagDocumentInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=160)
    source: str = Field(default="local-sandbox")
    content: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreateRagSandboxRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    documents: list[RagDocumentInput] = Field(..., min_length=1, max_length=50)
    chunk_size: int = Field(default=280, ge=40, le=4000)
    chunk_overlap: int = Field(default=40, ge=0, le=1000)
    model_id: str = Field(default="local-text-hash-128")


class RagDeleteResponse(BaseModel):
    id: str
    deleted: bool
    message: str


class RagSearchRequest(BaseModel):
    collection_id: str = Field(default="sample-xakugraph-rag-docs")
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=50)
    metric: RagSimilarityMetric = "cosine_similarity"
    model_id: str | None = None
    filter_key: str | None = None
    filter_value: str | None = None
    connection_config: ExternalConnectionConfig | None = None


class RagRetrievedChunk(BaseModel):
    rank: int
    chunk_id: str
    doc_id: str
    doc_title: str
    chunk_index: int
    content: str
    score: float
    cosine_similarity: float
    euclidean_distance: float
    dot_product: float
    metadata: dict[str, Any] = Field(default_factory=dict)
    embedding_preview: list[float] = Field(default_factory=list)


class RagSearchResponse(BaseModel):
    collection_id: str
    query: str
    metric: RagSimilarityMetric
    model_id: str
    query_vector_dimension: int
    query_vector_preview: list[float]
    total_candidates: int
    results: list[RagRetrievedChunk]
    similarity_basis: str = "original_high_dimensional_vectors"


class RagCompareStrategy(BaseModel):
    label: str = Field(..., min_length=1, max_length=80)
    collection_id: str = Field(default="sample-xakugraph-rag-docs")
    metric: RagSimilarityMetric = "cosine_similarity"
    model_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=25)


class RagCompareRequest(BaseModel):
    query: str = Field(..., min_length=1)
    strategy_a: RagCompareStrategy
    strategy_b: RagCompareStrategy


class RagChunkComparisonItem(BaseModel):
    chunk_id: str
    doc_title: str
    chunk_index: int
    rank_a: int | None = None
    rank_b: int | None = None
    rank_delta: int | None = None
    score_a: float | None = None
    score_b: float | None = None
    status: Literal["both", "only_a", "only_b"]


class RagCompareResponse(BaseModel):
    query: str
    run_a: RagSearchResponse
    run_b: RagSearchResponse
    overlap_count: int
    jaccard_overlap: float
    comparison_items: list[RagChunkComparisonItem]
