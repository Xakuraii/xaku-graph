import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RagExplorer } from '../src/features/rag/RagExplorer';

const SAMPLE_COLLECTION = {
  id: 'sample-xakugraph-rag-docs',
  name: 'XakuGraph Knowledge Base Sample (5 Docs)',
  connector_type: 'local_rag' as const,
  document_count: 5,
  chunk_count: 10,
  dimension: 128,
  model_id: 'local-text-hash-128',
  read_only: true,
  is_sample: true,
  metadata_keys: ['topic', 'source'],
};

describe('RagExplorer Stage 3', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === '/api/rag/connectors') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  connector_type: 'local_rag',
                  name: 'Local RAG Store',
                  description: 'Built-in',
                  available: true,
                  read_only: true,
                  connection_fields: [],
                },
                {
                  connector_type: 'chromadb',
                  name: 'ChromaDB (Read-Only)',
                  description: 'Chroma',
                  available: false,
                  read_only: true,
                  connection_fields: ['path', 'host'],
                  install_hint: 'Install .[rag]',
                },
              ]),
          });
        }
        if (url === '/api/rag/collections') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ collections: [SAMPLE_COLLECTION], total: 1 }),
          });
        }
        if (url.startsWith('/api/embeddings/models')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  model_id: 'local-text-hash-128',
                  name: 'Local Hash N-Gram Text (128D)',
                  modality: 'text',
                  dimensions: 128,
                  description: 'Local',
                  available: true,
                  is_local_lightweight: true,
                },
              ]),
          });
        }
        if (url.startsWith('/api/rag/collections/sample-xakugraph-rag-docs')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                collection: SAMPLE_COLLECTION,
                documents: [
                  {
                    doc_id: 'doc-rag-debugging',
                    title: 'RAG Pipeline Debugging & Read-Only Connectors',
                    source: 'docs/api/rag.md',
                    chunk_count: 2,
                    total_chars: 420,
                    metadata: { topic: 'RAG' },
                  },
                ],
                chunks: [
                  {
                    chunk_id: 'doc-rag-debugging::c0',
                    doc_id: 'doc-rag-debugging',
                    doc_title: 'RAG Pipeline Debugging & Read-Only Connectors',
                    chunk_index: 0,
                    content: 'XakuGraph connects to ChromaDB and Qdrant in strictly read-only mode.',
                    char_count: 71,
                    char_start: 0,
                    char_end: 71,
                    metadata: { topic: 'RAG', source: 'docs/api/rag.md' },
                    embedding_dimension: 128,
                    embedding_norm: 1.0,
                    embedding_preview: [0.12, -0.05, 0.09],
                  },
                ],
                total_chunks: 1,
                offset: 0,
                limit: 100,
              }),
          });
        }
        if (url === '/api/rag/sandbox' && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                ...SAMPLE_COLLECTION,
                id: 'rag-custom1',
                name: 'Custom RAG Chunk Sandbox',
                is_sample: false,
                read_only: false,
              }),
          });
        }
        if (url === '/api/rag/search' && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                collection_id: 'sample-xakugraph-rag-docs',
                connector_type: 'local_rag',
                query: 'How do ChromaDB and Qdrant read-only connectors inspect RAG chunks?',
                model_id: 'local-text-hash-128',
                metric: 'cosine_similarity',
                query_vector_dimension: 128,
                query_vector_preview: [0.21, -0.08, 0.15, 0.04, -0.11, 0.07],
                total_candidates: 10,
                results: [
                  {
                    rank: 1,
                    chunk_id: 'doc-rag-debugging::c0',
                    doc_id: 'doc-rag-debugging',
                    doc_title: 'RAG Pipeline Debugging & Read-Only Connectors',
                    chunk_index: 0,
                    content:
                      'XakuGraph connects to ChromaDB and Qdrant in strictly read-only mode.',
                    score: 0.9125,
                    cosine_similarity: 0.9125,
                    euclidean_distance: 0.4183,
                    dot_product: 0.9125,
                    metadata: { topic: 'RAG' },
                  },
                ],
              }),
          });
        }
        if (url === '/api/rag/compare' && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                query: 'How do ChromaDB and Qdrant read-only connectors inspect RAG chunks?',
                run_a: {
                  label: 'Cosine Similarity',
                  collection_id: 'sample-xakugraph-rag-docs',
                  metric: 'cosine_similarity',
                  results: [
                    {
                      rank: 1,
                      chunk_id: 'doc-rag-debugging::c0',
                      doc_id: 'doc-rag-debugging',
                      doc_title: 'RAG Pipeline Debugging & Read-Only Connectors',
                      chunk_index: 0,
                      content:
                        'XakuGraph connects to ChromaDB and Qdrant in strictly read-only mode.',
                      score: 0.9125,
                      cosine_similarity: 0.9125,
                      euclidean_distance: 0.4183,
                      dot_product: 0.9125,
                      metadata: { topic: 'RAG' },
                    },
                  ],
                },
                run_b: {
                  label: 'Euclidean L2 Distance',
                  collection_id: 'sample-xakugraph-rag-docs',
                  metric: 'euclidean_distance',
                  results: [
                    {
                      rank: 1,
                      chunk_id: 'doc-rag-debugging::c0',
                      doc_id: 'doc-rag-debugging',
                      doc_title: 'RAG Pipeline Debugging & Read-Only Connectors',
                      chunk_index: 0,
                      content:
                        'XakuGraph connects to ChromaDB and Qdrant in strictly read-only mode.',
                      score: 0.4183,
                      cosine_similarity: 0.9125,
                      euclidean_distance: 0.4183,
                      dot_product: 0.9125,
                      metadata: { topic: 'RAG' },
                    },
                    {
                      rank: 2,
                      chunk_id: 'doc-chunking::c1',
                      doc_id: 'doc-chunking',
                      doc_title: 'Chunk Size & Overlap Tradeoffs',
                      chunk_index: 1,
                      content: 'Smaller chunks improve precision while overlap preserves context.',
                      score: 0.7211,
                      cosine_similarity: 0.74,
                      euclidean_distance: 0.7211,
                      dot_product: 0.74,
                      metadata: { topic: 'Chunking' },
                    },
                  ],
                },
                overlap_count: 1,
                jaccard_overlap: 0.5,
                comparison_items: [
                  {
                    chunk_id: 'doc-rag-debugging::c0',
                    doc_title: 'RAG Pipeline Debugging & Read-Only Connectors',
                    chunk_index: 0,
                    status: 'both',
                    rank_a: 1,
                    rank_b: 1,
                    rank_delta: 0,
                    score_a: 0.9125,
                    score_b: 0.4183,
                  },
                  {
                    chunk_id: 'doc-chunking::c1',
                    doc_title: 'Chunk Size & Overlap Tradeoffs',
                    chunk_index: 1,
                    status: 'only_b',
                    rank_a: null,
                    rank_b: 2,
                    rank_delta: null,
                    score_a: null,
                    score_b: 0.7211,
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  it('displays sample RAG documents, chunks, metadata, and expands vector preview', async () => {
    render(<RagExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByText('Sample RAG Knowledge Base:')).toBeInTheDocument();
      expect(screen.getByText('Source Documents (1)')).toBeInTheDocument();
      expect(screen.getByText('topic: RAG')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Vector \(128D\)/i }));
    expect(screen.getByText(/L2 Norm: 1/i)).toBeInTheDocument();
  });

  it('opens chunk sandbox builder and external read-only connector drawer', async () => {
    render(<RagExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Chunk Sandbox/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Connect Chroma \/ Qdrant/i }));
    expect(screen.getByText('Read-Only External Vector DB Inspector')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /New Chunk Sandbox/i }));
    expect(screen.getByText('Local Document Chunker & Indexing Sandbox')).toBeInTheDocument();
  });

  it('runs retrieval playground search and renders ranking chart & scores', async () => {
    render(<RagExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retrieval Playground/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Retrieval Playground/i }));
    fireEvent.click(screen.getByRole('button', { name: /Run Retrieval Search/i }));

    await waitFor(() => {
      expect(screen.getByTestId('rag-retrieval-chart')).toBeInTheDocument();
      expect(screen.getByText('Rank #1')).toBeInTheDocument();
      expect(screen.getByText('cos: 0.9125')).toBeInTheDocument();
    });
  });

  it('runs side-by-side retrieval comparison and displays Jaccard overlap & rank table', async () => {
    render(<RagExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Compare Retrieval/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Compare Retrieval/i }));
    fireEvent.click(screen.getByRole('button', { name: /Compare Retrieval Results/i }));

    await waitFor(() => {
      expect(screen.getByTestId('rag-compare-chart')).toBeInTheDocument();
      expect(screen.getByText('50.0%')).toBeInTheDocument();
      expect(screen.getByText('Only B')).toBeInTheDocument();
    });
  });
});
