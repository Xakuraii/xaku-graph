import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmbeddingExplorer } from '../src/features/embeddings/EmbeddingExplorer';

const SAMPLE_SPACE = {
  id: 'sample-ai-concepts-embeddings',
  name: 'AI & Data Concepts Sample (18 texts)',
  modality: 'text' as const,
  model_id: 'local-text-hash-128',
  dimensions: 128,
  item_count: 18,
  metadata_keys: ['category', 'level'],
  is_sample: true,
};

const CUSTOM_SPACE = {
  id: 'emb-custom99',
  name: 'Custom Embedding Space',
  modality: 'text' as const,
  model_id: 'local-text-hash-128',
  dimensions: 128,
  item_count: 5,
  metadata_keys: ['category'],
  is_sample: false,
};

describe('EmbeddingExplorer Stage 3', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === '/api/embeddings/models') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  model_id: 'local-text-hash-128',
                  name: 'Local Hash N-Gram Text (128D)',
                  modality: 'text',
                  dimensions: 128,
                  description: 'Local text',
                  available: true,
                  is_local_lightweight: true,
                },
                {
                  model_id: 'local-image-descriptor-96',
                  name: 'Local Visual Descriptor Image (96D)',
                  modality: 'image',
                  dimensions: 96,
                  description: 'Local image',
                  available: true,
                  is_local_lightweight: true,
                },
              ]),
          });
        }
        if (url === '/api/embeddings/reducers') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { method: 'pca', name: 'PCA', description: 'PCA', available: true, supports_3d: true },
                { method: 'tsne', name: 't-SNE', description: 't-SNE', available: true, supports_3d: true },
                { method: 'umap', name: 'UMAP', description: 'UMAP', available: false, supports_3d: true, install_hint: 'Optional' },
              ]),
          });
        }
        if (url === '/api/embeddings/spaces') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ spaces: [SAMPLE_SPACE], total: 1 }),
          });
        }
        if (url === '/api/datasets') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ datasets: [], total: 0 }),
          });
        }
        if (url === '/api/embeddings/spaces/text' && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(CUSTOM_SPACE),
          });
        }
        if (url.includes('/project')) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                space: url.includes('emb-custom99') ? CUSTOM_SPACE : SAMPLE_SPACE,
                method: body.method ?? 'pca',
                dimensions: body.dimensions ?? 2,
                points: [
                  {
                    index: 0,
                    label: 'Polars DataFrame',
                    snippet: 'Polars is a fast columnar DataFrame engine.',
                    x: 0.42,
                    y: -0.18,
                    z: body.dimensions === 3 ? 0.11 : null,
                    cluster: 0,
                    metadata: { category: 'Data Engineering' },
                  },
                ],
                clusters: [{ cluster_id: 0, count: 1, percentage: 100 }],
                explained_variance_ratio: body.method === 'pca' ? [0.24, 0.15] : null,
                total_points: 18,
                filtered_points: 18,
                effective_params: {},
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  it('loads sample embedding space and switches projection controls', async () => {
    render(<EmbeddingExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByText('Sample Embedding Space:')).toBeInTheDocument();
      expect(screen.getByText(/pca \(2D\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('3D'));
    await waitFor(() => {
      expect(screen.getByText(/pca \(3D\)/i)).toBeInTheDocument();
    });
  });

  it('opens space builder, enforces modality-specific model options, and submits text space', async () => {
    render(<EmbeddingExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Embedding Space/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /New Embedding Space/i }));
    expect(screen.getByLabelText('Text model adapter')).toBeInTheDocument();

    // Switch to image mode -> shows image model adapter
    fireEvent.click(screen.getByText('Local Images'));
    expect(screen.getByLabelText('Image model adapter')).toBeInTheDocument();

    // Switch back to text mode and submit
    fireEvent.click(screen.getByText('Text / Sentences'));
    fireEvent.click(screen.getByText('Generate & Project'));

    await waitFor(() => {
      expect(screen.getByText(/Projected 18 of 18 points/i)).toBeInTheDocument();
    });
  });
});
