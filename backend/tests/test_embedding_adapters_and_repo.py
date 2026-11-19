import io
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from app.repositories.embedding_repository import EmbeddingRepository, EmbeddingSpaceRecord
from app.services.embeddings.adapters import (
    ModalityMismatchError,
    embedding_adapter_registry,
)


def _make_png_bytes(rgb: tuple[int, int, int], size: tuple[int, int] = (32, 32)) -> bytes:
    img = Image.new("RGB", size, color=rgb)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_text_hash_adapter_deterministic_and_normalized():
    adapter = embedding_adapter_registry.get("local-text-hash-128", expected_modality="text")
    texts = [
        "Vector similarity search using cosine distance",
        "Cosine similarity between high dimensional vectors",
        "Chocolate cake baking recipe with vanilla frosting",
    ]

    v1 = adapter.embed_texts(texts)
    v2 = adapter.embed_texts(texts)
    assert v1.shape == (3, 128)
    assert np.allclose(v1, v2)

    # Verify unit L2 norms
    norms = np.linalg.norm(v1, axis=1)
    assert np.allclose(norms, 1.0, atol=1e-5)

    # Related vector texts should be closer than baking recipe
    sim_related = float(np.dot(v1[0], v1[1]))
    sim_unrelated = float(np.dot(v1[0], v1[2]))
    assert sim_related > sim_unrelated


def test_tfidf_svd_text_adapter_shape_and_small_corpus():
    adapter = embedding_adapter_registry.get("local-text-tfidf-64", expected_modality="text")
    vecs = adapter.embed_texts(["neural network training", "deep learning gradient descent"])
    assert vecs.shape == (2, 64)
    assert np.allclose(np.linalg.norm(vecs, axis=1), 1.0, atol=1e-5)


def test_image_descriptor_adapter_separates_visual_colors():
    adapter = embedding_adapter_registry.get("local-image-descriptor-96", expected_modality="image")
    red_a = _make_png_bytes((240, 20, 20))
    red_b = _make_png_bytes((230, 30, 25))
    blue = _make_png_bytes((15, 25, 245))

    vecs = adapter.embed_images([red_a, red_b, blue])
    assert vecs.shape == (3, 96)
    assert np.allclose(np.linalg.norm(vecs, axis=1), 1.0, atol=1e-5)

    sim_red = float(np.dot(vecs[0], vecs[1]))
    sim_red_blue = float(np.dot(vecs[0], vecs[2]))
    assert sim_red > sim_red_blue


def test_modality_mismatch_enforced():
    text_adapter = embedding_adapter_registry.get("local-text-hash-128")
    with pytest.raises(ModalityMismatchError):
        text_adapter.embed_images([_make_png_bytes((10, 10, 10))])

    image_adapter = embedding_adapter_registry.get("local-image-descriptor-96")
    with pytest.raises(ModalityMismatchError):
        image_adapter.embed_texts(["hello world"])

    with pytest.raises(ModalityMismatchError):
        embedding_adapter_registry.get("local-text-hash-128", expected_modality="image")


def test_embedding_repository_persists_npy_and_sqlite_metadata(isolated_storage: Path):
    repo = EmbeddingRepository()
    cache_dir = isolated_storage / "cache" / "embeddings"
    vectors = np.array([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]], dtype=np.float32)
    items = [
        {"index": 0, "label": "doc-1", "content": "alpha", "metadata": {"group": "A"}},
        {"index": 1, "label": "doc-2", "content": "beta", "metadata": {"group": "B"}},
    ]

    record = EmbeddingSpaceRecord(
        id="emb-test123",
        name="Test Space",
        modality="text",
        model_id="local-text-hash-128",
        dimensions=3,
        item_count=2,
        metadata_keys=["group"],
        vectors_path=str(cache_dir / "emb-test123.npy"),
        items_path=str(cache_dir / "emb-test123_items.json"),
        source_dataset_id=None,
        is_sample=False,
        created_at=datetime.now(UTC),
    )

    repo.save_space(record, vectors, items)
    assert (cache_dir / "emb-test123.npy").exists()
    assert (cache_dir / "emb-test123_items.json").exists()

    loaded = repo.load_space_payload("emb-test123")
    assert loaded is not None
    loaded_rec, loaded_vecs, loaded_items = loaded
    assert loaded_rec.name == "Test Space"
    assert np.allclose(loaded_vecs, vectors)
    assert len(loaded_items) == 2

    assert repo.delete_space("emb-test123") is True
    assert not (cache_dir / "emb-test123.npy").exists()
    assert repo.get_record("emb-test123") is None
