import numpy as np

from app.schemas.vector import VectorSimilarityResponse


class VectorMathService:
    @staticmethod
    def compute_similarity(v1: list[float], v2: list[float]) -> VectorSimilarityResponse:
        a = np.array(v1, dtype=np.float64)
        b = np.array(v2, dtype=np.float64)

        if a.shape != b.shape:
            raise ValueError(f"Vector dimension mismatch: {a.shape[0]} vs {b.shape[0]}")
        if a.size == 0:
            raise ValueError("Vectors cannot be empty")

        norm_a = float(np.linalg.norm(a))
        norm_b = float(np.linalg.norm(b))

        dot = float(np.dot(a, b))
        euclidean = float(np.linalg.norm(a - b))

        if norm_a < 1e-12 or norm_b < 1e-12:
            cos_sim = 0.0
            norm_a_vec = a.tolist()
            norm_b_vec = b.tolist()
        else:
            cos_sim = float(np.clip(dot / (norm_a * norm_b), -1.0, 1.0))
            norm_a_vec = (a / norm_a).tolist()
            norm_b_vec = (b / norm_b).tolist()

        return VectorSimilarityResponse(
            cosine_similarity=cos_sim,
            euclidean_distance=euclidean,
            dot_product=dot,
            norm_a=norm_a,
            norm_b=norm_b,
            normalized_a=norm_a_vec,
            normalized_b=norm_b_vec,
        )
