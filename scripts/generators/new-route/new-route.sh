#!/bin/bash

source scripts/utils/common.sh

run_vite_script \
  "${SCRIPTS_DIR}/generators/new-route/new-route.main.ts" -- \
  "$@"