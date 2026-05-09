#!/usr/bin/env bash
# Creates `.env.development.edge` for CI, because that file does not actually when the
# exist in the repo (it is gitignored). So we have to prepare it in CI by
# before we can run `pnpm fns:update-env` (which will then move the prepared
# variables to `supabase/functions/.env` so supabase can be started, which we
# need in order to run e2e tests).

source scripts/utils/common.sh

# Exit on error or undefined variable.
set -euo pipefail

# Get snapshot of `supabase status -o env`
_SUPABASE_STATUS_ENV="$(supabase status -o env)"

# Parses one `NAME="value"` line from `_SUPABASE_STATUS_ENV`.
get_supabase_env_var() {
  local name="$1"
  echo "$_SUPABASE_STATUS_ENV" | sed -n "s/^${name}=\"\\([^\"]*\\)\"$/\\1/p"
}

# Drops any existing `KEY=` line from the env file, then appends `KEY=value`.
replace_env_var() {
  local key="$1"
  local value="$2"
  local env_file="${3:-$PROJECT_ROOT/.env.development.edge}"
  local tmp_file
  tmp_file="$(mktemp)"
  grep -v "^${key}=" "$env_file" > "$tmp_file" || true
  mv "$tmp_file" "$env_file"
  echo "${key}=${value}" >> "$env_file"
}

cp .env.example.edge .env.development.edge

replace_env_var SB_SECRET_KEY "$(get_supabase_env_var SB_SECRET_KEY)"
replace_env_var SB_JWT_ISSUER "http://127.0.0.1:54321/auth/v1"
