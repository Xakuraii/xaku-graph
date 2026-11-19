from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.schemas.dataset import (
    CorrelationMatrixResponse,
    DatasetDeleteResponse,
    DatasetDistributionsResponse,
    DatasetInspectionResponse,
    DatasetListResponse,
    DatasetQualityResponse,
    DatasetRowsResponse,
)
from app.services.datasets.analysis_service import DatasetAnalysisService
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


@router.get("/{dataset_id}/rows", response_model=DatasetRowsResponse)
def get_dataset_rows(
    dataset_id: str,
    search: str | None = Query(default=None, description="Global substring search across columns"),
    filter_col: str | None = Query(default=None, description="Specific column to filter"),
    filter_value: str | None = Query(
        default=None, description="Substring match value for filter_col"
    ),
    sort_by: str | None = Query(default=None, description="Column name to sort by"),
    sort_desc: bool = Query(default=False, description="Sort descending if true"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
) -> DatasetRowsResponse:
    """Query paginated, searchable, filterable, and sortable dataset rows."""
    try:
        _, df = dataset_service.load_dataframe(dataset_id)
        return DatasetAnalysisService.query_rows(
            df=df,
            dataset_id=dataset_id,
            search=search,
            filter_col=filter_col,
            filter_value=filter_value,
            sort_by=sort_by,
            sort_desc=sort_desc,
            offset=offset,
            limit=limit,
        )
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query rows for '{dataset_id}': {err}",
        ) from err


@router.get("/{dataset_id}/distributions", response_model=DatasetDistributionsResponse)
def get_dataset_distributions(
    dataset_id: str,
    bins: int = Query(default=15, ge=2, le=100, description="Number of histogram bins"),
    top_categories: int = Query(
        default=15, ge=1, le=50, description="Max categorical values to return per column"
    ),
) -> DatasetDistributionsResponse:
    """Compute histograms, box-plot quartiles, and categorical value counts."""
    try:
        _, df = dataset_service.load_dataframe(dataset_id)
        return DatasetAnalysisService.compute_distributions(
            df=df,
            dataset_id=dataset_id,
            bins=bins,
            top_categories=top_categories,
        )
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute distributions for '{dataset_id}': {err}",
        ) from err


@router.get("/{dataset_id}/quality", response_model=DatasetQualityResponse)
def get_dataset_quality(dataset_id: str) -> DatasetQualityResponse:
    """Analyze missing values, duplicates, constant columns, and IQR/Z-score outliers."""
    try:
        _, df = dataset_service.load_dataframe(dataset_id)
        return DatasetAnalysisService.compute_quality(df=df, dataset_id=dataset_id)
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute quality report for '{dataset_id}': {err}",
        ) from err


@router.get("/{dataset_id}/correlations", response_model=CorrelationMatrixResponse)
def get_dataset_correlations(
    dataset_id: str,
    method: Literal["pearson", "spearman"] = Query(default="pearson"),
) -> CorrelationMatrixResponse:
    """Compute Pearson or Spearman correlation matrix across numeric columns."""
    try:
        _, df = dataset_service.load_dataframe(dataset_id)
        return DatasetAnalysisService.compute_correlations(
            df=df,
            dataset_id=dataset_id,
            method=method,
        )
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute correlations for '{dataset_id}': {err}",
        ) from err
