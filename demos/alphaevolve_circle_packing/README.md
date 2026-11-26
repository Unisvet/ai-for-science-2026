# AlphaEvolve Cloud Experiment Starter — `n = 26` Circle Packing

This folder contains the **exact two files** you author to launch a real **Google Cloud AlphaEvolve (`ae`)** discovery experiment:

1. **`program.py`** — Naive Gen 0 concentric-ring seed (`sum_of_radii = 0.9598`) wrapped in `# EVOLVE-BLOCK-START ... # EVOLVE-BLOCK-END`.
2. **`evaluate.py`** — Strict deterministic geometric verifier (`verify_circle_packing`) checking zero overlaps and `[0, 1]^2` containment, returning `sum_of_radii` or `-inf` + an actionable error insight.

## 1. Verify the Seed Locally (< 1 second)

```powershell
uv run --project demos python demos/alphaevolve_circle_packing/evaluate.py
```

Expected output: `"valid": true, "score": 0.9598`.

## 2. Run the Official Cloud Evolution Loop (`run_evolution.py`)

Run from the **repo root** (after setting `PROJECT_ID`, `GE_APP_ID`, `MODEL_1`, `MODEL_2`, `MAX_PROGRAMS_GENERATED`, and `MAX_PROGRAMS_EVALUATED` in `.env`):

```powershell
uv run --project demos python -m demos.alphaevolve_circle_packing.run_evolution
```

- **Cloud LLM Mutation (`acquire_programs`):** Google Cloud Discovery Engine mutates *only* inside `# EVOLVE-BLOCK-START ... # EVOLVE-BLOCK-END` using your configured Gemini model mixture (`MODEL_1`, `MODEL_2`).
  - **Verified Working Models on AlphaEvolve Discovery Engine:** `gemini-4-argon` (default when `MODEL_1`/`MODEL_2` are left blank) and `gemini-4-hydrogen` (e.g., `MODEL_1=gemini-4-hydrogen` + `MODEL_2=gemini-4-argon`, or single-model `weight=1.0`).
- **User-Controlled Evaluation (`submit_program_evaluations`):** `run_controller_loop` pulls candidates, runs `evaluate.py`, and submits numeric scores + textual failure insights back to the MAP-Elites islands.
- **Automatic Outputs (`outputs/`, gitignored):** Every live run saves `outputs/program_evolved.py` (best candidate), `outputs/results.json` (runtime, loop duration, per-candidate eval latency, and ranked leaderboard), and `outputs/rank_1_packing.png` … `rank_3_packing.png`. A sanitized reference copy is included in **`example_outputs/`** so you can inspect and diff `program.py` vs. `example_outputs/program_evolved.py` without running a cloud job first.
- **Typical Cloud Discovery Time:** ~3–6 minutes for 10 candidates (reaching `2.634–2.636` live!), or ~15–30 minutes over 30–60+ candidates to push beyond AlphaEvolve's `2.63586` SOTA.

### Tuning & Improvement Levers

To push `best_score` higher and reduce wall-clock latency:
1. **Model Mixture (`gemini-4-hydrogen` + `gemini-4-argon`):** Combine fast exploration (`gemini-4-hydrogen`, e.g. `0.7`) with deep reasoning (`gemini-4-argon`, e.g. `0.3`).
2. **Evolution Budget & Concurrency:** Increase `MAX_PROGRAMS_GENERATED` / `MAX_PROGRAMS_EVALUATED` from `10` → `30–60`, enable `PARALLEL_EVALUATION=True` (`WORKER_CONCURRENCY=4`), and keep `IDLE_TIMEOUT_S=300`.
3. **Domain Context (`generation_settings.context`):** Inform the model that `numpy` and `scipy.optimize` (`SLSQP`, `linprog`) are available and that multi-start staggered hexagonal initialization + alternating center/radius optimization works well for `n=26`.
4. **Richer Evaluator Insights (`evaluate.py`):** Feed back tightest circle pair, boundary slack, and per-candidate runtime so subsequent generations target geometric bottlenecks and avoid slow optimizers.
5. **Per-Candidate Eval Timeout:** Cap slow SciPy runs (e.g., 15–20s) so a single candidate never stalls the worker pool.

## 3. Run on a Cloud TPU (Slide 11 — Colab Free `v5e-1` or Spot `v6e-1` VM)

Because `program.py` uses NumPy/SciPy (CPU-only), we also provide a **JAX TPU (`jax.jit` + `jax.vmap`) + 3-Tier Cascade Gate** implementation that genuinely accelerates `n=26` circle packing on TPU MXUs (relaxing 512+ parallel initializations simultaneously in a single persistent TPU process to avoid single-chip `libtpu` lock contention).

### Option A: Google Colab Notebook with Free `v5e-1` TPU *(Recommended for Live Stage Demo)*

Open [circle_packing_tpu_colab.ipynb](./circle_packing_tpu_colab.ipynb) in Google Colab:
1. Select **Runtime → Change runtime type → `v5e-1` TPU** (\$0, ~20 s startup, `jax[tpu]` preinstalled).
2. Add `PROJECT_ID` and `GE_APP_ID` in **Colab Secrets** (left sidebar key icon) so credentials never appear on screen.
3. Run all cells to:
   - Verify `[TpuDevice(id=0, ...)]` and benchmark CPU vs. `jax.vmap` TPU throughput,
   - Watch the **Slide 11 3-Tier Cascade Gate** catch a broken candidate in ~1 ms without touching the TPU,
   - Authenticate keylessly via Colab ADC (`google.colab.auth.authenticate_user`) and run the live AlphaEvolve loop with inline `matplotlib` plots!

### Option B: Ephemeral Spot `v6e-1` Trillium TPU VM (`scripts/run_alphaevolve_spot_tpu.sh`)

Use the zero-leak Spot TPU wrapper [run_alphaevolve_spot_tpu.sh](../../scripts/run_alphaevolve_spot_tpu.sh) (in **Git Bash** or **WSL** on Windows) to provision an ephemeral Trillium `v6e-1` Spot TPU with `cloud-platform` API scopes, auto-bootstrap `jax[tpu]` + `alpha_evolve`, run the experiment, copy outputs back to `./local_outputs`, and automatically delete the TPU VM via `trap`:

1. Set your TPU settings in `.env` (defaults shown):
   ```env
   GCP_TPU_ZONE=europe-west4-a   # Or asia-northeast1-b (APAC), us-east5-b (US)
   GCP_TPU_TYPE=v6e-1
   GCP_TPU_VERSION=v2-alpha-tpuv6e
   GCP_TPU_BOOTSTRAP=true
   ```
2. Launch from the **repo root**:
   ```bash
   # Fast Slide 11 JAX TPU benchmark & 3-Tier Gate verification on Spot v6e-1 (~10s after bootstrap):
   bash scripts/run_alphaevolve_spot_tpu.sh ./demos ./local_outputs "python3 demos/alphaevolve_circle_packing/run_evolution_tpu.py --mode benchmark --output-dir ~/alphaevolve_workspace/outputs"

   # Full live Cloud AlphaEvolve loop on Spot v6e-1 TPU:
   bash scripts/run_alphaevolve_spot_tpu.sh ./demos ./local_outputs "python3 demos/alphaevolve_circle_packing/run_evolution_tpu.py --mode live --output-dir ~/alphaevolve_workspace/outputs"

   # Or run the JAX / TorchTPU 3-tier evaluator demo (default):
   bash scripts/run_alphaevolve_spot_tpu.sh ./demos ./local_outputs
   ```
3. **Compare Local CPU vs. Cloud TPU:** Run `--mode benchmark` locally and on the Spot TPU (or Colab `v5e-1`) to compare `jax.vmap` throughput and per-candidate latency.

## 4. Fast Stage Time-Lapse (~1 second)

To verify 4 evolutionary checkpoints (`Gen 0 → Gen 5 → Gen 16 → Gen 40 = 2.6307`) with ANSI bar charts & Braille 2D plots in your terminal:

```powershell
uv run --project demos python demos/01_circle_packing_codelab_demo.py
```
