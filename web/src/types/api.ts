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
  unique_count: number;
  min_value?: number | string | null;
  max_value?: number | string | null;
  mean_value?: number | null;
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
}

export interface DatasetInspectionResponse {
  summary: DatasetSummary;
  columns: ColumnDetail[];
  preview_rows: Record<string, unknown>[];
  metadata: Record<string, unknown>;
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
