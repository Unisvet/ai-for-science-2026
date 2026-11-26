"""
Deterministic Verifier (`evaluate.py`) for Google Cloud AlphaEvolve (`ae` CLI)
n=26 Unit-Square Circle Packing — APAC AI for Science DevFest 2026

Runs inside YOUR secure environment (laptop, Cloud Batch, or Spot TPU).
Returns a numeric fitness score (`sum_of_radii`) for valid zero-overlap packings, or
`-inf` plus an actionable diagnostic `insight` string so AlphaEvolve self-repairs
broken candidates on the next generation.

Usage:
    uv run --project demos python demos/alphaevolve_circle_packing/evaluate.py
"""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
import numpy as np

N_CIRCLES = 26
HUMAN_RECORD_2011 = 2.6340   # David Cantrell (2011), held for 14 years
ALPHAEVOLVE_SOTA = 2.63586   # Google DeepMind AlphaEvolve (May 2025)
EVAL_TIMEOUT_S = float(os.getenv("EVAL_TIMEOUT_S", "20"))

CIRCLE_PACKING_EVALUATION_METRIC = "sum_of_radii"
CIRCLE_PACKING_EVALUATION_INPUTS = {"n": N_CIRCLES}
INITIAL_PROGRAM_CODE = (Path(__file__).parent / "program.py").read_text(encoding="utf-8")


def verify_circle_packing(centers: np.ndarray, radii: np.ndarray, tol: float = 1e-6) -> dict:
    """Strictly verifies shape, finiteness, unit-square containment, and zero pairwise overlap."""
    centers = np.asarray(centers, dtype=np.float64)
    radii = np.asarray(radii, dtype=np.float64)

    if centers.shape != (N_CIRCLES, 2) or radii.shape != (N_CIRCLES,):
        return {
            "valid": False,
            "score": float("-inf"),
            "insight": f"Shape mismatch: got centers={centers.shape}, radii={radii.shape}; expected (26, 2) and (26,).",
        }

    if not np.all(np.isfinite(centers)) or not np.all(np.isfinite(radii)) or np.any(radii < 0):
        return {
            "valid": False,
            "score": float("-inf"),
            "insight": "Invalid NaN, Inf, or negative radius detected.",
        }

    min_boundary_slack = float("inf")
    tightest_boundary_idx = 0
    for i in range(N_CIRCLES):
        x, y = centers[i]
        r = radii[i]
        slack = min(x - r, 1.0 - x - r, y - r, 1.0 - y - r)
        if slack < min_boundary_slack:
            min_boundary_slack = float(slack)
            tightest_boundary_idx = i
        if x - r < -tol or x + r > 1.0 + tol or y - r < -tol or y + r > 1.0 + tol:
            return {
                "valid": False,
                "score": float("-inf"),
                "insight": f"Boundary violation at circle {i}: center=({x:.4f}, {y:.4f}), r={r:.4f} exceeds [0, 1]^2.",
            }

    max_overlap = 0.0
    min_pair_gap = float("inf")
    tightest_pair = (0, 1)
    for i in range(N_CIRCLES):
        for j in range(i + 1, N_CIRCLES):
            dist = float(np.linalg.norm(centers[i] - centers[j]))
            gap = dist - float(radii[i] + radii[j])
            if gap < min_pair_gap:
                min_pair_gap = gap
                tightest_pair = (i, j)
            overlap = -gap
            if overlap > max_overlap:
                max_overlap = overlap
            if overlap > tol:
                return {
                    "valid": False,
                    "score": float("-inf"),
                    "insight": f"Overlap violation ({overlap:.2e}) between circles {i} and {j}.",
                }

    total_radii = float(np.sum(radii))
    area_coverage_pct = float(np.sum(np.pi * (radii ** 2)) * 100.0)
    return {
        "valid": True,
        "score": round(total_radii, 5),
        "area_coverage_pct": round(area_coverage_pct, 2),
        "max_overlap": max(0.0, max_overlap),
        "min_pair_gap": round(max(0.0, min_pair_gap), 6),
        "tightest_pair": tightest_pair,
        "min_boundary_slack": round(max(0.0, min_boundary_slack), 6),
        "tightest_boundary_idx": tightest_boundary_idx,
        "pct_of_sota": round((total_radii / ALPHAEVOLVE_SOTA) * 100.0, 2),
        "insight": (
            f"Valid n=26 packing: sum_of_radii={total_radii:.5f} "
            f"(area={area_coverage_pct:.1f}%, prior human record={HUMAN_RECORD_2011:.4f}, "
            f"AlphaEvolve SOTA={ALPHAEVOLVE_SOTA:.5f}; "
            f"tightest_pair={tightest_pair} gap={max(0.0, min_pair_gap):.2e}, "
            f"min_boundary_slack={max(0.0, min_boundary_slack):.2e} at circle {tightest_boundary_idx})."
        ),
    }


def evaluate(program_path: str | Path) -> dict:
    """Loads a candidate `program.py`, runs `construct_packing()`, and returns the verdict."""
    path = Path(program_path).resolve()
    spec = importlib.util.spec_from_file_location("candidate_program", path)
    if spec is None or spec.loader is None:
        return {"valid": False, "score": float("-inf"), "insight": f"Unable to import {path}."}

    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
        if not hasattr(module, "construct_packing"):
            return {"valid": False, "score": float("-inf"), "insight": "Missing `construct_packing()` entrypoint."}
        centers, radii = module.construct_packing()
    except Exception as exc:
        return {
            "valid": False,
            "score": float("-inf"),
            "insight": f"Runtime exception during construct_packing(): {type(exc).__name__}: {exc}",
        }

    return verify_circle_packing(centers, radii)


def circle_packing_evaluation(program: dict | str, timeout_s: float | None = None) -> dict:
    """AlphaEvolve SDK evaluator callback with subprocess timeout and geometric/latency insights."""
    limit_s = EVAL_TIMEOUT_S if timeout_s is None else timeout_s
    if isinstance(program, dict):
        try:
            program_code = program["content"]["files"][0]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            return {
                "scores": {"scores": [{"metric": CIRCLE_PACKING_EVALUATION_METRIC, "score": -1e12}]},
                "insights": {
                    "insights": [
                        {"label": "error", "text": f"Malformed program payload: {exc}"}
                    ]
                },
            }
    else:
        program_code = program

    t0 = time.perf_counter()
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tmp:
        tmp.write(program_code)
        tmp_path = Path(tmp.name)

    try:
        proc = subprocess.run(
            [sys.executable, str(Path(__file__).resolve()), str(tmp_path)],
            capture_output=True,
            text=True,
            timeout=limit_s,
        )
        eval_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        if proc.stdout.strip():
            verdict = json.loads(proc.stdout)
        else:
            err_tail = (proc.stderr or "No output").strip().splitlines()[-1]
            verdict = {
                "valid": False,
                "score": float("-inf"),
                "insight": f"Candidate crashed before returning verdict: {err_tail}",
            }
    except subprocess.TimeoutExpired:
        eval_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        verdict = {
            "valid": False,
            "score": float("-inf"),
            "insight": (
                f"Timeout: construct_packing() exceeded {limit_s:.0f}s limit ({eval_ms:.0f} ms). "
                "Reduce optimizer iterations, use fewer restarts, or vectorize."
            ),
        }
    except Exception as exc:
        eval_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        verdict = {
            "valid": False,
            "score": float("-inf"),
            "insight": f"Evaluation harness error: {type(exc).__name__}: {exc}",
        }
    finally:
        tmp_path.unlink(missing_ok=True)

    score_val = float(verdict["score"])
    safe_score = score_val if np.isfinite(score_val) else -1e12
    insight_text = f"{verdict['insight']} [eval_latency={eval_ms:.1f} ms / limit={limit_s:.0f}s]"
    return {
        "scores": {
            "scores": [
                {
                    "metric": CIRCLE_PACKING_EVALUATION_METRIC,
                    "score": safe_score,
                }
            ]
        },
        "insights": {
            "insights": [
                {
                    "label": "verification",
                    "text": insight_text,
                }
            ]
        },
    }


def visualize_packing(
    circles: list[tuple[float, float, float]],
    title: str,
    save_path: str | Path | None = None,
    show: bool = False,
) -> None:
    """Plots the n=26 circle packing with matplotlib (saves to PNG when save_path is set)."""
    total_radii = sum(r for _, _, r in circles)
    try:
        import matplotlib  # type: ignore[import-not-found]
        if not show:
            matplotlib.use("Agg")
        import matplotlib.pyplot as plt  # type: ignore[import-not-found]
        from matplotlib.patches import Circle  # type: ignore[import-not-found]

        fig, ax = plt.subplots(figsize=(6, 6))
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_aspect("equal")
        ax.set_title(title)
        for x, y, r in circles:
            ax.add_patch(Circle((x, y), r, fill=True, alpha=0.45, edgecolor="#06b6d4", facecolor="#10b981"))
        plt.tight_layout()
        if save_path is not None:
            out = Path(save_path)
            out.parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(out, dpi=150)
            print(f"[visualize_packing] Saved plot -> {out}")
        if show:
            plt.show()
        plt.close(fig)
    except ImportError:
        print(f"[visualize_packing] {title} | n={len(circles)}, sum_of_radii={total_radii:.5f}")


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "program.py"
    verdict = evaluate(target)
    print(json.dumps(verdict, indent=2))
    sys.exit(0 if verdict["valid"] else 1)
