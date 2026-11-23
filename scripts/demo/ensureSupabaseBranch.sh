#!/bin/bash
#-------------------------------------------------------------------------------
# Makes sure the Supabase branch for the current `demo/*` Git branch exists on
# the staging project, waits for it to be healthy, and prints its connection
# details as `KEY=value` lines to `$DEMO_ENV_FILE` (stdout when unset).
#
# The Supabase branch name is the Git branch name with `/` replaced by `-`, so
# `demo/measles` maps to `demo-measles`. A branch that does not exist yet is
# created as a non-persistent branch: it is billed only while it exists and
# auto-pauses when idle.
#
# Usage:
#   STAGING_PROJECT_ID=<ref> bash scripts/demo/ensureSupabaseBranch.sh <git-branch>
#
# Requires `SUPABASE_ACCESS_TOKEN`, `curl`, and `jq`.
#
# Output, one per line:
#   DEMO_SUPABASE_BRANCH, DEMO_SUPABASE_REF, DEMO_SUPABASE_URL,
#   DEMO_DB_PASSWORD, DEMO_PUBLISHABLE_KEY, DEMO_SECRET_KEY
#
# Progress goes to stderr. In GitHub Actions every secret value is masked on
# stdout, where Actions reads workflow commands, before it is written out.
#-------------------------------------------------------------------------------
set -euo pipefail

GIT_BRANCH="${1:?Usage: ensureSupabaseBranch.sh <git-branch>}"
: "${STAGING_PROJECT_ID:?STAGING_PROJECT_ID must be set}"
: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN must be set}"

# How long to wait for a new branch to become healthy, in seconds.
WAIT_TIMEOUT_SECONDS=900
POLL_INTERVAL_SECONDS=15

if [[ "$GIT_BRANCH" != demo/* ]]; then
  echo "Refusing to manage a Supabase branch for '$GIT_BRANCH': only demo/* branches are allowed." >&2
  exit 1
fi

SUPABASE_BRANCH="${GIT_BRANCH//\//-}"

log() {
  echo "$@" >&2
}

mask() {
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::add-mask::$1"
  fi
}

find_branch_json() {
  supabase branches list --project-ref "$STAGING_PROJECT_ID" -o json \
    | jq -c --arg name "$SUPABASE_BRANCH" '.[] | select(.name == $name)'
}

create_branch() {
  local region
  region="$(
    supabase projects list -o json \
      | jq -r --arg ref "$STAGING_PROJECT_ID" '.[] | select(.id == $ref or .ref == $ref) | .region' \
      | head -n 1
  )"
  log "Creating Supabase branch '$SUPABASE_BRANCH' in region '${region:-default}'..."
  if [[ -n "$region" ]]; then
    supabase branches create "$SUPABASE_BRANCH" \
      --project-ref "$STAGING_PROJECT_ID" --region "$region" >&2
  else
    supabase branches create "$SUPABASE_BRANCH" \
      --project-ref "$STAGING_PROJECT_ID" >&2
  fi
}

wait_until_healthy() {
  local elapsed=0 branch_json status project_status
  while ((elapsed < WAIT_TIMEOUT_SECONDS)); do
    branch_json="$(find_branch_json)"
    status="$(jq -r '.status // ""' <<<"$branch_json")"
    project_status="$(jq -r '.preview_project_status // ""' <<<"$branch_json")"
    log "Branch status: ${status:-unknown}, project status: ${project_status:-unknown}"
    if [[ "$project_status" == "ACTIVE_HEALTHY" ]]; then
      case "$status" in
        MIGRATIONS_PASSED | FUNCTIONS_DEPLOYED | MIGRATIONS_FAILED | FUNCTIONS_FAILED)
          # Failed steps here come from Supabase's own branch setup. The
          # workflow applies migrations and functions itself right after this,
          # so a healthy project is all that is needed.
          return 0
          ;;
      esac
    fi
    sleep "$POLL_INTERVAL_SECONDS"
    elapsed=$((elapsed + POLL_INTERVAL_SECONDS))
  done
  log "Timed out after ${WAIT_TIMEOUT_SECONDS}s waiting for '$SUPABASE_BRANCH' to become healthy."
  return 1
}

if [[ -z "$(find_branch_json)" ]]; then
  create_branch
else
  log "Supabase branch '$SUPABASE_BRANCH' already exists."
fi
wait_until_healthy

BRANCH_REF="$(find_branch_json | jq -r '.project_ref')"
if [[ -z "$BRANCH_REF" || "$BRANCH_REF" == "$STAGING_PROJECT_ID" ]]; then
  log "Refusing to continue: '$SUPABASE_BRANCH' resolved to the staging project itself."
  exit 1
fi

BRANCH_ENV="$(supabase branches get "$SUPABASE_BRANCH" --project-ref "$STAGING_PROJECT_ID" -o env)"
POSTGRES_URL_NON_POOLING="$(grep '^POSTGRES_URL_NON_POOLING=' <<<"$BRANCH_ENV" | cut -d= -f2- | tr -d '"')"
DB_PASSWORD="$(
  python3 -c 'import sys, urllib.parse; print(urllib.parse.unquote(urllib.parse.urlparse(sys.argv[1]).password or ""))' \
    "$POSTGRES_URL_NON_POOLING"
)"

# `supabase projects api-keys` masks secret keys (`sb_secret_` followed by
# placeholder characters), and a masked key fails every admin-client request
# the edge functions make. The Management API returns the real key only when
# asked with `reveal=true`.
API_KEYS_JSON="$(
  curl --fail --silent --show-error \
    --header "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$BRANCH_REF/api-keys?reveal=true"
)"
PUBLISHABLE_KEY="$(jq -r '[.[] | select(.type == "publishable")][0].api_key // ""' <<<"$API_KEYS_JSON")"
SECRET_KEY="$(jq -r '[.[] | select(.type == "secret")][0].api_key // ""' <<<"$API_KEYS_JSON")"

if [[ -z "$DB_PASSWORD" || -z "$PUBLISHABLE_KEY" || -z "$SECRET_KEY" ]]; then
  log "Could not read the database password or API keys for '$SUPABASE_BRANCH'."
  exit 1
fi

mask "$DB_PASSWORD"
mask "$PUBLISHABLE_KEY"
mask "$SECRET_KEY"

{
  echo "DEMO_SUPABASE_BRANCH=$SUPABASE_BRANCH"
  echo "DEMO_SUPABASE_REF=$BRANCH_REF"
  echo "DEMO_SUPABASE_URL=https://$BRANCH_REF.supabase.co"
  echo "DEMO_DB_PASSWORD=$DB_PASSWORD"
  echo "DEMO_PUBLISHABLE_KEY=$PUBLISHABLE_KEY"
  echo "DEMO_SECRET_KEY=$SECRET_KEY"
} >>"${DEMO_ENV_FILE:-/dev/stdout}"
