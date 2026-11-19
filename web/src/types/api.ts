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

export interface VectorSimilarityRequest {
  vector_a: number[];
  vector_b: number[];
}

export interface VectorSimilarityResponse {
  cosine_similarity: number;
  euclidean_distance: number;
  dot_product: number;
  norm_a: number;
  norm_b: number;
  normalized_a?: number[];
  normalized_b?: number[];
}
