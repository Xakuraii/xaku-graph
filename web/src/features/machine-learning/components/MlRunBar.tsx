import React from 'react';
import { Cpu, Plus, Trash2, Upload } from 'lucide-react';
import { MlRunSummary } from '../../../types/api';

interface MlRunBarProps {
  runs: MlRunSummary[];
  activeRunId: string;
  activeRun?: MlRunSummary;
  submitting: boolean;
  onSelectRun: (runId: string) => void;
  onDeleteRun: (runId: string) => void;
  onOpenTrainBuilder: () => void;
  onOpenImportBuilder: () => void;
}

export const MlRunBar: React.FC<MlRunBarProps> = ({
  runs,
  activeRunId,
  activeRun,
  submitting,
  onSelectRun,
  onDeleteRun,
  onOpenTrainBuilder,
  onOpenImportBuilder,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Cpu className="w-4 h-4 text-purple-500" />
            <span>Evaluation Run:</span>
          </div>

          <select
            aria-label="Select ML evaluation run"
            value={activeRunId}
            onChange={(e) => onSelectRun(e.target.value)}
            className="min-w-[260px] flex-1 max-w-md rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.name} ({run.task_type} · {run.primary_metric_name}:{' '}
                {run.primary_metric_value.toFixed(3)})
              </option>
            ))}
          </select>

          {activeRun && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 uppercase">
                {activeRun.task_type}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {activeRun.source === 'sample'
                  ? 'Built-in Sample'
                  : activeRun.source === 'local_training'
                  ? 'Trained Locally'
                  : 'Imported JSON'}
              </span>
              {!activeRun.is_sample && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onDeleteRun(activeRun.id)}
                  title="Delete custom ML run"
                  aria-label="Delete ML run"
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImportBuilder}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-sky-500" />
            <span>Import Evaluation JSON</span>
          </button>

          <button
            type="button"
            onClick={onOpenTrainBuilder}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Train Local Model</span>
          </button>
        </div>
      </div>
    </div>
  );
};
