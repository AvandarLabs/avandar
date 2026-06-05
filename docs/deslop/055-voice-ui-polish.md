# 055 — Voice UI polish

- **Slug**: `voice-ui-polish`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-055/voice-ui-polish`
- **Depends on**: `050-voice-web-whisper`.
- **Estimated PR size**: small — ~4 files, ~200 lines.

## Notes for future you

- Driver commits: `5a1a3bb`, `a8f96c9`, `1e7d335`, `91137e6`.
- Commit `1e7d335` is also the chat try-again row (#018) — scope to the Swahili hint portion only.

## What this feature is

UX polish on the voice flow: modal styling refresh, offline badges (commit `91137e6`), and a Swahili-specific hint (commit `1e7d335`) noting Whisper accuracy for Swahili.

## Steps to migrate

Surgical edits across the voice modal + indicator components.

## How to mark this feature completed

Standard ritual.
