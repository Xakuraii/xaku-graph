from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.machine_learning.ml_service import SAMPLE_IRIS_RUN_ID

client = TestClient(app)


def test_list_and_get_ml_runs_api(isolated_storage: Path) -> None:
    list_res = client.get("/api/ml/runs")
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 2

    detail_res = client.get(f"/api/ml/runs/{SAMPLE_IRIS_RUN_ID}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["task_type"] == "classification"
    assert len(detail["training_history"]) == 10
    assert detail["classification"]["accuracy"] > 0.8


def test_train_import_and_delete_ml_run_api(isolated_storage: Path) -> None:
    train_res = client.post(
        "/api/ml/train",
        json={
            "name": "API Iris GBDT",
            "dataset_id": "sample-iris-dataset",
            "task_type": "classification",
            "target_column": "species",
            "algorithm": "gradient_boosting",
            "n_steps": 5,
            "test_size": 0.25,
        },
    )
    assert train_res.status_code == 201
    trained = train_res.json()
    assert trained["source"] == "local_training"
    assert len(trained["training_history"]) == 5

    import_res = client.post(
        "/api/ml/import",
        json={
            "name": "API Imported Regression",
            "task_type": "regression",
            "algorithm": "lightgbm",
            "target_column": "score",
            "predictions": [
                {"actual": 5.0, "predicted": 5.2},
                {"actual": 10.0, "predicted": 9.7},
                {"actual": 15.0, "predicted": 14.9},
            ],
        },
    )
    assert import_res.status_code == 201
    imported = import_res.json()
    assert imported["regression"]["r2"] > 0.95

    del_res = client.delete(f"/api/ml/runs/{trained['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True


def test_ml_api_error_codes(isolated_storage: Path) -> None:
    assert client.delete(f"/api/ml/runs/{SAMPLE_IRIS_RUN_ID}").status_code == 403
    assert client.get("/api/ml/runs/nonexistent-id").status_code == 404
    assert (
        client.post(
            "/api/ml/train",
            json={
                "dataset_id": "missing-ds",
                "task_type": "classification",
                "target_column": "species",
            },
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/ml/train",
            json={
                "dataset_id": "sample-iris-dataset",
                "task_type": "regression",
                "target_column": "species",
                "algorithm": "ridge",
            },
        ).status_code
        == 400
    )
