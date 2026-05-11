#!/usr/bin/env bash
# Waits until the local Supabase REST API responds (GitHub Actions / local CI).

set -euo pipefail

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:54321/rest/v1/ >/dev/null; then
    exit 0
  fi
  sleep 2
done

echo "Local Supabase API did not become ready in time." >&2
exit 1
