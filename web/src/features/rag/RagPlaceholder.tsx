import React from 'react';
import { GitGraph, Database, Search, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

export const RagPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              RAG Visualization & Inspection
            </h1>
            <StatusBadge status="planned" label="Phase 5 Milestone" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Understand, inspect, and debug Retrieval-Augmented Generation pipelines and vector
            database indices.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm dark:shadow-none">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
          <GitGraph className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Planned Features for Phase 5
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Debug chunking strategies, retrieval rankings, and similarity scores across local vector
          database instances with strict read-only guarantees:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-850/80 rounded-lg border border-slate-200 dark:border-slate-800">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Vector DB Connectors
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Read-only inspection for ChromaDB, Qdrant, and future vector stores.
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850/80 rounded-lg border border-slate-200 dark:border-slate-800">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Retrieval Playground
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Test queries against indices, inspect chunk rankings, and evaluate similarity scores.
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850/80 rounded-lg border border-slate-200 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Safety Guarantee
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Non-destructive read-only connectors ensure user indices are never altered or deleted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
