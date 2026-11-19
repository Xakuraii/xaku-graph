# ADR-0004: Embedding Model Adapters, Caching, and Projection Separation

## Status
Accepted

## Context
Phase 3 requires supporting text, sentence, document, and image embeddings alongside PCA, t-SNE, and UMAP 2D/3D visualizations while maintaining:
1. Fast local-first execution without mandatory multi-gigabyte model downloads or cloud APIs.
2. Strict separation between text and image modalities.
3. Zero large vector arrays stored inside SQLite.
4. Exact similarity and clustering computed strictly on original high-dimensional vectors rather than 2D/3D projected coordinates.

## Decision
1. **Modality-Aware Adapter Registry (`EmbeddingAdapterRegistry`):** Provide deterministic lightweight local encoders out of the box (`local-text-hash-128`, `local-text-tfidf-64`, `local-image-descriptor-96`) alongside optional neural adapters (`all-MiniLM-L6-v2`, `clip-ViT-B-32`) activated when `.[ml]` extras are installed. Enforces `ModalityMismatchError` when text and image modalities are mixed.
2. **Binary `.npy` Cache + SQLite Metadata (`EmbeddingRepository`):** Persist embedding matrices as `.npy` files under `data/cache/embeddings/` and item metadata JSON alongside lightweight SQLite rows.
3. **Strict Projection Boundary:** `PCA`, `t-SNE`, and optional `UMAP` coordinates are returned solely for 2D/3D rendering. K-Means clustering and point nearest-neighbor ranking (`inspect_point`) operate exclusively on the original high-dimensional vectors.

## Consequences
- Zero-network, zero-download deterministic startup in CI and local development.
- Clean extensibility for additional HuggingFace, ONNX, or local neural encoders without changing service or API contracts.
