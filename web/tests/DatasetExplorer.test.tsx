import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DatasetExplorer } from '../src/features/datasets/DatasetExplorer';

const SAMPLE_SUMMARY = {
  id: 'sample-iris-dataset',
  name: 'Iris Benchmark Sample (30 samples)',
  row_count: 30,
  column_count: 3,
  columns: ['sepal_length', 'petal_length', 'species'],
  memory_bytes: 1200,
  is_sample: true,
  source_format: 'csv',
};

const UPLOADED_SUMMARY = {
  id: 'ds-custom123',
  name: 'sales.csv',
  row_count: 2,
  column_count: 2,
  columns: ['region', 'revenue'],
  memory_bytes: 512,
  is_sample: false,
  source_format: 'csv',
};

describe('DatasetExplorer Phase 2', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === '/api/datasets') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ datasets: [SAMPLE_SUMMARY], total: 1 }),
          });
        }
        if (url === '/api/datasets/sample') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                summary: SAMPLE_SUMMARY,
                columns: [
                  {
                    name: 'sepal_length',
                    dtype: 'Float64',
                    null_count: 0,
                    null_percentage: 0,
                    unique_count: 15,
                    min_value: 4.4,
                    q1_value: 5.0,
                    median_value: 5.8,
                    mean_value: 5.84,
                    q3_value: 6.5,
                    max_value: 7.6,
                    std_value: 0.8,
                  },
                  {
                    name: 'petal_length',
                    dtype: 'Float64',
                    null_count: 0,
                    null_percentage: 0,
                    unique_count: 18,
                    min_value: 1.3,
                    q1_value: 1.5,
                    median_value: 4.5,
                    mean_value: 3.9,
                    q3_value: 5.6,
                    max_value: 6.6,
                    std_value: 1.8,
                  },
                  {
                    name: 'species',
                    dtype: 'String',
                    null_count: 0,
                    null_percentage: 0,
                    unique_count: 3,
                  },
                ],
                preview_rows: [
                  { sepal_length: 5.1, petal_length: 1.4, species: 'setosa' },
                  { sepal_length: 7.0, petal_length: 4.7, species: 'versicolor' },
                ],
                metadata: {},
              }),
          });
        }
        if (url === '/api/datasets/upload' && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                summary: UPLOADED_SUMMARY,
                columns: [
                  {
                    name: 'revenue',
                    dtype: 'Float64',
                    null_count: 0,
                    null_percentage: 0,
                    unique_count: 2,
                    min_value: 100,
                    max_value: 200,
                    mean_value: 150,
                  },
                ],
                preview_rows: [{ region: 'APAC', revenue: 100 }],
                metadata: {},
              }),
          });
        }
        if (url.startsWith('/api/datasets/ds-custom123') && !url.includes('/rows')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                summary: UPLOADED_SUMMARY,
                columns: [
                  {
                    name: 'revenue',
                    dtype: 'Float64',
                    null_count: 0,
                    null_percentage: 0,
                    unique_count: 2,
                    min_value: 100,
                    max_value: 200,
                    mean_value: 150,
                  },
                ],
                preview_rows: [{ region: 'APAC', revenue: 100 }],
                metadata: {},
              }),
          });
        }
        if (url.includes('/rows')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dataset_id: 'sample-iris-dataset',
                total_rows: 30,
                filtered_rows: 1,
                offset: 0,
                limit: 25,
                columns: ['sepal_length', 'petal_length', 'species'],
                rows: [{ sepal_length: 5.1, petal_length: 1.4, species: 'setosa' }],
              }),
          });
        }
        if (url.includes('/distributions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dataset_id: 'sample-iris-dataset',
                bins: 15,
                distributions: [
                  {
                    column: 'sepal_length',
                    dtype: 'Float64',
                    kind: 'numeric',
                    total_count: 30,
                    non_null_count: 30,
                    histogram: [{ start: 4.4, end: 6.0, count: 15 }],
                    boxplot: {
                      min: 4.4,
                      q1: 5.0,
                      median: 5.8,
                      q3: 6.5,
                      max: 7.6,
                      iqr: 1.5,
                      lower_fence: 2.75,
                      upper_fence: 8.75,
                      outlier_count: 0,
                      sample_outliers: [],
                    },
                  },
                ],
              }),
          });
        }
        if (url.includes('/quality')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dataset_id: 'sample-iris-dataset',
                row_count: 30,
                column_count: 3,
                total_cells: 90,
                total_missing_cells: 0,
                completeness_percentage: 100.0,
                duplicate_row_count: 0,
                columns: [
                  {
                    column: 'sepal_length',
                    dtype: 'Float64',
                    null_count: 0,
                    null_percentage: 0,
                    unique_count: 15,
                    is_constant: false,
                    iqr_outlier_count: 0,
                    zscore_outlier_count: 0,
                    outlier_percentage: 0,
                  },
                ],
              }),
          });
        }
        if (url.includes('/correlations')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dataset_id: 'sample-iris-dataset',
                method: url.includes('spearman') ? 'spearman' : 'pearson',
                columns: ['sepal_length', 'petal_length'],
                matrix: [
                  [1.0, 0.87],
                  [0.87, 1.0],
                ],
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  it('loads sample dataset overview and switches to filtered data table', async () => {
    render(<DatasetExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByText('Iris Benchmark Sample (30 samples)')).toBeInTheDocument();
      expect(screen.getByText('sepal_length')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Data Table & Filter'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search across all columns...')).toBeInTheDocument();
      expect(screen.getByText('setosa')).toBeInTheDocument();
    });
  });

  it('uploads a local CSV file and updates active inspection', async () => {
    render(<DatasetExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('dataset-file-input')).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId('dataset-file-input') as HTMLInputElement;
    const file = new File(['region,revenue\nAPAC,100\nEMEA,200\n'], 'sales.csv', {
      type: 'text/csv',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('sales.csv')).toBeInTheDocument();
      expect(screen.getByText('revenue')).toBeInTheDocument();
    });
  });

  it('renders Distributions, Quality, and Correlation visualization tabs', async () => {
    render(<DatasetExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByText('Iris Benchmark Sample (30 samples)')).toBeInTheDocument();
    });

    // Distributions Tab
    fireEvent.click(screen.getByText('Distributions & Box Plots'));
    await waitFor(() => {
      expect(screen.getByTestId('histogram-chart')).toBeInTheDocument();
      expect(screen.getByTestId('boxplot-chart')).toBeInTheDocument();
      expect(screen.getByText('IQR Outliers')).toBeInTheDocument();
    });

    // Quality & Outliers Tab
    fireEvent.click(screen.getByText('Data Quality & Outliers'));
    await waitFor(() => {
      expect(screen.getByText('100.00%')).toBeInTheDocument();
      expect(screen.getByTestId('missing-chart')).toBeInTheDocument();
      expect(screen.getByTestId('outlier-chart')).toBeInTheDocument();
    });

    // Correlations Tab
    fireEvent.click(screen.getByText('Correlations & Relationships'));
    await waitFor(() => {
      expect(screen.getByTestId('correlation-heatmap')).toBeInTheDocument();
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('spearman'));
    await waitFor(() => {
      expect(screen.getByText('Spearman (Rank) Correlation Heatmap')).toBeInTheDocument();
    });
  });

  it('pastes CSV or JSON code and imports dataset', async () => {
    render(<DatasetExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Paste CSV \/ JSON/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Paste CSV \/ JSON/i }));
    expect(screen.getByText('Paste CSV, JSON, or JSONL Code')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load JSON Sample/i }));
    fireEvent.click(screen.getByRole('button', { name: /Import Pasted Data/i }));

    await waitFor(() => {
      expect(screen.getByText('sales.csv')).toBeInTheDocument();
    });
  });
});
