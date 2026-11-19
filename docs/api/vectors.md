# Vectors API Specification

Base prefix: `/api/vectors`

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/vectors/similarity` | Compute cosine similarity, cosine distance, angle (deg), Euclidean (L2), Manhattan (L1), dot product, norms, and unit-normalized vectors |
| `POST` | `/api/vectors/inspect` | Inspect vector dimension, L1/L2 norms, min/max/mean/std, zero count, and unit-normalized values |
| `POST` | `/api/vectors/search` | Rank candidate vectors or an existing embedding `space_id` against a query vector |
| `POST` | `/api/vectors/matrix` | Compute pairwise similarity/distance matrix on original vectors plus 2D visual coordinates |

## Mathematical Invariant
All similarity, distance, and ranking endpoints validate finite numeric values and execute strictly on original high-dimensional vectors (`similarity_basis = "original_high_dimensional_vectors"`).
