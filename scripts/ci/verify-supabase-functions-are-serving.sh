#!/usr/bin/env bash
# Waits until local Supabase Edge Functions serve healthz (GitHub Actions / CI).

set -euo pipefail

HEALTHZ_URL="http://127.0.0.1:54321/functions/v1/healthz"

for _ in $(seq 1 30); do
  if curl -fsS "$HEALTHZ_URL" >/dev/null; then
    exit 0
  fi
  sleep 2
done

echo "Local Supabase Functions did not become ready in time." >&2
exit 1
