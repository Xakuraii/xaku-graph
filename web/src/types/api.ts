export interface ModuleStatus {
  name: string;
  phase: number;
  status: 'foundation_ready' | 'planned' | 'in_development' | 'completed';
  description: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  modules: Record<string, ModuleStatus>;
  system_info: {
    python_version: string;
    platform: string;
    debug: boolean;
  };
}

export interface ColumnDetail {
  name: string;
  dtype: string;
  null_count: number;
  null_percentage?: number;
  unique_count: number;
  min_value?: number | string | null;
  max_value?: number | string | null;
  mean_value?: number | null;
  median_value?: number | null;
  std_value?: number | null;
  q1_value?: number | null;
  q3_value?: number | null;
}

export interface DatasetSummary {
  id: string;
  name: string;
  row_count: number;
  column_count: number;
  columns: string[];
  memory_bytes: number;
  is_sample: boolean;
  source_format: string;
  file_size_bytes?: number | null;
  created_at?: string | null;
}

export interface DatasetInspectionResponse {
  summary: DatasetSummary;
  columns: ColumnDetail[];
  preview_rows: Record<string, unknown>[];
  metadata: Record<string, unknown>;
}

export interface DatasetListResponse {
  datasets: DatasetSummary[];
  total: number;
}

export interface DatasetDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

export interface DatasetRowsQuery {
  search?: string;
  filter_col?: string;
  filter_value?: string;
  sort_by?: string;
  sort_desc?: boolean;
  offset?: number;
  limit?: number;
}

export interface DatasetRowsResponse {
  dataset_id: string;
  total_rows: number;
  filtered_rows: number;
  offset: number;
  limit: number;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  lower_fence: number;
  upper_fence: number;
  outlier_count: number;
  sample_outliers: number[];
}

export interface CategoryCount {
  value: string;
  count: number;
  percentage: number;
}

export interface ColumnDistribution {
  column: string;
  dtype: string;
  kind: 'numeric' | 'categorical';
  total_count: number;
  non_null_count: number;
  histogram?: HistogramBin[] | null;
  boxplot?: BoxPlotStats | null;
  categories?: CategoryCount[] | null;
}

export interface DatasetDistributionsResponse {
  dataset_id: string;
  bins: number;
  distributions: ColumnDistribution[];
}

export interface ColumnQualityMetric {
  column: string;
  dtype: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  is_constant: boolean;
  iqr_outlier_count: number;
  zscore_outlier_count: number;
  outlier_percentage: number;
}

export interface DatasetQualityResponse {
  dataset_id: string;
  row_count: number;
  column_count: number;
  total_cells: number;
  total_missing_cells: number;
  completeness_percentage: number;
  duplicate_row_count: number;
  columns: ColumnQualityMetric[];
}

export type CorrelationMethod = 'pearson' | 'spearman';

export interface CorrelationMatrixResponse {
  dataset_id: string;
  method: CorrelationMethod;
  columns: string[];
  matrix: (number | null)[][];
}

export type DistanceMetric =
  | 'cosine_similarity'
  | 'euclidean_distance'
  | 'dot_product'
  | 'manhattan_distance';

export interface VectorSimilarityRequest {
  vector_a: number[];
  vector_b: number[];
}

export interface VectorSimilarityResponse {
  dimension?: number;
  cosine_similarity: number;
  cosine_distance?: number;
  euclidean_distance: number;
  manhattan_distance?: number;
  dot_product: number;
  angle_degrees?: number;
  norm_a: number;
  norm_b: number;
  normalized_a?: number[];
  normalized_b?: number[];
}

export interface VectorInspectRequest {
  label?: string;
  values: number[];
}

export interface VectorInspectResponse {
  label: string;
  dimension: number;
  norm_l2: number;
  norm_l1: number;
  min_value: number;
  max_value: number;
  mean_value: number;
  std_value: number;
  zero_count: number;
  is_unit_normalized: boolean;
  values: number[];
  normalized_values: number[];
}

export interface NamedVectorInput {
  id: string;
  label?: string;
  values: number[];
}

export interface VectorSearchRequest {
  query_vector: number[];
  vectors?: NamedVectorInput[];
  space_id?: string;
  metric?: DistanceMetric;
  top_k?: number;
}

export interface RankedVectorItem {
  rank: number;
  id: string;
  label: string;
  score: number;
  cosine_similarity: number;
  euclidean_distance: number;
  dot_product: number;
  manhattan_distance: number;
}

export interface VectorSearchResponse {
  metric: DistanceMetric;
  query_dimension: number;
  total_candidates: number;
  results: RankedVectorItem[];
  similarity_basis: string;
}

export interface VectorMatrixRequest {
  vectors: NamedVectorInput[];
  metric?: DistanceMetric;
}

export interface VectorCoordinate2D {
  id: string;
  label: string;
  x: number;
  y: number;
  norm_l2: number;
}

export interface VectorMatrixResponse {
  metric: DistanceMetric;
  original_dimension: number;
  labels: string[];
  matrix: number[][];
  coordinates_2d: VectorCoordinate2D[];
  projection_method: string;
  similarity_basis: string;
}

export type ConnectorType = 'local_rag' | 'chromadb' | 'qdrant';
export type RagSimilarityMetric = 'cosine_similarity' | 'euclidean_distance' | 'dot_product';

export interface VectorDbConnectorInfo {
  connector_type: ConnectorType;
  name: string;
  description: string;
  available: boolean;
  read_only: boolean;
  connection_fields: string[];
  install_hint?: string | null;
}

export interface ExternalConnectionConfig {
  connector_type: 'chromadb' | 'qdrant';
  path?: string;
  host?: string;
  port?: number;
  collection_name?: string;
}

export interface RagCollectionSummary {
  id: string;
  name: string;
  connector_type: ConnectorType;
  document_count: number;
  chunk_count: number;
  dimension: number;
  model_id?: string | null;
  read_only: boolean;
  is_sample: boolean;
  metadata_keys: string[];
  created_at?: string | null;
}

export interface RagCollectionListResponse {
  collections: RagCollectionSummary[];
  total: number;
}

export interface RagDocumentSummary {
  doc_id: string;
  title: string;
  source: string;
  chunk_count: number;
  total_chars: number;
  metadata: Record<string, unknown>;
}

export interface RagChunkDetail {
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  chunk_index: number;
  content: string;
  char_count: number;
  char_start?: number | null;
  char_end?: number | null;
  metadata: Record<string, unknown>;
  embedding_dimension: number;
  embedding_norm?: number | null;
  embedding_preview: number[];
}

export interface RagCollectionInspectResponse {
  collection: RagCollectionSummary;
  documents: RagDocumentSummary[];
  chunks: RagChunkDetail[];
  total_chunks: number;
  offset: number;
  limit: number;
}

export interface RagDocumentInput {
  title: string;
  source?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateRagSandboxRequest {
  name: string;
  documents: RagDocumentInput[];
  chunk_size: number;
  chunk_overlap: number;
  model_id: string;
}

export interface RagDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

export interface RagSearchRequest {
  collection_id: string;
  query: string;
  top_k?: number;
  metric?: RagSimilarityMetric;
  model_id?: string;
  filter_key?: string;
  filter_value?: string;
  connection_config?: ExternalConnectionConfig;
}

export interface RagRetrievedChunk {
  rank: number;
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  chunk_index: number;
  content: string;
  score: number;
  cosine_similarity: number;
  euclidean_distance: number;
  dot_product: number;
  metadata: Record<string, unknown>;
  embedding_preview: number[];
}

export interface RagSearchResponse {
  collection_id: string;
  query: string;
  metric: RagSimilarityMetric;
  model_id: string;
  query_vector_dimension: number;
  query_vector_preview: number[];
  total_candidates: number;
  results: RagRetrievedChunk[];
  similarity_basis: string;
}

export interface RagCompareStrategy {
  label: string;
  collection_id: string;
  metric: RagSimilarityMetric;
  model_id?: string;
  top_k: number;
}

export interface RagCompareRequest {
  query: string;
  strategy_a: RagCompareStrategy;
  strategy_b: RagCompareStrategy;
}

export interface RagChunkComparisonItem {
  chunk_id: string;
  doc_title: string;
  chunk_index: number;
  rank_a?: number | null;
  rank_b?: number | null;
  rank_delta?: number | null;
  score_a?: number | null;
  score_b?: number | null;
  status: 'both' | 'only_a' | 'only_b';
}

export interface RagCompareResponse {
  query: string;
  run_a: RagSearchResponse;
  run_b: RagSearchResponse;
  overlap_count: number;
  jaccard_overlap: number;
  comparison_items: RagChunkComparisonItem[];
}

export type EmbeddingModality = 'text' | 'image';
export type ReductionMethod = 'pca' | 'tsne' | 'umap';

export interface EmbeddingModelInfo {
  model_id: string;
  name: string;
  modality: EmbeddingModality;
  dimensions: number;
  description: string;
  available: boolean;
  is_local_lightweight: boolean;
  install_hint?: string | null;
}

export interface ReducerInfo {
  method: ReductionMethod;
  name: string;
  description: string;
  available: boolean;
  supports_3d: boolean;
  install_hint?: string | null;
}

export interface EmbeddingItemInput {
  text: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTextEmbeddingSpaceRequest {
  name: string;
  model_id: string;
  items: EmbeddingItemInput[];
}

export interface CreateDatasetEmbeddingSpaceRequest {
  dataset_id: string;
  text_column: string;
  metadata_columns: string[];
  model_id: string;
  name?: string;
  max_rows?: number;
}

export interface EmbeddingSpaceSummary {
  id: string;
  name: string;
  modality: EmbeddingModality;
  model_id: string;
  dimensions: number;
  item_count: number;
  metadata_keys: string[];
  source_dataset_id?: string | null;
  is_sample: boolean;
  created_at?: string | null;
}

export interface EmbeddingSpaceListResponse {
  spaces: EmbeddingSpaceSummary[];
  total: number;
}

export interface EmbeddingSpaceDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

export interface ProjectionRequest {
  method: ReductionMethod;
  dimensions: 2 | 3;
  n_clusters: number;
  perplexity: number;
  filter_key?: string;
  filter_value?: string;
}

export interface ProjectedPoint {
  index: number;
  label: string;
  snippet: string;
  x: number;
  y: number;
  z?: number | null;
  cluster?: number | null;
  metadata: Record<string, unknown>;
}

export interface ClusterSummary {
  cluster_id: number;
  count: number;
  percentage: number;
}

export interface ProjectionResponse {
  space: EmbeddingSpaceSummary;
  method: ReductionMethod;
  dimensions: 2 | 3;
  points: ProjectedPoint[];
  clusters: ClusterSummary[];
  explained_variance_ratio?: number[] | null;
  total_points: number;
  filtered_points: number;
  effective_params: Record<string, unknown>;
}

export interface NearestNeighborItem {
  index: number;
  label: string;
  snippet: string;
  cosine_similarity: number;
  euclidean_distance: number;
  metadata: Record<string, unknown>;
}

export interface PointInspectionResponse {
  space_id: string;
  index: number;
  label: string;
  content: string;
  modality: EmbeddingModality;
  metadata: Record<string, unknown>;
  original_dimension: number;
  vector_norm: number;
  vector_min: number;
  vector_max: number;
  vector_mean: number;
  vector_preview: number[];
  neighbors: NearestNeighborItem[];
  similarity_basis: string;
}

export type MlTaskType = 'classification' | 'regression';
export type MlAlgorithm = 'random_forest' | 'logistic_regression' | 'gradient_boosting' | 'ridge';
export type MlRunSource = 'sample' | 'local_training' | 'imported';

export interface MlTrainingPoint {
  step: number;
  label: string;
  train_loss: number;
  val_loss: number;
  train_score?: number | null;
  val_score?: number | null;
}

export interface MlClassMetrics {
  label: string;
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface MlConfusionMatrixData {
  labels: string[];
  matrix: number[][];
  normalized_matrix: number[][];
}

export interface MlClassificationMetrics {
  accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  per_class: MlClassMetrics[];
  confusion_matrix: MlConfusionMatrixData;
}

export interface MlRegressionMetrics {
  mae: number;
  mse: number;
  rmse: number;
  r2: number;
  explained_variance: number;
  max_error: number;
}

export interface MlFeatureImportanceItem {
  feature: string;
  importance: number;
  permutation_importance?: number | null;
  std?: number | null;
}

export interface MlPredictionRecord {
  index: number;
  actual: string | number;
  predicted: string | number;
  is_correct?: boolean | null;
  confidence?: number | null;
  residual?: number | null;
  abs_error?: number | null;
  features: Record<string, string | number | null>;
}

export interface MlRunSummary {
  id: string;
  name: string;
  task_type: MlTaskType;
  algorithm: string;
  source: MlRunSource;
  dataset_id?: string | null;
  target_column: string;
  sample_count: number;
  train_count: number;
  val_count: number;
  primary_metric_name: string;
  primary_metric_value: number;
  is_sample: boolean;
  created_at: string;
}

export interface MlRunDetail extends MlRunSummary {
  feature_columns: string[];
  hyperparameters: Record<string, unknown>;
  training_history: MlTrainingPoint[];
  classification?: MlClassificationMetrics | null;
  regression?: MlRegressionMetrics | null;
  feature_importances: MlFeatureImportanceItem[];
  predictions: MlPredictionRecord[];
}

export interface MlRunListResponse {
  runs: MlRunSummary[];
  total: number;
}

export interface MlTrainRequest {
  name?: string;
  dataset_id: string;
  task_type: MlTaskType;
  target_column: string;
  feature_columns: string[];
  algorithm: MlAlgorithm;
  test_size: number;
  n_steps: number;
  random_state?: number;
}

export interface MlImportPredictionItem {
  actual: string | number;
  predicted: string | number;
  confidence?: number | null;
  features?: Record<string, string | number | null>;
}

export interface MlImportRequest {
  name: string;
  task_type: MlTaskType;
  algorithm: string;
  target_column: string;
  feature_columns?: string[];
  training_history?: MlTrainingPoint[];
  predictions: MlImportPredictionItem[];
  feature_importances?: MlFeatureImportanceItem[];
  hyperparameters?: Record<string, unknown>;
}

export interface MlDeleteResponse {
  deleted: boolean;
  run_id: string;
  message: string;
}
