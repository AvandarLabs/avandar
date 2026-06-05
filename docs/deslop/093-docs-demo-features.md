# 093 — Docs: demo features + supporting

- **Slug**: `docs-demo-features`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-093/docs-demo-features`
- **Depends on**: `none`
- **Estimated PR size**: tiny — docs-only.

## Notes for future you

- These docs are referenced by several per-feature plans (`docs/demo-features/web-offline-mode.md` by row #061, `docs/demo-features/sql-parser-filter-ui.md` by rows #044/#046, `docs/demo-features/desktop-offline-session.md` by row #058). Without this row landing, those plans reference paths that only exist on `feat/ict4d-demo`.
- Includes `docs/offline-chat-sql-hardening.md`, `docs/permissions-architecture.md`, `docs/avandar-packages.md`, `docs/adding-new-data-source-types.md` — these are repo-wide docs, not in a `demo-features/` subdir.

## What this feature is

Copies the following docs from `feat/ict4d-demo` to `develop`:

- `docs/demo-features/web-offline-mode.md`
- `docs/demo-features/sql-parser-filter-ui.md`
- `docs/demo-features/desktop-offline-session.md`
- `docs/offline-chat-sql-hardening.md`
- `docs/permissions-architecture.md`
- `docs/avandar-packages.md`
- `docs/adding-new-data-source-types.md`

## Steps to migrate

Path-scoped checkout of each file.

## How to mark this feature completed

Standard ritual.
