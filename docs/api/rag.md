# RAG Visualization & Vector Database Inspection API (`/api/rag`)

All RAG endpoints run locally inside the FastAPI backend (`backend/app/api/routes/rag.py`). External vector database connectors (`chromadb`, `qdrant`) operate in **strictly read-only mode** and never modify or delete existing collections.

---

## Endpoints

### `GET /api/rag/connectors`
Returns supported vector database connectors (`local_rag`, `chromadb`, `qdrant`), their runtime availability, required connection fields, and install hints when optional packages (`chromadb`, `qdrant-client`) are not installed.

### `GET /api/rag/collections`
Lists local RAG collections (`local_rag`), including the built-in 5-document `sample-xakugraph-rag-docs` knowledge base and user-created chunking sandbox collections stored under `data/cache/rag/`.

### `POST /api/rag/external/collections`
Lists collections available in a local persistent or HTTP/gRPC ChromaDB or Qdrant instance in read-only mode.

- **Request body (`ExternalConnectionConfig`)**:
  - `connector_type`: `"chromadb"` | `"qdrant"`
  - `path`: optional local persistence path (for local ChromaDB / Qdrant)
  - `host`, `port`, `url`: optional server connection parameters
  - `collection_name`: optional collection name filter

### `POST /api/rag/external/inspect`
Inspects documents, chunks, metadata, and embedding vector previews (`offset`, `limit`) from an external ChromaDB or Qdrant collection in read-only mode. Requires `collection_name` in `ExternalConnectionConfig`.

### `GET /api/rag/collections/{collection_id}`
Inspects documents, chunk boundaries (`char_start`, `char_end`), chunk metadata, and embedding vector previews (`embedding_dimension`, `embedding_norm`, `embedding_preview`) for a local RAG collection. Supports optional `doc_id`, `search`, `offset`, and `limit` query parameters.

### `POST /api/rag/sandbox`
Creates an isolated local chunking sandbox collection (`rag-*`) under `data/cache/rag/` using deterministic sliding-window chunking (`chunk_size`, `chunk_overlap`) and a local text embedding adapter (`model_id`). Returns `201 Created`.

### `DELETE /api/rag/sandbox/{collection_id}`
Deletes a user-created local chunking sandbox collection. Built-in sample knowledge bases and external connectors remain protected against mutation.

### `POST /api/rag/search`
Executes semantic retrieval over a local or read-only external collection. Embeds the query string locally using the collection's text adapter (or runs connector search), ranks chunks by `cosine_similarity`, `euclidean_distance`, or `dot_product`, applies optional metadata filtering (`metadata_filter`), and returns ranked chunks with per-metric scores and query vector preview.

### `POST /api/rag/compare`
Evaluates a single shared query across two retrieval strategies (`strategy_a` and `strategy_b`) side by side. Computes `overlap_count`, `jaccard_overlap`, per-run rankings (`run_a`, `run_b`), and aligned `comparison_items` showing `both`, `only_a`, `only_b` presence, `rank_a`, `rank_b`, `rank_delta`, and strategy scores.
