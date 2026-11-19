import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VectorExplorer } from '../src/features/vectors/VectorExplorer';

describe('VectorExplorer Phase 4 Stage 2', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === '/api/vectors/similarity') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dimension: 4,
                cosine_similarity: 0.99388,
                cosine_distance: 0.00612,
                euclidean_distance: 2.0,
                manhattan_distance: 4.0,
                dot_product: 40.0,
                angle_degrees: 6.34,
                norm_a: 5.47723,
                norm_b: 7.34847,
                normalized_a: [0.18, 0.36, 0.54, 0.73],
                normalized_b: [0.27, 0.4, 0.54, 0.68],
              }),
          });
        }
        if (url === '/api/vectors/inspect') {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                label: body.label ?? 'Vector',
                dimension: 4,
                norm_l2: 5.477,
                norm_l1: 10.0,
                min_value: 1,
                max_value: 4,
                mean_value: 2.5,
                std_value: 1.11,
                zero_count: 0,
                is_unit_normalized: false,
                values: body.values ?? [1, 2, 3, 4],
                normalized_values: [0.18, 0.36, 0.54, 0.73],
              }),
          });
        }
        if (url === '/api/vectors/search') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                metric: 'cosine_similarity',
                query_dimension: 4,
                total_candidates: 5,
                similarity_basis: 'original_high_dimensional_vectors',
                results: [
                  {
                    rank: 1,
                    id: 'vec-1',
                    label: 'Neural Search',
                    score: 0.998,
                    cosine_similarity: 0.998,
                    euclidean_distance: 0.05,
                    dot_product: 1.65,
                    manhattan_distance: 0.1,
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  it('computes pairwise similarity, angle, distances, and component chart', async () => {
    render(<VectorExplorer isDark={true} />);

    fireEvent.click(screen.getByText('Calculate Similarity & Distance'));

    await waitFor(() => {
      expect(screen.getByText('0.99388')).toBeInTheDocument();
      expect(screen.getByText('6.34°')).toBeInTheDocument();
      expect(screen.getByTestId('vector-component-chart')).toBeInTheDocument();
    });
  });

  it('switches to Nearest-Neighbor Ranking tab and ranks candidates', async () => {
    render(<VectorExplorer isDark={true} />);

    fireEvent.click(screen.getByText('Nearest-Neighbor Ranking'));
    fireEvent.click(screen.getByText('Rank Nearest Neighbors'));

    await waitFor(() => {
      expect(screen.getByText('Neural Search')).toBeInTheDocument();
      expect(screen.getByText('Original 4D Coordinates')).toBeInTheDocument();
    });
  });
});
