import React, { useState } from 'react';
import { BarChart3, Binary, Filter, Search, ShieldCheck } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { RagSearchResponse, RagSimilarityMetric } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface RagPlaygroundPanelProps {
  query: string;
  metric: RagSimilarityMetric;
  topK: number;
  metadataKeys: string[];
  filterKey: string;
  filterValue: string;
  searchResult: RagSearchResponse | null;
  loading: boolean;
  isDark: boolean;
  onChangeQuery: (q: string) => void;
  onChangeMetric: (m: RagSimilarityMetric) => void;
  onChangeTopK: (k: number) => void;
  onChangeFilterKey: (k: string) => void;
  onChangeFilterValue: (v: string) => void;
  onSearch: () => void;
}

export const RagPlaygroundPanel: React.FC<RagPlaygroundPanelProps> = ({
  query,
  metric,
  topK,
  metadataKeys,
  filterKey,
  filterValue,
  searchResult,
  loading,
  isDark,
  onChangeQuery,
  onChangeMetric,
  onChangeTopK,
  onChangeFilterKey,
  onChangeFilterValue,
  onSearch,
}) => {
  const [chartView, setChartView] = useState<'bar' | '3d'>('bar');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const reversedResults = searchResult ? [...searchResult.results].reverse() : [];
  const scoreChartData: Data[] = searchResult
    ? chartView === '3d'
      ? [
          {
            type: 'scatter3d',
            mode: 'markers+text',
            x: searchResult.results.map((r) => r.cosine_similarity),
            y: searchResult.results.map((r) => r.euclidean_distance),
            z: searchResult.results.map((r) => r.dot_product),
            text: searchResult.results.map((r) => `#${r.rank}`),
            hovertext: searchResult.results.map(
              (r) =>
                `Rank #${r.rank}: ${r.doc_title} (#${r.chunk_index})<br>cos=${r.cosine_similarity.toFixed(
                  4
                )}, L2=${r.euclidean_distance.toFixed(4)}, dot=${r.dot_product.toFixed(4)}`
            ),
            hoverinfo: 'text',
            marker: {
              size: 8,
              color: searchResult.results.map((r) => r.cosine_similarity),
              colorscale: 'Viridis',
              showscale: true,
            },
            name: 'Retrieved Chunks',
          } as unknown as Data,
        ]
      : [
          {
            type: 'bar',
            orientation: 'h',
            y: reversedResults.map((r) => {
              const label = `${r.doc_title} (#${r.chunk_index})`;
              return label.length > 28 ? `${label.slice(0, 26)}…` : label;
            }),
            x: reversedResults.map((r) => r.score),
            text: reversedResults.map((r) => r.score.toFixed(4)),
            textposition: 'auto',
            marker: { color: '#22c55e' },
            name: metric,
          },
        ]
    : [];

  return (
    <div className="space-y-6">
      {/* Query Bar */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Enter a natural language RAG retrieval query..."
              aria-label="RAG query input"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'Retrieving...' : 'Run Retrieval Search'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 dark:text-slate-400">Metric:</span>
            <select
              aria-label="Retrieval metric"
              value={metric}
              onChange={(e) => onChangeMetric(e.target.value as RagSimilarityMetric)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-white"
            >
              <option value="cosine_similarity">Cosine Similarity</option>
              <option value="euclidean_distance">Euclidean L2 Distance</option>
              <option value="dot_product">Dot Product</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="rag-topk" className="text-slate-500 dark:text-slate-400">
              Top-K:{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {topK}
              </span>
            </label>
            <input
              id="rag-topk"
              type="range"
              min={1}
              max={15}
              step={1}
              value={topK}
              onChange={(e) => onChangeTopK(Number(e.target.value))}
              className="w-24 accent-brand-500"
            />
          </div>

          {metadataKeys.length > 0 && (
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Metadata filter key"
                value={filterKey}
                onChange={(e) => {
                  onChangeFilterKey(e.target.value);
                  onChangeFilterValue('');
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-white"
              >
                <option value="">All Metadata</option>
                {metadataKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <input
                type="text"
                disabled={!filterKey}
                value={filterValue}
                onChange={(e) => onChangeFilterValue(e.target.value)}
                placeholder="Match value..."
                aria-label="Metadata filter value"
                className="w-32 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </form>

      {searchResult && (
        <div className="space-y-6">
          {/* Query Vector Summary */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 font-mono text-slate-600 dark:text-slate-300">
              <Binary className="w-4 h-4 text-sky-500 shrink-0" />
              <span>
                Query Vector ({searchResult.query_vector_dimension}D via{' '}
                <strong>{searchResult.model_id}</strong>): [
                {searchResult.query_vector_preview.slice(0, 6).join(', ')}, …]
              </span>
            </div>
            <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {searchResult.results.length} / {searchResult.total_candidates} chunks ranked
              </span>
            </span>
          </div>

          {/* Query-to-Document Score Chart */}
          {searchResult.results.length > 0 && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-brand-500" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {chartView === '3d'
                      ? '3D Retrieval Metric Space (Cosine · L2 · Dot)'
                      : `Query-to-Document Retrieval Ranking (${searchResult.metric})`}
                  </h3>
                </div>
                <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setChartView('bar')}
                    className={`px-2 py-0.5 rounded ${
                      chartView === 'bar'
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Score Bar
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('3d')}
                    className={`px-2 py-0.5 rounded ${
                      chartView === '3d'
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    3D Metrics
                  </button>
                </div>
              </div>
              <PlotlyChart
                data={scoreChartData}
                isDark={isDark}
                testId="rag-retrieval-chart"
                className="w-full h-72"
                layout={
                  chartView === '3d'
                    ? {
                        margin: { l: 12, r: 12, t: 20, b: 12 },
                        scene: {
                          xaxis: { title: { text: 'Cosine Sim' } },
                          yaxis: { title: { text: 'Euclidean L2' } },
                          zaxis: { title: { text: 'Dot Product' } },
                        },
                      }
                    : {
                        margin: { l: 110, r: 24, t: 16, b: 40 },
                        xaxis: { title: { text: searchResult.metric } },
                      }
                }
              />
            </div>
          )}

          {/* Retrieved Chunks Cards */}
          <div className="space-y-3">
            {searchResult.results.map((hit) => (
              <div
                key={hit.chunk_id}
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono px-2 py-0.5 rounded bg-brand-500/15 text-brand-700 dark:text-brand-400 font-bold">
                      Rank #{hit.rank}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {hit.doc_title}
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">Chunk #{hit.chunk_index}</span>
                  </div>

                  <div className="flex items-center space-x-3 font-mono text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      cos: {hit.cosine_similarity.toFixed(4)}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      L2: {hit.euclidean_distance.toFixed(4)}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">dot: {hit.dot_product.toFixed(4)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                  {hit.content}
                </p>

                {Object.keys(hit.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(hit.metadata).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                      >
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
