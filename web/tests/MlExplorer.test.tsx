import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MlExplorer } from '../src/features/machine-learning/MlExplorer';

const SAMPLE_IRIS_RUN = {
  id: 'sample-ml-iris-classification',
  name: 'Iris Classification Benchmark (Random Forest)',
  task_type: 'classification' as const,
  algorithm: 'random_forest',
  source: 'sample' as const,
  dataset_id: 'sample-iris-dataset',
  target_column: 'species',
  sample_count: 150,
  train_count: 105,
  val_count: 45,
  primary_metric_name: 'accuracy',
  primary_metric_value: 0.9333,
  is_sample: true,
  created_at: '2026-11-21T07:00:00Z',
  feature_columns: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'],
  hyperparameters: { n_estimators: 50, max_depth: 6 },
  training_history: [
    {
      step: 1,
      label: '5 trees',
      train_loss: 0.35,
      val_loss: 0.41,
      train_score: 0.91,
      val_score: 0.89,
    },
    {
      step: 2,
      label: '10 trees',
      train_loss: 0.21,
      val_loss: 0.28,
      train_score: 0.96,
      val_score: 0.9333,
    },
  ],
  classification: {
    accuracy: 0.9333,
    precision_macro: 0.935,
    recall_macro: 0.9333,
    f1_macro: 0.918,
    precision_weighted: 0.935,
    recall_weighted: 0.9333,
    f1_weighted: 0.9329,
    per_class: [
      { label: 'setosa', precision: 1.0, recall: 1.0, f1_score: 1.0, support: 15 },
      { label: 'versicolor', precision: 0.875, recall: 0.9333, f1_score: 0.9032, support: 15 },
      { label: 'virginica', precision: 0.9286, recall: 0.8667, f1_score: 0.8966, support: 15 },
    ],
    confusion_matrix: {
      labels: ['setosa', 'versicolor', 'virginica'],
      matrix: [
        [15, 0, 0],
        [0, 14, 1],
        [0, 2, 13],
      ],
      normalized_matrix: [
        [1.0, 0.0, 0.0],
        [0.0, 0.9333, 0.0667],
        [0.0, 0.1333, 0.8667],
      ],
    },
  },
  regression: null,
  feature_importances: [
    { feature: 'petal_length', importance: 0.46, permutation_importance: 0.28, std: 0.04 },
    { feature: 'petal_width', importance: 0.39, permutation_importance: 0.21, std: 0.03 },
  ],
  predictions: [
    {
      index: 0,
      actual: 'setosa',
      predicted: 'setosa',
      is_correct: true,
      confidence: 0.98,
      features: { sepal_length: 5.1, petal_length: 1.4 },
    },
    {
      index: 1,
      actual: 'virginica',
      predicted: 'versicolor',
      is_correct: false,
      confidence: 0.56,
      features: { sepal_length: 6.0, petal_length: 4.8 },
    },
  ],
};

describe('MlExplorer Stage 3', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url === '/api/ml/runs') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ runs: [SAMPLE_IRIS_RUN], total: 1 }),
          });
        }
        if (url === '/api/datasets') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                datasets: [
                  {
                    id: 'sample-iris-dataset',
                    name: 'Iris Benchmark Sample',
                    row_count: 30,
                    column_count: 5,
                    columns: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
                    memory_bytes: 2048,
                    is_sample: true,
                    source_format: 'csv',
                  },
                ],
                total: 1,
              }),
          });
        }
        if (url.startsWith('/api/ml/runs/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(SAMPLE_IRIS_RUN),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  it('renders KPI cards and training/validation loss & score curves', async () => {
    render(<MlExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByText('93.3%')).toBeInTheDocument();
      expect(screen.getByText('91.8%')).toBeInTheDocument();
      expect(screen.getByTestId('ml-loss-chart')).toBeInTheDocument();
      expect(screen.getByTestId('ml-score-chart')).toBeInTheDocument();
    });
  });

  it('opens local training builder and import evaluation JSON drawer', async () => {
    render(<MlExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Train Local Model/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Train Local Model/i }));
    expect(screen.getByRole('button', { name: /Run Local Training/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Import Evaluation JSON/i }));
    expect(screen.getByRole('button', { name: /Import & Analyze Results/i })).toBeInTheDocument();
  });

  it('switches to Evaluation & Matrix tab and toggles confusion matrix normalization', async () => {
    render(<MlExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Evaluation & Matrix/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Evaluation & Matrix/i }));

    await waitFor(() => {
      expect(screen.getByTestId('ml-confusion-matrix')).toBeInTheDocument();
      expect(screen.getByTestId('ml-per-class-chart')).toBeInTheDocument();
      expect(screen.getByTestId('ml-confidence-chart')).toBeInTheDocument();
      expect(screen.getByText('setosa')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Showing Raw Counts/i }));
    expect(screen.getByRole('button', { name: /Showing Row %/i })).toBeInTheDocument();
  });

  it('switches to Features & Predictions tab and filters misclassified samples', async () => {
    render(<MlExplorer isDark={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Features & Predictions/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Features & Predictions/i }));

    await waitFor(() => {
      expect(screen.getByTestId('ml-feature-importance-chart')).toBeInTheDocument();
      expect(screen.getByText('Match')).toBeInTheDocument();
      expect(screen.getByText('Misclassified')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Errors Only/i }));
    expect(screen.queryByText('Match')).not.toBeInTheDocument();
    expect(screen.getByText('Misclassified')).toBeInTheDocument();
  });
});
