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

echo "[1/4] Pre-flight check: verifying no orphaned TPU VMs exist in ${ZONE}..."
EXISTING="$(gcloud compute tpus tpu-vm list --project="${PROJECT_ID}" --zone="${ZONE}" --format="value(name)" --limit=10)"
if [[ -n "${EXISTING}" ]]; then
  echo "[ERROR] Found existing TPU VM(s) in ${ZONE}: ${EXISTING}. Inspect or delete before launching."
  exit 1
fi

echo "[2/4] Provisioning Spot Cloud TPU (${ACCEL_TYPE}, runtime ${RUNTIME_VERSION})..."
gcloud compute tpus tpu-vm create "${TPU_NAME}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --accelerator-type="${ACCEL_TYPE}" \
  --version="${RUNTIME_VERSION}" \
  --spot \
  --quiet

echo "[3/4] Syncing experiment workspace to ${TPU_NAME}..."
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

echo "[4/4] Running AlphaEvolve workload on ${TPU_NAME}: ${REMOTE_CMD}"
gcloud compute tpus tpu-vm ssh "${TPU_NAME}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --quiet \
  --command="cd ~/alphaevolve_workspace && ${REMOTE_CMD}"

echo "[OK] Evolution run complete — trap will now copy outputs to ${LOCAL_OUT_DIR} and delete ${TPU_NAME}."
