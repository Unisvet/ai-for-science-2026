import { LearningResource } from '../types/presentation';

export const LEARNING_RESOURCES: LearningResource[] = [
  {
    id: 'codelab-alphaevolve-gcp',
    category: 'AlphaEvolve & Codelab',
    title: 'Official Codelab: Get Started with AlphaEvolve on Google Cloud',
    provider: 'Google Developers Codelabs',
    url: 'https://codelabs.developers.google.com/alphaevolve-on-google-cloud-1?hl=en#0',
    badge: 'Hands-On Codelab (#1 Start Here)',
    description:
      'Our core workshop lab: step-by-step walkthrough of `# EVOLVE-BLOCK-START`, n=26 Circle Packing (`0.96 -> 2.54+`), Travelling Salesman Problem (TSP), and Discovery Engine evaluation loops.',
  },
  {
    id: 'alphaevolve-developer-guide',
    category: 'AlphaEvolve & Codelab',
    title: 'AlphaEvolve Developer Guide Overview (Gemini Enterprise on Google Cloud)',
    provider: 'Google Cloud Docs',
    url: 'https://docs.cloud.google.com/gemini/enterprise/docs/alphaevolve/developer-guide/overview',
    badge: 'Official Developer Guide',
    description:
      'Complete Google Cloud developer reference covering AlphaEvolve architecture, use-case qualification, evaluator & scoring patterns, reward-hacking prevention, concurrency, and HPC scaling.',
  },
  {
    id: 'alphaevolve-hpc-blueprints',
    category: 'AlphaEvolve & Codelab',
    title: 'AlphaEvolve Blueprints (`GoogleCloudPlatform/hpc-solutions`)',
    provider: 'GitHub • GoogleCloudPlatform',
    url: 'https://github.com/GoogleCloudPlatform/hpc-solutions/tree/main/blueprints/alphaevolve',
    badge: 'HPC Infra Blueprints',
    description:
      'Declarative Google Cloud infrastructure blueprints for deploying and managing scalable AlphaEvolve evolutionary code-optimization experiments (IAM, Artifact Registry, GCS, Cloud Build, Discovery Engine & Batch/HPC).',
  },
  {
    id: 'github-alphaevolve-on-googlecloud',
    category: 'AlphaEvolve & Codelab',
    title: 'Official Repository: Google-Cloud-AI/alphaevolve-on-googlecloud (`ae` CLI & 6 Skills)',
    provider: 'GitHub • Google-Cloud-AI',
    url: 'https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud',
    badge: '6 Reference Demos + ae CLI',
    description:
      'Official Google Cloud AI reference implementations (`circle_packing`, `tsp`, `signal_processing`, `adaptive_sort`, `llm_fine_tuning`), `ae` CLI, and the 6 `alpha_evolve_*` Antigravity skills.',
  },
  {
    id: 'alphaevolve-deepmind',
    category: 'AlphaEvolve & Codelab',
    title: 'AlphaEvolve: A Gemini-Powered Coding Agent for Designing Advanced Algorithms',
    provider: 'Google DeepMind & Google Cloud',
    url: 'https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/',
    badge: 'DeepMind Research',
    description:
      'How ensemble Gemini models + automated verifiers beat a 14-year Circle Packing record (`2.6359`), recovered 0.7% of Google Borg fleet compute, and accelerated training kernels by 23%.',
  },
  {
    id: 'alphaevolve-whitepaper',
    category: 'AlphaEvolve & Codelab',
    title: 'AlphaEvolve Technical Whitepaper (Google DeepMind)',
    provider: 'Google DeepMind Storage',
    url: 'https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/AlphaEvolve.pdf',
    badge: 'Technical PDF',
    description:
      'Full scientific benchmarks across matrix multiplication, combinatorial geometry, kissing numbers, and hardware circuit optimization using evolutionary coding.',
  },
  {
    id: 'ieee-ccnc-2027-evofedagg',
    category: 'AlphaEvolve & Codelab',
    title: 'IEEE CCNC 2027 — Evo-FedAgg Research Case Study',
    provider: 'IEEE Consumer Communications & Networking Conference 2027',
    url: 'https://ccnc2027.ieee-ccnc.org/',
    badge: 'Science Case Study',
    description:
      'Automated Evolutionary Discovery of Byzantine-Resilient Aggregators for Edge-Cloud FL (`99.71%` entropy mitigation, `17.2×` faster than Multi-Krum). DOI available after conference.',
  },
  {
    id: 'yt-future-ai-infra',
    category: 'Cloud TPUs & Silicon',
    title: 'The Future of AI Infrastructure (TPU Ironwood, TPU-8t/8i & AI Hypercomputer)',
    provider: 'Google Cloud Tech (YouTube Live)',
    url: 'https://www.youtube.com/live/pabDkNR7jIs',
    featuredVideoId: 'pabDkNR7jIs',
    badge: 'Featured TPU Keynote',
    description:
      'Deep-dive into how Google Cloud co-designs Ironwood (TPU v7), bifurcated 8th-Gen TPUs (TPU-8t for 134k-chip Virgo training & TPU-8i for +80% perf/$ agentic inference), and Agent-Native GKE.',
  },
  {
    id: 'blog-eighth-gen-tpu-agentic',
    category: 'Cloud TPUs & Silicon',
    title: 'Eighth-Generation TPU for the Agentic Era (TPU 8t, 8i, 8tx & 8i Max)',
    provider: 'Google Keyword Blog',
    url: 'https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/eighth-generation-tpu-agentic-era/',
    badge: '8th-Gen TPU Launch',
    description:
      'Official announcement introducing Google’s bifurcated 8th-generation TPU lineup built for continuous multi-step agentic reasoning, evolutionary search, and ExaFLOP-scale training.',
  },
  {
    id: 'blog-tpu-8t-8i-deep-dive',
    category: 'Cloud TPUs & Silicon',
    title: 'TPU 8t and TPU 8i Technical Deep Dive (121 EF Training & 11.6 EF Inference)',
    provider: 'Google Cloud Blog',
    url: 'https://cloud.google.com/blog/products/compute/tpu-8t-and-tpu-8i-technical-deep-dive',
    badge: 'Silicon Architecture Deep Dive',
    description:
      'Hardware breakdown of TPU 8t (12.6 FP4 PF/chip, 121 EF 9,600-chip superpod, Virgo 134k-chip fabric) and TPU 8i (10.1 FP4 PF/chip, 288 GB HBM3e @ 8.6 TB/s, 384 MB SRAM).',
  },
  {
    id: 'gcp-tpu-docs',
    category: 'Cloud TPUs & Silicon',
    title: 'Google Cloud TPU Documentation (v5e, Trillium v6e & Ironwood)',
    provider: 'Google Cloud Docs',
    url: 'https://cloud.google.com/tpu/docs',
    badge: 'Official TPU Docs',
    description:
      'Architecture guides, Spot TPU VM provisioning (`--spot`, `--version=v2-alpha-tpuv6e`), quotas, and multi-slice scaling for scientific workloads.',
  },
  {
    id: 'jax-on-tpu',
    category: 'Cloud TPUs & Silicon',
    title: 'JAX on Cloud TPUs (`jit`, `vmap` & SPMD Sharding)',
    provider: 'JAX Documentation',
    url: 'https://docs.jax.dev/en/latest/tpu.html',
    badge: 'JAX + XLA',
    description:
      'Vectorize and compile scientific AlphaEvolve evaluators across TPU cores using `jax.jit`, `jax.vmap`, and `shard_map`.',
  },
  {
    id: 'torchtpu-pallas',
    category: 'Cloud TPUs & Silicon',
    title: 'TorchTPU & JAX Pallas Custom VMEM Kernels',
    provider: 'Google & PyTorch Open Source',
    url: 'https://docs.jax.dev/en/latest/pallas/index.html',
    badge: 'Pallas & TorchTPU',
    description:
      'Native eager PyTorch `.to("tpu")` execution alongside JAX `pallas_call` block-fused VMEM scratchpad programming for 256×256 systolic MXUs.',
  },
  {
    id: 'antigravity-docs',
    category: 'Antigravity & Workshop',
    title: 'Google Antigravity App Documentation (Desktop, CLI, Plugins, Skills & Rules)',
    provider: 'Google Antigravity',
    url: 'https://antigravity.google/docs',
    badge: 'Platform Docs',
    description:
      'Run all AlphaEvolve Codelab examples inside Antigravity using `ae skills install --tool Antigravity`, `agy plugin install google-cloud-developer`, and `.agents/rules/`.',
  },
  {
    id: 'google-cloud-developer-plugin',
    category: 'Antigravity & Workshop',
    title: 'Google Cloud Developer Plugin (`google/skills`)',
    provider: 'GitHub • google/skills',
    url: 'https://github.com/google/skills/tree/main/plugins/cloud/google-cloud-developer',
    badge: 'Antigravity Plugin',
    description:
      'Official plugin bundle installed via `agy plugin install google-cloud-developer` — provides safe `gcloud` guardrails, IAM/ADC recipes, and live Developer Knowledge MCP grounding.',
  },
  {
    id: 'apac-ai-science-devfest',
    category: 'Antigravity & Workshop',
    title: 'APAC AI for Science DevFest — Event & Program',
    provider: 'GDG AI for Science Australia',
    url: 'https://gdgaiforscience.github.io/devfest-program/#svetlana-meissner',
    badge: 'Workshop Program',
    description:
      'Official APAC AI for Science DevFest program and session page for Svetlana Meissner’s AlphaEvolve on Google Cloud with Antigravity workshop.',
  },
  {
    id: 'companion-github-repo',
    category: 'Antigravity & Workshop',
    title: 'Companion GitHub Repo (`ai-for-science-2026`)',
    provider: 'Svetlana Meissner • BTU Cottbus-Senftenberg',
    url: 'https://github.com/Unisvet/ai-for-science-2026',
    badge: 'Open-Source Kit',
    description:
      'Full interactive workshop deck, zero-leak Spot TPU wrapper (`scripts/run_alphaevolve_spot_tpu.sh`), Codelab Circle Packing visualizer, and `Evo-FedAgg` benchmark.',
  },
];
