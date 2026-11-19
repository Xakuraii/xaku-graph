# ADR-0005: Vector Similarity & High-Dimensional Calculation Invariants

## Status
Accepted

## Context
Phase 4 provides a general-purpose mathematical vector exploration environment alongside visual plots of vector spaces.

## Decision
1. **Parity Between Rust Core and Python Engine:** Both `xakugraph-core` (`crates/xakugraph-core/src/vector.rs`) and `VectorMathService` (`backend/app/services/similarity/vector_math.py`) implement `cosine_similarity`, `cosine_distance`, `euclidean_distance`, `manhattan_distance`, `dot_product`, `normalize`, and batch nearest-neighbor ranking.
2. **Strict Separation of Projection & Similarity:** When computing pairwise vector space matrices (`POST /api/vectors/matrix`), the similarity/distance matrix is computed strictly on the original N-dimensional vectors, while 2D coordinates use `direct_2d` (for 2D inputs) or `pca_visual_only` (for >2D inputs) solely for plotting.

## Consequences
- Identical mathematical guarantees across Rust and Python layers.
- Zero distortion of similarity rankings or distance heatmaps by dimensionality reduction.
