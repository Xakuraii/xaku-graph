import React, { useState } from 'react';
import { AlertCircle, Info, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { useEmbeddingExplorer } from '../../hooks/useEmbeddingExplorer';
import { EmbeddingPointInspector } from './components/EmbeddingPointInspector';
import { EmbeddingProjectionPlot } from './components/EmbeddingProjectionPlot';
import { EmbeddingSpaceBar } from './components/EmbeddingSpaceBar';
import { EmbeddingSpaceBuilder } from './components/EmbeddingSpaceBuilder';
import { ProjectionControlsBar } from './components/ProjectionControlsBar';

interface EmbeddingExplorerProps {
  isDark?: boolean;
}

export const EmbeddingExplorer: React.FC<EmbeddingExplorerProps> = ({ isDark = true }) => {
  const [showBuilder, setShowBuilder] = useState(false);

  const {
    models,
    reducers,
    spaces,
    datasets,
    activeSpaceId,
    projectionParams,
    colorBy,
    setColorBy,
    projection,
    selectedPointIndex,
    pointInspection,
    loading,
    loadingProjection,
    loadingPoint,
    creating,
    error,
    selectSpace,
    updateProjectionParams,
    inspectPoint,
    createTextSpace,
    createDatasetSpace,
    createImageSpace,
    deleteSpace,
    refresh,
  } = useEmbeddingExplorer();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Embedding Visualization
            </h1>
            <StatusBadge status="live" label="Active" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inspect text and image embeddings using PCA, t-SNE, or UMAP projections with K-Means
            clustering and high-dimensional neighbor inspection.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading || loadingProjection}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 self-start"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading || loadingProjection ? 'animate-spin' : ''}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      <EmbeddingSpaceBar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        showBuilder={showBuilder}
        onSelect={selectSpace}
        onDelete={deleteSpace}
        onToggleBuilder={() => setShowBuilder((prev) => !prev)}
      />

      {showBuilder && (
        <EmbeddingSpaceBuilder
          models={models}
          datasets={datasets}
          creating={creating}
          onCreateText={createTextSpace}
          onCreateFromDataset={createDatasetSpace}
          onCreateImages={createImageSpace}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {projection?.space.is_sample && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start space-x-3">
          <Info className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Sample Embedding Space:{' '}
            </span>
            Showing 18 AI & Data Engineering concepts encoded locally with{' '}
            <code>local-text-hash-128</code>. Click <strong>New Embedding Space</strong> to encode
            your own text, dataset column, or local images.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center space-x-3 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <ProjectionControlsBar
        reducers={reducers}
        params={projectionParams}
        metadataKeys={projection?.space.metadata_keys ?? []}
        colorBy={colorBy}
        onChangeParams={updateProjectionParams}
        onChangeColorBy={setColorBy}
      />

      {projection ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8">
            <EmbeddingProjectionPlot
              projection={projection}
              colorBy={colorBy}
              selectedPointIndex={selectedPointIndex}
              loading={loadingProjection}
              isDark={isDark}
              onSelectPoint={(idx) => void inspectPoint(idx)}
            />
          </div>
          <div className="xl:col-span-4">
            <EmbeddingPointInspector
              inspection={pointInspection}
              loading={loadingPoint}
              onSelectNeighbor={(idx) => void inspectPoint(idx)}
            />
          </div>
        </div>
      ) : (
        loading && (
          <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-slate-100/60 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading embedding projection...
            </p>
          </div>
        )
      )}
    </div>
  );
};
