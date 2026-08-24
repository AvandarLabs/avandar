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

# ------------------------------------------------------------------------------
# The Picker's app id is the Cloud project number, and that number is the
# numeric prefix of the OAuth client id. Derived from `GOOGLE_CLIENT_ID` rather
# than carried as a secret of its own, so the two cannot drift into different
# Cloud projects - a misconfiguration whose only symptom is a 404 on a Drive
# export, long after the Picker appeared to work. It is not sensitive; it is
# already public in the client id.
#
# It is required rather than optional: `useGooglePicker` throws without it,
# which takes the Connectors tab down with the error boundary and leaves the
# Google Sheets e2e with no "Pick google sheet" button to click.
#
# Checked in two steps because `${GOOGLE_CLIENT_ID%%-*}` on its own would NOT
# trip `set -u` for an unset variable - it quietly expands to the empty string,
# which would write an empty app id and produce exactly that confusing e2e
# failure. `:?` is what makes a missing secret fail here instead.
# ------------------------------------------------------------------------------
_google_client_id="${GOOGLE_CLIENT_ID:?GOOGLE_CLIENT_ID is required to derive VITE_GOOGLE_PICKER_APP_ID}"
_google_picker_app_id="${_google_client_id%%-*}"
if [[ ! "$_google_picker_app_id" =~ ^[0-9]+$ ]]; then
  echo "GOOGLE_CLIENT_ID does not start with a numeric Cloud project number;" \
    "cannot derive VITE_GOOGLE_PICKER_APP_ID from '$_google_client_id'." >&2
  exit 1
fi

# Declare env dictionar
declare -A _development_env=(
  # Public environment variables.
  [VITE_APP_URL]="http://localhost:5173/"
  [VITE_SUPABASE_API_URL]="$(get_supabase_env_var API_URL)"
  [VITE_SUPABASE_ANON_KEY]="$(get_supabase_env_var PUBLISHABLE_KEY)"
  [VITE_HIDE_DEV_TOOLS]="true"
  [VITE_FEATURE_FLAGS]=""
  [VITE_GOOGLE_PICKER_API_KEY]="$VITE_GOOGLE_PICKER_API_KEY"
  [VITE_GOOGLE_PICKER_APP_ID]="$_google_picker_app_id"

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
  [RESEND_SENDING_API_KEY]="$RESEND_SENDING_API_KEY"
  [RESEND_FULL_ACCESS_API_KEY]="$RESEND_FULL_ACCESS_API_KEY"
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
  [AVA_DEV_FANOUT_SERVER_URL]="__ignored__"
  [AVA_DEV_FANOUT_ADMIN_SERVER_SECRET]="__ignored__"

  # Pipeline Server
  [AVA_PIPELINE_SERVER_URL]="http://127.0.0.1:4611"
  [AVA_PIPELINE_SERVER_SECRET]="$AVA_PIPELINE_SERVER_SECRET"

  # OpenAI
  [OPENAI_API_KEY]="$OPENAI_API_KEY"
  [OPEN_ROUTER_API_KEY]="$OPEN_ROUTER_API_KEY"
)

cp .env.example $ENV_FILE_NAME

for _key in "${!_development_env[@]}"; do
  replace_env_var "$_key" "${_development_env[$_key]}" "$ENV_FILE_NAME"
done
