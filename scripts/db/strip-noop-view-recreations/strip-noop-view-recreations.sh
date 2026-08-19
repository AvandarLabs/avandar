#!/bin/bash

source scripts/utils/common.sh

run_vite_script \
  "${SCRIPTS_DIR}/db/strip-noop-view-recreations/strip-noop-view-recreations.main.ts" -- \
  "$@"
