from fastapi import APIRouter, HTTPException

from app.schemas.vector import VectorSimilarityRequest, VectorSimilarityResponse
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
