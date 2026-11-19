import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import {
  CreateDatasetEmbeddingSpaceRequest,
  CreateTextEmbeddingSpaceRequest,
  DatasetSummary,
  EmbeddingModelInfo,
  EmbeddingSpaceSummary,
  PointInspectionResponse,
  ProjectionRequest,
  ProjectionResponse,
  ReducerInfo,
} from '../types/api';

const DEFAULT_PROJECTION_PARAMS: ProjectionRequest = {
  method: 'pca',
  dimensions: 2,
  n_clusters: 3,
  perplexity: 10,
  filter_key: '',
  filter_value: '',
};

export function useEmbeddingExplorer() {
  const [models, setModels] = useState<EmbeddingModelInfo[]>([]);
  const [reducers, setReducers] = useState<ReducerInfo[]>([]);
  const [spaces, setSpaces] = useState<EmbeddingSpaceSummary[]>([]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);

  const [activeSpaceId, setActiveSpaceId] = useState<string>('sample-ai-concepts-embeddings');
  const [projectionParams, setProjectionParams] =
    useState<ProjectionRequest>(DEFAULT_PROJECTION_PARAMS);
  const [colorBy, setColorBy] = useState<string>('cluster');

  const [projection, setProjection] = useState<ProjectionResponse | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [pointInspection, setPointInspection] = useState<PointInspectionResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProjection, setLoadingProjection] = useState<boolean>(false);
  const [loadingPoint, setLoadingPoint] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      const [modelList, reducerList, spaceList, datasetList] = await Promise.all([
        apiClient.listEmbeddingModels(),
        apiClient.listReducers(),
        apiClient.listEmbeddingSpaces(),
        apiClient.listDatasets(),
      ]);
      setModels(modelList);
      setReducers(reducerList);
      setSpaces(spaceList.spaces);
      setDatasets(datasetList.datasets);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load embedding metadata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  const runProjection = useCallback(
    async (spaceId: string, params: ProjectionRequest) => {
      setLoadingProjection(true);
      setError(null);
      try {
        const res = await apiClient.projectEmbeddingSpace(spaceId, {
          ...params,
          filter_key: params.filter_key || undefined,
          filter_value: params.filter_value || undefined,
        });
        setProjection(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to project embedding space');
      } finally {
        setLoadingProjection(false);
      }
    },
    []
  );

  useEffect(() => {
    void runProjection(activeSpaceId, projectionParams);
  }, [activeSpaceId, projectionParams, runProjection]);

  const selectSpace = useCallback((spaceId: string) => {
    setActiveSpaceId(spaceId);
    setSelectedPointIndex(null);
    setPointInspection(null);
    setColorBy('cluster');
    setProjectionParams((prev) => ({ ...prev, filter_key: '', filter_value: '' }));
  }, []);

  const updateProjectionParams = useCallback((patch: Partial<ProjectionRequest>) => {
    setProjectionParams((prev) => ({ ...prev, ...patch }));
  }, []);

  const inspectPoint = useCallback(
    async (pointIndex: number) => {
      setSelectedPointIndex(pointIndex);
      setLoadingPoint(true);
      try {
        const data = await apiClient.inspectEmbeddingPoint(activeSpaceId, pointIndex, 5);
        setPointInspection(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to inspect embedding point');
      } finally {
        setLoadingPoint(false);
      }
    },
    [activeSpaceId]
  );

  const createTextSpace = useCallback(
    async (payload: CreateTextEmbeddingSpaceRequest) => {
      setCreating(true);
      setError(null);
      try {
        const created = await apiClient.createTextEmbeddingSpace(payload);
        await loadMetadata();
        selectSpace(created.id);
        return created;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create text embedding space');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [loadMetadata, selectSpace]
  );

  const createDatasetSpace = useCallback(
    async (payload: CreateDatasetEmbeddingSpaceRequest) => {
      setCreating(true);
      setError(null);
      try {
        const created = await apiClient.createEmbeddingSpaceFromDataset(payload);
        await loadMetadata();
        selectSpace(created.id);
        return created;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to embed dataset column');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [loadMetadata, selectSpace]
  );

  const createImageSpace = useCallback(
    async (name: string, modelId: string, files: File[]) => {
      setCreating(true);
      setError(null);
      try {
        const created = await apiClient.createImageEmbeddingSpace(name, modelId, files);
        await loadMetadata();
        selectSpace(created.id);
        return created;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create image embedding space');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [loadMetadata, selectSpace]
  );

  const deleteSpace = useCallback(
    async (spaceId: string) => {
      setError(null);
      try {
        await apiClient.deleteEmbeddingSpace(spaceId);
        await loadMetadata();
        if (activeSpaceId === spaceId) {
          selectSpace('sample-ai-concepts-embeddings');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete embedding space');
      }
    },
    [activeSpaceId, loadMetadata, selectSpace]
  );

  const refresh = useCallback(() => {
    void loadMetadata();
    void runProjection(activeSpaceId, projectionParams);
  }, [activeSpaceId, projectionParams, loadMetadata, runProjection]);

  return {
    models,
    reducers,
    spaces,
    datasets,
    activeSpaceId,
    projectionParams,
    colorBy,
    setColorBy,
    projection,
    selectedPointIndex,
    pointInspection,
    loading,
    loadingProjection,
    loadingPoint,
    creating,
    error,
    selectSpace,
    updateProjectionParams,
    inspectPoint,
    createTextSpace,
    createDatasetSpace,
    createImageSpace,
    deleteSpace,
    refresh,
  };
}
