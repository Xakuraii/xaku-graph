import React from 'react';
import {
  Database,
  Layers,
  GitGraph,
  Cpu,
  Binary,
  LayoutDashboard,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export type NavModuleId =
  | 'overview'
  | 'datasets'
  | 'embeddings'
  | 'vectors'
  | 'rag'
  | 'ml';

interface NavItem {
  id: NavModuleId;
  label: string;
  phase: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'live' | 'planned' | 'in_development';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Studio Dashboard',
    phase: 'Core',
    icon: LayoutDashboard,
    status: 'live',
  },
  {
    id: 'datasets',
    label: 'Dataset Visualization',
    phase: 'Phase 2',
    icon: Database,
    status: 'live',
  },
  {
    id: 'embeddings',
    label: 'Embedding Visualization',
    phase: 'Phase 3',
    icon: Layers,
    status: 'live',
  },
  {
    id: 'vectors',
    label: 'Vector & Similarity Explorer',
    phase: 'Phase 4',
    icon: Binary,
    status: 'live',
  },
  {
    id: 'rag',
    label: 'RAG Visualization',
    phase: 'Phase 5',
    icon: GitGraph,
    status: 'live',
  },
  {
    id: 'ml',
    label: 'ML Visualization',
    phase: 'Phase 6',
    icon: Cpu,
    status: 'live',
  },
];

interface AppLayoutProps {
  activeModule: NavModuleId;
  onSelectModule: (id: NavModuleId) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeModule,
  onSelectModule,
  children,
}) => {
  return (
    <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Studio Modules
            </p>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectModule(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left border ${
                      isActive
                        ? 'bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-500/30'
                        : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0 ml-1">
                      {item.phase}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="bg-slate-100/80 dark:bg-slate-850/60 rounded-lg p-3 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Studio Status
              </span>
              <StatusBadge status="live" label="Phase 6 Active" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              All 5 Studio modules (Datasets, Embeddings, Vectors, RAG, ML) are active locally.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-xs text-slate-500 flex flex-col space-y-1">
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Web / Tauri Desktop
            </span>
          </div>
          <div className="flex justify-between">
            <span>Storage</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Local Parquet & SQLite
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
