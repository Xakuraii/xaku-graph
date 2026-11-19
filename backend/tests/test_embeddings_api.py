import io
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _png_bytes(rgb: tuple[int, int, int]) -> bytes:
    img = Image.new("RGB", (32, 32), color=rgb)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_list_models_and_reducers(isolated_storage: Path):
    models_res = client.get("/api/embeddings/models")
    assert models_res.status_code == 200
    models = models_res.json()
    modalities = {m["modality"] for m in models}
    assert {"text", "image"}.issubset(modalities)

    reducers_res = client.get("/api/embeddings/reducers")
    assert reducers_res.status_code == 200
    methods = {r["method"] for r in reducers_res.json()}
    assert methods == {"pca", "tsne", "umap"}


def test_sample_space_pca_tsne_filter_and_point_inspection(isolated_storage: Path):
    spaces_res = client.get("/api/embeddings/spaces")
    assert spaces_res.status_code == 200
    assert any(s["id"] == "sample-ai-concepts-embeddings" for s in spaces_res.json()["spaces"])

    # PCA 2D
    pca_2d = client.post(
        "/api/embeddings/spaces/sample-ai-concepts-embeddings/project",
        json={"method": "pca", "dimensions": 2, "n_clusters": 3},
    )
    assert pca_2d.status_code == 200
    data_2d = pca_2d.json()
    assert data_2d["total_points"] == 18
    assert data_2d["filtered_points"] == 18
    assert len(data_2d["clusters"]) == 3
    assert data_2d["explained_variance_ratio"] is not None
    assert data_2d["points"][0]["z"] is None

    # PCA 3D
    pca_3d = client.post(
        "/api/embeddings/spaces/sample-ai-concepts-embeddings/project",
        json={"method": "pca", "dimensions": 3, "n_clusters": 3},
    )
    assert pca_3d.status_code == 200
    assert pca_3d.json()["points"][0]["z"] is not None

    # t-SNE 2D with metadata filter
    tsne_res = client.post(
        "/api/embeddings/spaces/sample-ai-concepts-embeddings/project",
        json={
            "method": "tsne",
            "dimensions": 2,
            "n_clusters": 3,
            "perplexity": 5.0,
            "filter_key": "category",
            "filter_value": "RAG",
        },
    )
    assert tsne_res.status_code == 200
    tsne_data = tsne_res.json()
    assert tsne_data["total_points"] == 18
    assert tsne_data["filtered_points"] == 6

    # Point inspection computes exact high-dim nearest neighbors
    inspect_res = client.get(
        "/api/embeddings/spaces/sample-ai-concepts-embeddings/points/0?top_k=4"
    )
    assert inspect_res.status_code == 200
    pt = inspect_res.json()
    assert pt["original_dimension"] == 128
    assert pt["similarity_basis"] == "original_high_dimensional_vectors"
    assert len(pt["neighbors"]) == 4
    sims = [n["cosine_similarity"] for n in pt["neighbors"]]
    assert sims == sorted(sims, reverse=True)


def test_create_text_dataset_image_spaces_and_delete(isolated_storage: Path):
    # Create custom text space
    text_res = client.post(
        "/api/embeddings/spaces/text",
        json={
            "name": "Custom Sentences",
            "model_id": "local-text-tfidf-64",
            "items": [
                {"text": "FastAPI async python backend", "label": "S1", "metadata": {"tag": "web"}},
                {"text": "Python web API server", "label": "S2", "metadata": {"tag": "web"}},
                {"text": "Rust cargo crate math", "label": "S3", "metadata": {"tag": "rust"}},
            ],
        },
    )
    assert text_res.status_code == 201
    text_space_id = text_res.json()["id"]
    assert text_res.json()["dimensions"] == 64

    # Reject image model on text endpoint
    mismatch_res = client.post(
        "/api/embeddings/spaces/text",
        json={
            "name": "Bad Modality",
            "model_id": "local-image-descriptor-96",
            "items": [{"text": "one"}, {"text": "two"}],
        },
    )
    assert mismatch_res.status_code == 400

    # Create from built-in Iris dataset
    ds_res = client.post(
        "/api/embeddings/spaces/from-dataset",
        json={
            "dataset_id": "sample-iris-dataset",
            "text_column": "species",
            "metadata_columns": ["species"],
            "model_id": "local-text-hash-128",
            "max_rows": 15,
        },
    )
    assert ds_res.status_code == 201
    assert ds_res.json()["item_count"] == 15
    assert ds_res.json()["source_dataset_id"] == "sample-iris-dataset"

    # Create image embedding space
    img_res = client.post(
        "/api/embeddings/spaces/image",
        files=[
            ("files", ("red1.png", io.BytesIO(_png_bytes((240, 10, 10))), "image/png")),
            ("files", ("red2.png", io.BytesIO(_png_bytes((225, 25, 20))), "image/png")),
            ("files", ("blue.png", io.BytesIO(_png_bytes((10, 20, 240))), "image/png")),
        ],
        data={"name": "Color Patches", "model_id": "local-image-descriptor-96"},
    )
    assert img_res.status_code == 201
    img_space = img_res.json()
    assert img_space["modality"] == "image"
    assert img_space["dimensions"] == 96

    # Inspect point 0 (red1) -> nearest neighbor should be point 1 (red2), not blue
    img_pt = client.get(f"/api/embeddings/spaces/{img_space['id']}/points/0?top_k=2")
    assert img_pt.status_code == 200
    assert img_pt.json()["neighbors"][0]["label"] == "red2.png"

    # Delete user space
    del_res = client.delete(f"/api/embeddings/spaces/{text_space_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Sample space protected
    prot_res = client.delete("/api/embeddings/spaces/sample-ai-concepts-embeddings")
    assert prot_res.status_code == 403
