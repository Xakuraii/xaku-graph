import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import {
  CorrelationMatrixResponse,
  CorrelationMethod,
  DatasetDistributionsResponse,
  DatasetInspectionResponse,
  DatasetQualityResponse,
  DatasetRowsQuery,
  DatasetRowsResponse,
  DatasetSummary,
} from '../types/api';

export type DatasetTabId = 'overview' | 'data' | 'distributions' | 'quality' | 'correlations';

const DEFAULT_ROWS_QUERY: DatasetRowsQuery = {
  search: '',
  filter_col: '',
  filter_value: '',
  sort_by: '',
  sort_desc: false,
  offset: 0,
  limit: 25,
};

export function useDatasetExplorer() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>('sample-iris-dataset');
  const [activeTab, setActiveTab] = useState<DatasetTabId>('overview');

  const [inspection, setInspection] = useState<DatasetInspectionResponse | null>(null);
  const [rowsData, setRowsData] = useState<DatasetRowsResponse | null>(null);
  const [distributions, setDistributions] = useState<DatasetDistributionsResponse | null>(null);
  const [quality, setQuality] = useState<DatasetQualityResponse | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationMatrixResponse | null>(null);

  const [rowsQuery, setRowsQuery] = useState<DatasetRowsQuery>(DEFAULT_ROWS_QUERY);
  const [histogramBins, setHistogramBins] = useState<number>(15);
  const [correlationMethod, setCorrelationMethod] = useState<CorrelationMethod>('pearson');

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDatasetList = useCallback(async () => {
    try {
      const res = await apiClient.listDatasets();
      setDatasets(res.datasets);
    } catch {
      // Fallback if list endpoint is temporarily unavailable
    }
  }, []);

  const loadDatasetInspection = useCallback(async (datasetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data =
        datasetId === 'sample-iris-dataset'
          ? await apiClient.getSampleDataset()
          : await apiClient.getDataset(datasetId);
      setInspection(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to inspect dataset');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRows = useCallback(
    async (datasetId: string, query: DatasetRowsQuery) => {
      setLoadingAnalysis(true);
      setError(null);
      try {
        const data = await apiClient.queryDatasetRows(datasetId, query);
        setRowsData(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to query dataset rows');
      } finally {
        setLoadingAnalysis(false);
      }
    },
    []
  );

  const loadDistributions = useCallback(async (datasetId: string, bins: number) => {
    setLoadingAnalysis(true);
    setError(null);
    try {
      const data = await apiClient.getDatasetDistributions(datasetId, bins);
      setDistributions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compute distributions');
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const loadQuality = useCallback(async (datasetId: string) => {
    setLoadingAnalysis(true);
    setError(null);
    try {
      const data = await apiClient.getDatasetQuality(datasetId);
      setQuality(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze data quality');
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const loadCorrelations = useCallback(async (datasetId: string, method: CorrelationMethod) => {
    setLoadingAnalysis(true);
    setError(null);
    try {
      const data = await apiClient.getDatasetCorrelations(datasetId, method);
      setCorrelations(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compute correlation matrix');
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  // Load dataset list + active inspection on mount or activeDatasetId change
  useEffect(() => {
    void fetchDatasetList();
    void loadDatasetInspection(activeDatasetId);
    setRowsData(null);
    setDistributions(null);
    setQuality(null);
    setCorrelations(null);
    setRowsQuery(DEFAULT_ROWS_QUERY);
  }, [activeDatasetId, fetchDatasetList, loadDatasetInspection]);

  // Load active tab analysis data lazily
  useEffect(() => {
    if (activeTab === 'data') {
      void loadRows(activeDatasetId, rowsQuery);
    } else if (activeTab === 'distributions') {
      void loadDistributions(activeDatasetId, histogramBins);
    } else if (activeTab === 'quality') {
      void loadQuality(activeDatasetId);
    } else if (activeTab === 'correlations') {
      void loadCorrelations(activeDatasetId, correlationMethod);
    }
  }, [
    activeTab,
    activeDatasetId,
    rowsQuery,
    histogramBins,
    correlationMethod,
    loadRows,
    loadDistributions,
    loadQuality,
    loadCorrelations,
  ]);

  const selectDataset = useCallback((datasetId: string) => {
    setActiveDatasetId(datasetId);
  }, []);

  const uploadFile = useCallback(
    async (file: File, customName?: string) => {
      setUploading(true);
      setError(null);
      try {
        const res = await apiClient.uploadDataset(file, customName);
        await fetchDatasetList();
        setActiveDatasetId(res.summary.id);
        setInspection(res);
        setActiveTab('overview');
        return res;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to upload dataset';
        setError(message);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [fetchDatasetList]
  );

  const deleteDataset = useCallback(
    async (datasetId: string) => {
      setError(null);
      try {
        await apiClient.deleteDataset(datasetId);
        await fetchDatasetList();
        if (activeDatasetId === datasetId) {
          setActiveDatasetId('sample-iris-dataset');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete dataset');
      }
    },
    [activeDatasetId, fetchDatasetList]
  );

  const updateRowsQuery = useCallback((patch: Partial<DatasetRowsQuery>) => {
    setRowsQuery((prev) => ({
      ...prev,
      ...patch,
      offset: patch.offset !== undefined ? patch.offset : 0,
    }));
  }, []);

  const refresh = useCallback(() => {
    void fetchDatasetList();
    void loadDatasetInspection(activeDatasetId);
    if (activeTab === 'data') void loadRows(activeDatasetId, rowsQuery);
    if (activeTab === 'distributions') void loadDistributions(activeDatasetId, histogramBins);
    if (activeTab === 'quality') void loadQuality(activeDatasetId);
    if (activeTab === 'correlations') void loadCorrelations(activeDatasetId, correlationMethod);
  }, [
    activeDatasetId,
    activeTab,
    rowsQuery,
    histogramBins,
    correlationMethod,
    fetchDatasetList,
    loadDatasetInspection,
    loadRows,
    loadDistributions,
    loadQuality,
    loadCorrelations,
  ]);

  return {
    datasets,
    activeDatasetId,
    activeTab,
    setActiveTab,
    inspection,
    rowsData,
    distributions,
    quality,
    correlations,
    rowsQuery,
    histogramBins,
    setHistogramBins,
    correlationMethod,
    setCorrelationMethod,
    loading,
    loadingAnalysis,
    uploading,
    error,
    selectDataset,
    uploadFile,
    deleteDataset,
    updateRowsQuery,
    refresh,
  };
}
