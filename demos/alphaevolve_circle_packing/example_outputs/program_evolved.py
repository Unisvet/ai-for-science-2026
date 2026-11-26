"""
Seed Program for Google Cloud AlphaEvolve (`ae` CLI) — n=26 Unit-Square Circle Packing
APAC AI for Science DevFest 2026 — Companion to the Official Google Cloud AlphaEvolve Codelab:
  https://codelabs.developers.google.com/alphaevolve-on-google-cloud-1#0

In a real Google Cloud AlphaEvolve experiment, this naive Gen 0 seed (~0.9598) is the
ONLY algorithm you write. AlphaEvolve's Cloud LLM ensemble mutates ONLY the code inside
the marked evolve block below while `evaluate.py` grades every candidate.
"""

from __future__ import annotations

import numpy as np


# EVOLVE-BLOCK-START
def construct_packing() -> tuple[np.ndarray, np.ndarray]:
    """Constructs a packing of n=26 disjoint circles inside the unit square [0, 1]^2.

    Returns:
        centers: np.ndarray of shape (26, 2) with (x, y) coordinates in [0, 1]^2
        radii:   np.ndarray of shape (26,) with non-negative circle radii
    """
    from scipy.optimize import linprog, minimize

    n = 26
    rng = np.random.default_rng(42)
    idx_i, idx_j = np.triu_indices(n, k=1)
    num_pairs = len(idx_i)

    # Pre-build LP constraint matrix for exact radius maximization given fixed centers:
    # r_i + r_j <= dist_ij
    A_ub = np.zeros((num_pairs, n), dtype=np.float64)
    A_ub[np.arange(num_pairs), idx_i] = 1.0
    A_ub[np.arange(num_pairs), idx_j] = 1.0
    c_lp = -np.ones(n, dtype=np.float64)

    def solve_exact_radii(centers: np.ndarray) -> np.ndarray:
        diffs = centers[idx_i] - centers[idx_j]
        dists = np.linalg.norm(diffs, axis=1)
        b_ub = np.maximum(0.0, dists - 1e-14)
        max_r = np.minimum(
            np.minimum(centers[:, 0], 1.0 - centers[:, 0]),
            np.minimum(centers[:, 1], 1.0 - centers[:, 1]),
        )
        max_r = np.maximum(0.0, max_r - 1e-14)
        bounds = [(0.0, float(mr)) for mr in max_r]
        res = linprog(c_lp, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")
        if res.success and res.x is not None:
            return np.maximum(0.0, res.x)
        return np.zeros(n, dtype=np.float64)

    # Objective and exact analytical Jacobian for SLSQP
    # State vector z of length 3*n: [x_0..x_{n-1}, y_0..y_{n-1}, r_0..r_{n-1}]
    obj_grad = np.zeros(3 * n, dtype=np.float64)
    obj_grad[2 * n :] = -1.0

    def objective(z: np.ndarray) -> float:
        return -float(np.sum(z[2 * n :]))

    def objective_jac(z: np.ndarray) -> np.ndarray:
        return obj_grad

    # Pre-allocate constant parts of constraint Jacobian (4*n boundary + num_pairs pairwise)
    total_cons = 4 * n + num_pairs
    base_jac = np.zeros((total_cons, 3 * n), dtype=np.float64)
    ar_n = np.arange(n)
    # 0..n-1: x_i - r_i >= 0
    base_jac[ar_n, ar_n] = 1.0
    base_jac[ar_n, 2 * n + ar_n] = -1.0
    # n..2n-1: 1 - x_i - r_i >= 0
    base_jac[n + ar_n, ar_n] = -1.0
    base_jac[n + ar_n, 2 * n + ar_n] = -1.0
    # 2n..3n-1: y_i - r_i >= 0
    base_jac[2 * n + ar_n, n + ar_n] = 1.0
    base_jac[2 * n + ar_n, 2 * n + ar_n] = -1.0
    # 3n..4n-1: 1 - y_i - r_i >= 0
    base_jac[3 * n + ar_n, n + ar_n] = -1.0
    base_jac[3 * n + ar_n, 2 * n + ar_n] = -1.0
    # 4n..: sqrt((x_i-x_j)^2 + (y_i-y_j)^2) - r_i - r_j >= 0
    pair_rows = 4 * n + np.arange(num_pairs)
    base_jac[pair_rows, 2 * n + idx_i] = -1.0
    base_jac[pair_rows, 2 * n + idx_j] = -1.0

    def cons_fun(z: np.ndarray) -> np.ndarray:
        x = z[:n]
        y = z[n : 2 * n]
        r = z[2 * n :]
        dx = x[idx_i] - x[idx_j]
        dy = y[idx_i] - y[idx_j]
        dists = np.sqrt(dx * dx + dy * dy)
        out = np.empty(total_cons, dtype=np.float64)
        out[:n] = x - r
        out[n : 2 * n] = 1.0 - x - r
        out[2 * n : 3 * n] = y - r
        out[3 * n : 4 * n] = 1.0 - y - r
        out[4 * n :] = dists - r[idx_i] - r[idx_j]
        return out

    def cons_jac(z: np.ndarray) -> np.ndarray:
        jac = base_jac.copy()
        x = z[:n]
        y = z[n : 2 * n]
        dx = x[idx_i] - x[idx_j]
        dy = y[idx_i] - y[idx_j]
        dists = np.maximum(np.sqrt(dx * dx + dy * dy), 1e-12)
        ux = dx / dists
        uy = dy / dists
        jac[pair_rows, idx_i] = ux
        jac[pair_rows, idx_j] = -ux
        jac[pair_rows, n + idx_i] = uy
        jac[pair_rows, n + idx_j] = -uy
        return jac

    slsqp_bounds = [(0.0, 1.0)] * (2 * n) + [(0.0, 0.5)] * n
    constraints = {"type": "ineq", "fun": cons_fun, "jac": cons_jac}

    def optimize_slsqp(
        centers: np.ndarray, radii: np.ndarray, maxiter: int = 250, ftol: float = 1e-12
    ) -> tuple[np.ndarray, np.ndarray]:
        z0 = np.concatenate([centers[:, 0], centers[:, 1], radii])
        res = minimize(
            objective,
            z0,
            jac=objective_jac,
            method="SLSQP",
            bounds=slsqp_bounds,
            constraints=constraints,
            options={"maxiter": maxiter, "ftol": ftol, "disp": False},
        )
        c_opt = np.clip(res.x[: 2 * n].reshape(2, n).T, 1e-6, 1.0 - 1e-6)
        r_opt = solve_exact_radii(c_opt)
        return c_opt, r_opt

    def make_row_layout(row_counts: list[int], stagger: bool = True) -> np.ndarray:
        pts = []
        n_rows = len(row_counts)
        for r_idx, cnt in enumerate(row_counts):
            y = (r_idx + 0.5) / n_rows
            if stagger and (r_idx % 2 == 1) and cnt <= 5:
                xs = (np.arange(cnt) + 0.7) / (cnt + 0.4)
            else:
                xs = (np.arange(cnt) + 0.5) / cnt
            for x in xs:
                pts.append([x, y])
        return np.array(pts, dtype=np.float64)

    def relax_centers(centers: np.ndarray, steps: int = 60) -> np.ndarray:
        c = centers.copy()
        target_d = 0.21
        for _ in range(steps):
            dx = c[:, 0:1] - c[:, 0:1].T
            dy = c[:, 1:2] - c[:, 1:2].T
            dist = np.sqrt(dx * dx + dy * dy) + np.eye(n)
            overlap = np.maximum(0.0, target_d - dist)
            fx = np.sum((dx / dist) * overlap, axis=1)
            fy = np.sum((dy / dist) * overlap, axis=1)
            # Wall repulsion
            fx += np.maximum(0.0, 0.09 - c[:, 0]) - np.maximum(0.0, c[:, 0] - 0.91)
            fy += np.maximum(0.0, 0.09 - c[:, 1]) - np.maximum(0.0, c[:, 1] - 0.91)
            c[:, 0] = np.clip(c[:, 0] + 0.15 * fx, 0.03, 0.97)
            c[:, 1] = np.clip(c[:, 1] + 0.15 * fy, 0.03, 0.97)
        return c

    # Precompute a dense grid for void-finding / circle teleportation
    grid_1d = np.linspace(0.04, 0.96, 29)
    gx, gy = np.meshgrid(grid_1d, grid_1d)
    grid_pts = np.column_stack([gx.ravel(), gy.ravel()])
    grid_wall_dist = np.minimum(
        np.minimum(grid_pts[:, 0], 1.0 - grid_pts[:, 0]),
        np.minimum(grid_pts[:, 1], 1.0 - grid_pts[:, 1]),
    )

    def mutate_topology(centers: np.ndarray, radii: np.ndarray, mode: int) -> np.ndarray:
        c_new = centers.copy()
        if mode == 0:
            # Teleport one of the smallest circles into the largest available void
            order = np.argsort(radii)
            target_idx = int(order[rng.integers(0, 3)])
            mask = np.ones(n, dtype=bool)
            mask[target_idx] = False
            other_c = c_new[mask]
            other_r = radii[mask]
            dists = np.linalg.norm(grid_pts[:, None, :] - other_c[None, :, :], axis=2) - other_r[None, :]
            clearance = np.minimum(grid_wall_dist, np.min(dists, axis=1))
            top_k = np.argsort(clearance)[-6:]
            chosen_pt = grid_pts[int( rng.choice(top_k) )]
            c_new[target_idx] = np.clip(chosen_pt + rng.normal(0.0, 0.008, size=2), 0.03, 0.97)
        elif mode == 1:
            # Swap a smaller circle with an adjacent circle + slight jitter to tunnel past barrier
            i = int(np.argsort(radii)[rng.integers(0, 6)])
            d = np.linalg.norm(c_new - c_new[i], axis=1)
            d[i] = 1e9
            neighbors = np.argsort(d)[:4]
            j = int(rng.choice(neighbors))
            c_new[i], c_new[j] = c_new[j].copy(), c_new[i].copy()
            c_new += rng.normal(0.0, 0.006, size=(n, 2))
        elif mode == 2:
            # Localized cluster perturbation around a random focal circle
            focal = int(rng.integers(0, n))
            d = np.linalg.norm(c_new - c_new[focal], axis=1)
            local_mask = d < 0.35
            scale = float(rng.choice([0.008, 0.016, 0.025]))
            c_new[local_mask] += rng.normal(0.0, scale, size=(int(np.sum(local_mask)), 2))
        else:
            # Shear / band shift + anisotropic jitter
            axis = int(rng.integers(0, 2))
            band = np.abs(c_new[:, axis] - rng.uniform(0.2, 0.8)) < 0.18
            c_new[band, 1 - axis] += rng.normal(0.0, 0.02, size=int(np.sum(band)))
            c_new += rng.normal(0.0, 0.005, size=(n, 2))
        return np.clip(c_new, 0.02, 0.98)

    # Generate diverse initial candidate configurations
    row_patterns = [
        [5, 5, 6, 5, 5],
        [6, 5, 5, 5, 5],
        [5, 5, 5, 5, 6],
        [5, 6, 4, 6, 5],
        [6, 4, 6, 5, 5],
        [5, 6, 5, 5, 5],
        [5, 5, 5, 6, 5],
        [4, 5, 4, 5, 4, 4],
        [5, 4, 5, 4, 5, 3],
    ]

    candidates = []
    for pat in row_patterns:
        base_c = make_row_layout(pat, stagger=True)
        candidates.append(relax_centers(base_c, steps=40))
        candidates.append(relax_centers(base_c[:, ::-1], steps=40))
        for scale in (0.016, 0.030):
            candidates.append(np.clip(base_c + rng.normal(0.0, scale, size=(n, 2)), 0.03, 0.97))

    # Stage 1: Fast SLSQP screening to identify the most promising topological basins
    screened = []
    for c_init in candidates:
        c_opt, r_opt = optimize_slsqp(c_init, solve_exact_radii(c_init), maxiter=75, ftol=1e-9)
        screened.append((float(np.sum(r_opt)), c_opt, r_opt))

    screened.sort(key=lambda item: item[0], reverse=True)

    #Stage 2: Deep SLSQP polish on top distinct candidates to build an elite pool
    elites = []
    for _, c_cand, r_cand in screened[:10]:
        c_opt, r_opt = optimize_slsqp(c_cand, r_cand, maxiter=260, ftol=1e-12)
        score = float(np.sum(r_opt))
        # Deduplicate by sorted radii signature
        r_sig = np.sort(r_opt)
        if not any(np.linalg.norm(r_sig - np.sort(e[2])) < 1e-4 for e in elites):
            elites.append((score, c_opt.copy(), r_opt.copy()))
        if len(elites) >= 4:
            break

    elites.sort(key=lambda item: item[0], reverse=True)
    best_score, best_centers, best_radii = elites[0][0], elites[0][1].copy(), elites[0][2].copy()

    # Stage 3: Topological Defect Tunneling & Multi-Basin Hopping
    for step in range(18):
        base_idx = 0 if (step % 3 == 0 or len(elites) == 1) else int(rng.integers(0, min(3, len(elites))))
        _, base_c, base_r = elites[base_idx]
        if step < 10:
            c_pert = mutate_topology(base_c, base_r, mode=step % 4)
        else:
            scale = [0.015, 0.008, 0.004, 0.0015][(step - 10) % 4]
            c_pert = np.clip(base_c + rng.normal(0.0, scale, size=(n, 2)), 0.02, 0.98)

        c_opt, r_opt = optimize_slsqp(c_pert, solve_exact_radii(c_pert), maxiter=280, ftol=1e-12)
        score = float(np.sum(r_opt))
        if score > best_score:
            best_score = score
            best_centers = c_opt.copy()
            best_radii = r_opt.copy()
            elites[0] = (best_score, best_centers.copy(), best_radii.copy())
        elif score > elites[-1][0]:
            r_sig = np.sort(r_opt)
            if not any(np.linalg.norm(r_sig - np.sort(e[2])) < 1e-4 for e in elites):
                elites[-1] = (score, c_opt.copy(), r_opt.copy())
                elites.sort(key=lambda item: item[0], reverse=True)

    # Final ultra-tight polish on the champion configuration
    best_centers, best_radii = optimize_slsqp(best_centers, best_radii, maxiter=400, ftol=1e-14)

    # Final safety pass to guarantee strict non-overlap and boundary containment
    best_radii = np.minimum(best_radii, np.minimum(best_centers, 1.0 - best_centers).min(axis=1))
    for i in range(n):
        for j in range(i + 1, n):
            dist = float(np.linalg.norm(best_centers[i] - best_centers[j]))
            if best_radii[i] + best_radii[j] > dist:
                excess = (best_radii[i] + best_radii[j] - dist) * 0.5 + 1e-14
                best_radii[i] = max(0.0, best_radii[i] - excess)
                best_radii[j] = max(0.0, best_radii[j] - excess)

    return best_centers, best_radii
# EVOLVE-BLOCK-END


if __name__ == "__main__":
    c, r = construct_packing()
    print(f"Seed construct_packing(): n={len(r)}, sum_of_radii={float(np.sum(r)):.5f}")
