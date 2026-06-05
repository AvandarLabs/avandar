# 087 — Supabase Preview shared import map fix

- **Slug**: `supabase-preview-shared-import-map`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-087/supabase-preview-shared-import-map`
- **Depends on**: `none` (infrastructure, but pairs with #083–#086 since billing edge worker is what needs it most).
- **Estimated PR size**: small — config / import-map files, ~200 lines.

## Notes for future you

- Driver commits: `3b2c171`, `c278a42`, `7fdff75`.
- The Supabase Preview environment didn't resolve `shared/` paths the same way local Deno did, breaking the billing edge worker on Preview deploys. The fix updates the import map + edge bundling config.

## What this feature is

Fixes Supabase Preview deploys' resolution of `shared/` paths in edge function bundles so workers boot correctly on Preview.

## Steps to migrate

Apply the import map / bundling config changes from the driver commits.

## How to mark this feature completed

Standard ritual.
