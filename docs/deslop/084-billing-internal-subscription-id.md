# 084 — Internal subscription id

- **Slug**: `billing-internal-subscription-id`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-084/billing-internal-subscription-id`
- **Depends on**: `083-billing-native-free`.
- **Estimated PR size**: medium — ~5 files + migration, ~400 lines.

## Notes for future you

- Driver commits: `680f551`, `a8d1b38`, `be2bdeb`. Migration `20260511120000_subscriptions_internal_id_pk.sql` should already be in `develop` from Phase 1.
- The internal id replaces Polar's external id as the primary key on the subscriptions table. Polar fields become nullable so native-free rows don't need to fake them.

## What this feature is

Adds an internal `id` (uuid) primary key on the `subscriptions` table. Permission checks switch from Polar id to internal id. Polar-specific fields become nullable so native-free rows don't carry placeholder Polar values.

## Steps to migrate

**Step 0** — `/deslop undrift billing-internal-subscription-id`.

1. Confirm #083 has merged and the Phase 1 migration is present.
2. Apply the model + permission changes.

### Files to surgically edit on `develop`

- `shared/models/Subscription/Subscription.types.ts` — add `id`, mark Polar fields nullable.
- `shared/models/Subscription/SubscriptionPermissions.ts` — switch to internal id.
- Subscription client — switch lookups.

## How to mark this feature completed

Standard ritual.
