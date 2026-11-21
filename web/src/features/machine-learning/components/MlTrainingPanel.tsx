import React from 'react';
import { Activity, Layers, LineChart, Target } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';
import { MlRunDetail } from '../../../types/api';

interface MlTrainingPanelProps {
  run: MlRunDetail;
  isDark: boolean;
}

export const MlTrainingPanel: React.FC<MlTrainingPanelProps> = ({ run, isDark }) => {
  const hasHistory = run.training_history.length > 0;
  const hasScores = run.training_history.some(
    (pt) => pt.train_score !== null && pt.train_score !== undefined
  );

  const lossData: Data[] = [
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Train Loss',
      x: run.training_history.map((p) => p.label),
      y: run.training_history.map((p) => p.train_loss),
      line: { color: '#22c55e', width: 2.5 },
      marker: { size: 6 },
    },
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Validation Loss',
      x: run.training_history.map((p) => p.label),
      y: run.training_history.map((p) => p.val_loss),
      line: { color: '#38bdf8', width: 2.5, dash: 'dot' },
      marker: { size: 6 },
    },
  ];

  const scoreLabel = run.task_type === 'classification' ? 'Accuracy' : 'R² Score';
  const scoreData: Data[] = [
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: `Train ${scoreLabel}`,
      x: run.training_history.map((p) => p.label),
      y: run.training_history.map((p) => p.train_score ?? null),
      line: { color: '#a855f7', width: 2.5 },
      marker: { size: 6 },
    },
    {
      type: 'scatter',
      mode: 'lines+markers',
      name: `Val ${scoreLabel}`,
      x: run.training_history.map((p) => p.label),
      y: run.training_history.map((p) => p.val_score ?? null),
      line: { color: '#f59e0b', width: 2.5, dash: 'dot' },
      marker: { size: 6 },
    },
  ];

  const secondaryLabel =
    run.task_type === 'classification' ? 'Macro F1-Score' : 'Validation RMSE';
  const secondaryValue =
    run.task_type === 'classification'
      ? run.classification
        ? `${(run.classification.f1_macro * 100).toFixed(1)}%`
        : '—'
      : run.regression
      ? run.regression.rmse.toFixed(3)
      : '—';

  const primaryDisplay =
    run.task_type === 'classification'
      ? `${(run.primary_metric_value * 100).toFixed(1)}%`
      : run.primary_metric_value.toFixed(4);

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{run.task_type === 'classification' ? 'Validation Accuracy' : 'Validation R²'}</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {primaryDisplay}
          </p>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            Target: {run.target_column}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{secondaryLabel}</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {secondaryValue}
          </p>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            Algorithm: {run.algorithm}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Split Samples</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {run.train_count > 0 ? `${run.train_count} / ${run.val_count}` : run.val_count}
          </p>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            {run.train_count > 0 ? 'Train / Validation' : 'Evaluated Predictions'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Training Steps</span>
            <LineChart className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1.5">
            {run.training_history.length}
          </p>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            {run.feature_columns.length} input features
          </span>
        </div>
      </div>

      {/* Training & Validation Charts */}
      {hasHistory ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Training & Validation Loss ({run.task_type === 'classification' ? 'Log Loss' : 'MSE'})
            </h3>
            <PlotlyChart
              data={lossData}
              isDark={isDark}
              testId="ml-loss-chart"
              className="w-full h-72"
              layout={{
                xaxis: { title: { text: 'Training Step' } },
                yaxis: { title: { text: 'Loss' } },
                legend: { orientation: 'h', y: 1.12 },
              }}
            />
          </div>

          {hasScores && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Training & Validation {scoreLabel}
              </h3>
              <PlotlyChart
                data={scoreData}
                isDark={isDark}
                testId="ml-score-chart"
                className="w-full h-72"
                layout={{
                  xaxis: { title: { text: 'Training Step' } },
                  yaxis: { title: { text: scoreLabel } },
                  legend: { orientation: 'h', y: 1.12 },
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          This imported evaluation run did not include epoch-by-epoch loss history. Switch to the
          Evaluation or Feature Importance tabs to inspect metrics and predictions.
        </div>
      )}

      {/* Feature Columns & Hyperparameters */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
            Feature Columns ({run.feature_columns.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {run.feature_columns.map((feat) => (
              <span
                key={feat}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        <div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
            Run Configuration & Hyperparameters
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(run.hyperparameters).map(([k, v]) => (
              <span
                key={k}
                className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-mono text-[11px]"
              >
                {k}: {String(v)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
