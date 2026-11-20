# ADR-0006: Read-Only Vector DB Connectors and Isolated RAG Chunking Sandbox

- **Status:** Accepted
- **Date:** 2026-11-20
- **Phase:** 5 (RAG Visualization)

---

## Context

XakuGraph requires deep RAG pipeline inspection across both built-in/custom local documents and external vector databases (`ChromaDB`, `Qdrant`). At the same time, user vector databases frequently contain production or long-running experiment indexes that must never be corrupted, mutated, or wiped during exploratory debugging.

Additionally, RAG experiments often depend on optional heavy dependencies (`chromadb`, `qdrant-client`) that users may not have installed in a base local environment.

---

## Decision

1. **Read-Only Connector Interface (`ReadOnlyVectorDbConnector`):**
   - `ChromaReadOnlyConnector` and `QdrantReadOnlyConnector` expose strictly read-only inspection (`list_collections`, `inspect_collection`, `search_collection`).
   - Write operations (`create`, `delete`, `upsert`) raise `ReadOnlyViolationError` (`read_only = True`) on read-only connectors and sample collections.
   - Optional client libraries (`chromadb`, `qdrant-client`) are isolated under the `[project.optional-dependencies] rag` extra in `backend/pyproject.toml` and imported lazily so the core studio runs cleanly without them while reporting actionable `install_hint` metadata via `GET /api/rag/connectors`.

2. **Isolated Local Chunking Sandbox (`data/cache/rag/`):**
   - Custom document chunking experiments (`chunk_size`, `chunk_overlap`, `model_id`) write only to isolated JSON + `.npy` artifacts in `RAG_CACHE_DIR` (`data/cache/rag/`), completely separate from user vector DBs and the built-in `sample-xakugraph-rag-docs` knowledge base.

3. **Exact Similarity & Deterministic Side-by-Side Comparison (`RagService`):**
   - Query embeddings are computed in high-dimensional space using the collection's bound text adapter.
   - Side-by-side comparison (`POST /api/rag/compare`) compares any two combinations of collection, metric (`cosine_similarity`, `euclidean_distance`, `dot_product`), and `top_k`, computing exact Jaccard overlap and rank deltas (`rank_a - rank_b`).

---

## Consequences

- Zero risk of accidental data loss or index mutation against existing ChromaDB or Qdrant stores.
- Core tests, CI builds, and local studio runs work out of the box without mandatory installation of `chromadb` or `qdrant-client`.
- Users can rapidly iterate on chunk size, overlap, and distance metric tradeoffs locally.
