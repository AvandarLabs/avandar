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
  # App environment
  [SB_SECRET_KEY]="$(get_supabase_env_var SECRET_KEY)"
  [SB_JWT_ISSUER]="http://127.0.0.1:54321/auth/v1"
  [MODE]="development"
  [VITE_APP_URL]="http://localhost:5173/"

  # Google environment variables
  [GOOGLE_CLIENT_ID]="$GOOGLE_CLIENT_ID"
  [GOOGLE_CLIENT_SECRET]="$GOOGLE_CLIENT_SECRET"
  [GOOGLE_REDIRECT_URI]="$GOOGLE_REDIRECT_URI"

  # Billing/Polar
  [POLAR_ACCESS_TOKEN]="$POLAR_ACCESS_TOKEN"
  [POLAR_SERVER_TYPE]="sandbox"

  # Upstash + Redis
  [UPSTASH_REDIS_API_URL]="$UPSTASH_REDIS_API_URL"
  [UPSTASH_REDIS_REST_API_TOKEN]="$UPSTASH_REDIS_REST_API_TOKEN"

  # Email
  [RESEND_SENDING_API_KEY]="$RESEND_SENDING_API_KEY"
  [RESEND_FULL_ACCESS_API_KEY]="$RESEND_FULL_ACCESS_API_KEY"
  [RESEND_SITE_IMG_URL]="https://avandarlabs.com"

  # Email local testing
  [DEV_EMAIL_OVERRIDE]="delivered@resend.dev"
  [RESEND_LOCAL_TEST_SEGMENT_ID]="$RESEND_LOCAL_TEST_SEGMENT_ID"

  # OpenAI
  [OPENAI_API_KEY]="$OPENAI_API_KEY"
  [OPEN_ROUTER_API_KEY]="$OPEN_ROUTER_API_KEY"

  # Featurebase (Customer support)
  [FEATUREBASE_JWT_SECRET]="$FEATUREBASE_JWT_SECRET"
)

cp .env.example.edge $ENV_FILE_NAME

for _key in "${!_edge_env[@]}"; do
  replace_env_var "$_key" "${_edge_env[$_key]}" "$ENV_FILE_NAME"
done

pnpm fns:update-env
