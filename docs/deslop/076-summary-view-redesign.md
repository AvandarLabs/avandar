# 076 — Dataset summary view redesign

- **Slug**: `summary-view-redesign`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-076/summary-view-redesign`
- **Depends on**: `none`
- **Estimated PR size**: medium — ~6 files, ~800 lines.

## Notes for future you

- "Doc-style outline" = sticky TOC down the side, one section per column. Headlines are plain-language ("Customer email — 12 unique values, 0.5% missing").
- Lazy via `useIntersection` with a 200 px root margin so the next section's summary is in flight as the user scrolls.

## What this feature is

`DatasetSummaryView` is redesigned: doc-style outline with a sticky TOC; one section per column with a plain-language headline and a type-appropriate viz (histogram for numeric, value-list for text, calendar for date). Missing-rate ring (`Mantine RingProgress`) renders only when non-zero. Per-column `getColumnSummary` is fetched lazily via `useIntersection` (200 px root margin) so only visible sections fetch.

Adds new methods on `DatasetQueryClient`: `getDatasetMeta`, `getColumnSummary`.

## Steps to migrate

**Step 0** — `/deslop undrift summary-view-redesign`.

1. Add the new client methods.
2. Copy the redesigned view.

### Files to copy verbatim

```
src/views/DataManagerApp/DatasetSummaryView/DatasetSummaryView.tsx
src/views/DataManagerApp/DatasetSummaryView/DatasetSummaryView.module.css
src/views/DataManagerApp/DatasetSummaryView/ColumnSummarySection.tsx
src/views/DataManagerApp/DatasetSummaryView/StickyTOC.tsx
```

### Files to surgically edit on `develop`

- `src/clients/datasets/DatasetQueryClient.ts` — add `getDatasetMeta` and `getColumnSummary`.

## How to mark this feature completed

Standard ritual.
