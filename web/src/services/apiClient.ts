import {
  HealthResponse,
  DatasetInspectionResponse,
  VectorSimilarityRequest,
  VectorSimilarityResponse,
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
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let detail = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        detail = errorJson.detail || detail;
      } catch {
        // Fallback to text status
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
  getSampleDataset: () => request<DatasetInspectionResponse>('/datasets/sample'),
  computeSimilarity: (payload: VectorSimilarityRequest) =>
    request<VectorSimilarityResponse>('/vectors/similarity', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
