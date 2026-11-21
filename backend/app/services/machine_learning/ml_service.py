import math
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import polars as pl
from sklearn.datasets import load_diabetes, load_iris
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import SGDClassifier, SGDRegressor
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    explained_variance_score,
    log_loss,
    max_error,
    mean_absolute_error,
    mean_squared_error,
    precision_recall_fscore_support,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.core.config import settings
from app.schemas.ml import (
    ClassificationMetrics,
    ClassMetrics,
    ConfusionMatrixData,
    FeatureImportanceItem,
    MlDeleteResponse,
    MlImportRequest,
    MlRunDetail,
    MlRunListResponse,
    MlRunSummary,
    MlTaskType,
    MlTrainingPoint,
    MlTrainRequest,
    PredictionRecord,
    RegressionMetrics,
)
from app.services.datasets.dataset_service import DatasetService, dataset_service

SAMPLE_IRIS_RUN_ID = "sample-ml-iris-classification"
SAMPLE_DIABETES_RUN_ID = "sample-ml-diabetes-regression"
SAMPLE_RUN_IDS = {SAMPLE_IRIS_RUN_ID, SAMPLE_DIABETES_RUN_ID}
MAX_STORED_PREDICTIONS = 250
SAFE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


class MlRunNotFoundError(FileNotFoundError):
    """Raised when a requested ML evaluation run does not exist."""


class MlProtectedRunError(PermissionError):
    """Raised when attempting to delete a built-in sample ML run."""


class MlTrainingError(ValueError):
    """Raised when dataset columns, target, or hyperparameters cannot be trained."""


def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        f = float(val)
    except (TypeError, ValueError):
        return default
    if math.isnan(f) or math.isinf(f):
        return default
    return round(f, 6)


def _clip_probabilities(probs: np.ndarray) -> np.ndarray:
    eps = 1e-7
    clipped = np.clip(probs, eps, 1.0 - eps)
    row_sums = clipped.sum(axis=1, keepdims=True)
    return clipped / np.where(row_sums == 0, 1.0, row_sums)


def _compute_classification_metrics(
    y_true: list[str],
    y_pred: list[str],
) -> ClassificationMetrics:
    labels = sorted(set(y_true) | set(y_pred))
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    row_sums = cm.sum(axis=1, keepdims=True)
    norm_cm = np.divide(
        cm.astype(float),
        np.where(row_sums == 0, 1.0, row_sums),
    )

    acc = _safe_float(accuracy_score(y_true, y_pred))
    p_macro, r_macro, f_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    p_weighted, r_weighted, f_weighted, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )
    p_cls, r_cls, f_cls, sup_cls = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, average=None, zero_division=0
    )

    per_class = [
        ClassMetrics(
            label=str(lbl),
            precision=_safe_float(p_cls[idx]),
            recall=_safe_float(r_cls[idx]),
            f1_score=_safe_float(f_cls[idx]),
            support=int(sup_cls[idx]),
        )
        for idx, lbl in enumerate(labels)
    ]

    return ClassificationMetrics(
        accuracy=acc,
        precision_macro=_safe_float(p_macro),
        recall_macro=_safe_float(r_macro),
        f1_macro=_safe_float(f_macro),
        precision_weighted=_safe_float(p_weighted),
        recall_weighted=_safe_float(r_weighted),
        f1_weighted=_safe_float(f_weighted),
        per_class=per_class,
        confusion_matrix=ConfusionMatrixData(
            labels=[str(lbl) for lbl in labels],
            matrix=[[int(v) for v in row] for row in cm.tolist()],
            normalized_matrix=[[round(float(v), 4) for v in row] for row in norm_cm.tolist()],
        ),
    )


def _compute_regression_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> RegressionMetrics:
    mse = float(mean_squared_error(y_true, y_pred))
    return RegressionMetrics(
        mae=_safe_float(mean_absolute_error(y_true, y_pred)),
        mse=_safe_float(mse),
        rmse=_safe_float(math.sqrt(max(mse, 0.0))),
        r2=_safe_float(r2_score(y_true, y_pred)),
        explained_variance=_safe_float(explained_variance_score(y_true, y_pred)),
        max_error=_safe_float(max_error(y_true, y_pred)),
    )


def _extract_model_importances(
    model: Any,
    feature_names: list[str],
    perm_means: np.ndarray | None = None,
    perm_stds: np.ndarray | None = None,
) -> list[FeatureImportanceItem]:
    raw_imp = getattr(model, "feature_importances_", None)
    if raw_imp is None:
        coef = getattr(model, "coef_", None)
        if coef is not None:
            arr = np.asarray(coef, dtype=float)
            raw_imp = np.mean(np.abs(arr), axis=0) if arr.ndim > 1 else np.abs(arr)
        else:
            raw_imp = np.zeros(len(feature_names), dtype=float)

    raw_arr = np.asarray(raw_imp, dtype=float)
    total = float(np.sum(np.abs(raw_arr)))
    norm_arr = raw_arr / total if total > 0 else raw_arr

    items: list[FeatureImportanceItem] = []
    for idx, feat in enumerate(feature_names):
        perm_val = _safe_float(perm_means[idx]) if perm_means is not None else None
        perm_std = _safe_float(perm_stds[idx]) if perm_stds is not None else None
        items.append(
            FeatureImportanceItem(
                feature=feat,
                importance=_safe_float(norm_arr[idx]),
                permutation_importance=perm_val,
                std=perm_std,
            )
        )
    items.sort(key=lambda item: item.importance, reverse=True)
    return items


class MlService:
    """Service for local ML model training, evaluation diagnostics, and imported runs."""

    def __init__(self, ds_service: DatasetService | None = None) -> None:
        self._dataset_service = ds_service or dataset_service
        self._sample_cache: dict[str, MlRunDetail] = {}

    def _run_file_path(self, run_id: str) -> Path:
        if not SAFE_ID_PATTERN.match(run_id):
            raise MlRunNotFoundError(f"Invalid ML run identifier '{run_id}'.")
        settings.ensure_storage_dirs()
        base = settings.ML_CACHE_DIR.resolve()
        candidate = (base / f"{run_id}.json").resolve()
        if base not in candidate.parents:
            raise MlRunNotFoundError(f"Unsafe ML run path for '{run_id}'.")
        return candidate

    def _build_sample_iris_run(self) -> MlRunDetail:
        iris = load_iris()
        x = np.asarray(iris.data, dtype=float)
        target_names = [str(name) for name in iris.target_names]
        y_idx = np.asarray(iris.target, dtype=int)
        y_labels = np.array([target_names[i] for i in y_idx])
        feature_names = ["sepal_length", "sepal_width", "petal_length", "petal_width"]

        return self._execute_training_run(
            run_id=SAMPLE_IRIS_RUN_ID,
            name="Iris Classification Benchmark (Random Forest)",
            source="sample",
            dataset_id="sample-iris-dataset",
            target_column="species",
            feature_names=feature_names,
            x_raw=x,
            y_raw=y_labels,
            task_type="classification",
            algorithm="random_forest",
            test_size=0.3,
            n_steps=10,
            random_state=42,
            is_sample=True,
        )

    def _build_sample_diabetes_run(self) -> MlRunDetail:
        diabetes = load_diabetes()
        x = np.asarray(diabetes.data, dtype=float)
        y = np.asarray(diabetes.target, dtype=float)
        feature_names = [str(name) for name in diabetes.feature_names]

        return self._execute_training_run(
            run_id=SAMPLE_DIABETES_RUN_ID,
            name="Diabetes Progression Regression (Gradient Boosting)",
            source="sample",
            dataset_id=None,
            target_column="disease_progression",
            feature_names=feature_names,
            x_raw=x,
            y_raw=y,
            task_type="regression",
            algorithm="gradient_boosting",
            test_size=0.25,
            n_steps=10,
            random_state=42,
            is_sample=True,
        )

    def _get_sample_runs(self) -> dict[str, MlRunDetail]:
        if SAMPLE_IRIS_RUN_ID not in self._sample_cache:
            self._sample_cache[SAMPLE_IRIS_RUN_ID] = self._build_sample_iris_run()
        if SAMPLE_DIABETES_RUN_ID not in self._sample_cache:
            self._sample_cache[SAMPLE_DIABETES_RUN_ID] = self._build_sample_diabetes_run()
        return self._sample_cache

    def _to_summary(self, run: MlRunDetail) -> MlRunSummary:
        return MlRunSummary(
            id=run.id,
            name=run.name,
            task_type=run.task_type,
            algorithm=run.algorithm,
            source=run.source,
            dataset_id=run.dataset_id,
            target_column=run.target_column,
            sample_count=run.sample_count,
            train_count=run.train_count,
            val_count=run.val_count,
            primary_metric_name=run.primary_metric_name,
            primary_metric_value=run.primary_metric_value,
            is_sample=run.is_sample,
            created_at=run.created_at,
        )

    def list_runs(self) -> MlRunListResponse:
        samples = [self._to_summary(run) for run in self._get_sample_runs().values()]
        custom: list[MlRunSummary] = []

        settings.ensure_storage_dirs()
        for file_path in sorted(settings.ML_CACHE_DIR.glob("*.json"), reverse=True):
            try:
                detail = MlRunDetail.model_validate_json(file_path.read_text(encoding="utf-8"))
                custom.append(self._to_summary(detail))
            except Exception:
                continue

        custom.sort(key=lambda item: item.created_at, reverse=True)
        combined = custom + samples
        return MlRunListResponse(runs=combined, total=len(combined))

    def get_run(self, run_id: str) -> MlRunDetail:
        samples = self._get_sample_runs()
        if run_id in samples:
            return samples[run_id]

        file_path = self._run_file_path(run_id)
        if not file_path.exists():
            raise MlRunNotFoundError(f"ML run '{run_id}' was not found.")
        try:
            return MlRunDetail.model_validate_json(file_path.read_text(encoding="utf-8"))
        except Exception as err:
            raise MlRunNotFoundError(f"Failed to load ML run '{run_id}': {err}") from err

    def delete_run(self, run_id: str) -> MlDeleteResponse:
        if run_id in SAMPLE_RUN_IDS:
            raise MlProtectedRunError(
                f"Built-in sample ML run '{run_id}' is protected and cannot be deleted."
            )
        file_path = self._run_file_path(run_id)
        if not file_path.exists():
            raise MlRunNotFoundError(f"ML run '{run_id}' was not found.")
        file_path.unlink()
        return MlDeleteResponse(
            deleted=True,
            run_id=run_id,
            message=f"Deleted ML evaluation run '{run_id}'.",
        )

    def _save_run(self, run: MlRunDetail) -> None:
        file_path = self._run_file_path(run.id)
        file_path.write_text(run.model_dump_json(indent=2), encoding="utf-8")

    def _prepare_dataset_arrays(
        self,
        df: pl.DataFrame,
        target_column: str,
        requested_features: list[str],
        task_type: MlTaskType,
    ) -> tuple[list[str], np.ndarray, np.ndarray]:
        if target_column not in df.columns:
            raise MlTrainingError(f"Target column '{target_column}' does not exist in dataset.")

        clean_df = df.filter(pl.col(target_column).is_not_null())
        if clean_df.height < 10:
            raise MlTrainingError("At least 10 non-null target rows are required for ML training.")

        if requested_features:
            missing = [col for col in requested_features if col not in clean_df.columns]
            if missing:
                raise MlTrainingError(f"Feature columns not found: {', '.join(missing)}")
            if target_column in requested_features:
                raise MlTrainingError("Target column cannot also be included in feature columns.")
            feature_cols = requested_features
        else:
            feature_cols = [
                col
                for col in clean_df.columns
                if col != target_column and clean_df[col].dtype.is_numeric()
            ]
            if not feature_cols:
                raise MlTrainingError(
                    "No numeric feature columns found; specify explicit feature columns."
                )

        # Keep numeric features directly; factorize string/categorical columns deterministically
        numeric_arrays: list[np.ndarray] = []
        resolved_features: list[str] = []
        for col in feature_cols:
            series = clean_df[col]
            if series.dtype.is_numeric():
                arr = series.cast(pl.Float64).to_numpy()
                numeric_arrays.append(arr)
                resolved_features.append(col)
            else:
                categories = sorted({str(v) for v in series.drop_nulls().to_list()})
                mapping = {val: float(idx) for idx, val in enumerate(categories)}
                encoded = np.array(
                    [mapping.get(str(v), np.nan) if v is not None else np.nan for v in series],
                    dtype=float,
                )
                numeric_arrays.append(encoded)
                resolved_features.append(col)

        x_mat = np.column_stack(numeric_arrays)
        imputer = SimpleImputer(strategy="median")
        x_imputed = np.asarray(imputer.fit_transform(x_mat), dtype=float)

        target_series = clean_df[target_column]
        if task_type == "regression":
            if not target_series.dtype.is_numeric():
                raise MlTrainingError(
                    f"Regression requires a numeric target column, got '{target_series.dtype}'."
                )
            y_arr = target_series.cast(pl.Float64).to_numpy()
        else:
            y_arr = np.array([str(v) for v in target_series.to_list()])
            if len(set(y_arr.tolist())) < 2:
                raise MlTrainingError("Classification requires at least 2 distinct target classes.")

        return resolved_features, x_imputed, y_arr

    def _fit_classification_with_history(
        self,
        algorithm: str,
        x_train: np.ndarray,
        y_train: np.ndarray,
        x_val: np.ndarray,
        y_val: np.ndarray,
        n_steps: int,
        random_state: int,
    ) -> tuple[Any, np.ndarray, np.ndarray | None, list[MlTrainingPoint], dict[str, Any]]:
        classes = np.unique(y_train)
        history: list[MlTrainingPoint] = []
        hyperparams: dict[str, Any] = {"n_steps": n_steps, "random_state": random_state}

        if algorithm == "random_forest":
            trees_per_step = 5
            model = RandomForestClassifier(
                n_estimators=trees_per_step,
                max_depth=6,
                warm_start=True,
                random_state=random_state,
            )
            for step in range(1, n_steps + 1):
                model.set_params(n_estimators=step * trees_per_step)
                model.fit(x_train, y_train)
                p_tr = _clip_probabilities(model.predict_proba(x_train))
                p_va = _clip_probabilities(model.predict_proba(x_val))
                history.append(
                    MlTrainingPoint(
                        step=step,
                        label=f"{step * trees_per_step} trees",
                        train_loss=_safe_float(log_loss(y_train, p_tr, labels=classes)),
                        val_loss=_safe_float(log_loss(y_val, p_va, labels=classes)),
                        train_score=_safe_float(accuracy_score(y_train, model.predict(x_train))),
                        val_score=_safe_float(accuracy_score(y_val, model.predict(x_val))),
                    )
                )
            hyperparams["n_estimators"] = n_steps * trees_per_step
            hyperparams["max_depth"] = 6

        elif algorithm == "gradient_boosting":
            n_est = n_steps * 5
            model = GradientBoostingClassifier(
                n_estimators=n_est,
                learning_rate=0.08,
                max_depth=3,
                random_state=random_state,
            )
            model.fit(x_train, y_train)
            tr_probs = list(model.staged_predict_proba(x_train))
            va_probs = list(model.staged_predict_proba(x_val))
            sample_indices = np.linspace(0, n_est - 1, num=n_steps, dtype=int)
            for step_idx, est_idx in enumerate(sample_indices, start=1):
                p_tr = _clip_probabilities(tr_probs[est_idx])
                p_va = _clip_probabilities(va_probs[est_idx])
                pred_tr = classes[np.argmax(p_tr, axis=1)]
                pred_va = classes[np.argmax(p_va, axis=1)]
                history.append(
                    MlTrainingPoint(
                        step=step_idx,
                        label=f"Stage {est_idx + 1}",
                        train_loss=_safe_float(log_loss(y_train, p_tr, labels=classes)),
                        val_loss=_safe_float(log_loss(y_val, p_va, labels=classes)),
                        train_score=_safe_float(accuracy_score(y_train, pred_tr)),
                        val_score=_safe_float(accuracy_score(y_val, pred_va)),
                    )
                )
            hyperparams["n_estimators"] = n_est
            hyperparams["learning_rate"] = 0.08

        elif algorithm == "logistic_regression":
            model = SGDClassifier(
                loss="log_loss",
                alpha=0.001,
                learning_rate="optimal",
                random_state=random_state,
            )
            for step in range(1, n_steps + 1):
                model.partial_fit(x_train, y_train, classes=classes)
                p_tr = _clip_probabilities(model.predict_proba(x_train))
                p_va = _clip_probabilities(model.predict_proba(x_val))
                history.append(
                    MlTrainingPoint(
                        step=step,
                        label=f"Epoch {step}",
                        train_loss=_safe_float(log_loss(y_train, p_tr, labels=classes)),
                        val_loss=_safe_float(log_loss(y_val, p_va, labels=classes)),
                        train_score=_safe_float(accuracy_score(y_train, model.predict(x_train))),
                        val_score=_safe_float(accuracy_score(y_val, model.predict(x_val))),
                    )
                )
            hyperparams["alpha"] = 0.001
            hyperparams["loss"] = "log_loss"

        else:
            raise MlTrainingError(
                f"Algorithm '{algorithm}' is not valid for classification. "
                "Use 'random_forest', 'gradient_boosting', or 'logistic_regression'."
            )

        y_pred = model.predict(x_val)
        y_probs = _clip_probabilities(model.predict_proba(x_val))
        return model, y_pred, y_probs, history, hyperparams

    def _fit_regression_with_history(
        self,
        algorithm: str,
        x_train: np.ndarray,
        y_train: np.ndarray,
        x_val: np.ndarray,
        y_val: np.ndarray,
        n_steps: int,
        random_state: int,
    ) -> tuple[Any, np.ndarray, list[MlTrainingPoint], dict[str, Any]]:
        history: list[MlTrainingPoint] = []
        hyperparams: dict[str, Any] = {"n_steps": n_steps, "random_state": random_state}

        if algorithm == "random_forest":
            trees_per_step = 5
            model = RandomForestRegressor(
                n_estimators=trees_per_step,
                max_depth=6,
                warm_start=True,
                random_state=random_state,
            )
            for step in range(1, n_steps + 1):
                model.set_params(n_estimators=step * trees_per_step)
                model.fit(x_train, y_train)
                pred_tr = model.predict(x_train)
                pred_va = model.predict(x_val)
                history.append(
                    MlTrainingPoint(
                        step=step,
                        label=f"{step * trees_per_step} trees",
                        train_loss=_safe_float(mean_squared_error(y_train, pred_tr)),
                        val_loss=_safe_float(mean_squared_error(y_val, pred_va)),
                        train_score=_safe_float(r2_score(y_train, pred_tr)),
                        val_score=_safe_float(r2_score(y_val, pred_va)),
                    )
                )
            hyperparams["n_estimators"] = n_steps * trees_per_step
            hyperparams["max_depth"] = 6

        elif algorithm == "gradient_boosting":
            n_est = n_steps * 5
            model = GradientBoostingRegressor(
                n_estimators=n_est,
                learning_rate=0.08,
                max_depth=3,
                random_state=random_state,
            )
            model.fit(x_train, y_train)
            tr_preds = list(model.staged_predict(x_train))
            va_preds = list(model.staged_predict(x_val))
            sample_indices = np.linspace(0, n_est - 1, num=n_steps, dtype=int)
            for step_idx, est_idx in enumerate(sample_indices, start=1):
                history.append(
                    MlTrainingPoint(
                        step=step_idx,
                        label=f"Stage {est_idx + 1}",
                        train_loss=_safe_float(mean_squared_error(y_train, tr_preds[est_idx])),
                        val_loss=_safe_float(mean_squared_error(y_val, va_preds[est_idx])),
                        train_score=_safe_float(r2_score(y_train, tr_preds[est_idx])),
                        val_score=_safe_float(r2_score(y_val, va_preds[est_idx])),
                    )
                )
            hyperparams["n_estimators"] = n_est
            hyperparams["learning_rate"] = 0.08

        elif algorithm == "ridge":
            model = SGDRegressor(
                penalty="l2",
                alpha=0.001,
                eta0=0.08,
                random_state=random_state,
            )
            for step in range(1, n_steps + 1):
                model.partial_fit(x_train, y_train)
                pred_tr = model.predict(x_train)
                pred_va = model.predict(x_val)
                history.append(
                    MlTrainingPoint(
                        step=step,
                        label=f"Epoch {step}",
                        train_loss=_safe_float(mean_squared_error(y_train, pred_tr)),
                        val_loss=_safe_float(mean_squared_error(y_val, pred_va)),
                        train_score=_safe_float(r2_score(y_train, pred_tr)),
                        val_score=_safe_float(r2_score(y_val, pred_va)),
                    )
                )
            hyperparams["alpha"] = 0.001
            hyperparams["penalty"] = "l2"

        else:
            raise MlTrainingError(
                f"Algorithm '{algorithm}' is not valid for regression. "
                "Use 'random_forest', 'gradient_boosting', or 'ridge'."
            )

        y_pred = model.predict(x_val)
        return model, y_pred, history, hyperparams

    def _execute_training_run(
        self,
        run_id: str,
        name: str,
        source: str,
        dataset_id: str | None,
        target_column: str,
        feature_names: list[str],
        x_raw: np.ndarray,
        y_raw: np.ndarray,
        task_type: MlTaskType,
        algorithm: str,
        test_size: float,
        n_steps: int,
        random_state: int,
        is_sample: bool = False,
    ) -> MlRunDetail:
        stratify = y_raw if task_type == "classification" else None
        try:
            x_train_raw, x_val_raw, y_train, y_val = train_test_split(
                x_raw,
                y_raw,
                test_size=test_size,
                random_state=random_state,
                stratify=stratify,
            )
        except ValueError:
            x_train_raw, x_val_raw, y_train, y_val = train_test_split(
                x_raw,
                y_raw,
                test_size=test_size,
                random_state=random_state,
            )

        scaler = StandardScaler()
        x_train = np.asarray(scaler.fit_transform(x_train_raw), dtype=float)
        x_val = np.asarray(scaler.transform(x_val_raw), dtype=float)

        classification_metrics: ClassificationMetrics | None = None
        regression_metrics: RegressionMetrics | None = None
        predictions: list[PredictionRecord] = []

        if task_type == "classification":
            model, y_pred, y_probs, history, hyperparams = self._fit_classification_with_history(
                algorithm, x_train, y_train, x_val, y_val, n_steps, random_state
            )
            y_true_str = [str(v) for v in y_val.tolist()]
            y_pred_str = [str(v) for v in y_pred.tolist()]
            classification_metrics = _compute_classification_metrics(y_true_str, y_pred_str)
            primary_name = "accuracy"
            primary_value = classification_metrics.accuracy

            for idx in range(min(len(y_true_str), MAX_STORED_PREDICTIONS)):
                feat_map = {
                    feat: _safe_float(x_val_raw[idx, f_idx])
                    for f_idx, feat in enumerate(feature_names)
                }
                conf = _safe_float(float(np.max(y_probs[idx]))) if y_probs is not None else None
                predictions.append(
                    PredictionRecord(
                        index=idx,
                        actual=y_true_str[idx],
                        predicted=y_pred_str[idx],
                        is_correct=y_true_str[idx] == y_pred_str[idx],
                        confidence=conf,
                        features=feat_map,
                    )
                )
        else:
            model, y_pred, history, hyperparams = self._fit_regression_with_history(
                algorithm, x_train, y_train, x_val, y_val, n_steps, random_state
            )
            regression_metrics = _compute_regression_metrics(y_val, y_pred)
            primary_name = "r2"
            primary_value = regression_metrics.r2

            for idx in range(min(len(y_val), MAX_STORED_PREDICTIONS)):
                actual_val = _safe_float(y_val[idx])
                pred_val = _safe_float(y_pred[idx])
                residual = round(actual_val - pred_val, 6)
                feat_map = {
                    feat: _safe_float(x_val_raw[idx, f_idx])
                    for f_idx, feat in enumerate(feature_names)
                }
                predictions.append(
                    PredictionRecord(
                        index=idx,
                        actual=actual_val,
                        predicted=pred_val,
                        residual=residual,
                        abs_error=round(abs(residual), 6),
                        features=feat_map,
                    )
                )

        perm = permutation_importance(
            model,
            x_val,
            y_val,
            n_repeats=5,
            random_state=random_state,
        )
        importances = _extract_model_importances(
            model,
            feature_names,
            perm_means=perm.importances_mean,
            perm_stds=perm.importances_std,
        )

        created_at = datetime.now(UTC).isoformat()
        return MlRunDetail(
            id=run_id,
            name=name,
            task_type=task_type,
            algorithm=algorithm,
            source=source,  # type: ignore[arg-type]
            dataset_id=dataset_id,
            target_column=target_column,
            sample_count=int(x_raw.shape[0]),
            train_count=int(x_train.shape[0]),
            val_count=int(x_val.shape[0]),
            primary_metric_name=primary_name,
            primary_metric_value=primary_value,
            is_sample=is_sample,
            created_at=created_at,
            feature_columns=feature_names,
            hyperparameters=hyperparams,
            training_history=history,
            classification=classification_metrics,
            regression=regression_metrics,
            feature_importances=importances,
            predictions=predictions,
        )

    def train_on_dataset(self, payload: MlTrainRequest) -> MlRunDetail:
        summary, df = self._dataset_service.load_dataframe(payload.dataset_id)
        feature_names, x_mat, y_arr = self._prepare_dataset_arrays(
            df=df,
            target_column=payload.target_column,
            requested_features=payload.feature_columns,
            task_type=payload.task_type,
        )
        run_id = f"ml-train-{uuid.uuid4().hex[:10]}"
        run_name = (
            payload.name.strip()
            if payload.name and payload.name.strip()
            else f"{summary.name} · {payload.algorithm} ({payload.target_column})"
        )
        detail = self._execute_training_run(
            run_id=run_id,
            name=run_name,
            source="local_training",
            dataset_id=payload.dataset_id,
            target_column=payload.target_column,
            feature_names=feature_names,
            x_raw=x_mat,
            y_raw=y_arr,
            task_type=payload.task_type,
            algorithm=payload.algorithm,
            test_size=payload.test_size,
            n_steps=payload.n_steps,
            random_state=payload.random_state,
            is_sample=False,
        )
        self._save_run(detail)
        return detail

    def import_evaluation_run(self, payload: MlImportRequest) -> MlRunDetail:
        run_id = f"ml-import-{uuid.uuid4().hex[:10]}"
        predictions: list[PredictionRecord] = []
        classification_metrics: ClassificationMetrics | None = None
        regression_metrics: RegressionMetrics | None = None

        if payload.task_type == "classification":
            y_true = [str(item.actual) for item in payload.predictions]
            y_pred = [str(item.predicted) for item in payload.predictions]
            classification_metrics = _compute_classification_metrics(y_true, y_pred)
            primary_name = "accuracy"
            primary_value = classification_metrics.accuracy

            for idx, item in enumerate(payload.predictions[:MAX_STORED_PREDICTIONS]):
                predictions.append(
                    PredictionRecord(
                        index=idx,
                        actual=str(item.actual),
                        predicted=str(item.predicted),
                        is_correct=str(item.actual) == str(item.predicted),
                        confidence=item.confidence,
                        features=item.features,
                    )
                )
        else:
            try:
                y_true_arr = np.array(
                    [float(item.actual) for item in payload.predictions], dtype=float
                )
                y_pred_arr = np.array(
                    [float(item.predicted) for item in payload.predictions], dtype=float
                )
            except (TypeError, ValueError) as err:
                raise MlTrainingError(
                    "Regression import requires numeric actual and predicted values."
                ) from err

            regression_metrics = _compute_regression_metrics(y_true_arr, y_pred_arr)
            primary_name = "r2"
            primary_value = regression_metrics.r2

            for idx, item in enumerate(payload.predictions[:MAX_STORED_PREDICTIONS]):
                actual_val = _safe_float(y_true_arr[idx])
                pred_val = _safe_float(y_pred_arr[idx])
                residual = round(actual_val - pred_val, 6)
                predictions.append(
                    PredictionRecord(
                        index=idx,
                        actual=actual_val,
                        predicted=pred_val,
                        residual=residual,
                        abs_error=round(abs(residual), 6),
                        confidence=item.confidence,
                        features=item.features,
                    )
                )

        inferred_features = payload.feature_columns
        if not inferred_features and payload.predictions and payload.predictions[0].features:
            inferred_features = list(payload.predictions[0].features.keys())

        importances = sorted(
            payload.feature_importances, key=lambda item: item.importance, reverse=True
        )
        detail = MlRunDetail(
            id=run_id,
            name=payload.name.strip(),
            task_type=payload.task_type,
            algorithm=payload.algorithm.strip(),
            source="imported",
            dataset_id=None,
            target_column=payload.target_column.strip(),
            sample_count=len(payload.predictions),
            train_count=0,
            val_count=len(payload.predictions),
            primary_metric_name=primary_name,
            primary_metric_value=primary_value,
            is_sample=False,
            created_at=datetime.now(UTC).isoformat(),
            feature_columns=inferred_features,
            hyperparameters=payload.hyperparameters,
            training_history=payload.training_history,
            classification=classification_metrics,
            regression=regression_metrics,
            feature_importances=importances,
            predictions=predictions,
        )
        self._save_run(detail)
        return detail


ml_service = MlService()
