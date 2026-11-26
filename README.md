# 🧬 AlphaEvolve on Google Cloud with Antigravity — APAC AI for Science DevFest 2026

> **APAC AI for Science DevFest** ([Event Page](https://gdg.community.dev/events/details/google-gdg-ai-for-science-australia-presents-apac-ai-for-science-devfest/) • [Program & Speaker](https://gdgaiforscience.github.io/devfest-program/#svetlana-meissner))  
> **Core Workshop Lab:** [Get started with AlphaEvolve on Google Cloud (`alphaevolve-on-google-cloud-1`)](https://codelabs.developers.google.com/alphaevolve-on-google-cloud-1?hl=en#0) — running all examples with **Google Antigravity**

Humans shaped science through **conversation** (*Homo Loquens*) and **tools** (*Homo Faber*). In this hands-on workshop we run **AlphaEvolve on Google Cloud** directly inside **Google Antigravity** — mutating `# EVOLVE-BLOCK-START` algorithms, verifying results deterministically (`n=26` Circle Packing, TSP, and IEEE CCNC 2027 `Evo-FedAgg`), and scaling evaluations to **Google Cloud TPUs** (`JAX` / `TorchTPU`).

---

## 📂 Project Architecture

```text
ai-for-science-2026/
├── web/                                       # Unified Interactive 13-Slide Deck, Demos Lab, Video Hub & PDF
│   ├── src/
│   │   ├── components/                        # React 19 + TypeScript + Tailwind + 2D/3D Visualizers + Audio
│   │   └── data/
│   │       ├── circle_packing_n26.json        # Verified n=26 Circle Packing coordinates (0 overlaps!)
│   │       └── evofedagg_ccnc2027.json        # IEEE CCNC 2027 Evo-FedAgg evolutionary trajectory
│   ├── public/
│   │   ├── media/                             # Bespoke 16:9 widescreen slide illustrations
│   │   └── audio/                             # Optional custom ambient transition stems
│   └── .env.example                           # Optional browser live API config template
├── demos/                                     # Runnable Python Scripts (`uv run --with numpy ...`)
│   ├── 01_circle_packing_codelab_demo.py      # Visual n=26 Circle Packing (`# EVOLVE-BLOCK-START`, +174.6%)
│   ├── 02_ccnc2027_evofedagg_demo.py          # IEEE CCNC 2027 Evo-FedAgg trajectory & BLAS speedup benchmark
│   ├── 03_jax_torchtpu_evaluator_demo.py      # 3-Tier JAX (`vmap`) / `TorchTPU` (`.to("tpu")`) evaluator
│   └── alphaevolve_circle_packing/            # Codelab-style `program.py` + `evaluate.py` + `run_evolution.py`
├── scripts/
│   └── run_alphaevolve_spot_tpu.sh            # Self-cleaning `trap` Spot TPU (`v6e-1`) execution wrapper
└── .env.example                               # Clean attendee & speaker GCP / AlphaEvolve / TPU template
```

---

## 🚀 Quickstart (Zero Credentials Required Out of the Box!)

### 1. Launch the Unified Interactive Presentation & Demos Site (`web/`)

```bash
cd web
npm install
npm run dev
```

- **Keyboard Shortcuts in Deck Mode:** `→` / `Space` (Next), `←` (Prev), `I` (Toggle Illustration / Interactive View), `O` (Overview Grid), `M` (Harmonic Web Audio Transition Chimes), `C` (Cinema Mode), `F` (Fullscreen), `P` (16:9 Organizer PDF Export).
- **Exporting the 13-Slide Organizer PDF Backup:** Click **`Organizer PDF`** in the top bar → **`Save as 16:9 PDF`** (*Background graphics: Enabled*, *Margins: None*).

### 2. Run the Python Companion Demos (`demos/`)

```bash
uv run --with numpy python demos/01_circle_packing_codelab_demo.py
uv run --with numpy python demos/02_ccnc2027_evofedagg_demo.py
uv run --with numpy python demos/03_jax_torchtpu_evaluator_demo.py
```

### 3. Install Antigravity AlphaEvolve & Cloud TPU Skills

```bash
agy plugin install google-cloud-developer
uv tool install "git+https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud.git#subdirectory=skills"
ae skills install --tool Antigravity
```

---

## 🔗 Core Codelab, TPU & Research References

- **Official Codelab:** [Get started with AlphaEvolve on Google Cloud (`n=26` Circle Packing & TSP)](https://codelabs.developers.google.com/alphaevolve-on-google-cloud-1?hl=en#0)
- **Official Developer Guide:** [AlphaEvolve Developer Guide Overview (Gemini Enterprise on Google Cloud)](https://docs.cloud.google.com/gemini/enterprise/docs/alphaevolve/developer-guide/overview) — architecture, use-case qualification, evaluator & scoring patterns, reward-hacking prevention, concurrency, and HPC scaling
- **AlphaEvolve Blueprints (HPC Infrastructure):** [`GoogleCloudPlatform/hpc-solutions/blueprints/alphaevolve`](https://github.com/GoogleCloudPlatform/hpc-solutions/tree/main/blueprints/alphaevolve) — declarative blueprints for deploying and managing scalable Google Cloud infrastructure for AlphaEvolve evolutionary code optimization experiments
- **Official Google Cloud AI Repo:** [`Google-Cloud-AI/alphaevolve-on-googlecloud`](https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud)
- **Google Cloud Tech Keynote:** [The Future of AI Infrastructure (Ironwood TPU v7, Bifurcated TPU-8t/8i & AI Hypercomputer)](https://www.youtube.com/live/pabDkNR7jIs)
- **Research Case Study:** S. Meissner & P. Langendoerfer, *"Automated Evolutionary Discovery of Byzantine-Resilient Aggregators for Edge-Cloud FL"* (**Evo-FedAgg**, [IEEE CCNC 2027](https://ccnc2027.ieee-ccnc.org/) — DOI will be obtained after the conference)
