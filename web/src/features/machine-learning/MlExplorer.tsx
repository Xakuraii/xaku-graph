import React, { useState } from 'react';
import { AlertCircle, BarChart3, LineChart, RefreshCw, Sparkles } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { MlTabId, useMlExplorer } from '../../hooks/useMlExplorer';
import { MlRunBar } from './components/MlRunBar';
import { MlRunBuilder } from './components/MlRunBuilder';
import { MlTrainingPanel } from './components/MlTrainingPanel';

interface MlExplorerProps {
  isDark?: boolean;
}

const TABS: {
  id: MlTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'training', label: 'Training & Curves', icon: LineChart },
  { id: 'evaluation', label: 'Evaluation & Matrix', icon: BarChart3 },
  { id: 'explainability', label: 'Features & Predictions', icon: Sparkles },
];

export const MlExplorer: React.FC<MlExplorerProps> = ({ isDark = true }) => {
  const [builderMode, setBuilderMode] = useState<'train' | 'import' | null>(null);

  const {
    runs,
    datasets,
    activeRunId,
    runDetail,
    activeTab,
    setActiveTab,
    loading,
    loadingRun,
    submitting,
    error,
    selectRun,
    trainModel,
    importRun,
    deleteRun,
    refresh,
  } = useMlExplorer();

  const activeRun = runs.find((r) => r.id === activeRunId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ML Model & Evaluation Visualization
            </h1>
            <StatusBadge status="in_development" label="Phase 6 Active" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inspect training curves, confusion matrices, regression residuals, feature importance,
            and prediction errors locally.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Runs</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center space-x-3 text-rose-600 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <MlRunBar
        runs={runs}
        activeRunId={activeRunId}
        activeRun={activeRun}
        submitting={submitting}
        onSelectRun={(id) => void selectRun(id)}
        onDeleteRun={(id) => void deleteRun(id)}
        onOpenTrainBuilder={() => setBuilderMode('train')}
        onOpenImportBuilder={() => setBuilderMode('import')}
      />

      {builderMode && (
        <MlRunBuilder
          mode={builderMode}
          datasets={datasets}
          submitting={submitting}
          onChangeMode={setBuilderMode}
          onTrain={trainModel}
          onImport={importRun}
          onClose={() => setBuilderMode(null)}
        />
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-brand-500/15 text-brand-700 dark:text-brand-400 border border-brand-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loadingRun || !runDetail ? (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-xs text-slate-500">
          {loading || loadingRun ? 'Loading ML evaluation run...' : 'Select or train a run to begin.'}
        </div>
      ) : (
        <>
          {activeTab === 'training' && <MlTrainingPanel run={runDetail} isDark={isDark} />}

          {(activeTab === 'evaluation' || activeTab === 'explainability') && (
            <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Confusion matrix, regression residuals, feature importance, and prediction error
              explorer loading in Stage 4.
            </div>
          )}
        </>
      )}
    </div>
  );
};
