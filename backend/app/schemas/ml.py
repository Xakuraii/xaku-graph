from typing import Any, Literal

from pydantic import BaseModel, Field

MlTaskType = Literal["classification", "regression"]
MlAlgorithm = Literal["random_forest", "logistic_regression", "gradient_boosting", "ridge"]
MlRunSource = Literal["sample", "local_training", "imported"]


class MlTrainingPoint(BaseModel):
    step: int = Field(..., ge=1)
    label: str
    train_loss: float
    val_loss: float
    train_score: float | None = None
    val_score: float | None = None


class ClassMetrics(BaseModel):
    label: str
    precision: float
    recall: float
    f1_score: float
    support: int


class ConfusionMatrixData(BaseModel):
    labels: list[str]
    matrix: list[list[int]]
    normalized_matrix: list[list[float]]


class ClassificationMetrics(BaseModel):
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float
    precision_weighted: float
    recall_weighted: float
    f1_weighted: float
    per_class: list[ClassMetrics]
    confusion_matrix: ConfusionMatrixData


class RegressionMetrics(BaseModel):
    mae: float
    mse: float
    rmse: float
    r2: float
    explained_variance: float
    max_error: float


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    permutation_importance: float | None = None
    std: float | None = None


class PredictionRecord(BaseModel):
    index: int
    actual: str | float
    predicted: str | float
    is_correct: bool | None = None
    confidence: float | None = None
    residual: float | None = None
    abs_error: float | None = None
    features: dict[str, str | float | int | None] = Field(default_factory=dict)


class MlRunSummary(BaseModel):
    id: str
    name: str
    task_type: MlTaskType
    algorithm: str
    source: MlRunSource
    dataset_id: str | None = None
    target_column: str
    sample_count: int
    train_count: int
    val_count: int
    primary_metric_name: str
    primary_metric_value: float
    is_sample: bool = False
    created_at: str


class MlRunDetail(MlRunSummary):
    feature_columns: list[str]
    hyperparameters: dict[str, Any] = Field(default_factory=dict)
    training_history: list[MlTrainingPoint] = Field(default_factory=list)
    classification: ClassificationMetrics | None = None
    regression: RegressionMetrics | None = None
    feature_importances: list[FeatureImportanceItem] = Field(default_factory=list)
    predictions: list[PredictionRecord] = Field(default_factory=list)


class MlRunListResponse(BaseModel):
    runs: list[MlRunSummary]
    total: int


class MlTrainRequest(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    dataset_id: str = Field(..., min_length=1)
    task_type: MlTaskType
    target_column: str = Field(..., min_length=1)
    feature_columns: list[str] = Field(default_factory=list)
    algorithm: MlAlgorithm = "random_forest"
    test_size: float = Field(default=0.25, ge=0.1, le=0.5)
    n_steps: int = Field(default=10, ge=3, le=40)
    random_state: int = Field(default=42, ge=0, le=99999)


class MlImportPredictionItem(BaseModel):
    actual: str | float
    predicted: str | float
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    features: dict[str, str | float | int | None] = Field(default_factory=dict)


class MlImportRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    task_type: MlTaskType
    algorithm: str = Field(default="imported_model", min_length=1, max_length=80)
    target_column: str = Field(default="target", min_length=1, max_length=80)
    feature_columns: list[str] = Field(default_factory=list)
    training_history: list[MlTrainingPoint] = Field(default_factory=list)
    predictions: list[MlImportPredictionItem] = Field(default_factory=list, min_length=2)
    feature_importances: list[FeatureImportanceItem] = Field(default_factory=list)
    hyperparameters: dict[str, Any] = Field(default_factory=dict)


class MlDeleteResponse(BaseModel):
    deleted: bool
    run_id: str
    message: str
