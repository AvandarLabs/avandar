# 092 — Docs: superpowers specs + plans

- **Slug**: `docs-superpowers-specs-plans`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-092/docs-superpowers-specs-plans`
- **Depends on**: `none`
- **Estimated PR size**: small — docs-only, ~22 files.

## Notes for future you

- These specs / plans are the canonical reference for many of the per-feature plans in `docs/deslop/`. Bringing them to `develop` makes the per-feature plans self-contained (they no longer reference paths that only exist on `feat/ict4d-demo`).
- Copy verbatim. Don't reorganize the directory.

## What this feature is

Copies `docs/superpowers/specs/` and `docs/superpowers/plans/` from `feat/ict4d-demo` to `develop` (22 files total).

## Steps to migrate

Path-scoped checkout:
```sh
git checkout feat/ict4d-demo -- docs/superpowers/
```

## How to mark this feature completed

Standard ritual.
