# 069 — Per-viz filter opt-out + local filters

- **Slug**: `dashboard-per-viz-filters`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-069/dashboard-per-viz-filters`
- **Depends on**: `068-dashboard-global-filters`, `009-viz-multi-series-and-chart-types` (V3 migration must land first; this row ships V4).
- **Estimated PR size**: medium — V4 migration + per-viz UI, ~500 lines.

## Notes for future you

- Ships `AvaPageDataMigrationV4`. **V3 from #009 must merge first** — V4 builds on the v3 shape.
- Each DataViz block gets a global-filter opt-out (All / Some / None) and a local-filter array (independent of global filters).

## What this feature is

Per-DataViz-block opt-out from global filters: All / Some / None. Each block can also carry its own local filters that don't interact with global ones. Ships `AvaPageDataMigrationV4.ts` which seeds the new fields on every DataViz block.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-per-viz-filters`.

1. Confirm #009 and #068 have merged.
2. Copy `AvaPageDataMigrationV4.ts`.
3. Add the opt-out UI + local-filter UI to the DataViz block editor.

### Files to copy verbatim

```
shared/models/dashboard/migrations/AvaPageDataMigrationV4.ts
shared/models/dashboard/migrations/AvaPageDataMigrationV4.test.ts
src/components/Dashboard/blocks/DataViz/PerVizFiltersField.tsx
```

### Files to surgically edit on `develop`

- The DataViz block render — read opt-out + local filters.
- The dashboard block editor — surface the UI.
- The migrations registry — register V4.

## How to mark this feature completed

Standard ritual.
