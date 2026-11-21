import React, { useState } from 'react';
import { Binary, Play } from 'lucide-react';
import { Data } from 'plotly.js-dist-min';
import { VectorInspectResponse, VectorSimilarityResponse } from '../../../types/api';
import { PlotlyChart } from '../../../components/charts/PlotlyChart';

interface VectorPairwisePanelProps {
  vecAStr: string;
  vecBStr: string;
  result: VectorSimilarityResponse | null;
  inspectA: VectorInspectResponse | null;
  inspectB: VectorInspectResponse | null;
  loading: boolean;
  isDark: boolean;
  onChangeA: (val: string) => void;
  onChangeB: (val: string) => void;
  onPreset: (a: number[], b: number[]) => void;
  onCalculate: () => void;
}

export const VectorPairwisePanel: React.FC<VectorPairwisePanelProps> = ({
  vecAStr,
  vecBStr,
  result,
  inspectA,
  inspectB,
  loading,
  isDark,
  onChangeA,
  onChangeB,
  onPreset,
  onCalculate,
}) => {
  const [showNormalized, setShowNormalized] = useState(false);
  const [compChartType, setCompChartType] = useState<'bar' | 'radar' | 'line'>('bar');
  const [geomMode, setGeomMode] = useState<'2d' | '3d'>('2d');

  const compLabels = inspectA ? inspectA.values.map((_, idx) => `d${idx}`) : [];
  const valsA = inspectA ? (showNormalized ? inspectA.normalized_values : inspectA.values) : [];
  const valsB = inspectB ? (showNormalized ? inspectB.normalized_values : inspectB.values) : [];

  const componentChartData: Data[] =
    inspectA && inspectB
      ? compChartType === 'radar'
        ? [
            {
              type: 'scatterpolar',
              r: valsA,
              theta: compLabels,
              fill: 'toself',
              name: 'Vector A',
              line: { color: '#22c55e' },
            } as unknown as Data,
            {
              type: 'scatterpolar',
              r: valsB,
              theta: compLabels,
              fill: 'toself',
              name: 'Vector B',
              line: { color: '#38bdf8' },
            } as unknown as Data,
          ]
        : compChartType === 'line'
        ? [
            {
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Vector A',
              x: compLabels,
              y: valsA,
              line: { color: '#22c55e', width: 2.5 },
              marker: { size: 7 },
            },
            {
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Vector B',
              x: compLabels,
              y: valsB,
              line: { color: '#38bdf8', width: 2.5 },
              marker: { size: 7 },
            },
          ]
        : [
            {
              type: 'bar',
              name: 'Vector A',
              x: compLabels,
              y: valsA,
              marker: { color: '#22c55e' },
            },
            {
              type: 'bar',
              name: 'Vector B',
              x: compLabels,
              y: valsB,
              marker: { color: '#38bdf8' },
            },
          ]
      : [];

  const can3D = (inspectA?.values.length ?? 0) >= 3 && (inspectB?.values.length ?? 0) >= 3;
  const normA3 = can3D && inspectA ? inspectA.normalized_values.slice(0, 3) : [1, 0, 0];
  const normB3 = can3D && inspectB ? inspectB.normalized_values.slice(0, 3) : [0, 1, 0];

  const angleRad = ((result?.angle_degrees ?? 0) * Math.PI) / 180;
  const circleAngles = Array.from({ length: 65 }, (_, i) => (i / 64) * 2 * Math.PI);
  const anglePlaneData: Data[] = result
    ? [
        {
          type: 'scatter',
          mode: 'lines',
          name: 'Unit Circle',
          x: circleAngles.map((a) => Math.cos(a)),
          y: circleAngles.map((a) => Math.sin(a)),
          line: { color: isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.28)', dash: 'dot', width: 1 },
          hoverinfo: 'skip',
        },
        {
          type: 'scatter',
          mode: 'lines+markers+text',
          name: 'Unit A (0°)',
          x: [0, 1],
          y: [0, 0],
          text: ['', 'Â'],
          textposition: 'middle right',
          line: { color: '#22c55e', width: 3 },
          marker: { size: [4, 10], color: '#22c55e' },
        },
        {
          type: 'scatter',
          mode: 'lines+markers+text',
          name: `Unit B (${(result.angle_degrees ?? 0).toFixed(1)}°)`,
          x: [0, Math.cos(angleRad)],
          y: [0, Math.sin(angleRad)],
          text: ['', 'B̂'],
          textposition: 'top center',
          line: { color: '#38bdf8', width: 3 },
          marker: { size: [4, 10], color: '#38bdf8' },
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">
          Presets:
        </span>
        <button
          type="button"
          onClick={() => onPreset([1, 0, 0], [0, 1, 0])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Orthogonal (90°)
        </button>
        <button
          type="button"
          onClick={() => onPreset([2, 2, 2], [5, 5, 5])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Collinear (0°)
        </button>
        <button
          type="button"
          onClick={() => onPreset([1, 0], [-1, 0])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Opposite (180°)
        </button>
        <button
          type="button"
          onClick={() => onPreset([0.15, -0.42, 0.88, 0.21], [0.19, -0.38, 0.72, 0.15])}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
        >
          Embedding Mini (4D)
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Vector A</span>
            <span className="text-slate-400 font-normal">Comma-separated floats</span>
          </label>
          <textarea
            value={vecAStr}
            onChange={(e) => onChangeA(e.target.value)}
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. 1.0, 2.0, 3.0"
          />
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Vector B</span>
            <span className="text-slate-400 font-normal">Comma-separated floats</span>
          </label>
          <textarea
            value={vecBStr}
            onChange={(e) => onChangeB(e.target.value)}
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. 2.0, 3.0, 4.0"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCalculate}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{loading ? 'Computing...' : 'Calculate Similarity & Distance'}</span>
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
            <Binary className="w-4 h-4 text-brand-500" />
            <span>
              Mathematical Calculation Results ({result.dimension ?? inspectA?.dimension ?? ''}D)
            </span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Cosine Similarity
              </span>
              <p className="text-xl font-bold text-brand-500 mt-1 font-mono">
                {result.cosine_similarity.toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Cosine Distance
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {(result.cosine_distance ?? 1 - result.cosine_similarity).toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Angle (Deg)
              </span>
              <p className="text-xl font-bold text-sky-400 mt-1 font-mono">
                {(result.angle_degrees ?? 0).toFixed(2)}°
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Euclidean (L2)
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {result.euclidean_distance.toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Manhattan (L1)
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {(result.manhattan_distance ?? 0).toFixed(5)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Dot Product
              </span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
                {result.dot_product.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Component & Geometric Angle Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Angle Geometry (θ = {(result.angle_degrees ?? 0).toFixed(2)}°)
                </h3>
                {can3D && (
                  <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setGeomMode('2d')}
                      className={`px-2 py-0.5 rounded ${
                        geomMode === '2d'
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      2D Plane
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeomMode('3d')}
                      className={`px-2 py-0.5 rounded ${
                        geomMode === '3d'
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      3D Rays
                    </button>
                  </div>
                )}
              </div>
              <PlotlyChart
                data={
                  geomMode === '3d' && can3D
                    ? [
                        {
                          type: 'scatter3d',
                          mode: 'lines+markers+text',
                          name: 'Unit A (d0..d2)',
                          x: [0, normA3[0]],
                          y: [0, normA3[1]],
                          z: [0, normA3[2]],
                          text: ['', 'Â'],
                          line: { color: '#22c55e', width: 5 },
                          marker: { size: [3, 7], color: '#22c55e' },
                        } as unknown as Data,
                        {
                          type: 'scatter3d',
                          mode: 'lines+markers+text',
                          name: 'Unit B (d0..d2)',
                          x: [0, normB3[0]],
                          y: [0, normB3[1]],
                          z: [0, normB3[2]],
                          text: ['', 'B̂'],
                          line: { color: '#38bdf8', width: 5 },
                          marker: { size: [3, 7], color: '#38bdf8' },
                        } as unknown as Data,
                      ]
                    : anglePlaneData
                }
                isDark={isDark}
                testId="vector-angle-chart"
                className="w-full h-64"
                layout={
                  geomMode === '3d' && can3D
                    ? {
                        margin: { l: 12, r: 12, t: 16, b: 12 },
                        scene: {
                          xaxis: { title: { text: 'd0' }, range: [-1, 1] },
                          yaxis: { title: { text: 'd1' }, range: [-1, 1] },
                          zaxis: { title: { text: 'd2' }, range: [-1, 1] },
                        },
                        legend: { orientation: 'h', y: 1.1 },
                      }
                    : {
                        xaxis: { range: [-1.3, 1.3], zeroline: true, title: { text: 'Unit X' } },
                        yaxis: {
                          range: [-1.3, 1.3],
                          scaleanchor: 'x',
                          scaleratio: 1,
                          zeroline: true,
                          title: { text: 'Unit Y' },
                        },
                        legend: { orientation: 'h', y: 1.15 },
                      }
                }
              />
            </div>

            {inspectA && inspectB && (
              <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Component-Wise Vector Comparison
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[11px]">
                      {(['bar', 'radar', 'line'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setCompChartType(mode)}
                          className={`px-2 py-0.5 rounded capitalize ${
                            compChartType === mode
                              ? 'bg-brand-600 text-white font-semibold'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNormalized((prev) => !prev)}
                      className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-brand-500"
                    >
                      {showNormalized ? 'L2 Normalized' : 'Raw Values'}
                    </button>
                  </div>
                </div>
                <PlotlyChart
                  data={componentChartData}
                  isDark={isDark}
                  testId="vector-component-chart"
                  className="w-full h-64"
                  layout={
                    compChartType === 'radar'
                      ? { margin: { l: 36, r: 36, t: 24, b: 24 } }
                      : {
                          barmode: 'group',
                          xaxis: { title: { text: 'Dimension Index' } },
                          yaxis: { title: { text: showNormalized ? 'Normalized Value' : 'Component Value' } },
                        }
                  }
                />
              </div>
            )}
          </div>

          {/* Norms & Normalized Vectors */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-600 dark:text-slate-400">||A|| (L2 Norm of A):</span>
              <span className="text-slate-900 dark:text-white">{result.norm_a.toFixed(6)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-600 dark:text-slate-400">||B|| (L2 Norm of B):</span>
              <span className="text-slate-900 dark:text-white">{result.norm_b.toFixed(6)}</span>
            </div>
            {result.normalized_a && (
              <div className="pt-1">
                <span className="text-slate-600 dark:text-slate-400 block mb-1">Unit-Normalized Vector A:</span>
                <span className="text-[11px] break-all">
                  [{result.normalized_a.map((v) => v.toFixed(4)).join(', ')}]
                </span>
              </div>
            )}
            {result.normalized_b && (
              <div className="pt-1">
                <span className="text-slate-600 dark:text-slate-400 block mb-1">Unit-Normalized Vector B:</span>
                <span className="text-[11px] break-all">
                  [{result.normalized_b.map((v) => v.toFixed(4)).join(', ')}]
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
