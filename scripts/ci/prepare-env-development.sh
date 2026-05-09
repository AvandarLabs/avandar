#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# Creates `.env.development` for CI, because that file does not actually exist
# in the repo (it is gitignored). So we have to prepare it in CI before we can
# run e2e tests which require a running server.
# ------------------------------------------------------------------------------
source scripts/ci/common.sh

# Exit on error or undefined variable.
set -euo pipefail

ENV_FILE_NAME=".env.development"

# Declare env dictionar
declare -A _development_env=(
  [VITE_APP_URL]="http://127.0.0.1:5173/"
  [VITE_SUPABASE_API_URL]="$(get_supabase_env_var API_URL)"
  [VITE_SUPABASE_ANON_KEY]="$(get_supabase_env_var PUBLISHABLE_KEY)"
  [VITE_HIDE_DEV_TOOLS]="true"
)

cp .env.example $ENV_FILE_NAME

for _key in "${!_development_env[@]}"; do
  replace_env_var "$_key" "${_development_env[$_key]}" "$ENV_FILE_NAME"
done
