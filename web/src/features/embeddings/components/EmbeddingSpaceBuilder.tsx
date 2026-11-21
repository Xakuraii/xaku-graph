import React, { useEffect, useState } from 'react';
import { Database, FileText, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import {
  CreateDatasetEmbeddingSpaceRequest,
  CreateTextEmbeddingSpaceRequest,
  DatasetSummary,
  EmbeddingModelInfo,
} from '../../../types/api';

type BuilderMode = 'text' | 'dataset' | 'image';

interface EmbeddingSpaceBuilderProps {
  models: EmbeddingModelInfo[];
  datasets: DatasetSummary[];
  creating: boolean;
  onCreateText: (payload: CreateTextEmbeddingSpaceRequest) => Promise<unknown>;
  onCreateFromDataset: (payload: CreateDatasetEmbeddingSpaceRequest) => Promise<unknown>;
  onCreateImages: (name: string, modelId: string, files: File[]) => Promise<unknown>;
  onClose: () => void;
}

const DEFAULT_TEXT_LINES = [
  'Transformer Attention | Self-attention weighs token relationships across sequences | ML',
  'Gradient Descent | Iterative optimization updates model weights | ML',
  'Polars DataFrame | Fast columnar engine for tabular analytics | Data',
  'Apache Parquet | Compressed columnar format for analytical storage | Data',
  'Cosine Similarity | Measures angle between original high-dimensional vectors | Vectors',
].join('\n');

export const EmbeddingSpaceBuilder: React.FC<EmbeddingSpaceBuilderProps> = ({
  models,
  datasets,
  creating,
  onCreateText,
  onCreateFromDataset,
  onCreateImages,
  onClose,
}) => {
  const [mode, setMode] = useState<BuilderMode>('text');
  const [spaceName, setSpaceName] = useState<string>('Custom Embedding Space');

  const textModels = models.filter((m) => m.modality === 'text');
  const imageModels = models.filter((m) => m.modality === 'image');

  const [textModelId, setTextModelId] = useState<string>('local-text-hash-128');
  const [imageModelId, setImageModelId] = useState<string>('local-image-descriptor-96');

  const [rawTextLines, setRawTextLines] = useState<string>(DEFAULT_TEXT_LINES);

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    datasets[0]?.id ?? 'sample-iris-dataset'
  );
  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
  const [textColumn, setTextColumn] = useState<string>('');
  const [metaColumn, setMetaColumn] = useState<string>('');

  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (selectedDataset && selectedDataset.columns.length > 0) {
      if (!selectedDataset.columns.includes(textColumn)) {
        setTextColumn(selectedDataset.columns[selectedDataset.columns.length - 1]);
      }
    }
  }, [selectedDataset, textColumn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'text') {
      const trimmed = rawTextLines.trim();
      if (!trimmed) return;

      let items: { label: string; text: string; metadata: Record<string, unknown> }[] = [];
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed) as Array<Record<string, unknown> | string>;
          items = parsed.map((entry, idx) => {
            if (typeof entry === 'string') {
              return { label: `Item ${idx + 1}`, text: entry, metadata: {} };
            }
            const label = String(entry.label ?? entry.title ?? `Item ${idx + 1}`);
            const text = String(entry.text ?? entry.content ?? '');
            const { label: _l, title: _t, text: _tx, content: _c, ...rest } = entry;
            return { label, text, metadata: rest };
          });
        } catch {
          return;
        }
      } else {
        const lines = trimmed
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length < 2) return;

        items = lines.map((line, idx) => {
          const parts = line.split('|').map((p) => p.trim());
          if (parts.length >= 2) {
            return {
              label: parts[0] || `Item ${idx + 1}`,
              text: parts[1],
              metadata: parts[2] ? { category: parts[2] } : {},
            };
          }
          return { label: `Item ${idx + 1}`, text: line, metadata: {} };
        });
      }

      if (items.length < 2) return;

      const res = await onCreateText({
        name: spaceName.trim() || 'Custom Text Embeddings',
        model_id: textModelId,
        items,
      });
      if (res) onClose();
    } else if (mode === 'dataset') {
      if (!selectedDatasetId || !textColumn) return;
      const res = await onCreateFromDataset({
        dataset_id: selectedDatasetId,
        text_column: textColumn,
        metadata_columns: metaColumn ? [metaColumn] : [],
        model_id: textModelId,
        name: spaceName.trim() || undefined,
      });
      if (res) onClose();
    } else if (mode === 'image') {
      if (imageFiles.length < 2) return;
      const res = await onCreateImages(
        spaceName.trim() || 'Local Image Embeddings',
        imageModelId,
        imageFiles
      );
      if (res) onClose();
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-white dark:bg-slate-900/80 border border-brand-500/40 rounded-xl p-5 space-y-4 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Create Local Embedding Space
          </h2>
        </div>

        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-xs">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md transition-colors ${
              mode === 'text'
                ? 'bg-brand-600 text-slate-950 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text / Sentences</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('dataset')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md transition-colors ${
              mode === 'dataset'
                ? 'bg-brand-600 text-slate-950 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>From Dataset</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-md transition-colors ${
              mode === 'image'
                ? 'bg-brand-600 text-slate-950 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Local Images</span>
          </button>
        </div>
      </div>

      {/* Name + Modality-Scoped Model Adapter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Space Name
          </label>
          <input
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            {mode === 'image' ? 'Image Embedding Model Adapter' : 'Text Embedding Model Adapter'}
          </label>
          {mode === 'image' ? (
            <select
              aria-label="Image model adapter"
              value={imageModelId}
              onChange={(e) => setImageModelId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {imageModels.map((m) => (
                <option key={m.model_id} value={m.model_id} disabled={!m.available}>
                  {m.name} {!m.available ? '(Install .[ml] extra)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <select
              aria-label="Text model adapter"
              value={textModelId}
              onChange={(e) => setTextModelId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {textModels.map((m) => (
                <option key={m.model_id} value={m.model_id} disabled={!m.available}>
                  {m.name} {!m.available ? '(Install .[ml] extra)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Mode-specific inputs */}
      {mode === 'text' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Items (one per line: <code>Label | Text | Category</code>, or paste JSON array{' '}
            <code>[{`{"label": "...", "text": "..."}`}]</code>)
          </label>
          <textarea
            rows={5}
            value={rawTextLines}
            onChange={(e) => setRawTextLines(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-mono text-slate-900 dark:text-white"
          />
        </div>
      )}

      {mode === 'dataset' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Source Dataset
            </label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.row_count} rows)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Text / Label Column to Embed
            </label>
            <select
              value={textColumn}
              onChange={(e) => setTextColumn(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {selectedDataset?.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Metadata Column (optional)
            </label>
            <select
              value={metaColumn}
              onChange={(e) => setMetaColumn(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="">None</option>
              {selectedDataset?.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {mode === 'image' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Select Local Images (at least 2 PNG/JPG/WebP/BMP files)
          </label>
          <input
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.bmp"
            onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200"
          />
          {imageFiles.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-1">
              Selected {imageFiles.length} image(s)
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={creating || (mode === 'image' && imageFiles.length < 2)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs disabled:opacity-50"
        >
          {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{creating ? 'Generating Embeddings...' : 'Generate & Project'}</span>
        </button>
      </div>
    </form>
  );
};
