import React, { useEffect, useRef } from 'react';
import Plotly, { Config, Data, Layout, PlotlyHTMLElement } from 'plotly.js-dist-min';

interface PlotlyChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  isDark?: boolean;
  className?: string;
  testId?: string;
  onPointClick?: (customDataValue: number) => void;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout = {},
  config = {},
  isDark = true,
  className = 'w-full h-80',
  testId,
  onPointClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clickHandlerRef = useRef(onPointClick);
  clickHandlerRef.current = onPointClick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.22)';
    const sceneGridColor = isDark ? '#475569' : '#cbd5e1';
    const sceneLineColor = isDark ? '#64748b' : '#94a3b8';
    const sceneZeroColor = isDark ? '#64748b' : '#94a3b8';
    const sceneWallBg = isDark ? 'rgba(15, 23, 42, 0.25)' : 'rgba(241, 245, 249, 0.65)';
    const hoverBg = isDark ? '#0f172a' : '#ffffff';
    const hoverBorder = isDark ? '#334155' : '#cbd5e1';

    const { xaxis, yaxis, margin, scene, polar, ...restLayout } = layout;

    const has3D =
      Boolean(scene) ||
      data.some((trace) => trace.type === 'scatter3d' || trace.type === 'surface');
    const hasPolar =
      Boolean(polar) || data.some((trace) => trace.type === 'scatterpolar');

    const sceneAxisBase = {
      showgrid: true,
      gridcolor: sceneGridColor,
      gridwidth: 1,
      showline: true,
      linecolor: sceneLineColor,
      zeroline: true,
      zerolinecolor: sceneZeroColor,
      showbackground: true,
      backgroundcolor: sceneWallBg,
      tickfont: { color: textColor },
      titlefont: { color: textColor },
    };

    const mergedLayout: Partial<Layout> = {
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      hoverlabel: {
        bgcolor: hoverBg,
        bordercolor: hoverBorder,
        font: { color: textColor, size: 11 },
      },
      font: {
        color: textColor,
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 11,
      },
      ...restLayout,
      margin: has3D
        ? { l: 12, r: 12, t: 24, b: 12, ...margin }
        : { l: 48, r: 24, t: 36, b: 44, ...margin },
      xaxis: {
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        automargin: true,
        ...xaxis,
      },
      yaxis: {
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        automargin: true,
        ...yaxis,
      },
      ...(has3D
        ? {
            scene: {
              bgcolor: 'rgba(0,0,0,0)',
              ...scene,
              xaxis: {
                ...sceneAxisBase,
                ...scene?.xaxis,
              },
              yaxis: {
                ...sceneAxisBase,
                ...scene?.yaxis,
              },
              zaxis: {
                ...sceneAxisBase,
                ...scene?.zaxis,
              },
            },
          }
        : {}),
      ...(hasPolar
        ? {
            polar: {
              bgcolor: 'rgba(0,0,0,0)',
              ...polar,
              radialaxis: { gridcolor: gridColor, ...polar?.radialaxis },
              angularaxis: { gridcolor: gridColor, ...polar?.angularaxis },
            },
          }
        : {}),
    };

    const mergedConfig: Partial<Config> = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: testId ?? 'xakugraph-chart',
        scale: 2,
      },
      ...config,
    };

    let disposed = false;
    void Plotly.react(el, data, mergedLayout, mergedConfig).then(() => {
      if (disposed) return;
      const plotlyEl = el as unknown as PlotlyHTMLElement & {
        removeAllListeners?: (eventName: string) => void;
      };
      if (typeof plotlyEl.removeAllListeners === 'function') {
        plotlyEl.removeAllListeners('plotly_click');
      }
      if (typeof plotlyEl.on === 'function' && clickHandlerRef.current) {
        plotlyEl.on('plotly_click', (eventData) => {
          const firstPoint = eventData?.points?.[0] as { customdata?: unknown } | undefined;
          const idx = Number(firstPoint?.customdata);
          if (!Number.isNaN(idx) && clickHandlerRef.current) {
            clickHandlerRef.current(idx);
          }
        });
      }
    });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (el) {
          void Plotly.Plots.resize(el);
        }
      });
      observer.observe(el);
    }

    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [data, layout, config, isDark]);

  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (el) {
        Plotly.purge(el);
      }
    };
  }, []);

  return <div ref={containerRef} className={className} data-testid={testId} />;
};
