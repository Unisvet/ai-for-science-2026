import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Cpu,
  FolderTree,
  Layers,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

type WorkbenchTab = 'evolve-block' | 'models' | 'loop';
type BlockPlacement = 'narrow' | 'wide' | 'surgical';
type ModelPreset = 'balanced' | 'argon-heavy' | 'hydrogen-deep' | 'future-extensible';

interface PlacementSpec {
  id: BlockPlacement;
  label: string;
  badge: string;
  status: 'warn' | 'error' | 'good';
  scoreLabel: string;
  diagnosis: string;
  antigravityTip: string;
  lockedTop: string[];
  evolveLines: string[];
  lockedBottom: string[];
}

const BLOCK_PLACEMENTS: Record<BlockPlacement, PlacementSpec> = {
  narrow: {
    id: 'narrow',
    label: 'Too Narrow',
    badge: 'Plateau Risk',
    status: 'warn',
    scoreLabel: 'Score stalls at 1.12',
    diagnosis:
      'Only a single constant is inside # EVOLVE-BLOCK. Gemini cannot invent new geometry or heuristics — it can only tweak one number.',
    antigravityTip:
      'Antigravity skill `alpha_evolve_consultant` flags tiny blocks and suggests expanding to the full inner algorithm body.',
    lockedTop: [
      'import numpy as np',
      'def pack_circles(n: int = 26) -> tuple[np.ndarray, np.ndarray]:',
      '    centers = init_concentric_rings(n)',
    ],
    evolveLines: ['    # EVOLVE-BLOCK-START', '    radius_scale = 0.50  # ← Only 1 scalar can mutate!', '    # EVOLVE-BLOCK-END'],
    lockedBottom: ['    radii = compute_radii(centers, radius_scale)', '    return centers, radii'],
  },
  wide: {
    id: 'wide',
    label: 'Too Wide (Unsafe)',
    badge: '-inf Contract Break',
    status: 'error',
    scoreLabel: 'Score = -inf (Crash)',
    diagnosis:
      'Wrapping the function signature lets Gemini rename parameters or change the return type, breaking evaluate.py on every generation.',
    antigravityTip:
      'Antigravity skill `alpha_evolve_experiment_design` keeps signatures & type contracts locked outside the markers.',
    lockedTop: ['import numpy as np'],
    evolveLines: [
      '# EVOLVE-BLOCK-START  ← Unsafe: signature can mutate!',
      'def pack_circles_v2(count=26, mode="hex"):',
      '    return {"pts": generate_hex(count)}  # Breaks tuple unpack!',
      '# EVOLVE-BLOCK-END',
    ],
    lockedBottom: ['# evaluate.py expects: centers, radii = pack_circles(26)'],
  },
  surgical: {
    id: 'surgical',
    label: 'Surgical Sweet Spot',
    badge: 'Optimal Discovery',
    status: 'good',
    scoreLabel: '0.96 → 2.63598 (+174.6%)',
    diagnosis:
      'Locks imports, function signature, and return contract while freeing the entire algorithmic core for creative mutations.',
    antigravityTip:
      'Antigravity scaffolds `program.py`, `evaluate.py`, and `config.yaml` with this exact contract boundary automatically.',
    lockedTop: [
      'import numpy as np',
      'def pack_circles(n: int = 26) -> tuple[np.ndarray, np.ndarray]:',
    ],
    evolveLines: [
      '    # EVOLVE-BLOCK-START',
      '    centers = adaptive_repulsion_lattice(n, steps=180)',
      '    radii = lp_maximize_radii(centers, bounds=(0.0, 1.0))',
      '    # EVOLVE-BLOCK-END',
    ],
    lockedBottom: [
      '    assert centers.shape == (n, 2) and radii.shape == (n,)',
      '    return centers, radii',
    ],
  },
};

interface ModelPresetSpec {
  id: ModelPreset;
  name: string;
  mixLabel: string;
  accent: 'cyan' | 'emerald' | 'purple' | 'amber';
  breadth: number;
  depth: number;
  speed: number;
  summary: string;
  configSnippet: string[];
}

const MODEL_PRESETS: Record<ModelPreset, ModelPresetSpec> = {
  balanced: {
    id: 'balanced',
    name: 'Argon + Hydrogen (Our Setup)',
    mixLabel: '65% Gemini Argon • 35% Gemini Hydrogen',
    accent: 'emerald',
    breadth: 88,
    depth: 90,
    speed: 85,
    summary:
      'Our workshop & benchmark default: Gemini Argon drives high-throughput island exploration while Gemini Hydrogen injects deep mathematical leaps and repairs -inf crashes.',
    configSnippet: [
      'ensemble:',
      '  - model: gemini-argon      # Fast structural explorer (65%)',
      '  - model: gemini-hydrogen   # Deep algorithmic reasoner (35%)',
      'islands: 4  |  max_programs: 60',
    ],
  },
  'argon-heavy': {
    id: 'argon-heavy',
    name: 'Argon Sprint (Fast Breadth)',
    mixLabel: '85% Gemini Argon • 15% Gemini Hydrogen',
    accent: 'cyan',
    breadth: 96,
    depth: 68,
    speed: 96,
    summary:
      'Best for early generations or tight time budgets: floods MAP-Elites islands with diverse candidate heuristics rapidly.',
    configSnippet: [
      'ensemble:',
      '  - model: gemini-argon      # High-throughput diversity (85%)',
      '  - model: gemini-hydrogen   # Occasional deep refactor (15%)',
      'islands: 6  |  concurrency: 12',
    ],
  },
  'hydrogen-deep': {
    id: 'hydrogen-deep',
    name: 'Hydrogen Deep (Late Frontier)',
    mixLabel: '30% Gemini Argon • 70% Gemini Hydrogen',
    accent: 'purple',
    breadth: 72,
    depth: 98,
    speed: 66,
    summary:
      'Ideal when crossing hard mathematical plateaus (e.g., beating 14-year packing bounds or deriving vectorized BLAS Gram filters).',
    configSnippet: [
      'ensemble:',
      '  - model: gemini-argon      # Local perturbation (30%)',
      '  - model: gemini-hydrogen   # Frontier math synthesis (70%)',
      'islands: 4  |  insight_feedback: true',
    ],
  },
  'future-extensible': {
    id: 'future-extensible',
    name: '+ Future Models (Plug-In Ready)',
    mixLabel: 'Argon + Hydrogen + Next-Gen / Custom Slot',
    accent: 'amber',
    breadth: 94,
    depth: 96,
    speed: 90,
    summary:
      'AlphaEvolve’s decoupled Discovery Engine API is model-agnostic: as new Gemini generations or domain-specialized coding models arrive, swap them in config without changing evaluate.py.',
    configSnippet: [
      'ensemble:',
      '  - model: gemini-argon',
      '  - model: gemini-hydrogen',
      '  - model: <future-frontier-model>  # Zero evaluator rewrite!',
    ],
  },
};

const LOOP_STEPS = [
  {
    id: 'scaffold',
    title: '01 • Antigravity Scaffolds Folder',
    where: 'Local Workspace',
    accent: 'cyan',
    detail: 'Antigravity `ae` skills structure `program.py` (# EVOLVE-BLOCK), `evaluate.py`, and `config.yaml` with preflight tests.',
  },
  {
    id: 'mutate',
    title: '02 • Cloud Gemini Ensemble Mutates',
    where: 'Discovery Engine (Cloud)',
    accent: 'purple',
    detail: 'Gemini Argon & Hydrogen (or future models) sample parent elites from MAP-Elites islands and propose targeted diffs.',
  },
  {
    id: 'evaluate',
    title: '03 • Deterministic Evaluator Scores',
    where: 'Your Sandbox / Spot TPU',
    accent: 'amber',
    detail: 'Your `evaluate.py` runs locally or on Cloud TPUs. Proprietary data never leaves your sandbox.',
  },
  {
    id: 'export',
    title: '04 • Export `program_evolved.py`',
    where: 'Git Diff & Review',
    accent: 'emerald',
    detail: 'Top-scoring candidate is fetched locally as `program_evolved.py` for human diff review & production merge.',
  },
];

export const AlphaEvolveWorkbench: React.FC<{ staticPrint?: boolean }> = ({ staticPrint = false }) => {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('evolve-block');
  const [placement, setPlacement] = useState<BlockPlacement>('surgical');
  const [modelPreset, setModelPreset] = useState<ModelPreset>('balanced');
  const [loopStepIdx, setLoopStepIdx] = useState<number>(0);
  const [simulateCrash, setSimulateCrash] = useState<boolean>(false);
  const [isStepping, setIsStepping] = useState<boolean>(false);

  const spec = BLOCK_PLACEMENTS[placement];
  const preset = MODEL_PRESETS[modelPreset];

  const runLoopDemo = async (withCrash: boolean) => {
    if (isStepping) return;
    setIsStepping(true);
    setSimulateCrash(withCrash);
    for (let i = 0; i < LOOP_STEPS.length; i++) {
      setLoopStepIdx(i);
      soundEngine.playEvolutionPulse(i * 0.45 + (withCrash && i === 2 ? -0.3 : 0.2));
      await new Promise((r) => setTimeout(r, 520));
    }
    setIsStepping(false);
  };

  const statusStyles =
    spec.status === 'good'
      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/45'
      : spec.status === 'warn'
        ? 'bg-amber-500/15 text-amber-200 border-amber-400/45'
        : 'bg-rose-500/15 text-rose-200 border-rose-400/45';

  return (
    <div className="flex flex-col h-full justify-between rounded-2xl bg-slate-900/80 border border-emerald-500/35 p-4 xl:p-5 gap-3 shadow-xl">
      {/* Header + Learning Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-sm xl:text-base font-mono font-bold uppercase tracking-wider text-emerald-300">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Interactive AlphaEvolve Learning Lab</span>
        </div>

        {!staticPrint && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'evolve-block', label: '1. # EVOLVE-BLOCK Challenge', icon: Code2 },
                { id: 'models', label: '2. Argon / Hydrogen Mixer', icon: Cpu },
                { id: 'loop', label: '3. Live Loop & -inf Repair', icon: Layers },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playEvolutionPulse(0.2);
                    setActiveTab(t.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* TAB 1: Interactive # EVOLVE-BLOCK Scope Challenge */}
      {activeTab === 'evolve-block' && (
        <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['narrow', 'wide', 'surgical'] as BlockPlacement[]).map((key) => {
                const item = BLOCK_PLACEMENTS[key];
                const active = placement === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      soundEngine.playEvolutionPulse(key === 'surgical' ? 0.9 : 0.15);
                      setPlacement(key);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold border transition ${
                      active
                        ? item.status === 'good'
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400'
                          : item.status === 'warn'
                            ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                            : 'bg-rose-500/25 text-rose-200 border-rose-400'
                        : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${statusStyles}`}>
              {spec.badge} • {spec.scoreLabel}
            </span>
          </div>

          {/* Code + Folder Tree Split */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-2.5 min-h-0">
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs sm:text-[13px] xl:text-sm flex flex-col justify-center space-y-1 overflow-x-auto">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>program.py (Click placements above to test!)</span>
                <span className="text-cyan-300">LOCKED vs EVOLVABLE</span>
              </div>
              {spec.lockedTop.map((line) => (
                <div key={line} className="text-slate-400 whitespace-pre">
                  {line}
                </div>
              ))}
              <div
                className={`rounded-lg px-2.5 py-2 my-1 border ${
                  spec.status === 'good'
                    ? 'bg-emerald-950/40 border-emerald-400/50 text-emerald-200'
                    : spec.status === 'warn'
                      ? 'bg-amber-950/40 border-amber-400/50 text-amber-200'
                      : 'bg-rose-950/40 border-rose-400/50 text-rose-200'
                }`}
              >
                {spec.evolveLines.map((line) => (
                  <div key={line} className="whitespace-pre font-semibold">
                    {line}
                  </div>
                ))}
              </div>
              {spec.lockedBottom.map((line) => (
                <div key={line} className="text-slate-400 whitespace-pre">
                  {line}
                </div>
              ))}
            </div>

            {/* Antigravity-Structured Experiment Folder */}
            <div className="rounded-xl bg-slate-950/90 border border-cyan-500/30 p-3.5 font-mono text-xs sm:text-[13px] flex flex-col justify-between">
              <div>
                <div className="text-cyan-300 font-bold flex items-center gap-1.5 mb-2">
                  <FolderTree className="w-4 h-4 shrink-0" /> Antigravity Folder
                </div>
                <ul className="space-y-1.5 text-slate-200">
                  <li>
                    <span className="text-emerald-300 font-semibold">program.py</span>
                    <span className="text-slate-400 block text-[11px]">Seed + # EVOLVE-BLOCK</span>
                  </li>
                  <li>
                    <span className="text-amber-300 font-semibold">evaluate.py</span>
                    <span className="text-slate-400 block text-[11px]">Deterministic scorer + -inf insight</span>
                  </li>
                  <li>
                    <span className="text-purple-300 font-semibold">config.yaml</span>
                    <span className="text-slate-400 block text-[11px]">Argon + Hydrogen &amp; loop budget</span>
                  </li>
                  <li>
                    <span className="text-cyan-300 font-semibold">program_evolved.py</span>
                    <span className="text-slate-400 block text-[11px]">Exported champion for git diff</span>
                  </li>
                </ul>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-cyan-200 leading-snug">
                <strong className="text-cyan-300">Antigravity Tip:</strong> {spec.antigravityTip}
              </div>
            </div>
          </div>

          {/* Outcome Diagnosis */}
          <div className={`rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm flex items-start gap-2 ${statusStyles}`}>
            {spec.status === 'good' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{spec.diagnosis}</span>
          </div>
        </div>
      )}

      {/* TAB 2: Model Ensemble Mixer (Gemini Argon + Hydrogen + Future Models) */}
      {activeTab === 'models' && (
        <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MODEL_PRESETS) as ModelPreset[]).map((key) => {
              const p = MODEL_PRESETS[key];
              const active = modelPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    soundEngine.playEvolutionPulse(0.5);
                    setModelPreset(key);
                  }}
                  className={`text-left rounded-xl p-3 border transition ${
                    active
                      ? 'bg-purple-500/20 border-purple-400 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold text-white">{p.name}</div>
                  <div className="text-[11px] sm:text-xs font-mono text-cyan-300 mt-0.5">{p.mixLabel}</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 min-h-0">
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3.5 flex flex-col justify-center space-y-2.5">
              {[
                { label: 'Exploration Breadth (Argon)', value: preset.breadth, color: 'bg-cyan-400' },
                { label: 'Algorithmic Depth (Hydrogen)', value: preset.depth, color: 'bg-purple-400' },
                { label: 'Iteration Throughput', value: preset.speed, color: 'bg-emerald-400' },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-xs font-mono text-slate-200 mb-1">
                    <span>{bar.label}</span>
                    <span className="font-bold">{bar.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${bar.color}`}
                      style={{ width: `${bar.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-slate-950 border border-purple-500/35 p-3.5 font-mono text-xs sm:text-[13px] text-slate-200 flex flex-col justify-center space-y-1">
              <div className="text-[11px] uppercase tracking-wider text-purple-300 mb-1">
                Active Discovery Engine config.yaml
              </div>
              {preset.configSnippet.map((line) => (
                <div key={line} className="whitespace-pre text-emerald-200">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-purple-950/35 border border-purple-400/35 px-3.5 py-2.5 text-xs sm:text-sm text-purple-100">
            {preset.summary}
          </div>
        </div>
      )}

      {/* TAB 3: Live Decoupled Loop & -inf Self-Repair Simulator */}
      {activeTab === 'loop' && (
        <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-mono text-slate-300">
              Trace how local files, Cloud Gemini &amp; `-inf` insights close the loop:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isStepping}
                onClick={() => runLoopDemo(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" /> Run Clean Cycle
              </button>
              <button
                type="button"
                disabled={isStepping}
                onClick={() => runLoopDemo(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50 transition disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Simulate -inf Self-Repair
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 min-h-0">
            {LOOP_STEPS.map((st, idx) => {
              const active = idx === loopStepIdx;
              const isCrashStep = simulateCrash && idx === 2;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setLoopStepIdx(idx)}
                  className={`text-left rounded-xl p-3 border transition flex flex-col justify-center ${
                    isCrashStep && active
                      ? 'bg-amber-950/45 border-amber-400 shadow-lg'
                      : active
                        ? 'bg-cyan-950/45 border-cyan-400 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs sm:text-sm font-mono font-bold text-white">{st.title}</span>
                    <span className="text-[11px] font-mono text-cyan-300 shrink-0">{st.where}</span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-200 leading-snug">
                    {isCrashStep
                      ? 'Candidate triggered overlap violation → evaluate.py returns -inf + AlphaEvolveEvaluationInsight("Circle 14 overlaps 19 by 0.012") → Hydrogen repairs in next gen!'
                      : st.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Strip */}
      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-emerald-300 shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> Zero Proprietary Data Leaves Your Evaluator
        </span>
        <span className="inline-flex items-center gap-1.5 text-cyan-300 font-bold">
          <Zap className="w-3.5 h-3.5" /> ae experiment create → start → run
        </span>
      </div>
    </div>
  );
};
