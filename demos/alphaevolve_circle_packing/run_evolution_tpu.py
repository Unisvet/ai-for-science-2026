"""
Hybrid JAX TPU (`jax.jit` + `jax.vmap`) + `float64` SciPy `SLSQP`/`linprog` Circle Packing (n=26)
APAC AI for Science DevFest 2026 — Slide 11 Live TPU Demo (Spot v6e-1 & Colab v5e-1)

Architecture (Best of Both Worlds — TPU MXU Global Search + FP64 Exact KKT Polish):
  1. Stage 1 — TPU MXU Global Basin Sweep (`jax.jit(jax.vmap(...))`, `float32`):
     Relaxes 2,048 parallel diverse topological initializations simultaneously on the TPU MXU
     (falling back cleanly to 32 starts on NumPy CPU when JAX is absent).
  2. Stage 2 — Host CPU Exact KKT Polish (`float64` `linprog` + analytic-Jacobian `SLSQP`):
     Polishes the top diverse TPU basins in `float64` to tight contact optimality (~2.63+),
     giving AlphaEvolve a strong hybrid foundation to evolve beyond 2.63586 SOTA.
  3. Slide 11 3-Tier Cascade Gate + Single-Process TPU Ownership:
     - Tier 1 (CPU, ~1 ms): AST syntax & `construct_packing()` contract check -> `-inf` + insight.
     - Tier 2 (CPU, ~5 ms): Strict geometric verification (zero overlap, `[0, 1]^2` bounds).
     - Tier 3 (Persistent TPU process, `parallel_evaluation=False`): Zero `/dev/vfio/0` lock
       contention and zero 5–10s `libtpu` re-init penalties per candidate.

Usage:
  # Fast stage-safe benchmark & 3-Tier Cascade verification (works on TPU or local CPU):
  uv run --project demos python demos/alphaevolve_circle_packing/run_evolution_tpu.py --benchmark-only

  # Live Google Cloud AlphaEvolve loop on Spot v6e-1 TPU (requires ADC + PROJECT_ID + GE_APP_ID):
  python3 -m demos.alphaevolve_circle_packing.run_evolution_tpu --mode live --output-dir ~/alphaevolve_workspace/outputs
"""

from __future__ import annotations

import argparse
import ast
import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

try:
    import jax  # type: ignore[import-not-found]
    import jax.numpy as jnp  # type: ignore[import-not-found]

    HAS_JAX = True
except ImportError:
    jax = None  # type: ignore[assignment]
    jnp = None  # type: ignore[assignment]
    HAS_JAX = False

try:
    from .evaluate import (
        ALPHAEVOLVE_SOTA,
        CIRCLE_PACKING_EVALUATION_METRIC,
        HUMAN_RECORD_2011,
        N_CIRCLES,
        verify_circle_packing,
        visualize_packing,
    )
except ImportError:
    from evaluate import (  # type: ignore[no-redef]
        ALPHAEVOLVE_SOTA,
        CIRCLE_PACKING_EVALUATION_METRIC,
        HUMAN_RECORD_2011,
        N_CIRCLES,
        verify_circle_packing,
        visualize_packing,
    )


# ==============================================================================
# Hybrid JAX TPU + FP64 SLSQP Seed Program (`# EVOLVE-BLOCK-START ... END`)
# ==============================================================================
INITIAL_TPU_PROGRAM_CODE = '''"""
Hybrid JAX TPU + FP64 SciPy SLSQP Seed Program — n=26 Unit-Square Circle Packing
Stage 1: Relaxes 2,048 diverse topological basins in parallel on TPU MXU via `jax.jit(jax.vmap(...))`.
Stage 2: Polishes the top diverse basins in `float64` via `linprog` (HiGHS) + analytic-Jacobian `SLSQP`.
"""
import numpy as np
from scipy.optimize import linprog, minimize

try:
    import jax
    import jax.numpy as jnp
    HAS_JAX = True
except ImportError:
    HAS_JAX = False


# EVOLVE-BLOCK-START
def construct_packing() -> tuple[np.ndarray, np.ndarray]:
    """Hybrid TPU `jax.vmap` global basin sweep + `float64` `linprog`/SLSQP exact KKT polish."""
    n = 26
    iu, ju = np.triu_indices(n, k=1)
    n_pairs = len(iu)

    # 1. Build diverse staggered quasi-hexagonal topological templates
    def make_template(row_counts, transpose=False):
        ys = np.linspace(0.095, 0.905, len(row_counts))
        pts = []
        for r_idx, count in enumerate(row_counts):
            margin = 0.085 if count == 6 else (0.105 if r_idx % 2 == 0 else 0.115)
            for x in np.linspace(margin, 1.0 - margin, count):
                pts.append([float(ys[r_idx]), float(x)] if transpose else [float(x), float(ys[r_idx])])
        return np.array(pts, dtype=np.float32)

    templates = [
        make_template([5, 5, 6, 5, 5], False),
        make_template([5, 6, 5, 5, 5], False),
        make_template([6, 5, 5, 5, 5], False),
        make_template([5, 5, 5, 6, 5], False),
        make_template([5, 5, 6, 5, 5], True),
    ]

    per_template = 400 if HAS_JAX else 6
    rng = np.random.default_rng(2026)
    batches = []
    for tpl in templates:
        noise = rng.normal(0.0, 0.024, size=(per_template, n, 2)).astype(np.float32)
        batches.append(np.clip(tpl[None, :, :] + noise, 0.04, 0.96))
    init_batch = np.concatenate(batches, axis=0)  # (2000, 26, 2) on TPU, (30, 26, 2) on CPU fallback
    steps = 110 if HAS_JAX else 40

    # 2. Stage 1 — TPU MXU Parallel Basin Relaxation (`jax.jit` + `jax.vmap`, `float32`)
    if HAS_JAX:
        def relax_one(c0):
            r0 = jnp.full((n,), 0.102, dtype=jnp.float32)

            def body_fn(step, state):
                c, r = state
                prog = step / float(steps)
                r = r + 0.0012 * (1.0 - 0.7 * prog)

                diff = c[:, None, :] - c[None, :, :]
                dists = jnp.sqrt(jnp.sum(diff * diff, axis=-1) + 1e-12)
                unit = diff / dists[:, :, None]
                dists_nd = dists + jnp.eye(n, dtype=jnp.float32) * 10.0

                overlap = jnp.maximum(0.0, (r[:, None] + r[None, :]) - dists_nd)
                pair_force = jnp.sum(unit * overlap[:, :, None], axis=1)

                wx = jnp.maximum(0.0, r - c[:, 0]) - jnp.maximum(0.0, c[:, 0] + r - 1.0)
                wy = jnp.maximum(0.0, r - c[:, 1]) - jnp.maximum(0.0, c[:, 1] + r - 1.0)
                wall_force = jnp.stack([wx, wy], axis=-1)

                c = jnp.clip(c + 0.40 * (1.0 - 0.65 * prog) * (pair_force + 1.35 * wall_force), 0.02, 0.98)
                wall_ex = (
                    jnp.maximum(0.0, r - c[:, 0])
                    + jnp.maximum(0.0, c[:, 0] + r - 1.0)
                    + jnp.maximum(0.0, r - c[:, 1])
                    + jnp.maximum(0.0, c[:, 1] + r - 1.0)
                )
                r = jnp.maximum(0.02, r - 0.55 * (wall_ex + 0.5 * jnp.sum(overlap, axis=1)))
                return (c, r)

            c_fin, _ = jax.lax.fori_loop(0, steps, body_fn, (c0, r0))
            wall_cap = jnp.minimum(
                jnp.minimum(c_fin[:, 0], 1.0 - c_fin[:, 0]),
                jnp.minimum(c_fin[:, 1], 1.0 - c_fin[:, 1]),
            )
            diff = c_fin[:, None, :] - c_fin[None, :, :]
            dists = jnp.sqrt(jnp.sum(diff * diff, axis=-1) + 1e-12) + jnp.eye(n, dtype=jnp.float32) * 10.0
            approx_r = jnp.minimum(wall_cap, 0.5 * jnp.min(dists, axis=1))
            return c_fin, jnp.sum(approx_r)

        c_batch, scores = jax.jit(jax.vmap(relax_one))(jnp.asarray(init_batch))
        c_batch.block_until_ready()
        c_batch_np = np.asarray(c_batch, dtype=np.float64)
        scores_np = np.asarray(scores, dtype=np.float64)
    else:
        c_batch_np = init_batch.astype(np.float64)
        scores_np = np.zeros(len(c_batch_np), dtype=np.float64)
        for idx in range(len(c_batch_np)):
            c = c_batch_np[idx]
            r = np.full(n, 0.102, dtype=np.float64)
            for step in range(steps):
                prog = step / float(steps)
                r += 0.0012 * (1.0 - 0.7 * prog)
                diff = c[:, None, :] - c[None, :, :]
                dists = np.sqrt(np.sum(diff * diff, axis=-1) + 1e-12)
                unit = diff / dists[:, :, None]
                np.fill_diagonal(dists, 10.0)
                overlap = np.maximum(0.0, (r[:, None] + r[None, :]) - dists)
                pair_force = np.sum(unit * overlap[:, :, None], axis=1)
                wall_force = np.zeros_like(c)
                wall_force[:, 0] = np.maximum(0.0, r - c[:, 0]) - np.maximum(0.0, c[:, 0] + r - 1.0)
                wall_force[:, 1] = np.maximum(0.0, r - c[:, 1]) - np.maximum(0.0, c[:, 1] + r - 1.0)
                c = np.clip(c + 0.38 * (1.0 - 0.65 * prog) * (pair_force + 1.35 * wall_force), 0.02, 0.98)
            c_batch_np[idx] = c
            wall_cap = np.minimum(np.minimum(c[:, 0], 1.0 - c[:, 0]), np.minimum(c[:, 1], 1.0 - c[:, 1]))
            diff = c[:, None, :] - c[None, :, :]
            dists = np.sqrt(np.sum(diff * diff, axis=-1) + 1e-12)
            np.fill_diagonal(dists, 10.0)
            scores_np[idx] = float(np.sum(np.minimum(wall_cap, 0.5 * np.min(dists, axis=1))))

    # Pick the best candidate from each topological template (ensures diversity for FP64 polish)
    top_indices = []
    for t_idx in range(len(templates)):
        start = t_idx * per_template
        end = start + per_template
        top_indices.append(start + int(np.argmax(scores_np[start:end])))

    # 3. Stage 2 — Host CPU Exact FP64 Polish (`linprog` HiGHS + Analytic-Jacobian `SLSQP`)
    A_ub = np.zeros((n_pairs, n), dtype=np.float64)
    A_ub[np.arange(n_pairs), iu] = 1.0
    A_ub[np.arange(n_pairs), ju] = 1.0
    c_lp = -np.ones(n, dtype=np.float64)

    def solve_exact_radii_lp(centers: np.ndarray, margin: float = 1e-12) -> np.ndarray:
        dists = np.linalg.norm(centers[iu] - centers[ju], axis=1)
        b_ub = np.maximum(0.0, dists - margin)
        wall = np.minimum(
            np.minimum(centers[:, 0], 1.0 - centers[:, 0]),
            np.minimum(centers[:, 1], 1.0 - centers[:, 1]),
        )
        bounds = [(0.0, float(max(0.0, w - margin))) for w in wall]
        res = linprog(c_lp, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")
        if res.success and res.x is not None:
            return np.maximum(0.0, res.x)
        return np.zeros(n, dtype=np.float64)

    obj_grad = np.zeros(3 * n, dtype=np.float64)
    obj_grad[2 * n :] = -1.0
    total_cons = 4 * n + n_pairs
    base_jac = np.zeros((total_cons, 3 * n), dtype=np.float64)
    ar_n = np.arange(n)
    base_jac[ar_n, ar_n] = 1.0
    base_jac[ar_n, 2 * n + ar_n] = -1.0
    base_jac[n + ar_n, ar_n] = -1.0
    base_jac[n + ar_n, 2 * n + ar_n] = -1.0
    base_jac[2 * n + ar_n, n + ar_n] = 1.0
    base_jac[2 * n + ar_n, 2 * n + ar_n] = -1.0
    base_jac[3 * n + ar_n, n + ar_n] = -1.0
    base_jac[3 * n + ar_n, 2 * n + ar_n] = -1.0
    pair_rows = 4 * n + np.arange(n_pairs)
    base_jac[pair_rows, 2 * n + iu] = -1.0
    base_jac[pair_rows, 2 * n + ju] = -1.0

    def cons_fun(z):
        x, y, r = z[:n], z[n : 2 * n], z[2 * n :]
        dists = np.sqrt((x[iu] - x[ju]) ** 2 + (y[iu] - y[ju]) ** 2 + 1e-18)
        out = np.empty(total_cons, dtype=np.float64)
        out[:n] = x - r
        out[n : 2 * n] = 1.0 - x - r
        out[2 * n : 3 * n] = y - r
        out[3 * n : 4 * n] = 1.0 - y - r
        out[4 * n :] = dists - r[iu] - r[ju]
        return out

    def cons_jac(z):
        jac = base_jac.copy()
        x, y = z[:n], z[n : 2 * n]
        dx, dy = x[iu] - x[ju], y[iu] - y[ju]
        dists = np.maximum(np.sqrt(dx * dx + dy * dy), 1e-12)
        ux, uy = dx / dists, dy / dists
        jac[pair_rows, iu] = ux
        jac[pair_rows, ju] = -ux
        jac[pair_rows, n + iu] = uy
        jac[pair_rows, n + ju] = -uy
        return jac

    bounds_slsqp = [(0.002, 0.998)] * (2 * n) + [(0.0, 0.35)] * n
    best_c, best_r, best_sum = None, None, -1.0

    for idx in top_indices:
        c0 = c_batch_np[idx]
        r0 = solve_exact_radii_lp(c0)
        z0 = np.concatenate([c0[:, 0], c0[:, 1], r0])
        res = minimize(
            lambda z: -float(np.sum(z[2 * n :])),
            z0,
            method="SLSQP",
            jac=lambda _z: obj_grad,
            bounds=bounds_slsqp,
            constraints={"type": "ineq", "fun": cons_fun, "jac": cons_jac},
            options={"maxiter": 180, "ftol": 1e-10, "disp": False},
        )
        c_opt = np.clip(np.column_stack([res.x[:n], res.x[n : 2 * n]]), 1e-6, 1.0 - 1e-6)
        r_opt = solve_exact_radii_lp(c_opt, margin=1e-11)
        s = float(np.sum(r_opt))
        if s > best_sum:
            best_sum = s
            best_c, best_r = c_opt, r_opt

    assert best_c is not None and best_r is not None
    return best_c, best_r
# EVOLVE-BLOCK-END
'''

BROKEN_CANDIDATE_FOR_GATE_TEST = """
import numpy as np
def construct_packing():
    # Deliberate shape bug to verify Slide 11 Tier-1/2 Gate catches errors before wasting TPU time!
    return np.zeros((10, 2)), np.ones(10) * 0.1
"""


def detect_tpu_runtime() -> dict[str, Any]:
    """Detects live JAX TPU, GPU, or CPU fallback."""
    if HAS_JAX and jax is not None:
        devs = jax.devices()
        platform = devs[0].platform.upper()
        return {
            "backend": f"JAX ({platform})",
            "platform": platform,
            "device_count": len(devs),
            "devices": [str(d) for d in devs],
            "is_tpu": platform == "TPU",
        }
    return {
        "backend": "NumPy CPU Fallback (JAX not installed)",
        "platform": "CPU",
        "device_count": 1,
        "devices": ["cpu:0"],
        "is_tpu": False,
    }


def evaluate_candidate_three_tier_tpu(program: dict[str, Any] | str) -> dict[str, Any]:
    """
    Slide 11 3-Tier Cascade Evaluator for AlphaEvolve on a single-chip TPU (`v5e-1` / `v6e-1`).
      Tier 1: AST & entrypoint validation (CPU, ~1 ms)
      Tier 2: Execution inside persistent TPU process (no libtpu lock contention!)
      Tier 3: Strict geometric verification + TPU latency insight
    """
    if isinstance(program, dict):
        try:
            source_code = program["content"]["files"][0]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            return _format_ae_result(-1e12, f"Tier 1 failed: malformed program payload: {exc}", "tier1_error")
    else:
        source_code = program

    # Tier 1: Static AST & Syntax Validation (never touches TPU MXU!)
    try:
        tree = ast.parse(source_code)
    except SyntaxError as exc:
        return _format_ae_result(
            -1e12,
            f"Tier 1 AST SyntaxError at line {exc.lineno}: {exc.msg}. Fix syntax before TPU dispatch.",
            "tier1_ast",
        )

    fn_names = {node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)}
    if "construct_packing" not in fn_names:
        return _format_ae_result(
            -1e12,
            "Tier 1 Contract Error: missing `def construct_packing()` entrypoint.",
            "tier1_contract",
        )

    # Tier 2 & 3: Persistent TPU Execution + Strict Geometric Verification
    ns: dict[str, Any] = {"np": np}
    if HAS_JAX:
        ns["jax"] = jax
        ns["jnp"] = jnp

    t0 = time.perf_counter()
    try:
        exec(compile(source_code, "<alphaevolve_tpu_candidate>", "exec"), ns)
        result = ns["construct_packing"]()
        if not isinstance(result, tuple) or len(result) < 2:
            return _format_ae_result(
                -1e12,
                "Tier 2 Contract Error: `construct_packing()` must return `(centers, radii)`.",
                "tier2_contract",
            )
        centers, radii = np.asarray(result[0], dtype=np.float64), np.asarray(result[1], dtype=np.float64)
    except Exception as exc:
        eval_ms = (time.perf_counter() - t0) * 1000.0
        return _format_ae_result(
            -1e12,
            f"Tier 2 Runtime Exception after {eval_ms:.1f} ms: {type(exc).__name__}: {exc}",
            "tier2_runtime",
        )

    eval_ms = (time.perf_counter() - t0) * 1000.0
    verdict = verify_circle_packing(centers, radii)
    if not verdict["valid"]:
        return _format_ae_result(
            -1e12,
            f"Tier 2 Geometric Rejection ({eval_ms:.1f} ms): {verdict['insight']}",
            "tier2_geometry",
        )

    runtime_info = detect_tpu_runtime()
    insight = (
        f"Tier 3 PASS on {runtime_info['backend']} in {eval_ms:.1f} ms | "
        f"{verdict['insight']}"
    )
    return _format_ae_result(float(verdict["score"]), insight, "tier3_tpu_pass", extra={
        "eval_ms": round(eval_ms, 2),
        "area_coverage_pct": verdict["area_coverage_pct"],
        "centers": centers,
        "radii": radii,
    })


def _format_ae_result(
    score: float,
    insight_text: str,
    stage: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "scores": {
            "scores": [{"metric": CIRCLE_PACKING_EVALUATION_METRIC, "score": score}]
        },
        "insights": {
            "insights": [{"label": stage, "text": insight_text}]
        },
    }
    if extra is not None:
        payload["_meta"] = extra
    return payload


def run_benchmark_only(output_dir: Path) -> None:
    """Runs the 3-Tier Cascade Gate test + live Hybrid JAX TPU + FP64 SLSQP seed benchmark."""
    runtime = detect_tpu_runtime()
    print("=" * 84)
    print(" Slide 11 Demo: Hybrid TPU (`jax.vmap`) + FP64 `SLSQP`/`linprog` Circle Packing (n=26)")
    print(f" Active Runtime : {runtime['backend']} | Devices: {runtime['devices']}")
    print("=" * 84)

    broken_res = evaluate_candidate_three_tier_tpu(BROKEN_CANDIDATE_FOR_GATE_TEST)
    print(f"\n[Gate Test — Broken Candidate] score={broken_res['scores']['scores'][0]['score']}")
    print(f"  Insight: {broken_res['insights']['insights'][0]['text']}")

    print("\n[Tier 3 — Hybrid TPU Seed] Running global sweep + FP64 KKT polish...")
    res1 = evaluate_candidate_three_tier_tpu(INITIAL_TPU_PROGRAM_CODE)
    meta1 = res1.get("_meta", {})
    score1 = res1["scores"]["scores"][0]["score"]
    print(f"  Run 1 (cold): score={score1:.5f} | {res1['insights']['insights'][0]['text']}")

    res2 = evaluate_candidate_three_tier_tpu(INITIAL_TPU_PROGRAM_CODE)
    score2 = res2["scores"]["scores"][0]["score"]
    print(f"  Run 2 (warm): score={score2:.5f} | {res2['insights']['insights'][0]['text']}")

    output_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        "mode": "benchmark_only",
        "timestamp_utc": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
        "runtime": runtime,
        "broken_gate_insight": broken_res["insights"]["insights"][0]["text"],
        "seed_score": score2,
        "seed_area_coverage_pct": meta1.get("area_coverage_pct"),
        "seed_eval_ms_cold": meta1.get("eval_ms"),
        "seed_eval_ms_warm": res2.get("_meta", {}).get("eval_ms"),
    }
    (output_dir / "tpu_benchmark_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    if "centers" in meta1 and "radii" in meta1:
        circles = list(zip(meta1["centers"][:, 0], meta1["centers"][:, 1], meta1["radii"]))
        visualize_packing(
            circles,
            title=f"Hybrid TPU+FP64 Seed ({runtime['backend']}) | sum_of_radii={score2:.5f}",
            save_path=output_dir / "tpu_seed_packing.png",
            show=False,
        )
    print(f"\n[OK] Saved benchmark artifacts -> {output_dir}")


def run_live_evolution_tpu(output_dir: Path) -> None:
    """Runs the live Google Cloud AlphaEvolve loop with the persistent single-process TPU evaluator."""
    try:
        from alpha_evolve.client import AlphaEvolveClient  # type: ignore[import-not-found]
        from alpha_evolve.controller import run_controller_loop  # type: ignore[import-not-found]
        from alpha_evolve.experiment import AlphaEvolveExperiment  # type: ignore[import-not-found]
        from alpha_evolve.visualization import get_score  # type: ignore[import-not-found]
    except ImportError as exc:
        raise ImportError(
            "The `alpha_evolve` SDK is required for `--mode live`. "
            "Install it via: pip install git+https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud.git"
        ) from exc

    runtime = detect_tpu_runtime()
    project_id = os.getenv("PROJECT_ID", "")
    ge_app_id = os.getenv("GE_APP_ID", "")
    if not project_id or not ge_app_id:
        raise ValueError("Set PROJECT_ID and GE_APP_ID in .env or environment before running `--mode live`.")

    max_gen = int(os.getenv("MAX_PROGRAMS_GENERATED", "20"))
    max_eval = int(os.getenv("MAX_PROGRAMS_EVALUATED", str(max_gen)))
    concurrency = int(os.getenv("CONCURRENCY", "4"))
    idle_timeout_s = int(os.getenv("IDLE_TIMEOUT_S", "300"))
    model_1 = os.getenv("MODEL_1", "gemini-4-argon").strip()
    model_2 = os.getenv("MODEL_2", "").strip()
    w1 = float(os.getenv("MODEL_1_WEIGHT", "1.0"))
    w2 = float(os.getenv("MODEL_2_WEIGHT", "0.0"))

    generation_context = (
        f"Hardware: {runtime['backend']} ({runtime['devices']}) + Host CPU. "
        "Libraries: `jax`, `jax.numpy`, `jax.jit`, `jax.vmap`, `jax.lax.fori_loop`, `numpy`, "
        "`scipy.optimize` (`minimize` SLSQP, `linprog` HiGHS). "
        "CRITICAL HYBRID STRATEGY to surpass 2.63586 SOTA: "
        "(1) Use TPU MXU (`jax.jit(jax.vmap(...))` in float32) to sweep thousands of diverse topological "
        "basins (staggered rows, asymmetric defects, rotated/perturbed lattices) in milliseconds; "
        "(2) Polish the top distinct basins on host CPU in float64 using `linprog(method='highs')` + "
        "analytic-Jacobian `SLSQP` (`ftol=1e-12`) + local basin-hopping perturbations; "
        "(3) Never mutate JAX arrays in place inside `jit` (use `.at[...].set(...)`), and keep total runtime < 18s."
    )

    def ae_callback(program: dict[str, Any] | str) -> dict[str, Any]:
        res = evaluate_candidate_three_tier_tpu(program)
        return {"scores": res["scores"], "insights": res["insights"]}

    client = AlphaEvolveClient(
        project_id=project_id,
        location=os.getenv("LOCATION", "global"),
        collection=os.getenv("COLLECTION", "default_collection"),
        engine=ge_app_id,
        assistant=os.getenv("ASSISTANT", "default_assistant"),
        base_url=os.getenv("BASE_URL", "discoveryengine.googleapis.com"),
    )

    # IMPORTANT: parallel_evaluation=False prevents multi-process /dev/vfio/0 lock collisions on 1-chip TPUs!
    experiment = AlphaEvolveExperiment(
        client,
        ae_callback,
        max_eval,
        parallel_evaluation=False,
    )

    models = [{"name": m, "weight": round(w, 2)} for m, w in ((model_1, w1), (model_2, w2)) if m]
    exp_config: dict[str, Any] = {
        "title": f"Hybrid TPU+FP64 Circle Packing n=26 ({runtime['backend']})",
        "problem_description": (
            "Evolve a hybrid JAX TPU + float64 SLSQP/linprog constructor to pack n=26 disjoint circles "
            "into [0, 1]^2, maximizing sum_of_radii beyond 2.63586."
        ),
        "program_language": "python",
        "run_settings": {"max_programs": max_gen, "concurrency": concurrency},
        "generation_settings": {"context": generation_context},
    }
    if models:
        exp_config["generation_settings"]["models"] = models

    print(f"[TPU AlphaEvolve] Creating hybrid experiment on {runtime['backend']} (budget={max_gen})...")
    experiment.create_experiment(exp_config)

    initial_eval = ae_callback(INITIAL_TPU_PROGRAM_CODE)
    experiment.create_initial_program(
        {
            "content": {"files": [{"path": "program.py", "content": INITIAL_TPU_PROGRAM_CODE}]},
            "evaluation": initial_eval,
        }
    )
    experiment.start_experiment()

    t_loop = time.perf_counter()
    asyncio.run(run_controller_loop(experiment, idle_timeout_s=idle_timeout_s))
    loop_s = round(time.perf_counter() - t_loop, 2)

    output_dir.mkdir(parents=True, exist_ok=True)
    response = experiment.list_programs(params={"order_by": f"{CIRCLE_PACKING_EVALUATION_METRIC} asc"})
    programs = response.get("alphaEvolvePrograms", []) if response else []
    programs.sort(key=lambda p: get_score(p, CIRCLE_PACKING_EVALUATION_METRIC), reverse=True)

    print("\n--- Candidate Leaderboard ---")
    best_score = None
    leaderboard = []
    for idx, prog in enumerate(programs):
        sc = get_score(prog, CIRCLE_PACKING_EVALUATION_METRIC)
        pid = prog.get("name", "unknown").rsplit("/", 1)[-1]
        valid = bool(np.isfinite(sc) and sc > -1e11)
        leaderboard.append({"rank": idx + 1, "program_id": pid, "score": float(sc) if valid else None})
        if idx < 10:
            print(f"  Rank {idx + 1:2d} | {pid[-8:]} | score = {f'{sc:.5f}' if valid else '-inf (rejected)'}")
        if not valid:
            continue
        code = prog["content"]["files"][0]["content"]
        if best_score is None:
            best_score = float(sc)
            (output_dir / "program_evolved_tpu.py").write_text(code, encoding="utf-8")
            print(f"[OK] Best evolved TPU program (score={best_score:.5f}) -> {output_dir / 'program_evolved_tpu.py'}")
        if idx == 0:
            eval_res = evaluate_candidate_three_tier_tpu(code)
            meta = eval_res.get("_meta", {})
            if "centers" in meta and "radii" in meta:
                circles = list(zip(meta["centers"][:, 0], meta["centers"][:, 1], meta["radii"]))
                visualize_packing(
                    circles,
                    title=f"Best Hybrid TPU Evolved | sum_of_radii={best_score:.5f}",
                    save_path=output_dir / "rank_1_tpu_packing.png",
                    show=False,
                )

    summary = {
        "mode": "live_tpu_hybrid",
        "timestamp_utc": datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S"),
        "runtime": runtime,
        "models": models,
        "max_programs": max_gen,
        "loop_duration_s": loop_s,
        "best_score": best_score,
        "human_record_2011": HUMAN_RECORD_2011,
        "alphaevolve_sota": ALPHAEVOLVE_SOTA,
        "leaderboard": leaderboard,
    }
    (output_dir / "results_tpu.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"[OK] Saved TPU evolution summary -> {output_dir / 'results_tpu.json'}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(description="Hybrid JAX TPU + FP64 SLSQP Circle Packing Runner")
    parser.add_argument(
        "--mode",
        choices=["benchmark", "live"],
        default=os.getenv("DEMO_EXECUTION_MODE", "benchmark") if os.getenv("DEMO_EXECUTION_MODE") == "live" else "benchmark",
        help="`benchmark` runs the 3-Tier Gate + Hybrid TPU seed; `live` runs Discovery Engine AlphaEvolve.",
    )
    parser.add_argument("--benchmark-only", action="store_true", help="Alias for --mode benchmark")
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).parent / "outputs_tpu"),
        help="Directory for JSON summaries, evolved code, and PNG plots.",
    )
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    if args.benchmark_only or args.mode == "benchmark":
        run_benchmark_only(out_dir)
    else:
        run_live_evolution_tpu(out_dir)


if __name__ == "__main__":
    main()
