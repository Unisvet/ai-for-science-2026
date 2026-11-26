# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import numpy as np
from dotenv import load_dotenv

load_dotenv()

try:
    import nest_asyncio  # type: ignore[import-not-found]
except ImportError:
    nest_asyncio = None

try:
    from alpha_evolve.client import AlphaEvolveClient  # type: ignore[import-not-found]
    from alpha_evolve.controller import run_controller_loop  # type: ignore[import-not-found]
    from alpha_evolve.experiment import AlphaEvolveExperiment  # type: ignore[import-not-found]
    from alpha_evolve.visualization import get_score  # type: ignore[import-not-found]
except ImportError as exc:
    raise ImportError(
        "The `alpha_evolve` SDK is required to run the live cloud evolution loop. "
        "Install it from https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud"
    ) from exc

try:
    from .evaluate import (
        CIRCLE_PACKING_EVALUATION_INPUTS,
        CIRCLE_PACKING_EVALUATION_METRIC,
        INITIAL_PROGRAM_CODE,
        circle_packing_evaluation,
        visualize_packing,
    )
except ImportError:
    from evaluate import (  # type: ignore[no-redef]
        CIRCLE_PACKING_EVALUATION_INPUTS,
        CIRCLE_PACKING_EVALUATION_METRIC,
        INITIAL_PROGRAM_CODE,
        circle_packing_evaluation,
        visualize_packing,
    )

# Configuration
PROJECT_ID = os.getenv("PROJECT_ID", "gcp-project-id")
LOCATION = os.getenv("LOCATION", "global")
COLLECTION = os.getenv("COLLECTION", "default_collection")
GE_APP_ID = os.getenv("GE_APP_ID", "your-engine-id")
ASSISTANT = os.getenv("ASSISTANT", "default_assistant")
BASE_URL = os.getenv("BASE_URL", "discoveryengine.googleapis.com")
# Model configurations (leave MODEL_1/MODEL_2 empty to use AlphaEvolve's default backend mixture)
MODEL_1 = os.getenv("MODEL_1", "").strip()
MODEL_2 = os.getenv("MODEL_2", "").strip()
MODEL_1_WEIGHT = float(os.getenv("MODEL_1_WEIGHT", "0.7"))
MODEL_2_WEIGHT = float(os.getenv("MODEL_2_WEIGHT", "0.3"))
PARALLEL_EVALUATION = os.getenv("PARALLEL_EVALUATION", "False").lower() == "true"

# Configuration
MAX_PROGRAMS_GENERATED = int(os.getenv("MAX_PROGRAMS_GENERATED", "30"))
CONCURRENCY = int(os.getenv("CONCURRENCY", "4"))
WORKER_CONCURRENCY = int(os.getenv("WORKER_CONCURRENCY", "4"))
MAX_PROGRAMS_EVALUATED = int(os.getenv("MAX_PROGRAMS_EVALUATED", "30"))
IDLE_TIMEOUT_S = int(os.getenv("IDLE_TIMEOUT_S", "300"))
EVAL_TIMEOUT_S = float(os.getenv("EVAL_TIMEOUT_S", "20"))

GENERATION_CONTEXT = (
    "Environment: Python 3.11+ with `numpy` and `scipy.optimize` (`minimize` with `SLSQP`, `linprog`) installed. "
    f"Hard per-candidate runtime limit is {EVAL_TIMEOUT_S:.0f}s (keep `construct_packing()` fast, ideally < 5s). "
    "For n=26 unit-square circle packing, strong approaches combine multi-start staggered hexagonal / asymmetric "
    "initializations with alternating center perturbation + exact radius linear programming (`linprog`) or "
    "analytical-Jacobian `SLSQP` polishing while strictly enforcing zero overlap and [0, 1]^2 containment."
)


def main():
    logging.basicConfig(level=logging.INFO)
    run_start_time = time.perf_counter()
    output_dir = Path(os.getenv("OUTPUT_DIR", str(Path(__file__).parent / "outputs")))
    output_dir.mkdir(parents=True, exist_ok=True)
    eval_latencies_ms: list[float] = []

    def timed_evaluation(program: dict | str) -> dict:
        t0 = time.perf_counter()
        res = circle_packing_evaluation(program)
        eval_latencies_ms.append(round((time.perf_counter() - t0) * 1000.0, 2))
        return res

    client = AlphaEvolveClient(
        project_id=PROJECT_ID,
        location=LOCATION,
        collection=COLLECTION,
        engine=GE_APP_ID,
        assistant=ASSISTANT,
        base_url=BASE_URL,
    )

    experiment = AlphaEvolveExperiment(
        client,
        timed_evaluation,
        MAX_PROGRAMS_EVALUATED,
        parallel_evaluation=PARALLEL_EVALUATION,
    )

    # Retrieve the model names and their corresponding weights from the environment
    models_raw = [
        (MODEL_1, MODEL_1_WEIGHT),
        (MODEL_2, MODEL_2_WEIGHT),
    ]
    # Deduplicate the models, sum their weights, and format the output
    generation_models = [
        {"name": m, "weight": round(w, 2)}
        for m, w in {
            name: sum(weight for n, weight in models_raw if n == name)
            for name, _ in models_raw
        }.items()
        if m
    ]

    exp_config: dict[str, Any] = {
        "title": "Circle Packing",
        "problem_description": "Evolve a constructor-based algorithm to pack N circles into a unit square, maximizing the sum of their radii.",
        "program_language": "python",
        "run_settings": {
            "max_programs": MAX_PROGRAMS_GENERATED,
            "concurrency": CONCURRENCY,
        },
        "generation_settings": {
            "context": GENERATION_CONTEXT,
        },
    }
    if generation_models:
        exp_config["generation_settings"]["models"] = generation_models

    logging.debug("Experiment config: %s", exp_config)
    # This will fail without real credentials/project, but the structure is correct.
    try:
        experiment.create_experiment(exp_config)
    except Exception as e:
        print(f"Failed to create experiment (expected if no creds): {e}")
        return

    initial_eval = circle_packing_evaluation(INITIAL_PROGRAM_CODE)
    initial_program = {
        "content": {
            "files": [
                {
                    "path": "program.py",
                    "content": INITIAL_PROGRAM_CODE,
                }
            ]
        },
        "evaluation": initial_eval,
    }

    experiment.create_initial_program(initial_program)
    experiment.start_experiment()

    # nest_asyncio allows the asyncio event loop to be nested when available
    if nest_asyncio is not None:
        nest_asyncio.apply()
    loop_start_time = time.perf_counter()
    if PARALLEL_EVALUATION:
        # Match the number of evaluation workers to the configured worker concurrency
        asyncio.run(
            run_controller_loop(
                experiment,
                num_evaluators=WORKER_CONCURRENCY,
                idle_timeout_s=IDLE_TIMEOUT_S,
            )
        )
    else:
        asyncio.run(run_controller_loop(experiment, idle_timeout_s=IDLE_TIMEOUT_S))
    loop_duration_s = round(time.perf_counter() - loop_start_time, 2)

    # Visualization & artifact export
    list_params = {"order_by": "sum_of_radii asc"}
    response = experiment.list_programs(params=list_params)

    leaderboard: list[dict[str, Any]] = []
    best_code: str | None = None
    best_score: float | None = None

    if response and "alphaEvolvePrograms" in response:
        top_programs = response["alphaEvolvePrograms"]
        # We use a lambda to pass the metric name to get_score
        top_programs.sort(
            key=lambda p: get_score(p, CIRCLE_PACKING_EVALUATION_METRIC), reverse=True
        )

        for i, prog in enumerate(top_programs):
            score_val = get_score(prog, CIRCLE_PACKING_EVALUATION_METRIC)
            prog_name = prog.get("name", "Unknown ID")
            leaderboard.append(
                {
                    "rank": i + 1,
                    "program_id": prog_name.rsplit("/", 1)[-1],
                    "name": prog_name,
                    "score": score_val if np.isfinite(score_val) else None,
                }
            )
            if not np.isfinite(score_val) or score_val <= -1e11:
                continue

            if best_code is None:
                best_code = prog["content"]["files"][0]["content"]
                best_score = float(score_val)
                evolved_path = output_dir / "program_evolved.py"
                evolved_path.write_text(best_code, encoding="utf-8")
                print(f"\nSaved best evolved program (score={best_score:.5f}) -> {evolved_path}")

            # Save PNG plot for the top 3 candidates without blocking on plt.show()
            if i < 3:
                print(f"Visualizing Rank {i + 1}: {prog_name}")
                try:
                    code = prog["content"]["files"][0]["content"]
                    exec_namespace = {"np": np, "Any": Any, "Mapping": Mapping}
                    exec(code, exec_namespace)
                    construct_packing_func = exec_namespace.get("construct_packing")

                    if not callable(construct_packing_func):
                        print("ERROR: construct_packing not found or not callable.")
                        continue

                    n = CIRCLE_PACKING_EVALUATION_INPUTS["n"]
                    try:
                        result = construct_packing_func()
                    except TypeError:
                        result = construct_packing_func(n=n, random_seed=42)

                    centers, radii = result[0], result[1]
                    score = float(result[2]) if len(result) > 2 else float(np.sum(radii))

                    circles = list(zip(centers[:, 0], centers[:, 1], radii))
                    title = f"Rank {i + 1} | ID: {prog_name[-6:]} | Score: {score:.5f}"
                    visualize_packing(
                        circles,
                        title,
                        save_path=output_dir / f"rank_{i + 1}_packing.png",
                        show=False,
                    )
                except Exception as e:
                    print(f"ERROR visualizing program: {e}")
    else:
        print("No programs found to visualize.")

    total_duration_s = round(time.perf_counter() - run_start_time, 2)
    run_timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    model_slug = (
        "_".join(m["name"] for m in generation_models) if generation_models else "backend-default"
    )
    run_dir = output_dir / f"run_{run_timestamp}_{model_slug}"
    run_dir.mkdir(parents=True, exist_ok=True)

    # Copy latest artifacts into the timestamped run folder so prior runs are never overwritten
    for fname in ("program_evolved.py", "rank_1_packing.png", "rank_2_packing.png", "rank_3_packing.png"):
        src = output_dir / fname
        if src.exists():
            (run_dir / fname).write_bytes(src.read_bytes())

    results_summary = {
        "timestamp_utc": run_timestamp,
        "run_dir": str(run_dir),
        "experiment_name": getattr(experiment, "experiment_name", None),
        "models": generation_models or ["backend-default"],
        "context_enabled": True,
        "eval_timeout_s": EVAL_TIMEOUT_S,
        "idle_timeout_s": IDLE_TIMEOUT_S,
        "max_programs_generated": MAX_PROGRAMS_GENERATED,
        "max_programs_evaluated": MAX_PROGRAMS_EVALUATED,
        "concurrency": CONCURRENCY,
        "worker_concurrency": WORKER_CONCURRENCY,
        "parallel_evaluation": PARALLEL_EVALUATION,
        "total_runtime_s": total_duration_s,
        "evolution_loop_s": loop_duration_s,
        "evaluations_recorded": len(eval_latencies_ms),
        "avg_eval_latency_ms": round(sum(eval_latencies_ms) / len(eval_latencies_ms), 2)
        if eval_latencies_ms
        else None,
        "eval_latencies_ms": eval_latencies_ms,
        "best_score": best_score,
        "leaderboard": leaderboard,
    }
    results_json = json.dumps(results_summary, indent=2)
    (run_dir / "results.json").write_text(results_json, encoding="utf-8")
    (output_dir / "results.json").write_text(results_json, encoding="utf-8")

    # Append compact record to experiments_log.jsonl and experiments_log.md
    log_jsonl = output_dir / "experiments_log.jsonl"
    with log_jsonl.open("a", encoding="utf-8") as f:
        f.write(json.dumps({k: v for k, v in results_summary.items() if k != "leaderboard"}) + "\n")

    log_md = output_dir / "experiments_log.md"
    if not log_md.exists():
        log_md.write_text(
            "# AlphaEvolve Circle Packing — Experiment Runs\n\n"
            "| UTC Timestamp | Models | Budget (Gen/Eval) | Parallel | Eval Timeout | Context | Best Score | Total (s) | Loop (s) | Avg Eval (ms) | Run Folder |\n"
            "|---|---|---:|---|---:|---|---:|---:|---:|---:|---|\n",
            encoding="utf-8",
        )
    models_str = ", ".join(
        f"{m['name']}({m['weight']})" if isinstance(m, dict) else str(m)
        for m in results_summary["models"]
    )
    with log_md.open("a", encoding="utf-8") as f:
        f.write(
            f"| {run_timestamp} | `{models_str}` | {MAX_PROGRAMS_GENERATED}/{MAX_PROGRAMS_EVALUATED} | "
            f"{PARALLEL_EVALUATION} | {EVAL_TIMEOUT_S:.0f}s | Yes | **{best_score}** | "
            f"{total_duration_s} | {loop_duration_s} | {results_summary['avg_eval_latency_ms']} | `{run_dir.name}` |\n"
        )

    print(f"\nSaved run artifacts -> {run_dir}")
    print(f"Updated experiment log -> {log_md}")
    print(
        f"Summary: best_score={best_score}, total_runtime={total_duration_s}s, "
        f"loop={loop_duration_s}s, avg_eval_latency={results_summary['avg_eval_latency_ms']} ms"
    )


if __name__ == "__main__":
    main()

