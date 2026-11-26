import React from 'react';
import { BookOpen, ExternalLink, Terminal } from 'lucide-react';
import { DemoExecutionMode } from '../types/presentation';
import { AlphaEvolveWorkbench } from './demos/AlphaEvolveWorkbench';
import { CirclePackingCodelabDemo } from './demos/CirclePackingCodelabDemo';
import { EvoFedAggCcncDemo } from './demos/EvoFedAggCcncDemo';
import { EvoFedAggMaxwellStoryWidget } from './demos/EvoFedAggMaxwellStory';
import { TpuEvalArchitecturesWidget } from './demos/TpuArchitectureAndZeroLeakWidgets';
import { TpuBifurcationRoadmapWidget } from './demos/TpuPallasSimulatorDemo';

export const DemosLabView: React.FC<{
  demoMode: DemoExecutionMode;
  onToggleDemoMode: () => void;
}> = () => {
  return (
    <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-20 py-8 space-y-8">
      <div className="rounded-3xl bg-slate-900/70 border border-cyan-500/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-sm font-mono font-bold uppercase tracking-widest text-cyan-300">
            Interactive Sandbox Suite • Dual-Mode Stage &amp; Attendee Lab
          </span>
          <h2 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-white mt-1">
            Hands-On Demos: Codelab Circle Packing, Evo-FedAgg (CCNC 2027) &amp; Zero-Leak TPUs
          </h2>
          <p className="text-base text-slate-200 mt-1.5 max-w-3xl">
            Experiment with every interactive sandbox directly in your browser, or run the companion Python scripts in{' '}
            <code className="text-cyan-300 font-mono">demos/</code> and Spot TPU wrapper in{' '}
            <code className="text-emerald-300 font-mono">scripts/run_alphaevolve_spot_tpu.sh</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <a
              href="https://docs.cloud.google.com/gemini/enterprise/docs/alphaevolve/developer-guide/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 transition"
            >
              <BookOpen className="w-4 h-4" /> Official AlphaEvolve Developer Guide <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/GoogleCloudPlatform/hpc-solutions/tree/main/blueprints/alphaevolve"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 transition"
            >
              <BookOpen className="w-4 h-4" /> AlphaEvolve HPC Blueprints <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs sm:text-sm text-slate-200 shrink-0 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
            <Terminal className="w-4 h-4" /> Local Python CLI Runner (uv)
          </div>
          <div>uv run --with numpy python demos/01_circle_packing_codelab_demo.py</div>
          <div>uv run --with numpy python demos/02_ccnc2027_evofedagg_demo.py</div>
          <div>uv run --with numpy python demos/03_jax_torchtpu_evaluator_demo.py</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CirclePackingCodelabDemo />
        <AlphaEvolveWorkbench />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EvoFedAggMaxwellStoryWidget />
        <EvoFedAggCcncDemo />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TpuEvalArchitecturesWidget />
        <TpuBifurcationRoadmapWidget />
      </div>
    </div>
  );
};
