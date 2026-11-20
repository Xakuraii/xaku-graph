import React, { useState } from 'react';
import { Database, Link2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  ExternalConnectionConfig,
  RagCollectionSummary,
  VectorDbConnectorInfo,
} from '../../../types/api';
import { StatusBadge } from '../../../components/StatusBadge';

interface RagCollectionBarProps {
  connectors: VectorDbConnectorInfo[];
  collections: RagCollectionSummary[];
  activeCollectionId: string;
  activeCollection?: RagCollectionSummary;
  showSandboxBuilder: boolean;
  onSelectCollection: (id: string) => void;
  onDeleteSandbox: (id: string) => Promise<void>;
  onToggleSandboxBuilder: () => void;
  onConnectExternal: (config: ExternalConnectionConfig) => Promise<unknown>;
}

export const RagCollectionBar: React.FC<RagCollectionBarProps> = ({
  connectors,
  collections,
  activeCollectionId,
  activeCollection,
  showSandboxBuilder,
  onSelectCollection,
  onDeleteSandbox,
  onToggleSandboxBuilder,
  onConnectExternal,
}) => {
  const [showExternal, setShowExternal] = useState(false);
  const [extType, setExtType] = useState<'chromadb' | 'qdrant'>('chromadb');
  const [extPath, setExtPath] = useState('');
  const [extHost, setExtHost] = useState('127.0.0.1');
  const [extPort, setExtPort] = useState('8000');
  const [extCollection, setExtCollection] = useState('');

  const selectedConnector = connectors.find((c) => c.connector_type === extType);

  const handleExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extCollection.trim()) return;
    const res = await onConnectExternal({
      connector_type: extType,
      path: extPath.trim() || undefined,
      host: extPath.trim() ? undefined : extHost.trim() || '127.0.0.1',
      port: extPath.trim() ? undefined : Number(extPort) || (extType === 'chromadb' ? 8000 : 6333),
      collection_name: extCollection.trim(),
    });
    if (res) {
      setShowExternal(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Active RAG Collection
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeCollection && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {activeCollection.document_count} docs · {activeCollection.chunk_count} chunks ·{' '}
                  {activeCollection.dimension}D
                </span>
              )}
              {activeCollection?.read_only && (
                <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Read-Only</span>
                </span>
              )}
              {activeCollection?.is_sample && <StatusBadge status="sample" label="Sample KB" />}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select
              aria-label="Select RAG collection"
              value={activeCollectionId}
              onChange={(e) => onSelectCollection(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {collections.length === 0 ? (
                <option value="sample-xakugraph-rag-docs">
                  XakuGraph Knowledge Base Sample (5 Docs)
                </option>
              ) : (
                collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.chunk_count} chunks · {col.dimension}D)
                  </option>
                ))
              )}
            </select>

            {activeCollection &&
              activeCollection.connector_type === 'local_rag' &&
              !activeCollection.is_sample && (
                <button
                  type="button"
                  onClick={() => void onDeleteSandbox(activeCollection.id)}
                  title="Delete sandbox collection"
                  aria-label="Delete sandbox collection"
                  className="p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowExternal((prev) => !prev)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
          >
            <Link2 className="w-3.5 h-3.5 text-sky-500" />
            <span>Connect Chroma / Qdrant</span>
          </button>

          <button
            type="button"
            onClick={onToggleSandboxBuilder}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showSandboxBuilder ? 'Close Chunker' : 'New Chunk Sandbox'}</span>
          </button>
        </div>
      </div>

      {/* External Read-Only Connector Drawer */}
      {showExternal && (
        <form
          onSubmit={(e) => void handleExternalSubmit(e)}
          className="bg-white dark:bg-slate-900/80 border border-sky-500/40 rounded-xl p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Read-Only External Vector DB Inspector
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              {connectors
                .filter((c) => c.connector_type !== 'local_rag')
                .map((c) => (
                  <span
                    key={c.connector_type}
                    className={`px-2 py-0.5 rounded border font-mono ${
                      c.available
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {c.connector_type}: {c.available ? 'ready' : 'install .[rag]'}
                  </span>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Database Engine</label>
              <select
                aria-label="External DB engine"
                value={extType}
                onChange={(e) => {
                  const next = e.target.value as 'chromadb' | 'qdrant';
                  setExtType(next);
                  setExtPort(next === 'chromadb' ? '8000' : '6333');
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="chromadb">ChromaDB (Read-Only)</option>
                <option value="qdrant">Qdrant (Read-Only)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">
                Local Persist Path (optional)
              </label>
              <input
                type="text"
                value={extPath}
                onChange={(e) => setExtPath(e.target.value)}
                placeholder="e.g. D:/data/chroma"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Host (if HTTP)</label>
              <input
                type="text"
                disabled={extPath.trim().length > 0}
                value={extHost}
                onChange={(e) => setExtHost(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Port</label>
              <input
                type="number"
                disabled={extPath.trim().length > 0}
                value={extPort}
                onChange={(e) => setExtPort(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Collection Name *</label>
              <input
                type="text"
                required
                value={extCollection}
                onChange={(e) => setExtCollection(e.target.value)}
                placeholder="collection_name"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {selectedConnector && !selectedConnector.available && selectedConnector.install_hint && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              {selectedConnector.install_hint}
            </p>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowExternal(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs"
            >
              Inspect Read-Only
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
