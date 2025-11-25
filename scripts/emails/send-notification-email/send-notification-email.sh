#!/bin/bash

source scripts/utils/common.sh

run_vite_script \
  "${SCRIPTS_DIR}/emails/send-notification-email/send-notification-email.main.tsx" -- \
  "$@"

