import pytest

from app.services.similarity.vector_math import VectorMathService


def test_vector_similarity_orthogonal():
    v1 = [1.0, 0.0]
    v2 = [0.0, 1.0]
    res = VectorMathService.compute_similarity(v1, v2)
    assert abs(res.cosine_similarity - 0.0) < 1e-6
    assert abs(res.dot_product - 0.0) < 1e-6
    assert abs(res.euclidean_distance - (2.0**0.5)) < 1e-6


def test_vector_similarity_identical():
    v1 = [3.0, 4.0]
    v2 = [3.0, 4.0]
    res = VectorMathService.compute_similarity(v1, v2)
    assert abs(res.cosine_similarity - 1.0) < 1e-6
    assert abs(res.euclidean_distance - 0.0) < 1e-6
    assert abs(res.dot_product - 25.0) < 1e-6
    assert abs(res.norm_a - 5.0) < 1e-6


def test_vector_similarity_opposite():
    v1 = [1.0, 0.0]
    v2 = [-1.0, 0.0]
    res = VectorMathService.compute_similarity(v1, v2)
    assert abs(res.cosine_similarity - (-1.0)) < 1e-6
    assert abs(res.euclidean_distance - 2.0) < 1e-6


def test_vector_dimension_mismatch():
    v1 = [1.0, 2.0]
    v2 = [1.0, 2.0, 3.0]
    with pytest.raises(ValueError, match="dimension mismatch"):
        VectorMathService.compute_similarity(v1, v2)
