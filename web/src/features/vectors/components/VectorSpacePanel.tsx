import React from 'react';
import { Grid, Play, ScatterChart, ShieldCheck } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { DistanceMetric, VectorMatrixResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface VectorSpacePanelProps {
  candidateLines: string;
  metric: DistanceMetric;
  matrixResult: VectorMatrixResponse | null;
  loading: boolean;
  isDark: boolean;
  onChangeCandidates: (val: string) => void;
  onChangeMetric: (m: DistanceMetric) => void;
  onCompute: () => void;
}

export const VectorSpacePanel: React.FC<VectorSpacePanelProps> = ({
  candidateLines,
  metric,
  matrixResult,
  loading,
  isDark,
  onChangeCandidates,
  onChangeMetric,
  onCompute,
}) => {
  const heatmapData: Data[] = matrixResult
    ? [
        {
          type: 'heatmap',
          z: matrixResult.matrix,
          x: matrixResult.labels,
          y: matrixResult.labels,
          colorscale: metric === 'cosine_similarity' ? 'RdBu' : 'Viridis',
          reversescale: metric === 'cosine_similarity',
          zmin: metric === 'cosine_similarity' ? -1 : undefined,
          zmax: metric === 'cosine_similarity' ? 1 : undefined,
          text:
            matrixResult.labels.length <= 12
              ? (matrixResult.matrix.map((row) =>
                  row.map((v) => v.toFixed(2))
                ) as unknown as string[])
              : undefined,
          texttemplate: matrixResult.labels.length <= 12 ? '%{text}' : undefined,
        },
      ]
    : [];

  const spaceTraces: Data[] = matrixResult
    ? [
        {
          type: 'scatter',
          mode: 'markers+text',
          x: matrixResult.coordinates_2d.map((c) => c.x),
          y: matrixResult.coordinates_2d.map((c) => c.y),
          text: matrixResult.coordinates_2d.map((c) => c.label),
          textposition: 'top center',
          hovertext: matrixResult.coordinates_2d.map(
            (c) => `${c.label}<br>x: ${c.x}, y: ${c.y}<br>||v||: ${c.norm_l2}`
          ),
          hoverinfo: 'text',
          marker: { size: 12, color: '#22c55e', line: { color: '#ffffff', width: 1 } },
          name: 'Vectors',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <label
            htmlFor="space-candidates-input"
            className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Vector Collection (<code>Label | v1, v2, ...</code>)
          </label>
          <div className="flex items-center space-x-2">
            <select
              aria-label="Matrix metric"
              value={metric}
              onChange={(e) => onChangeMetric(e.target.value as DistanceMetric)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="cosine_similarity">Cosine Similarity</option>
              <option value="euclidean_distance">Euclidean (L2) Distance</option>
              <option value="manhattan_distance">Manhattan (L1) Distance</option>
              <option value="dot_product">Dot Product</option>
            </select>
            <button
              type="button"
              onClick={onCompute}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Computing...' : 'Compute Vector Space & Matrix'}</span>
            </button>
          </div>
        </div>

        <textarea
          id="space-candidates-input"
          rows={5}
          value={candidateLines}
          onChange={(e) => onChangeCandidates(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-900 dark:text-white"
        />
      </div>

      {matrixResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Grid className="w-4 h-4 text-brand-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Pairwise Matrix ({matrixResult.original_dimension}D)
                </h3>
              </div>
              <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-500 font-mono">
                <ShieldCheck className="w-3 h-3" />
                <span>Exact {matrixResult.original_dimension}D Math</span>
              </span>
            </div>
            <PlotlyChart
              data={heatmapData}
              isDark={isDark}
              testId="vector-matrix-heatmap"
              className="w-full h-80"
              layout={{
                margin: { l: 96, r: 24, t: 24, b: 84 },
                yaxis: { autorange: 'reversed' },
              }}
            />
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ScatterChart className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  2D Vector Space View
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {matrixResult.projection_method === 'direct_2d'
                  ? 'Direct 2D Coordinates'
                  : 'PCA 2D Visual Projection'}
              </span>
            </div>
            <PlotlyChart
              data={spaceTraces}
              isDark={isDark}
              testId="vector-space-plot"
              className="w-full h-80"
              layout={{
                xaxis: { title: { text: 'Axis 1' } },
                yaxis: { title: { text: 'Axis 2' } },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
