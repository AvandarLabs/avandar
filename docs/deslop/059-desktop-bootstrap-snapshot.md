# 059 — Desktop bootstrap snapshot

- **Slug**: `desktop-bootstrap-snapshot`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-059/desktop-bootstrap-snapshot`
- **Depends on**: `058-desktop-offline-session`.
- **Estimated PR size**: medium — ~4 files, ~350 lines.

## Notes for future you

- **Idempotent.** If the user closes mid-snapshot, the next launch picks up where it left off. Don't restart from scratch.
- Snapshot pulls every syncable table into local SQLite (under user-data dir). Verify the local SQLite schema migrations are also in scope (Phase 1 should have set them up; if not, surface).

## What this feature is

On first authenticated launch of the desktop app, an `onAuthenticated` hook in `registerAuthHandlers` triggers a bootstrap snapshot: every syncable table is pulled into a local SQLite database. Idempotent — interrupted snapshots resume on next launch.

## Steps to migrate

**Step 0** — `/deslop undrift desktop-bootstrap-snapshot`.

1. Confirm #058 has merged.
2. Copy the snapshot orchestrator + sync table registry.

### Files to copy verbatim

```
bun/sync/bootstrapSnapshot.ts
bun/sync/syncableTables.ts
shared/contracts/SyncContracts.ts
```

### Files to surgically edit on `develop`

- `bun/auth/registerAuthHandlers.ts` (from #058) — add the `onAuthenticated` hook that triggers the snapshot.

## How to mark this feature completed

Standard ritual.
