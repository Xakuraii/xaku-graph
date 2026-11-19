import React from 'react';
import { Activity, ShieldCheck, Cpu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { HealthResponse } from '../types/api';

interface HeaderProps {
  health: HealthResponse | null;
  loading: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  loading,
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center font-bold text-slate-950 text-lg shadow-sm">
          X
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-white tracking-tight text-base">XakuGraph</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono">
              v0.1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">Local-first Data & AI Studio</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Backend Connectivity Status */}
        <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60">
          <Activity
            className={`w-3.5 h-3.5 ${
              loading
                ? 'text-amber-400 animate-spin'
                : health?.status === 'healthy'
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          />
          <span className="text-slate-300">
            {loading
              ? 'Checking Engine...'
              : health?.status === 'healthy'
              ? 'Local Engine Active'
              : 'Engine Disconnected'}
          </span>
          {health && (
            <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
              (Port: 8000)
            </span>
          )}
        </div>

        {/* Local Privacy Badge */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/40 px-2.5 py-1.5 rounded-md border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local-Only Processing</span>
        </div>

        {/* Architecture Crate indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/40 px-2.5 py-1.5 rounded-md border border-slate-800">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>xakugraph-core v0.1.0</span>
        </div>

        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
    </header>
  );
};
