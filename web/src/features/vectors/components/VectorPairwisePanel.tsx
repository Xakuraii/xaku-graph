import React, { useState } from 'react';
import { Binary, Play } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { VectorInspectResponse, VectorSimilarityResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface VectorPairwisePanelProps {
  vecAStr: string;
  vecBStr: string;
  result: VectorSimilarityResponse | null;
  inspectA: VectorInspectResponse | null;
  inspectB: VectorInspectResponse | null;
  loading: boolean;
  isDark: boolean;
  onChangeA: (val: string) => void;
  onChangeB: (val: string) => void;
  onPreset: (a: number[], b: number[]) => void;
  onCalculate: () => void;
}

export const VectorPairwisePanel: React.FC<VectorPairwisePanelProps> = ({
  vecAStr,
  vecBStr,
  result,
  inspectA,
  inspectB,
  loading,
  isDark,
  onChangeA,
  onChangeB,
  onPreset,
  onCalculate,
}) => {
  const [showNormalized, setShowNormalized] = useState(false);

  const componentChartData: Data[] =
    inspectA && inspectB
      ? [
          {
            type: 'bar',
            name: 'Vector A',
            x: inspectA.values.map((_, idx) => `d${idx}`),
            y: showNormalized ? inspectA.normalized_values : inspectA.values,
            marker: { color: '#22c55e' },
          },
          {
            type: 'bar',
            name: 'Vector B',
            x: inspectB.values.map((_, idx) => `d${idx}`),
            y: showNormalized ? inspectB.normalized_values : inspectB.values,
            marker: { color: '#38bdf8' },
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">
          Presets:
        </span>
        <button
          type="button"
          onClick={() => onPreset([1, 0, 0], [0, 1, 0])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Orthogonal (90°)
        </button>
        <button
          type="button"
          onClick={() => onPreset([2, 2, 2], [5, 5, 5])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Collinear (0°)
        </button>
        <button
          type="button"
          onClick={() => onPreset([1, 0], [-1, 0])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Opposite (180°)
        </button>
        <button
          type="button"
          onClick={() => onPreset([0.15, -0.42, 0.88, 0.21], [0.19, -0.38, 0.72, 0.15])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Embedding Mini (4D)
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Vector A</span>
            <span className="text-slate-400 font-normal">Comma-separated floats</span>
          </label>
          <textarea
            value={vecAStr}
            onChange={(e) => onChangeA(e.target.value)}
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. 1.0, 2.0, 3.0"
          />
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Vector B</span>
            <span className="text-slate-400 font-normal">Comma-separated floats</span>
          </label>
          <textarea
            value={vecBStr}
            onChange={(e) => onChangeB(e.target.value)}
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. 2.0, 3.0, 4.0"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCalculate}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{loading ? 'Computing...' : 'Calculate Similarity & Distance'}</span>
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
            <Binary className="w-4 h-4 text-brand-500" />
            <span>
              Mathematical Calculation Results ({result.dimension ?? inspectA?.dimension ?? ''}D)
            </span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Cosine Similarity
              </span>
              <p className="text-xl font-bold text-brand-500 mt-1 font-mono">
                {result.cosine_similarity.toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Cosine Distance
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {(result.cosine_distance ?? 1 - result.cosine_similarity).toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Angle (Deg)
              </span>
              <p className="text-xl font-bold text-sky-400 mt-1 font-mono">
                {(result.angle_degrees ?? 0).toFixed(2)}°
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Euclidean (L2)
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {result.euclidean_distance.toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Manhattan (L1)
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {(result.manhattan_distance ?? 0).toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Dot Product
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {result.dot_product.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Component Comparison Chart */}
          {inspectA && inspectB && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Component-Wise Vector Comparison
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNormalized((prev) => !prev)}
                  className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-brand-500"
                >
                  {showNormalized ? 'Showing L2 Normalized' : 'Showing Raw Values'} (Toggle)
                </button>
              </div>
              <PlotlyChart
                data={componentChartData}
                isDark={isDark}
                testId="vector-component-chart"
                className="w-full h-64"
                layout={{
                  barmode: 'group',
                  xaxis: { title: { text: 'Dimension Index' } },
                  yaxis: { title: { text: showNormalized ? 'Normalized Value' : 'Component Value' } },
                }}
              />
            </div>
          )}

          {/* Norms & Normalized Vectors */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500">||A|| (L2 Norm of A):</span>
              <span className="text-slate-900 dark:text-white">{result.norm_a.toFixed(6)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500">||B|| (L2 Norm of B):</span>
              <span className="text-slate-900 dark:text-white">{result.norm_b.toFixed(6)}</span>
            </div>
            {result.normalized_a && (
              <div className="pt-1">
                <span className="text-slate-500 block mb-1">Unit-Normalized Vector A:</span>
                <span className="text-[11px] break-all">
                  [{result.normalized_a.map((v) => v.toFixed(4)).join(', ')}]
                </span>
              </div>
            )}
            {result.normalized_b && (
              <div className="pt-1">
                <span className="text-slate-500 block mb-1">Unit-Normalized Vector B:</span>
                <span className="text-[11px] break-all">
                  [{result.normalized_b.map((v) => v.toFixed(4)).join(', ')}]
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
