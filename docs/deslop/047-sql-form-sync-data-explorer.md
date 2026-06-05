# 047 — SQL ↔ form sync (Data Explorer)

- **Slug**: `sql-form-sync-data-explorer`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-047/sql-form-sync-data-explorer`
- **Depends on**: `044-sql-to-structured-query`, `045-structured-query-to-sql`, `046-recursive-filter-ui`.
- **Estimated PR size**: medium — ~5 files, ~400 lines.

## Notes for future you

- Bidirectional: edits in the form regenerate SQL; manual SQL edits attempt round-trip via #044 and set `isStructuredQueryInSync`.
- When out-of-sync, show a confirmation Alert before letting the user switch tabs / lose state.

## What this feature is

In the Data Explorer, the form and the SQL editor stay in sync:

- Form edits regenerate SQL via #045.
- Manual SQL edits attempt round-trip via #044; if the round-trip succeeds, the form updates. If not, `isStructuredQueryInSync = false` and `sqlSyncWarnings` lists reasons. A Mantine `<Alert>` warns the user before they switch tabs.

## Steps to migrate

**Step 0** — `/deslop undrift sql-form-sync-data-explorer`.

1. Confirm #044, #045, #046 have all merged.
2. Create the refactor branch.
3. Wire the sync hook + Alert into `DataExplorerApp`.

### Files to copy verbatim

```
src/views/DataExplorerApp/sync/applySqlMapping.ts
src/views/DataExplorerApp/sync/useSqlFormSync.ts
src/views/DataExplorerApp/sync/SqlSyncAlert.tsx
```

### Files to surgically edit on `develop`

- `DataExplorerApp.tsx` — mount the sync hook + Alert.

## How to mark this feature completed

Standard ritual.
