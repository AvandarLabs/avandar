# 068 — Dashboard global filters

- **Slug**: `dashboard-global-filters`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-068/dashboard-global-filters`
- **Depends on**: `none`
- **Estimated PR size**: medium — Filter P-block + state manager + SQL wrap, ~600 lines.

## Notes for future you

- The Filter P-block has three variants: single-select, multi-select, contains. Match per-column type.
- `applyDashboardFiltersToSql` wraps each viz's SQL in a subselect with the filter's WHERE applied. Don't try to inject WHERE into the original SQL — wrap.

## What this feature is

A new "Filter" P-block (single-select / multi-select / contains) plus `DashboardFilterStateManager` and `applyDashboardFiltersToSql` that wraps each DataViz block's SQL in a filtering subselect.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-global-filters`.

1. Create the refactor branch.
2. Author the Filter P-block + state manager + SQL wrapper.

### Files to copy verbatim

```
src/components/Dashboard/blocks/Filter/ (whatever lives here)
src/components/Dashboard/DashboardFilterStateManager.ts
src/lib/sql/applyDashboardFiltersToSql.ts
```

### Files to surgically edit on `develop`

- Puck config — register the Filter P-block.
- DataViz block render — apply filters via the SQL wrapper.

## How to mark this feature completed

Standard ritual.
