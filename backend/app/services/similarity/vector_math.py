import math

import numpy as np
from sklearn.decomposition import PCA

from app.repositories.embedding_repository import embedding_repository
from app.schemas.vector import (
    DistanceMetric,
    NamedVectorInput,
    RankedVectorItem,
    VectorCoordinate2D,
    VectorInspectResponse,
    VectorMatrixResponse,
    VectorSearchResponse,
    VectorSimilarityResponse,
)
from app.services.embeddings.embedding_service import (
    SAMPLE_EMBEDDING_SPACE_ID,
    embedding_service,
)


def _to_finite_array(values: list[float], label: str = "Vector") -> np.ndarray:
    if len(values) == 0:
        raise ValueError(f"{label} cannot be empty")
    arr = np.asarray(values, dtype=np.float64)
    if not np.all(np.isfinite(arr)):
        raise ValueError(f"{label} contains NaN or infinite values")
    return arr


class VectorMathService:
    @staticmethod
    def compute_similarity(v1: list[float], v2: list[float]) -> VectorSimilarityResponse:
        a = _to_finite_array(v1, "Vector A")
        b = _to_finite_array(v2, "Vector B")

        if a.shape != b.shape:
            raise ValueError(f"Vector dimension mismatch: {a.shape[0]} vs {b.shape[0]}")

        norm_a = float(np.linalg.norm(a))
        norm_b = float(np.linalg.norm(b))
        dot = float(np.dot(a, b))
        euclidean = float(np.linalg.norm(a - b))
        manhattan = float(np.sum(np.abs(a - b)))

        if norm_a < 1e-12 or norm_b < 1e-12:
            cos_sim = 0.0
            cos_dist = 1.0
            angle_deg = 90.0
            norm_a_vec = a.tolist()
            norm_b_vec = b.tolist()
        else:
            cos_sim = float(np.clip(dot / (norm_a * norm_b), -1.0, 1.0))
            cos_dist = 1.0 - cos_sim
            angle_deg = float(math.degrees(math.acos(cos_sim)))
            norm_a_vec = (a / norm_a).tolist()
            norm_b_vec = (b / norm_b).tolist()

        return VectorSimilarityResponse(
            dimension=int(a.shape[0]),
            cosine_similarity=cos_sim,
            cosine_distance=cos_dist,
            euclidean_distance=euclidean,
            manhattan_distance=manhattan,
            dot_product=dot,
            angle_degrees=angle_deg,
            norm_a=norm_a,
            norm_b=norm_b,
            normalized_a=norm_a_vec,
            normalized_b=norm_b_vec,
        )

    @staticmethod
    def inspect_vector(values: list[float], label: str = "Vector") -> VectorInspectResponse:
        arr = _to_finite_array(values, label)
        norm_l2 = float(np.linalg.norm(arr))
        norm_l1 = float(np.sum(np.abs(arr)))
        normalized = (arr / norm_l2).tolist() if norm_l2 >= 1e-12 else arr.tolist()

        return VectorInspectResponse(
            label=label,
            dimension=int(arr.size),
            norm_l2=norm_l2,
            norm_l1=norm_l1,
            min_value=float(np.min(arr)),
            max_value=float(np.max(arr)),
            mean_value=float(np.mean(arr)),
            std_value=float(np.std(arr)),
            zero_count=int(np.sum(np.abs(arr) < 1e-12)),
            is_unit_normalized=abs(norm_l2 - 1.0) < 1e-4,
            values=arr.tolist(),
            normalized_values=normalized,
        )

    @staticmethod
    def search_neighbors(
        query_vector: list[float],
        vectors: list[NamedVectorInput],
        space_id: str | None = None,
        metric: DistanceMetric = "cosine_similarity",
        top_k: int = 10,
    ) -> VectorSearchResponse:
        query = _to_finite_array(query_vector, "Query vector")
        q_dim = int(query.size)
        q_norm = float(np.linalg.norm(query))

        candidates: list[tuple[str, str, np.ndarray]] = []
        if space_id:
            if space_id == SAMPLE_EMBEDDING_SPACE_ID:
                embedding_service.ensure_sample_space()
            payload = embedding_repository.load_space_payload(space_id)
            if payload is None:
                raise ValueError(f"Embedding space '{space_id}' not found")
            _, mat, items = payload
            for idx, item in enumerate(items):
                candidates.append((str(idx), item["label"], mat[idx].astype(np.float64)))
        else:
            for item in vectors:
                arr = _to_finite_array(item.values, f"Vector '{item.id}'")
                candidates.append((item.id, item.label or item.id, arr))

        if not candidates:
            raise ValueError("Provide either candidate vectors or a valid embedding space_id.")

        scored: list[dict] = []
        for cid, clabel, vec in candidates:
            if vec.size != q_dim:
                raise ValueError(
                    f"Dimension mismatch for '{clabel}': expected {q_dim}, found {vec.size}"
                )
            v_norm = float(np.linalg.norm(vec))
            dot = float(np.dot(query, vec))
            euc = float(np.linalg.norm(query - vec))
            man = float(np.sum(np.abs(query - vec)))
            cos = (
                float(np.clip(dot / (q_norm * v_norm), -1.0, 1.0))
                if q_norm >= 1e-12 and v_norm >= 1e-12
                else 0.0
            )

            if metric == "cosine_similarity":
                score = cos
            elif metric == "euclidean_distance":
                score = euc
            elif metric == "dot_product":
                score = dot
            else:
                score = man

            scored.append(
                {
                    "id": cid,
                    "label": clabel,
                    "score": score,
                    "cosine_similarity": cos,
                    "euclidean_distance": euc,
                    "dot_product": dot,
                    "manhattan_distance": man,
                }
            )

        higher_is_better = metric in ("cosine_similarity", "dot_product")
        scored.sort(key=lambda r: r["score"], reverse=higher_is_better)
        top_items = scored[:top_k]

        results = [
            RankedVectorItem(
                rank=idx + 1,
                id=item["id"],
                label=item["label"],
                score=round(item["score"], 6),
                cosine_similarity=round(item["cosine_similarity"], 6),
                euclidean_distance=round(item["euclidean_distance"], 6),
                dot_product=round(item["dot_product"], 6),
                manhattan_distance=round(item["manhattan_distance"], 6),
            )
            for idx, item in enumerate(top_items)
        ]

        return VectorSearchResponse(
            metric=metric,
            query_dimension=q_dim,
            total_candidates=len(candidates),
            results=results,
            similarity_basis="original_high_dimensional_vectors",
        )

    @staticmethod
    def compute_pairwise_matrix(
        vectors: list[NamedVectorInput],
        metric: DistanceMetric = "cosine_similarity",
    ) -> VectorMatrixResponse:
        arrays = [_to_finite_array(v.values, f"Vector '{v.id}'") for v in vectors]
        dim = int(arrays[0].size)
        for v, arr in zip(vectors, arrays, strict=True):
            if arr.size != dim:
                raise ValueError(
                    f"Vector '{v.id}' dimension ({arr.size}) does not match expected ({dim})"
                )

        mat = np.vstack(arrays)
        n = len(vectors)
        norms = np.linalg.norm(mat, axis=1)
        matrix_out: list[list[float]] = [[0.0 for _ in range(n)] for _ in range(n)]

        for i in range(n):
            for j in range(i, n):
                if metric == "cosine_similarity":
                    if i == j:
                        val = 1.0 if norms[i] >= 1e-12 else 0.0
                    elif norms[i] >= 1e-12 and norms[j] >= 1e-12:
                        val = float(
                            np.clip(np.dot(mat[i], mat[j]) / (norms[i] * norms[j]), -1.0, 1.0)
                        )
                    else:
                        val = 0.0
                elif metric == "euclidean_distance":
                    val = float(np.linalg.norm(mat[i] - mat[j]))
                elif metric == "dot_product":
                    val = float(np.dot(mat[i], mat[j]))
                else:
                    val = float(np.sum(np.abs(mat[i] - mat[j])))

                rounded = round(val, 6)
                matrix_out[i][j] = rounded
                matrix_out[j][i] = rounded

        # Compute 2D coordinates strictly for visual plotting (never used for similarity math)
        if dim == 1:
            coords = [(float(mat[i, 0]), 0.0) for i in range(n)]
            proj_method = "direct_1d"
        elif dim == 2:
            coords = [(float(mat[i, 0]), float(mat[i, 1])) for i in range(n)]
            proj_method = "direct_2d"
        else:
            pca = PCA(n_components=2, random_state=42)
            projected = pca.fit_transform(mat)
            coords = [(float(projected[i, 0]), float(projected[i, 1])) for i in range(n)]
            proj_method = "pca_visual_only"

        coords_out = [
            VectorCoordinate2D(
                id=vectors[i].id,
                label=vectors[i].label or vectors[i].id,
                x=round(coords[i][0], 5),
                y=round(coords[i][1], 5),
                norm_l2=round(float(norms[i]), 5),
            )
            for i in range(n)
        ]

        return VectorMatrixResponse(
            metric=metric,
            original_dimension=dim,
            labels=[v.label or v.id for v in vectors],
            matrix=matrix_out,
            coordinates_2d=coords_out,
            projection_method=proj_method,
            similarity_basis="original_high_dimensional_vectors",
        )
