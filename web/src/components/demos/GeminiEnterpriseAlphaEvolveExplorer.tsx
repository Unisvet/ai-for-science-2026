import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Layers,
  Lock,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../../utils/soundEngine';

type ExplorerTab = 'boundary' | 'workflow' | 'suitability';

interface WorkflowStage {
  step: string;
  name: string;
  accent: 'cyan' | 'amber' | 'purple' | 'emerald';
  owner: string;
  summary: string;
  artifact: string;
}

const OFFICIAL_WORKFLOW: WorkflowStage[] = [
  {
    step: '01',
    name: 'Define',
    accent: 'cyan',
    owner: 'Developer + Antigravity',
    summary:
      'Provide a compile-ready baseline seed program, formal problem context, and surgical # EVOLVE-BLOCK markers.',
    artifact: 'program.py + constraints',
  },
  {
    step: '02',
    name: 'Measure',
    accent: 'amber',
    owner: 'Your Evaluation Sandbox',
    summary:
      'Build an automated, deterministic scoring script that verifies correctness and returns objective KPI metrics.',
    artifact: 'evaluate.py (ground truth)',
  },
  {
    step: '03',
    name: 'Optimize',
    accent: 'purple',
    owner: 'Gemini Enterprise (Cloud)',
    summary:
      'Managed Prompt Sampler, Gemini model ensemble, and Program Database iteratively evolve higher-scoring candidates.',
    artifact: 'Discovery Engine loop',
  },
  {
    step: '04',
    name: 'Apply',
    accent: 'emerald',
    owner: 'Human-in-the-Loop Review',
    summary:
      'Export the verified champion algorithm, inspect auditable # EVOLVE-BLOCK diffs, and deploy with $0 runtime LLM cost.',
    artifact: 'program_evolved.py → Prod',
  },
];

interface SuitabilityCase {
  id: string;
  title: string;
  fit: 'ideal' | 'not-ideal';
  category: string;
  reason: string;
}

const SUITABILITY_CASES: SuitabilityCase[] = [
  {
    id: 'combinatorial',
    title: 'Combinatorial & NP-Hard Search (Packing, Routing, Scheduling)',
    fit: 'ideal',
    category: 'Algorithmic Discovery',
    reason:
      'Ideal fit: large configuration spaces with a fast, deterministic objective score where heuristics can continuously improve.',
  },
  {
    id: 'hpc-kernels',
    title: 'HPC, Semiconductor & TPU/GPU Kernel Optimization',
    fit: 'ideal',
    category: 'Performance Engineering',
    reason:
      'Ideal fit: measurable latency/throughput benchmarks let AlphaEvolve discover non-obvious vectorized & fused implementations.',
  },
  {
    id: 'blank-slate',
    title: 'Building a Full App from Scratch via Chat Prompts',
    fit: 'not-ideal',
    category: 'General Codegen',
    reason:
      'Not for AlphaEvolve: official docs note it is not a general-purpose conversational coding assistant — use Antigravity / Gemini CLI instead.',
  },
  {
    id: 'linting',
    title: 'Routine Linting, Style Formatting & Standard Refactoring',
    fit: 'not-ideal',
    category: 'Code Maintenance',
    reason:
      'Not for AlphaEvolve: evolutionary search is overkill for deterministic formatting or routine software cleanup.',
  },
];

export const GeminiEnterpriseAlphaEvolveExplorer: React.FC<{ staticPrint?: boolean }> = ({
  staticPrint = false,
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>('boundary');
  const [activeStageIdx, setActiveStageIdx] = useState<number>(2);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('combinatorial');
  const [selectedSide, setSelectedSide] = useState<'cloud' | 'sandbox'>('cloud');

  const activeStage = OFFICIAL_WORKFLOW[activeStageIdx];
  const selectedCase = SUITABILITY_CASES.find((c) => c.id === selectedCaseId) ?? SUITABILITY_CASES[0];

  return (
    <div className="flex flex-col h-full justify-between rounded-2xl bg-slate-900/80 border border-purple-500/35 p-4 xl:p-5 gap-3 shadow-xl">
      {/* Header + Official Docs Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 text-sm xl:text-base font-mono font-bold uppercase tracking-wider text-purple-300">
          <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-300" />
          <span>Gemini Enterprise × AlphaEvolve Guide</span>
        </div>

        <a
          href="https://docs.cloud.google.com/gemini/enterprise/docs/alphaevolve/developer-guide/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 transition"
        >
          <span>Official Developer Guide</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Mode Switcher Tabs */}
      {!staticPrint && (
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {(
            [
              { id: 'boundary', label: '1. Cloud vs. Sandbox Boundary', icon: Lock },
              { id: 'workflow', label: '2. Define → Measure → Optimize → Apply', icon: Layers },
              { id: 'suitability', label: '3. When to Use (vs. Not Use)', icon: Sparkles },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  soundEngine.playEvolutionPulse(0.25);
                  setActiveTab(t.id);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition ${
                  active
                    ? 'bg-purple-500/25 text-purple-100 border-purple-400/60'
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

      {/* TAB 1: Managed Cloud vs Customer-Controlled Sandbox */}
      {activeTab === 'boundary' && (
        <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playEvolutionPulse(0.4);
                setSelectedSide('cloud');
              }}
              className={`text-left rounded-xl p-4 border transition flex flex-col justify-between ${
                selectedSide === 'cloud'
                  ? 'bg-purple-950/35 border-purple-400 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-sm xl:text-base font-bold text-purple-200">
                    <Cloud className="w-4 h-4 text-purple-300" /> Managed Cloud Service
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/35">
                    Gemini Enterprise
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                  <li>• <strong className="text-white">Prompt Sampler &amp; LLM Ensemble:</strong> Gemini Argon / Hydrogen propose code diffs.</li>
                  <li>• <strong className="text-white">Program Database:</strong> Tracks MAP-Elites islands, lineage &amp; scores.</li>
                  <li>• <strong className="text-white">Enterprise Governance:</strong> GCP IAM, `gcloud ADC`, `GE_APP_ID`, Model Armor.</li>
                </ul>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/90 text-[11px] font-mono text-purple-300">
                Receives only # EVOLVE-BLOCK code + scalar metrics &amp; insights
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playEvolutionPulse(0.6);
                setSelectedSide('sandbox');
              }}
              className={`text-left rounded-xl p-4 border transition flex flex-col justify-between ${
                selectedSide === 'sandbox'
                  ? 'bg-emerald-950/35 border-emerald-400 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-sm xl:text-base font-bold text-emerald-200">
                    <Server className="w-4 h-4 text-emerald-300" /> Customer-Controlled Evaluator
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/35">
                    Your Infra
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                  <li>• <strong className="text-white">Isolated Execution:</strong> Local machine, Cloud Run Jobs, GKE, or Spot TPU VM.</li>
                  <li>• <strong className="text-white">Data Sovereignty:</strong> Proprietary datasets &amp; test harnesses never leave your boundary.</li>
                  <li>• <strong className="text-white">Safe Sandboxing:</strong> Rootless Podman / containers isolate untrusted generated code.</li>
                </ul>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800/90 text-[11px] font-mono text-emerald-300">
                Runs evaluate.py deterministically → returns score or -inf insight
              </div>
            </button>
          </div>

          <div className="rounded-xl bg-slate-950 border border-cyan-500/35 px-4 py-2.5 text-xs sm:text-sm text-slate-100 flex items-center justify-between gap-3">
            <span>
              <strong className="text-cyan-300 font-mono">
                {selectedSide === 'cloud' ? 'Cloud Governance:' : 'Sandbox Control:'}
              </strong>{' '}
              {selectedSide === 'cloud'
                ? 'Provision AlphaEvolve once in Gemini Enterprise (Discovery Engine), control access via IAM & ADC, and audit every generation.'
                : 'Scale evaluation from a laptop to Cloud Run, GKE GPU/TPU pools, or Spot v6e-1 TPUs without moving sensitive data to the model.'}
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: Official 4-Step Workflow */}
      {activeTab === 'workflow' && (
        <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OFFICIAL_WORKFLOW.map((st, idx) => {
              const active = idx === activeStageIdx;
              return (
                <button
                  key={st.step}
                  type="button"
                  onClick={() => {
                    soundEngine.playEvolutionPulse(0.2 + idx * 0.25);
                    setActiveStageIdx(idx);
                  }}
                  className={`text-left rounded-xl p-3 border transition ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-[11px] font-mono text-cyan-300 font-bold">STEP {st.step}</div>
                  <div className="text-sm sm:text-base font-extrabold text-white mt-0.5">{st.name}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{st.artifact}</div>
                </button>
              );
            })}
          </div>

          <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col justify-center gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-base sm:text-lg font-extrabold text-white">
                {activeStage.step}. {activeStage.name}
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/40">
                Owner: {activeStage.owner}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">{activeStage.summary}</p>
            <div className="text-xs sm:text-sm font-mono text-emerald-300 mt-1">
              Output Artifact → {activeStage.artifact}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Suitability Checker (When to Use vs When NOT to Use) */}
      {activeTab === 'suitability' && (
        <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0">
            {SUITABILITY_CASES.map((item) => {
              const active = item.id === selectedCase.id;
              const isIdeal = item.fit === 'ideal';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playEvolutionPulse(isIdeal ? 0.8 : 0.15);
                    setSelectedCaseId(item.id);
                  }}
                  className={`text-left rounded-xl p-3 border transition flex flex-col justify-center ${
                    active
                      ? isIdeal
                        ? 'bg-emerald-950/45 border-emerald-400 text-white'
                        : 'bg-amber-950/45 border-amber-400 text-white'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      {item.category}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isIdeal
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isIdeal ? '✓ Use AlphaEvolve' : '✗ Skip AE'}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white leading-snug">{item.title}</div>
                </button>
              );
            })}
          </div>

          <div
            className={`rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm flex items-start gap-2 ${
              selectedCase.fit === 'ideal'
                ? 'bg-emerald-950/35 border-emerald-400/45 text-emerald-100'
                : 'bg-amber-950/35 border-amber-400/45 text-amber-100'
            }`}
          >
            {selectedCase.fit === 'ideal' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
            )}
            <span>{selectedCase.reason}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300 shrink-0">
        <span className="text-emerald-300 font-semibold">
          Auth: gcloud auth application-default login
        </span>
        <span className="text-purple-300 font-semibold">
          ADK • A2A • Model Armor • Discovery Engine
        </span>
      </div>
    </div>
  );
};
