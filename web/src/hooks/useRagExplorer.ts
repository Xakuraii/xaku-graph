import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import {
  CreateRagSandboxRequest,
  EmbeddingModelInfo,
  ExternalConnectionConfig,
  RagCollectionInspectResponse,
  RagCollectionSummary,
  RagCompareResponse,
  RagCompareStrategy,
  RagSearchResponse,
  RagSimilarityMetric,
  VectorDbConnectorInfo,
} from '../types/api';

export type RagTabId = 'inspect' | 'playground' | 'compare';

export function useRagExplorer() {
  const [connectors, setConnectors] = useState<VectorDbConnectorInfo[]>([]);
  const [collections, setCollections] = useState<RagCollectionSummary[]>([]);
  const [textModels, setTextModels] = useState<EmbeddingModelInfo[]>([]);

  const [activeCollectionId, setActiveCollectionId] = useState<string>('sample-xakugraph-rag-docs');
  const [externalConfig, setExternalConfig] = useState<ExternalConnectionConfig | null>(null);
  const [activeTab, setActiveTab] = useState<RagTabId>('inspect');

  const [inspection, setInspection] = useState<RagCollectionInspectResponse | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [chunkSearch, setChunkSearch] = useState<string>('');

  // Retrieval Playground state
  const [query, setQuery] = useState<string>(
    'How do ChromaDB and Qdrant read-only connectors inspect RAG chunks?'
  );
  const [metric, setMetric] = useState<RagSimilarityMetric>('cosine_similarity');
  const [topK, setTopK] = useState<number>(4);
  const [filterKey, setFilterKey] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [searchResult, setSearchResult] = useState<RagSearchResponse | null>(null);

  // Comparison state
  const [strategyA, setStrategyA] = useState<RagCompareStrategy>({
    label: 'Cosine Similarity',
    collection_id: 'sample-xakugraph-rag-docs',
    metric: 'cosine_similarity',
    top_k: 4,
  });
  const [strategyB, setStrategyB] = useState<RagCompareStrategy>({
    label: 'Euclidean L2 Distance',
    collection_id: 'sample-xakugraph-rag-docs',
    metric: 'euclidean_distance',
    top_k: 4,
  });
  const [compareResult, setCompareResult] = useState<RagCompareResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingInspect, setLoadingInspect] = useState<boolean>(false);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      const [connList, colList, modelList] = await Promise.all([
        apiClient.listRagConnectors(),
        apiClient.listRagCollections(),
        apiClient.listEmbeddingModels('text'),
      ]);
      setConnectors(connList);
      setCollections(colList.collections);
      setTextModels(modelList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load RAG metadata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetadata();
  }, [loadMetadata]);

  const loadCollectionInspection = useCallback(
    async (
      colId: string,
      docId: string,
      search: string,
      extConfig: ExternalConnectionConfig | null
    ) => {
      setLoadingInspect(true);
      setError(null);
      try {
        const res = extConfig
          ? await apiClient.inspectExternalRagCollection(extConfig)
          : await apiClient.inspectRagCollection(colId, {
              doc_id: docId || undefined,
              search: search.trim() || undefined,
              limit: 100,
            });
        setInspection(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to inspect RAG collection');
      } finally {
        setLoadingInspect(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCollectionInspection(activeCollectionId, selectedDocId, chunkSearch, externalConfig);
  }, [activeCollectionId, selectedDocId, chunkSearch, externalConfig, loadCollectionInspection]);

  const selectCollection = useCallback((colId: string) => {
    setExternalConfig(null);
    setActiveCollectionId(colId);
    setSelectedDocId('');
    setChunkSearch('');
    setSearchResult(null);
    setCompareResult(null);
    setFilterKey('');
    setFilterValue('');
    setStrategyA((prev) => ({ ...prev, collection_id: colId }));
    setStrategyB((prev) => ({ ...prev, collection_id: colId }));
  }, []);

  const connectExternal = useCallback(async (config: ExternalConnectionConfig) => {
    setLoadingInspect(true);
    setError(null);
    try {
      const res = await apiClient.inspectExternalRagCollection(config);
      setExternalConfig(config);
      setActiveCollectionId(res.collection.id);
      setInspection(res);
      setSelectedDocId('');
      setChunkSearch('');
      setSearchResult(null);
      return res;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to external vector DB');
      return null;
    } finally {
      setLoadingInspect(false);
    }
  }, []);

  const discoverExternal = useCallback(async (config: ExternalConnectionConfig) => {
    return apiClient.listExternalRagCollections(config);
  }, []);

  const createSandbox = useCallback(
    async (payload: CreateRagSandboxRequest) => {
      setCreating(true);
      setError(null);
      try {
        const created = await apiClient.createRagSandbox(payload);
        await loadMetadata();
        selectCollection(created.id);
        return created;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create RAG sandbox');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [loadMetadata, selectCollection]
  );

  const deleteSandbox = useCallback(
    async (collectionId: string) => {
      setError(null);
      try {
        await apiClient.deleteRagSandbox(collectionId);
        await loadMetadata();
        if (activeCollectionId === collectionId) {
          selectCollection('sample-xakugraph-rag-docs');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete RAG sandbox');
      }
    },
    [activeCollectionId, loadMetadata, selectCollection]
  );

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoadingSearch(true);
    setError(null);
    try {
      const res = await apiClient.searchRag({
        collection_id: activeCollectionId,
        query: query.trim(),
        top_k: topK,
        metric,
        filter_key: filterKey || undefined,
        filter_value: filterValue.trim() || undefined,
        connection_config: externalConfig ?? undefined,
      });
      setSearchResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Retrieval search failed');
    } finally {
      setLoadingSearch(false);
    }
  }, [activeCollectionId, query, topK, metric, filterKey, filterValue, externalConfig]);

  const runComparison = useCallback(async () => {
    if (!query.trim()) return;
    setLoadingSearch(true);
    setError(null);
    try {
      const res = await apiClient.compareRag({
        query: query.trim(),
        strategy_a: strategyA,
        strategy_b: strategyB,
      });
      setCompareResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Retrieval comparison failed');
    } finally {
      setLoadingSearch(false);
    }
  }, [query, strategyA, strategyB]);

  const refresh = useCallback(() => {
    void loadMetadata();
    void loadCollectionInspection(activeCollectionId, selectedDocId, chunkSearch, externalConfig);
  }, [
    loadMetadata,
    loadCollectionInspection,
    activeCollectionId,
    selectedDocId,
    chunkSearch,
    externalConfig,
  ]);

  return {
    connectors,
    collections,
    textModels,
    activeCollectionId,
    externalConfig,
    activeTab,
    setActiveTab,
    inspection,
    selectedDocId,
    setSelectedDocId,
    chunkSearch,
    setChunkSearch,
    query,
    setQuery,
    metric,
    setMetric,
    topK,
    setTopK,
    filterKey,
    setFilterKey,
    filterValue,
    setFilterValue,
    searchResult,
    strategyA,
    setStrategyA,
    strategyB,
    setStrategyB,
    compareResult,
    loading,
    loadingInspect,
    loadingSearch,
    creating,
    error,
    selectCollection,
    connectExternal,
    discoverExternal,
    createSandbox,
    deleteSandbox,
    runSearch,
    runComparison,
    refresh,
  };
}
