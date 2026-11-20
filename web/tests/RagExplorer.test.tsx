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
});
