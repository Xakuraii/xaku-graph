import React, { useEffect, useState } from 'react';
import { BarChart3, SlidersHorizontal } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { DatasetDistributionsResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface DatasetDistributionsPanelProps {
  data: DatasetDistributionsResponse | null;
  bins: number;
  loading: boolean;
  isDark: boolean;
  onChangeBins: (bins: number) => void;
}

export const DatasetDistributionsPanel: React.FC<DatasetDistributionsPanelProps> = ({
  data,
  bins,
  loading,
  isDark,
  onChangeBins,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');

  useEffect(() => {
    if (data && data.distributions.length > 0) {
      const exists = data.distributions.some((d) => d.column === selectedColumn);
      if (!exists) {
        setSelectedColumn(data.distributions[0].column);
      }
    }
  }, [data, selectedColumn]);

  if (loading && !data) {
    return (
      <div className="h-64 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs text-slate-500">
        Computing distributions and quartiles...
      </div>
    );
  }

  if (!data || data.distributions.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        No columns available for distribution analysis.
      </div>
    );
  }

  const activeDist =
    data.distributions.find((d) => d.column === selectedColumn) ?? data.distributions[0];

  const histogramTraces: Data[] =
    activeDist.kind === 'numeric' && activeDist.histogram
      ? [
          {
            type: 'bar',
            x: activeDist.histogram.map((b) =>
              b.start === b.end ? b.start.toFixed(2) : `${b.start.toFixed(2)}–${b.end.toFixed(2)}`
            ),
            y: activeDist.histogram.map((b) => b.count),
            marker: { color: '#22c55e', line: { color: '#16a34a', width: 1 } },
            name: activeDist.column,
          },
        ]
      : [];

  const boxplotTraces: Data[] =
    activeDist.kind === 'numeric' && activeDist.boxplot
      ? [
          {
            type: 'box',
            name: activeDist.column,
            x: [activeDist.column],
            q1: [activeDist.boxplot.q1],
            median: [activeDist.boxplot.median],
            q3: [activeDist.boxplot.q3],
            lowerfence: [activeDist.boxplot.lower_fence],
            upperfence: [activeDist.boxplot.upper_fence],
            marker: { color: '#38bdf8' },
            line: { color: '#38bdf8' },
            fillcolor: 'rgba(56, 189, 248, 0.2)',
          } as unknown as Data,
          ...(activeDist.boxplot.sample_outliers.length > 0
            ? [
                {
                  type: 'scatter' as const,
                  mode: 'markers' as const,
                  name: 'Outliers',
                  x: activeDist.boxplot.sample_outliers.map(() => activeDist.column),
                  y: activeDist.boxplot.sample_outliers,
                  marker: { color: '#f43f5e', size: 7, symbol: 'circle-open' as const },
                },
              ]
            : []),
        ]
      : [];

  const categoryTraces: Data[] =
    activeDist.kind === 'categorical' && activeDist.categories
      ? [
          {
            type: 'bar',
            x: activeDist.categories.map((c) => c.value),
            y: activeDist.categories.map((c) => c.count),
            text: activeDist.categories.map((c) => `${c.percentage}%`),
            textposition: 'auto',
            marker: { color: '#818cf8' },
            name: activeDist.column,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-4 h-4 text-brand-500" />
          <label
            htmlFor="dist-col-select"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Inspect Column:
          </label>
          <select
            id="dist-col-select"
            value={activeDist.column}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {data.distributions.map((d) => (
              <option key={d.column} value={d.column}>
                {d.column} ({d.kind} · {d.dtype})
              </option>
            ))}
          </select>
        </div>

        {activeDist.kind === 'numeric' && (
          <div className="flex items-center space-x-3">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <label
              htmlFor="hist-bins-slider"
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              Histogram Bins: <span className="font-mono font-semibold text-slate-900 dark:text-white">{bins}</span>
            </label>
            <input
              id="hist-bins-slider"
              type="range"
              min={5}
              max={40}
              step={1}
              value={bins}
              onChange={(e) => onChangeBins(Number(e.target.value))}
              className="w-28 accent-brand-500"
            />
          </div>
        )}
      </div>

      {/* Numeric Column Charts (Histogram + Box Plot) */}
      {activeDist.kind === 'numeric' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Value Distribution Histogram — {activeDist.column}
              </h3>
              <PlotlyChart
                data={histogramTraces}
                isDark={isDark}
                testId="histogram-chart"
                layout={{
                  xaxis: { title: { text: 'Value Range' }, tickangle: -25 },
                  yaxis: { title: { text: 'Row Count' } },
                  bargap: 0.08,
                }}
              />
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Quartile Box Plot
              </h3>
              <PlotlyChart
                data={boxplotTraces}
                isDark={isDark}
                testId="boxplot-chart"
                layout={{
                  yaxis: { title: { text: activeDist.column } },
                  showlegend: false,
                }}
              />
            </div>
          </div>

          {activeDist.boxplot && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'Min', value: activeDist.boxplot.min.toFixed(3) },
                { label: 'Q1 (25%)', value: activeDist.boxplot.q1.toFixed(3) },
                { label: 'Median', value: activeDist.boxplot.median.toFixed(3) },
                { label: 'Q3 (75%)', value: activeDist.boxplot.q3.toFixed(3) },
                { label: 'Max', value: activeDist.boxplot.max.toFixed(3) },
                { label: 'IQR', value: activeDist.boxplot.iqr.toFixed(3) },
                { label: 'Lower Fence', value: activeDist.boxplot.lower_fence.toFixed(3) },
                { label: 'IQR Outliers', value: String(activeDist.boxplot.outlier_count) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3"
                >
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {stat.label}
                  </span>
                  <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Top Categorical Frequencies — {activeDist.column}
          </h3>
          <PlotlyChart
            data={categoryTraces}
            isDark={isDark}
            testId="categorical-chart"
            layout={{
              xaxis: { title: { text: 'Category Value' } },
              yaxis: { title: { text: 'Count' } },
            }}
          />
        </div>
      )}
    </div>
  );
};
