# 080 — Translate-with-LLM script

- **Slug**: `i18n-translate-llm-script`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-080/i18n-translate-llm-script`
- **Depends on**: `078-lingui-scaffold`.
- **Estimated PR size**: medium — 1 script + 32 unit tests, ~600 lines.

## Notes for future you

- Uses OpenAI Chat Completions (not Anthropic, not Supabase). Keep the API key in `.env` (not committed).
- 32 unit tests. Preserve them.
- CLI flags: `--help`, `--scope`, `--locale`, `--all`, `--model`, `--dry-run`. PO comments / references are preserved across translation.

## What this feature is

`scripts/i18n/translateWithLLM.ts` — a translation pipeline:

- Reads source PO catalogs.
- Calls OpenAI Chat Completions to translate untranslated strings.
- Preserves PO comments + references.
- Writes the translated PO back.

CLI: `--help`, `--scope`, `--locale`, `--all`, `--model`, `--dry-run`.

## Steps to migrate

**Step 0** — `/deslop undrift i18n-translate-llm-script`.

1. Confirm #078 has merged.
2. Copy the script + tests.

### Files to copy verbatim

```
scripts/i18n/translateWithLLM.ts
scripts/i18n/translateWithLLM.test.ts
```

### Dependency changes

May need `openai` Node SDK if not already installed.

## How to mark this feature completed

Standard ritual.
