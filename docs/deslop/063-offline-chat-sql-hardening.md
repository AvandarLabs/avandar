# 063 — Offline chat SQL hardening

- **Slug**: `offline-chat-sql-hardening`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-063/offline-chat-sql-hardening`
- **Depends on**: `062-web-offline-webllm-chat`.
- **Estimated PR size**: small — ~3 files, ~200 lines.

## Notes for future you

- Doc: `docs/offline-chat-sql-hardening.md` on `feat/ict4d-demo`. Read it before porting.
- Local models hallucinate SQL more than the cloud models do. This row adds validation (Zod over the SQL AST after `node-sql-parser`) and a fallback ("I couldn't generate valid SQL for that question") instead of submitting broken SQL.

## What this feature is

Validation + fallback layer on the offline-chat SQL path:

- Parse generated SQL with `node-sql-parser`; reject if AST shape is invalid.
- Surface a friendly fallback message when validation fails.
- A few additional sanity checks (forbid `DROP` / `DELETE`, require `FROM`, etc.).

## Steps to migrate

**Step 0** — `/deslop undrift offline-chat-sql-hardening`.

1. Confirm #062 has merged.
2. Apply the hardening per `docs/offline-chat-sql-hardening.md`.

### Files to surgically edit on `develop`

- The offline-chat SQL handler in `src/lib/offline-chat/` — add validation pass before applying.

## How to mark this feature completed

Standard ritual.
