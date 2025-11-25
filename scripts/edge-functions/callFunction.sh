#!/bin/bash

PROJECT_ROOT=$(npm run -s util:get-project-root)
cd "$PROJECT_ROOT" || exit

SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

npm run vite-script ${SCRIPTS_DIR}/edge-functions/callFunction/main.ts "$@"