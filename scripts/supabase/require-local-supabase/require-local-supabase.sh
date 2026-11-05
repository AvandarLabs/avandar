#!/usr/bin/env bash

# Refuses to continue while this worktree is switched to a hosted Supabase
# project with `ava supabase switch remote`.
#
# A remote switch points the app's Supabase variables at the hosted project but
# leaves the Supabase CLI on the shared local stack. A database script run in
# that state would reset the shared stack every other worktree uses, then seed
# the hosted project. Database scripts call this first so neither can happen.
#
# Usage: scripts/supabase/require-local-supabase/require-local-supabase.sh [project-root]

set -uo pipefail

if [[ -t 2 ]]; then
  RED=$'\033[31m'
  YELLOW=$'\033[33m'
  RESET=$'\033[0m'
else
  RED=''
  YELLOW=''
  RESET=''
fi

PROJECT_ROOT="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
ENV_PATH="$PROJECT_ROOT/.env.development"

remote_project_id="${AVA_SUPABASE_REMOTE_PROJECT_ID:-}"
if [ -z "$remote_project_id" ] && [ -f "$ENV_PATH" ]; then
  remote_project_id="$(grep '^AVA_SUPABASE_REMOTE_PROJECT_ID=' "$ENV_PATH" |
    tail -n 1 | cut -d '=' -f2- | tr -d "\"' \t\r")"
fi

if [ -z "$remote_project_id" ]; then
  exit 0
fi

echo "${RED}❌ This worktree is switched to the hosted Supabase project ${remote_project_id}, so database scripts are blocked.${RESET}" >&2
echo "${YELLOW}  ⚠️ Run 'ava supabase restore' to go back to a local Supabase, then retry.${RESET}" >&2
exit 1
