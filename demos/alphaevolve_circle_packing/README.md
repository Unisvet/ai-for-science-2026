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

## 3. Run on a Spot Cloud TPU (Compare Local CPU vs. Cloud TPU)

Use the zero-leak Spot TPU wrapper [run_alphaevolve_spot_tpu.sh](../../scripts/run_alphaevolve_spot_tpu.sh) (in **Git Bash** or **WSL** on Windows) to provision an ephemeral Trillium `v6e-1` Spot TPU, run the experiment, copy outputs back to `./local_outputs`, and automatically delete the TPU VM via `trap`:

1. Set your TPU settings in `.env` (defaults shown):
   ```env
   GCP_TPU_ZONE=europe-west4-a   # Or asia-northeast1-b (APAC), us-east5-b (US)
   GCP_TPU_TYPE=v6e-1
   GCP_TPU_VERSION=v2-alpha-tpuv6e
   ```
2. Launch from the **repo root**:
   ```bash
   # Run the circle packing evolution loop on the Spot TPU VM:
   bash scripts/run_alphaevolve_spot_tpu.sh ./demos ./local_outputs "python3 -m demos.alphaevolve_circle_packing.run_evolution"

   # Or run the JAX / TorchTPU 3-tier evaluator benchmark (default):
   bash scripts/run_alphaevolve_spot_tpu.sh ./demos ./local_outputs
   ```
3. **Compare Local CPU vs. Cloud TPU:** Run Step 2 locally and Step 3 on the Spot TPU with the same `MAX_PROGRAMS_EVALUATED` in `.env`, then compare evaluation throughput and latency per candidate.

## 4. Fast Stage Time-Lapse (~1 second)

To verify 4 evolutionary checkpoints (`Gen 0 → Gen 5 → Gen 16 → Gen 40 = 2.6307`) with ANSI bar charts & Braille 2D plots in your terminal:

```powershell
uv run --project demos python demos/01_circle_packing_codelab_demo.py
```
