from typing import Any

import numpy as np
from sklearn.cluster import KMeans


def compute_kmeans_clusters(
    vectors: np.ndarray, n_clusters: int
) -> tuple[list[int], list[dict[str, Any]]]:
    """Cluster original high-dimensional vectors via KMeans and return labels + summaries."""
    n_samples = vectors.shape[0]
    if n_samples == 0 or n_clusters <= 0:
        return [], []

    k = max(1, min(n_clusters, n_samples, 20))
    if k == 1:
        labels = [0] * n_samples
        return labels, [{"cluster_id": 0, "count": n_samples, "percentage": 100.0}]

    model = KMeans(n_clusters=k, n_init="auto", random_state=42)
    raw_labels = model.fit_predict(vectors)
    labels = [int(lbl) for lbl in raw_labels]

    counts: dict[int, int] = {}
    for lbl in labels:
        counts[lbl] = counts.get(lbl, 0) + 1

    summaries = [
        {
            "cluster_id": cid,
            "count": count,
            "percentage": round((count / n_samples) * 100.0, 2),
        }
        for cid, count in sorted(counts.items())
    ]
    return labels, summaries
