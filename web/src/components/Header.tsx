import React from 'react';
import { Activity, ShieldCheck, Cpu, Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { HealthResponse } from '../types/api';

interface HeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  isDark: boolean;
  onThemeChange: (theme: 'light' | 'dark') => void;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onRetryBackend?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  loading,
  isDark,
  onThemeChange,
  mobileMenuOpen = false,
  onToggleMobileMenu,
  onRetryBackend,
}) => {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/75 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-30">
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        )}

        <img
          src="/XakuGraph.svg"
          alt="XakuGraph logo"
          className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base truncate">
              Xaku<span className="text-brand-600 dark:text-brand-500">Graph</span>
            </span>
            <span className="text-[11px] sm:text-xs px-1.5 py-0.5 rounded bg-brand-500/15 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 font-mono shrink-0">
              v{health?.version ?? '1.0.0'}
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
            Local-first Data & AI Studio
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Backend Connectivity Status */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs bg-slate-100 dark:bg-slate-800/80 px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/60">
          <Activity
            className={`w-3.5 h-3.5 shrink-0 ${
              loading
                ? 'text-amber-500 dark:text-amber-400 animate-spin'
                : health?.status === 'healthy'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          />
          <span className="text-slate-700 dark:text-slate-300 font-medium hidden sm:inline">
            {loading
              ? 'Checking Engine...'
              : health?.status === 'healthy'
              ? 'Local Engine Active'
              : 'Engine Disconnected'}
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-medium sm:hidden">
            {loading ? '...' : health?.status === 'healthy' ? 'Active' : 'Offline'}
          </span>
          {health && (
            <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] hidden lg:inline">
              (Port: 8000)
            </span>
          )}
          {!loading && health?.status !== 'healthy' && onRetryBackend && (
            <button
              type="button"
              onClick={onRetryBackend}
              className="ml-1 px-2 py-0.5 rounded bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-medium transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>

        {/* Local Privacy Badge */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Local-Only Processing</span>
        </div>

        {/* Architecture Crate indicator */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800">
          <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>xakugraph-core v1.0.0</span>
        </div>

        <ThemeToggle isDark={isDark} onToggle={onThemeChange} />
      </div>
    </header>
  );
};
