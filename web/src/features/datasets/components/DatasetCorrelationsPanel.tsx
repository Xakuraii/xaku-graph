import React, { useEffect, useState } from 'react';
import { GitCompare, ScatterChart } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import {
  ColumnDetail,
  CorrelationMatrixResponse,
  CorrelationMethod,
} from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface DatasetCorrelationsPanelProps {
  correlations: CorrelationMatrixResponse | null;
  columns: ColumnDetail[];
  previewRows: Record<string, unknown>[];
  method: CorrelationMethod;
  loading: boolean;
  isDark: boolean;
  onChangeMethod: (method: CorrelationMethod) => void;
}

export const DatasetCorrelationsPanel: React.FC<DatasetCorrelationsPanelProps> = ({
  correlations,
  columns,
  previewRows,
  method,
  loading,
  isDark,
  onChangeMethod,
}) => {
  const numericCols = correlations?.columns ?? [];
  const categoricalCols = columns
    .filter((c) => !numericCols.includes(c.name))
    .map((c) => c.name);

  const [xCol, setXCol] = useState<string>('');
  const [yCol, setYCol] = useState<string>('');
  const [colorCol, setColorCol] = useState<string>('');

  useEffect(() => {
    if (numericCols.length > 0) {
      if (!numericCols.includes(xCol)) setXCol(numericCols[0]);
      if (!numericCols.includes(yCol)) {
        setYCol(numericCols.length > 1 ? numericCols[1] : numericCols[0]);
      }
    }
    if (categoricalCols.length > 0 && colorCol === '') {
      setColorCol(categoricalCols[0]);
    }
  }, [numericCols, categoricalCols, xCol, yCol, colorCol]);

  if (loading && !correlations) {
    return (
      <div className="h-64 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs text-slate-500">
        Computing feature correlation matrix...
      </div>
    );
  }

  if (!correlations || correlations.columns.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        Correlation analysis requires at least 2 numeric columns.
      </div>
    );
  }

  const showTextValues = correlations.columns.length <= 12;
  const heatmapData: Data[] = [
    {
      type: 'heatmap',
      z: correlations.matrix,
      x: correlations.columns,
      y: correlations.columns,
      zmin: -1,
      zmax: 1,
      colorscale: 'RdBu',
      reversescale: true,
      text: showTextValues
        ? (correlations.matrix.map((row) =>
            row.map((val) => (val === null ? 'N/A' : val.toFixed(2)))
          ) as unknown as string[])
        : undefined,
      texttemplate: showTextValues ? '%{text}' : undefined,
      hoverongaps: false,
    },
  ];

  // Build scatter plot traces grouped by optional colorCol
  const buildScatterTraces = (): Data[] => {
    if (!xCol || !yCol || previewRows.length === 0) return [];

    if (!colorCol) {
      return [
        {
          type: 'scatter',
          mode: 'markers',
          x: previewRows.map((r) => r[xCol] as number),
          y: previewRows.map((r) => r[yCol] as number),
          marker: { size: 8, color: '#22c55e', opacity: 0.85 },
          name: 'Rows',
        },
      ];
    }

    const groups = new Map<string, { x: unknown[]; y: unknown[] }>();
    for (const row of previewRows) {
      const key = row[colorCol] === null || row[colorCol] === undefined ? 'null' : String(row[colorCol]);
      const bucket = groups.get(key) ?? { x: [], y: [] };
      bucket.x.push(row[xCol]);
      bucket.y.push(row[yCol]);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries()).map(([groupName, coords]) => ({
      type: 'scatter',
      mode: 'markers',
      name: groupName,
      x: coords.x as number[],
      y: coords.y as number[],
      marker: { size: 8, opacity: 0.85 },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Method Controls */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <GitCompare className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Correlation Matrix Method
          </span>
        </div>

        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950">
          {(['pearson', 'spearman'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChangeMethod(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                method === m
                  ? 'bg-brand-600 text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap + Feature Relationship Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {method === 'pearson' ? 'Pearson (Linear)' : 'Spearman (Rank)'} Correlation Heatmap
          </h3>
          <PlotlyChart
            data={heatmapData}
            isDark={isDark}
            testId="correlation-heatmap"
            className="w-full h-96"
            layout={{
              margin: { l: 96, r: 24, t: 24, b: 84 },
              yaxis: { autorange: 'reversed' },
            }}
          />
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ScatterChart className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Feature Relationship Scatter ({previewRows.length} preview rows)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">X Axis</label>
              <select
                aria-label="Scatter X Axis"
                value={xCol}
                onChange={(e) => setXCol(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-slate-900 dark:text-white"
              >
                {numericCols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Y Axis</label>
              <select
                aria-label="Scatter Y Axis"
                value={yCol}
                onChange={(e) => setYCol(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-slate-900 dark:text-white"
              >
                {numericCols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Color By</label>
              <select
                aria-label="Scatter Color By"
                value={colorCol}
                onChange={(e) => setColorCol(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-slate-900 dark:text-white"
              >
                <option value="">None</option>
                {categoricalCols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <PlotlyChart
            data={buildScatterTraces()}
            isDark={isDark}
            testId="scatter-chart"
            className="w-full h-80"
            layout={{
              xaxis: { title: { text: xCol } },
              yaxis: { title: { text: yCol } },
            }}
          />
        </div>
      </div>
    </div>
  );
};
