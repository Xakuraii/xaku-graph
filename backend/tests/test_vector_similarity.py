from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.similarity.vector_math import VectorMathService

client = TestClient(app)


def test_vector_similarity_orthogonal():
    v1 = [1.0, 0.0]
    v2 = [0.0, 1.0]
    res = VectorMathService.compute_similarity(v1, v2)
    assert res.dimension == 2
    assert abs(res.cosine_similarity - 0.0) < 1e-6
    assert abs(res.cosine_distance - 1.0) < 1e-6
    assert abs(res.angle_degrees - 90.0) < 1e-6
    assert abs(res.dot_product - 0.0) < 1e-6
    assert abs(res.manhattan_distance - 2.0) < 1e-6
    assert abs(res.euclidean_distance - (2.0**0.5)) < 1e-6


def test_vector_similarity_identical():
    v1 = [3.0, 4.0]
    v2 = [3.0, 4.0]
    res = VectorMathService.compute_similarity(v1, v2)
    assert abs(res.cosine_similarity - 1.0) < 1e-6
    assert abs(res.angle_degrees - 0.0) < 1e-6
    assert abs(res.euclidean_distance - 0.0) < 1e-6
    assert abs(res.manhattan_distance - 0.0) < 1e-6
    assert abs(res.dot_product - 25.0) < 1e-6
    assert abs(res.norm_a - 5.0) < 1e-6


def test_vector_similarity_opposite():
    v1 = [1.0, 0.0]
    v2 = [-1.0, 0.0]
    res = VectorMathService.compute_similarity(v1, v2)
    assert abs(res.cosine_similarity - (-1.0)) < 1e-6
    assert abs(res.angle_degrees - 180.0) < 1e-6
    assert abs(res.euclidean_distance - 2.0) < 1e-6


def test_vector_dimension_mismatch():
    v1 = [1.0, 2.0]
    v2 = [1.0, 2.0, 3.0]
    with pytest.raises(ValueError, match="dimension mismatch"):
        VectorMathService.compute_similarity(v1, v2)


def test_vector_inspect_api():
    res = client.post(
        "/api/vectors/inspect",
        json={"label": "SampleVec", "values": [3.0, 0.0, 4.0]},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["dimension"] == 3
    assert abs(data["norm_l2"] - 5.0) < 1e-6
    assert abs(data["norm_l1"] - 7.0) < 1e-6
    assert data["zero_count"] == 1
    assert data["is_unit_normalized"] is False
    assert abs(data["normalized_values"][0] - 0.6) < 1e-6


def test_vector_search_ranking_and_embedding_space(isolated_storage: Path):
    res = client.post(
        "/api/vectors/search",
        json={
            "query_vector": [1.0, 0.0, 0.0],
            "metric": "cosine_similarity",
            "top_k": 3,
            "vectors": [
                {"id": "v1", "label": "Orthogonal", "values": [0.0, 1.0, 0.0]},
                {"id": "v2", "label": "Aligned", "values": [5.0, 0.0, 0.0]},
                {"id": "v3", "label": "Opposite", "values": [-2.0, 0.0, 0.0]},
            ],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["similarity_basis"] == "original_high_dimensional_vectors"
    assert [r["label"] for r in data["results"]] == ["Aligned", "Orthogonal", "Opposite"]

    # Euclidean distance should still rank Opposite (-2) further than Orthogonal (0,1,0)
    euc_res = client.post(
        "/api/vectors/search",
        json={
            "query_vector": [1.0, 0.0, 0.0],
            "metric": "euclidean_distance",
            "top_k": 3,
            "vectors": [
                {"id": "v1", "label": "Orthogonal", "values": [0.0, 1.0, 0.0]},
                {"id": "v2", "label": "Aligned", "values": [2.0, 0.0, 0.0]},
                {"id": "v3", "label": "Opposite", "values": [-2.0, 0.0, 0.0]},
            ],
        },
    )
    assert euc_res.status_code == 200
    assert euc_res.json()["results"][0]["label"] == "Aligned"
    assert euc_res.json()["results"][2]["label"] == "Opposite"

    # Search directly inside sample embedding space (128D)
    space_res = client.post(
        "/api/vectors/search",
        json={
            "query_vector": [0.1] * 128,
            "space_id": "sample-ai-concepts-embeddings",
            "metric": "cosine_similarity",
            "top_k": 3,
        },
    )
    assert space_res.status_code == 200
    assert space_res.json()["total_candidates"] == 18
    assert len(space_res.json()["results"]) == 3


def test_vector_pairwise_matrix_api():
    # 2D direct coordinates
    res_2d = client.post(
        "/api/vectors/matrix",
        json={
            "metric": "cosine_similarity",
            "vectors": [
                {"id": "a", "label": "X-Axis", "values": [1.0, 0.0]},
                {"id": "b", "label": "Y-Axis", "values": [0.0, 1.0]},
            ],
        },
    )
    assert res_2d.status_code == 200
    d2 = res_2d.json()
    assert d2["projection_method"] == "direct_2d"
    assert d2["matrix"] == [[1.0, 0.0], [0.0, 1.0]]

    # 4D -> PCA visual only, while matrix stays exact 4D
    res_4d = client.post(
        "/api/vectors/matrix",
        json={
            "metric": "euclidean_distance",
            "vectors": [
                {"id": "a", "label": "A", "values": [0.0, 0.0, 0.0, 0.0]},
                {"id": "b", "label": "B", "values": [1.0, 1.0, 1.0, 1.0]},
            ],
        },
    )
    assert res_4d.status_code == 200
    d4 = res_4d.json()
    assert d4["projection_method"] == "pca_visual_only"
    assert d4["similarity_basis"] == "original_high_dimensional_vectors"
    assert abs(d4["matrix"][0][1] - 2.0) < 1e-6
