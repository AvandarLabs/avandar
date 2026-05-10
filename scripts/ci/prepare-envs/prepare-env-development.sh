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
  # Public environment variables.
  [VITE_APP_URL]="http://127.0.0.1:5173/"
  [VITE_SUPABASE_API_URL]="$(get_supabase_env_var API_URL)"
  [VITE_SUPABASE_ANON_KEY]="$(get_supabase_env_var PUBLISHABLE_KEY)"
  [VITE_HIDE_DEV_TOOLS]="true"
  [VITE_FEATURE_FLAGS]=""
  [VITE_GOOGLE_PICKER_API_KEY]="$VITE_GOOGLE_PICKER_API_KEY"

  # Environment variables for scripts
  [SUPABASE_POSTGRES_URL]="$(get_supabase_env_var DB_URL)"
  [SUPABASE_SERVICE_ROLE_KEY]="$(get_supabase_env_var SECRET_KEY)"
  [SUPABASE_URL]="$(get_supabase_env_var API_URL)"

  # ignore reverse proxy URL for CI/CD. We should not be testing 3rd party
  # service webhooks in CI/CD.
  [REVERSE_PROXY_URL]="__ignored__"

  # Upstash + Redis
  [UPSTASH_REDIS_API_URL]="$UPSTASH_REDIS_API_URL"
  [UPSTASH_REDIS_REST_API_TOKEN]="$UPSTASH_REDIS_REST_API_TOKEN"

  # Email
  [RESEND_API_KEY]="$RESEND_API_KEY"
  [RESEND_SITE_IMG_URL]="https://avandarlabs.com"

  # Email local testing
  [DEV_EMAIL_OVERRIDE]="delivered@resend.dev"
  [RESEND_LOCAL_TEST_SEGMENT_ID]="$RESEND_LOCAL_TEST_SEGMENT_ID"

  # Billing/Polar
  [POLAR_ACCESS_TOKEN]="$POLAR_ACCESS_TOKEN"
  [POLAR_SERVER_TYPE]="sandbox"

  # Dev Fanout Server
  # We ignore these env vars for CI/CD. We should not be testing 3rd party
  # service webhooks in CI/CD.
  AVA_DEV_FANOUT_SERVER_URL="__ignored__"
  AVA_DEV_FANOUT_ADMIN_SERVER_SECRET="__ignored__"

  # Pipeline Server
  AVA_PIPELINE_SERVER_URL="http://127.0.0.1:4611"
  AVA_PIPELINE_SERVER_SECRET="$AVA_PIPELINE_SERVER_SECRET"
)

cp .env.example $ENV_FILE_NAME

for _key in "${!_development_env[@]}"; do
  replace_env_var "$_key" "${_development_env[$_key]}" "$ENV_FILE_NAME"
done
