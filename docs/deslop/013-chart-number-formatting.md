# 013 — Chart number formatting

- **Slug**: `chart-number-formatting`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-013/chart-number-formatting`
- **Depends on**: `009-viz-multi-series-and-chart-types` (this helper is consumed by the chart components #009 ships).
- **Estimated PR size**: tiny — 1–3 files, ~50–100 lines.

## Notes for future you

- This is a small helper extraction. The naive "just inline `toLocaleString()`" route would also work; the value of pulling this into a helper is locale-awareness and a single rounding policy across all charts.
- Driver commits: `57c5803`, `c8fb6b6`. Commit `c8fb6b6` is also the source for the now-folded #14 chart-color-picker-fix that landed inside #009 — only the number-formatting portion of `c8fb6b6` belongs here.
- "Big-number columns" means values that overflow into millions / billions and benefit from `1.2M` style abbreviation. The helper picks the abbreviation tier and the decimal precision; both are locale-aware.

## What this feature is

A centralized `formatChartNumber(value, options)` helper used by every chart render component (Bar/Line/Area/Scatter/Bubble/Pie/Funnel/Radar/DataGrid) for axis ticks, tooltip values, legend entries, and DataGrid cells. Locale-aware via `Intl.NumberFormat`. Abbreviates large numbers (`1234567 → "1.23M"`).

## Steps to migrate

**Step 0** — `/deslop undrift chart-number-formatting`.

1. Confirm #009 has merged. If not, stop.
2. Create the refactor branch off `develop`.
3. Copy the helper file verbatim. Wire it into the chart render components.
4. Run verification.

### Files to copy verbatim

```
src/lib/ui/viz/formatChartNumber.ts (or shared/models/vizs/formatChartNumber.ts — match the source-branch location)
src/lib/ui/viz/formatChartNumber.test.ts (if present)
```

### Files to surgically edit on `develop`

For each render component in `src/lib/ui/viz/`, replace inline number formatting (`value.toLocaleString()` / `Math.round(value)` / etc.) with a call to `formatChartNumber(value)`:

- `src/lib/ui/viz/BarChart.tsx`
- `src/lib/ui/viz/LineChart.tsx`
- `src/lib/ui/viz/AreaChart.tsx`
- `src/lib/ui/viz/ScatterChart.tsx`
- `src/lib/ui/viz/BubbleChart.tsx`
- `src/lib/ui/viz/PieChart.tsx`
- `src/lib/ui/viz/FunnelChart.tsx`
- `src/lib/ui/viz/RadarChart.tsx`
- `src/lib/ui/viz/DataGrid.tsx`

### Files to delete

None.

### Dependency changes

None — `Intl.NumberFormat` is built into modern JS runtimes.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run src/lib/ui/viz
```

### Manual

1. `pnpm dev`.
2. Open the Data Explorer with a dataset containing a column whose values are in the millions/billions (e.g. revenue, population).
3. Drag that column into the y-axis of a bar chart. Confirm axis ticks render as `1.2M` rather than `1200000`.
4. Hover for a tooltip. Confirm the tooltip value uses the same formatter.
5. Switch the browser locale (e.g. via DevTools sensors → locale `de-DE`). Confirm formatting respects locale (`1,2M` rather than `1.2M`).

## Risks + things to look out for

- **`toLocaleString()` inline-call hunters.** Grep `src/lib/ui/viz/` after the refactor to confirm no stray inline formatters remain. Mixed formatters between axis and tooltip would be visually jarring.
- **Edge cases**: zero, negative, decimals smaller than 1, NaN, Infinity. The helper should handle each; the tests should cover them.

## How to mark this feature completed

When the operator runs `/deslop complete chart-number-formatting`:

1. Verify the merge.
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - Branch cleanup.
   - `rm docs/deslop/013-chart-number-formatting.md`.
   - Flip row #13 to `[x] ($MERGE_SHA)`.
   - Update `STATE.md`.
   - Commit `chore(deslop): mark chart-number-formatting as completed ($MERGE_SHA)` and push.
