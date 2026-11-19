import React, { useEffect, useState } from 'react';
import {
  Database,
  RefreshCw,
  Table,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { DatasetInspectionResponse } from '../../types/api';
import { StatusBadge } from '../../components/StatusBadge';

export const DatasetExplorer: React.FC = () => {
  const [dataset, setDataset] = useState<DatasetInspectionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getSampleDataset();
      setDataset(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to communicate with FastAPI backend engine'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSample();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Dataset Visualization
            </h1>
            <StatusBadge status="foundation_ready" label="Phase 2 Foundation" />
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Explore datasets, summary statistics, column distributions, and inspect underlying tabular data.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSample}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Sample</span>
          </button>
        </div>
      </div>

      {/* Sample Data Disclaimer Alert */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <span className="font-semibold text-amber-400">Sample Dataset Verification: </span>
          The data displayed below is the official Iris ML benchmark fixture loaded directly from the local Python backend via Polars (<code>data/samples/iris_sample.csv</code>). It serves to verify end-to-end data pipelines, API contracts, and column statistics. Custom user uploads will be enabled in Phase 2.
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-center space-x-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && !dataset && (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <RefreshCw className="w-6 h-6 text-brand-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading dataset inspection from backend...</p>
        </div>
      )}

      {/* Loaded Dataset Content */}
      {dataset && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Dataset Name</span>
              <p className="text-base font-semibold text-white mt-1 truncate" title={dataset.summary.name}>
                {dataset.summary.name}
              </p>
              <div className="mt-2 flex items-center space-x-1.5 text-xs text-brand-400">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="uppercase font-mono">{dataset.summary.source_format}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Total Rows</span>
              <p className="text-2xl font-bold text-white mt-1">
                {dataset.summary.row_count.toLocaleString()}
              </p>
              <span className="text-xs text-slate-500">Rows in memory</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Feature Columns</span>
              <p className="text-2xl font-bold text-white mt-1">
                {dataset.summary.column_count}
              </p>
              <span className="text-xs text-slate-500">Numerical & Categorical</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400 font-medium">Memory Footprint</span>
              <p className="text-2xl font-bold text-white mt-1">
                {(dataset.summary.memory_bytes / 1024).toFixed(2)} KB
              </p>
              <div className="mt-2 flex items-center space-x-1 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Optimized via Polars</span>
              </div>
            </div>
          </div>

          {/* Column Statistics Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Table className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-white">Column-Level Statistical Inspection</h2>
              </div>
              <span className="text-xs text-slate-400">{dataset.columns.length} columns analyzed</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Column</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Nulls</th>
                    <th className="px-4 py-3 font-medium">Unique</th>
                    <th className="px-4 py-3 font-medium">Min</th>
                    <th className="px-4 py-3 font-medium">Mean</th>
                    <th className="px-4 py-3 font-medium">Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {dataset.columns.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-medium text-white">{col.name}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">{col.dtype}</td>
                      <td className="px-4 py-2.5">
                        {col.null_count === 0 ? (
                          <span className="text-emerald-400">0 (0%)</span>
                        ) : (
                          <span className="text-amber-400">{col.null_count}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{col.unique_count}</td>
                      <td className="px-4 py-2.5 font-mono">
                        {col.min_value !== null ? String(col.min_value) : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {col.mean_value !== null && col.mean_value !== undefined
                          ? col.mean_value.toFixed(3)
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        {col.max_value !== null ? String(col.max_value) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabular Preview */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Tabular Data Preview</h2>
              </div>
              <span className="text-xs text-slate-400">
                Displaying first {dataset.preview_rows.length} rows
              </span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-500 w-12">#</th>
                    {dataset.summary.columns.map((colName) => (
                      <th key={colName} className="px-4 py-3 font-medium">
                        {colName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {dataset.preview_rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2 text-slate-600">{idx + 1}</td>
                      {dataset.summary.columns.map((colName) => (
                        <td key={colName} className="px-4 py-2">
                          {String(row[colName])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
