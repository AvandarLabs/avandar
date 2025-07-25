#!/bin/bash

PROJECT_ROOT=$(yarn --silent util:get-project-root)
cd "$PROJECT_ROOT" || exit

SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

yarn vite-script ${SCRIPTS_DIR}/edge-functions/callFunction/main.ts "$@"