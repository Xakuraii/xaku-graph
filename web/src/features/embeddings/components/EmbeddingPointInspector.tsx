import React from 'react';
import { Binary, Compass, Loader2, ShieldCheck } from 'lucide-react';
import { PointInspectionResponse } from '../../../types/api';

interface EmbeddingPointInspectorProps {
  inspection: PointInspectionResponse | null;
  loading: boolean;
  onSelectNeighbor: (pointIndex: number) => void;
}

export const EmbeddingPointInspector: React.FC<EmbeddingPointInspectorProps> = ({
  inspection,
  loading,
  onSelectNeighbor,
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center h-96 space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        <span>Computing exact high-dimensional neighbors...</span>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center h-96 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
          <Compass className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Point & Vector Inspector
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any point on the 2D/3D projection or in the projected items list to inspect its
            original data, vector statistics, and exact high-dimensional nearest neighbors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-5">
      {/* Selected Item Content */}
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-brand-500">Item #{inspection.index}</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
            {inspection.modality} · {inspection.original_dimension}D
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{inspection.label}</h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
          {inspection.content}
        </p>

        {Object.keys(inspection.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.entries(inspection.metadata).map(([k, v]) => (
              <span
                key={k}
                className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-mono"
              >
                {k}: {String(v)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vector Stats */}
      <div className="space-y-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Binary className="w-3.5 h-3.5 text-sky-400" />
          <span>Original Vector Summary ({inspection.original_dimension}D)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block">L2 Norm</span>
            <span className="text-slate-900 dark:text-white">{inspection.vector_norm}</span>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block">Mean</span>
            <span className="text-slate-900 dark:text-white">{inspection.vector_mean}</span>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block">Min Value</span>
            <span className="text-slate-900 dark:text-white">{inspection.vector_min}</span>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block">Max Value</span>
            <span className="text-slate-900 dark:text-white">{inspection.vector_max}</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 break-all">
          [{inspection.vector_preview.slice(0, 10).join(', ')}
          {inspection.original_dimension > 10 ? ', …' : ''}]
        </div>
      </div>

      {/* Nearest Neighbors on Original Vectors */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Nearest Neighbors
          </span>
          <span
            className="inline-flex items-center space-x-1 text-[10px] text-emerald-500"
            title="Computed on original high-dimensional vectors, never 2D/3D projection coordinates"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Exact {inspection.original_dimension}D Math</span>
          </span>
        </div>

        <div className="space-y-1.5">
          {inspection.neighbors.map((n) => (
            <button
              key={n.index}
              type="button"
              onClick={() => onSelectNeighbor(n.index)}
              className="w-full text-left p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {n.label}
                </span>
                <span className="font-mono text-brand-500 shrink-0 ml-2">
                  cos: {n.cosine_similarity.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span className="truncate">{n.snippet}</span>
                <span className="font-mono shrink-0 ml-2">
                  L2: {n.euclidean_distance.toFixed(3)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
