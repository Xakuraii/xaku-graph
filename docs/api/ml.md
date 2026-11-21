# Machine Learning Visualization & Evaluation API (`/api/ml`)

All ML training and evaluation runs execute locally inside the FastAPI backend (`backend/app/api/routes/ml.py`). Custom runs and imported evaluation artifacts are persisted under `data/cache/ml/` (`ML_CACHE_DIR`).

---

## Endpoints

### `GET /api/ml/runs`
Lists all available ML runs (`MlRunListResponse`), combining locally trained or imported runs with two built-in offline benchmark samples:
- `sample-ml-iris-classification` (Random Forest multi-class classification on Iris)
- `sample-ml-diabetes-regression` (Gradient Boosting regression on Diabetes progression)

### `GET /api/ml/runs/{run_id}`
Returns full evaluation details (`MlRunDetail`):
- `training_history`: per-step `train_loss`, `val_loss`, `train_score`, and `val_score`
- `classification`: `accuracy`, macro/weighted `precision`, `recall`, `f1_score`, per-class breakdown, and raw + row-normalized `confusion_matrix`
- `regression`: `mae`, `mse`, `rmse`, `r2`, `explained_variance`, and `max_error`
- `feature_importances`: normalized model feature importance paired with validation `permutation_importance`
- `predictions`: validation rows with `actual`, `predicted`, `is_correct` / `confidence` (classification) or `residual` / `abs_error` (regression), and feature snapshots

### `POST /api/ml/train`
Trains and evaluates a Scikit-Learn model locally on any XakuGraph dataset (`dataset_id`) and returns `201 Created` with the persisted `MlRunDetail`.

- **Request body (`MlTrainRequest`)**:
  - `dataset_id`: dataset identifier from `/api/datasets`
  - `task_type`: `"classification"` | `"regression"`
  - `target_column`: column name to predict
  - `feature_columns`: optional explicit list of feature columns (defaults to all remaining numeric columns)
  - `algorithm`: `"random_forest"` | `"gradient_boosting"` | `"logistic_regression"` | `"ridge"`
  - `test_size`: validation split fraction (`0.1`–`0.5`)
  - `n_steps`: staged estimators / epochs (`3`–`40`)

### `POST /api/ml/import`
Imports external model evaluation predictions and optional training history (`MlImportRequest`) from PyTorch, Keras, XGBoost, LightGBM, or custom pipelines. XakuGraph validates the payload and computes confusion matrices, precision/recall/F1, or regression metrics & residuals locally. Returns `201 Created`.

### `DELETE /api/ml/runs/{run_id}`
Deletes a user-trained or imported ML run from `data/cache/ml/`. Built-in sample runs return `403 Forbidden`.
