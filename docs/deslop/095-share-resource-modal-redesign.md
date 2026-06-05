# 095 — Share resource modal redesign

- **Slug**: `share-resource-modal-redesign`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-095/share-resource-modal-redesign`
- **Depends on**: `none` (the docs at `docs/superpowers/specs/2026-05-17-share-resource-modal-redesign-design.md` exist on both branches per the inventory).
- **Estimated PR size**: medium — ~16 files, +220 / -142 net, plus e2e infra.

## Notes for future you

- Driver commit: `54d7930d`. Spec at `docs/superpowers/specs/2026-05-17-share-resource-modal-redesign-design.md`.
- Rolled out behind the `enable-shared-with-me` feature flag (flag itself ships here). Added to `playwright.config.ts` env, `src/lib/offline/isAppLinkAvailableOffline.ts`, the README, and i18n catalogs in all 8 locales.
- **No schema work needed.** The matching `list_shared_with_me_rpc` migration was added (`20260517204100_*.sql`) and later dropped (`20260602172559_*.sql`) on **both** branches — they cancel out.
- E2E infra bundled here: Playwright `reducedMotion: "reduce"` context + `ensureE2eViteFeatureFlags` boot helper.

## What this feature is

Rewrites the share-resource modal per the design spec. Touches `shared/permissions/ShareResourceModal/*` — about 16 files: `ShareAddPrincipalRow`, `ShareGeneralAccess`, `SharePrincipalList`, `SharePrincipalRow`, `ShareResourceButton`, `ShareResourceModal`, `ShareSummaryLine`, `buildShareSummary`, `shareCopy`. Net +220 / -142. Rolled out behind the `enable-shared-with-me` feature flag. Plus e2e infra (reduced-motion Playwright context + feature-flag boot helper).

## Steps to migrate

**Step 0** — `/deslop undrift share-resource-modal-redesign`.

1. Confirm Phase 1 schema is identical on both branches (no `list_shared_with_me` table/RPC drift expected — both adds and drops are present on both).
2. Apply commit `54d7930d`'s changes scoped to `shared/permissions/ShareResourceModal/` + the feature-flag wiring + the e2e infra.

### Files to surgically edit on `develop`

- All 16 `ShareResourceModal/*` files.
- `playwright.config.ts` — add the env entry.
- `src/lib/offline/isAppLinkAvailableOffline.ts` — register the flag.
- `README.md` — document the flag.
- i18n catalogs in all 8 locales — add the new strings.

## How to mark this feature completed

Standard ritual.
