import React, { useState } from 'react';
import { Layers, Sparkles } from 'lucide-react';
import { Data, Layout } from 'plotly.js-dist-min';
import { ProjectedPoint, ProjectionResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface EmbeddingProjectionPlotProps {
  projection: ProjectionResponse;
  colorBy: string;
  selectedPointIndex: number | null;
  highlightNeighborIndices?: number[];
  loading: boolean;
  isDark: boolean;
  onSelectPoint: (pointIndex: number) => void;
}

const PALETTE = [
  '#22c55e',
  '#38bdf8',
  '#a855f7',
  '#f59e0b',
  '#f43f5e',
  '#14b8a6',
  '#ec4899',
  '#6366f1',
];

export const EmbeddingProjectionPlot: React.FC<EmbeddingProjectionPlotProps> = ({
  projection,
  colorBy,
  selectedPointIndex,
  highlightNeighborIndices = [],
  loading,
  isDark,
  onSelectPoint,
}) => {
  const [showContours, setShowContours] = useState(false);
  const is3D = projection.dimensions === 3;
  const useWebGL = !is3D && projection.points.length > 500;

  const groups = new Map<string, ProjectedPoint[]>();
  for (const pt of projection.points) {
    let key = 'All Points';
    if (colorBy === 'cluster' && pt.cluster !== null && pt.cluster !== undefined) {
      key = `Cluster ${pt.cluster}`;
    } else if (colorBy !== 'cluster') {
      const metaVal = pt.metadata?.[colorBy];
      key = metaVal !== undefined && metaVal !== null ? String(metaVal) : 'Unassigned';
    }
    const list = groups.get(key) ?? [];
    list.push(pt);
    groups.set(key, list);
  }

  const traces: Data[] = Array.from(groups.entries()).map(([groupName, pts], groupIdx) => {
    const color = PALETTE[groupIdx % PALETTE.length];
    const hoverText = pts.map(
      (p) =>
        `<b>${p.label}</b><br>${p.snippet}<br>Cluster: ${
          p.cluster ?? 'N/A'
        } (click to inspect)`
    );

    if (is3D) {
      return {
        type: 'scatter3d',
        mode: 'markers',
        name: groupName,
        x: pts.map((p) => p.x),
        y: pts.map((p) => p.y),
        z: pts.map((p) => p.z ?? 0),
        customdata: pts.map((p) => p.index),
        text: hoverText,
        hoverinfo: 'text',
        marker: {
          size: pts.map((p) => (p.index === selectedPointIndex ? 10 : 6)),
          color,
          opacity: 0.9,
          line: {
            color: pts.map((p) => (p.index === selectedPointIndex ? '#ffffff' : color)),
            width: 1,
          },
        },
      } as unknown as Data;
    }

    return {
      type: useWebGL ? 'scattergl' : 'scatter',
      mode: 'markers',
      name: groupName,
      x: pts.map((p) => p.x),
      y: pts.map((p) => p.y),
      customdata: pts.map((p) => p.index),
      text: hoverText,
      hoverinfo: 'text',
      marker: {
        size: pts.map((p) => (p.index === selectedPointIndex ? 15 : 10)),
        color,
        opacity: 0.9,
        line: {
          color: pts.map((p) => (p.index === selectedPointIndex ? '#ffffff' : 'rgba(0,0,0,0.25)')),
          width: pts.map((p) => (p.index === selectedPointIndex ? 2.5 : 1)),
        },
      },
    } as unknown as Data;
  });

  const neighborLinkTraces: Data[] = [];
  if (selectedPointIndex !== null && highlightNeighborIndices.length > 0) {
    const selectedPt = projection.points.find((p) => p.index === selectedPointIndex);
    if (selectedPt) {
      const linkX: (number | null)[] = [];
      const linkY: (number | null)[] = [];
      const linkZ: (number | null)[] = [];
      for (const nIdx of highlightNeighborIndices) {
        const nPt = projection.points.find((p) => p.index === nIdx);
        if (nPt) {
          linkX.push(selectedPt.x, nPt.x, null);
          linkY.push(selectedPt.y, nPt.y, null);
          if (is3D) {
            linkZ.push(selectedPt.z ?? 0, nPt.z ?? 0, null);
          }
        }
      }
      if (linkX.length > 0) {
        neighborLinkTraces.push(
          is3D
            ? ({
                type: 'scatter3d',
                mode: 'lines',
                name: 'High-Dim Neighbors',
                x: linkX,
                y: linkY,
                z: linkZ,
                line: { color: '#f59e0b', width: 3 },
                hoverinfo: 'skip',
              } as unknown as Data)
            : ({
                type: 'scatter',
                mode: 'lines',
                name: 'High-Dim Neighbors',
                x: linkX,
                y: linkY,
                line: { color: '#f59e0b', width: 2, dash: 'dot' },
                hoverinfo: 'skip',
              } as unknown as Data)
        );
      }
    }
  }

  const contourTraces: Data[] =
    !is3D && showContours && projection.points.length >= 4
      ? [
          {
            type: 'histogram2dcontour',
            x: projection.points.map((p) => p.x),
            y: projection.points.map((p) => p.y),
            colorscale: 'Greens',
            reversescale: isDark,
            showscale: false,
            ncontours: 10,
            contours: { coloring: 'lines' },
            line: { width: 1 },
            hoverinfo: 'skip',
            name: 'Density Contour',
          } as unknown as Data,
        ]
      : [];

  const allTraces: Data[] = [...contourTraces, ...neighborLinkTraces, ...traces];

  const varianceChartData: Data[] =
    projection.explained_variance_ratio && projection.explained_variance_ratio.length > 0
      ? [
          {
            type: 'bar',
            name: 'Explained Variance %',
            x: projection.explained_variance_ratio.map((_, i) => `PC${i + 1}`),
            y: projection.explained_variance_ratio.map((v) => Number((v * 100).toFixed(2))),
            text: projection.explained_variance_ratio.map((v) => `${(v * 100).toFixed(1)}%`),
            textposition: 'auto',
            marker: { color: '#22c55e' },
          },
        ]
      : [];

  const layout: Partial<Layout> = is3D
    ? {
        margin: { l: 12, r: 12, t: 24, b: 12 },
        scene: {
          xaxis: { title: { text: 'Dim 1' } },
          yaxis: { title: { text: 'Dim 2' } },
          zaxis: { title: { text: 'Dim 3' } },
        },
      }
    : {
        xaxis: { title: { text: 'Component 1' } },
        yaxis: { title: { text: 'Component 2' } },
        hovermode: 'closest',
      };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {projection.method.toUpperCase()} {projection.dimensions}D Projection —{' '}
              {projection.filtered_points} / {projection.total_points} points
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!is3D && (
              <button
                type="button"
                onClick={() => setShowContours((prev) => !prev)}
                className={`text-[11px] px-2.5 py-0.5 rounded border transition-colors ${
                  showContours
                    ? 'bg-brand-600 border-brand-500 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {showContours ? 'Density Contours: On' : 'Density Contours'}
              </button>
            )}
            {projection.explained_variance_ratio &&
              projection.explained_variance_ratio.length > 0 && (
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  Explained Variance:{' '}
                  {projection.explained_variance_ratio
                    .map((v, i) => `PC${i + 1}: ${(v * 100).toFixed(1)}%`)
                    .join(' · ')}
                </span>
              )}
          </div>
        </div>

        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          {projection.points.length === 0 ? (
            <div className="h-[26rem] flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 p-6 text-center">
              No points matched your active metadata filter. Clear or adjust the filter value above.
            </div>
          ) : (
            <PlotlyChart
              data={allTraces}
              layout={layout}
              isDark={isDark}
              className="w-full h-[26rem]"
              testId="embedding-plot"
              onPointClick={onSelectPoint}
            />
          )}
        </div>

        {/* Cluster Summary Badges */}
        {projection.clusters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px]">
            <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Clusters:</span>
            </span>
            {projection.clusters.map((c) => (
              <span
                key={c.cluster_id}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                C{c.cluster_id}: {c.count} ({c.percentage}%)
              </span>
            ))}
          </div>
        )}

        {varianceChartData.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              PCA Component Variance Contribution
            </h3>
            <PlotlyChart
              data={varianceChartData}
              isDark={isDark}
              testId="embedding-variance-chart"
              className="w-full h-36"
              layout={{
                margin: { l: 44, r: 16, t: 10, b: 28 },
                yaxis: { title: { text: 'Variance %' } },
              }}
            />
          </div>
        )}
      </div>

      {/* Quick Clickable Point Index */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Projected Items (click any item to inspect original data & high-dim neighbors)
          </span>
          <span className="text-slate-600 dark:text-slate-400 font-mono">{projection.points.length} visible</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
          {projection.points.map((pt) => {
            const isSelected = pt.index === selectedPointIndex;
            return (
              <button
                key={pt.index}
                type="button"
                onClick={() => onSelectPoint(pt.index)}
                className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white font-semibold border-brand-500'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-500/50'
                }`}
              >
                {pt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
