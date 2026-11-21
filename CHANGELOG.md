# Changelog

All notable changes to XakuGraph will be documented in this file.

## [0.7.0] - Phase 7 Desktop Application (Tauri 2)

### Added
- Windows Tauri 2 backend lifecycle manager (`desktop/src-tauri/src/backend_manager.rs`) with automatic packaged FastAPI startup (`CREATE_NO_WINDOW`), port `8000` reuse detection, exit shutdown cleanup, and Tauri IPC commands (`get_core_version`, `get_desktop_runtime_info`, `ensure_backend_running`, `compute_vector_similarity_native`).
- Backend CORS allowlist support for Tauri WebView2 origins (`http://tauri.localhost`, `https://tauri.localhost`) in `backend/app/core/config.py`.
- Frontend `desktopBridge` (`web/src/services/desktopBridge.ts`) and dynamic `resolveApiBase()` routing in `apiClient.ts`, plus automatic backend recovery in `App.tsx`, manual `Reconnect` action in `Header.tsx`, and Vitest coverage (`DesktopBridge.test.tsx`).
- Updated `desktop/src-tauri/tauri.conf.json`, `scripts/dev.ps1 -Desktop`, `scripts/check.ps1`, and `scripts/test.ps1` to verify both `xakugraph-core` and `xakugraph-desktop`.
- Desktop shell architecture guide (`docs/architecture/desktop-shell.md`) and `ADR-0008`.

## [0.6.0] - Phase 6 ML Visualization

### Added
- `MlService` (`backend/app/services/machine_learning/ml_service.py`) with two offline sample runs (`sample-ml-iris-classification`, `sample-ml-diabetes-regression`), local Scikit-Learn training on any uploaded dataset (`random_forest`, `gradient_boosting`, `logistic_regression`, `ridge`), validation permutation feature importance, and external JSON evaluation import persisted under `data/cache/ml/`.
- ML REST API (`/api/ml/*`): run listing, run inspection, local training, external evaluation import, and custom run deletion.
- Interactive React ML Visualization module (`MlExplorer`, `useMlExplorer`, `MlRunBar`, `MlRunBuilder`, `MlTrainingPanel`, `MlEvaluationPanel`, `MlExplainabilityPanel`) supporting training/validation loss & score curves, raw/normalized confusion matrix heatmaps, per-class precision/recall/F1 charts, regression Predicted vs Actual + Residual plots, feature importance comparison, and filterable misclassification error drilling.
- ADR-0007 and ML API documentation (`docs/api/ml.md`), completing all 5 core XakuGraph studio modules.

## [0.5.0] - Phase 5 RAG Visualization

### Added
- Read-only `VectorDbConnectorRegistry` with built-in `LocalRagStoreConnector` (`sample-xakugraph-rag-docs` 5-document knowledge base + isolated `data/cache/rag/` chunking sandboxes) and lazy optional `ChromaReadOnlyConnector` / `QdrantReadOnlyConnector`.
- RAG REST API (`/api/rag/*`): connector discovery, local & external read-only collection inspection, local sliding-window chunk sandbox CRUD, retrieval playground search (`cosine_similarity`, `euclidean_distance`, `dot_product`, metadata filtering), and side-by-side strategy comparison (`overlap_count`, `jaccard_overlap`, rank deltas).
- Interactive React RAG Visualization module (`RagExplorer`, `useRagExplorer`, `RagCollectionBar`, `RagSandboxBuilder`, `RagDocumentsPanel`, `RagPlaygroundPanel`, `RagComparePanel`) with chunk/vector inspection, score ranking charts, and side-by-side comparison tables.
- ADR-0006 and RAG API documentation (`docs/api/rag.md`).

## [0.4.0] - Phase 4 Vector & Similarity Explorer

### Added
- Native Rust primitives in `xakugraph-core`: `manhattan_distance`, `cosine_distance`, `SimilarityMetric`, `NeighborRank`, and `rank_nearest_neighbors`.
- Backend vector inspection, nearest-neighbor ranking (`POST /api/vectors/search` supporting custom vectors and cached embedding spaces), and pairwise matrix + 2D visual space endpoints (`POST /api/vectors/matrix`).
- Enhanced React Vector Explorer (`useVectorExplorer`, `VectorPairwisePanel`, `VectorRankingPanel`, `VectorSpacePanel`) with component-wise comparison charts, multi-metric neighbor ranking tables, pairwise heatmaps, and 2D vector space plots.
- ADR-0005 and Vectors API documentation (`docs/api/vectors.md`).

## [0.3.0] - Phase 3 Embedding Visualization

### Added
- Extensible `EmbeddingAdapterRegistry` with modality enforcement (`text` vs `image`), built-in deterministic local encoders (`local-text-hash-128`, `local-text-tfidf-64`, `local-image-descriptor-96`), and optional neural adapters (`all-MiniLM-L6-v2`, `clip-ViT-B-32`).
- Dedicated local embedding cache (`EmbeddingRepository`) storing vector matrices as `.npy` files under `data/cache/embeddings/` with SQLite metadata.
- Dimensionality reduction registry (`PCA`, `t-SNE`, optional `UMAP`) and high-dimensional K-Means clustering.
- Embeddings REST API (`/api/embeddings/*`) supporting text spaces, dataset-column embedding, local image spaces, 2D/3D projections, metadata filtering, and exact high-dimensional nearest-neighbor inspection.
- Interactive React Embedding Visualization module (`EmbeddingExplorer`, `useEmbeddingExplorer`, `EmbeddingSpaceBar`, `EmbeddingSpaceBuilder`, `ProjectionControlsBar`, `EmbeddingProjectionPlot`, `EmbeddingPointInspector`) with 2D/3D Plotly scatter plots and click-to-inspect high-dim neighbors.
- ADR-0004 and Embeddings API documentation (`docs/api/embeddings.md`).

## [0.2.0] - Phase 2 Dataset Visualization

### Added
- Dataset loader adapter registry supporting `.csv`, `.json`, `.jsonl`, `.parquet`, and `.xlsx` (`fastexcel` / Polars `calamine`).
- Persistent SQLite metadata repository (`DatasetRepository`) and local Parquet processed cache.
- Secure multipart file upload (`POST /api/datasets/upload`), dataset listing (`GET /api/datasets`), inspection (`GET /api/datasets/{id}`), and deletion (`DELETE /api/datasets/{id}`) with path traversal guards and streaming size limits.
- Statistical analysis engine (`DatasetAnalysisService`) with paginated/searchable/filterable/sortable row queries, histogram & box-plot distributions, missing-value & duplicate quality checks, IQR & Z-score outlier detection, and Pearson/Spearman correlation matrices.
- Interactive React frontend powered by `plotly.js-dist-min` (`PlotlyChart`, `useDatasetExplorer`, `DatasetManagerBar`, `DatasetRowsTable`, `DatasetDistributionsPanel`, `DatasetQualityPanel`, `DatasetCorrelationsPanel`) and live Studio Dashboard registry integration.
- Automated unit and API tests covering loaders, path security, upload limits, numerical analysis, and React visualization tabs.
- ADR-0003 and Datasets API documentation (`docs/api/datasets.md`).

## [0.1.0] - Phase 0 & Phase 1 Foundation

### Added
- Monorepo structure with `web/`, `desktop/`, `backend/`, `crates/`, and `scripts/`.
- Rust core crate `xakugraph-core` providing vector math primitives (cosine similarity, euclidean distance, dot product, normalization) with unit test coverage.
- Python 3.12 FastAPI processing engine configured with Polars, NumPy, SciPy, Scikit-learn, and Pydantic V2 schemas.
- Dataset inspection service and API endpoint serving the Iris benchmark sample dataset.
- High-dimensional vector similarity endpoint with mathematical validation.
- Shared React 18 + TypeScript + Vite frontend with Tailwind CSS, dark/light theme support, and sidebar navigation across all 5 planned studio modules.
- Desktop shell configuration with Tauri 2 linked directly to the shared frontend.
- Cross-platform PowerShell and Bash automation scripts (`dev`, `build`, `test`, `check`).
- GitHub Actions CI workflow for Rust, Python, and TypeScript validation.
- Developer documentation, architecture specifications, ADR-0001, and ADR-0002.
