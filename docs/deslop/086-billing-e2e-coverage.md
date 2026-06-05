# 086 — Billing e2e coverage

- **Slug**: `billing-e2e-coverage`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-086/billing-e2e-coverage`
- **Depends on**: `083-billing-native-free`, `084-billing-internal-subscription-id`, `085-billing-polar-checkout-merge`.
- **Estimated PR size**: medium — Playwright specs + fixture, ~500 lines.

## Notes for future you

- Driver commits: `56dddde`, `1f574f1`, `3f9f08c`, `504eb8c`.
- The E2E workspace fixture seeds a native-free subscription so the test doesn't have to hit Polar.

## What this feature is

Playwright coverage for native-free + Polar-checkout flows, with an E2E workspace fixture seeded with a native-free subscription.

## Steps to migrate

Copy the Playwright spec files + fixture changes from the driver commits.

## How to mark this feature completed

Standard ritual.
