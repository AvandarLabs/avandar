#!/usr/bin/env bash
# Orchestrates the three-step Lingui translation pipeline:
#   1. Extract msgid keys from source code into the .po catalogs.
#   2. Use OpenAI (via scripts/i18n/translateWithLLM.ts) to fill empty
#      msgstr entries in every non-English locale.
#   3. Compile the .po catalogs into the runtime .ts modules the app loads.
#
# Usage:
#   pnpm i18n:update-translations               # same as `all`
#   pnpm i18n:update-translations all           # full scan / full translate
#   pnpm i18n:update-translations <path> [...]  # narrow the LLM step to
#                                               # entries referencing any of
#                                               # the given path patterns
#                                               # (substring match against
#                                               # the .po `#:` source refs)
#
# Notes:
#   - Step 1 always scans every path in lingui.config.ts. Narrowing only
#     affects step 2 — the catalogs themselves stay consistent across runs.
#   - If step 1 produces no catalog changes, steps 2 and 3 are skipped.

set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

if [[ -t 1 ]]; then
  CYAN=$'\033[36m'
  YELLOW=$'\033[33m'
  GREEN=$'\033[32m'
  DIM=$'\033[2m'
  BOLD=$'\033[1m'
  RESET=$'\033[0m'
else
  CYAN=''
  YELLOW=''
  GREEN=''
  DIM=''
  BOLD=''
  RESET=''
fi

LOCALES_DIR="src/i18n/locales"
SOURCE_LOCALE="en"

SCOPES=()
if [[ $# -gt 0 && "${1:-}" != "all" ]]; then
  SCOPES=("$@")
fi

if [[ ${#SCOPES[@]} -eq 0 ]]; then
  printf '%s\n' "${BOLD}${CYAN}» Updating translations for ALL paths${RESET}"
else
  printf '%s\n' "${BOLD}${CYAN}» Updating translations scoped to: ${SCOPES[*]}${RESET}"
fi

printf '\n%s\n' "${BOLD}${CYAN}[1/3] Extracting translation keys from source...${RESET}"
if ! pnpm exec lingui extract --overwrite; then
  printf '\n%s\n' "${BOLD}${YELLOW}lingui extract failed.${RESET}" >&2
  exit 1
fi

if git diff --quiet -- "$LOCALES_DIR" 2>/dev/null; then
  printf '\n%s\n' "${DIM}No new keys extracted — skipping LLM translation and compile.${RESET}"
  printf '%s\n' "${BOLD}${GREEN}✓ Translations already up to date.${RESET}"
  exit 0
fi

printf '\n%s\n' "${BOLD}${CYAN}[2/3] Calling OpenAI to translate missing entries...${RESET}"

TARGET_LOCALES=()
for d in "$LOCALES_DIR"/*/; do
  locale="$(basename "$d")"
  if [[ "$locale" != "$SOURCE_LOCALE" ]]; then
    TARGET_LOCALES+=("$locale")
  fi
done

SCOPE_ARGS=()
if [[ ${#SCOPES[@]} -gt 0 ]]; then
  for s in "${SCOPES[@]}"; do
    SCOPE_ARGS+=(--scope "$s")
  done
fi

for locale in "${TARGET_LOCALES[@]}"; do
  printf '\n%s\n' "${YELLOW}  → translating ${BOLD}${locale}${RESET}${YELLOW}...${RESET}"
  if [[ ${#SCOPE_ARGS[@]} -eq 0 ]]; then
    if ! pnpm vite-script scripts/i18n/translateWithLLM.ts --locale "$locale"; then
      printf '%s\n' "${BOLD}${YELLOW}  ✗ ${locale} translation step failed; continuing.${RESET}" >&2
    fi
  else
    if ! pnpm vite-script scripts/i18n/translateWithLLM.ts \
          --locale "$locale" "${SCOPE_ARGS[@]}"; then
      printf '%s\n' "${BOLD}${YELLOW}  ✗ ${locale} translation step failed; continuing.${RESET}" >&2
    fi
  fi
done

printf '\n%s\n' "${BOLD}${CYAN}[3/3] Compiling .po catalogs into runtime .ts modules...${RESET}"
if ! pnpm exec lingui compile --typescript; then
  printf '\n%s\n' "${BOLD}${YELLOW}lingui compile failed.${RESET}" >&2
  exit 1
fi

printf '\n%s\n' "${BOLD}${GREEN}✓ Translations updated.${RESET}"
