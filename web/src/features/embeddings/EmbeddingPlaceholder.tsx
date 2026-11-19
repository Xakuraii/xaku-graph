import React from 'react';
import { Layers, Box, Cpu, Sparkles } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

export const EmbeddingPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Embedding Visualization
            </h1>
            <StatusBadge status="planned" label="Phase 3 Milestone" />
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Explore how AI models represent information numerically in high-dimensional and projected spaces.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold text-white">Planned Features for Phase 3</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The foundation for dataset ingestion and vector calculations is complete. Phase 3 will introduce model adapters, text/image embedding generation, local caching, and 2D/3D projections:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          <div className="p-3 bg-slate-850/80 rounded-lg border border-slate-800">
            <Cpu className="w-4 h-4 text-emerald-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-white">Model Adapters</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Pluggable local encoders (Sentence Transformers, ONNX, PyTorch) with dedicated cache.
            </p>
          </div>
          <div className="p-3 bg-slate-850/80 rounded-lg border border-slate-800">
            <Box className="w-4 h-4 text-blue-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-white">Reduction Engines</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              PCA, t-SNE, and UMAP projections optimized for high performance.
            </p>
          </div>
          <div className="p-3 bg-slate-850/80 rounded-lg border border-slate-800">
            <Sparkles className="w-4 h-4 text-amber-400 mb-1.5" />
            <h3 className="text-xs font-semibold text-white">2D / 3D WebGL</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Interactive Deck.gl / Plotly point clouds with cluster inspections and metadata filters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
