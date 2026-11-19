import React, { useRef, useState } from 'react';
import { Upload, Trash2, Database, FileSpreadsheet, Loader2 } from 'lucide-react';
import { DatasetSummary } from '../../../types/api';
import { StatusBadge } from '../../../components/StatusBadge';

interface DatasetManagerBarProps {
  datasets: DatasetSummary[];
  activeDatasetId: string;
  uploading: boolean;
  onSelect: (id: string) => void;
  onUpload: (file: File) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}

const ACCEPTED_EXTENSIONS = '.csv,.json,.jsonl,.parquet,.xlsx';

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Active Dataset Selector */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
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
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {datasets.length === 0 ? (
              <option value="sample-iris-dataset">Iris Benchmark Sample (30 samples)</option>
            ) : (
              datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.row_count.toLocaleString()} rows · {ds.source_format.toUpperCase()}
                  {ds.is_sample ? ' · Sample' : ''})
                </option>
              ))
            )}
          </select>

          {activeDataset && !activeDataset.is_sample && (
            <button
              onClick={() => void onDelete(activeDataset.id)}
              title="Delete uploaded dataset"
              aria-label="Delete uploaded dataset"
              className="p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Local File Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => void handleDrop(e)}
        className={`lg:col-span-5 rounded-xl border-2 border-dashed p-4 flex items-center justify-between transition-colors ${
          dragActive
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              {uploading ? 'Ingesting & profiling dataset...' : 'Import Local Dataset'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              CSV, JSON, JSONL, Parquet, XLSX (local-only)
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
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50 shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Choose File</span>
        </button>
      </div>
    </div>
  );
};
