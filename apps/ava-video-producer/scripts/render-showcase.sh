#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node scripts/require-license.mjs
npm run typecheck
npm run video -- preview storyboards/home.json
TITLE_OFFSET=0 sh scripts/preview.sh title-study 8 30 90 114 174 198
sh scripts/preview.sh motion-lab
if [ "${PREVIEW_ONLY:-0}" = 1 ]; then
  printf '\nInspect previews under out/ before rendering.\n'
  exit 0
fi
npm run video -- render storyboards/home.json
sh scripts/render.sh title-study 114
sh scripts/render.sh motion-lab 300
printf '\nChecked exports are under out/. The showcase uses live components.\n'
