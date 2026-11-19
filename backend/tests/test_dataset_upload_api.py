import io
from pathlib import Path

import polars as pl
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_list_datasets_includes_sample(isolated_storage: Path):
    response = client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    ids = [d["id"] for d in data["datasets"]]
    assert "sample-iris-dataset" in ids


def test_upload_list_get_and_delete_csv(isolated_storage: Path):
    csv_content = b"feature_a,feature_b,category\n1.0,10,alpha\n2.5,20,beta\n3.0,,alpha\n"
    upload_res = client.post(
        "/api/datasets/upload",
        files={"file": ("metrics.csv", io.BytesIO(csv_content), "text/csv")},
        data={"name": "Custom Metrics CSV"},
    )
    assert upload_res.status_code == 201
    uploaded = upload_res.json()
    dataset_id = uploaded["summary"]["id"]

    assert uploaded["summary"]["name"] == "Custom Metrics CSV"
    assert uploaded["summary"]["row_count"] == 3
    assert uploaded["summary"]["column_count"] == 3
    assert uploaded["summary"]["is_sample"] is False
    assert uploaded["summary"]["source_format"] == "csv"

    # Verify persisted in SQLite & processed Parquet created
    assert (isolated_storage / "processed" / f"{dataset_id}.parquet").exists()

    # Verify list endpoint returns it
    list_res = client.get("/api/datasets")
    assert list_res.status_code == 200
    assert any(d["id"] == dataset_id for d in list_res.json()["datasets"])

    # Verify get endpoint returns it
    get_res = client.get(f"/api/datasets/{dataset_id}")
    assert get_res.status_code == 200
    assert get_res.json()["summary"]["id"] == dataset_id

    # Delete dataset
    del_res = client.delete(f"/api/datasets/{dataset_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    # Confirm 404 after delete and processed parquet removed
    assert not (isolated_storage / "processed" / f"{dataset_id}.parquet").exists()
    assert client.get(f"/api/datasets/{dataset_id}").status_code == 404


def test_upload_excel_xlsx(isolated_storage: Path):
    df = pl.DataFrame({"x": [1, 2, 3], "y": [4.5, 5.5, 6.5]})
    buf = io.BytesIO()
    df.write_excel(buf)
    buf.seek(0)

    res = client.post(
        "/api/datasets/upload",
        files={
            "file": (
                "workbook.xlsx",
                buf,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["summary"]["source_format"] == "xlsx"
    assert data["summary"]["row_count"] == 3


def test_upload_rejects_invalid_extension_and_traversal(isolated_storage: Path):
    bad_ext = client.post(
        "/api/datasets/upload",
        files={"file": ("script.py", io.BytesIO(b"print('hi')"), "text/plain")},
    )
    assert bad_ext.status_code == 400

    traversal = client.post(
        "/api/datasets/upload",
        files={"file": ("../../etc/passwd.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
    )
    assert traversal.status_code == 400

    empty_file = client.post(
        "/api/datasets/upload",
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
    )
    assert empty_file.status_code == 400


def test_upload_enforces_size_limit(isolated_storage: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
    res = client.post(
        "/api/datasets/upload",
        files={"file": ("tiny.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
    )
    assert res.status_code == 413


def test_cannot_delete_sample_dataset(isolated_storage: Path):
    res = client.delete("/api/datasets/sample-iris-dataset")
    assert res.status_code == 403
