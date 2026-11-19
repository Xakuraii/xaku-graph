import React from 'react';
import { AlertCircle, Binary, Grid, ListOrdered, ShieldAlert } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { useVectorExplorer, VectorTabId } from '../../hooks/useVectorExplorer';
import { VectorPairwisePanel } from './components/VectorPairwisePanel';
import { VectorRankingPanel } from './components/VectorRankingPanel';
import { VectorSpacePanel } from './components/VectorSpacePanel';

interface VectorExplorerProps {
  isDark?: boolean;
}

const TABS: {
  id: VectorTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'pairwise', label: 'Pairwise Comparison', icon: Binary },
  { id: 'ranking', label: 'Nearest-Neighbor Ranking', icon: ListOrdered },
  { id: 'space', label: 'Vector Space & Matrix', icon: Grid },
];

export const VectorExplorer: React.FC<VectorExplorerProps> = ({ isDark = true }) => {
  const {
    activeTab,
    setActiveTab,
    vecAStr,
    setVecAStr,
    vecBStr,
    setVecBStr,
    pairwiseResult,
    inspectA,
    inspectB,
    loadPairwisePreset,
    calculatePairwise,
    queryStr,
    setQueryStr,
    candidateLines,
    setCandidateLines,
    metric,
    setMetric,
    searchResult,
    runNeighborSearch,
    matrixResult,
    computeSpaceMatrix,
    loading,
    error,
  } = useVectorExplorer();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Vector & Similarity Explorer
            </h1>
            <StatusBadge status="live" label="Phase 4 Active" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore mathematical vector properties, normalization, pairwise metrics, and
            nearest-neighbor rankings in original high-dimensional space.
          </p>
        </div>
      </div>

      {/* Architectural Invariant Banner */}
      <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-white">
            Architectural Invariant:{' '}
          </span>
          Similarity and distance computations always execute on{' '}
          <strong>original high-dimensional coordinates</strong>. 2D/3D projections (PCA, t-SNE,
          UMAP) are used strictly for visual rendering, never as substitutes for exact vector math.
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <nav className="flex space-x-1" aria-label="Vector explorer tabs">
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

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center space-x-3 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'pairwise' && (
        <VectorPairwisePanel
          vecAStr={vecAStr}
          vecBStr={vecBStr}
          result={pairwiseResult}
          inspectA={inspectA}
          inspectB={inspectB}
          loading={loading}
          isDark={isDark}
          onChangeA={setVecAStr}
          onChangeB={setVecBStr}
          onPreset={loadPairwisePreset}
          onCalculate={() => void calculatePairwise()}
        />
      )}

      {activeTab === 'ranking' && (
        <VectorRankingPanel
          queryStr={queryStr}
          candidateLines={candidateLines}
          metric={metric}
          searchResult={searchResult}
          loading={loading}
          onChangeQuery={setQueryStr}
          onChangeCandidates={setCandidateLines}
          onChangeMetric={setMetric}
          onSearch={() => void runNeighborSearch()}
        />
      )}

      {activeTab === 'space' && (
        <VectorSpacePanel
          candidateLines={candidateLines}
          metric={metric}
          matrixResult={matrixResult}
          loading={loading}
          isDark={isDark}
          onChangeCandidates={setCandidateLines}
          onChangeMetric={setMetric}
          onCompute={() => void computeSpaceMatrix()}
        />
      )}
    </div>
  );
};
