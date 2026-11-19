import React from 'react';
import { Cpu, LineChart, BarChart2, PieChart } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

export const MlPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ML Model & Evaluation Visualization
            </h1>
            <StatusBadge status="planned" label="Phase 6 Milestone" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze machine learning models, loss curves, confusion matrices, and feature
            importance.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm dark:shadow-none">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto">
          <Cpu className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Planned Features for Phase 6
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Comprehensive evaluation tools for both classification and regression workflows:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-850/80 rounded-lg border border-slate-200 dark:border-slate-800">
            <LineChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Training Metrics
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Loss curves, validation accuracy, precision/recall, and F1-score tracking.
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850/80 rounded-lg border border-slate-200 dark:border-slate-800">
            <BarChart2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Confusion Matrix
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Interactive multi-class error heatmaps and misclassification drilling.
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850/80 rounded-lg border border-slate-200 dark:border-slate-800">
            <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
              Feature Importance
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Model explainability plots, SHAP values, and permutation importance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
