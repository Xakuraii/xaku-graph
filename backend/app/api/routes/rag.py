from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.rag import (
    CreateRagSandboxRequest,
    ExternalConnectionConfig,
    RagCollectionInspectResponse,
    RagCollectionListResponse,
    RagCollectionSummary,
    RagCompareRequest,
    RagCompareResponse,
    RagDeleteResponse,
    RagSearchRequest,
    RagSearchResponse,
    VectorDbConnectorInfo,
)
from app.services.embeddings.adapters import AdapterUnavailableError
from app.services.rag.rag_service import rag_service
from app.services.vector_databases.connectors import (
    CollectionNotFoundError,
    ConnectorUnavailableError,
    ReadOnlyViolationError,
)

router = APIRouter()


@router.get("/connectors", response_model=list[VectorDbConnectorInfo])
def list_vector_db_connectors() -> list[VectorDbConnectorInfo]:
    """List supported vector database connectors and their read-only availability."""
    return rag_service.list_connectors()


@router.get("/collections", response_model=RagCollectionListResponse)
def list_local_collections() -> RagCollectionListResponse:
    """List local RAG collections (built-in sample knowledge base + sandbox collections)."""
    return rag_service.list_collections(connector_type="local_rag")


@router.post("/external/collections", response_model=RagCollectionListResponse)
def list_external_collections(
    config: ExternalConnectionConfig,
) -> RagCollectionListResponse:
    """List collections from an external ChromaDB or Qdrant instance in read-only mode."""
    try:
        return rag_service.list_collections(
            connector_type=config.connector_type,
            connection_config=config,
        )
    except ConnectorUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except CollectionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list external collections: {err}",
        ) from err


@router.post("/external/inspect", response_model=RagCollectionInspectResponse)
def inspect_external_collection(
    config: ExternalConnectionConfig,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> RagCollectionInspectResponse:
    """Inspect documents, chunks, metadata, and vectors from an external vector DB (read-only)."""
    if not config.collection_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="collection_name is required to inspect an external collection.",
        )
    try:
        return rag_service.inspect_collection(
            collection_id=config.collection_name,
            connector_type=config.connector_type,
            offset=offset,
            limit=limit,
            connection_config=config,
        )
    except ConnectorUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except CollectionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to inspect external collection: {err}",
        ) from err


@router.get("/collections/{collection_id}", response_model=RagCollectionInspectResponse)
def inspect_local_collection(
    collection_id: str,
    doc_id: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> RagCollectionInspectResponse:
    """Inspect documents, chunks, metadata, and vector previews in a local RAG collection."""
    try:
        return rag_service.inspect_collection(
            collection_id=collection_id,
            connector_type="local_rag",
            doc_id=doc_id,
            search=search,
            offset=offset,
            limit=limit,
        )
    except CollectionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to inspect collection '{collection_id}': {err}",
        ) from err


@router.post(
    "/sandbox",
    response_model=RagCollectionSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_sandbox_collection(payload: CreateRagSandboxRequest) -> RagCollectionSummary:
    """Chunk and index custom documents into an isolated local RAG playground collection."""
    try:
        return rag_service.create_sandbox_collection(payload)
    except AdapterUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create RAG sandbox collection: {err}",
        ) from err


@router.delete("/sandbox/{collection_id}", response_model=RagDeleteResponse)
def delete_sandbox_collection(collection_id: str) -> RagDeleteResponse:
    """Delete a user-created local RAG sandbox collection (sample collection is protected)."""
    try:
        return rag_service.delete_sandbox_collection(collection_id)
    except ReadOnlyViolationError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(err)) from err
    except CollectionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete collection '{collection_id}': {err}",
        ) from err


@router.post("/search", response_model=RagSearchResponse)
def search_rag_collection(payload: RagSearchRequest) -> RagSearchResponse:
    """Run retrieval similarity search and inspect query-to-document rankings."""
    try:
        return rag_service.search(payload)
    except ConnectorUnavailableError as err:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(err)) from err
    except CollectionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG search failed: {err}",
        ) from err


@router.post("/compare", response_model=RagCompareResponse)
def compare_rag_strategies(payload: RagCompareRequest) -> RagCompareResponse:
    """Compare two retrieval configurations side-by-side (overlap, Jaccard, rank delta)."""
    try:
        return rag_service.compare(payload)
    except CollectionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG comparison failed: {err}",
        ) from err
