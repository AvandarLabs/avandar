#!/bin/bash

PROJECT_ROOT=$(pnpm -s util:get-project-root)
cd "$PROJECT_ROOT" || exit

SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

pnpm vite-script ${SCRIPTS_DIR}/edge-functions/newEdgeFunction/main.ts "$@"