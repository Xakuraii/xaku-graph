import React, { useState } from 'react';
import { BarChart3, ListOrdered, Search, ShieldCheck } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { DistanceMetric, VectorSearchResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface VectorRankingPanelProps {
  queryStr: string;
  candidateLines: string;
  metric: DistanceMetric;
  searchResult: VectorSearchResponse | null;
  loading: boolean;
  isDark?: boolean;
  onChangeQuery: (val: string) => void;
  onChangeCandidates: (val: string) => void;
  onChangeMetric: (m: DistanceMetric) => void;
  onSearch: () => void;
}

const METRIC_OPTIONS: { id: DistanceMetric; label: string }[] = [
  { id: 'cosine_similarity', label: 'Cosine Similarity (Higher = Closer)' },
  { id: 'euclidean_distance', label: 'Euclidean L2 Distance (Lower = Closer)' },
  { id: 'dot_product', label: 'Dot Product (Higher = Stronger)' },
  { id: 'manhattan_distance', label: 'Manhattan L1 Distance (Lower = Closer)' },
];

export const VectorRankingPanel: React.FC<VectorRankingPanelProps> = ({
  queryStr,
  candidateLines,
  metric,
  searchResult,
  loading,
  isDark = true,
  onChangeQuery,
  onChangeCandidates,
  onChangeMetric,
  onSearch,
}) => {
  const [chartMode, setChartMode] = useState<'bar' | 'profile'>('bar');
  const reversed = searchResult ? [...searchResult.results].reverse() : [];
  const rankChartData: Data[] = searchResult
    ? chartMode === 'profile'
      ? [
          {
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Cosine Sim',
            x: searchResult.results.map((r) => r.label),
            y: searchResult.results.map((r) => r.cosine_similarity),
            line: { color: '#22c55e', width: 2 },
          },
          {
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Euclidean L2',
            x: searchResult.results.map((r) => r.label),
            y: searchResult.results.map((r) => r.euclidean_distance),
            line: { color: '#38bdf8', width: 2 },
          },
          {
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Dot Product',
            x: searchResult.results.map((r) => r.label),
            y: searchResult.results.map((r) => r.dot_product),
            line: { color: '#a855f7', width: 2, dash: 'dot' },
          },
        ]
      : [
          {
            type: 'bar',
            orientation: 'h',
            y: reversed.map((r) => `#${r.rank} ${r.label}`),
            x: reversed.map((r) => r.score),
            text: reversed.map((r) => r.score.toFixed(4)),
            textposition: 'auto',
            marker: { color: '#22c55e' },
            name: searchResult.metric,
          },
        ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <label
              htmlFor="query-vec-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Query Vector
            </label>
            <textarea
              id="query-vec-input"
              rows={2}
              value={queryStr}
              onChange={(e) => onChangeQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="ranking-metric-select"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Ranking Metric
            </label>
            <select
              id="ranking-metric-select"
              value={metric}
              onChange={(e) => onChangeMetric(e.target.value as DistanceMetric)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {METRIC_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="candidate-vecs-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Candidate Vectors (one per line: <code>Label | v1, v2, ...</code>)
            </label>
          </div>
          <textarea
            id="candidate-vecs-input"
            rows={6}
            value={candidateLines}
            onChange={(e) => onChangeCandidates(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Ranking...' : 'Rank Nearest Neighbors'}</span>
        </button>
      </div>

      {searchResult && (
        <div className="space-y-6">
          {searchResult.results.length > 0 && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-brand-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {chartMode === 'profile'
                      ? 'Multi-Metric Comparison Across Candidates'
                      : `Candidate Ranking Score Comparison (${searchResult.metric})`}
                  </h3>
                </div>
                <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setChartMode('bar')}
                    className={`px-2 py-0.5 rounded ${
                      chartMode === 'bar'
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Score Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('profile')}
                    className={`px-2 py-0.5 rounded ${
                      chartMode === 'profile'
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Multi-Metric
                  </button>
                </div>
              </div>
              <PlotlyChart
                data={rankChartData}
                isDark={isDark}
                testId="vector-ranking-chart"
                className="w-full h-64"
                layout={
                  chartMode === 'profile'
                    ? {
                        xaxis: { tickangle: -15 },
                        yaxis: { title: { text: 'Metric Value' } },
                        legend: { orientation: 'h', y: 1.15 },
                      }
                    : {
                        margin: { l: 110, r: 24, t: 12, b: 36 },
                        xaxis: { title: { text: searchResult.metric } },
                      }
                }
              />
            </div>
          )}

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ListOrdered className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Nearest-Neighbor Ranking ({searchResult.total_candidates} candidates ·{' '}
                {searchResult.query_dimension}D)
              </h2>
            </div>
            <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Original {searchResult.query_dimension}D Coordinates</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Cosine Sim</th>
                  <th className="px-4 py-3 font-medium">Euclidean (L2)</th>
                  <th className="px-4 py-3 font-medium">Manhattan (L1)</th>
                  <th className="px-4 py-3 font-medium">Dot Product</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-mono">
                {searchResult.results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-bold text-brand-500">#{item.rank}</td>
                    <td className="px-4 py-2.5 font-sans font-medium text-slate-900 dark:text-white">
                      {item.label}
                    </td>
                    <td className="px-4 py-2.5">{item.cosine_similarity.toFixed(4)}</td>
                    <td className="px-4 py-2.5">{item.euclidean_distance.toFixed(4)}</td>
                    <td className="px-4 py-2.5">{item.manhattan_distance.toFixed(4)}</td>
                    <td className="px-4 py-2.5">{item.dot_product.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};
