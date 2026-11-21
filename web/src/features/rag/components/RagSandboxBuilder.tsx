import React, { useState } from 'react';
import { Code2, Loader2, Plus, Scissors, Trash2 } from 'lucide-react';
import { CreateRagSandboxRequest, EmbeddingModelInfo } from '../../../types/api';

interface RagSandboxBuilderProps {
  textModels: EmbeddingModelInfo[];
  creating: boolean;
  onCreate: (payload: CreateRagSandboxRequest) => Promise<unknown>;
  onClose: () => void;
}

interface DraftDoc {
  title: string;
  content: string;
}

const DEFAULT_DOCS: DraftDoc[] = [
  {
    title: 'RAG Chunking Notes',
    content:
      'Retrieval-Augmented Generation combines dense vector retrieval with source document grounding. ' +
      'Choosing the right chunk size and overlap prevents splitting key technical facts across chunk boundaries. ' +
      'XakuGraph lets engineers inspect each chunk, its metadata, and its original high-dimensional embedding vector.',
  },
];

const SAMPLE_PASTE_DOCS_JSON = JSON.stringify(
  [
    {
      title: 'Vector Similarity Guide',
      content:
        'Cosine similarity compares embedding orientation while Euclidean distance captures straight-line separation in vector space.',
    },
    {
      title: 'Chunk Overlap Tradeoffs',
      content:
        'Adding 15-25% sliding window overlap preserves sentence continuity across chunk boundaries during retrieval.',
    },
  ],
  null,
  2
);

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
  const [inputMode, setInputMode] = useState<'form' | 'paste'>('form');
  const [docs, setDocs] = useState<DraftDoc[]>(DEFAULT_DOCS);
  const [pasteRaw, setPasteRaw] = useState<string>(SAMPLE_PASTE_DOCS_JSON);
  const [parseError, setParseError] = useState<string | null>(null);

  const updateDoc = (idx: number, patch: Partial<DraftDoc>) => {
    setDocs((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const addDoc = () => {
    setDocs((prev) => [...prev, { title: `Document ${prev.length + 1}`, content: '' }]);
  };

  const removeDoc = (idx: number) => {
    setDocs((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const parsePastedDocs = (): {
    title: string;
    source: string;
    content: string;
    metadata: Record<string, unknown>;
  }[] => {
    const trimmed = pasteRaw.trim();
    if (!trimmed) {
      throw new Error('Paste JSON array or CSV rows (title,content).');
    }
    if (trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed) as Array<Record<string, unknown>>;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('JSON must be a non-empty array of { title, content } objects.');
      }
      return parsed.map((item, idx) => ({
        title: String(item.title ?? `Document ${idx + 1}`),
        source: String(item.source ?? 'pasted-json'),
        content: String(item.content ?? item.text ?? ''),
        metadata: { source_type: 'pasted_json' },
      }));
    }

    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const startIdx = lines[0]?.toLowerCase().startsWith('title,') ? 1 : 0;
    const parsedDocs = lines.slice(startIdx).map((line, idx) => {
      const commaIdx = line.indexOf(',');
      if (commaIdx === -1) {
        return {
          title: `Document ${idx + 1}`,
          source: 'pasted-csv',
          content: line,
          metadata: { source_type: 'pasted_csv' },
        };
      }
      return {
        title: line.slice(0, commaIdx).replace(/^"|"$/g, '').trim() || `Document ${idx + 1}`,
        source: 'pasted-csv',
        content: line.slice(commaIdx + 1).replace(/^"|"$/g, '').trim(),
        metadata: { source_type: 'pasted_csv' },
      };
    });
    if (parsedDocs.length === 0) {
      throw new Error('No document rows found in pasted CSV.');
    }
    return parsedDocs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);
    let preparedDocs;
    if (inputMode === 'paste') {
      try {
        preparedDocs = parsePastedDocs().filter((d) => d.content.trim().length > 0);
        if (preparedDocs.length === 0) {
          setParseError('Each document needs non-empty content.');
          return;
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Invalid pasted documents');
        return;
      }
    } else {
      preparedDocs = docs
        .filter((d) => d.title.trim() && d.content.trim())
        .map((d) => ({
          title: d.title.trim(),
          source: 'local-sandbox',
          content: d.content.trim(),
          metadata: { source_type: 'sandbox' },
        }));
      if (preparedDocs.length === 0) {
        setParseError('Provide at least one document with title and content.');
        return;
      }
    }

    const res = await onCreate({
      name: name.trim() || 'Custom RAG Sandbox',
      model_id: modelId,
      chunk_size: chunkSize,
      chunk_overlap: Math.min(chunkOverlap, chunkSize - 1),
      documents: preparedDocs,
    });
    if (res) onClose();
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-white dark:bg-slate-900/80 border border-brand-500/40 rounded-xl p-5 space-y-4 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Scissors className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Local Document Chunker & Indexing Sandbox
          </h2>
        </div>

        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-xs">
          <button
            type="button"
            onClick={() => setInputMode('form')}
            className={`px-2.5 py-1 rounded-md ${
              inputMode === 'form'
                ? 'bg-brand-600 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Document Editor ({docs.length})
          </button>
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md ${
              inputMode === 'paste'
                ? 'bg-brand-600 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Paste JSON / CSV</span>
          </button>
        </div>
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

      {inputMode === 'form' ? (
        <div className="space-y-3 text-xs">
          {docs.map((doc, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  required
                  aria-label={`Document ${idx + 1} title`}
                  value={doc.title}
                  onChange={(e) => updateDoc(idx, { title: e.target.value })}
                  placeholder="Document Title"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-slate-900 dark:text-white"
                />
                {docs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDoc(idx)}
                    aria-label={`Remove document ${idx + 1}`}
                    className="p-1.5 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                required
                aria-label={`Document ${idx + 1} content`}
                value={doc.content}
                onChange={(e) => updateDoc(idx, { content: e.target.value })}
                placeholder="Paste document text to chunk..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-white font-mono"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addDoc}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Document</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 text-xs">
          <label className="block font-medium text-slate-600 dark:text-slate-300">
            Paste JSON array (<code>[{`{"title": "...", "content": "..."}`}]</code>) or CSV (
            <code>title,content</code>)
          </label>
          <textarea
            rows={6}
            value={pasteRaw}
            onChange={(e) => setPasteRaw(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-900 dark:text-white"
          />
        </div>
      )}

      {parseError && <p className="text-xs text-rose-600 dark:text-rose-400">{parseError}</p>}

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
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs disabled:opacity-50"
        >
          {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{creating ? 'Chunking & Indexing...' : 'Chunk & Index Locally'}</span>
        </button>
      </div>
    </form>
  );
};
