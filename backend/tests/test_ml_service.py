import io
from pathlib import Path

import pytest

from app.schemas.ml import (
    FeatureImportanceItem,
    MlImportPredictionItem,
    MlImportRequest,
    MlTrainingPoint,
    MlTrainRequest,
)
from app.services.datasets.dataset_service import DatasetService
from app.services.machine_learning.ml_service import (
    SAMPLE_DIABETES_RUN_ID,
    SAMPLE_IRIS_RUN_ID,
    MlProtectedRunError,
    MlRunNotFoundError,
    MlService,
    MlTrainingError,
)


def test_list_and_get_built_in_sample_runs(isolated_storage: Path) -> None:
    svc = MlService()
    runs = svc.list_runs()

    assert runs.total == 2
    run_ids = {r.id for r in runs.runs}
    assert SAMPLE_IRIS_RUN_ID in run_ids
    assert SAMPLE_DIABETES_RUN_ID in run_ids

    iris = svc.get_run(SAMPLE_IRIS_RUN_ID)
    assert iris.task_type == "classification"
    assert iris.classification is not None
    assert iris.classification.accuracy > 0.8
    assert len(iris.classification.confusion_matrix.labels) == 3
    assert len(iris.training_history) == 10
    assert len(iris.feature_importances) == 4
    assert iris.feature_importances[0].permutation_importance is not None
    assert len(iris.predictions) == iris.val_count

    diabetes = svc.get_run(SAMPLE_DIABETES_RUN_ID)
    assert diabetes.task_type == "regression"
    assert diabetes.regression is not None
    assert diabetes.regression.rmse > 0
    assert len(diabetes.training_history) == 10
    assert diabetes.predictions[0].residual is not None


def test_train_on_sample_iris_dataset_and_delete(isolated_storage: Path) -> None:
    svc = MlService()
    trained = svc.train_on_dataset(
        MlTrainRequest(
            name="Iris Logistic Epoch Test",
            dataset_id="sample-iris-dataset",
            task_type="classification",
            target_column="species",
            algorithm="logistic_regression",
            n_steps=6,
            test_size=0.3,
        )
    )

    assert trained.id.startswith("ml-train-")
    assert trained.source == "local_training"
    assert len(trained.training_history) == 6
    assert trained.classification is not None
    assert trained.classification.accuracy >= 0.5

    listed = svc.list_runs()
    assert any(r.id == trained.id for r in listed.runs)

    deleted = svc.delete_run(trained.id)
    assert deleted.deleted is True

    with pytest.raises(MlRunNotFoundError):
        svc.get_run(trained.id)


def test_train_regression_on_uploaded_csv(isolated_storage: Path) -> None:
    ds_svc = DatasetService()
    csv_bytes = (
        "x1,x2,y\n" + "\n".join(f"{i},{i * 2},{3 * i + 2}" for i in range(1, 31)) + "\n"
    ).encode("utf-8")
    uploaded = ds_svc.upload_dataset(
        filename="linear_reg.csv",
        file_stream=io.BytesIO(csv_bytes),
        display_name="Linear Regression Test",
    )

    ml_svc = MlService(ds_service=ds_svc)
    run = ml_svc.train_on_dataset(
        MlTrainRequest(
            dataset_id=uploaded.summary.id,
            task_type="regression",
            target_column="y",
            feature_columns=["x1", "x2"],
            algorithm="ridge",
            n_steps=8,
            test_size=0.25,
        )
    )

    assert run.regression is not None
    assert run.regression.r2 > 0.7
    assert len(run.feature_importances) == 2


def test_import_classification_and_regression_runs(isolated_storage: Path) -> None:
    svc = MlService()

    imported_cls = svc.import_evaluation_run(
        MlImportRequest(
            name="PyTorch Imported Classifier",
            task_type="classification",
            algorithm="pytorch_mlp",
            target_column="label",
            training_history=[
                MlTrainingPoint(step=1, label="Epoch 1", train_loss=0.8, val_loss=0.85),
                MlTrainingPoint(step=2, label="Epoch 2", train_loss=0.4, val_loss=0.48),
            ],
            predictions=[
                MlImportPredictionItem(
                    actual="cat", predicted="cat", confidence=0.92, features={"f1": 1.2}
                ),
                MlImportPredictionItem(
                    actual="dog", predicted="cat", confidence=0.55, features={"f1": 0.4}
                ),
                MlImportPredictionItem(
                    actual="dog", predicted="dog", confidence=0.88, features={"f1": -0.7}
                ),
            ],
            feature_importances=[FeatureImportanceItem(feature="f1", importance=1.0)],
        )
    )
    assert imported_cls.source == "imported"
    assert imported_cls.classification is not None
    assert imported_cls.classification.accuracy == pytest.approx(2 / 3, rel=1e-4)

    imported_reg = svc.import_evaluation_run(
        MlImportRequest(
            name="XGBoost Imported Regressor",
            task_type="regression",
            algorithm="xgboost",
            target_column="price",
            predictions=[
                MlImportPredictionItem(actual=10.0, predicted=11.0),
                MlImportPredictionItem(actual=20.0, predicted=19.0),
                MlImportPredictionItem(actual=30.0, predicted=30.0),
            ],
        )
    )
    assert imported_reg.regression is not None
    assert imported_reg.regression.mae == pytest.approx(2 / 3, rel=1e-4)


def test_ml_protection_and_validation_guards(isolated_storage: Path) -> None:
    svc = MlService()

    with pytest.raises(MlProtectedRunError):
        svc.delete_run(SAMPLE_IRIS_RUN_ID)

    with pytest.raises(MlRunNotFoundError):
        svc.get_run("../etc/passwd")

    with pytest.raises(MlTrainingError):
        svc.train_on_dataset(
            MlTrainRequest(
                dataset_id="sample-iris-dataset",
                task_type="regression",
                target_column="species",
                algorithm="ridge",
            )
        )
