#!/bin/bash
#-------------------------------------------------------------------------------
# Deploys the pipeline server to the Fly app `.env.pipeline-server.prod`
# names. Run it as `pnpm deploy:pipeline-server`.
#-------------------------------------------------------------------------------
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${DEPLOY_DIR}/../../.." && pwd)"
ENV_FILE="${AVA_PIPELINE_SERVER_ENV_FILE:-${PROJECT_ROOT}/.env.pipeline-server.prod}"
COMMAND="deploy:pipeline-server"
# shellcheck source=apps/pipeline-server/deploy/output.sh
source "${DEPLOY_DIR}/output.sh"

print_usage() {
  theme_heading "deploy:pipeline-server - deploy the pipeline server to Fly"
  cat <<USAGE

Reads the Fly app, region, machine size, and volume from
.env.pipeline-server.prod at the repository root, renders
apps/pipeline-server/deploy/fly.toml.template with them, and runs
\`fly deploy\` from the repository root. Takes no arguments.

Deploying needs Fly credentials with access to that app: \`fly auth login\`,
or FLY_API_TOKEN set in the env file. Without them nothing is deployed. To
self-host, point the env file at a Fly app of your own.

$(theme_heading "Usage:")
  pnpm deploy:pipeline-server
  pnpm deploy:pipeline-server -h | --help

$(theme_heading "Environment:")
  AVA_PIPELINE_SERVER_ENV_FILE  Reads this env file instead.
                                Default: <repo>/.env.pipeline-server.prod

$(theme_heading "Examples:")
  cp .env.pipeline-server.prod.example .env.pipeline-server.prod
  pnpm deploy:pipeline-server
  AVA_PIPELINE_SERVER_ENV_FILE=.env.pipeline-server.staging pnpm deploy:pipeline-server
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

theme_info "Reading the Fly target from ${ENV_FILE}"
if [[ ! -f "$ENV_FILE" ]]; then
  theme_error "$COMMAND" "${ENV_FILE} does not exist." \
    "Copy .env.pipeline-server.prod.example to .env.pipeline-server.prod and fill it in, then retry."
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if ! command -v fly > /dev/null 2>&1; then
  theme_error "$COMMAND" "flyctl is not installed." \
    "Install it (brew install flyctl, or see fly.io/docs/flyctl/install), then retry."
  exit 1
fi

theme_info "Checking your Fly credentials"
if ! fly auth whoami > /dev/null 2>&1; then
  theme_error "$COMMAND" "Fly does not recognize any credentials." \
    "Run fly auth login, or set FLY_API_TOKEN in ${ENV_FILE}, then retry."
  exit 1
fi

rendered_dir="$(mktemp -d)"
trap 'rm -rf "$rendered_dir"' EXIT
theme_info "Rendering the Fly config for ${FLY_APP_NAME:-<unset app>}"
"${DEPLOY_DIR}/render-fly-config.sh" > "${rendered_dir}/fly.toml"

code_version="$(git -C "$PROJECT_ROOT" rev-parse HEAD 2> /dev/null || true)"
theme_info "Deploying ${FLY_APP_NAME} with fly deploy (this builds an image and can take several minutes)"
cd "$PROJECT_ROOT"
# --ha=false: the server's data volume attaches to one machine only.
if ! fly deploy . \
  --config "${rendered_dir}/fly.toml" \
  --dockerfile apps/pipeline-server/Dockerfile \
  --app "$FLY_APP_NAME" \
  --ha=false \
  --build-arg "AVA_CODE_VERSION=${code_version}" 1>&2; then
  theme_error "$COMMAND" "fly deploy failed." \
    "Read the fly output above. Check fly status --app ${FLY_APP_NAME}, then retry."
  exit 1
fi

theme_success "Deployed ${FLY_APP_NAME}. Check it with: fly status --app ${FLY_APP_NAME}"
