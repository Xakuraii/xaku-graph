import platform
import sys
from datetime import UTC, datetime

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.health import HealthResponse, ModuleStatus

router = APIRouter()

MODULES_STATUS = {
    "datasets": ModuleStatus(
        name="Dataset Visualization",
        phase=2,
        status="completed",
        description="CSV, JSON, JSONL, Parquet, and Excel import, statistics, distributions, quality checks, outliers, and correlations",
    ),
    "embeddings": ModuleStatus(
        name="Embedding Visualization",
        phase=3,
        status="completed",
        description="Text & image embedding adapters, local .npy cache, PCA/t-SNE/UMAP projections, clustering, and 2D/3D inspection",
    ),
    "vectors": ModuleStatus(
        name="Vector & Similarity Explorer",
        phase=4,
        status="completed",
        description="Vector inspection, L2 normalization, cosine/euclidean/manhattan/dot metrics, batch ranking, and pairwise space matrix",
    ),
    "rag": ModuleStatus(
        name="RAG Visualization",
        phase=5,
        status="planned",
        description="Chunk inspection, retrieval playground, ChromaDB and Qdrant connectors",
    ),
    "machine_learning": ModuleStatus(
        name="ML Visualization",
        phase=6,
        status="planned",
        description="Training metrics, confusion matrix, classification/regression evaluation, and feature importance",
    ),
}


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(UTC),
        modules=MODULES_STATUS,
        system_info={
            "python_version": sys.version,
            "platform": platform.platform(),
            "debug": settings.DEBUG,
        },
    )
