#!/bin/bash
set -eu
cd "$(dirname "$0")/.."
node --import tsx scripts/requireLicense.ts
# The shared Remotion config supplies only the public key to Studio.
exec pnpm exec remotion studio "$@"
