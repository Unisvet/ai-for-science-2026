import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Compass,
  ExternalLink,
  FileCode2,
  GitMerge,
  MessageSquareCode,
  Play,
  Rocket,
  RotateCcw,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface AeSkillNode {
  id: string;
  name: string;
  shortLabel: string;
  role: 'conductor' | 'advisor' | 'stage';
  stageNum?: string;
  accent: 'cyan' | 'emerald' | 'purple' | 'amber';
  tagline: string;
  triggerPrompt: string;
  command: string;
  outputLines: string[];
  artifact: string;
}

const AE_SKILLS: AeSkillNode[] = [
  {
    id: 'orchestrator',
    name: 'alpha_evolve_orchestrator',
    shortLabel: 'Orchestrator',
    role: 'conductor',
    accent: 'cyan',
    tagline: 'End-to-end lifecycle conductor — detects where you are and chains the right skill automatically.',
    triggerPrompt: '“Evolve my packing solver with AlphaEvolve end to end.”',
    command: 'agy run --skill alpha_evolve_orchestrator',
    outputLines: [
      '✓ Detected workspace: no existing ae experiment found',
      '→ Routing to Design → Runner → Monitor → Post-Experiment',
      '✓ Guardrails active: .agents/rules/tpu-lifecycle.md',
    ],
    artifact: 'Automated 4-stage execution graph',
  },
  {
    id: 'consultant',
    name: 'alpha_evolve_consultant',
    shortLabel: 'Consultant',
    role: 'advisor',
    accent: 'purple',
    tagline: 'Grounded expert advisor for evaluator design, EVOLVE-BLOCK placement, and reward-hacking checks.',
    triggerPrompt: '“Is my problem suitable for AlphaEvolve, and how should I score it?”',
    command: 'agy ask --skill alpha_evolve_consultant',
    outputLines: [
      '✓ Checked determinism & fast verification (< 2s / candidate)',
      '✓ Recommended continuous score + strict geometry penalty',
      '✓ Verified EVOLVE-BLOCK scope isolates hot inner loop',
    ],
    artifact: 'Validated evaluator & scoring rubric',
  },
  {
    id: 'design',
    name: 'alpha_evolve_experiment_design',
    shortLabel: 'Experiment Design',
    role: 'stage',
    stageNum: '01',
    accent: 'cyan',
    tagline: 'Turns a natural-language problem into a tested experiment directory with EVOLVE-BLOCK markers.',
    triggerPrompt: '“Set up an AlphaEvolve experiment for n=26 circle packing.”',
    command: 'ae init --from-skill alpha_evolve_experiment_design',
    outputLines: [
      '✓ Created seed.py with # EVOLVE-BLOCK-START / END',
      '✓ Created evaluator.py (3-tier deterministic verifier)',
      '✓ Dry-run baseline score: 1.542 (0 overlap violations)',
    ],
    artifact: 'seed.py · evaluator.py · config.yaml',
  },
  {
    id: 'runner',
    name: 'alpha_evolve_runner',
    shortLabel: 'Runner',
    role: 'stage',
    stageNum: '02',
    accent: 'amber',
    tagline: 'Validates configs, checks Cloud auth, and launches evolutionary search via the ae CLI.',
    triggerPrompt: '“Launch the AlphaEvolve experiment on Google Cloud.”',
    command: 'ae run ./experiments/circle_packing --ensemble gemini',
    outputLines: [
      '✓ Preflight passed: evaluator tests 3/3 green',
      '✓ Submitted experiment job exp-2026-n26 to Discovery Engine',
      '✓ Island population initialized (4 islands · Gemini ensemble)',
    ],
    artifact: 'Live experiment ID: exp-2026-n26',
  },
  {
    id: 'monitor',
    name: 'alpha_evolve_monitor',
    shortLabel: 'Monitor',
    role: 'stage',
    stageNum: '03',
    accent: 'emerald',
    tagline: 'Runs the evaluation control loop, streams fitness curves, and opens live --dashboard telemetry.',
    triggerPrompt: '“Monitor experiment progress and show the top candidates.”',
    command: 'ae monitor exp-2026-n26 --dashboard',
    outputLines: [
      'Gen 12 → best sum_radii = 2.184 (+41.6%)',
      'Gen 28 → best sum_radii = 2.519 (+63.4%)',
      'Gen 42 → best sum_radii = 2.635 (+70.9% · new frontier)',
    ],
    artifact: 'Live fitness curve & Pareto frontier',
  },
  {
    id: 'post',
    name: 'alpha_evolve_post_experiment',
    shortLabel: 'Post-Experiment',
    role: 'stage',
    stageNum: '04',
    accent: 'emerald',
    tagline: 'Generates visual analysis reports and applies the winning evolved algorithm back to your repo.',
    triggerPrompt: '“Analyze the results and integrate the best evolved program.”',
    command: 'ae export exp-2026-n26 --apply-best',
    outputLines: [
      '✓ Exported evolution report + fitness trajectory chart',
      '✓ Applied winning EVOLVE-BLOCK diff to solver.py',
      '✓ Re-ran unit tests & verifier: 100% pass',
    ],
    artifact: 'Merged winning diff + report.md',
  },
];

const SEQUENCE_IDS = ['orchestrator', 'consultant', 'design', 'runner', 'monitor', 'post'];

const ACCENT_MAP = {
  cyan: {
    active: 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.22)]',
    idle: 'bg-slate-950/85 border-slate-800 hover:border-cyan-400/50',
    badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    text: 'text-cyan-300',
  },
  purple: {
    active: 'bg-purple-950/50 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.22)]',
    idle: 'bg-slate-950/85 border-slate-800 hover:border-purple-400/50',
    badge: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
    text: 'text-purple-300',
  },
  amber: {
    active: 'bg-amber-950/45 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]',
    idle: 'bg-slate-950/85 border-slate-800 hover:border-amber-400/50',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    text: 'text-amber-300',
  },
  emerald: {
    active: 'bg-emerald-950/45 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.22)]',
    idle: 'bg-slate-950/85 border-slate-800 hover:border-emerald-400/50',
    badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    text: 'text-emerald-300',
  },
};

function renderSkillIcon(id: string) {
  switch (id) {
    case 'orchestrator':
      return <Sparkles className="w-4 h-4 shrink-0" />;
    case 'consultant':
      return <Compass className="w-4 h-4 shrink-0" />;
    case 'design':
      return <FileCode2 className="w-4 h-4 shrink-0" />;
    case 'runner':
      return <Rocket className="w-4 h-4 shrink-0" />;
    case 'monitor':
      return <Activity className="w-4 h-4 shrink-0" />;
    default:
      return <GitMerge className="w-4 h-4 shrink-0" />;
  }
}

export const AntigravitySkillsSimulator: React.FC<{ staticPrint?: boolean }> = ({
  staticPrint = false,
}) => {
  const [activeId, setActiveId] = useState<string>('orchestrator');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (!isPlaying || staticPrint) return;
    const timer = window.setInterval(() => {
      setActiveId((prev) => {
        const idx = SEQUENCE_IDS.indexOf(prev);
        const nextIdx = (idx + 1) % SEQUENCE_IDS.length;
        if (nextIdx === 0) {
          setIsPlaying(false);
          return SEQUENCE_IDS[SEQUENCE_IDS.length - 1];
        }
        return SEQUENCE_IDS[nextIdx];
      });
    }, 2400);
    return () => window.clearInterval(timer);
  }, [isPlaying, staticPrint]);

  const activeSkill = AE_SKILLS.find((s) => s.id === activeId) ?? AE_SKILLS[0];
  const activeStyle = ACCENT_MAP[activeSkill.accent];
  const activeSeqIdx = SEQUENCE_IDS.indexOf(activeId);

  const conductorSkills = AE_SKILLS.filter((s) => s.role !== 'stage');
  const stageSkills = AE_SKILLS.filter((s) => s.role === 'stage');

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (activeId === SEQUENCE_IDS[SEQUENCE_IDS.length - 1]) {
        setActiveId(SEQUENCE_IDS[0]);
      }
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full w-full rounded-2xl bg-slate-900/80 border border-cyan-500/35 p-4 xl:p-5 shadow-2xl gap-3.5 min-h-0">
      {/* Header + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            href="https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud/tree/main/skills"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm sm:text-base xl:text-lg font-mono font-bold uppercase tracking-wider text-emerald-300 hover:text-emerald-200 transition-colors"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>6 Official ae Skills · Interactive Lifecycle</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
          </a>
        </div>

        {!staticPrint && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold border transition ${
                isPlaying
                  ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
                  : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 hover:bg-cyan-400 hover:text-slate-950'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              {isPlaying ? 'Simulating…' : 'Simulate Lifecycle'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setActiveId('orchestrator');
              }}
              title="Reset Simulation"
              className="p-1.5 rounded-lg bg-slate-950/90 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Top Layer: Conductor (Orchestrator) + Advisor (Consultant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
        {conductorSkills.map((skill) => {
          const isSelected = skill.id === activeId;
          const st = ACCENT_MAP[skill.accent];
          return (
            <button
              key={skill.id}
              type="button"
              disabled={staticPrint}
              onClick={() => {
                setIsPlaying(false);
                setActiveId(skill.id);
              }}
              className={`text-left rounded-xl p-3.5 border transition ${
                isSelected ? st.active : st.idle
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 text-sm xl:text-base font-bold ${st.text}`}>
                  {renderSkillIcon(skill.id)}
                  {skill.shortLabel}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] xl:text-xs font-mono border ${st.badge}`}>
                  {skill.role === 'conductor' ? 'Meta-Conductor' : 'Always-On Advisor'}
                </span>
              </div>
              <div className="font-mono text-xs xl:text-[13px] text-slate-300 truncate">
                {skill.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Middle Layer: 4-Stage Execution Pipeline */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
        {stageSkills.map((skill, idx) => {
          const isSelected = skill.id === activeId;
          const seqIdx = SEQUENCE_IDS.indexOf(skill.id);
          const isCompleted = activeSeqIdx > seqIdx;
          const st = ACCENT_MAP[skill.accent];
          return (
            <button
              key={skill.id}
              type="button"
              disabled={staticPrint}
              onClick={() => {
                setIsPlaying(false);
                setActiveId(skill.id);
              }}
              className={`relative text-left rounded-xl p-3 border transition flex flex-col justify-between gap-1.5 ${
                isSelected ? st.active : st.idle
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`font-mono text-xs xl:text-sm font-bold ${st.text}`}>
                  Stage {skill.stageNum}
                </span>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className={st.text}>{renderSkillIcon(skill.id)}</span>
                )}
              </div>
              <div className="text-sm xl:text-base font-bold text-white leading-tight">
                {skill.shortLabel}
              </div>
              <div className="font-mono text-[11px] xl:text-xs text-slate-400 truncate">
                {skill.name}
              </div>
              {idx < stageSkills.length - 1 && (
                <ArrowRight className="hidden xl:block w-3.5 h-3.5 text-slate-600 absolute -right-2.5 top-1/2 -translate-y-1/2 z-10" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Layer: Live Skill Inspector + Simulated Antigravity Terminal */}
      <div className={`flex-1 flex flex-col justify-between rounded-xl border p-5 xl:p-6 gap-4 min-h-0 bg-slate-950/90 ${activeStyle.active.split(' ').find((c) => c.startsWith('border-')) ?? 'border-cyan-500/40'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className={`text-lg sm:text-xl xl:text-2xl font-mono font-bold ${activeStyle.text} flex items-center gap-2.5`}>
              {renderSkillIcon(activeSkill.id)}
              <span>{activeSkill.name}</span>
            </div>
            <p className="text-base sm:text-lg xl:text-[1.32rem] 2xl:text-[1.42rem] text-slate-100 mt-2 leading-relaxed">
              {activeSkill.tagline}
            </p>
          </div>
          <span className={`px-3.5 py-1.5 rounded-lg text-sm xl:text-base font-mono font-semibold border shrink-0 ${activeStyle.badge}`}>
            Output: {activeSkill.artifact}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Natural Language Trigger */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 xl:p-5 flex flex-col justify-center gap-2.5">
            <div className="text-xs sm:text-sm xl:text-[15px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MessageSquareCode className="w-4 h-4 text-cyan-300 shrink-0" /> Natural-Language Prompt
            </div>
            <p className="text-lg sm:text-xl xl:text-[1.35rem] 2xl:text-[1.48rem] text-white italic leading-relaxed">
              {activeSkill.triggerPrompt}
            </p>
          </div>

          {/* Simulated Terminal Execution */}
          <div className="rounded-xl bg-black/75 border border-slate-800 p-4 xl:p-5 font-mono text-sm sm:text-base xl:text-[1.08rem] 2xl:text-[1.16rem] flex flex-col justify-center gap-2">
            <div className="text-cyan-300 flex items-center gap-2 pb-2 border-b border-slate-800/80 font-semibold">
              <Terminal className="w-4 h-4 shrink-0" />
              <span className="truncate">$ {activeSkill.command}</span>
            </div>
            <div className="space-y-1.5 pt-1 text-emerald-300/95">
              {activeSkill.outputLines.map((line) => (
                <div key={line} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer install hint */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-sm xl:text-base font-mono text-slate-400 shrink-0">
          <span>
            Install once: <code className="text-emerald-300 font-semibold">ae skills install --tool Antigravity</code>
          </span>
          <span className="text-slate-400">
            Extensible later with <code className="text-cyan-300 font-semibold">agy plugin install</code>
          </span>
        </div>
      </div>
    </div>
  );
};
