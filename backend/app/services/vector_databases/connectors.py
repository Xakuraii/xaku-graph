import importlib.util
import json
import sqlite3
import uuid
from abc import ABC, abstractmethod
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

from app.core.config import settings
from app.schemas.rag import (
    ConnectorType,
    ExternalConnectionConfig,
    RagChunkDetail,
    RagCollectionInspectResponse,
    RagCollectionSummary,
    RagDocumentSummary,
    RagRetrievedChunk,
    RagSimilarityMetric,
    VectorDbConnectorInfo,
)
from app.services.datasets.loaders import validate_safe_path
from app.services.embeddings.adapters import embedding_adapter_registry

SAMPLE_RAG_COLLECTION_ID = "sample-xakugraph-rag-docs"


class ConnectorUnavailableError(RuntimeError):
    """Raised when an optional vector DB client library is not installed."""


class CollectionNotFoundError(FileNotFoundError):
    """Raised when a requested vector DB collection does not exist."""


class ReadOnlyViolationError(PermissionError):
    """Raised when a destructive or mutating operation is attempted on a read-only connector."""


def chunk_text_sliding_window(
    text: str,
    chunk_size: int = 280,
    chunk_overlap: int = 40,
) -> list[dict[str, Any]]:
    """Deterministically split text into overlapping character-bounded chunks."""
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be strictly smaller than chunk_size.")

    cleaned = text.strip()
    if not cleaned:
        return []

    chunks: list[dict[str, Any]] = []
    n = len(cleaned)
    start = 0
    idx = 0

    while start < n:
        end = min(n, start + chunk_size)
        if end < n:
            # Prefer snapping to a nearby whitespace boundary so words are not split mid-token
            ws = cleaned.rfind(" ", start + max(1, chunk_size // 2), end)
            if ws > start:
                end = ws

        slice_text = cleaned[start:end].strip()
        if slice_text:
            chunks.append(
                {
                    "chunk_index": idx,
                    "content": slice_text,
                    "char_count": len(slice_text),
                    "char_start": start,
                    "char_end": end,
                }
            )
            idx += 1

        if end >= n:
            break
        next_start = max(start + 1, end - chunk_overlap)
        start = next_start

    return chunks


def _score_vectors(
    query_vec: np.ndarray,
    matrix: np.ndarray,
    metric: RagSimilarityMetric,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Compute exact cosine similarity, Euclidean distance, and dot product on original vectors."""
    q = query_vec.astype(np.float64)
    mat = matrix.astype(np.float64)
    q_norm = float(np.linalg.norm(q))
    mat_norms = np.linalg.norm(mat, axis=1)

    dots = mat @ q
    denom = np.where((mat_norms * q_norm) > 1e-12, mat_norms * q_norm, 1.0)
    cos_sims = np.clip(dots / denom, -1.0, 1.0)
    euc_dists = np.linalg.norm(mat - q, axis=1)

    if metric == "cosine_similarity":
        scores = cos_sims
    elif metric == "euclidean_distance":
        scores = euc_dists
    else:
        scores = dots

    return scores, cos_sims, euc_dists, dots


SAMPLE_RAG_DOCUMENTS: list[dict[str, Any]] = [
    {
        "doc_id": "doc-architecture",
        "title": "XakuGraph Local-First Architecture",
        "source": "docs/architecture/overview.md",
        "metadata": {"topic": "Architecture", "audience": "Engineers"},
        "content": (
            "XakuGraph is a local-first Data and AI Visualization Studio engineered around strict privacy boundaries. "
            "All dataset parsing, embedding generation, and vector database inspections run locally on loopback hardware without telemetry or cloud uploads. "
            "The shared processing engine uses Python 3.12 with FastAPI, Polars, NumPy, and Scikit-learn alongside the xakugraph-core Rust library crate. "
            "Both the local Vite React web application and the Tauri 2 Windows desktop shell share the exact same frontend and backend engine."
        ),
    },
    {
        "doc_id": "doc-polars-datasets",
        "title": "Polars Dataset Profiling & Quality Checks",
        "source": "docs/api/datasets.md",
        "metadata": {"topic": "Datasets", "audience": "Data Scientists"},
        "content": (
            "Dataset ingestion in XakuGraph supports CSV, JSON, JSONL, Parquet, and Excel XLSX files via an extensible loader registry. "
            "Uploaded tabular files are validated against path traversal and streaming size limits, then cached locally as Apache Parquet files for rapid analytical queries. "
            "Statistical quality checks compute completeness percentages, missing value counts per column, exact duplicate row counts, and both IQR fence and Z-score outlier flags. "
            "Correlation heatmaps calculate pairwise Pearson linear and Spearman rank coefficients directly from finite numeric columns."
        ),
    },
    {
        "doc_id": "doc-embeddings-projections",
        "title": "Embedding Spaces & Dimensionality Reduction",
        "source": "docs/decisions/ADR-0004",
        "metadata": {"topic": "Embeddings", "audience": "ML Engineers"},
        "content": (
            "Embedding adapters strictly isolate text and image modalities so incompatible encoders cannot be mixed silently. "
            "High-dimensional embedding matrices are stored as binary NumPy .npy files under the dedicated local embedding cache rather than bloating SQLite metadata tables. "
            "PCA, t-SNE, and optional UMAP algorithms project vectors into 2D or 3D coordinates solely for visual inspection. "
            "K-Means clustering and point nearest-neighbor ranking always operate on the original high-dimensional vectors."
        ),
    },
    {
        "doc_id": "doc-vector-similarity",
        "title": "Vector Similarity & Distance Metrics",
        "source": "docs/api/vectors.md",
        "metadata": {"topic": "Vectors", "audience": "Researchers"},
        "content": (
            "Cosine similarity measures the cosine of the angle between two non-zero vectors using their dot product divided by the product of their L2 norms. "
            "Euclidean L2 distance measures straight-line geometric separation between coordinates, while Manhattan L1 distance sums absolute component differences. "
            "When vectors are unit-normalized to L2 norm equal to 1.0, dot product equals cosine similarity and squared Euclidean distance is directly proportional to cosine distance. "
            "The xakugraph-core Rust crate mirrors Python vector routines with deterministic unit tests."
        ),
    },
    {
        "doc_id": "doc-rag-debugging",
        "title": "RAG Pipeline Debugging & Read-Only Connectors",
        "source": "docs/api/rag.md",
        "metadata": {"topic": "RAG", "audience": "RAG Developers"},
        "content": (
            "Debugging Retrieval-Augmented Generation pipelines requires inspecting raw source documents, chunk boundaries, chunk overlap, metadata tags, and underlying embedding vectors. "
            "Retrieval failures often stem from overly large chunks diluting semantic focus, missing overlap cutting key sentences, or mismatched embedding models between indexing and query time. "
            "XakuGraph connects to ChromaDB and Qdrant vector databases in strictly read-only mode so engineers can inspect contents and test queries without mutating production indices."
        ),
    },
]


class ReadOnlyVectorDbConnector(ABC):
    """Abstract read-only connector interface for vector databases."""

    connector_type: ConnectorType
    name: str
    description: str
    read_only: bool = True
    connection_fields: list[str] = []
    install_hint: str | None = None

    @property
    def available(self) -> bool:
        return True

    def info(self) -> VectorDbConnectorInfo:
        return VectorDbConnectorInfo(
            connector_type=self.connector_type,
            name=self.name,
            description=self.description,
            available=self.available,
            read_only=self.read_only,
            connection_fields=self.connection_fields,
            install_hint=self.install_hint if not self.available else None,
        )

    @abstractmethod
    def list_collections(
        self, connection_config: ExternalConnectionConfig | None = None
    ) -> list[RagCollectionSummary]:
        """List readable collections in the vector store."""

    @abstractmethod
    def inspect_collection(
        self,
        collection_id: str,
        doc_id: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 50,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> RagCollectionInspectResponse:
        """Inspect documents, chunks, metadata, and embedding vectors in read-only mode."""

    @abstractmethod
    def search_collection(
        self,
        collection_id: str,
        query: str,
        top_k: int = 5,
        metric: RagSimilarityMetric = "cosine_similarity",
        model_id: str | None = None,
        filter_key: str | None = None,
        filter_value: str | None = None,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> tuple[RagCollectionSummary, str, np.ndarray, int, list[RagRetrievedChunk]]:
        """Run read-only similarity search and return (summary, model_id, query_vec, total, ranked_chunks)."""


class LocalRagStoreConnector(ReadOnlyVectorDbConnector):
    """Local SQLite + .npy RAG store powering the built-in sample and chunking sandbox."""

    connector_type: ConnectorType = "local_rag"
    name = "Local RAG Store (Built-In)"
    description = "Built-in local RAG knowledge base & chunking sandbox backed by SQLite metadata and .npy vectors."
    read_only = True
    connection_fields = []

    def __init__(self, db_path: Path | None = None) -> None:
        self._db_path = db_path

    @property
    def db_path(self) -> Path:
        return self._db_path if self._db_path is not None else settings.SQLITE_DB_PATH

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS rag_collections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    dimension INTEGER NOT NULL,
                    document_count INTEGER NOT NULL,
                    chunk_count INTEGER NOT NULL,
                    metadata_keys_json TEXT NOT NULL,
                    docs_path TEXT NOT NULL,
                    chunks_path TEXT NOT NULL,
                    vectors_path TEXT NOT NULL,
                    is_sample INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                )
                """
            )

    def ensure_sample_collection(self) -> RagCollectionSummary:
        self.ensure_schema()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM rag_collections WHERE id = ?",
                (SAMPLE_RAG_COLLECTION_ID,),
            ).fetchone()
        if row is not None:
            docs_path = validate_safe_path(settings.RAG_CACHE_DIR, Path(row["docs_path"]))
            chunks_path = validate_safe_path(settings.RAG_CACHE_DIR, Path(row["chunks_path"]))
            vectors_path = validate_safe_path(settings.RAG_CACHE_DIR, Path(row["vectors_path"]))
            if docs_path.exists() and chunks_path.exists() and vectors_path.exists():
                return self._row_to_summary(row)

        return self.save_collection(
            collection_id=SAMPLE_RAG_COLLECTION_ID,
            name="XakuGraph Knowledge Base Sample (5 Docs)",
            documents=SAMPLE_RAG_DOCUMENTS,
            chunk_size=240,
            chunk_overlap=40,
            model_id="local-text-hash-128",
            is_sample=True,
        )

    def save_collection(
        self,
        name: str,
        documents: list[dict[str, Any]],
        chunk_size: int,
        chunk_overlap: int,
        model_id: str,
        collection_id: str | None = None,
        is_sample: bool = False,
    ) -> RagCollectionSummary:
        settings.ensure_storage_dirs()
        self.ensure_schema()

        adapter = embedding_adapter_registry.get(model_id, expected_modality="text")
        cid = collection_id or f"rag-{uuid.uuid4().hex[:12]}"

        doc_summaries: list[dict[str, Any]] = []
        chunk_records: list[dict[str, Any]] = []
        metadata_keys: set[str] = set()

        for doc_idx, doc in enumerate(documents):
            doc_id = doc.get("doc_id") or f"doc-{doc_idx + 1}"
            title = doc["title"].strip()
            source = doc.get("source", "local-sandbox")
            content = doc["content"].strip()
            doc_meta = {str(k): v for k, v in doc.get("metadata", {}).items()}
            metadata_keys.update(doc_meta.keys())

            raw_chunks = chunk_text_sliding_window(
                content, chunk_size=chunk_size, chunk_overlap=chunk_overlap
            )
            for chunk in raw_chunks:
                chunk_meta = {**doc_meta, "source": source}
                metadata_keys.add("source")
                chunk_records.append(
                    {
                        "chunk_id": f"{doc_id}::c{chunk['chunk_index']}",
                        "doc_id": doc_id,
                        "doc_title": title,
                        "chunk_index": chunk["chunk_index"],
                        "content": chunk["content"],
                        "char_count": chunk["char_count"],
                        "char_start": chunk["char_start"],
                        "char_end": chunk["char_end"],
                        "metadata": chunk_meta,
                    }
                )

            doc_summaries.append(
                {
                    "doc_id": doc_id,
                    "title": title,
                    "source": source,
                    "chunk_count": len(raw_chunks),
                    "total_chars": len(content),
                    "metadata": doc_meta,
                }
            )

        if not chunk_records:
            raise ValueError("Documents produced zero non-empty chunks.")

        vectors = adapter.embed_texts([c["content"] for c in chunk_records])
        dim = int(vectors.shape[1])

        docs_path = validate_safe_path(
            settings.RAG_CACHE_DIR, settings.RAG_CACHE_DIR / f"{cid}_docs.json"
        )
        chunks_path = validate_safe_path(
            settings.RAG_CACHE_DIR, settings.RAG_CACHE_DIR / f"{cid}_chunks.json"
        )
        vectors_path = validate_safe_path(
            settings.RAG_CACHE_DIR, settings.RAG_CACHE_DIR / f"{cid}_vectors.npy"
        )

        docs_path.write_text(json.dumps(doc_summaries, ensure_ascii=False), encoding="utf-8")
        chunks_path.write_text(json.dumps(chunk_records, ensure_ascii=False), encoding="utf-8")
        np.save(vectors_path, np.asarray(vectors, dtype=np.float32))

        created_at = datetime.now(UTC)
        sorted_keys = sorted(metadata_keys)

        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO rag_collections (
                    id, name, model_id, dimension, document_count, chunk_count,
                    metadata_keys_json, docs_path, chunks_path, vectors_path, is_sample, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cid,
                    name.strip(),
                    adapter.model_id,
                    dim,
                    len(doc_summaries),
                    len(chunk_records),
                    json.dumps(sorted_keys),
                    str(docs_path),
                    str(chunks_path),
                    str(vectors_path),
                    1 if is_sample else 0,
                    created_at.isoformat(),
                ),
            )

        return RagCollectionSummary(
            id=cid,
            name=name.strip(),
            connector_type="local_rag",
            document_count=len(doc_summaries),
            chunk_count=len(chunk_records),
            dimension=dim,
            model_id=adapter.model_id,
            read_only=is_sample,
            is_sample=is_sample,
            metadata_keys=sorted_keys,
            created_at=created_at,
        )

    def delete_sandbox_collection(self, collection_id: str) -> bool:
        if collection_id == SAMPLE_RAG_COLLECTION_ID:
            raise ReadOnlyViolationError("Cannot delete the built-in sample RAG collection.")

        self.ensure_schema()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM rag_collections WHERE id = ?", (collection_id,)
            ).fetchone()
        if row is None:
            raise CollectionNotFoundError(f"RAG collection '{collection_id}' not found.")

        for key in ("docs_path", "chunks_path", "vectors_path"):
            p = validate_safe_path(settings.RAG_CACHE_DIR, Path(row[key]))
            p.unlink(missing_ok=True)

        with self._connect() as conn:
            cursor = conn.execute("DELETE FROM rag_collections WHERE id = ?", (collection_id,))
            return cursor.rowcount > 0

    def _load_payload(
        self, collection_id: str
    ) -> tuple[RagCollectionSummary, list[dict[str, Any]], list[dict[str, Any]], np.ndarray]:
        if collection_id == SAMPLE_RAG_COLLECTION_ID:
            self.ensure_sample_collection()
        else:
            self.ensure_schema()

        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM rag_collections WHERE id = ?", (collection_id,)
            ).fetchone()
        if row is None:
            raise CollectionNotFoundError(f"RAG collection '{collection_id}' not found.")

        docs_path = validate_safe_path(settings.RAG_CACHE_DIR, Path(row["docs_path"]))
        chunks_path = validate_safe_path(settings.RAG_CACHE_DIR, Path(row["chunks_path"]))
        vectors_path = validate_safe_path(settings.RAG_CACHE_DIR, Path(row["vectors_path"]))

        docs = json.loads(docs_path.read_text(encoding="utf-8"))
        chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
        vectors = np.load(vectors_path, allow_pickle=False)
        return self._row_to_summary(row), docs, chunks, vectors

    def list_collections(
        self, connection_config: ExternalConnectionConfig | None = None
    ) -> list[RagCollectionSummary]:
        self.ensure_sample_collection()
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM rag_collections ORDER BY is_sample DESC, created_at DESC"
            ).fetchall()
        return [self._row_to_summary(r) for r in rows]

    def inspect_collection(
        self,
        collection_id: str,
        doc_id: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 50,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> RagCollectionInspectResponse:
        summary, docs, chunks, vectors = self._load_payload(collection_id)

        filtered: list[tuple[int, dict[str, Any]]] = []
        needle = search.strip().lower() if search else ""
        for idx, ch in enumerate(chunks):
            if doc_id and ch["doc_id"] != doc_id:
                continue
            if (
                needle
                and needle not in ch["content"].lower()
                and needle not in ch["doc_title"].lower()
            ):
                continue
            filtered.append((idx, ch))

        total_filtered = len(filtered)
        clamped_offset = max(0, offset)
        clamped_limit = max(1, min(limit, 200))
        page = filtered[clamped_offset : clamped_offset + clamped_limit]

        chunk_details: list[RagChunkDetail] = []
        for idx, ch in page:
            vec = vectors[idx]
            norm_val = round(float(np.linalg.norm(vec)), 5)
            preview = [round(float(v), 5) for v in vec[: min(16, vec.size)]]
            chunk_details.append(
                RagChunkDetail(
                    chunk_id=ch["chunk_id"],
                    doc_id=ch["doc_id"],
                    doc_title=ch["doc_title"],
                    chunk_index=ch["chunk_index"],
                    content=ch["content"],
                    char_count=ch["char_count"],
                    char_start=ch.get("char_start"),
                    char_end=ch.get("char_end"),
                    metadata=ch.get("metadata", {}),
                    embedding_dimension=int(vec.size),
                    embedding_norm=norm_val,
                    embedding_preview=preview,
                )
            )

        return RagCollectionInspectResponse(
            collection=summary,
            documents=[RagDocumentSummary(**d) for d in docs],
            chunks=chunk_details,
            total_chunks=total_filtered,
            offset=clamped_offset,
            limit=clamped_limit,
        )

    def search_collection(
        self,
        collection_id: str,
        query: str,
        top_k: int = 5,
        metric: RagSimilarityMetric = "cosine_similarity",
        model_id: str | None = None,
        filter_key: str | None = None,
        filter_value: str | None = None,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> tuple[RagCollectionSummary, str, np.ndarray, int, list[RagRetrievedChunk]]:
        summary, _, chunks, vectors = self._load_payload(collection_id)
        effective_model_id = model_id or summary.model_id or "local-text-hash-128"
        adapter = embedding_adapter_registry.get(effective_model_id, expected_modality="text")

        if adapter.dimensions != int(vectors.shape[1]):
            raise ValueError(
                f"Model '{effective_model_id}' produces {adapter.dimensions}D vectors, "
                f"but collection '{summary.name}' uses {vectors.shape[1]}D vectors."
            )

        query_vec = adapter.embed_texts([query])[0]

        candidate_indices: list[int] = []
        for idx, ch in enumerate(chunks):
            if filter_key and filter_value:
                meta_val = ch.get("metadata", {}).get(filter_key)
                if meta_val is None or filter_value.lower() not in str(meta_val).lower():
                    continue
            candidate_indices.append(idx)

        if not candidate_indices:
            return summary, effective_model_id, query_vec, 0, []

        sub_matrix = vectors[candidate_indices]
        scores, cos_sims, euc_dists, dots = _score_vectors(query_vec, sub_matrix, metric)

        order = np.argsort(scores)
        if metric in ("cosine_similarity", "dot_product"):
            order = order[::-1]

        top_order = order[: max(1, min(top_k, len(candidate_indices)))]
        results: list[RagRetrievedChunk] = []
        for rank_idx, local_pos in enumerate(top_order):
            orig_idx = candidate_indices[int(local_pos)]
            ch = chunks[orig_idx]
            vec = vectors[orig_idx]
            results.append(
                RagRetrievedChunk(
                    rank=rank_idx + 1,
                    chunk_id=ch["chunk_id"],
                    doc_id=ch["doc_id"],
                    doc_title=ch["doc_title"],
                    chunk_index=ch["chunk_index"],
                    content=ch["content"],
                    score=round(float(scores[local_pos]), 5),
                    cosine_similarity=round(float(cos_sims[local_pos]), 5),
                    euclidean_distance=round(float(euc_dists[local_pos]), 5),
                    dot_product=round(float(dots[local_pos]), 5),
                    metadata=ch.get("metadata", {}),
                    embedding_preview=[round(float(v), 5) for v in vec[: min(16, vec.size)]],
                )
            )

        return summary, effective_model_id, query_vec, len(candidate_indices), results

    @staticmethod
    def _row_to_summary(row: sqlite3.Row) -> RagCollectionSummary:
        is_sample = bool(row["is_sample"])
        return RagCollectionSummary(
            id=row["id"],
            name=row["name"],
            connector_type="local_rag",
            document_count=row["document_count"],
            chunk_count=row["chunk_count"],
            dimension=row["dimension"],
            model_id=row["model_id"],
            read_only=is_sample,
            is_sample=is_sample,
            metadata_keys=json.loads(row["metadata_keys_json"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )


class ChromaReadOnlyConnector(ReadOnlyVectorDbConnector):
    """Strictly read-only ChromaDB connector (never adds, updates, or deletes data)."""

    connector_type: ConnectorType = "chromadb"
    name = "ChromaDB (Read-Only)"
    description = "Inspect local persistent ChromaDB directories or local Chroma HTTP servers in read-only mode."
    read_only = True
    connection_fields = ["path", "host", "port", "collection_name"]
    install_hint = 'Install optional RAG dependencies: uv pip install -e ".[rag]"'

    @property
    def available(self) -> bool:
        return importlib.util.find_spec("chromadb") is not None

    def _get_client(self, config: ExternalConnectionConfig | None) -> Any:
        if not self.available:
            raise ConnectorUnavailableError(
                f"ChromaDB connector is unavailable. {self.install_hint}"
            )
        import chromadb

        if config and config.path:
            clean_path = Path(config.path).expanduser().resolve()
            if not clean_path.exists():
                raise CollectionNotFoundError(f"ChromaDB directory not found: {clean_path}")
            return chromadb.PersistentClient(path=str(clean_path))
        if config and config.host:
            return chromadb.HttpClient(host=config.host, port=config.port or 8000)
        raise ValueError("ChromaDB connection requires either a local 'path' or 'host'.")

    def list_collections(
        self, connection_config: ExternalConnectionConfig | None = None
    ) -> list[RagCollectionSummary]:
        client = self._get_client(connection_config)
        collections = client.list_collections()
        summaries: list[RagCollectionSummary] = []
        for col in collections:
            col_name = col.name if hasattr(col, "name") else str(col)
            summaries.append(
                RagCollectionSummary(
                    id=col_name,
                    name=col_name,
                    connector_type="chromadb",
                    document_count=0,
                    chunk_count=col.count() if hasattr(col, "count") else 0,
                    dimension=0,
                    read_only=True,
                    is_sample=False,
                )
            )
        return summaries

    def inspect_collection(
        self,
        collection_id: str,
        doc_id: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 50,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> RagCollectionInspectResponse:
        client = self._get_client(connection_config)
        col = client.get_collection(name=collection_id)
        total = col.count()
        raw = col.get(
            limit=limit,
            offset=offset,
            include=["documents", "metadatas", "embeddings"],
        )

        ids = raw.get("ids") or []
        docs_text = raw.get("documents") or []
        metas = raw.get("metadatas") or []
        embeddings = raw.get("embeddings") or []

        chunks: list[RagChunkDetail] = []
        doc_groups: dict[str, RagDocumentSummary] = {}
        meta_keys: set[str] = set()
        dim = 0

        for idx, cid in enumerate(ids):
            text = docs_text[idx] if idx < len(docs_text) and docs_text[idx] is not None else ""
            meta = dict(metas[idx]) if idx < len(metas) and metas[idx] else {}
            meta_keys.update(meta.keys())
            emb = embeddings[idx] if idx < len(embeddings) and embeddings[idx] is not None else []
            emb_arr = np.asarray(emb, dtype=np.float32)
            if emb_arr.size > 0:
                dim = int(emb_arr.size)

            parent_doc = str(meta.get("doc_id") or meta.get("source") or cid)
            if parent_doc not in doc_groups:
                doc_groups[parent_doc] = RagDocumentSummary(
                    doc_id=parent_doc,
                    title=str(meta.get("title") or parent_doc),
                    source=str(meta.get("source") or "chromadb"),
                    chunk_count=0,
                    total_chars=0,
                    metadata=meta,
                )
            doc_groups[parent_doc].chunk_count += 1
            doc_groups[parent_doc].total_chars += len(text)

            chunks.append(
                RagChunkDetail(
                    chunk_id=str(cid),
                    doc_id=parent_doc,
                    doc_title=doc_groups[parent_doc].title,
                    chunk_index=idx,
                    content=text,
                    char_count=len(text),
                    metadata=meta,
                    embedding_dimension=int(emb_arr.size),
                    embedding_norm=round(float(np.linalg.norm(emb_arr)), 5)
                    if emb_arr.size > 0
                    else None,
                    embedding_preview=[
                        round(float(v), 5) for v in emb_arr[: min(16, emb_arr.size)]
                    ],
                )
            )

        summary = RagCollectionSummary(
            id=collection_id,
            name=collection_id,
            connector_type="chromadb",
            document_count=len(doc_groups),
            chunk_count=total,
            dimension=dim,
            read_only=True,
            is_sample=False,
            metadata_keys=sorted(meta_keys),
        )
        return RagCollectionInspectResponse(
            collection=summary,
            documents=list(doc_groups.values()),
            chunks=chunks,
            total_chunks=total,
            offset=offset,
            limit=limit,
        )

    def search_collection(
        self,
        collection_id: str,
        query: str,
        top_k: int = 5,
        metric: RagSimilarityMetric = "cosine_similarity",
        model_id: str | None = None,
        filter_key: str | None = None,
        filter_value: str | None = None,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> tuple[RagCollectionSummary, str, np.ndarray, int, list[RagRetrievedChunk]]:
        client = self._get_client(connection_config)
        col = client.get_collection(name=collection_id)
        effective_model_id = model_id or "local-text-hash-128"
        adapter = embedding_adapter_registry.get(effective_model_id, expected_modality="text")
        query_vec = adapter.embed_texts([query])[0]

        where_clause = {filter_key: filter_value} if filter_key and filter_value else None
        raw = col.query(
            query_embeddings=[query_vec.tolist()],
            n_results=top_k,
            where=where_clause,
            include=["documents", "metadatas", "distances", "embeddings"],
        )

        ids = (raw.get("ids") or [[]])[0]
        docs = (raw.get("documents") or [[]])[0]
        metas = (raw.get("metadatas") or [[]])[0]
        dists = (raw.get("distances") or [[]])[0]
        embs = (raw.get("embeddings") or [[]])[0]

        results: list[RagRetrievedChunk] = []
        for idx, cid in enumerate(ids):
            text = docs[idx] if idx < len(docs) and docs[idx] else ""
            meta = dict(metas[idx]) if idx < len(metas) and metas[idx] else {}
            dist = float(dists[idx]) if idx < len(dists) else 0.0
            emb = np.asarray(embs[idx] if idx < len(embs) else [], dtype=np.float32)
            cos_sim = round(1.0 - dist, 5)
            results.append(
                RagRetrievedChunk(
                    rank=idx + 1,
                    chunk_id=str(cid),
                    doc_id=str(meta.get("doc_id") or cid),
                    doc_title=str(meta.get("title") or meta.get("source") or cid),
                    chunk_index=idx,
                    content=text,
                    score=cos_sim,
                    cosine_similarity=cos_sim,
                    euclidean_distance=round(dist, 5),
                    dot_product=cos_sim,
                    metadata=meta,
                    embedding_preview=[round(float(v), 5) for v in emb[: min(16, emb.size)]],
                )
            )

        total = col.count()
        summary = RagCollectionSummary(
            id=collection_id,
            name=collection_id,
            connector_type="chromadb",
            document_count=len({r.doc_id for r in results}),
            chunk_count=total,
            dimension=int(query_vec.size),
            read_only=True,
        )
        return summary, effective_model_id, query_vec, total, results


class QdrantReadOnlyConnector(ReadOnlyVectorDbConnector):
    """Strictly read-only Qdrant connector (never upserts, modifies, or deletes points)."""

    connector_type: ConnectorType = "qdrant"
    name = "Qdrant (Read-Only)"
    description = (
        "Inspect local Qdrant storage paths or local Qdrant HTTP instances in read-only mode."
    )
    read_only = True
    connection_fields = ["path", "host", "port", "collection_name"]
    install_hint = 'Install optional RAG dependencies: uv pip install -e ".[rag]"'

    @property
    def available(self) -> bool:
        return importlib.util.find_spec("qdrant_client") is not None

    def _get_client(self, config: ExternalConnectionConfig | None) -> Any:
        if not self.available:
            raise ConnectorUnavailableError(f"Qdrant connector is unavailable. {self.install_hint}")
        from qdrant_client import QdrantClient

        if config and config.path:
            clean_path = Path(config.path).expanduser().resolve()
            if not clean_path.exists():
                raise CollectionNotFoundError(f"Qdrant directory not found: {clean_path}")
            return QdrantClient(path=str(clean_path))
        if config and config.host:
            return QdrantClient(host=config.host, port=config.port or 6333)
        raise ValueError("Qdrant connection requires either a local 'path' or 'host'.")

    def list_collections(
        self, connection_config: ExternalConnectionConfig | None = None
    ) -> list[RagCollectionSummary]:
        client = self._get_client(connection_config)
        resp = client.get_collections()
        summaries: list[RagCollectionSummary] = []
        for col in getattr(resp, "collections", []):
            summaries.append(
                RagCollectionSummary(
                    id=col.name,
                    name=col.name,
                    connector_type="qdrant",
                    document_count=0,
                    chunk_count=0,
                    dimension=0,
                    read_only=True,
                )
            )
        return summaries

    def inspect_collection(
        self,
        collection_id: str,
        doc_id: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 50,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> RagCollectionInspectResponse:
        client = self._get_client(connection_config)
        info = client.get_collection(collection_name=collection_id)
        points, _ = client.scroll(
            collection_name=collection_id,
            limit=limit,
            with_payload=True,
            with_vectors=True,
        )

        chunks: list[RagChunkDetail] = []
        doc_groups: dict[str, RagDocumentSummary] = {}
        meta_keys: set[str] = set()
        dim = 0

        for idx, pt in enumerate(points):
            payload = dict(getattr(pt, "payload", None) or {})
            text = str(payload.pop("text", payload.pop("content", "")))
            meta_keys.update(payload.keys())
            raw_vec = getattr(pt, "vector", None) or []
            if isinstance(raw_vec, dict):
                raw_vec = next(iter(raw_vec.values()), [])
            vec_arr = np.asarray(raw_vec, dtype=np.float32)
            if vec_arr.size > 0:
                dim = int(vec_arr.size)

            parent_doc = str(payload.get("doc_id") or payload.get("source") or pt.id)
            if parent_doc not in doc_groups:
                doc_groups[parent_doc] = RagDocumentSummary(
                    doc_id=parent_doc,
                    title=str(payload.get("title") or parent_doc),
                    source=str(payload.get("source") or "qdrant"),
                    chunk_count=0,
                    total_chars=0,
                    metadata=payload,
                )
            doc_groups[parent_doc].chunk_count += 1
            doc_groups[parent_doc].total_chars += len(text)

            chunks.append(
                RagChunkDetail(
                    chunk_id=str(pt.id),
                    doc_id=parent_doc,
                    doc_title=doc_groups[parent_doc].title,
                    chunk_index=idx,
                    content=text,
                    char_count=len(text),
                    metadata=payload,
                    embedding_dimension=int(vec_arr.size),
                    embedding_norm=round(float(np.linalg.norm(vec_arr)), 5)
                    if vec_arr.size > 0
                    else None,
                    embedding_preview=[
                        round(float(v), 5) for v in vec_arr[: min(16, vec_arr.size)]
                    ],
                )
            )

        total = int(getattr(info, "points_count", None) or len(chunks))
        summary = RagCollectionSummary(
            id=collection_id,
            name=collection_id,
            connector_type="qdrant",
            document_count=len(doc_groups),
            chunk_count=total,
            dimension=dim,
            read_only=True,
            metadata_keys=sorted(meta_keys),
        )
        return RagCollectionInspectResponse(
            collection=summary,
            documents=list(doc_groups.values()),
            chunks=chunks,
            total_chunks=total,
            offset=offset,
            limit=limit,
        )

    def search_collection(
        self,
        collection_id: str,
        query: str,
        top_k: int = 5,
        metric: RagSimilarityMetric = "cosine_similarity",
        model_id: str | None = None,
        filter_key: str | None = None,
        filter_value: str | None = None,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> tuple[RagCollectionSummary, str, np.ndarray, int, list[RagRetrievedChunk]]:
        client = self._get_client(connection_config)
        effective_model_id = model_id or "local-text-hash-128"
        adapter = embedding_adapter_registry.get(effective_model_id, expected_modality="text")
        query_vec = adapter.embed_texts([query])[0]

        query_res = client.query_points(
            collection_name=collection_id,
            query=query_vec.tolist(),
            limit=top_k,
            with_payload=True,
            with_vectors=True,
        )
        hits = getattr(query_res, "points", query_res)

        results: list[RagRetrievedChunk] = []
        for idx, pt in enumerate(hits):
            payload = dict(getattr(pt, "payload", None) or {})
            text = str(payload.pop("text", payload.pop("content", "")))
            score = float(getattr(pt, "score", 0.0))
            raw_vec = getattr(pt, "vector", None) or []
            if isinstance(raw_vec, dict):
                raw_vec = next(iter(raw_vec.values()), [])
            vec_arr = np.asarray(raw_vec, dtype=np.float32)

            results.append(
                RagRetrievedChunk(
                    rank=idx + 1,
                    chunk_id=str(pt.id),
                    doc_id=str(payload.get("doc_id") or pt.id),
                    doc_title=str(payload.get("title") or payload.get("source") or pt.id),
                    chunk_index=idx,
                    content=text,
                    score=round(score, 5),
                    cosine_similarity=round(score, 5),
                    euclidean_distance=0.0,
                    dot_product=round(score, 5),
                    metadata=payload,
                    embedding_preview=[
                        round(float(v), 5) for v in vec_arr[: min(16, vec_arr.size)]
                    ],
                )
            )

        summary = RagCollectionSummary(
            id=collection_id,
            name=collection_id,
            connector_type="qdrant",
            document_count=len({r.doc_id for r in results}),
            chunk_count=len(results),
            dimension=int(query_vec.size),
            read_only=True,
        )
        return summary, effective_model_id, query_vec, len(results), results


class VectorDbConnectorRegistry:
    """Extensible registry of read-only vector database connectors."""

    def __init__(self) -> None:
        self.local_rag = LocalRagStoreConnector()
        self.chromadb = ChromaReadOnlyConnector()
        self.qdrant = QdrantReadOnlyConnector()
        self._connectors: dict[ConnectorType, ReadOnlyVectorDbConnector] = {
            "local_rag": self.local_rag,
            "chromadb": self.chromadb,
            "qdrant": self.qdrant,
        }

    def list_connectors(self) -> list[VectorDbConnectorInfo]:
        return [c.info() for c in self._connectors.values()]

    def get(self, connector_type: ConnectorType) -> ReadOnlyVectorDbConnector:
        connector = self._connectors.get(connector_type)
        if connector is None:
            raise ValueError(f"Unsupported vector database connector '{connector_type}'.")
        return connector


vector_db_registry = VectorDbConnectorRegistry()
