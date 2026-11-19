import React from 'react';
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
} from 'lucide-react';
import { HealthResponse } from '../../types/api';
import { NavModuleId } from '../../layouts/AppLayout';
import { StatusBadge } from '../../components/StatusBadge';

interface StudioOverviewProps {
  health: HealthResponse | null;
  onNavigate: (module: NavModuleId) => void;
}

export const StudioOverview: React.FC<StudioOverviewProps> = ({
  health,
  onNavigate,
}) => {
  return (
    <div className="space-y-8">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-8 shadow-xl">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>Phase 0 & 1 Architecture Foundation Active</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Local-First Data & AI Visualization Studio
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            XakuGraph is engineered for local exploratory data analysis, high-dimensional vector math, embedding cluster inspection, and transparent RAG debugging.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('datasets')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
            >
              <Database className="w-4 h-4" />
              <span>Inspect Sample Dataset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('vectors')}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors"
            >
              <Binary className="w-4 h-4 text-brand-400" />
              <span>Open Vector Calculator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-white">Local-First & Private</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All dataset ingestion, vector mathematics, and embedding calculations execute directly on your local hardware. No mandatory cloud APIs or telemetry.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-white">Unified Processing Engine</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The same Python engine (Polars, NumPy, Scikit-learn) and Rust core (<code>xakugraph-core</code>) power both the local web application and the desktop Tauri application.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-white">High Performance & Scale</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Engineered with memory-aware streaming, pagination, and vectorized computations. Parquet for tabular persistence and dedicated embedding caches.
          </p>
        </div>
      </div>

      {/* 5 Core Product Modules Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Core Studio Modules</h2>
            <p className="text-xs text-slate-400">
              Interactive navigation across the five planned functional systems.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Datasets */}
          <div
            onClick={() => onNavigate('datasets')}
            className="group cursor-pointer bg-slate-900/40 hover:bg-slate-850/80 border border-slate-800 hover:border-brand-500/40 rounded-xl p-5 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Database className="w-4 h-4" />
              </div>
              <StatusBadge status="foundation_ready" label="Phase 2 Foundation" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                Dataset Visualization
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                CSV, JSON, JSONL, Parquet ingestion, statistical profiling, null checks, and tabular preview.
              </p>
            </div>
          </div>

          {/* 2. Embeddings */}
          <div
            onClick={() => onNavigate('embeddings')}
            className="group cursor-pointer bg-slate-900/40 hover:bg-slate-850/80 border border-slate-800 hover:border-brand-500/40 rounded-xl p-5 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <StatusBadge status="planned" label="Phase 3 Milestone" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                Embedding Visualization
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Text and image embeddings, model adapters, PCA/t-SNE/UMAP dimensionality reduction, and 2D/3D space.
              </p>
            </div>
          </div>

          {/* 3. Vectors */}
          <div
            onClick={() => onNavigate('vectors')}
            className="group cursor-pointer bg-slate-900/40 hover:bg-slate-850/80 border border-slate-800 hover:border-brand-500/40 rounded-xl p-5 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Binary className="w-4 h-4" />
              </div>
              <StatusBadge status="foundation_ready" label="Phase 4 Foundation" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                Vector & Similarity Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Cosine similarity, Euclidean distance, dot products, vector normalization, and mathematical metric inspection.
              </p>
            </div>
          </div>

          {/* 4. RAG */}
          <div
            onClick={() => onNavigate('rag')}
            className="group cursor-pointer bg-slate-900/40 hover:bg-slate-850/80 border border-slate-800 hover:border-brand-500/40 rounded-xl p-5 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <GitGraph className="w-4 h-4" />
              </div>
              <StatusBadge status="planned" label="Phase 5 Milestone" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                RAG Visualization
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Document chunk inspection, ChromaDB and Qdrant read-only connectors, retrieval ranking, and similarity debugging.
              </p>
            </div>
          </div>

          {/* 5. ML */}
          <div
            onClick={() => onNavigate('ml')}
            className="group cursor-pointer bg-slate-900/40 hover:bg-slate-850/80 border border-slate-800 hover:border-brand-500/40 rounded-xl p-5 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Cpu className="w-4 h-4" />
              </div>
              <StatusBadge status="planned" label="Phase 6 Milestone" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                ML Visualization
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Training and validation metrics, loss curves, confusion matrices, classification/regression inspection, and feature importance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Engine Status & System Info */}
      {health && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-300">FastAPI Processing Engine Online:</span>
            <span className="font-mono text-slate-400">
              {health.system_info.python_version.split(' ')[0]} on {health.system_info.platform}
            </span>
          </div>
          <div className="text-slate-500 font-mono">
            Environment: {health.environment} | Debug: {String(health.system_info.debug)}
          </div>
        </div>
      )}
    </div>
  );
};
