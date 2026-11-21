import React from 'react';
import {
  AlertCircle,
  BarChart3,
  GitCompare,
  Info,
  LayoutList,
  RefreshCw,
  ShieldCheck,
  Table,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { DatasetTabId, useDatasetExplorer } from '../../hooks/useDatasetExplorer';
import { DatasetCorrelationsPanel } from './components/DatasetCorrelationsPanel';
import { DatasetDistributionsPanel } from './components/DatasetDistributionsPanel';
import { DatasetManagerBar } from './components/DatasetManagerBar';
import { DatasetOverviewPanel } from './components/DatasetOverviewPanel';
import { DatasetQualityPanel } from './components/DatasetQualityPanel';
import { DatasetRowsTable } from './components/DatasetRowsTable';

interface DatasetExplorerProps {
  isDark?: boolean;
}

const TABS: {
  id: DatasetTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview & Schema', icon: LayoutList },
  { id: 'data', label: 'Data Table & Filter', icon: Table },
  { id: 'distributions', label: 'Distributions & Box Plots', icon: BarChart3 },
  { id: 'quality', label: 'Data Quality & Outliers', icon: ShieldCheck },
  { id: 'correlations', label: 'Correlations & Relationships', icon: GitCompare },
];

export const DatasetExplorer: React.FC<DatasetExplorerProps> = ({ isDark = true }) => {
  const {
    datasets,
    activeDatasetId,
    activeTab,
    setActiveTab,
    inspection,
    rowsData,
    distributions,
    quality,
    correlations,
    rowsQuery,
    histogramBins,
    setHistogramBins,
    correlationMethod,
    setCorrelationMethod,
    loading,
    loadingAnalysis,
    uploading,
    error,
    selectDataset,
    uploadFile,
    deleteDataset,
    updateRowsQuery,
    refresh,
  } = useDatasetExplorer();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dataset Visualization
            </h1>
            <StatusBadge status="live" label="Active" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Import local CSV, JSON, JSONL, Parquet, or Excel datasets to inspect distributions,
            quality, outliers, and correlations.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading || loadingAnalysis ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Dataset Selector & File Upload */}
      <DatasetManagerBar
        datasets={datasets}
        activeDatasetId={activeDatasetId}
        uploading={uploading}
        onSelect={selectDataset}
        onUpload={uploadFile}
        onDelete={deleteDataset}
      />

      {/* Sample Disclaimer */}
      {inspection?.summary.is_sample && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start space-x-3">
          <Info className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Sample Dataset Verification:{' '}
            </span>
            The data displayed below is the official Iris ML benchmark fixture loaded from{' '}
            <code>data/samples/iris_sample.csv</code>. Upload any local CSV, JSON, JSONL, Parquet, or
            XLSX file above to analyze your own dataset locally.
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center space-x-3 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Module Sub-Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <nav className="flex space-x-1" aria-label="Dataset analysis tabs">
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

      {/* Loading State */}
      {loading && !inspection && (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-slate-100/60 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading dataset inspection from local backend...
          </p>
        </div>
      )}

      {/* Tab Content */}
      {inspection && (
        <div>
          {activeTab === 'overview' && <DatasetOverviewPanel dataset={inspection} />}
          {activeTab === 'data' && (
            <DatasetRowsTable
              columns={inspection.summary.columns}
              rowsData={rowsData}
              query={rowsQuery}
              loading={loadingAnalysis}
              onUpdateQuery={updateRowsQuery}
            />
          )}
          {activeTab === 'distributions' && (
            <DatasetDistributionsPanel
              data={distributions}
              bins={histogramBins}
              loading={loadingAnalysis}
              isDark={isDark}
              onChangeBins={setHistogramBins}
            />
          )}
          {activeTab === 'quality' && (
            <DatasetQualityPanel data={quality} loading={loadingAnalysis} isDark={isDark} />
          )}
          {activeTab === 'correlations' && (
            <DatasetCorrelationsPanel
              correlations={correlations}
              columns={inspection.columns}
              previewRows={inspection.preview_rows}
              method={correlationMethod}
              loading={loadingAnalysis}
              isDark={isDark}
              onChangeMethod={setCorrelationMethod}
            />
          )}
        </div>
      )}
    </div>
  );
};
