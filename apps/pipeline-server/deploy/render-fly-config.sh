#!/bin/bash
#-------------------------------------------------------------------------------
# Prints the pipeline server's Fly config, filling `fly.toml.template` from
# the environment. Used by `deploy-pipeline-server.sh`.
#-------------------------------------------------------------------------------
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${DEPLOY_DIR}/fly.toml.template"
COMMAND="render-fly-config.sh"
# shellcheck source=apps/pipeline-server/deploy/output.sh
source "${DEPLOY_DIR}/output.sh"

print_usage() {
  theme_heading "render-fly-config.sh - print the pipeline server's Fly config"
  cat <<USAGE

Fills each \${NAME} in apps/pipeline-server/deploy/fly.toml.template from the
environment and prints the result to stdout. Fails, naming every missing
variable, when one is unset or empty. Takes no arguments.

$(theme_heading "Usage:")
  render-fly-config.sh
  render-fly-config.sh -h | --help

$(theme_heading "Environment:")
  FLY_APP_NAME, FLY_PRIMARY_REGION, FLY_VM_SIZE, FLY_VM_MEMORY,
  FLY_VOLUME_NAME, AVA_DUCKDB_MEMORY_LIMIT
  See .env.pipeline-server.prod.example for what each one means.

$(theme_heading "Examples:")
  set -a; . ./.env.pipeline-server.prod; set +a
  apps/pipeline-server/deploy/render-fly-config.sh > /tmp/fly.toml
USAGE
}

case "${1:-}" in
  -h | --help)
    print_usage
    exit 0
    ;;
  "") ;;
  *)
    print_usage >&2
    theme_error "$COMMAND" "Unknown argument: $1" \
      "Run it with no arguments, or with --help."
    exit 2
    ;;
esac

missing_names=()
while read -r name; do
  if [[ -z "${!name:-}" ]]; then
    missing_names+=("$name")
  fi
done < <(grep -o '\${[A-Z_][A-Z0-9_]*}' "$TEMPLATE" | tr -d '${}' | sort -u)

if ((${#missing_names[@]} > 0)); then
  theme_error "$COMMAND" "Missing ${missing_names[*]}." \
    "Set them in .env.pipeline-server.prod (see .env.pipeline-server.prod.example), then retry."
  exit 1
fi

perl -pe 's/\$\{([A-Z_][A-Z0-9_]*)\}/$ENV{$1}/g' "$TEMPLATE"
