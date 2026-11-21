import React, { useEffect, useState } from 'react';
import { Cpu, Upload, X } from 'lucide-react';
import {
  DatasetSummary,
  MlAlgorithm,
  MlImportRequest,
  MlTaskType,
  MlTrainRequest,
} from '../../../types/api';

interface MlRunBuilderProps {
  mode: 'train' | 'import';
  datasets: DatasetSummary[];
  submitting: boolean;
  onChangeMode: (mode: 'train' | 'import') => void;
  onTrain: (payload: MlTrainRequest) => Promise<unknown>;
  onImport: (payload: MlImportRequest) => Promise<unknown>;
  onClose: () => void;
}

const SAMPLE_IMPORT_JSON = JSON.stringify(
  {
    name: 'Imported Classifier Validation Run',
    task_type: 'classification',
    algorithm: 'pytorch_mlp',
    target_column: 'sentiment',
    training_history: [
      { step: 1, label: 'Epoch 1', train_loss: 0.72, val_loss: 0.76, train_score: 0.65, val_score: 0.6 },
      { step: 2, label: 'Epoch 2', train_loss: 0.41, val_loss: 0.48, train_score: 0.84, val_score: 0.8 },
      { step: 3, label: 'Epoch 3', train_loss: 0.24, val_loss: 0.34, train_score: 0.92, val_score: 0.88 },
    ],
    feature_importances: [
      { feature: 'token_density', importance: 0.58 },
      { feature: 'exclamation_ratio', importance: 0.27 },
      { feature: 'length_chars', importance: 0.15 },
    ],
    predictions: [
      { actual: 'positive', predicted: 'positive', confidence: 0.94, features: { token_density: 0.81 } },
      { actual: 'negative', predicted: 'negative', confidence: 0.89, features: { token_density: 0.42 } },
      { actual: 'positive', predicted: 'negative', confidence: 0.54, features: { token_density: 0.51 } },
      { actual: 'negative', predicted: 'negative', confidence: 0.91, features: { token_density: 0.29 } },
    ],
  },
  null,
  2
);

const SAMPLE_IMPORT_CSV = [
  'actual,predicted,confidence',
  'setosa,setosa,0.98',
  'versicolor,versicolor,0.91',
  'virginica,versicolor,0.58',
  'virginica,virginica,0.94',
  'setosa,setosa,0.99',
].join('\n');

export const MlRunBuilder: React.FC<MlRunBuilderProps> = ({
  mode,
  datasets,
  submitting,
  onChangeMode,
  onTrain,
  onImport,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [datasetId, setDatasetId] = useState<string>(datasets[0]?.id ?? 'sample-iris-dataset');
  const [taskType, setTaskType] = useState<MlTaskType>('classification');
  const [algorithm, setAlgorithm] = useState<MlAlgorithm>('random_forest');
  const [targetColumn, setTargetColumn] = useState<string>('species');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [testSize, setTestSize] = useState<number>(0.25);
  const [nSteps, setNSteps] = useState<number>(10);

  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importName, setImportName] = useState('Imported CSV Evaluation Run');
  const [importTask, setImportTask] = useState<MlTaskType>('classification');
  const [importJson, setImportJson] = useState<string>(SAMPLE_IMPORT_JSON);
  const [parseError, setParseError] = useState<string | null>(null);

  const activeDataset = datasets.find((d) => d.id === datasetId) ?? datasets[0];
  const columns = activeDataset?.columns ?? [];

  useEffect(() => {
    if (!activeDataset || activeDataset.columns.length === 0) return;
    const defaultTarget =
      activeDataset.columns[activeDataset.columns.length - 1] ?? activeDataset.columns[0];
    setTargetColumn((prev) =>
      activeDataset.columns.includes(prev) ? prev : defaultTarget
    );
  }, [activeDataset]);

  useEffect(() => {
    setSelectedFeatures(columns.filter((c) => c !== targetColumn));
  }, [columns, targetColumn]);

  const handleTaskChange = (nextTask: MlTaskType) => {
    setTaskType(nextTask);
    if (nextTask === 'classification' && algorithm === 'ridge') {
      setAlgorithm('logistic_regression');
    } else if (nextTask === 'regression' && algorithm === 'logistic_regression') {
      setAlgorithm('ridge');
    }
  };

  const toggleFeature = (col: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(col) ? prev.filter((item) => item !== col) : [...prev, col]
    );
  };

  const handleTrainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datasetId || !targetColumn) return;
    const created = await onTrain({
      name: name.trim() || undefined,
      dataset_id: datasetId,
      task_type: taskType,
      target_column: targetColumn,
      feature_columns: selectedFeatures,
      algorithm,
      test_size: testSize,
      n_steps: nSteps,
    });
    if (created) onClose();
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);
    try {
      let payload: MlImportRequest;
      if (importFormat === 'csv') {
        const lines = importJson
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length < 3) {
          throw new Error('CSV needs a header row (actual,predicted) and at least 2 data rows.');
        }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const actualIdx = headers.indexOf('actual');
        const predIdx = headers.indexOf('predicted');
        const confIdx = headers.indexOf('confidence');
        if (actualIdx === -1 || predIdx === -1) {
          throw new Error('CSV header must include "actual" and "predicted" columns.');
        }
        const predictions = lines.slice(1).map((line) => {
          const cells = line.split(',').map((c) => c.trim());
          const rawActual = cells[actualIdx] ?? '';
          const rawPred = cells[predIdx] ?? '';
          const conf =
            confIdx !== -1 && cells[confIdx] !== undefined && cells[confIdx] !== ''
              ? Number(cells[confIdx])
              : undefined;
          return {
            actual: importTask === 'regression' ? Number(rawActual) : rawActual,
            predicted: importTask === 'regression' ? Number(rawPred) : rawPred,
            confidence: conf !== undefined && !Number.isNaN(conf) ? conf : undefined,
          };
        });
        payload = {
          name: importName.trim() || 'Imported CSV Evaluation Run',
          task_type: importTask,
          algorithm: 'imported_csv',
          target_column: 'target',
          predictions,
        };
      } else {
        payload = JSON.parse(importJson) as MlImportRequest;
      }
      const created = await onImport(payload);
      if (created) onClose();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid evaluation payload');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onChangeMode('train')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'train'
                ? 'bg-brand-600 text-slate-950'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Train Local Scikit-Learn Model</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode('import')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'import'
                ? 'bg-brand-600 text-slate-950'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import External Evaluation JSON</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close ML builder"
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {mode === 'train' ? (
        <form onSubmit={(e) => void handleTrainSubmit(e)} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Dataset Source
              </label>
              <select
                aria-label="Training dataset"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.row_count} rows)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Task & Algorithm
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="ML task type"
                  value={taskType}
                  onChange={(e) => handleTaskChange(e.target.value as MlTaskType)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-white"
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </select>
                <select
                  aria-label="ML algorithm"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as MlAlgorithm)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-slate-900 dark:text-white"
                >
                  <option value="random_forest">Random Forest</option>
                  <option value="gradient_boosting">Gradient Boosting</option>
                  {taskType === 'classification' ? (
                    <option value="logistic_regression">Logistic (SGD)</option>
                  ) : (
                    <option value="ridge">Ridge Linear (SGD)</option>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Target Column
              </label>
              <select
                aria-label="Target column"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Run Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Iris Random Forest v2"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Validation Split:{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {Math.round(testSize * 100)}%
                </span>
              </label>
              <input
                type="range"
                min={0.15}
                max={0.45}
                step={0.05}
                value={testSize}
                onChange={(e) => setTestSize(Number(e.target.value))}
                className="w-full accent-brand-500 mt-2"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1">
                Training Steps / Epochs:{' '}
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {nSteps}
                </span>
              </label>
              <input
                type="range"
                min={4}
                max={20}
                step={1}
                value={nSteps}
                onChange={(e) => setNSteps(Number(e.target.value))}
                className="w-full accent-brand-500 mt-2"
              />
            </div>
          </div>

          <div>
            <span className="block text-slate-600 dark:text-slate-400 mb-1.5">
              Input Features ({selectedFeatures.length} selected)
            </span>
            <div className="flex flex-wrap gap-2">
              {columns
                .filter((col) => col !== targetColumn)
                .map((col) => {
                  const active = selectedFeatures.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleFeature(col)}
                      className={`px-2.5 py-1 rounded-full font-mono text-[11px] border transition-colors ${
                        active
                          ? 'bg-brand-500/15 border-brand-500/40 text-brand-700 dark:text-brand-300'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      {col}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedFeatures.length === 0}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold disabled:opacity-50"
            >
              {submitting ? 'Training Locally...' : 'Run Local Training'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={(e) => void handleImportSubmit(e)} className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-slate-600 dark:text-slate-400">
              Paste evaluation predictions & optional training curves as JSON or CSV (
              <code>actual,predicted,confidence</code>). XakuGraph computes confusion matrices, F1,
              R², and residuals locally.
            </p>
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setImportFormat('json');
                  setImportJson(SAMPLE_IMPORT_JSON);
                  setParseError(null);
                }}
                className={`px-2.5 py-1 rounded-md ${
                  importFormat === 'json'
                    ? 'bg-brand-600 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportFormat('csv');
                  setImportJson(SAMPLE_IMPORT_CSV);
                  setParseError(null);
                }}
                className={`px-2.5 py-1 rounded-md ${
                  importFormat === 'csv'
                    ? 'bg-brand-600 text-slate-950 font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                CSV
              </button>
            </div>
          </div>

          {importFormat === 'csv' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Run Name</label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Task Type</label>
                <select
                  aria-label="Imported CSV task type"
                  value={importTask}
                  onChange={(e) => setImportTask(e.target.value as MlTaskType)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-slate-900 dark:text-white"
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </select>
              </div>
            </div>
          )}

          <textarea
            aria-label="Evaluation JSON or CSV payload"
            rows={10}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-[11px] text-slate-900 dark:text-slate-100"
          />

          {parseError && (
            <p className="text-rose-600 dark:text-rose-400 font-medium">{parseError}</p>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !importJson.trim()}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold disabled:opacity-50"
            >
              {submitting ? 'Importing...' : 'Import & Analyze Results'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
