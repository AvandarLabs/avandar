# 091 — Docs: ict4d-demo history

- **Slug**: `docs-ict4d-demo-history`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-091/docs-ict4d-demo-history`
- **Depends on**: `none`
- **Estimated PR size**: tiny — docs-only, copy three files.

## Notes for future you

- **Operator decision required**: copy as historical record onto `develop`, or leave these only on `feat/ict4d-demo`? Default per the inventory row is "read-only on `develop` as historical record". Confirm with the operator before opening the PR.
- These files document **how `feat/ict4d-demo` was built**, not the architecture. Once `feat/ict4d-demo` is deleted in Phase 3, the only place this history exists is on `develop` (if we bring it over).

## What this feature is

Copies the three ict4d-demo-history files onto `develop` read-only:

- `docs/ict4d-demo/CHECKPOINTS.md`
- `docs/ict4d-demo/FEATURE_CHECKLIST.md`
- `docs/ict4d-demo/random-thoughts.md`

## Steps to migrate

**Step 0** — `/deslop undrift docs-ict4d-demo-history`.

1. Confirm with operator: copy or leave?
2. If copy: path-scoped checkout of the three files.
3. If leave: mark the row complete with an empty refactor branch (and add a `STATE.md` note).

## How to mark this feature completed

Standard ritual.
