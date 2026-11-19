from fastapi import APIRouter, HTTPException

from app.schemas.vector import (
    VectorInspectRequest,
    VectorInspectResponse,
    VectorMatrixRequest,
    VectorMatrixResponse,
    VectorSearchRequest,
    VectorSearchResponse,
    VectorSimilarityRequest,
    VectorSimilarityResponse,
)
from app.services.similarity.vector_math import VectorMathService

router = APIRouter()


@router.post("/similarity", response_model=VectorSimilarityResponse)
def compute_vector_similarity(payload: VectorSimilarityRequest) -> VectorSimilarityResponse:
    try:
        return VectorMathService.compute_similarity(payload.vector_a, payload.vector_b)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}") from e


@router.post("/inspect", response_model=VectorInspectResponse)
def inspect_vector(payload: VectorInspectRequest) -> VectorInspectResponse:
    """Inspect dimensions, L1/L2 norms, sparsity, and normalized values of a vector."""
    try:
        return VectorMathService.inspect_vector(payload.values, label=payload.label)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inspection error: {str(e)}") from e


@router.post("/search", response_model=VectorSearchResponse)
def search_nearest_vectors(payload: VectorSearchRequest) -> VectorSearchResponse:
    """Rank candidate vectors or an embedding space against a query vector."""
    try:
        return VectorMathService.search_neighbors(
            query_vector=payload.query_vector,
            vectors=payload.vectors,
            space_id=payload.space_id,
            metric=payload.metric,
            top_k=payload.top_k,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}") from e


@router.post("/matrix", response_model=VectorMatrixResponse)
def compute_vector_matrix(payload: VectorMatrixRequest) -> VectorMatrixResponse:
    """Compute pairwise similarity/distance matrix on original vectors plus 2D visual coords."""
    try:
        return VectorMathService.compute_pairwise_matrix(
            vectors=payload.vectors,
            metric=payload.metric,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matrix error: {str(e)}") from e
