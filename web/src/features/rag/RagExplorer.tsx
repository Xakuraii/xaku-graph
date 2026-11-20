import React, { useState } from 'react';
import { AlertCircle, FileSearch, GitCompare, Info, RefreshCw, Search } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { RagTabId, useRagExplorer } from '../../hooks/useRagExplorer';
import { RagCollectionBar } from './components/RagCollectionBar';
import { RagComparePanel } from './components/RagComparePanel';
import { RagDocumentsPanel } from './components/RagDocumentsPanel';
import { RagPlaygroundPanel } from './components/RagPlaygroundPanel';
import { RagSandboxBuilder } from './components/RagSandboxBuilder';

interface RagExplorerProps {
  isDark?: boolean;
}

const TABS: {
  id: RagTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'inspect', label: 'Documents & Chunks', icon: FileSearch },
  { id: 'playground', label: 'Retrieval Playground', icon: Search },
  { id: 'compare', label: 'Compare Retrieval', icon: GitCompare },
];

export const RagExplorer: React.FC<RagExplorerProps> = ({ isDark = true }) => {
  const [showSandboxBuilder, setShowSandboxBuilder] = useState(false);

  const {
    connectors,
    collections,
    textModels,
    activeCollectionId,
    activeTab,
    setActiveTab,
    inspection,
    selectedDocId,
    setSelectedDocId,
    chunkSearch,
    setChunkSearch,
    query,
    setQuery,
    metric,
    setMetric,
    topK,
    setTopK,
    filterKey,
    setFilterKey,
    filterValue,
    setFilterValue,
    searchResult,
    strategyA,
    setStrategyA,
    strategyB,
    setStrategyB,
    compareResult,
    loading,
    loadingInspect,
    loadingSearch,
    creating,
    error,
    selectCollection,
    connectExternal,
    createSandbox,
    deleteSandbox,
    runSearch,
    runComparison,
    refresh,
  } = useRagExplorer();

  const activeCollection =
    inspection?.collection ?? collections.find((c) => c.id === activeCollectionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              RAG Visualization & Inspection
            </h1>
            <StatusBadge status="live" label="Phase 5 Active" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inspect source documents, chunk boundaries, metadata, embedding vectors, and debug
            retrieval rankings across local or read-only ChromaDB & Qdrant collections.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading || loadingInspect}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading || loadingInspect ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <RagCollectionBar
        connectors={connectors}
        collections={collections}
        activeCollectionId={activeCollectionId}
        activeCollection={activeCollection}
        showSandboxBuilder={showSandboxBuilder}
        onSelectCollection={selectCollection}
        onDeleteSandbox={deleteSandbox}
        onToggleSandboxBuilder={() => setShowSandboxBuilder((prev) => !prev)}
        onConnectExternal={connectExternal}
      />

      {showSandboxBuilder && (
        <RagSandboxBuilder
          textModels={textModels}
          creating={creating}
          onCreate={createSandbox}
          onClose={() => setShowSandboxBuilder(false)}
        />
      )}

      {activeCollection?.is_sample && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start space-x-3">
          <Info className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Sample RAG Knowledge Base:{' '}
            </span>
            Showing 5 XakuGraph technical documents chunked locally with{' '}
            <code>local-text-hash-128</code>. Click <strong>New Chunk Sandbox</strong> to test
            custom chunking, or <strong>Connect Chroma / Qdrant</strong> to inspect an existing
            vector database in read-only mode.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center space-x-3 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <nav className="flex space-x-1" aria-label="RAG explorer tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'inspect' && (
        <RagDocumentsPanel
          inspection={inspection}
          selectedDocId={selectedDocId}
          chunkSearch={chunkSearch}
          loading={loadingInspect}
          onSelectDoc={setSelectedDocId}
          onChangeChunkSearch={setChunkSearch}
        />
      )}

      {activeTab === 'playground' && (
        <RagPlaygroundPanel
          query={query}
          metric={metric}
          topK={topK}
          metadataKeys={activeCollection?.metadata_keys ?? []}
          filterKey={filterKey}
          filterValue={filterValue}
          searchResult={searchResult}
          loading={loadingSearch}
          isDark={isDark}
          onChangeQuery={setQuery}
          onChangeMetric={setMetric}
          onChangeTopK={setTopK}
          onChangeFilterKey={setFilterKey}
          onChangeFilterValue={setFilterValue}
          onSearch={runSearch}
        />
      )}

      {activeTab === 'compare' && (
        <RagComparePanel
          query={query}
          collections={collections}
          strategyA={strategyA}
          strategyB={strategyB}
          compareResult={compareResult}
          loading={loadingSearch}
          isDark={isDark}
          onChangeQuery={setQuery}
          onChangeStrategyA={setStrategyA}
          onChangeStrategyB={setStrategyB}
          onCompare={runComparison}
        />
      )}
    </div>
  );
};
