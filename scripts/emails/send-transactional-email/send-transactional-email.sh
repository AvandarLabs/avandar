#!/bin/bash

source scripts/utils/common.sh

run_vite_script \
  "${SCRIPTS_DIR}/emails/send-transactional-email/send-transactional-email.main.tsx" -- \
  "$@"