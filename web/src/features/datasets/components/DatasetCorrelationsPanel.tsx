import React, { useEffect, useRef, useState } from 'react';
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
  const [zCol, setZCol] = useState<string>('');
  const [colorCol, setColorCol] = useState<string>('');
  const [matrixMode, setMatrixMode] = useState<'heatmap' | 'surface3d'>('heatmap');
  const [scatterDim, setScatterDim] = useState<'2d' | '3d'>('2d');
  const [showTrendline, setShowTrendline] = useState<boolean>(true);
  const initializedColsKeyRef = useRef<string>('');

  const colsSignature = `${numericCols.join('|')}::${categoricalCols.join('|')}`;

  useEffect(() => {
    if (numericCols.length > 0) {
      if (!numericCols.includes(xCol)) setXCol(numericCols[0]);
      if (!numericCols.includes(yCol)) {
        setYCol(numericCols.length > 1 ? numericCols[1] : numericCols[0]);
      }
      if (!numericCols.includes(zCol)) {
        setZCol(
          numericCols.length > 2
            ? numericCols[2]
            : numericCols.length > 1
            ? numericCols[1]
            : numericCols[0]
        );
      }
    }
    if (initializedColsKeyRef.current !== colsSignature) {
      initializedColsKeyRef.current = colsSignature;
      setColorCol(categoricalCols[0] ?? '');
    }
  }, [colsSignature, numericCols, categoricalCols, xCol, yCol, zCol]);

  if (loading && !correlations) {
    return (
      <div className="h-64 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs text-slate-600 dark:text-slate-400">
        Computing feature correlation matrix...
      </div>
    );
  }

  if (!correlations || correlations.columns.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        Correlation analysis requires at least 2 numeric columns.
      </div>
    );
  }

  const showTextValues = correlations.columns.length <= 12;
  const heatmapData: Data[] =
    matrixMode === 'surface3d'
      ? [
          {
            type: 'surface',
            z: correlations.matrix.map((row) => row.map((v) => v ?? 0)),
            x: correlations.columns,
            y: correlations.columns,
            colorscale: 'RdBu',
            reversescale: true,
            cmin: -1,
            cmax: 1,
          } as unknown as Data,
        ]
      : [
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

  // Lookup exact correlation r for selected (xCol, yCol)
  const xIdx = correlations.columns.indexOf(xCol);
  const yIdx = correlations.columns.indexOf(yCol);
  const pairCorr =
    xIdx !== -1 && yIdx !== -1 ? correlations.matrix[xIdx]?.[yIdx] ?? null : null;

  // Build 2D or 3D scatter plot traces grouped by optional colorCol + optional OLS fit
  const buildScatterTraces = (): Data[] => {
    if (!xCol || !yCol || previewRows.length === 0) return [];

    if (scatterDim === '3d') {
      const zField = zCol || yCol;
      if (!colorCol) {
        return [
          {
            type: 'scatter3d',
            mode: 'markers',
            x: previewRows.map((r) => r[xCol] as number),
            y: previewRows.map((r) => r[yCol] as number),
            z: previewRows.map((r) => r[zField] as number),
            marker: { size: 5, color: '#22c55e', opacity: 0.9 },
            name: 'Rows',
          } as unknown as Data,
        ];
      }

      const groups3d = new Map<string, { x: unknown[]; y: unknown[]; z: unknown[] }>();
      for (const row of previewRows) {
        const key =
          row[colorCol] === null || row[colorCol] === undefined ? 'null' : String(row[colorCol]);
        const bucket = groups3d.get(key) ?? { x: [], y: [], z: [] };
        bucket.x.push(row[xCol]);
        bucket.y.push(row[yCol]);
        bucket.z.push(row[zField]);
        groups3d.set(key, bucket);
      }

      return Array.from(groups3d.entries()).map(
        ([groupName, coords]) =>
          ({
            type: 'scatter3d',
            mode: 'markers',
            name: groupName,
            x: coords.x as number[],
            y: coords.y as number[],
            z: coords.z as number[],
            marker: { size: 5, opacity: 0.9 },
          }) as unknown as Data
      );
    }

    const traces: Data[] = [];
    if (!colorCol) {
      traces.push({
        type: 'scatter',
        mode: 'markers',
        x: previewRows.map((r) => r[xCol] as number),
        y: previewRows.map((r) => r[yCol] as number),
        marker: { size: 8, color: '#22c55e', opacity: 0.85 },
        name: 'Rows',
      });
    } else {
      const groups = new Map<string, { x: unknown[]; y: unknown[] }>();
      for (const row of previewRows) {
        const key =
          row[colorCol] === null || row[colorCol] === undefined ? 'null' : String(row[colorCol]);
        const bucket = groups.get(key) ?? { x: [], y: [] };
        bucket.x.push(row[xCol]);
        bucket.y.push(row[yCol]);
        groups.set(key, bucket);
      }

      for (const [groupName, coords] of groups.entries()) {
        traces.push({
          type: 'scatter',
          mode: 'markers',
          name: groupName,
          x: coords.x as number[],
          y: coords.y as number[],
          marker: { size: 8, opacity: 0.85 },
        });
      }
    }

    if (showTrendline) {
      const pairs = previewRows
        .map((r) => [Number(r[xCol]), Number(r[yCol])] as const)
        .filter(([xv, yv]) => Number.isFinite(xv) && Number.isFinite(yv));
      if (pairs.length >= 2) {
        const n = pairs.length;
        const meanX = pairs.reduce((s, [xv]) => s + xv, 0) / n;
        const meanY = pairs.reduce((s, [, yv]) => s + yv, 0) / n;
        const num = pairs.reduce((s, [xv, yv]) => s + (xv - meanX) * (yv - meanY), 0);
        const den = pairs.reduce((s, [xv]) => s + (xv - meanX) ** 2, 0);
        if (den > 1e-12) {
          const slope = num / den;
          const intercept = meanY - slope * meanX;
          const xs = pairs.map(([xv]) => xv);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          traces.push({
            type: 'scatter',
            mode: 'lines',
            name: 'OLS Trendline',
            x: [minX, maxX],
            y: [slope * minX + intercept, slope * maxX + intercept],
            line: { color: '#f59e0b', width: 2, dash: 'dash' },
          });
        }
      }
    }

    return traces;
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
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap + Feature Relationship Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {method === 'pearson' ? 'Pearson (Linear)' : 'Spearman (Rank)'} Correlation Matrix
            </h3>
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
              <button
                type="button"
                onClick={() => setMatrixMode('heatmap')}
                className={`px-2 py-0.5 rounded ${
                  matrixMode === 'heatmap'
                    ? 'bg-brand-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                2D Heatmap
              </button>
              <button
                type="button"
                onClick={() => setMatrixMode('surface3d')}
                className={`px-2 py-0.5 rounded ${
                  matrixMode === 'surface3d'
                    ? 'bg-brand-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                3D Surface
              </button>
            </div>
          </div>
          <PlotlyChart
            data={heatmapData}
            isDark={isDark}
            testId="correlation-heatmap"
            className="w-full h-96"
            layout={
              matrixMode === 'surface3d'
                ? {
                    margin: { l: 0, r: 0, t: 16, b: 0 },
                    scene: {
                      xaxis: { title: { text: 'Feature A' } },
                      yaxis: { title: { text: 'Feature B' } },
                      zaxis: { title: { text: 'Corr' }, range: [-1, 1] },
                    },
                  }
                : {
                    margin: { l: 96, r: 24, t: 24, b: 84 },
                    yaxis: { autorange: 'reversed' },
                  }
            }
          />
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ScatterChart className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Feature Relationship ({previewRows.length} rows)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pairCorr !== null && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-500/15 text-brand-700 dark:text-brand-400">
                  {method === 'pearson' ? 'r' : 'ρ'} = {pairCorr.toFixed(3)}
                </span>
              )}
              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
                <button
                  type="button"
                  onClick={() => setScatterDim('2d')}
                  className={`px-2 py-0.5 rounded ${
                    scatterDim === '2d'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => setScatterDim('3d')}
                  className={`px-2 py-0.5 rounded ${
                    scatterDim === '3d'
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  3D
                </button>
              </div>
              {scatterDim === '2d' && (
                <button
                  type="button"
                  onClick={() => setShowTrendline((prev) => !prev)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    showTrendline
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {showTrendline ? 'Trendline: On' : 'Trendline: Off'}
                </button>
              )}
            </div>
          </div>

          <div
            className={`grid grid-cols-1 ${
              scatterDim === '3d' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
            } gap-2 text-xs`}
          >
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">X Axis</label>
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
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Y Axis</label>
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
            {scatterDim === '3d' && (
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Z Axis</label>
                <select
                  aria-label="Scatter Z Axis"
                  value={zCol}
                  onChange={(e) => setZCol(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-slate-900 dark:text-white"
                >
                  {numericCols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Color By</label>
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
            layout={
              scatterDim === '3d'
                ? {
                    margin: { l: 0, r: 0, t: 16, b: 0 },
                    scene: {
                      xaxis: { title: { text: xCol } },
                      yaxis: { title: { text: yCol } },
                      zaxis: { title: { text: zCol || yCol } },
                    },
                  }
                : {
                    xaxis: { title: { text: xCol } },
                    yaxis: { title: { text: yCol } },
                  }
            }
          />
        </div>
      </div>
    </div>
  );
};
