#!/usr/bin/env bash
# Launches the Avandar desktop shell.
#
# Behavior:
#   - If Vite is already serving on this worktree's port (e.g. `pnpm dev`
#     running in another terminal), reuse it and start only the desktop shell.
#   - Otherwise, start `pnpm dev` (the full Avandar dev environment) in the
#     background, wait for Vite to be reachable, and only then start the
#     desktop shell. This is important: Electrobun opens the webview window
#     immediately on launch, so starting it before Vite is ready produces a
#     blank window that never recovers. On exit or Ctrl-C, the background
#     `pnpm dev` is torn down too.
#
# This script lets you run `pnpm dev:desktop` alone OR alongside an existing
# `pnpm dev` without spawning the dev environment twice.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VITE_PORT="$("${ROOT_DIR}/scripts/utils/get-dev-server-port.sh")"
VITE_URL="http://127.0.0.1:${VITE_PORT}"
# Generous default: first run after `pnpm install` cold-starts esbuild,
# downloads native binaries, builds Lingui catalogs, etc.
WAIT_TIMEOUT_SECONDS="${AVA_DEV_DESKTOP_WAIT_TIMEOUT:-180}"

export AVA_DESKTOP_MODE="${AVA_DESKTOP_MODE:-development}"
export AVA_VITE_DEV_URL="${AVA_VITE_DEV_URL:-${VITE_URL}}"

vite_ready() {
  curl --fail --silent --show-error --max-time 1 --output /dev/null \
    "${VITE_URL}/" 2>/dev/null
}

if [ ! -f "${ROOT_DIR}/.env.development" ]; then
  echo "[dev:desktop] .env.development not found at ${ROOT_DIR}/.env.development; run 'pnpm env:reset' first." >&2
  exit 1
fi

# Electrobun launches with CWD=apps/desktop, so Bun won't auto-load the
# repo-root .env.development. We inject it explicitly via dotenv-cli so
# the bun-main process sees VITE_SUPABASE_API_URL / VITE_SUPABASE_ANON_KEY
# (the desktop auth IPC handler hits the Supabase REST endpoint directly
# and needs them at sign-in time).
DESKTOP_CMD=(pnpm dotenv -e .env.development -- pnpm --filter @avandar/desktop dev)

if vite_ready; then
  echo "[dev:desktop] Vite already serving on ${VITE_URL}; reusing it (skipping pnpm dev)"
  exec "${DESKTOP_CMD[@]}"
fi

echo "[dev:desktop] No dev server on ${VITE_URL}; starting pnpm dev in the background"

# Start `pnpm dev` in its own process group so we can terminate the entire
# tree (vite, supabase, etc.) on exit.
set -m
pnpm dev &
DEV_PID=$!
set +m

cleanup() {
  local exit_code=$?
  if kill -0 "$DEV_PID" 2>/dev/null; then
    echo "[dev:desktop] Stopping background pnpm dev (pid ${DEV_PID})..."
    # Negative pid → send signal to the whole process group.
    kill -TERM "-${DEV_PID}" 2>/dev/null || kill -TERM "$DEV_PID" 2>/dev/null || true
    # Give it a moment to clean up its own children, then force-kill stragglers.
    for _ in 1 2 3 4 5; do
      if ! kill -0 "$DEV_PID" 2>/dev/null; then break; fi
      sleep 1
    done
    if kill -0 "$DEV_PID" 2>/dev/null; then
      kill -KILL "-${DEV_PID}" 2>/dev/null || kill -KILL "$DEV_PID" 2>/dev/null || true
    fi
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

echo "[dev:desktop] Waiting up to ${WAIT_TIMEOUT_SECONDS}s for Vite at ${VITE_URL} ..."
elapsed=0
while ! vite_ready; do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "[dev:desktop] pnpm dev exited before Vite became ready; aborting." >&2
    exit 1
  fi
  if [ "$elapsed" -ge "$WAIT_TIMEOUT_SECONDS" ]; then
    echo "[dev:desktop] Timed out after ${WAIT_TIMEOUT_SECONDS}s waiting for ${VITE_URL}." >&2
    exit 1
  fi
  sleep 1
  elapsed=$((elapsed + 1))
done

echo "[dev:desktop] Vite is up after ${elapsed}s; launching Electrobun."
"${DESKTOP_CMD[@]}"
