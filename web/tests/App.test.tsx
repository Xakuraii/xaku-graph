import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/app/App';

// Mock fetch for API communication
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'healthy',
              version: '1.0.0',
              environment: 'test',
              timestamp: new Date().toISOString(),
              modules: {},
              system_info: {
                python_version: '3.12.10',
                platform: 'Windows',
                debug: true,
              },
            }),
        });
      }

      if (url === '/api/datasets') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              datasets: [
                {
                  id: 'sample-iris-dataset',
                  name: 'Iris Benchmark Sample (30 samples)',
                  row_count: 30,
                  column_count: 5,
                  columns: ['sepal_length', 'species'],
                  memory_bytes: 1200,
                  is_sample: true,
                  source_format: 'csv',
                },
              ],
              total: 1,
            }),
        });
      }

      if (url.includes('/api/datasets/sample')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              summary: {
                id: 'sample-iris-dataset',
                name: 'Iris Benchmark Sample (30 samples)',
                row_count: 30,
                column_count: 5,
                columns: ['sepal_length', 'species'],
                memory_bytes: 1200,
                is_sample: true,
                source_format: 'csv',
              },
              columns: [
                {
                  name: 'sepal_length',
                  dtype: 'Float64',
                  null_count: 0,
                  unique_count: 20,
                  min_value: 4.3,
                  max_value: 7.9,
                  mean_value: 5.84,
                },
              ],
              preview_rows: [{ sepal_length: 5.1, species: 'setosa' }],
              metadata: {},
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    })
  );
});

describe('XakuGraph App Foundation', () => {
  it('renders Studio Dashboard with brand header', async () => {
    render(<App />);
    await waitFor(() => {
      const brandTitle = screen.getByText(
        (_, element) => element?.tagName === 'SPAN' && element.textContent === 'XakuGraph'
      );
      expect(brandTitle).toBeInTheDocument();
      const logo = screen.getByAltText('XakuGraph logo');
      expect(logo).toHaveAttribute('src', '/XakuGraph.svg');
      expect(logo).toHaveClass('w-10', 'h-10', 'sm:w-12', 'sm:h-12');
      expect(logo).not.toHaveClass('border', 'rounded-lg');
      expect(screen.getByText('Graph')).toHaveClass('text-brand-600', 'dark:text-brand-500');
      expect(screen.getByText('Studio Modules')).toBeInTheDocument();
    });
  });

  it('renders all 5 core navigation modules in sidebar', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText('Dataset Visualization').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Embedding Visualization').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Vector & Similarity Explorer').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('RAG Visualization').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('ML Visualization').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('navigates to Dataset Explorer and loads sample data', async () => {
    render(<App />);
    const datasetNavBtns = screen.getAllByText('Dataset Visualization');
    fireEvent.click(datasetNavBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Sample Dataset Verification:')).toBeInTheDocument();
      expect(screen.getByText('Iris Benchmark Sample (30 samples)')).toBeInTheDocument();
    });
  });

  it('navigates to Vector Explorer and displays vector calculations interface', async () => {
    render(<App />);
    const vectorNavBtns = screen.getAllByText('Vector & Similarity Explorer');
    fireEvent.click(vectorNavBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Vector A')).toBeInTheDocument();
      expect(screen.getByText('Vector B')).toBeInTheDocument();
      expect(screen.getByText('Calculate Similarity & Distance')).toBeInTheDocument();
    });
  });

  it('toggles light/dark theme via AnimatedThemeToggler', async () => {
    document.documentElement.classList.add('dark');
    localStorage.clear();

    render(<App />);
    const toggleBtn = screen.getByRole('button', { name: /Toggle color theme/i });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  it('omits sidebar platform/storage & phase status text and opens mobile hamburger menu', async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText(
          (_, element) => element?.tagName === 'SPAN' && element.textContent === 'XakuGraph'
        )
      ).toBeInTheDocument();
    });

    expect(screen.queryByText('Studio Status')).not.toBeInTheDocument();
    expect(screen.queryByText(/Local Parquet & SQLite/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Phase 6/i)).not.toBeInTheDocument();

    const menuBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(menuBtn);
    expect(screen.getByRole('dialog', { name: /Mobile navigation menu/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Close navigation menu/i }));
    expect(
      screen.queryByRole('dialog', { name: /Mobile navigation menu/i })
    ).not.toBeInTheDocument();
  });
});
