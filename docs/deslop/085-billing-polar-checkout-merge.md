# 085 — Polar checkout merge

- **Slug**: `billing-polar-checkout-merge`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-085/billing-polar-checkout-merge`
- **Depends on**: `083-billing-native-free`, `084-billing-internal-subscription-id`.
- **Estimated PR size**: small — ~3 files, ~300 lines.

## Notes for future you

- Driver commit: `ed5b52d`.
- When a user with a native free subscription completes a Polar checkout, the merge logic updates the existing row instead of creating a new one. Don't allow duplicates.

## What this feature is

After a successful Polar checkout, the billing edge function detects an existing native-free row for the workspace and merges the Polar identifiers + new plan into it.

## Steps to migrate

Apply commit `ed5b52d`'s changes to the Polar webhook handler.

## How to mark this feature completed

Standard ritual.
