import React from 'react';
import { GitCompare, Play } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import {
  RagCollectionSummary,
  RagCompareResponse,
  RagCompareStrategy,
  RagSimilarityMetric,
} from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface RagComparePanelProps {
  query: string;
  collections: RagCollectionSummary[];
  strategyA: RagCompareStrategy;
  strategyB: RagCompareStrategy;
  compareResult: RagCompareResponse | null;
  loading: boolean;
  isDark: boolean;
  onChangeQuery: (q: string) => void;
  onChangeStrategyA: (s: RagCompareStrategy) => void;
  onChangeStrategyB: (s: RagCompareStrategy) => void;
  onCompare: () => void;
}

export const RagComparePanel: React.FC<RagComparePanelProps> = ({
  query,
  collections,
  strategyA,
  strategyB,
  compareResult,
  loading,
  isDark,
  onChangeQuery,
  onChangeStrategyA,
  onChangeStrategyB,
  onCompare,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompare();
  };

  const compareChartData: Data[] = compareResult
    ? [
        {
          type: 'bar',
          name: strategyA.label,
          x: compareResult.comparison_items.map((i) => `${i.doc_title} #${i.chunk_index}`),
          y: compareResult.comparison_items.map((i) => i.score_a ?? 0),
          marker: { color: '#22c55e' },
        },
        {
          type: 'bar',
          name: strategyB.label,
          x: compareResult.comparison_items.map((i) => `${i.doc_title} #${i.chunk_index}`),
          y: compareResult.comparison_items.map((i) => i.score_b ?? 0),
          marker: { color: '#38bdf8' },
        },
      ]
    : [];

  const overlapChartData: Data[] = compareResult
    ? [
        {
          type: 'pie',
          labels: ['Both Strategies', 'Only Strategy A', 'Only Strategy B'],
          values: [
            compareResult.comparison_items.filter((i) => i.status === 'both').length,
            compareResult.comparison_items.filter((i) => i.status === 'only_a').length,
            compareResult.comparison_items.filter((i) => i.status === 'only_b').length,
          ],
          hole: 0.45,
          marker: { colors: ['#22c55e', '#f59e0b', '#38bdf8'] },
          textinfo: 'label+value',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            Shared Evaluation Query
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            aria-label="Comparison query"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            { title: 'Strategy A', state: strategyA, setter: onChangeStrategyA },
            { title: 'Strategy B', state: strategyB, setter: onChangeStrategyB },
          ].map(({ title, state, setter }) => (
            <div
              key={title}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3"
            >
              <span className="font-semibold text-slate-900 dark:text-white block">{title}</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Collection</label>
                  <select
                    aria-label={`${title} collection`}
                    value={state.collection_id}
                    onChange={(e) => setter({ ...state, collection_id: e.target.value })}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-slate-900 dark:text-white"
                  >
                    {collections.length === 0 ? (
                      <option value="sample-xakugraph-rag-docs">Sample KB</option>
                    ) : (
                      collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Metric</label>
                  <select
                    aria-label={`${title} metric`}
                    value={state.metric}
                    onChange={(e) =>
                      setter({ ...state, metric: e.target.value as RagSimilarityMetric })
                    }
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="cosine_similarity">Cosine Similarity</option>
                    <option value="euclidean_distance">Euclidean L2</option>
                    <option value="dot_product">Dot Product</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Top-K</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={state.top_k}
                    onChange={(e) => setter({ ...state, top_k: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Comparing...' : 'Compare Retrieval Results'}</span>
          </button>
        </div>
      </form>

      {compareResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-600 dark:text-slate-400">Shared Chunks</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {compareResult.overlap_count}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-600 dark:text-slate-400">Jaccard Overlap</span>
              <p className="text-2xl font-bold text-brand-500 mt-1 font-mono">
                {(compareResult.jaccard_overlap * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-600 dark:text-slate-400">Strategy A Hits</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {compareResult.run_a.results.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-600 dark:text-slate-400">Strategy B Hits</span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {compareResult.run_b.results.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <GitCompare className="w-4 h-4 text-brand-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Score Comparison Across Retrieved Chunks
                </h3>
              </div>
              <PlotlyChart
                data={compareChartData}
                isDark={isDark}
                testId="rag-compare-chart"
                className="w-full h-72"
                layout={{ barmode: 'group', xaxis: { tickangle: -20 } }}
              />
            </div>

            <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Retrieval Agreement Split
              </h3>
              <PlotlyChart
                data={overlapChartData}
                isDark={isDark}
                testId="rag-overlap-chart"
                className="w-full h-72"
                layout={{
                  margin: { l: 16, r: 16, t: 16, b: 16 },
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.05 },
                }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document & Chunk</th>
                    <th className="px-4 py-3 font-medium">Presence</th>
                    <th className="px-4 py-3 font-medium">Rank A</th>
                    <th className="px-4 py-3 font-medium">Rank B</th>
                    <th className="px-4 py-3 font-medium">Rank Delta</th>
                    <th className="px-4 py-3 font-medium">Score A</th>
                    <th className="px-4 py-3 font-medium">Score B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-mono">
                  {compareResult.comparison_items.map((item) => (
                    <tr key={item.chunk_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-sans font-medium text-slate-900 dark:text-white">
                        {item.doc_title} (#{item.chunk_index})
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium ${
                            item.status === 'both'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : item.status === 'only_a'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                          }`}
                        >
                          {item.status === 'both'
                            ? 'Both'
                            : item.status === 'only_a'
                            ? 'Only A'
                            : 'Only B'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{item.rank_a ?? '—'}</td>
                      <td className="px-4 py-2.5">{item.rank_b ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {item.rank_delta === null || item.rank_delta === undefined
                          ? '—'
                          : item.rank_delta > 0
                          ? `▲ +${item.rank_delta}`
                          : item.rank_delta < 0
                          ? `▼ ${item.rank_delta}`
                          : '0'}
                      </td>
                      <td className="px-4 py-2.5">
                        {item.score_a !== null && item.score_a !== undefined
                          ? item.score_a.toFixed(4)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {item.score_b !== null && item.score_b !== undefined
                          ? item.score_b.toFixed(4)
                          : '—'}
                      </td>
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
