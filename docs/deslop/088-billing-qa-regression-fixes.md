# 088 — Billing QA regression fixes

- **Slug**: `billing-qa-regression-fixes`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-088/billing-qa-regression-fixes`
- **Depends on**: `083`, `084`, `085`, `086`, `087`.
- **Estimated PR size**: medium — fixtures + formatter + phantom type fix, ~400 lines across 8 commits.

## Notes for future you

- Driver commits: `2eda2d4`, `1293836`, `c24a38c`, `0a1eb30`, `72ec020`, `331e6ae`, `5543169`, `eda9bd7`.
- The "phantom `shared/lib/types` fix" — Deno was resolving a non-existent path during edge build; the fix removes the stray reference. Don't reintroduce.

## What this feature is

Miscellaneous billing QA regressions found after #083–#087 landed. Test fixtures, formatter tweaks, and a phantom `shared/lib/types` reference fix.

## Steps to migrate

Apply each driver commit's changes scoped to billing-adjacent files.

## How to mark this feature completed

Standard ritual.
