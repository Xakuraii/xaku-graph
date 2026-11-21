import { useCallback, useState } from 'react';
import { apiClient } from '../services/apiClient';
import {
  DistanceMetric,
  NamedVectorInput,
  VectorInspectResponse,
  VectorMatrixResponse,
  VectorSearchResponse,
  VectorSimilarityResponse,
} from '../types/api';

export type VectorTabId = 'pairwise' | 'ranking' | 'space';

const DEFAULT_CANDIDATE_LINES = [
  'Neural Search | 0.85, 0.42, 0.15, 0.90',
  'Dense Retrieval | 0.80, 0.48, 0.20, 0.84',
  'Vector Index | 0.72, 0.35, 0.10, 0.78',
  'Tabular SQL | -0.25, 0.88, 0.62, -0.10',
  'Random Noise | -0.60, -0.45, 0.75, -0.50',
].join('\n');

export function parseVectorString(str: string): number[] {
  const trimmed = str.trim();
  if (!trimmed) {
    throw new Error('Vector cannot be empty.');
  }

  if (trimmed.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new Error(
        `Invalid JSON vector array: ${err instanceof Error ? err.message : 'parse error'}`
      );
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('JSON vector must be a non-empty array of numbers.');
    }
    return parsed.map((item) => {
      const val = Number(item);
      if (typeof item === 'boolean' || Number.isNaN(val) || !Number.isFinite(val)) {
        throw new Error(`Invalid vector component: "${String(item)}"`);
      }
      return val;
    });
  }

  const parts = trimmed
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) {
    throw new Error('Vector cannot be empty.');
  }
  return parts.map((s) => {
    const val = Number(s);
    if (Number.isNaN(val) || !Number.isFinite(val)) {
      throw new Error(`Invalid vector component: "${s}"`);
    }
    return val;
  });
}

export function parseNamedVectors(text: string): NamedVectorInput[] {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Provide at least one candidate vector.');
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      throw new Error(
        `Invalid JSON candidate vectors: ${err instanceof Error ? err.message : 'parse error'}`
      );
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('JSON candidates must be a non-empty array.');
    }
    return parsed.map((item, idx) => {
      if (Array.isArray(item)) {
        return {
          id: `vec-${idx + 1}`,
          label: `Vec ${idx + 1}`,
          values: item.map((v) => {
            const num = Number(v);
            if (Number.isNaN(num) || !Number.isFinite(num)) {
              throw new Error(`Invalid vector value at item ${idx + 1}`);
            }
            return num;
          }),
        };
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const rawVals = obj.values ?? obj.vector ?? obj.embedding;
        if (!Array.isArray(rawVals) || rawVals.length === 0) {
          throw new Error(`Item ${idx + 1} is missing a numeric "values" array.`);
        }
        return {
          id: String(obj.id ?? `vec-${idx + 1}`),
          label: String(obj.label ?? obj.name ?? `Vec ${idx + 1}`),
          values: rawVals.map((v) => {
            const num = Number(v);
            if (Number.isNaN(num) || !Number.isFinite(num)) {
              throw new Error(`Invalid number in vector "${String(obj.label ?? idx + 1)}"`);
            }
            return num;
          }),
        };
      }
      throw new Error(`Unsupported JSON candidate item at index ${idx}.`);
    });
  }

  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    throw new Error('Provide at least one candidate vector.');
  }
  return lines.map((line, idx) => {
    const pipeIdx = line.indexOf('|');
    if (pipeIdx !== -1) {
      const label = line.slice(0, pipeIdx).trim() || `Vec ${idx + 1}`;
      const vecStr = line.slice(pipeIdx + 1).trim();
      return {
        id: `vec-${idx + 1}`,
        label,
        values: parseVectorString(vecStr),
      };
    }
    return {
      id: `vec-${idx + 1}`,
      label: `Vec ${idx + 1}`,
      values: parseVectorString(line),
    };
  });
}

export function useVectorExplorer() {
  const [activeTab, setActiveTab] = useState<VectorTabId>('pairwise');

  // Pairwise Comparison State
  const [vecAStr, setVecAStr] = useState<string>('1.0, 2.0, 3.0, 4.0');
  const [vecBStr, setVecBStr] = useState<string>('2.0, 3.0, 4.0, 5.0');
  const [pairwiseResult, setPairwiseResult] = useState<VectorSimilarityResponse | null>(null);
  const [inspectA, setInspectA] = useState<VectorInspectResponse | null>(null);
  const [inspectB, setInspectB] = useState<VectorInspectResponse | null>(null);

  // Ranking & Matrix State
  const [queryStr, setQueryStr] = useState<string>('0.82, 0.45, 0.18, 0.88');
  const [candidateLines, setCandidateLines] = useState<string>(DEFAULT_CANDIDATE_LINES);
  const [metric, setMetric] = useState<DistanceMetric>('cosine_similarity');
  const [searchResult, setSearchResult] = useState<VectorSearchResponse | null>(null);
  const [matrixResult, setMatrixResult] = useState<VectorMatrixResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const computePairwiseVectors = useCallback(async (a: number[], b: number[]) => {
    setError(null);
    setLoading(true);
    try {
      if (a.length !== b.length) {
        throw new Error(
          `Dimension mismatch: Vector A has ${a.length} dimensions, while Vector B has ${b.length}.`
        );
      }
      const [simRes, resA, resB] = await Promise.all([
        apiClient.computeSimilarity({ vector_a: a, vector_b: b }),
        apiClient.inspectVector({ label: 'Vector A', values: a }),
        apiClient.inspectVector({ label: 'Vector B', values: b }),
      ]);
      setPairwiseResult(simRes);
      setInspectA(resA);
      setInspectB(resB);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Calculation error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPairwisePreset = useCallback(
    (a: number[], b: number[]) => {
      setVecAStr(a.join(', '));
      setVecBStr(b.join(', '));
      void computePairwiseVectors(a, b);
    },
    [computePairwiseVectors]
  );

  const calculatePairwise = useCallback(async () => {
    try {
      const a = parseVectorString(vecAStr);
      const b = parseVectorString(vecBStr);
      await computePairwiseVectors(a, b);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Calculation error');
    }
  }, [vecAStr, vecBStr, computePairwiseVectors]);

  const runNeighborSearch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const query = parseVectorString(queryStr);
      const candidates = parseNamedVectors(candidateLines);
      const res = await apiClient.searchVectors({
        query_vector: query,
        vectors: candidates,
        metric,
        top_k: 50,
      });
      setSearchResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rank candidate vectors');
    } finally {
      setLoading(false);
    }
  }, [queryStr, candidateLines, metric]);

  const computeSpaceMatrix = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const candidates = parseNamedVectors(candidateLines);
      if (candidates.length < 2) {
        throw new Error('Vector space matrix requires at least 2 candidate vectors.');
      }
      const res = await apiClient.computeVectorMatrix({
        vectors: candidates,
        metric,
      });
      setMatrixResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compute vector space matrix');
    } finally {
      setLoading(false);
    }
  }, [candidateLines, metric]);

  return {
    activeTab,
    setActiveTab,
    vecAStr,
    setVecAStr,
    vecBStr,
    setVecBStr,
    pairwiseResult,
    inspectA,
    inspectB,
    loadPairwisePreset,
    calculatePairwise,
    queryStr,
    setQueryStr,
    candidateLines,
    setCandidateLines,
    metric,
    setMetric,
    searchResult,
    runNeighborSearch,
    matrixResult,
    computeSpaceMatrix,
    loading,
    error,
  };
}
