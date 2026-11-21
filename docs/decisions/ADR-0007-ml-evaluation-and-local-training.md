# ADR-0007: Local ML Evaluation Engine, Built-in Benchmarks, and Imported Run Normalization

- **Status:** Accepted
- **Date:** 2026-11-21
- **Phase:** 6 (ML Visualization)

---

## Context

XakuGraph's ML Visualization module must serve two primary workflows:
1. Exploring machine learning behavior interactively right away without needing external GPU clusters, cloud experiments, or heavy dependencies.
2. Inspecting both **locally trained models** on user-uploaded tabular datasets and **imported evaluation results** produced by external training scripts (PyTorch, Keras, XGBoost, LightGBM).

---

## Decision

1. **Unified `MlRunDetail` Schema (`backend/app/schemas/ml.py`):**
   - Built-in sample runs, locally trained Scikit-Learn models, and imported JSON evaluation runs all normalize into one canonical `MlRunDetail` representation containing `training_history`, task-specific `classification` / `regression` metrics, `feature_importances`, and validation `predictions`.

2. **Epoch/Stage Loss Curves via Staged & Incremental Scikit-Learn Fitting:**
   - Rather than training opaque one-shot models without learning curves, `MlService` logs step-by-step `train_loss`, `val_loss`, and `train_score` / `val_score` across incremental tree counts (`RandomForest*` with `warm_start=True`), staged boosting (`GradientBoosting*`), or epoch-wise `partial_fit` (`SGDClassifier` / `SGDRegressor`).
   - Both native model importances (`feature_importances_` / `abs(coef_)`) and validation `permutation_importance` are computed deterministically.

3. **Zero-Config Evaluation Metric Computation for Imported Predictions:**
   - Users importing external predictions (`actual`, `predicted`, optional `confidence` and `training_history`) do not need to precompute confusion matrices or R²/RMSE manually; `MlService` computes all exact metrics using `sklearn.metrics` and stores runs under `data/cache/ml/` (`ML_CACHE_DIR`).

---

## Consequences

- Every core module across XakuGraph (Datasets, Embeddings, Vectors, RAG, ML) operates 100% locally with built-in offline fixtures plus custom user data support.
- The frontend `MlExplorer` renders all views (`Training & Curves`, `Evaluation & Matrix`, `Features & Predictions`) uniformly across sample, trained, and imported runs.
