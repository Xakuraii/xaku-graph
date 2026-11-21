import React, { useRef, useState } from 'react';
import {
  Code2,
  Database,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DatasetSummary } from '../../../types/api';
import { StatusBadge } from '../../../components/StatusBadge';

interface DatasetManagerBarProps {
  datasets: DatasetSummary[];
  activeDatasetId: string;
  uploading: boolean;
  onSelect: (id: string) => void;
  onUpload: (file: File, customName?: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}

const ACCEPTED_EXTENSIONS = '.csv,.json,.jsonl,.parquet,.xlsx';

const SAMPLE_CSV_CODE = [
  'model,accuracy,latency_ms,domain',
  'mini-transformer,0.91,18.4,NLP',
  'distil-bert,0.94,32.1,NLP',
  'resnet-50,0.89,24.7,Vision',
  'xgboost-tabular,0.96,4.2,Tabular',
].join('\n');

const SAMPLE_JSON_CODE = JSON.stringify(
  [
    { model: 'mini-transformer', accuracy: 0.91, latency_ms: 18.4, domain: 'NLP' },
    { model: 'distil-bert', accuracy: 0.94, latency_ms: 32.1, domain: 'NLP' },
    { model: 'resnet-50', accuracy: 0.89, latency_ms: 24.7, domain: 'Vision' },
    { model: 'xgboost-tabular', accuracy: 0.96, latency_ms: 4.2, domain: 'Tabular' },
  ],
  null,
  2
);

export const DatasetManagerBar: React.FC<DatasetManagerBarProps> = ({
  datasets,
  activeDatasetId,
  uploading,
  onSelect,
  onUpload,
  onDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'json' | 'jsonl'>('csv');
  const [pasteName, setPasteName] = useState('Pasted Dataset');
  const [pasteContent, setPasteContent] = useState(SAMPLE_CSV_CODE);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await onUpload(files[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    await handleFiles(e.dataTransfer.files);
  };

  const handleLoadSampleSnippet = (fmt: 'csv' | 'json') => {
    setPasteFormat(fmt);
    setPasteContent(fmt === 'csv' ? SAMPLE_CSV_CODE : SAMPLE_JSON_CODE);
    setPasteError(null);
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasteError(null);
    const trimmed = pasteContent.trim();
    if (!trimmed) {
      setPasteError('Paste CSV, JSON, or JSONL data before importing.');
      return;
    }

    if (pasteFormat === 'json') {
      try {
        JSON.parse(trimmed);
      } catch (err) {
        setPasteError(
          err instanceof Error ? `Invalid JSON syntax: ${err.message}` : 'Invalid JSON syntax.'
        );
        return;
      }
    }

    const safeStem =
      pasteName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'pasted_dataset';
    const mimeType = pasteFormat === 'csv' ? 'text/csv' : 'application/json';
    const file = new File([trimmed], `${safeStem}.${pasteFormat}`, { type: mimeType });

    const result = await onUpload(file, pasteName.trim() || 'Pasted Dataset');
    if (result) {
      setShowPasteModal(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Dataset Selector */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Active Dataset
              </span>
            </div>
            {activeDataset?.is_sample && <StatusBadge status="sample" label="Sample Fixture" />}
          </div>

          <div className="flex items-center space-x-2">
            <select
              aria-label="Select dataset"
              value={activeDatasetId}
              onChange={(e) => onSelect(e.target.value)}
              className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {datasets.length === 0 ? (
                <option value="sample-iris-dataset">Iris Benchmark Sample (30 samples)</option>
              ) : (
                datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.row_count.toLocaleString()} rows ·{' '}
                    {ds.source_format.toUpperCase()}
                    {ds.is_sample ? ' · Sample' : ''})
                  </option>
                ))
              )}
            </select>

            {activeDataset && !activeDataset.is_sample && (
              <button
                type="button"
                onClick={() => void onDelete(activeDataset.id)}
                title="Delete uploaded dataset"
                aria-label="Delete uploaded dataset"
                className="p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Local File Upload & Paste Code Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => void handleDrop(e)}
          className={`lg:col-span-6 rounded-xl border-2 border-dashed p-4 flex flex-wrap items-center justify-between gap-3 transition-colors ${
            dragActive
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {uploading ? 'Ingesting & profiling dataset...' : 'Import Local Dataset'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Upload CSV, JSON, JSONL, Parquet, XLSX or paste code
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={(e) => void handleFiles(e.target.files)}
            className="hidden"
            data-testid="dataset-file-input"
          />

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={uploading}
              onClick={() => setShowPasteModal((prev) => !prev)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors disabled:opacity-50"
            >
              <Code2 className="w-3.5 h-3.5 text-sky-500" />
              <span>Paste CSV / JSON</span>
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Paste CSV / JSON Code Panel */}
      {showPasteModal && (
        <form
          onSubmit={(e) => void handlePasteSubmit(e)}
          className="bg-white dark:bg-slate-900/80 border border-brand-500/40 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Paste CSV, JSON, or JSONL Code
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              aria-label="Close paste dataset panel"
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Dataset Name
              </label>
              <input
                type="text"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
                placeholder="My Custom Dataset"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Code Format
              </label>
              <select
                aria-label="Pasted dataset format"
                value={pasteFormat}
                onChange={(e) => setPasteFormat(e.target.value as 'csv' | 'json' | 'jsonl')}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-slate-900 dark:text-white"
              >
                <option value="csv">CSV (Comma-Separated Values)</option>
                <option value="json">JSON (Array of Objects or Columnar Dict)</option>
                <option value="jsonl">JSONL (Newline-Delimited JSON)</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => handleLoadSampleSnippet('csv')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Load CSV Sample
              </button>
              <button
                type="button"
                onClick={() => handleLoadSampleSnippet('json')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Load JSON Sample
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1">
              Raw {pasteFormat.toUpperCase()} Data
            </label>
            <textarea
              aria-label="Pasted dataset code"
              rows={7}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste CSV rows or JSON array/object..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-900 dark:text-slate-100"
            />
          </div>

          {pasteError && (
            <p className="text-rose-600 dark:text-rose-400 font-medium">{pasteError}</p>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !pasteContent.trim()}
              className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold disabled:opacity-50"
            >
              {uploading ? 'Importing...' : 'Import Pasted Data'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
