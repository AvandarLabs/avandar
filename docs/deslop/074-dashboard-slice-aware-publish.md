# 074 — Slice-aware publish

- **Slug**: `dashboard-slice-aware-publish`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-074/dashboard-slice-aware-publish`
- **Depends on**: `071-dashboard-publish-modal`, `044-sql-to-structured-query` (uses `node-sql-parser` for column extraction).
- **Estimated PR size**: medium — ~5 files, ~500 lines.

## Notes for future you

- Three modes: `queried` (narrowest, default) / `all_columns` / `custom` (user picks).
- `unparseable` sentinel triggers when `node-sql-parser`'s `columnList` can't extract column references. Safe fallback: publish nothing rather than over-share.
- Persisted on `dashboard.config.__publishConfig` — Phase 1 should have set up the column. If not, surface.

## What this feature is

A "Data scope" section in the publish modal that controls **which columns** of the underlying datasets get included in the published view:

- `queried` (default, narrowest) — only the columns each viz actually references.
- `all_columns` — everything from the dataset.
- `custom` — user picks per dataset.

`node-sql-parser`'s `columnList` extracts the referenced columns per viz. When extraction fails, `unparseable` sentinel forces a safe fallback ("publish nothing"). `buildSliceSql` materializes the chosen scope. Persists in `dashboard.config.__publishConfig`.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-slice-aware-publish`.

1. Confirm #071 and #044 have merged.
2. Copy the slice-builder + the publish-modal section.

### Files to copy verbatim

```
src/lib/dashboard/buildSliceSql.ts
src/lib/dashboard/extractReferencedColumns.ts
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/DataScopeSection.tsx
```

### Files to surgically edit on `develop`

- `PublishDashboardModal` — render the new Data scope section.
- Dashboard publish handler — apply the slice on publish.

## How to mark this feature completed

Standard ritual.
