import React from 'react';
import {
  Database,
  Layers,
  GitGraph,
  Cpu,
  Binary,
  LayoutDashboard,
  X,
} from 'lucide-react';

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
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Studio Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'datasets',
    label: 'Dataset Visualization',
    icon: Database,
  },
  {
    id: 'embeddings',
    label: 'Embedding Visualization',
    icon: Layers,
  },
  {
    id: 'vectors',
    label: 'Vector & Similarity Explorer',
    icon: Binary,
  },
  {
    id: 'rag',
    label: 'RAG Visualization',
    icon: GitGraph,
  },
  {
    id: 'ml',
    label: 'ML Visualization',
    icon: Cpu,
  },
];

interface AppLayoutProps {
  activeModule: NavModuleId;
  onSelectModule: (id: NavModuleId) => void;
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeModule,
  onSelectModule,
  mobileMenuOpen = false,
  onCloseMobileMenu,
  children,
}) => {
  const renderNavButtons = (onAfterSelect?: () => void) => (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeModule === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelectModule(item.id);
              onAfterSelect?.();
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left border ${
              isActive
                ? 'bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-500/30'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-400 dark:text-slate-400'
              }`}
            />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-1 min-h-[calc(100vh-4rem)] relative">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 flex-col p-4 shrink-0">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Studio Modules
          </p>
          {renderNavButtons()}
        </div>
      </aside>

      {/* Mobile Hamburger Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobileMenu}
          />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <p className="px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Studio Modules
              </p>
              <button
                type="button"
                onClick={onCloseMobileMenu}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderNavButtons(onCloseMobileMenu)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
