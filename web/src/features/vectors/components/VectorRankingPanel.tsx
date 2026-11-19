import React from 'react';
import { ListOrdered, Search, ShieldCheck } from 'lucide-react';
import { DistanceMetric, VectorSearchResponse } from '../../../types/api';

interface VectorRankingPanelProps {
  queryStr: string;
  candidateLines: string;
  metric: DistanceMetric;
  searchResult: VectorSearchResponse | null;
  loading: boolean;
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
  onChangeQuery,
  onChangeCandidates,
  onChangeMetric,
  onSearch,
}) => {
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
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Ranking...' : 'Rank Nearest Neighbors'}</span>
        </button>
      </div>

      {searchResult && (
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
      )}
    </div>
  );
};
