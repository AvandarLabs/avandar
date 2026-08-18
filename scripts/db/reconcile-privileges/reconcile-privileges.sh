#!/bin/bash

source scripts/utils/common.sh

run_vite_script \
  "${SCRIPTS_DIR}/db/reconcile-privileges/reconcile-privileges.main.ts" -- \
  "$@"
