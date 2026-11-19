import React, { useEffect, useRef } from 'react';
import Plotly, { Config, Data, Layout } from 'plotly.js-dist-min';

interface PlotlyChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  isDark?: boolean;
  className?: string;
  testId?: string;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout = {},
  config = {},
  isDark = true,
  className = 'w-full h-80',
  testId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const textColor = isDark ? '#cbd5e1' : '#334155';
    const gridColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(100, 116, 139, 0.18)';

    const mergedLayout: Partial<Layout> = {
      autosize: true,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        color: textColor,
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 11,
      },
      margin: { l: 48, r: 24, t: 36, b: 44 },
      xaxis: {
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        ...layout.xaxis,
      },
      yaxis: {
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        ...layout.yaxis,
      },
      ...layout,
    };

    const mergedConfig: Partial<Config> = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      ...config,
    };

    void Plotly.react(el, data, mergedLayout, mergedConfig);

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
