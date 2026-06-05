# 048 — SQL ↔ form sync (Dashboards)

- **Slug**: `sql-form-sync-dashboards`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-048/sql-form-sync-dashboards`
- **Depends on**: `044-sql-to-structured-query`, `045-structured-query-to-sql`, `047-sql-form-sync-data-explorer` (reuses the hook shape).
- **Estimated PR size**: medium — ~5 files, ~400 lines.

## Notes for future you

- The 3-tab `NLQueryPField` (Prompt / Manual / SQL) is the per-block UI. Tab state lives on the block's own config so different blocks on the same dashboard can be in different tabs.

## What this feature is

Per-DataViz-block SQL ↔ form parity for dashboards. `useDashboardManualQueryState` is the per-block analogue of `useSqlFormSync` (#047). `NLQueryPField` gets a 3-tab UI: Prompt (NL query) / Manual (form) / SQL.

## Steps to migrate

**Step 0** — `/deslop undrift sql-form-sync-dashboards`.

1. Confirm #044, #045, #047 have merged.
2. Create the refactor branch.
3. Copy the per-block hook + the 3-tab `NLQueryPField`.

### Files to copy verbatim

```
src/components/Dashboard/blocks/DataViz/useDashboardManualQueryState.ts
src/components/Dashboard/blocks/DataViz/NLQueryPField.tsx
```

### Files to surgically edit on `develop`

- The DataViz block render component — render the 3-tab `NLQueryPField`.

## How to mark this feature completed

Standard ritual.
