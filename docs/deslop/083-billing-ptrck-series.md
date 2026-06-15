# 083 — Billing: PTRCK series (folded)

- **Slug**: `billing-ptrck-series`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `feature/patrick-work-vi` *(pre-existing branch with an open PR; this row consolidates 083-086 onto it)*
- **Depends on**: none. This row is itself a prerequisite for any feature that consumes `SubscriptionModule` or `SubscriptionRead.id` — currently confirmed: `#001 async-dataset-import-pipeline`. Likely also: most UI rows in sections A, B, C that import subscription state.
- **Required by**: `#001 async-dataset-import-pipeline` (confirmed). Other UI rows on the board likely have the same dep — surface via each row's own undrift.
- **Estimated PR size**: large — combined ~15+ files, ~1.7k LoC of billing surface + the e2e fixtures + the Playwright spec. Bundled on `feature/patrick-work-vi`, which is already open as a PR against `develop`.

## Notes for future you

- **2026-06-10 — folded 083-089 into this single row** per the operator rule "Fold inseparable features into a single migration". The seven original rows were:
  - `#083 billing-native-free` (foundation: native free subs + permission authz)
  - `#084 billing-internal-subscription-id` (internal id pk + nullable Polar fields)
  - `#085 billing-polar-checkout-merge` (Polar checkout adopts existing native free row)
  - `#086 billing-e2e-coverage` (Playwright fixtures + specs)
  - `#087 supabase-preview-shared-import-map` (Supabase Preview bundling fixes for the billing edge worker)
  - `#088 billing-qa-regression-fixes` (CI type-check fixes, phantom `shared/lib/types` cleanup, formatter sweeps for the billing branch)
  - `#089 playwright-install-docs` (Playwright browser install docs for local e2e)
  Each was a single PR in size on its own, but they ship together because 084 changes the subscriptions schema 083 relies on, 085 layers on top of 083+084, 086 verifies the whole chain, and 087-089 are follow-on hardening commits all riding on the same branch. Splitting them across PRs would force interleaved schema/permission migrations that aren't reviewable in isolation. Confirmed by `git merge-base --is-ancestor` against all 22 driver commits on `origin/feature/patrick-work-vi`.

- **2026-06-10 — `feature/patrick-work-vi` is the in-flight branch.** Operator confirmed the PTRCK billing series is already done on that branch and an open PR targets `develop`. All 11 driver commits from rows 083-086 are present on `feature/patrick-work-vi`:
  - `7accd7f`, `dae6bfb`, `062659e` (was #083)
  - `680f551`, `a8d1b38`, `be2bdeb` (was #084)
  - `ed5b52d` (was #085)
  - `56dddde`, `1f574f1`, `3f9f08c`, `504eb8c` (was #086)
  Plus follow-on hardening commits (PTRCK-018, PTRCK-021..025) for QA fixes, e2e flake stabilisation, CI type-check fixes, and edge-function bundling tweaks. **No new refactor branch is created off `develop` for this row** — the PR is `feature/patrick-work-vi → develop`. The operator merges that PR when ready and then runs `/deslop complete billing-ptrck-series` against the merge SHA.

- **2026-06-10 — `feature/patrick-work-vi` is a strict ancestor of `feat/ict4d-demo`.** `git rev-list --left-right --count` reports `242 0`: 242 commits ahead, 0 commits behind. The billing surface itself is byte-clean between the two branches for the PTRCK driver commits. Any extra billing-adjacent work on `feat/ict4d-demo` since the branch was cut (e.g. `subscriptions/create-free.ts` route refactors, `usage_analytics_events` migration, `dashboards.routes.ts`) belongs to OTHER feature rows, not this one.

## What this feature is

The full PTRCK billing migration as a single reviewable unit:

- **Native free subscriptions.** Create a free-tier `subscriptions` row on workspace creation without invoking Polar checkout. Useful for internal users and seeded workspaces. Carries an `is_native_free` discriminator so downstream code can distinguish from Polar-checkout subscriptions.

- **Subscription permission authz.** New permission checks gate subscription-row mutations so only authorized members can change billing state.

- **Internal subscription id.** Replaces Polar's external id with an internal `uuid` as the primary key on `subscriptions`. Polar-specific columns (`polar_subscription_id`, etc.) become nullable so native-free rows don't need to fake them. Migration `20260511120000_subscriptions_internal_id_pk.sql` (already on `develop` from Phase 1).

- **Polar checkout merge.** When a user with an existing native-free row completes a Polar checkout, the billing edge function detects the existing row and merges the Polar identifiers + new plan into it instead of creating a duplicate.

- **Playwright e2e coverage.** Specs for the native-free creation flow, the Polar-checkout-onto-native-free merge flow, and a workspace fixture seeded with a native-free subscription so e2e doesn't hit live Polar.

## Steps to migrate

This row's migration is **non-standard** because the work already exists on `feature/patrick-work-vi`. Do NOT create a `refactor-083/*` branch off `develop`. Instead:

**Step 0** — `/deslop undrift billing-ptrck-series` to confirm `feature/patrick-work-vi` is still ahead-of/in-sync-with `develop` for the billing surface.

1. Confirm `feature/patrick-work-vi` exists on origin and its PR is still open against `develop`. If the branch is gone, the PR has been merged or closed — fall back to `/deslop complete billing-ptrck-series` with the merge SHA.

2. Cross-check that the 11 PTRCK driver commits listed above are reachable from `feature/patrick-work-vi`:
   ```sh
   git fetch origin feature/patrick-work-vi
   for sha in 7accd7f dae6bfb 062659e 680f551 a8d1b38 be2bdeb ed5b52d 56dddde 1f574f1 3f9f08c 504eb8c; do
     git merge-base --is-ancestor $sha origin/feature/patrick-work-vi \
       && echo "  $sha: ok" \
       || echo "  $sha: MISSING"
   done
   ```
   All should report `ok`. If any are `MISSING`, the operator may have force-pushed the branch — surface this and ask before proceeding.

3. Diff the billing surface between `feature/patrick-work-vi` and `feat/ict4d-demo`:
   ```sh
   git diff --stat origin/feature/patrick-work-vi..origin/feat/ict4d-demo -- \
     shared/models/Subscription \
     shared/permissions \
     supabase/functions/subscriptions \
     supabase/functions/billing
   ```
   If this is empty, the branch is fully in sync. If non-empty, the diff represents work that's drifted on `feat/ict4d-demo` since the branch was cut — surface to the operator, but don't try to forward-port unless they ask.

4. Update verification on the branch itself (if the operator wants a fresh re-run before merging the PR):
   ```sh
   git switch feature/patrick-work-vi   # NOT in a worktree this skill manages
   pnpm install
   pnpm tsc -b --noEmit
   pnpm lint
   pnpm vitest run shared
   ```
   This is the operator's call — usually CI on the PR has already done this.

5. There is no push step in this row's migrate flow — the branch is already pushed. Skip to housekeeping (mark `[~]` in `ALL_FEATURES.md`; add to `STATE.md` In-flight migrations table referencing `feature/patrick-work-vi`).

### Files in scope

The migration's *intent* covers the billing surface listed in "What this feature is", but the *mechanical* changes already live on `feature/patrick-work-vi`. Do not try to enumerate the file list here from scratch — it would diverge from the branch. Read the open PR's diff for the authoritative file list.

Rough sketch (for reviewer orientation):

- `shared/models/Subscription/Subscription.types.ts` — `id` (uuid pk), `is_native_free`, nullable Polar fields.
- `shared/models/Subscription/SubscriptionPermissions.ts` — authz checks switched to internal id.
- `shared/models/Subscription/SubscriptionModule/SubscriptionModule.ts` — module wrapper consumed by `useCanAddDataset` and similar.
- `supabase/functions/subscriptions/create-free.ts` + the surrounding `subscriptions/*` routes.
- `supabase/functions/billing/*` — Polar webhook merge logic.
- `tests/e2e/workspace-billing.spec.ts` — Playwright coverage.
- The E2E workspace fixture (seeded native-free row).

### Dependency changes

None new. Polar SDK + native fetch are already in place on `develop`.

## Verification

### Automated

CI on the open `feature/patrick-work-vi` PR is the source of truth here. The skill does not re-run verification locally — that's the PR's job.

### Manual

The operator should review on the PR and exercise:

1. Create a new workspace — confirm a native-free `subscriptions` row appears.
2. Run a Polar checkout against that workspace — confirm the existing row is merged with the new Polar identifiers (no duplicate).
3. Confirm that a non-billing-admin member cannot modify the row (permission authz).
4. Playwright run passes locally if the operator wants a sanity check.

## Risks + things to look out for

- **Schema migration ordering.** `20260511120000_subscriptions_internal_id_pk.sql` should already be on develop (Phase 1). If for any reason it's not, this row cannot merge — the internal-id pk needs to land before the model code that consumes it.
- **Polar webhook merge race.** If a user starts a Polar checkout before the native-free row has been created (rare; only possible if the workspace-create handler raced), the merge logic falls back to "create new row, then merge later". Verify the e2e spec covers this path.
- **Branch drift on `feature/patrick-work-vi`.** Because the branch has been open a while and `feat/ict4d-demo` keeps shipping, periodic rebases against `develop` may be needed before the PR merges cleanly. That rebase is on the operator, not this skill.

## How to mark this feature completed

When the operator merges `feature/patrick-work-vi → develop`, run `/deslop complete billing-ptrck-series`. The completion procedure does NOT delete the `feature/patrick-work-vi` branch (that branch belongs to the operator's workflow, not the deslop skill). It only:

1. Verifies the PR's merge SHA is reachable from `origin/develop`.
2. Deletes this plan file (`083-billing-ptrck-series.md`).
3. Flips row #083 to `[x] (<merge-sha>)` in `ALL_FEATURES.md`.
4. Removes the in-flight entry from `STATE.md`; appends to the completed log.
5. Refreshes the next plan in the queue (`#061 web-offline-mode` after this lands).
