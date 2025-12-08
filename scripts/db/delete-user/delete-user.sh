#!/bin/bash

source scripts/utils/common.sh

run_vite_script \
  "${SCRIPTS_DIR}/db/delete-user/delete-user.main.ts" -- \
  "$@"

