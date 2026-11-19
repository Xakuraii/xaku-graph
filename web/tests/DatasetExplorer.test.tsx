import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DatasetExplorer } from '../src/features/datasets/DatasetExplorer';

const SAMPLE_SUMMARY = {
  id: 'sample-iris-dataset',
  name: 'Iris Benchmark Sample (30 samples)',
  row_count: 30,
  column_count: 2,
  columns: ['sepal_length', 'species'],
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

describe('DatasetExplorer Stage 3', () => {
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
                ],
                preview_rows: [{ sepal_length: 5.1, species: 'setosa' }],
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
                columns: ['sepal_length', 'species'],
                rows: [{ sepal_length: 5.1, species: 'setosa' }],
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
});
