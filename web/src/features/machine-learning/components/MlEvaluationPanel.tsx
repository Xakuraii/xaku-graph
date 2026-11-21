import React, { useState } from 'react';
import { BarChart3, Grid3X3, TrendingUp } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';
import { MlRunDetail } from '../../../types/api';

interface MlEvaluationPanelProps {
  run: MlRunDetail;
  isDark: boolean;
}

export const MlEvaluationPanel: React.FC<MlEvaluationPanelProps> = ({ run, isDark }) => {
  const [normalizedCm, setNormalizedCm] = useState(false);
  const [cmView, setCmView] = useState<'heatmap' | 'surface3d'>('heatmap');
  const [regView, setRegView] = useState<'2d' | '3d'>('2d');

  if (run.task_type === 'classification' && run.classification) {
    const cls = run.classification;
    const cm = cls.confusion_matrix;
    const zValues = normalizedCm
      ? cm.normalized_matrix.map((row) => row.map((v) => Number((v * 100).toFixed(1))))
      : cm.matrix;

    const cmData: Data[] =
      cmView === 'surface3d'
        ? [
            {
              type: 'surface',
              x: cm.labels,
              y: cm.labels,
              z: zValues,
              colorscale: 'Viridis',
              showscale: true,
            } as unknown as Data,
          ]
        : [
            {
              type: 'heatmap',
              x: cm.labels,
              y: cm.labels,
              z: zValues,
              colorscale: 'Viridis',
              showscale: true,
              text: zValues.map((row) =>
                row.map((v) => (normalizedCm ? `${v}%` : String(v)))
              ) as unknown as string[],
              texttemplate: '%{text}',
              hovertemplate: normalizedCm
                ? 'Actual: %{y}<br>Predicted: %{x}<br>Rate: %{z:.1f}%<extra></extra>'
                : 'Actual: %{y}<br>Predicted: %{x}<br>Count: %{z}<extra></extra>',
            },
          ];

    const perClassData: Data[] = [
      {
        type: 'bar',
        name: 'Precision',
        x: cls.per_class.map((c) => c.label),
        y: cls.per_class.map((c) => c.precision),
        marker: { color: '#22c55e' },
      },
      {
        type: 'bar',
        name: 'Recall',
        x: cls.per_class.map((c) => c.label),
        y: cls.per_class.map((c) => c.recall),
        marker: { color: '#38bdf8' },
      },
      {
        type: 'bar',
        name: 'F1-Score',
        x: cls.per_class.map((c) => c.label),
        y: cls.per_class.map((c) => c.f1_score),
        marker: { color: '#a855f7' },
      },
    ];

    const correctConf = run.predictions
      .filter((p) => p.is_correct === true && p.confidence !== null && p.confidence !== undefined)
      .map((p) => (p.confidence as number) * 100);
    const wrongConf = run.predictions
      .filter((p) => p.is_correct === false && p.confidence !== null && p.confidence !== undefined)
      .map((p) => (p.confidence as number) * 100);

    const confidenceData: Data[] =
      correctConf.length > 0 || wrongConf.length > 0
        ? [
            ...(correctConf.length > 0
              ? [
                  {
                    type: 'histogram' as const,
                    name: 'Correct Predictions',
                    x: correctConf,
                    opacity: 0.75,
                    marker: { color: '#22c55e' },
                  },
                ]
              : []),
            ...(wrongConf.length > 0
              ? [
                  {
                    type: 'histogram' as const,
                    name: 'Misclassified',
                    x: wrongConf,
                    opacity: 0.8,
                    marker: { color: '#f43f5e' },
                  },
                ]
              : []),
          ]
        : [];

    return (
      <div className="space-y-6">
        {/* Classification Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Accuracy', value: `${(cls.accuracy * 100).toFixed(2)}%` },
            { label: 'Macro Precision', value: `${(cls.precision_macro * 100).toFixed(2)}%` },
            { label: 'Macro Recall', value: `${(cls.recall_macro * 100).toFixed(2)}%` },
            { label: 'Weighted F1-Score', value: `${(cls.f1_weighted * 100).toFixed(2)}%` },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
            >
              <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confusion Matrix */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Grid3X3 className="w-4 h-4 text-brand-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Confusion Matrix
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCmView('heatmap')}
                    className={`px-2 py-0.5 rounded ${
                      cmView === 'heatmap'
                        ? 'bg-brand-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Heatmap
                  </button>
                  <button
                    type="button"
                    onClick={() => setCmView('surface3d')}
                    className={`px-2 py-0.5 rounded ${
                      cmView === 'surface3d'
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    3D Surface
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setNormalizedCm((prev) => !prev)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-brand-500"
                >
                  {normalizedCm ? 'Showing Row %' : 'Showing Raw Counts'}
                </button>
              </div>
            </div>

            <PlotlyChart
              data={cmData}
              isDark={isDark}
              testId="ml-confusion-matrix"
              className="w-full h-80"
              layout={
                cmView === 'surface3d'
                  ? {
                      margin: { l: 0, r: 0, t: 16, b: 0 },
                      scene: {
                        xaxis: { title: { text: 'Predicted' } },
                        yaxis: { title: { text: 'Actual' } },
                        zaxis: { title: { text: normalizedCm ? 'Rate %' : 'Count' } },
                      },
                    }
                  : {
                      xaxis: { title: { text: 'Predicted Class' } },
                      yaxis: { title: { text: 'Actual Class' }, autorange: 'reversed' },
                    }
              }
            />
          </div>

          {/* Per-Class Bar Chart */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-sky-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Per-Class Precision / Recall / F1
              </h3>
            </div>
            <PlotlyChart
              data={perClassData}
              isDark={isDark}
              testId="ml-per-class-chart"
              className="w-full h-80"
              layout={{
                barmode: 'group',
                yaxis: { range: [0, 1.05], title: { text: 'Score' } },
                legend: { orientation: 'h', y: 1.12 },
              }}
            />
          </div>
        </div>

        {/* Confidence Calibration Histogram */}
        {confidenceData.length > 0 && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Prediction Confidence Distribution (Correct vs Misclassified)
              </h3>
            </div>
            <PlotlyChart
              data={confidenceData}
              isDark={isDark}
              testId="ml-confidence-chart"
              className="w-full h-60"
              layout={{
                barmode: 'overlay',
                xaxis: { title: { text: 'Model Confidence (%)' }, range: [0, 105] },
                yaxis: { title: { text: 'Sample Count' } },
                legend: { orientation: 'h', y: 1.15 },
              }}
            />
          </div>
        )}

        {/* Per-Class Support Table */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Class Label</th>
                  <th className="px-4 py-3 font-medium">Precision</th>
                  <th className="px-4 py-3 font-medium">Recall</th>
                  <th className="px-4 py-3 font-medium">F1-Score</th>
                  <th className="px-4 py-3 font-medium">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                {cls.per_class.map((c) => (
                  <tr key={c.label}>
                    <td className="px-4 py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                      {c.label}
                    </td>
                    <td className="px-4 py-2.5">{(c.precision * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5">{(c.recall * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5">{(c.f1_score * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5">{c.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (run.task_type === 'regression' && run.regression) {
    const reg = run.regression;
    const actualVals = run.predictions.map((p) => Number(p.actual));
    const predVals = run.predictions.map((p) => Number(p.predicted));
    const residualVals = run.predictions.map((p) => p.residual ?? 0);

    const minVal = actualVals.length > 0 ? Math.min(...actualVals, ...predVals) : 0;
    const maxVal = actualVals.length > 0 ? Math.max(...actualVals, ...predVals) : 1;

    const predVsActualData: Data[] = [
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Predictions',
        x: actualVals,
        y: predVals,
        marker: { color: '#38bdf8', size: 7, opacity: 0.85 },
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Ideal (y = x)',
        x: [minVal, maxVal],
        y: [minVal, maxVal],
        line: { color: '#22c55e', width: 2, dash: 'dash' },
      },
    ];

    const residualData: Data[] = [
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Residual (Actual - Pred)',
        x: predVals,
        y: residualVals,
        marker: { color: '#f59e0b', size: 7, opacity: 0.85 },
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Zero Error',
        x: [minVal, maxVal],
        y: [0, 0],
        line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'R² Score', value: reg.r2.toFixed(4) },
            { label: 'RMSE', value: reg.rmse.toFixed(4) },
            { label: 'MAE', value: reg.mae.toFixed(4) },
            { label: 'MSE', value: reg.mse.toFixed(4) },
            { label: 'Explained Var', value: reg.explained_variance.toFixed(4) },
            { label: 'Max Error', value: reg.max_error.toFixed(4) },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
            >
              <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {regView === '3d'
                    ? '3D Actual · Predicted · |Error| Manifold'
                    : 'Predicted vs Actual Target'}
                </h3>
              </div>
              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRegView('2d')}
                  className={`px-2 py-0.5 rounded ${
                    regView === '2d'
                      ? 'bg-brand-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  2D Scatter
                </button>
                <button
                  type="button"
                  onClick={() => setRegView('3d')}
                  className={`px-2 py-0.5 rounded ${
                    regView === '3d'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  3D Manifold
                </button>
              </div>
            </div>
            <PlotlyChart
              data={
                regView === '3d'
                  ? [
                      {
                        type: 'scatter3d',
                        mode: 'markers',
                        name: 'Samples',
                        x: actualVals,
                        y: predVals,
                        z: residualVals.map((v) => Math.abs(v)),
                        marker: {
                          size: 5,
                          color: residualVals.map((v) => Math.abs(v)),
                          colorscale: 'YlOrRd',
                          showscale: true,
                        },
                      } as unknown as Data,
                    ]
                  : predVsActualData
              }
              isDark={isDark}
              testId="ml-pred-vs-actual"
              className="w-full h-80"
              layout={
                regView === '3d'
                  ? {
                      margin: { l: 0, r: 0, t: 16, b: 0 },
                      scene: {
                        xaxis: { title: { text: 'Actual' } },
                        yaxis: { title: { text: 'Predicted' } },
                        zaxis: { title: { text: '|Residual|' } },
                      },
                    }
                  : {
                      xaxis: { title: { text: 'Actual Value' } },
                      yaxis: { title: { text: 'Predicted Value' } },
                      legend: { orientation: 'h', y: 1.12 },
                    }
              }
            />
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Residuals vs Predicted Value
              </h3>
            </div>
            <PlotlyChart
              data={residualData}
              isDark={isDark}
              testId="ml-residuals-chart"
              className="w-full h-80"
              layout={{
                xaxis: { title: { text: 'Predicted Value' } },
                yaxis: { title: { text: 'Residual (Actual - Pred)' } },
                legend: { orientation: 'h', y: 1.12 },
              }}
            />
          </div>
        </div>

        {residualVals.length > 0 && (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-sky-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Residual Error Distribution
              </h3>
            </div>
            <PlotlyChart
              data={[
                {
                  type: 'histogram',
                  name: 'Residuals',
                  x: residualVals,
                  marker: { color: '#38bdf8', line: { color: '#0284c7', width: 1 } },
                },
              ]}
              isDark={isDark}
              testId="ml-residual-hist-chart"
              className="w-full h-60"
              layout={{
                xaxis: { title: { text: 'Residual (Actual - Predicted)' } },
                yaxis: { title: { text: 'Sample Count' } },
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
};
