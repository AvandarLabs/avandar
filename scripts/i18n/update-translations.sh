#!/usr/bin/env bash
# Orchestrates the three-step Lingui translation pipeline:
#   1. Extract msgid keys from source code into the .po catalogs.
#   2. Use OpenAI (via scripts/i18n/translateWithLlm/translateWithLlm.ts) to fill empty
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
#     affects step 2; the catalogs themselves stay consistent across runs.
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

# Returns 0 (success) if any non-source catalog contains an untranslated entry:
# an empty `msgstr ""` that is neither the PO header (whose msgstr is followed
# by continuation lines) nor otherwise continued. `lingui extract` only rewrites
# a catalog when a msgid is added or removed, so once an empty msgstr has been
# committed it produces no extract diff and the git-diff gate below never sees
# it; the translation step would be skipped forever. This catches those
# entries directly so they always get sent to the LLM.
has_untranslated_entries() {
  local d locale
  for d in "$LOCALES_DIR"/*/; do
    locale="$(basename "$d")"
    [[ "$locale" == "$SOURCE_LOCALE" ]] && continue
    [[ -f "${d}messages.po" ]] || continue
    if awk '
      pending && $0 !~ /^"/ { found=1; pending=0 }
      /^msgstr ""$/         { pending=1; next }
                            { pending=0 }
      END { if (pending) found=1; exit found ? 0 : 1 }
    ' "${d}messages.po"; then
      return 0
    fi
  done
  return 1
}

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
# --clean (not --overwrite) so msgids no longer present in source are removed
# outright rather than retained as obsolete `#~` entries. This keeps the .po
# catalogs from accumulating dangling translations when UI strings are deleted.
if ! pnpm exec lingui extract --clean; then
  printf '\n%s\n' "${BOLD}${YELLOW}lingui extract failed.${RESET}" >&2
  exit 1
fi

if git diff --quiet -- "$LOCALES_DIR" 2>/dev/null && ! has_untranslated_entries; then
  printf '\n%s\n' "${DIM}No new or untranslated keys; skipping LLM translation and compile.${RESET}"
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
    if ! pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts --locale "$locale"; then
      printf '%s\n' "${BOLD}${YELLOW}  ✗ ${locale} translation step failed; continuing.${RESET}" >&2
    fi
  else
    if ! pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts \
          --locale "$locale" "${SCOPE_ARGS[@]}"; then
      printf '%s\n' "${BOLD}${YELLOW}  ✗ ${locale} translation step failed; continuing.${RESET}" >&2
    fi
  fi
done

# Step 3 re-canonicalizes the catalogs. translateWithLlm.ts writes msgstr
# entries with its own minimal serializer, which does NOT reproduce Lingui's
# PO line-wrapping (long strings wrapped at ~76 columns by @lingui/format-po).
# Re-running extract rewrites every catalog in Lingui's canonical format while
# preserving the translations we just filled, so the committed files match
# exactly what the next `lingui extract` would produce. Without this, the
# pre-push hook re-wraps the catalogs on the following push and reports a
# spurious diff even when no source strings changed. --clean here mirrors the
# extract in step 1 so the normalized output is identical to the next run.
printf '\n%s\n' "${BOLD}${CYAN}[3/4] Normalizing catalog formatting (Lingui canonical PO)...${RESET}"
if ! pnpm exec lingui extract --clean; then
  printf '\n%s\n' "${BOLD}${YELLOW}lingui extract (normalize) failed.${RESET}" >&2
  exit 1
fi

printf '\n%s\n' "${BOLD}${CYAN}[4/4] Compiling .po catalogs into runtime .ts modules...${RESET}"
if ! pnpm exec lingui compile --typescript; then
  printf '\n%s\n' "${BOLD}${YELLOW}lingui compile failed.${RESET}" >&2
  exit 1
fi

printf '\n%s\n' "${BOLD}${GREEN}✓ Translations updated.${RESET}"
