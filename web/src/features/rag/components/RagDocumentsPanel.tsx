import React, { useState } from 'react';
import { Binary, FileText, Layers, Search } from 'lucide-react';
import { RagCollectionInspectResponse } from '../../../types/api';

interface RagDocumentsPanelProps {
  inspection: RagCollectionInspectResponse | null;
  selectedDocId: string;
  chunkSearch: string;
  loading: boolean;
  onSelectDoc: (docId: string) => void;
  onChangeChunkSearch: (search: string) => void;
}

export const RagDocumentsPanel: React.FC<RagDocumentsPanelProps> = ({
  inspection,
  selectedDocId,
  chunkSearch,
  loading,
  onSelectDoc,
  onChangeChunkSearch,
}) => {
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);

  if (loading && !inspection) {
    return (
      <div className="h-64 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs text-slate-500">
        Loading documents and chunks...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="h-48 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        No RAG collection loaded.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Documents Sidebar */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-brand-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Source Documents ({inspection.documents.length})
            </h2>
          </div>
        </div>

        <div className="space-y-2 max-h-[32rem] overflow-y-auto">
          <button
            type="button"
            onClick={() => onSelectDoc('')}
            className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
              selectedDocId === ''
                ? 'bg-brand-500/10 border-brand-500/40 text-brand-700 dark:text-brand-400 font-semibold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            All Documents ({inspection.collection.chunk_count} total chunks)
          </button>

          {inspection.documents.map((doc) => {
            const isSelected = selectedDocId === doc.doc_id;
            return (
              <button
                key={doc.doc_id}
                type="button"
                onClick={() => onSelectDoc(doc.doc_id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-colors space-y-1 ${
                  isSelected
                    ? 'bg-brand-500/10 border-brand-500/40'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div className="font-semibold text-slate-900 dark:text-white truncate">
                  {doc.title}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span className="truncate">{doc.source}</span>
                  <span className="shrink-0 ml-2">{doc.chunk_count} chunks</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chunks & Vector Inspector */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={chunkSearch}
              onChange={(e) => onChangeChunkSearch(e.target.value)}
              placeholder="Filter chunks by text or document title..."
              aria-label="Filter chunks"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <span className="text-xs font-mono text-slate-500 shrink-0">
            {inspection.chunks.length} / {inspection.total_chunks} chunks
          </span>
        </div>

        <div className="space-y-3">
          {inspection.chunks.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs text-slate-500">
              No chunks match the current document or search filter.
            </div>
          ) : (
            inspection.chunks.map((chunk) => {
              const isExpanded = expandedChunkId === chunk.chunk_id;
              return (
                <div
                  key={chunk.chunk_id}
                  className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-700 dark:text-brand-400 font-semibold">
                        #{chunk.chunk_index}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {chunk.doc_title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                      <span>{chunk.char_count} chars</span>
                      {chunk.char_start !== null && chunk.char_start !== undefined && (
                        <span>
                          [{chunk.char_start}..{chunk.char_end}]
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedChunkId(isExpanded ? null : chunk.chunk_id)}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-brand-500"
                      >
                        <Binary className="w-3 h-3 text-sky-500" />
                        <span>{isExpanded ? 'Hide Vector' : `Vector (${chunk.embedding_dimension}D)`}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {chunk.content}
                  </p>

                  {Object.keys(chunk.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(chunk.metadata).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center space-x-1">
                          <Layers className="w-3 h-3 text-brand-500" />
                          <span>Embedding Vector Preview ({chunk.embedding_dimension}D)</span>
                        </span>
                        {chunk.embedding_norm !== null && chunk.embedding_norm !== undefined && (
                          <span>L2 Norm: {chunk.embedding_norm}</span>
                        )}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 break-all">
                        [{chunk.embedding_preview.join(', ')}
                        {chunk.embedding_dimension > chunk.embedding_preview.length ? ', …' : ''}]
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
