# 083 — Billing: native free subscriptions

- **Slug**: `billing-native-free`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-083/billing-native-free`
- **Depends on**: `none` (foundational for the rest of the PTRCK billing series).
- **Estimated PR size**: medium — ~5 files, ~500 lines.

## Notes for future you

- "Native free" = a free-tier subscription created **without** going through Polar's checkout. Useful for internal users and seeded workspaces.
- Driver commits: `7accd7f`, `dae6bfb`, `062659e`. The PTRCK billing series spans #083–#089; this is the foundation.
- Permission auth for subscription operations is added in this row; downstream rows depend on it.

## What this feature is

Create native free subscriptions on workspace creation without invoking Polar checkout. Subscription permission authz so only authorized users can modify subscription rows. Merge logic so a later Polar checkout can adopt an existing native free row instead of creating a duplicate.

## Steps to migrate

**Step 0** — `/deslop undrift billing-native-free`.

1. Confirm Phase 1 added the subscriptions schema. If not, surface.
2. Apply the commits' changes scoped to billing files.

### Files to surgically edit on `develop`

- `supabase/functions/billing/createNativeFree.ts` (new)
- `shared/models/Subscription/SubscriptionPermissions.ts` (new or extended)
- Workspace-creation handler — call native-free creation.

## How to mark this feature completed

Standard ritual.
