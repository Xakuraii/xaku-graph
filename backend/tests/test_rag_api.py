from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_connectors_and_sample_collection(isolated_storage: Path):
    conn_res = client.get("/api/rag/connectors")
    assert conn_res.status_code == 200
    connectors = conn_res.json()
    assert len(connectors) == 3
    assert all(c["read_only"] is True for c in connectors)

    cols_res = client.get("/api/rag/collections")
    assert cols_res.status_code == 200
    cols = cols_res.json()
    assert any(c["id"] == "sample-xakugraph-rag-docs" for c in cols["collections"])

    # Inspect sample collection + filter by doc_id and search
    inspect_res = client.get("/api/rag/collections/sample-xakugraph-rag-docs")
    assert inspect_res.status_code == 200
    data = inspect_res.json()
    assert data["collection"]["is_sample"] is True
    assert len(data["documents"]) == 5
    assert len(data["chunks"]) >= 5

    doc_filter = client.get(
        "/api/rag/collections/sample-xakugraph-rag-docs?doc_id=doc-polars-datasets"
    )
    assert doc_filter.status_code == 200
    assert all(ch["doc_id"] == "doc-polars-datasets" for ch in doc_filter.json()["chunks"])


def test_rag_search_and_metadata_filtering(isolated_storage: Path):
    res = client.post(
        "/api/rag/search",
        json={
            "collection_id": "sample-xakugraph-rag-docs",
            "query": "Polars Parquet tabular missing values and outliers",
            "top_k": 3,
            "metric": "cosine_similarity",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["similarity_basis"] == "original_high_dimensional_vectors"
    assert data["query_vector_dimension"] == 128
    assert len(data["results"]) == 3
    assert data["results"][0]["doc_id"] == "doc-polars-datasets"

    # Filter by metadata topic
    filtered = client.post(
        "/api/rag/search",
        json={
            "collection_id": "sample-xakugraph-rag-docs",
            "query": "vector similarity distance",
            "top_k": 5,
            "filter_key": "topic",
            "filter_value": "Vectors",
        },
    )
    assert filtered.status_code == 200
    assert all(r["metadata"].get("topic") == "Vectors" for r in filtered.json()["results"])


def test_rag_sandbox_creation_comparison_and_deletion(isolated_storage: Path):
    # Reject invalid overlap
    bad_sandbox = client.post(
        "/api/rag/sandbox",
        json={
            "name": "Invalid Overlap",
            "documents": [{"title": "D1", "content": "Short test document content here."}],
            "chunk_size": 80,
            "chunk_overlap": 80,
            "model_id": "local-text-hash-128",
        },
    )
    assert bad_sandbox.status_code == 400

    # Create valid sandbox
    sandbox_res = client.post(
        "/api/rag/sandbox",
        json={
            "name": "Engineering Notes Sandbox",
            "chunk_size": 100,
            "chunk_overlap": 20,
            "model_id": "local-text-hash-128",
            "documents": [
                {
                    "title": "Vector Index Design",
                    "source": "notes/vectors.md",
                    "content": (
                        "Vector indices store high-dimensional representations for fast cosine similarity search. "
                        "Read-only connectors protect ChromaDB and Qdrant collections from accidental mutation."
                    ),
                    "metadata": {"team": "search"},
                },
                {
                    "title": "Dataset Quality",
                    "source": "notes/quality.md",
                    "content": "Polars detects missing values, duplicate rows, and numeric outliers cleanly.",
                    "metadata": {"team": "data"},
                },
            ],
        },
    )
    assert sandbox_res.status_code == 201
    sandbox_id = sandbox_res.json()["id"]

    # Compare cosine similarity vs euclidean distance on the sample collection
    cmp_res = client.post(
        "/api/rag/compare",
        json={
            "query": "ChromaDB Qdrant read-only chunk debugging",
            "strategy_a": {
                "label": "Cosine (Top 3)",
                "collection_id": "sample-xakugraph-rag-docs",
                "metric": "cosine_similarity",
                "top_k": 3,
            },
            "strategy_b": {
                "label": "Euclidean (Top 3)",
                "collection_id": "sample-xakugraph-rag-docs",
                "metric": "euclidean_distance",
                "top_k": 3,
            },
        },
    )
    assert cmp_res.status_code == 200
    cmp_data = cmp_res.json()
    assert cmp_data["overlap_count"] >= 1
    assert 0.0 <= cmp_data["jaccard_overlap"] <= 1.0
    assert len(cmp_data["comparison_items"]) >= 3

    # Delete sandbox
    del_res = client.delete(f"/api/rag/sandbox/{sandbox_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Cannot delete sample
    prot_res = client.delete("/api/rag/sandbox/sample-xakugraph-rag-docs")
    assert prot_res.status_code == 403
