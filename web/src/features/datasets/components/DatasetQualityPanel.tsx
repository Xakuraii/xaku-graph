import React from 'react';
import { AlertTriangle, CheckCircle2, Copy, ShieldAlert } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { DatasetQualityResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface DatasetQualityPanelProps {
  data: DatasetQualityResponse | null;
  loading: boolean;
  isDark: boolean;
}

export const DatasetQualityPanel: React.FC<DatasetQualityPanelProps> = ({
  data,
  loading,
  isDark,
}) => {
  if (loading && !data) {
    return (
      <div className="h-64 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400">
        Analyzing missing values, duplicates, and outliers...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-48 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        No quality report available.
      </div>
    );
  }

  const columnsWithOutliers = data.columns.filter((c) => c.iqr_outlier_count > 0).length;

  const missingBarData: Data[] = [
    {
      type: 'bar',
      x: data.columns.map((c) => c.column),
      y: data.columns.map((c) => c.null_percentage),
      text: data.columns.map((c) => `${c.null_count} nulls`),
      textposition: 'auto',
      marker: {
        color: data.columns.map((c) => (c.null_count > 0 ? '#f59e0b' : '#22c55e')),
      },
      name: 'Missing %',
    },
  ];

  const outlierBarData: Data[] = [
    {
      type: 'bar',
      x: data.columns.map((c) => c.column),
      y: data.columns.map((c) => c.iqr_outlier_count),
      name: 'IQR Outliers',
      marker: { color: '#38bdf8' },
    },
    {
      type: 'bar',
      x: data.columns.map((c) => c.column),
      y: data.columns.map((c) => c.zscore_outlier_count),
      name: 'Z-Score (|z| > 3)',
      marker: { color: '#f43f5e' },
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Completeness Score
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {data.completeness_percentage.toFixed(2)}%
          </p>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {(data.total_cells - data.total_missing_cells).toLocaleString()} /{' '}
            {data.total_cells.toLocaleString()} valid cells
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Missing Values
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                data.total_missing_cells > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {data.total_missing_cells.toLocaleString()}
          </p>
          <span className="text-xs text-slate-600 dark:text-slate-400">Across {data.column_count} columns</span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Duplicate Rows
            </span>
            <Copy className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {data.duplicate_row_count.toLocaleString()}
          </p>
          <span className="text-xs text-slate-600 dark:text-slate-400">Exact row duplicates</span>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Columns With Outliers
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {columnsWithOutliers}
          </p>
          <span className="text-xs text-slate-600 dark:text-slate-400">Detected via 1.5x IQR fences</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Missing Values Percentage per Column
          </h3>
          <PlotlyChart
            data={missingBarData}
            isDark={isDark}
            testId="missing-chart"
            layout={{
              yaxis: { title: { text: 'Missing (%)' }, range: [0, 100] },
              xaxis: { tickangle: -20 },
            }}
          />
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Outlier Detection (IQR vs Z-Score)
          </h3>
          <PlotlyChart
            data={outlierBarData}
            isDark={isDark}
            testId="outlier-chart"
            layout={{
              barmode: 'group',
              yaxis: { title: { text: 'Outlier Count' } },
              xaxis: { tickangle: -20 },
            }}
          />
        </div>
      </div>

      {/* Detailed Quality Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Per-Column Quality & Anomaly Audit
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Column</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Nulls</th>
                <th className="px-4 py-3 font-medium">Unique</th>
                <th className="px-4 py-3 font-medium">Constant?</th>
                <th className="px-4 py-3 font-medium">IQR Outliers</th>
                <th className="px-4 py-3 font-medium">Z-Score Outliers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {data.columns.map((col) => (
                <tr key={col.column} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                    {col.column}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">{col.dtype}</td>
                  <td className="px-4 py-2.5">
                    {col.null_count === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">0 (0%)</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {col.null_count} ({col.null_percentage}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{col.unique_count}</td>
                  <td className="px-4 py-2.5">
                    {col.is_constant ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        Constant
                      </span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono">
                    {col.iqr_outlier_count} ({col.outlier_percentage}%)
                  </td>
                  <td className="px-4 py-2.5 font-mono">{col.zscore_outlier_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
