from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.schemas.embedding import (
    CreateDatasetEmbeddingSpaceRequest,
    CreateTextEmbeddingSpaceRequest,
    EmbeddingModelSchema,
    EmbeddingSpaceDeleteResponse,
    EmbeddingSpaceListResponse,
    EmbeddingSpaceSummary,
    PointInspectionResponse,
    ProjectionRequest,
    ProjectionResponse,
    ReducerInfoSchema,
)
from app.services.datasets.dataset_service import DatasetNotFoundError
from app.services.datasets.loaders import PathSecurityError
from app.services.embeddings.adapters import (
    AdapterUnavailableError,
    EmbeddingModality,
    ModalityMismatchError,
)
from app.services.embeddings.embedding_service import (
    EmbeddingSpaceNotFoundError,
    EmbeddingSpaceProtectedError,
    embedding_service,
)
from app.services.visualization.reducers import ReducerUnavailableError

router = APIRouter()


@router.get("/models", response_model=list[EmbeddingModelSchema])
def list_embedding_models(
    modality: Annotated[EmbeddingModality | None, Query()] = None,
) -> list[EmbeddingModelSchema]:
    """List registered text and image embedding model adapters and their availability."""
    return embedding_service.list_models(modality=modality)


@router.get("/reducers", response_model=list[ReducerInfoSchema])
def list_reducers() -> list[ReducerInfoSchema]:
    """List dimensionality reduction adapters (PCA, t-SNE, UMAP) and availability."""
    return embedding_service.list_reducers()


@router.get("/spaces", response_model=EmbeddingSpaceListResponse)
def list_embedding_spaces() -> EmbeddingSpaceListResponse:
    """List all cached embedding spaces (built-in sample + user-created)."""
    return embedding_service.list_spaces()


@router.get("/sample", response_model=EmbeddingSpaceSummary)
def get_sample_embedding_space() -> EmbeddingSpaceSummary:
    """Ensure and return the built-in AI & Data Concepts sample embedding space."""
    return embedding_service.ensure_sample_space()


@router.post(
    "/spaces/text",
    response_model=EmbeddingSpaceSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_text_embedding_space(
    payload: CreateTextEmbeddingSpaceRequest,
) -> EmbeddingSpaceSummary:
    """Generate and cache a text embedding space from sentences or documents."""
    try:
        return embedding_service.create_text_space(payload)
    except (ModalityMismatchError, ValueError) as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except AdapterUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create text embedding space: {err}",
        ) from err


@router.post(
    "/spaces/from-dataset",
    response_model=EmbeddingSpaceSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_embedding_space_from_dataset(
    payload: CreateDatasetEmbeddingSpaceRequest,
) -> EmbeddingSpaceSummary:
    """Generate a text embedding space from a column of an existing local dataset."""
    try:
        return embedding_service.create_text_space_from_dataset(payload)
    except DatasetNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except (ModalityMismatchError, ValueError) as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except AdapterUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to embed dataset column: {err}",
        ) from err


@router.post(
    "/spaces/image",
    response_model=EmbeddingSpaceSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_image_embedding_space(
    files: Annotated[list[UploadFile], File(...)],
    name: Annotated[str, Form()] = "Local Image Embeddings",
    model_id: Annotated[str, Form()] = "local-image-descriptor-96",
) -> EmbeddingSpaceSummary:
    """Generate and cache an image embedding space from uploaded local image files."""
    try:
        image_payloads: list[tuple[str, bytes]] = []
        for upload in files:
            if not upload.filename:
                raise ValueError("All uploaded images must include a filename.")
            raw = await upload.read()
            if not raw:
                raise ValueError(f"Uploaded image '{upload.filename}' is empty.")
            image_payloads.append((upload.filename, raw))

        return embedding_service.create_image_space(
            name=name,
            model_id=model_id,
            image_files=image_payloads,
        )
    except (ModalityMismatchError, PathSecurityError, ValueError) as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except AdapterUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create image embedding space: {err}",
        ) from err


@router.delete("/spaces/{space_id}", response_model=EmbeddingSpaceDeleteResponse)
def delete_embedding_space(space_id: str) -> EmbeddingSpaceDeleteResponse:
    """Delete a user-created embedding space and its cached .npy vector file."""
    try:
        return embedding_service.delete_space(space_id)
    except EmbeddingSpaceProtectedError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(err)) from err
    except EmbeddingSpaceNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embedding space '{space_id}': {err}",
        ) from err


@router.post("/spaces/{space_id}/project", response_model=ProjectionResponse)
def project_embedding_space(
    space_id: str,
    payload: ProjectionRequest,
) -> ProjectionResponse:
    """Project high-dimensional embeddings to 2D/3D coordinates and cluster original vectors."""
    try:
        return embedding_service.project_space(space_id, payload)
    except EmbeddingSpaceNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ReducerUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to project embedding space '{space_id}': {err}",
        ) from err


@router.get("/spaces/{space_id}/points/{point_index}", response_model=PointInspectionResponse)
def inspect_embedding_point(
    space_id: str,
    point_index: int,
    top_k: int = Query(default=5, ge=1, le=20),
) -> PointInspectionResponse:
    """Inspect original item content, vector statistics, and exact high-dim nearest neighbors."""
    try:
        return embedding_service.inspect_point(space_id, point_index, top_k=top_k)
    except EmbeddingSpaceNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to inspect point {point_index}: {err}",
        ) from err
