import React from 'react';

interface StatusBadgeProps {
  status: 'foundation_ready' | 'planned' | 'in_development' | 'sample' | 'live';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getStyles = () => {
    switch (status) {
      case 'foundation_ready':
      case 'live':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'sample':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'in_development':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'planned':
      default:
        return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
    }
  };

  const getLabel = () => {
    if (label) return label;
    switch (status) {
      case 'foundation_ready':
        return 'Foundation Ready';
      case 'sample':
        return 'Sample Data';
      case 'live':
        return 'Connected';
      case 'in_development':
        return 'In Development';
      case 'planned':
        return 'Planned (Roadmap)';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStyles()}`}
    >
      {getLabel()}
    </span>
  );
};
