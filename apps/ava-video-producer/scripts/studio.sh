#!/bin/bash
if [ "${AVA_PRODUCER_ACTIVE_SCRIPT:-}" != "$0" ]; then
  exec node "$(dirname "$0")/runProducerCommand/runShellCommand.mjs" "studio:licensed" "$0" "$@"
fi
exec 1>&2
set -eu
cd "$(dirname "$0")/.."
node --import tsx scripts/requireLicense.ts
# The shared Remotion config supplies only the public key to Studio.
exec pnpm exec remotion studio "$@"
