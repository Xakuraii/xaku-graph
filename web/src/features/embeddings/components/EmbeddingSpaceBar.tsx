import React from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { EmbeddingSpaceSummary } from '../../../types/api';
import { StatusBadge } from '../../../components/StatusBadge';

interface EmbeddingSpaceBarProps {
  spaces: EmbeddingSpaceSummary[];
  activeSpaceId: string;
  showBuilder: boolean;
  onSelect: (spaceId: string) => void;
  onDelete: (spaceId: string) => Promise<void>;
  onToggleBuilder: () => void;
}

export const EmbeddingSpaceBar: React.FC<EmbeddingSpaceBarProps> = ({
  spaces,
  activeSpaceId,
  showBuilder,
  onSelect,
  onDelete,
  onToggleBuilder,
}) => {
  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Active Embedding Space
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {activeSpace && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {activeSpace.modality.toUpperCase()} · {activeSpace.dimensions}D ·{' '}
                {activeSpace.item_count} items
              </span>
            )}
            {activeSpace?.is_sample && <StatusBadge status="sample" label="Sample Space" />}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            aria-label="Select embedding space"
            value={activeSpaceId}
            onChange={(e) => onSelect(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {spaces.length === 0 ? (
              <option value="sample-ai-concepts-embeddings">
                AI & Data Concepts Sample (18 texts)
              </option>
            ) : (
              spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} ({sp.modality.toUpperCase()} · {sp.model_id} · {sp.dimensions}D)
                </option>
              ))
            )}
          </select>

          {activeSpace && !activeSpace.is_sample && (
            <button
              type="button"
              onClick={() => void onDelete(activeSpace.id)}
              title="Delete embedding space"
              aria-label="Delete embedding space"
              className="p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleBuilder}
        className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shrink-0 self-end lg:self-center"
      >
        <Plus className="w-4 h-4" />
        <span>{showBuilder ? 'Close Builder' : 'New Embedding Space'}</span>
      </button>
    </div>
  );
};
