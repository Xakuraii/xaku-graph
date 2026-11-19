from fastapi import APIRouter, HTTPException

from app.schemas.dataset import DatasetInspectionResponse
from app.services.datasets.dataset_service import DatasetService

router = APIRouter()


@router.get("/sample", response_model=DatasetInspectionResponse)
def get_sample_dataset() -> DatasetInspectionResponse:
    """Retrieve sample dataset for exploration and vertical slice verification."""
    try:
        return DatasetService.load_sample_dataset()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to load sample dataset: {str(e)}"
        ) from e
