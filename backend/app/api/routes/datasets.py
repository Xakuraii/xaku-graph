from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.schemas.dataset import (
    DatasetDeleteResponse,
    DatasetInspectionResponse,
    DatasetListResponse,
)
from app.services.datasets.dataset_service import (
    DatasetNotFoundError,
    DatasetProtectedError,
    UploadTooLargeError,
    dataset_service,
)
from app.services.datasets.loaders import PathSecurityError

router = APIRouter()


@router.get("", response_model=DatasetListResponse)
def list_datasets() -> DatasetListResponse:
    """List all available datasets (sample fixture and user-imported datasets)."""
    try:
        return dataset_service.list_datasets()
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list datasets: {err}",
        ) from err


@router.get("/sample", response_model=DatasetInspectionResponse)
def get_sample_dataset() -> DatasetInspectionResponse:
    """Retrieve built-in sample dataset for exploration and verification."""
    try:
        return dataset_service.load_sample_dataset()
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load sample dataset: {err}",
        ) from err


@router.post(
    "/upload",
    response_model=DatasetInspectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_dataset(
    file: Annotated[UploadFile, File(...)],
    name: Annotated[str | None, Form()] = None,
) -> DatasetInspectionResponse:
    """Upload and inspect a local tabular dataset (.csv, .json, .jsonl, .parquet, .xlsx)."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must include a filename.",
        )

    try:
        return dataset_service.upload_dataset(
            filename=file.filename,
            file_stream=file.file,
            display_name=name,
        )
    except UploadTooLargeError as err:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=str(err),
        ) from err
    except (PathSecurityError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        ) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest dataset: {err}",
        ) from err


@router.get("/{dataset_id}", response_model=DatasetInspectionResponse)
def get_dataset(dataset_id: str) -> DatasetInspectionResponse:
    """Inspect a specific dataset by ID."""
    try:
        return dataset_service.get_dataset(dataset_id)
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except PathSecurityError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dataset '{dataset_id}': {err}",
        ) from err


@router.delete("/{dataset_id}", response_model=DatasetDeleteResponse)
def delete_dataset(dataset_id: str) -> DatasetDeleteResponse:
    """Delete a user-imported dataset from local storage and metadata registry."""
    try:
        return dataset_service.delete_dataset(dataset_id)
    except DatasetProtectedError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(err)) from err
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except PathSecurityError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete dataset '{dataset_id}': {err}",
        ) from err
