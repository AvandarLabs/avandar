#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# Appends SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to GITHUB_ENV using one
# `supabase status -o env` snapshot (local stack).
# All GITHUB_ENV vars get added to node process.env which makes them available
# to our node scripts, e.g. for running tests.
# ------------------------------------------------------------------------------
source scripts/utils/common.sh

# Exit on error or undefined variable.
set -euo pipefail

# Verify that GITHUB_ENV is set.
: "${GITHUB_ENV:?GITHUB_ENV is not set}"

_STATUS_ENV="$(supabase status -o env)"
get_supabase_env_var() {
  local name="$1"
  echo "$_STATUS_ENV" | sed -n "s/^${name}=\"\\([^\"]*\\)\"$/\\1/p"
}

API_URL="$(get_supabase_env_var API_URL)"
SECRET_KEY="$(get_supabase_env_var SECRET_KEY)"

{
  echo "VITE_APP_URL=http://localhost:5173/"
  echo "VITE_SUPABASE_API_URL=http://127.0.0.1:54321"
  echo "SUPABASE_URL=${API_URL}"
  echo "SUPABASE_SERVICE_ROLE_KEY=${SECRET_KEY}"
} >> "$GITHUB_ENV"
