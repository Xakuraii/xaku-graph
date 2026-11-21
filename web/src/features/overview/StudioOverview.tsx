import React, { useEffect, useState } from 'react';
import {
  Database,
  Layers,
  GitGraph,
  Cpu,
  Binary,
  ArrowRight,
  Shield,
  Zap,
  Terminal,
  FileSpreadsheet,
} from 'lucide-react';
import { DatasetSummary, HealthResponse } from '../../types/api';
import { NavModuleId } from '../../layouts/AppLayout';
import { StatusBadge } from '../../components/StatusBadge';
import { apiClient } from '../../services/apiClient';

interface StudioOverviewProps {
  health: HealthResponse | null;
  onNavigate: (module: NavModuleId) => void;
}

export const StudioOverview: React.FC<StudioOverviewProps> = ({
  health,
  onNavigate,
}) => {
  const [recentDatasets, setRecentDatasets] = useState<DatasetSummary[]>([]);

  useEffect(() => {
    let active = true;
    apiClient
      .listDatasets()
      .then((res) => {
        if (active && Array.isArray(res.datasets)) {
          setRecentDatasets(res.datasets.slice(0, 5));
        }
      })
      .catch(() => {
        // Backend offline; keep empty
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm dark:shadow-xl">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-700 dark:text-brand-400 text-xs font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>Local-First AI & Data Studio</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Local-First Data & AI Visualization Studio
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            XakuGraph is engineered for local exploratory data analysis, high-dimensional vector
            math, embedding cluster inspection, and transparent RAG debugging.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('datasets')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Database className="w-4 h-4" />
              <span>Explore Datasets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('embeddings')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
            >
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Explore Embeddings</span>
            </button>

            <button
              onClick={() => onNavigate('vectors')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
            >
              <Binary className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Open Vector Calculator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 shadow-sm dark:shadow-none">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Local-First & Private
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            All dataset ingestion, vector mathematics, and embedding calculations execute directly
            on your local hardware. No mandatory cloud APIs or telemetry.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 shadow-sm dark:shadow-none">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Unified Processing Engine
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The same Python engine (Polars, NumPy, Scikit-learn) and Rust core (
            <code>xakugraph-core</code>) power both the local web application and the desktop Tauri
            application.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 shadow-sm dark:shadow-none">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            High Performance & Scale
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Engineered with memory-aware streaming, pagination, and vectorized computations.
            Parquet for tabular persistence and dedicated <code>.npy</code> embedding caches.
          </p>
        </div>
      </div>

      {/* 5 Core Product Modules Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Core Studio Modules
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive navigation across the five functional studio modules.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Datasets */}
          <div
            onClick={() => onNavigate('datasets')}
            className="group cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 rounded-xl p-5 transition-all space-y-3 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Database className="w-4 h-4" />
              </div>
              <StatusBadge status="live" label="Active" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Dataset Visualization
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                CSV, JSON, JSONL, Parquet & Excel ingestion, histograms, box plots, quality &
                outlier detection, and correlations.
              </p>
            </div>
          </div>

          {/* 2. Embeddings */}
          <div
            onClick={() => onNavigate('embeddings')}
            className="group cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 rounded-xl p-5 transition-all space-y-3 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <StatusBadge status="live" label="Active" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Embedding Visualization
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Text & image embedding adapters, local cache, PCA/t-SNE/UMAP 2D/3D projections,
                clustering, and high-dim neighbor inspection.
              </p>
            </div>
          </div>

          {/* 3. Vectors */}
          <div
            onClick={() => onNavigate('vectors')}
            className="group cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 rounded-xl p-5 transition-all space-y-3 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Binary className="w-4 h-4" />
              </div>
              <StatusBadge status="live" label="Active" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Vector & Similarity Explorer
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Cosine similarity, Euclidean & Manhattan distance, dot products, nearest-neighbor
                ranking, and vector space matrix.
              </p>
            </div>
          </div>

          {/* 4. RAG */}
          <div
            onClick={() => onNavigate('rag')}
            className="group cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 rounded-xl p-5 transition-all space-y-3 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <GitGraph className="w-4 h-4" />
              </div>
              <StatusBadge status="live" label="Active" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                RAG Visualization
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Document chunk inspection, ChromaDB and Qdrant read-only connectors, retrieval
                ranking, and side-by-side comparison.
              </p>
            </div>
          </div>

          {/* 5. ML */}
          <div
            onClick={() => onNavigate('ml')}
            className="group cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 rounded-xl p-5 transition-all space-y-3 shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cpu className="w-4 h-4" />
              </div>
              <StatusBadge status="live" label="Active" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                ML Visualization
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Training/validation curves, confusion matrices, regression residuals, permutation
                feature importance, and prediction error inspection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Local Datasets Registry */}
      {recentDatasets.length > 0 && (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Local Dataset Registry
            </h2>
            <button
              onClick={() => onNavigate('datasets')}
              className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 inline-flex items-center space-x-1 font-medium"
            >
              <span>Open Explorer</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentDatasets.map((ds) => (
              <div
                key={ds.id}
                onClick={() => onNavigate('datasets')}
                className="cursor-pointer bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                      {ds.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {ds.row_count.toLocaleString()} rows · {ds.column_count} cols ·{' '}
                      {ds.source_format.toUpperCase()}
                    </p>
                  </div>
                </div>
                {ds.is_sample && <StatusBadge status="sample" label="Sample" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engine Status & System Info */}
      {health && (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm dark:shadow-none">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-slate-800 dark:text-slate-300">
              FastAPI Processing Engine Online:
            </span>
            <span className="font-mono text-slate-600 dark:text-slate-400">
              {health.system_info.python_version.split(' ')[0]} on {health.system_info.platform}
            </span>
          </div>
          <div className="text-slate-600 dark:text-slate-300 font-mono">
            Environment: {health.environment} | Debug: {String(health.system_info.debug)}
          </div>
        </div>
      )}
    </div>
  );
};
