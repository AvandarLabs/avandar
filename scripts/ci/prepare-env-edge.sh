#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# Creates `.env.development.edge` for CI, because that file does not actually
# exist in the repo (it is gitignored). So we have to prepare it in CI by
# before we can run `pnpm fns:update-env` (which will then move the prepared
# variables to `supabase/functions/.env` so supabase can be started, which we
# need in order to run e2e tests).
# ------------------------------------------------------------------------------
source scripts/ci/common.sh

# Exit on error or undefined variable.
set -euo pipefail

ENV_FILE_NAME=".env.development.edge"

# Declare env dictionary
declare -A _edge_env=(
  [SB_SECRET_KEY]="$(get_supabase_env_var SECRET_KEY)"
  [SB_JWT_ISSUER]="http://127.0.0.1:54321/auth/v1"
)

cp .env.example.edge .env.development.edge


for _key in "${!_edge_env[@]}"; do
  replace_env_var "$_key" "${_edge_env[$_key]}" "$ENV_FILE_NAME"
done

pnpm fns:update-env
