# 082 — i18n catalogs formatter

- **Slug**: `i18n-catalogs-formatter`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-082/i18n-catalogs-formatter`
- **Depends on**: `078-lingui-scaffold`.
- **Estimated PR size**: tiny — Prettier config / ignore entry, ~20 lines.

## Notes for future you

- Driver commit: `31a166d`. Pre-PR formatter (Prettier) was rewriting PO catalogs and fighting the Lingui regen. Fix: add `*.po` to Prettier's ignore list (or configure Prettier to use a no-op for `.po`).

## What this feature is

Stop Prettier from fighting Lingui-generated PO catalogs.

## Steps to migrate

Apply the Prettier config / ignore changes from commit `31a166d`.

### Files to surgically edit on `develop`

- `.prettierignore` (or `prettier.config.js`) — add `*.po` / `src/locales/**/*.po`.

## How to mark this feature completed

Standard ritual.
