export interface GlossaryTerm {
  id: string;
  term: string;
  shortLabel: string;
  tagline: string;
  accent: 'cyan' | 'emerald' | 'purple' | 'amber';
  plainEnglish: string;
  magicalAnalogyTitle: string;
  magicalAnalogy: string;
  howItFits: string[];
  codeOrCli: string;
  docUrl: string;
  docLabel: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'agentic-workflow',
    term: 'Agentic Workflow',
    shortLabel: 'Agentic Workflow',
    tagline: 'From a single chat reply to a self-correcting, tool-using pipeline',
    accent: 'cyan',
    plainEnglish:
      'An agentic workflow is a goal-driven loop where AI models plan steps, call external tools (code, APIs, cloud CLIs, tests), inspect real outputs, and iterate until a deterministic check passes.',
    magicalAnalogyTitle: 'The Fortune Cookie vs. The Tasting Kitchen',
    magicalAnalogy:
      'A single LLM prompt is a fortune cookie: you get one sentence and hope it tastes good. An agentic workflow is a full kitchen with a Head Chef (Planner), Sous-Chefs (MCP Tools & Subagents), and a Food Critic (Verifier) who tastes every dish before it leaves the pass.',
    howItFits: [
      'Breaks a big engineering goal into specialized subagent tasks (Architect, Red-Team, TPU Engineer).',
      'Grounds reasoning in real tool outputs instead of guessing from memory.',
      'Hands off the hardest algorithmic bottlenecks to AlphaEvolve for evolutionary search.',
    ],
    codeOrCli: `# Antigravity Task Pipeline Pattern
Plan (Architect) -> Execute (MCP Tools / Sandbox) -> Verify (Tests / TPU Eval) -> Evolve (AlphaEvolve)`,
    docUrl: 'https://antigravity.google/docs',
    docLabel: 'Antigravity Docs',
  },
  {
    id: 'antigravity',
    term: 'Google Antigravity (App · CLI · IDE · SDK)',
    shortLabel: 'Antigravity (App·CLI·IDE·SDK)',
    tagline: 'The unified developer cockpit for autonomous multi-agent workflows',
    accent: 'cyan',
    plainEnglish:
      'Google Antigravity is the agentic development platform that lets you run, steer, and govern autonomous coding & research agents across four surfaces: the Antigravity App (desktop), Antigravity IDE, the `agy` CLI, and the `google-antigravity` Python SDK.',
    magicalAnalogyTitle: 'Mission Control for Autonomous Spacecraft',
    magicalAnalogy:
      'If an LLM is the rocket engine, Antigravity is Mission Control: `.agents/skills/` are flight checklists, `.agents/rules/` are safety interlocks, MCP servers are docking ports to Google Cloud, and the App/IDE lets humans watch telemetry and intervene at any stage.',
    howItFits: [
      'Antigravity App & IDE: Visual workspace for multi-agent orchestration, diffs, and 3D/interactive artifacts.',
      'agy CLI & Python SDK: Scriptable headless automation for CI/CD, workshops, and TPU job orchestration.',
      'Skills & Rules (.agents/): Portable SKILL.md playbooks — including the 6 official `ae` AlphaEvolve skills.',
    ],
    codeOrCli: `# Install Google Cloud plugin & AlphaEvolve skills into Antigravity
agy plugin install google-cloud-developer
ae skills install --tool Antigravity`,
    docUrl: 'https://antigravity.google/docs',
    docLabel: 'antigravity.google/docs',
  },
  {
    id: 'gemini-enterprise',
    term: 'Gemini Enterprise Agent Platform',
    shortLabel: 'Gemini Enterprise',
    tagline: 'Managed Google Cloud home for Discovery Engine, ADK, A2A & Model Armor',
    accent: 'purple',
    plainEnglish:
      'Gemini Enterprise is Google Cloud’s managed platform for building, scaling, and governing enterprise AI agents. It hosts the Discovery Engine API that powers AlphaEvolve’s cloud generation loop alongside ADK, A2A, and Model Armor.',
    magicalAnalogyTitle: 'The Enchanted Observatory with Guarded Doors',
    magicalAnalogy:
      'Think of Gemini Enterprise as an observatory where powerful Gemini telescopes (Flash + Pro ensembles) live inside a secure vault: ADK builds the instruments, A2A connects observatories together, and Model Armor checks every visitor’s badge at the door.',
    howItFits: [
      'Hosts AlphaEvolve’s managed Prompt Sampler, Gemini Ensemble, and Program Database (`GE_APP_ID`).',
      'Authenticates cleanly via Google Cloud ADC (`gcloud auth application-default login`).',
      'Provides enterprise governance (Model Armor, Agent Identity, IAM) for production pipelines.',
    ],
    codeOrCli: `# Configure AlphaEvolve with your Gemini Enterprise App / Engine ID
export GCP_PROJECT_ID="your-project-id"
export GE_APP_ID="your-gemini-enterprise-engine-id"
gcloud auth application-default login`,
    docUrl: 'https://docs.cloud.google.com/gemini/enterprise/docs/alphaevolve/developer-guide/overview',
    docLabel: 'Gemini Enterprise AlphaEvolve Docs',
  },
  {
    id: 'gcloud-adc',
    term: 'gcloud ADC (Application Default Credentials)',
    shortLabel: 'gcloud ADC',
    tagline: 'Keyless, IAM-governed Google Cloud authentication for SDKs & the ae CLI',
    accent: 'cyan',
    plainEnglish:
      'Application Default Credentials (ADC) is Google Cloud’s standard way for local code, Python SDKs, and the `ae` CLI to authenticate to Google Cloud APIs (like Discovery Engine / `GE_APP_ID`) without hardcoding API keys or downloading service-account JSON key files.',
    magicalAnalogyTitle: 'A Digital Keycard Instead of Sticky-Note Passwords',
    magicalAnalogy:
      'Instead of taping a permanent master key (API key or `.json` file) inside your repo, `gcloud auth application-default login` issues a short-lived digital keycard stored safely outside Git — tied directly to your real GCP IAM identity and audit log.',
    howItFits: [
      'Zero Static Secrets: No API keys or `.json` service-account keys sitting in your project folder or `.env`.',
      'Enterprise IAM & Auditability: Every AlphaEvolve API call to Discovery Engine (`GE_APP_ID`) is governed by your GCP IAM roles (or attached VM/GKE service account) and recorded in Cloud Audit Logs.',
      'CLI vs. Code Distinction: `gcloud auth login` authenticates the `gcloud` CLI itself; `gcloud auth application-default login` (ADC) authenticates your Python code, SDKs, and `ae` CLI calling Google Cloud APIs.',
    ],
    codeOrCli: `# Authenticate your local code, Python SDKs & ae CLI (ADC)
gcloud auth application-default login

# Then point AlphaEvolve at your Discovery Engine app
export GCP_PROJECT_ID="your-project-id"
export GE_APP_ID="your-gemini-enterprise-engine-id"`,
    docUrl: 'https://cloud.google.com/docs/authentication/application-default-credentials',
    docLabel: 'Google Cloud ADC Docs',
  },
  {
    id: 'alphaevolve',
    term: 'AlphaEvolve on Google Cloud',
    shortLabel: 'AlphaEvolve',
    tagline: 'Gemini-powered evolutionary coding agent for algorithmic breakthroughs',
    accent: 'emerald',
    plainEnglish:
      'AlphaEvolve is an evolutionary coding agent (not a chat copilot). You supply a working seed program with `# EVOLVE-BLOCK-START` / `# EVOLVE-BLOCK-END` markers and a deterministic `evaluate.py` scorer; Gemini proposes mutations across generations until it discovers superhuman algorithms.',
    magicalAnalogyTitle: 'Darwin’s Library of Living Algorithms',
    magicalAnalogy:
      'Instead of asking one wizard to guess the perfect spell once, AlphaEvolve breeds 1,000 clockwork apprentices in parallel. A strict mathematical referee scores every clock — even broken clocks return an insight note so the next generation repairs itself and climbs higher.',
    howItFits: [
      'Cloud side (Discovery Engine): `gemini-3.5-flash` + `gemini-3.1-pro-preview` ensemble mutates code (`acquire_programs()` / `submit_program_evaluations()`).',
      'Your side (`evaluate.py`): Runs locally, in Cloud Run, on GKE+Ray, or on Cloud TPUs — your data never leaves!',
      'When to use (and not use): Ideal for NP-hard, heuristic, and algorithmic optimization with deterministic verifiers — not for general chat coding or simple linting/refactoring.',
      'Non-monotonic progress + `-inf` insights: Failed candidates steer the search rather than crashing it.',
    ],
    codeOrCli: `# Official 3-step ae CLI lifecycle
ae experiment create --title "my-algo" --program-language python
ae experiment start  --nickname my-algo --program-file program.py
ae experiment run    --nickname my-algo --evaluator-file evaluate.py`,
    docUrl: 'https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud',
    docLabel: 'Google-Cloud-AI/alphaevolve-on-googlecloud',
  },
  {
    id: 'evolve-block',
    term: 'EVOLVE-BLOCK & Deterministic Evaluator',
    shortLabel: 'EVOLVE-BLOCK & Eval',
    tagline: 'Surgical mutation boundaries + ground-truth scoring with -inf insights',
    accent: 'amber',
    plainEnglish:
      'AlphaEvolve only rewrites code inside `# EVOLVE-BLOCK-START` and `# EVOLVE-BLOCK-END`, keeping function signatures and tests locked. Your `evaluate.py` returns a scalar metric (higher = better) plus `AlphaEvolveEvaluationInsight` feedback.',
    magicalAnalogyTitle: 'The Locked Safe with a Surgical Window',
    magicalAnalogy:
      'You never hand a locksmith the deed to the building — you open a small glass window around the combination dial (`EVOLVE-BLOCK`). Your evaluator is a laser-measured scale: pass, and it weighs the gold; fail, and it whispers why (`-inf` + insight) so the next attempt improves.',
    howItFits: [
      'Keeps I/O contracts, imports, and safety invariants 100% immutable.',
      'Always maximizes scores (negate loss or latency, e.g., `neg_eval_loss`) and supports multi-objective scoring.',
      'Reward-hacking prevention: Validate constraints on held-out/randomized inputs and guard against `NaN`/`Inf` before JSON submission to the `ae` controller.',
    ],
    codeOrCli: `# EVOLVE-BLOCK-START
def construct_packing(n: int, random_seed: int = 42):
    # AlphaEvolve mutates ONLY inside this block
    ...
# EVOLVE-BLOCK-END`,
    docUrl: 'https://docs.cloud.google.com/gemini/enterprise/docs/alphaevolve/developer-guide/overview',
    docLabel: 'AlphaEvolve Developer Guide',
  },
  {
    id: 'cloud-tpus',
    term: 'Google Cloud TPUs (v6e · Ironwood · 8t & 8i)',
    shortLabel: 'Cloud TPUs & Pallas',
    tagline: 'Systolic array silicon powering distributed inference & evolutionary eval',
    accent: 'purple',
    plainEnglish:
      'Google Cloud TPUs are custom matrix-multiply ASICs (MXUs + high-bandwidth HBM3E). In AlphaEvolve pipelines, TPUs accelerate Tier-3 evaluation (`JAX` `vmap`/`pallas_call` or `TorchTPU` `.to("tpu")`) and high-throughput agentic inference (`TPU-8i`).',
    magicalAnalogyTitle: 'The 256×256 Systolic Orchestra + 3-Gate Filter',
    magicalAnalogy:
      'A CPU is a solo violinist; a TPU MXU is a 256×256 synchronized orchestra where data flows like music through every seat without returning to memory. Because orchestra time is precious, our 3-Tier Cascade Gate checks sheet music (AST) and tuning (CPU) before stepping onto the TPU stage.',
    howItFits: [
      'Spot `v6e-1` TPU VM (`v2-alpha-tpuv6e`): Low-cost single-chip evaluator with zero-leak `trap` teardown.',
      'GKE + RayCluster on TPU slices: Parallel candidate evaluation mirroring `examples/llm_fine_tuning`.',
      'Ironwood (v7) & TPU-8i: Purpose-built for continuous agentic inference (+80% perf/$).',
    ],
    codeOrCli: `# Zero-leak Spot Trillium TPU VM provisioning
gcloud compute tpus tpu-vm create alphaevolve-tpu \\
  --zone=europe-west4-a --accelerator-type=v6e-1 \\
  --version=v2-alpha-tpuv6e --spot`,
    docUrl: 'https://docs.jax.dev/en/latest/pallas/index.html',
    docLabel: 'JAX & Pallas TPU Docs',
  },
];

export const GLOSSARY_BY_ID: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY_TERMS.map((t) => [t.id, t])
);
