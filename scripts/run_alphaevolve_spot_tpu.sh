#!/usr/bin/env bash
# ==============================================================================
# Zero-Leak Ephemeral Spot Cloud TPU Wrapper for Google AlphaEvolve
# APAC AI for Science DevFest 2026 — Verified with Antigravity & gcloud compute tpus
# ==============================================================================
set -euo pipefail

# Load repo-root .env automatically if present (handles Windows CRLF safely)
if [[ -f ".env" ]]; then
  while IFS='=' read -r key val; do
    [[ -z "${key}" || "${key}" =~ ^[[:space:]]*# ]] && continue
    key="${key//[$'\r\n ']/}"
    val="${val%$'\r'}"
    export "${key}=${val}"
  done < ".env"
fi

PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_ID:?Set GCP_PROJECT_ID or PROJECT_ID in .env or environment}}"
ZONE="${GCP_TPU_ZONE:-europe-west4-a}"                # Trillium v6e zone (e.g., asia-northeast1-b APAC, europe-west4-a EU, us-east5-b US)
TPU_NAME="${GCP_TPU_NAME:-alphaevolve-tpu}"
ACCEL_TYPE="${GCP_TPU_TYPE:-v6e-1}"                   # Single-chip Trillium Spot TPU
RUNTIME_VERSION="${GCP_TPU_VERSION:-v2-alpha-tpuv6e}" # Required runtime for v6e (NOT tpu-ubuntu2204-base)
TPU_SERVICE_ACCOUNT="${GCP_TPU_SERVICE_ACCOUNT:-}"    # Optional SA email with Discovery Engine / Vertex permissions
TPU_BOOTSTRAP="${GCP_TPU_BOOTSTRAP:-true}"            # Auto-install jax[tpu], scipy, alpha_evolve if missing on VM
LOCAL_EXP_DIR="${1:-./demos}"
LOCAL_OUT_DIR="${2:-./local_outputs}"
REMOTE_CMD="${3:-python3 demos/03_jax_torchtpu_evaluator_demo.py --output-dir ~/alphaevolve_workspace/outputs}"

mkdir -p "${LOCAL_OUT_DIR}"

CLEANED_UP=0
cleanup() {
  local exit_code=$?
  [[ "${CLEANED_UP}" -eq 1 ]] && return
  CLEANED_UP=1
  echo "[TRAP] Exit code ${exit_code} detected — syncing evolved artifacts before teardown..."
  gcloud compute tpus tpu-vm scp \
    "${TPU_NAME}:~/alphaevolve_workspace/outputs" \
    "${LOCAL_OUT_DIR}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --recurse \
    --quiet || true

  echo "[TRAP] Deleting Spot TPU VM '${TPU_NAME}' in ${ZONE} to stop billing..."
  gcloud compute tpus tpu-vm delete "${TPU_NAME}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --quiet || true

  echo "[VERIFY] Post-teardown TPU inventory in ${ZONE}:"
  gcloud compute tpus tpu-vm list \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --format="value(name)" \
    --limit=10
}
trap cleanup EXIT ERR INT TERM

echo "[1/5] Pre-flight check: verifying no orphaned TPU VMs exist in ${ZONE}..."
EXISTING="$(gcloud compute tpus tpu-vm list --project="${PROJECT_ID}" --zone="${ZONE}" --format="value(name)" --limit=10)"
if [[ -n "${EXISTING}" ]]; then
  echo "[ERROR] Found existing TPU VM(s) in ${ZONE}: ${EXISTING}. Inspect or delete before launching."
  exit 1
fi

echo "[2/5] Provisioning Spot Cloud TPU (${ACCEL_TYPE}, runtime ${RUNTIME_VERSION})..."
CREATE_ARGS=(
  "${TPU_NAME}"
  "--project=${PROJECT_ID}"
  "--zone=${ZONE}"
  "--accelerator-type=${ACCEL_TYPE}"
  "--version=${RUNTIME_VERSION}"
  "--scopes=https://www.googleapis.com/auth/cloud-platform"
  "--spot"
  "--quiet"
)
if [[ -n "${TPU_SERVICE_ACCOUNT}" ]]; then
  CREATE_ARGS+=("--service-account=${TPU_SERVICE_ACCOUNT}")
fi
gcloud compute tpus tpu-vm create "${CREATE_ARGS[@]}"

echo "[3/5] Syncing experiment workspace to ${TPU_NAME}..."
gcloud compute tpus tpu-vm ssh "${TPU_NAME}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --quiet \
  --command="mkdir -p ~/alphaevolve_workspace/outputs"

gcloud compute tpus tpu-vm scp \
  "${LOCAL_EXP_DIR}" \
  "${TPU_NAME}:~/alphaevolve_workspace/" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --recurse \
  --quiet

if [[ -f ".env" ]]; then
  gcloud compute tpus tpu-vm scp \
    ".env" \
    "${TPU_NAME}:~/alphaevolve_workspace/.env" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --quiet
fi

if [[ "${TPU_BOOTSTRAP}" == "true" ]]; then
  echo "[4/5] Bootstrapping JAX TPU & AlphaEvolve dependencies on ${TPU_NAME} (only installs if missing)..."
  gcloud compute tpus tpu-vm ssh "${TPU_NAME}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --quiet \
    --command="python3 -c 'import jax' 2>/dev/null || pip install -q 'jax[tpu]' -f https://storage.googleapis.com/jax-releases/libtpu_releases.html; python3 -c 'import scipy, dotenv, matplotlib' 2>/dev/null || pip install -q scipy python-dotenv matplotlib; python3 -c 'import alpha_evolve' 2>/dev/null || pip install -q git+https://github.com/Google-Cloud-AI/alphaevolve-on-googlecloud.git"
else
  echo "[4/5] Skipping dependency bootstrap (GCP_TPU_BOOTSTRAP=${TPU_BOOTSTRAP})."
fi

echo "[5/5] Running AlphaEvolve workload on ${TPU_NAME}: ${REMOTE_CMD}"
gcloud compute tpus tpu-vm ssh "${TPU_NAME}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --quiet \
  --command="cd ~/alphaevolve_workspace && ${REMOTE_CMD}"

echo "[OK] Evolution run complete — trap will now copy outputs to ${LOCAL_OUT_DIR} and delete ${TPU_NAME}."
