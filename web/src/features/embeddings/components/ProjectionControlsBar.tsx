import React from 'react';
import { Filter, Sliders } from 'lucide-react';
import { ProjectionRequest, ReducerInfo, ReductionMethod } from '../../../types/api';

interface ProjectionControlsBarProps {
  reducers: ReducerInfo[];
  params: ProjectionRequest;
  metadataKeys: string[];
  colorBy: string;
  onChangeParams: (patch: Partial<ProjectionRequest>) => void;
  onChangeColorBy: (colorBy: string) => void;
}

export const ProjectionControlsBar: React.FC<ProjectionControlsBarProps> = ({
  reducers,
  params,
  metadataKeys,
  colorBy,
  onChangeParams,
  onChangeColorBy,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        {/* Dimensionality Reduction Method */}
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Projection:
          </span>
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-xs">
            {(reducers.length > 0
              ? reducers
              : ([
                  { method: 'pca', name: 'PCA', available: true },
                  { method: 'tsne', name: 't-SNE', available: true },
                  { method: 'umap', name: 'UMAP', available: false, install_hint: 'Optional' },
                ] as ReducerInfo[])
            ).map((r) => (
              <button
                key={r.method}
                type="button"
                disabled={!r.available}
                title={r.available ? r.name : r.install_hint ?? 'Unavailable'}
                onClick={() => onChangeParams({ method: r.method as ReductionMethod })}
                className={`px-3 py-1 rounded-md uppercase font-medium transition-colors ${
                  params.method === r.method
                    ? 'bg-brand-600 text-slate-950 font-semibold'
                    : r.available
                    ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                {r.method}
                {!r.available && ' (opt)'}
              </button>
            ))}
          </div>
        </div>

        {/* 2D / 3D Toggle */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">View:</span>
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950">
            {([2, 3] as const).map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => onChangeParams({ dimensions: dim })}
                className={`px-2.5 py-1 rounded-md font-mono font-medium transition-colors ${
                  params.dimensions === dim
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {dim}D
              </button>
            ))}
          </div>
        </div>

        {/* KMeans Clusters */}
        <div className="flex items-center space-x-2 text-xs">
          <label htmlFor="kmeans-clusters" className="text-slate-500 dark:text-slate-400">
            Clusters (K):{' '}
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {params.n_clusters}
            </span>
          </label>
          <input
            id="kmeans-clusters"
            type="range"
            min={0}
            max={8}
            step={1}
            value={params.n_clusters}
            onChange={(e) => onChangeParams({ n_clusters: Number(e.target.value) })}
            className="w-24 accent-brand-500"
          />
        </div>

        {/* Perplexity for t-SNE / UMAP */}
        {params.method !== 'pca' && (
          <div className="flex items-center space-x-2 text-xs">
            <label htmlFor="tsne-perplexity" className="text-slate-500 dark:text-slate-400">
              {params.method === 'tsne' ? 'Perplexity:' : 'Neighbors:'}{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {params.perplexity}
              </span>
            </label>
            <input
              id="tsne-perplexity"
              type="range"
              min={2}
              max={30}
              step={1}
              value={params.perplexity}
              onChange={(e) => onChangeParams({ perplexity: Number(e.target.value) })}
              className="w-24 accent-brand-500"
            />
          </div>
        )}
      </div>

      {/* Color By & Metadata Filter Row */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Color By:</span>
          <select
            aria-label="Color points by"
            value={colorBy}
            onChange={(e) => onChangeColorBy(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-white"
          >
            <option value="cluster">K-Means Cluster</option>
            {metadataKeys.map((k) => (
              <option key={k} value={k}>
                Metadata: {k}
              </option>
            ))}
          </select>
        </div>

        {metadataKeys.length > 0 && (
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Filter:</span>
            <select
              aria-label="Metadata filter key"
              value={params.filter_key ?? ''}
              onChange={(e) =>
                onChangeParams({ filter_key: e.target.value, filter_value: '' })
              }
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
              placeholder="Filter value..."
              aria-label="Metadata filter value"
              disabled={!params.filter_key}
              value={params.filter_value ?? ''}
              onChange={(e) => onChangeParams({ filter_value: e.target.value })}
              className="w-36 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-white disabled:opacity-50"
            />
          </div>
        )}
      </div>
    </div>
  );
};
