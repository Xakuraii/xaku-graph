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
  status: 'foundation_ready' | 'planned' | 'in_development';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Studio Dashboard',
    phase: 'Core',
    icon: LayoutDashboard,
    status: 'foundation_ready',
  },
  {
    id: 'datasets',
    label: 'Dataset Visualization',
    phase: 'Phase 2',
    icon: Database,
    status: 'foundation_ready',
  },
  {
    id: 'embeddings',
    label: 'Embedding Visualization',
    phase: 'Phase 3',
    icon: Layers,
    status: 'planned',
  },
  {
    id: 'vectors',
    label: 'Vector & Similarity Explorer',
    phase: 'Phase 4',
    icon: Binary,
    status: 'foundation_ready',
  },
  {
    id: 'rag',
    label: 'RAG Visualization',
    phase: 'Phase 5',
    icon: GitGraph,
    status: 'planned',
  },
  {
    id: 'ml',
    label: 'ML Visualization',
    phase: 'Phase 6',
    icon: Cpu,
    status: 'planned',
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
      <aside className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-brand-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                      {item.phase}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="bg-slate-850/60 rounded-lg p-3 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Phase 0 & 1 Status</span>
              <StatusBadge status="foundation_ready" label="Foundation Ready" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Vertical slice active: Dataset parsing & Vector mathematics engines verified across React, FastAPI, and Rust.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 text-xs text-slate-500 flex flex-col space-y-1">
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="text-slate-400">Web / Tauri Desktop</span>
          </div>
          <div className="flex justify-between">
            <span>Storage</span>
            <span className="text-slate-400">Local Parquet & SQLite</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
