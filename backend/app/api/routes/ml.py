from fastapi import APIRouter, HTTPException, status

from app.schemas.ml import (
    MlDeleteResponse,
    MlImportRequest,
    MlRunDetail,
    MlRunListResponse,
    MlTrainRequest,
)
from app.services.datasets.dataset_service import DatasetNotFoundError
from app.services.machine_learning.ml_service import (
    MlProtectedRunError,
    MlRunNotFoundError,
    MlTrainingError,
    ml_service,
)

router = APIRouter()


@router.get("/runs", response_model=MlRunListResponse)
def list_ml_runs() -> MlRunListResponse:
    """List built-in sample ML evaluation runs plus locally trained and imported runs."""
    return ml_service.list_runs()


@router.get("/runs/{run_id}", response_model=MlRunDetail)
def get_ml_run(run_id: str) -> MlRunDetail:
    """Retrieve complete training curves, confusion matrix / regression metrics, feature importance, and predictions."""
    try:
        return ml_service.get_run(run_id)
    except MlRunNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve ML run '{run_id}': {err}",
        ) from err


@router.post("/train", response_model=MlRunDetail, status_code=status.HTTP_201_CREATED)
def train_local_model(payload: MlTrainRequest) -> MlRunDetail:
    """Train and evaluate a local Scikit-Learn model on any XakuGraph dataset."""
    try:
        return ml_service.train_on_dataset(payload)
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except MlTrainingError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local ML training failed: {err}",
        ) from err


@router.post("/import", response_model=MlRunDetail, status_code=status.HTTP_201_CREATED)
def import_evaluation_run(payload: MlImportRequest) -> MlRunDetail:
    """Import external model predictions and training curves to inspect metrics & errors."""
    try:
        return ml_service.import_evaluation_run(payload)
    except MlTrainingError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ML evaluation import failed: {err}",
        ) from err


@router.delete("/runs/{run_id}", response_model=MlDeleteResponse)
def delete_ml_run(run_id: str) -> MlDeleteResponse:
    """Delete a custom local/imported ML run (built-in samples are protected)."""
    try:
        return ml_service.delete_run(run_id)
    except MlProtectedRunError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(err)) from err
    except MlRunNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete ML run '{run_id}': {err}",
        ) from err
