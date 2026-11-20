from pathlib import Path
from types import SimpleNamespace

import pytest

from app.schemas.rag import ExternalConnectionConfig
from app.services.vector_databases.connectors import (
    SAMPLE_RAG_COLLECTION_ID,
    ChromaReadOnlyConnector,
    ConnectorUnavailableError,
    QdrantReadOnlyConnector,
    ReadOnlyViolationError,
    chunk_text_sliding_window,
    vector_db_registry,
)


def test_registry_exposes_read_only_connectors():
    infos = vector_db_registry.list_connectors()
    by_type = {i.connector_type: i for i in infos}
    assert set(by_type.keys()) == {"local_rag", "chromadb", "qdrant"}
    assert all(i.read_only is True for i in infos)
    assert by_type["local_rag"].available is True


def test_sliding_window_chunker_and_validation():
    text = "First sentence covers local datasets. Second sentence explains embeddings and projections. Third sentence details cosine similarity."
    chunks = chunk_text_sliding_window(text, chunk_size=60, chunk_overlap=15)
    assert len(chunks) >= 2
    assert chunks[0]["chunk_index"] == 0
    assert chunks[1]["chunk_index"] == 1
    assert chunks[0]["char_count"] > 0

    with pytest.raises(ValueError, match="chunk_overlap"):
        chunk_text_sliding_window(text, chunk_size=50, chunk_overlap=50)


def test_local_rag_store_sample_and_sandbox_lifecycle(isolated_storage: Path):
    store = vector_db_registry.local_rag
    cols = store.list_collections()
    assert any(c.id == SAMPLE_RAG_COLLECTION_ID for c in cols)

    inspect_res = store.inspect_collection(SAMPLE_RAG_COLLECTION_ID)
    assert inspect_res.collection.document_count == 5
    assert inspect_res.collection.chunk_count >= 5
    assert len(inspect_res.chunks[0].embedding_preview) == 16

    # Search sample
    summary, model_id, q_vec, total, hits = store.search_collection(
        collection_id=SAMPLE_RAG_COLLECTION_ID,
        query="How does ChromaDB read-only connector inspect chunks?",
        top_k=3,
        metric="cosine_similarity",
    )
    assert summary.id == SAMPLE_RAG_COLLECTION_ID
    assert model_id == "local-text-hash-128"
    assert q_vec.size == 128
    assert total >= 5
    assert len(hits) == 3
    assert hits[0].doc_id == "doc-rag-debugging"

    # Cannot delete built-in sample
    with pytest.raises(ReadOnlyViolationError):
        store.delete_sandbox_collection(SAMPLE_RAG_COLLECTION_ID)

    # Create and delete custom sandbox
    created = store.save_collection(
        name="Sandbox Test",
        documents=[{"title": "Doc A", "content": "FastAPI Polars Parquet analytics engine"}],
        chunk_size=120,
        chunk_overlap=20,
        model_id="local-text-tfidf-64",
    )
    assert created.dimension == 64
    assert store.delete_sandbox_collection(created.id) is True


def test_chroma_readonly_connector_with_mock_client(monkeypatch: pytest.MonkeyPatch):
    connector = ChromaReadOnlyConnector()

    class FakeChromaCollection:
        name = "docs_idx"

        def count(self):
            return 2

        def get(self, limit=50, offset=0, include=None):
            return {
                "ids": ["c1", "c2"],
                "documents": ["Polars chunk one", "Cosine similarity chunk two"],
                "metadatas": [{"title": "Doc1", "source": "a.md"}, {"title": "Doc2"}],
                "embeddings": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]],
            }

        def query(self, query_embeddings, n_results=5, where=None, include=None):
            return {
                "ids": [["c1"]],
                "documents": [["Polars chunk one"]],
                "metadatas": [[{"title": "Doc1", "doc_id": "d1"}]],
                "distances": [[0.15]],
                "embeddings": [[[1.0, 0.0, 0.0]]],
            }

    class FakeChromaClient:
        def list_collections(self):
            return [FakeChromaCollection()]

        def get_collection(self, name: str):
            return FakeChromaCollection()

    monkeypatch.setattr(ChromaReadOnlyConnector, "available", property(lambda self: True))
    monkeypatch.setattr(connector, "_get_client", lambda cfg: FakeChromaClient())

    cfg = ExternalConnectionConfig(connector_type="chromadb", host="127.0.0.1", port=8001)
    listed = connector.list_collections(cfg)
    assert len(listed) == 1
    assert listed[0].read_only is True

    inspected = connector.inspect_collection("docs_idx", connection_config=cfg)
    assert inspected.collection.dimension == 3
    assert len(inspected.chunks) == 2

    _, _, _, _, results = connector.search_collection(
        "docs_idx", query="Polars", top_k=1, connection_config=cfg
    )
    assert results[0].chunk_id == "c1"
    assert results[0].cosine_similarity == 0.85


def test_qdrant_readonly_connector_with_mock_client(monkeypatch: pytest.MonkeyPatch):
    connector = QdrantReadOnlyConnector()

    class FakeQdrantClient:
        def get_collections(self):
            return SimpleNamespace(collections=[SimpleNamespace(name="q_docs")])

        def get_collection(self, collection_name: str):
            return SimpleNamespace(points_count=1)

        def scroll(self, collection_name: str, limit=50, with_payload=True, with_vectors=True):
            pt = SimpleNamespace(
                id="pt-1",
                payload={"text": "Qdrant vector chunk", "title": "QDoc", "source": "q.md"},
                vector=[0.6, 0.8],
            )
            return ([pt], None)

        def query_points(
            self, collection_name: str, query, limit=5, with_payload=True, with_vectors=True
        ):
            pt = SimpleNamespace(
                id="pt-1",
                score=0.92,
                payload={"text": "Qdrant vector chunk", "title": "QDoc"},
                vector=[0.6, 0.8],
            )
            return SimpleNamespace(points=[pt])

    monkeypatch.setattr(QdrantReadOnlyConnector, "available", property(lambda self: True))
    monkeypatch.setattr(connector, "_get_client", lambda cfg: FakeQdrantClient())

    cfg = ExternalConnectionConfig(connector_type="qdrant", host="127.0.0.1", port=6333)
    listed = connector.list_collections(cfg)
    assert listed[0].id == "q_docs"
    assert listed[0].read_only is True

    inspected = connector.inspect_collection("q_docs", connection_config=cfg)
    assert inspected.chunks[0].embedding_dimension == 2

    _, _, _, _, results = connector.search_collection(
        "q_docs", query="Qdrant", top_k=1, connection_config=cfg
    )
    assert results[0].score == 0.92


def test_unavailable_external_connectors_raise_clear_error():
    chroma = ChromaReadOnlyConnector()
    qdrant = QdrantReadOnlyConnector()
    if not chroma.available:
        with pytest.raises(ConnectorUnavailableError):
            chroma.list_collections(
                ExternalConnectionConfig(connector_type="chromadb", host="localhost")
            )
    if not qdrant.available:
        with pytest.raises(ConnectorUnavailableError):
            qdrant.list_collections(
                ExternalConnectionConfig(connector_type="qdrant", host="localhost")
            )
