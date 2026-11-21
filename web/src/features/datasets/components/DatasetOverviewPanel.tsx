import React from 'react';
import { BarChart3, CheckCircle2, FileSpreadsheet, Table } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { DatasetInspectionResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface DatasetOverviewPanelProps {
  dataset: DatasetInspectionResponse;
  isDark?: boolean;
}

const formatNum = (val: number | string | null | undefined, digits = 3): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(digits);
  return String(val);
};

export const DatasetOverviewPanel: React.FC<DatasetOverviewPanelProps> = ({
  dataset,
  isDark = true,
}) => {
  const isNumericDtype = (dtype: string) =>
    /^(Int|UInt|Float|Decimal)/i.test(dtype);

  const numericCols = dataset.columns.filter((c) => isNumericDtype(c.dtype));
  const categoricalCols = dataset.columns.filter((c) => !isNumericDtype(c.dtype));

  const overviewChartData: Data[] = [
    ...(numericCols.length > 0
      ? [
          {
            type: 'bar' as const,
            name: 'Numeric Unique Values',
            x: numericCols.map((c) => c.name),
            y: numericCols.map((c) => c.unique_count),
            text: numericCols.map((c) => `${c.unique_count} uniq`),
            textposition: 'auto' as const,
            marker: { color: '#22c55e' },
          },
        ]
      : []),
    ...(categoricalCols.length > 0
      ? [
          {
            type: 'bar' as const,
            name: 'Categorical / Text Unique Values',
            x: categoricalCols.map((c) => c.name),
            y: categoricalCols.map((c) => c.unique_count),
            text: categoricalCols.map((c) => `${c.unique_count} uniq`),
            textposition: 'auto' as const,
            marker: { color: '#38bdf8' },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dataset Name</span>
          <p
            className="text-base font-semibold text-slate-900 dark:text-white mt-1 truncate"
            title={dataset.summary.name}
          >
            {dataset.summary.name}
          </p>
          <div className="mt-2 flex items-center space-x-1.5 text-xs text-brand-500 dark:text-brand-400">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="uppercase font-mono">{dataset.summary.source_format}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Rows</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {dataset.summary.row_count.toLocaleString()}
          </p>
          <span className="text-xs text-slate-600 dark:text-slate-400">Rows in dataset</span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Feature Columns</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {dataset.summary.column_count}
          </p>
          <span className="text-xs text-slate-600 dark:text-slate-400">Numeric & Categorical</span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Memory Footprint</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {(dataset.summary.memory_bytes / 1024).toFixed(2)} KB
          </p>
          <div className="mt-2 flex items-center space-x-1 text-xs text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cached via Polars + Parquet</span>
          </div>
        </div>
      </div>

      {/* Column Cardinality & Types Visual */}
      {dataset.columns.length > 0 && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-brand-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Column Cardinality & Feature Types
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
              {numericCols.length} numeric · {categoricalCols.length} non-numeric
            </span>
          </div>
          <PlotlyChart
            data={overviewChartData}
            isDark={isDark}
            testId="dataset-overview-chart"
            className="w-full h-60"
            layout={{
              barmode: 'group',
              xaxis: { tickangle: -20 },
              yaxis: { title: { text: 'Unique Values' } },
              legend: { orientation: 'h', y: 1.15 },
            }}
          />
        </div>
      )}

      {/* Column Statistics Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-brand-500 dark:text-brand-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Column-Level Statistical Inspection
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dataset.columns.length} columns analyzed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Column</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Nulls</th>
                <th className="px-4 py-3 font-medium">Unique</th>
                <th className="px-4 py-3 font-medium">Min</th>
                <th className="px-4 py-3 font-medium">Q1</th>
                <th className="px-4 py-3 font-medium">Median</th>
                <th className="px-4 py-3 font-medium">Mean</th>
                <th className="px-4 py-3 font-medium">Q3</th>
                <th className="px-4 py-3 font-medium">Max</th>
                <th className="px-4 py-3 font-medium">Std Dev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {dataset.columns.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{col.name}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">{col.dtype}</td>
                  <td className="px-4 py-2.5">
                    {col.null_count === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">0 (0%)</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {col.null_count} ({col.null_percentage ?? 0}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{col.unique_count}</td>
                  <td className="px-4 py-2.5 font-mono">{formatNum(col.min_value)}</td>
                  <td className="px-4 py-2.5 font-mono">{formatNum(col.q1_value)}</td>
                  <td className="px-4 py-2.5 font-mono">{formatNum(col.median_value)}</td>
                  <td className="px-4 py-2.5 font-mono">{formatNum(col.mean_value)}</td>
                  <td className="px-4 py-2.5 font-mono">{formatNum(col.q3_value)}</td>
                  <td className="px-4 py-2.5 font-mono">{formatNum(col.max_value)}</td>
                  <td className="px-4 py-2.5 font-mono">{formatNum(col.std_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
