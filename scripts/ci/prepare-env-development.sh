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

# Declare env dictionary
declare -A _development_env=(
  [SB_SECRET_KEY]="$(get_supabase_env_var SECRET_KEY)"
  [SB_JWT_ISSUER]="http://127.0.0.1:54321/auth/v1"
)

cp .env.example .env.development

for _key in "${!_development_env[@]}"; do
  replace_env_var "$_key" "${_development_env[$_key]}" "$ENV_FILE_NAME"
done
