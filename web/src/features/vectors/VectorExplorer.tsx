import React, { useState } from 'react';
import { Binary, Play, AlertCircle, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { VectorSimilarityResponse } from '../../types/api';
import { StatusBadge } from '../../components/StatusBadge';

export const VectorExplorer: React.FC = () => {
  const [vecAStr, setVecAStr] = useState<string>('1.0, 2.0, 3.0, 4.0');
  const [vecBStr, setVecBStr] = useState<string>('2.0, 3.0, 4.0, 5.0');
  const [result, setResult] = useState<VectorSimilarityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parseVector = (str: string): number[] => {
    return str
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const val = Number(s);
        if (isNaN(val)) throw new Error(`Invalid number: "${s}"`);
        return val;
      });
  };

  const handleCalculate = async () => {
    setError(null);
    setLoading(true);
    try {
      const a = parseVector(vecAStr);
      const b = parseVector(vecBStr);

      if (a.length !== b.length) {
        throw new Error(
          `Dimension mismatch: Vector A has ${a.length} dimensions, while Vector B has ${b.length} dimensions.`
        );
      }
      if (a.length === 0) {
        throw new Error('Vectors cannot be empty.');
      }

      const res = await apiClient.computeSimilarity({ vector_a: a, vector_b: b });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Calculation error');
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (a: number[], b: number[]) => {
    setVecAStr(a.join(', '));
    setVecBStr(b.join(', '));
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Vector & Similarity Explorer
            </h1>
            <StatusBadge status="foundation_ready" label="Phase 4 Foundation" />
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Explore mathematical vector properties, cosine similarity, euclidean distance, and dot products in original high-dimensional space.
          </p>
        </div>
      </div>

      {/* Architectural Guarantee Alert */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-white">Architectural Invariant: </span>
          Similarity computations always operate on the <strong>original high-dimensional coordinates</strong>. Dimensionality reduction projections (such as PCA, t-SNE, or UMAP) are used strictly for visual rendering, never as substitutes for exact vector calculations.
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium mr-1">Presets:</span>
        <button
          onClick={() => loadPreset([1, 0, 0], [0, 1, 0])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          Orthogonal (90°)
        </button>
        <button
          onClick={() => loadPreset([2, 2, 2], [5, 5, 5])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          Collinear (0°)
        </button>
        <button
          onClick={() => loadPreset([1, 0], [-1, 0])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          Opposite (180°)
        </button>
        <button
          onClick={() =>
            loadPreset(
              [0.15, -0.42, 0.88, 0.21],
              [0.19, -0.38, 0.72, 0.15]
            )
          }
          className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          Embedding Mini (4D)
        </button>
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Vector A</span>
            <span className="text-slate-500 font-normal">Comma-separated floats</span>
          </label>
          <textarea
            value={vecAStr}
            onChange={(e) => setVecAStr(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. 1.0, 2.0, 3.0"
          />
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Vector B</span>
            <span className="text-slate-500 font-normal">Comma-separated floats</span>
          </label>
          <textarea
            value={vecBStr}
            onChange={(e) => setVecBStr(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. 2.0, 3.0, 4.0"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{loading ? 'Computing...' : 'Calculate Similarity & Distance'}</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center space-x-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center space-x-2">
            <Binary className="w-4 h-4 text-brand-400" />
            <span>Mathematical Calculation Results</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Cosine Similarity</span>
              <p className="text-3xl font-bold text-brand-400 mt-1 font-mono">
                {result.cosine_similarity.toFixed(6)}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                Range [-1.0, 1.0] (1.0 = identical direction)
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Euclidean Distance</span>
              <p className="text-3xl font-bold text-white mt-1 font-mono">
                {result.euclidean_distance.toFixed(6)}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                L2 distance between vector coordinates
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Dot Product</span>
              <p className="text-3xl font-bold text-white mt-1 font-mono">
                {result.dot_product.toFixed(6)}
              </p>
              <span className="text-xs text-slate-500 mt-1 block">
                Sum of element-wise products (a · b)
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2 text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">||A|| (L2 Norm of A):</span>
              <span className="text-white">{result.norm_a.toFixed(6)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">||B|| (L2 Norm of B):</span>
              <span className="text-white">{result.norm_b.toFixed(6)}</span>
            </div>
            {result.normalized_a && (
              <div className="pt-1">
                <span className="text-slate-400 block mb-1">Normalized Vector A:</span>
                <span className="text-slate-300 text-[11px] break-all">
                  [{result.normalized_a.map((v) => v.toFixed(4)).join(', ')}]
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
