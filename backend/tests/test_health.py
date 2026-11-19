from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "XakuGraph Backend"
    assert "version" in data


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "modules" in data
    assert "datasets" in data["modules"]
    assert "embeddings" in data["modules"]
    assert "rag" in data["modules"]
    assert "machine_learning" in data["modules"]
    assert "vectors" in data["modules"]
