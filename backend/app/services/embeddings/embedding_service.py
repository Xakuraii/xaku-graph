import io
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.core.config import settings
from app.repositories.embedding_repository import (
    EmbeddingRepository,
    EmbeddingSpaceRecord,
    embedding_repository,
)
from app.schemas.embedding import (
    ClusterSummary,
    CreateDatasetEmbeddingSpaceRequest,
    CreateTextEmbeddingSpaceRequest,
    EmbeddingModelSchema,
    EmbeddingSpaceDeleteResponse,
    EmbeddingSpaceListResponse,
    EmbeddingSpaceSummary,
    NearestNeighborItem,
    PointInspectionResponse,
    ProjectedPoint,
    ProjectionRequest,
    ProjectionResponse,
    ReducerInfoSchema,
)
from app.services.datasets.dataset_service import dataset_service
from app.services.datasets.loaders import sanitize_filename, validate_safe_path
from app.services.embeddings.adapters import (
    EmbeddingAdapterRegistry,
    EmbeddingModality,
    embedding_adapter_registry,
)
from app.services.visualization.clustering import compute_kmeans_clusters
from app.services.visualization.reducers import ReducerRegistry, reducer_registry

SAMPLE_EMBEDDING_SPACE_ID = "sample-ai-concepts-embeddings"

SAMPLE_AI_CONCEPTS: list[dict[str, Any]] = [
    {
        "label": "Polars DataFrame",
        "text": "Polars is a fast columnar DataFrame engine built in Rust for tabular analytics and Parquet files.",
        "metadata": {"category": "Data Engineering", "level": "Intermediate"},
    },
    {
        "label": "Apache Parquet",
        "text": "Apache Parquet stores columnar tabular datasets efficiently with compression and schema metadata.",
        "metadata": {"category": "Data Engineering", "level": "Beginner"},
    },
    {
        "label": "Outlier Detection",
        "text": "Interquartile range fences and Z-scores detect extreme anomalous values in numeric columns.",
        "metadata": {"category": "Data Engineering", "level": "Beginner"},
    },
    {
        "label": "Missing Value Audit",
        "text": "Data quality checks measure null percentages, completeness ratios, and duplicate rows before training.",
        "metadata": {"category": "Data Engineering", "level": "Beginner"},
    },
    {
        "label": "Correlation Heatmap",
        "text": "Pearson linear correlation and Spearman rank correlation quantify relationships between numeric features.",
        "metadata": {"category": "Data Engineering", "level": "Intermediate"},
    },
    {
        "label": "Feature Normalization",
        "text": "Standard scaling and min-max normalization align numeric tabular feature ranges prior to modeling.",
        "metadata": {"category": "Data Engineering", "level": "Beginner"},
    },
    {
        "label": "Transformer Attention",
        "text": "Self-attention neural networks weigh token relationships across sequences using query key value projections.",
        "metadata": {"category": "Machine Learning", "level": "Advanced"},
    },
    {
        "label": "Gradient Descent",
        "text": "Stochastic gradient descent iteratively updates neural network weights to minimize training loss.",
        "metadata": {"category": "Machine Learning", "level": "Beginner"},
    },
    {
        "label": "Confusion Matrix",
        "text": "Classification evaluation tracks true positives, false positives, precision, recall, and F1 score.",
        "metadata": {"category": "Machine Learning", "level": "Intermediate"},
    },
    {
        "label": "Cross-Entropy Loss",
        "text": "Cross-entropy loss measures divergence between predicted class probabilities and ground truth labels.",
        "metadata": {"category": "Machine Learning", "level": "Intermediate"},
    },
    {
        "label": "Principal Component Analysis",
        "text": "PCA projects high-dimensional numerical features onto orthogonal axes capturing maximum variance.",
        "metadata": {"category": "Machine Learning", "level": "Intermediate"},
    },
    {
        "label": "K-Means Clustering",
        "text": "Unsupervised K-Means partitions high-dimensional vector representations into k centroid clusters.",
        "metadata": {"category": "Machine Learning", "level": "Beginner"},
    },
    {
        "label": "Cosine Similarity",
        "text": "Cosine similarity measures the angle between two high-dimensional embedding vectors via dot product.",
        "metadata": {"category": "RAG & Vectors", "level": "Beginner"},
    },
    {
        "label": "Document Chunking",
        "text": "RAG pipelines split long documents into overlapping text chunks with source metadata for retrieval.",
        "metadata": {"category": "RAG & Vectors", "level": "Intermediate"},
    },
    {
        "label": "Vector Database Index",
        "text": "ChromaDB and Qdrant index dense embedding vectors for fast approximate nearest neighbor similarity search.",
        "metadata": {"category": "RAG & Vectors", "level": "Intermediate"},
    },
    {
        "label": "Retrieval Ranking",
        "text": "Semantic retrieval ranks candidate document chunks by cosine similarity score against the query vector.",
        "metadata": {"category": "RAG & Vectors", "level": "Intermediate"},
    },
    {
        "label": "Dense Text Embeddings",
        "text": "Sentence transformer encoders map natural language sentences into dense semantic vector spaces.",
        "metadata": {"category": "RAG & Vectors", "level": "Intermediate"},
    },
    {
        "label": "Euclidean L2 Distance",
        "text": "Euclidean distance computes straight-line geometric distance between original high-dimensional vectors.",
        "metadata": {"category": "RAG & Vectors", "level": "Beginner"},
    },
]


class EmbeddingSpaceNotFoundError(FileNotFoundError):
    """Raised when an embedding space ID does not exist."""


class EmbeddingSpaceProtectedError(PermissionError):
    """Raised when attempting to delete the built-in sample embedding space."""


def _record_to_summary(record: EmbeddingSpaceRecord) -> EmbeddingSpaceSummary:
    return EmbeddingSpaceSummary(
        id=record.id,
        name=record.name,
        modality=record.modality,
        model_id=record.model_id,
        dimensions=record.dimensions,
        item_count=record.item_count,
        metadata_keys=record.metadata_keys,
        source_dataset_id=record.source_dataset_id,
        is_sample=record.is_sample,
        created_at=record.created_at,
    )


def _snippet(text: str, max_len: int = 120) -> str:
    clean = " ".join(text.split())
    if len(clean) <= max_len:
        return clean
    return clean[: max_len - 1] + "…"


class EmbeddingService:
    def __init__(
        self,
        repository: EmbeddingRepository | None = None,
        adapters: EmbeddingAdapterRegistry | None = None,
        reducers: ReducerRegistry | None = None,
    ) -> None:
        self._repo = repository or embedding_repository
        self._adapters = adapters or embedding_adapter_registry
        self._reducers = reducers or reducer_registry

    def list_models(self, modality: EmbeddingModality | None = None) -> list[EmbeddingModelSchema]:
        return [
            EmbeddingModelSchema(**info.__dict__) for info in self._adapters.list_models(modality)
        ]

    def list_reducers(self) -> list[ReducerInfoSchema]:
        return [ReducerInfoSchema(**info.__dict__) for info in self._reducers.list_reducers()]

    def ensure_sample_space(self) -> EmbeddingSpaceSummary:
        existing = self._repo.load_space_payload(SAMPLE_EMBEDDING_SPACE_ID)
        if existing is not None:
            return _record_to_summary(existing[0])

        settings.ensure_storage_dirs()
        adapter = self._adapters.get("local-text-hash-128", expected_modality="text")
        texts = [item["text"] for item in SAMPLE_AI_CONCEPTS]
        vectors = adapter.embed_texts(texts)

        items = [
            {
                "index": idx,
                "label": item["label"],
                "content": item["text"],
                "snippet": _snippet(item["text"]),
                "metadata": item["metadata"],
            }
            for idx, item in enumerate(SAMPLE_AI_CONCEPTS)
        ]

        vectors_path = validate_safe_path(
            settings.EMBEDDING_CACHE_DIR,
            settings.EMBEDDING_CACHE_DIR / f"{SAMPLE_EMBEDDING_SPACE_ID}.npy",
        )
        items_path = validate_safe_path(
            settings.EMBEDDING_CACHE_DIR,
            settings.EMBEDDING_CACHE_DIR / f"{SAMPLE_EMBEDDING_SPACE_ID}_items.json",
        )

        record = EmbeddingSpaceRecord(
            id=SAMPLE_EMBEDDING_SPACE_ID,
            name="AI & Data Concepts Sample (18 texts)",
            modality="text",
            model_id=adapter.model_id,
            dimensions=int(vectors.shape[1]),
            item_count=len(items),
            metadata_keys=["category", "level"],
            vectors_path=str(vectors_path),
            items_path=str(items_path),
            source_dataset_id=None,
            is_sample=True,
            created_at=datetime.now(UTC),
        )
        self._repo.save_space(record, vectors, items)
        return _record_to_summary(record)

    def list_spaces(self) -> EmbeddingSpaceListResponse:
        self.ensure_sample_space()
        records = self._repo.list_records()
        summaries = [_record_to_summary(r) for r in records]
        return EmbeddingSpaceListResponse(spaces=summaries, total=len(summaries))

    def create_text_space(self, request: CreateTextEmbeddingSpaceRequest) -> EmbeddingSpaceSummary:
        if len(request.items) > settings.MAX_EMBEDDING_ITEMS:
            raise ValueError(
                f"Too many items ({len(request.items)}). Max allowed is {settings.MAX_EMBEDDING_ITEMS}."
            )

        adapter = self._adapters.get(request.model_id, expected_modality="text")
        texts = [item.text for item in request.items]
        vectors = adapter.embed_texts(texts)

        metadata_keys_set: set[str] = set()
        items: list[dict[str, Any]] = []
        for idx, item in enumerate(request.items):
            clean_meta = {str(k): v for k, v in item.metadata.items()}
            metadata_keys_set.update(clean_meta.keys())
            label = item.label.strip() if item.label and item.label.strip() else f"Item {idx + 1}"
            items.append(
                {
                    "index": idx,
                    "label": label,
                    "content": item.text,
                    "snippet": _snippet(item.text),
                    "metadata": clean_meta,
                }
            )

        return self._persist_space(
            name=request.name.strip(),
            modality="text",
            model_id=adapter.model_id,
            vectors=vectors,
            items=items,
            metadata_keys=sorted(metadata_keys_set),
            source_dataset_id=None,
        )

    def create_text_space_from_dataset(
        self, request: CreateDatasetEmbeddingSpaceRequest
    ) -> EmbeddingSpaceSummary:
        summary, df = dataset_service.load_dataframe(request.dataset_id)
        if request.text_column not in df.columns:
            raise ValueError(
                f"Column '{request.text_column}' does not exist in dataset '{request.dataset_id}'."
            )

        for meta_col in request.metadata_columns:
            if meta_col not in df.columns:
                raise ValueError(
                    f"Metadata column '{meta_col}' does not exist in dataset '{request.dataset_id}'."
                )

        max_rows = min(request.max_rows, settings.MAX_EMBEDDING_ITEMS)
        subset = df.head(max_rows)
        if subset.height < 2:
            raise ValueError("Dataset must have at least 2 rows to create an embedding space.")

        adapter = self._adapters.get(request.model_id, expected_modality="text")
        rows = subset.to_dicts()
        texts = [
            "" if row[request.text_column] is None else str(row[request.text_column])
            for row in rows
        ]
        vectors = adapter.embed_texts(texts)

        items: list[dict[str, Any]] = []
        for idx, (text_val, row) in enumerate(zip(texts, rows, strict=True)):
            meta = {
                col: (None if row[col] is None else str(row[col]))
                for col in request.metadata_columns
            }
            items.append(
                {
                    "index": idx,
                    "label": f"Row {idx + 1}",
                    "content": text_val,
                    "snippet": _snippet(text_val),
                    "metadata": meta,
                }
            )

        space_name = (
            request.name.strip()
            if request.name and request.name.strip()
            else f"{summary.name} · {request.text_column}"
        )
        return self._persist_space(
            name=space_name,
            modality="text",
            model_id=adapter.model_id,
            vectors=vectors,
            items=items,
            metadata_keys=list(request.metadata_columns),
            source_dataset_id=summary.id,
        )

    def create_image_space(
        self,
        name: str,
        model_id: str,
        image_files: list[tuple[str, bytes]],
    ) -> EmbeddingSpaceSummary:
        if len(image_files) < 2:
            raise ValueError("At least 2 images are required to create an image embedding space.")
        if len(image_files) > settings.MAX_EMBEDDING_ITEMS:
            raise ValueError(f"Maximum {settings.MAX_EMBEDDING_ITEMS} images supported per space.")

        adapter = self._adapters.get(model_id, expected_modality="image")
        raw_bytes_list: list[bytes] = []
        items: list[dict[str, Any]] = []

        for idx, (filename, raw_bytes) in enumerate(image_files):
            safe_name = sanitize_filename(filename)
            suffix = Path(safe_name).suffix.lower()
            if suffix not in settings.ALLOWED_IMAGE_EXTENSIONS:
                allowed = ", ".join(settings.ALLOWED_IMAGE_EXTENSIONS)
                raise ValueError(
                    f"Unsupported image format '{suffix}'. Supported formats: {allowed}"
                )

            try:
                with Image.open(io.BytesIO(raw_bytes)) as img:
                    width, height = img.size
                    img_format = img.format or suffix.lstrip(".").upper()
                    mode = img.mode
            except Exception as err:
                raise ValueError(f"Invalid image '{safe_name}': {err}") from err

            raw_bytes_list.append(raw_bytes)
            items.append(
                {
                    "index": idx,
                    "label": safe_name,
                    "content": f"{safe_name} ({width}x{height} {img_format}, {mode})",
                    "snippet": f"{width}x{height} {img_format} · {round(len(raw_bytes) / 1024, 1)} KB",
                    "metadata": {
                        "format": img_format,
                        "mode": mode,
                        "resolution": f"{width}x{height}",
                    },
                }
            )

        vectors = adapter.embed_images(raw_bytes_list)
        return self._persist_space(
            name=name.strip() or "Local Image Embeddings",
            modality="image",
            model_id=adapter.model_id,
            vectors=vectors,
            items=items,
            metadata_keys=["format", "mode", "resolution"],
            source_dataset_id=None,
        )

    def delete_space(self, space_id: str) -> EmbeddingSpaceDeleteResponse:
        if space_id == SAMPLE_EMBEDDING_SPACE_ID:
            raise EmbeddingSpaceProtectedError("Cannot delete the built-in sample embedding space.")

        record = self._repo.get_record(space_id)
        if record is None:
            raise EmbeddingSpaceNotFoundError(f"Embedding space '{space_id}' not found.")

        self._repo.delete_space(space_id)
        return EmbeddingSpaceDeleteResponse(
            id=space_id,
            deleted=True,
            message=f"Embedding space '{record.name}' deleted successfully.",
        )

    def project_space(self, space_id: str, request: ProjectionRequest) -> ProjectionResponse:
        if space_id == SAMPLE_EMBEDDING_SPACE_ID:
            self.ensure_sample_space()

        payload = self._repo.load_space_payload(space_id)
        if payload is None:
            raise EmbeddingSpaceNotFoundError(f"Embedding space '{space_id}' not found.")

        record, vectors, items = payload
        reducer = self._reducers.get(request.method)
        reduction = reducer.reduce(
            vectors=vectors,
            n_components=request.dimensions,
            perplexity=request.perplexity,
        )

        cluster_labels, cluster_summaries = compute_kmeans_clusters(vectors, request.n_clusters)

        points: list[ProjectedPoint] = []
        for idx, item in enumerate(items):
            meta = item.get("metadata", {})
            if request.filter_key and request.filter_value:
                val = meta.get(request.filter_key)
                if val is None or request.filter_value.lower() not in str(val).lower():
                    continue

            coord = reduction.coordinates[idx]
            points.append(
                ProjectedPoint(
                    index=idx,
                    label=item["label"],
                    snippet=item.get("snippet", _snippet(item.get("content", ""))),
                    x=round(float(coord[0]), 5),
                    y=round(float(coord[1]), 5),
                    z=round(float(coord[2]), 5) if request.dimensions == 3 else None,
                    cluster=cluster_labels[idx] if cluster_labels else None,
                    metadata=meta,
                )
            )

        return ProjectionResponse(
            space=_record_to_summary(record),
            method=request.method,
            dimensions=request.dimensions,
            points=points,
            clusters=[ClusterSummary(**c) for c in cluster_summaries],
            explained_variance_ratio=reduction.explained_variance_ratio,
            total_points=len(items),
            filtered_points=len(points),
            effective_params=reduction.effective_params,
        )

    def inspect_point(
        self, space_id: str, point_index: int, top_k: int = 5
    ) -> PointInspectionResponse:
        """Inspect original item & compute exact nearest neighbors on original high-dim vectors."""
        if space_id == SAMPLE_EMBEDDING_SPACE_ID:
            self.ensure_sample_space()

        payload = self._repo.load_space_payload(space_id)
        if payload is None:
            raise EmbeddingSpaceNotFoundError(f"Embedding space '{space_id}' not found.")

        record, vectors, items = payload
        if point_index < 0 or point_index >= len(items):
            raise ValueError(
                f"Point index {point_index} out of bounds for space with {len(items)} items."
            )

        target_vec = vectors[point_index].astype(np.float64)
        target_norm = float(np.linalg.norm(target_vec))
        all_vecs = vectors.astype(np.float64)
        all_norms = np.linalg.norm(all_vecs, axis=1)

        # Compute exact cosine similarity & Euclidean distance in original high-dimensional space
        dots = all_vecs @ target_vec
        denom = np.where((all_norms * target_norm) > 1e-12, all_norms * target_norm, 1.0)
        cos_sims = np.clip(dots / denom, -1.0, 1.0)
        euc_dists = np.linalg.norm(all_vecs - target_vec, axis=1)

        # Exclude self and take top_k highest cosine similarity
        candidate_indices = [i for i in range(len(items)) if i != point_index]
        candidate_indices.sort(key=lambda i: float(cos_sims[i]), reverse=True)
        top_indices = candidate_indices[: max(1, min(top_k, 20))]

        neighbors = [
            NearestNeighborItem(
                index=i,
                label=items[i]["label"],
                snippet=items[i].get("snippet", _snippet(items[i].get("content", ""))),
                cosine_similarity=round(float(cos_sims[i]), 5),
                euclidean_distance=round(float(euc_dists[i]), 5),
                metadata=items[i].get("metadata", {}),
            )
            for i in top_indices
        ]

        item = items[point_index]
        preview_count = min(32, int(target_vec.size))
        return PointInspectionResponse(
            space_id=record.id,
            index=point_index,
            label=item["label"],
            content=item.get("content", ""),
            modality=record.modality,
            metadata=item.get("metadata", {}),
            original_dimension=int(target_vec.size),
            vector_norm=round(target_norm, 5),
            vector_min=round(float(np.min(target_vec)), 5),
            vector_max=round(float(np.max(target_vec)), 5),
            vector_mean=round(float(np.mean(target_vec)), 5),
            vector_preview=[round(float(v), 5) for v in target_vec[:preview_count]],
            neighbors=neighbors,
            similarity_basis="original_high_dimensional_vectors",
        )

    def _persist_space(
        self,
        name: str,
        modality: EmbeddingModality,
        model_id: str,
        vectors: np.ndarray,
        items: list[dict[str, Any]],
        metadata_keys: list[str],
        source_dataset_id: str | None,
    ) -> EmbeddingSpaceSummary:
        settings.ensure_storage_dirs()
        space_id = f"emb-{uuid.uuid4().hex[:12]}"
        vectors_path = validate_safe_path(
            settings.EMBEDDING_CACHE_DIR, settings.EMBEDDING_CACHE_DIR / f"{space_id}.npy"
        )
        items_path = validate_safe_path(
            settings.EMBEDDING_CACHE_DIR, settings.EMBEDDING_CACHE_DIR / f"{space_id}_items.json"
        )

        record = EmbeddingSpaceRecord(
            id=space_id,
            name=name,
            modality=modality,
            model_id=model_id,
            dimensions=int(vectors.shape[1]),
            item_count=len(items),
            metadata_keys=metadata_keys,
            vectors_path=str(vectors_path),
            items_path=str(items_path),
            source_dataset_id=source_dataset_id,
            is_sample=False,
            created_at=datetime.now(UTC),
        )
        self._repo.save_space(record, vectors, items)
        return _record_to_summary(record)


embedding_service = EmbeddingService()
