#!/bin/bash
#-------------------------------------------------------------------------------
# Copies the data in this worktree's local Supabase database into the current
# `demo/*` branch's Supabase branch on the staging project, replacing what is
# there. Use it to load demo data that was built locally (seed users,
# workspaces, pipeline output) into a hosted demo.
#
# What is copied: every table in `public`, plus `auth.users`,
# `auth.identities` and the other auth rows a login needs. Sessions, refresh
# tokens, audit logs, migration history and storage are not copied. Storage
# buckets already exist on the branch because migrations create them, and
# files in storage are not transferred.
#
# Usage, from the worktree root, after the demo workflow has created the
# Supabase branch:
#   bash scripts/demo/loadLocalDataIntoDemoBranch.sh
#
# Requires a running local Supabase for this worktree, Docker, `jq`, and a
# Supabase CLI that is logged in (`supabase login`). `STAGING_PROJECT_ID`
# defaults to the project in `.env.staging`.
#-------------------------------------------------------------------------------
set -euo pipefail

source scripts/utils/common.sh

AUTH_TABLES_TO_SKIP=(
  auth.schema_migrations
  auth.sessions
  auth.refresh_tokens
  auth.refresh_tokens_id_seq
  auth.mfa_amr_claims
  auth.audit_log_entries
  auth.flow_state
  auth.one_time_tokens
)

GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$GIT_BRANCH" != demo/* ]]; then
  echo "Run this from a demo/* branch. The current branch is '$GIT_BRANCH'." >&2
  exit 1
fi
SUPABASE_BRANCH="${GIT_BRANCH//\//-}"

STAGING_PROJECT_ID="${STAGING_PROJECT_ID:-$(
  grep '^VITE_SUPABASE_API_URL=' .env.staging | sed -E 's#.*https://([a-z0-9]+)\..*#\1#'
)}"

LOCAL_PROJECT_ID="$(grep -E '^project_id' supabase/config.toml | cut -d'"' -f2)"
LOCAL_DB_CONTAINER="supabase_db_${LOCAL_PROJECT_ID}"
if ! docker inspect "$LOCAL_DB_CONTAINER" >/dev/null 2>&1; then
  echo "Local database container '$LOCAL_DB_CONTAINER' is not running. Start it with 'supabase start'." >&2
  exit 1
fi

BRANCH_JSON="$(
  supabase branches list --project-ref "$STAGING_PROJECT_ID" -o json \
    | jq -c --arg name "$SUPABASE_BRANCH" '.[] | select(.name == $name)'
)"
if [[ -z "$BRANCH_JSON" ]]; then
  echo "Supabase branch '$SUPABASE_BRANCH' does not exist yet. Push $GIT_BRANCH so the demo workflow creates it." >&2
  exit 1
fi
BRANCH_REF="$(jq -r '.project_ref' <<<"$BRANCH_JSON")"
if [[ "$BRANCH_REF" == "$STAGING_PROJECT_ID" ]]; then
  echo "Refusing to load data: '$SUPABASE_BRANCH' resolved to the staging project itself." >&2
  exit 1
fi

# Supavisor serves session mode on port 5432 of the same pooler host as
# transaction mode (6543). Session mode keeps the whole load in one session,
# and the pooler is reachable over IPv4, unlike the direct database host.
REMOTE_DB_URL="$(
  supabase branches get "$SUPABASE_BRANCH" --project-ref "$STAGING_PROJECT_ID" -o env \
    | grep '^POSTGRES_URL=' | cut -d= -f2- | tr -d '"' \
    | sed -E 's#:6543/#:5432/#; s#\?.*$##'
)"

echo "Source:      local database '$LOCAL_PROJECT_ID'"
echo "Destination: Supabase branch '$SUPABASE_BRANCH' ($BRANCH_REF)"
echo "Every row in the destination's public tables will be replaced."
read -r -p "Type the branch name ($SUPABASE_BRANCH) to continue: " CONFIRMATION
if [[ "$CONFIRMATION" != "$SUPABASE_BRANCH" ]]; then
  echo "Cancelled." >&2
  exit 1
fi

local_psql() {
  docker exec -i -e PGPASSWORD=postgres "$LOCAL_DB_CONTAINER" \
    psql -h 127.0.0.1 -U supabase_admin -d postgres -At "$@"
}

remote_psql() {
  docker exec -i -e REMOTE_DB_URL="$REMOTE_DB_URL" "$LOCAL_DB_CONTAINER" \
    sh -c 'psql "$REMOTE_DB_URL" "$@"' psql "$@"
}

PUBLIC_TABLES="$(
  local_psql -c "select string_agg(format('%I.%I', schemaname, tablename), ', ')
    from pg_tables where schemaname = 'public'"
)"
REMOTE_AUTH_USER_COUNT="$(remote_psql -At -c 'select count(*) from auth.users')"

SKIP_ARGS=()
for table in "${AUTH_TABLES_TO_SKIP[@]}"; do
  SKIP_ARGS+=("--exclude-table=$table")
done

DUMP_FILE="$(mktemp)"
trap 'rm -f "$DUMP_FILE"' EXIT
{
  echo "SET session_replication_role = replica;"
  echo "TRUNCATE $PUBLIC_TABLES CASCADE;"
  if ((REMOTE_AUTH_USER_COUNT > 0)); then
    echo "TRUNCATE auth.users CASCADE;"
  fi
  docker exec -e PGPASSWORD=postgres "$LOCAL_DB_CONTAINER" \
    pg_dump -h 127.0.0.1 -U supabase_admin -d postgres --data-only \
    --schema=public --schema=auth "${SKIP_ARGS[@]}"
} >"$DUMP_FILE"

echo "Loading data into '$SUPABASE_BRANCH'..."
remote_psql --single-transaction -v ON_ERROR_STOP=1 -q <"$DUMP_FILE"
echo "Done. Row counts in the destination:"
remote_psql -c "select 'auth.users', count(*) from auth.users
  union all select 'public.workspaces', count(*) from public.workspaces
  union all select 'public.data_catalog_listings', count(*) from public.data_catalog_listings"
