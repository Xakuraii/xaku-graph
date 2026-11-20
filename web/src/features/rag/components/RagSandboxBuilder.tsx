import React, { useState } from 'react';
import { Loader2, Scissors } from 'lucide-react';
import { CreateRagSandboxRequest, EmbeddingModelInfo } from '../../../types/api';

interface RagSandboxBuilderProps {
  textModels: EmbeddingModelInfo[];
  creating: boolean;
  onCreate: (payload: CreateRagSandboxRequest) => Promise<unknown>;
  onClose: () => void;
}

const DEFAULT_DOC_CONTENT =
  'Retrieval-Augmented Generation combines dense vector retrieval with source document grounding. ' +
  'Choosing the right chunk size and overlap prevents splitting key technical facts across chunk boundaries. ' +
  'XakuGraph lets engineers inspect each chunk, its metadata, and its original high-dimensional embedding vector.';

export const RagSandboxBuilder: React.FC<RagSandboxBuilderProps> = ({
  textModels,
  creating,
  onCreate,
  onClose,
}) => {
  const [name, setName] = useState('Custom RAG Chunk Sandbox');
  const [modelId, setModelId] = useState('local-text-hash-128');
  const [chunkSize, setChunkSize] = useState(140);
  const [chunkOverlap, setChunkOverlap] = useState(25);
  const [docTitle, setDocTitle] = useState('RAG Chunking Notes');
  const [docContent, setDocContent] = useState(DEFAULT_DOC_CONTENT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;
    const res = await onCreate({
      name: name.trim() || 'Custom RAG Sandbox',
      model_id: modelId,
      chunk_size: chunkSize,
      chunk_overlap: Math.min(chunkOverlap, chunkSize - 1),
      documents: [
        {
          title: docTitle.trim(),
          source: 'local-sandbox',
          content: docContent.trim(),
          metadata: { source_type: 'sandbox' },
        },
      ],
    });
    if (res) onClose();
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-white dark:bg-slate-900/80 border border-brand-500/40 rounded-xl p-5 space-y-4 shadow-lg"
    >
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Scissors className="w-4 h-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Local Document Chunker & Indexing Sandbox
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="md:col-span-2">
          <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
            Collection Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
            Text Model
          </label>
          <select
            aria-label="Sandbox embedding model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
          >
            {textModels.map((m) => (
              <option key={m.model_id} value={m.model_id} disabled={!m.available}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
              Chunk Size ({chunkSize})
            </label>
            <input
              type="number"
              min={40}
              max={2000}
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-white font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
              Overlap ({chunkOverlap})
            </label>
            <input
              type="number"
              min={0}
              max={Math.max(0, chunkSize - 1)}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
            Document Title
          </label>
          <input
            type="text"
            required
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
            Document Content
          </label>
          <textarea
            rows={4}
            required
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-white font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs disabled:opacity-50"
        >
          {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{creating ? 'Chunking & Indexing...' : 'Chunk & Index Locally'}</span>
        </button>
      </div>
    </form>
  );
};
