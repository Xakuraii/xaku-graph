import {
  CorrelationMatrixResponse,
  CorrelationMethod,
  CreateDatasetEmbeddingSpaceRequest,
  CreateTextEmbeddingSpaceRequest,
  DatasetDeleteResponse,
  DatasetDistributionsResponse,
  DatasetInspectionResponse,
  DatasetListResponse,
  DatasetQualityResponse,
  DatasetRowsQuery,
  DatasetRowsResponse,
  EmbeddingModality,
  EmbeddingModelInfo,
  EmbeddingSpaceDeleteResponse,
  EmbeddingSpaceListResponse,
  EmbeddingSpaceSummary,
  HealthResponse,
  MlDeleteResponse,
  MlImportRequest,
  MlRunDetail,
  MlRunListResponse,
  MlTrainRequest,
  PointInspectionResponse,
  ProjectionRequest,
  ProjectionResponse,
  ReducerInfo,
  VectorInspectRequest,
  VectorInspectResponse,
  VectorMatrixRequest,
  VectorMatrixResponse,
  VectorSearchRequest,
  VectorSearchResponse,
  VectorSimilarityRequest,
  VectorSimilarityResponse,
  CreateRagSandboxRequest,
  ExternalConnectionConfig,
  RagCollectionInspectResponse,
  RagCollectionListResponse,
  RagCollectionSummary,
  RagCompareRequest,
  RagCompareResponse,
  RagDeleteResponse,
  RagSearchRequest,
  RagSearchResponse,
  VectorDbConnectorInfo,
} from '../types/api';

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers: HeadersInit = isFormData
    ? { ...options?.headers }
    : {
        'Content-Type': 'application/json',
        ...options?.headers,
      };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let detail = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        detail = errorJson.detail || detail;
      } catch {
        // Fallback to status message
      }
      throw new ApiError(response.status, detail);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network error or backend unreachable';
    throw new ApiError(0, message);
  }
}

export const apiClient = {
  getHealth: () => request<HealthResponse>('/health'),

  listDatasets: () => request<DatasetListResponse>('/datasets'),
  getSampleDataset: () => request<DatasetInspectionResponse>('/datasets/sample'),
  getDataset: (datasetId: string) =>
    request<DatasetInspectionResponse>(`/datasets/${encodeURIComponent(datasetId)}`),

  uploadDataset: (file: File, name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name && name.trim().length > 0) {
      formData.append('name', name.trim());
    }
    return request<DatasetInspectionResponse>('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },

  deleteDataset: (datasetId: string) =>
    request<DatasetDeleteResponse>(`/datasets/${encodeURIComponent(datasetId)}`, {
      method: 'DELETE',
    }),

  queryDatasetRows: (datasetId: string, query: DatasetRowsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.filter_col) params.set('filter_col', query.filter_col);
    if (query.filter_value) params.set('filter_value', query.filter_value);
    if (query.sort_by) params.set('sort_by', query.sort_by);
    if (query.sort_desc !== undefined) params.set('sort_desc', String(query.sort_desc));
    if (query.offset !== undefined) params.set('offset', String(query.offset));
    if (query.limit !== undefined) params.set('limit', String(query.limit));

    const qs = params.toString();
    return request<DatasetRowsResponse>(
      `/datasets/${encodeURIComponent(datasetId)}/rows${qs ? `?${qs}` : ''}`
    );
  },

  getDatasetDistributions: (datasetId: string, bins = 15) =>
    request<DatasetDistributionsResponse>(
      `/datasets/${encodeURIComponent(datasetId)}/distributions?bins=${bins}`
    ),

  getDatasetQuality: (datasetId: string) =>
    request<DatasetQualityResponse>(`/datasets/${encodeURIComponent(datasetId)}/quality`),

  getDatasetCorrelations: (datasetId: string, method: CorrelationMethod = 'pearson') =>
    request<CorrelationMatrixResponse>(
      `/datasets/${encodeURIComponent(datasetId)}/correlations?method=${method}`
    ),

  computeSimilarity: (payload: VectorSimilarityRequest) =>
    request<VectorSimilarityResponse>('/vectors/similarity', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  inspectVector: (payload: VectorInspectRequest) =>
    request<VectorInspectResponse>('/vectors/inspect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  searchVectors: (payload: VectorSearchRequest) =>
    request<VectorSearchResponse>('/vectors/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  computeVectorMatrix: (payload: VectorMatrixRequest) =>
    request<VectorMatrixResponse>('/vectors/matrix', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listEmbeddingModels: (modality?: EmbeddingModality) =>
    request<EmbeddingModelInfo[]>(
      `/embeddings/models${modality ? `?modality=${modality}` : ''}`
    ),

  listReducers: () => request<ReducerInfo[]>('/embeddings/reducers'),

  listEmbeddingSpaces: () => request<EmbeddingSpaceListResponse>('/embeddings/spaces'),

  createTextEmbeddingSpace: (payload: CreateTextEmbeddingSpaceRequest) =>
    request<EmbeddingSpaceSummary>('/embeddings/spaces/text', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createEmbeddingSpaceFromDataset: (payload: CreateDatasetEmbeddingSpaceRequest) =>
    request<EmbeddingSpaceSummary>('/embeddings/spaces/from-dataset', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createImageEmbeddingSpace: (name: string, modelId: string, files: File[]) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('model_id', modelId);
    for (const file of files) {
      formData.append('files', file);
    }
    return request<EmbeddingSpaceSummary>('/embeddings/spaces/image', {
      method: 'POST',
      body: formData,
    });
  },

  deleteEmbeddingSpace: (spaceId: string) =>
    request<EmbeddingSpaceDeleteResponse>(`/embeddings/spaces/${encodeURIComponent(spaceId)}`, {
      method: 'DELETE',
    }),

  projectEmbeddingSpace: (spaceId: string, payload: ProjectionRequest) =>
    request<ProjectionResponse>(
      `/embeddings/spaces/${encodeURIComponent(spaceId)}/project`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  inspectEmbeddingPoint: (spaceId: string, pointIndex: number, topK = 5) =>
    request<PointInspectionResponse>(
      `/embeddings/spaces/${encodeURIComponent(spaceId)}/points/${pointIndex}?top_k=${topK}`
    ),

  listRagConnectors: () => request<VectorDbConnectorInfo[]>('/rag/connectors'),

  listRagCollections: () => request<RagCollectionListResponse>('/rag/collections'),

  inspectRagCollection: (
    collectionId: string,
    params: { doc_id?: string; search?: string; offset?: number; limit?: number } = {}
  ) => {
    const sp = new URLSearchParams();
    if (params.doc_id) sp.set('doc_id', params.doc_id);
    if (params.search) sp.set('search', params.search);
    if (params.offset !== undefined) sp.set('offset', String(params.offset));
    if (params.limit !== undefined) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return request<RagCollectionInspectResponse>(
      `/rag/collections/${encodeURIComponent(collectionId)}${qs ? `?${qs}` : ''}`
    );
  },

  listExternalRagCollections: (config: ExternalConnectionConfig) =>
    request<RagCollectionListResponse>('/rag/external/collections', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  inspectExternalRagCollection: (config: ExternalConnectionConfig, offset = 0, limit = 50) =>
    request<RagCollectionInspectResponse>(
      `/rag/external/inspect?offset=${offset}&limit=${limit}`,
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    ),

  createRagSandbox: (payload: CreateRagSandboxRequest) =>
    request<RagCollectionSummary>('/rag/sandbox', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteRagSandbox: (collectionId: string) =>
    request<RagDeleteResponse>(`/rag/sandbox/${encodeURIComponent(collectionId)}`, {
      method: 'DELETE',
    }),

  searchRag: (payload: RagSearchRequest) =>
    request<RagSearchResponse>('/rag/search', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  compareRag: (payload: RagCompareRequest) =>
    request<RagCompareResponse>('/rag/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listMlRuns: () => request<MlRunListResponse>('/ml/runs'),

  getMlRun: (runId: string) =>
    request<MlRunDetail>(`/ml/runs/${encodeURIComponent(runId)}`),

  trainMlModel: (payload: MlTrainRequest) =>
    request<MlRunDetail>('/ml/train', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  importMlRun: (payload: MlImportRequest) =>
    request<MlRunDetail>('/ml/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteMlRun: (runId: string) =>
    request<MlDeleteResponse>(`/ml/runs/${encodeURIComponent(runId)}`, {
      method: 'DELETE',
    }),
};
