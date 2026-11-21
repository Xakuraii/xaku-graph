import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import {
  DatasetSummary,
  MlImportRequest,
  MlRunDetail,
  MlRunSummary,
  MlTrainRequest,
} from '../types/api';

export type MlTabId = 'training' | 'evaluation' | 'explainability';

export function useMlExplorer() {
  const [runs, setRuns] = useState<MlRunSummary[]>([]);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [activeRunId, setActiveRunId] = useState<string>('sample-ml-iris-classification');
  const [runDetail, setRunDetail] = useState<MlRunDetail | null>(null);
  const [activeTab, setActiveTab] = useState<MlTabId>('training');

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRun, setLoadingRun] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadRunDetail = useCallback(async (runId: string) => {
    setLoadingRun(true);
    setError(null);
    try {
      const detail = await apiClient.getMlRun(runId);
      setRunDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inspect ML run');
    } finally {
      setLoadingRun(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsRes, dsRes] = await Promise.all([
        apiClient.listMlRuns(),
        apiClient.listDatasets(),
      ]);
      setRuns(runsRes.runs);
      setDatasets(dsRes.datasets);
      const targetId = runsRes.runs.some((r) => r.id === activeRunId)
        ? activeRunId
        : (runsRes.runs[0]?.id ?? '');
      if (targetId) {
        setActiveRunId(targetId);
        await loadRunDetail(targetId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ML runs');
    } finally {
      setLoading(false);
    }
  }, [activeRunId, loadRunDetail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectRun = useCallback(
    async (runId: string) => {
      setActiveRunId(runId);
      await loadRunDetail(runId);
    },
    [loadRunDetail]
  );

  const trainModel = useCallback(async (payload: MlTrainRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiClient.trainMlModel(payload);
      const runsRes = await apiClient.listMlRuns();
      setRuns(runsRes.runs);
      setActiveRunId(created.id);
      setRunDetail(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to train local model');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const importRun = useCallback(async (payload: MlImportRequest) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiClient.importMlRun(payload);
      const runsRes = await apiClient.listMlRuns();
      setRuns(runsRes.runs);
      setActiveRunId(created.id);
      setRunDetail(created);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import ML evaluation run');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteRun = useCallback(
    async (runId: string) => {
      setSubmitting(true);
      setError(null);
      try {
        await apiClient.deleteMlRun(runId);
        const runsRes = await apiClient.listMlRuns();
        setRuns(runsRes.runs);
        const nextId = runsRes.runs[0]?.id ?? '';
        setActiveRunId(nextId);
        if (nextId) {
          await loadRunDetail(nextId);
        } else {
          setRunDetail(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete ML run');
      } finally {
        setSubmitting(false);
      }
    },
    [loadRunDetail]
  );

  return {
    runs,
    datasets,
    activeRunId,
    runDetail,
    activeTab,
    setActiveTab,
    loading,
    loadingRun,
    submitting,
    error,
    selectRun,
    trainModel,
    importRun,
    deleteRun,
    refresh,
  };
}
