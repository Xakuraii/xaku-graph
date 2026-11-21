import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Search, Sparkles } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';
import { MlRunDetail } from '../../../types/api';

interface MlExplainabilityPanelProps {
  run: MlRunDetail;
  isDark: boolean;
}

export const MlExplainabilityPanel: React.FC<MlExplainabilityPanelProps> = ({ run, isDark }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);

  const sortedImportances = useMemo(
    () => [...run.feature_importances].sort((a, b) => a.importance - b.importance),
    [run.feature_importances]
  );

  const hasPerm = sortedImportances.some(
    (item) => item.permutation_importance !== null && item.permutation_importance !== undefined
  );

  const importanceChartData: Data[] = sortedImportances.length
    ? [
        {
          type: 'bar',
          orientation: 'h',
          name: 'Model Importance',
          y: sortedImportances.map((f) => f.feature),
          x: sortedImportances.map((f) => f.importance),
          marker: { color: '#a855f7' },
        },
        ...(hasPerm
          ? [
              {
                type: 'bar' as const,
                orientation: 'h' as const,
                name: 'Permutation Importance',
                y: sortedImportances.map((f) => f.feature),
                x: sortedImportances.map((f) => f.permutation_importance ?? 0),
                marker: { color: '#38bdf8' },
              },
            ]
          : []),
      ]
    : [];

  const filteredPredictions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = [...run.predictions];

    if (onlyErrors) {
      if (run.task_type === 'classification') {
        rows = rows.filter((r) => r.is_correct === false);
      } else {
        rows.sort((a, b) => (b.abs_error ?? 0) - (a.abs_error ?? 0));
      }
    }

    if (q) {
      rows = rows.filter((r) => {
        const haystack = [
          String(r.index),
          String(r.actual),
          String(r.predicted),
          ...Object.entries(r.features).map(([k, v]) => `${k}:${v}`),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return rows;
  }, [run.predictions, run.task_type, onlyErrors, searchQuery]);

  const errorCount =
    run.task_type === 'classification'
      ? run.predictions.filter((p) => p.is_correct === false).length
      : run.predictions.length;

  return (
    <div className="space-y-6">
      {/* Feature Importance Chart */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Feature Importance & Permutation Analysis ({run.feature_importances.length} features)
          </h3>
        </div>

        {sortedImportances.length > 0 ? (
          <PlotlyChart
            data={importanceChartData}
            isDark={isDark}
            testId="ml-feature-importance-chart"
            className="w-full h-72"
            layout={{
              barmode: 'group',
              margin: { l: 140, r: 24, t: 24, b: 40 },
              xaxis: { title: { text: 'Relative Importance Score' } },
              legend: { orientation: 'h', y: 1.12 },
            }}
          />
        ) : (
          <p className="text-xs text-slate-500 py-4">
            No feature importance scores were attached to this imported run.
          </p>
        )}
      </div>

      {/* Prediction Inspection Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Prediction Inspection ({filteredPredictions.length} / {run.predictions.length} rows)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {run.task_type === 'classification'
                ? `${errorCount} misclassified sample(s) in validation set.`
                : 'Inspect actual vs predicted values, residuals, and input feature profiles.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter predictions..."
                aria-label="Filter predictions"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyErrors((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                onlyErrors
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {run.task_type === 'classification'
                ? onlyErrors
                  ? 'Showing Errors Only'
                  : 'Errors Only'
                : onlyErrors
                ? 'Sorted by Largest Error'
                : 'Sort by Largest Error'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Actual</th>
                <th className="px-3 py-2.5 font-medium">Predicted</th>
                <th className="px-3 py-2.5 font-medium">
                  {run.task_type === 'classification' ? 'Outcome' : 'Residual'}
                </th>
                <th className="px-3 py-2.5 font-medium">
                  {run.task_type === 'classification' ? 'Confidence' : 'Abs Error'}
                </th>
                <th className="px-3 py-2.5 font-medium">Feature Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
              {filteredPredictions.slice(0, 100).map((row) => (
                <tr key={row.index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2 text-slate-500">{row.index}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                    {String(row.actual)}
                  </td>
                  <td className="px-3 py-2">{String(row.predicted)}</td>
                  <td className="px-3 py-2">
                    {run.task_type === 'classification' ? (
                      row.is_correct ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Match</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-600 dark:text-rose-400 font-sans font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Misclassified</span>
                        </span>
                      )
                    ) : (
                      <span>{row.residual?.toFixed(3) ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {run.task_type === 'classification'
                      ? row.confidence !== null && row.confidence !== undefined
                        ? `${(row.confidence * 100).toFixed(1)}%`
                        : '—'
                      : row.abs_error?.toFixed(3) ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {Object.entries(row.features)
                      .slice(0, 4)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
