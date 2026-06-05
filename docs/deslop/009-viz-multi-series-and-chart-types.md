# 009 — Visualizations: multi-series + chart-type expansion

- **Slug**: `viz-multi-series-and-chart-types`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-009/viz-multi-series-and-chart-types`
- **Depends on**: `none` (foundational visualization stack; rows #10 / #14 / #21 build on top).
- **Estimated PR size**: **large** — ~80 files changed, +7.2k / −1.5k lines.

## Notes for future you

- This row is the largest single migration in the deslop queue (~7.2k LoC added). Plan the review accordingly — a single PR is correct (it's one coherent feature), but expect multiple reviewer passes and possibly a couple of fixups.
- This row also **absorbs row #14** (`chart-color-picker-fix`, commit `c8fb6b6`). Color rendering fixes for big-number columns ship in the same commit family as the chart-suite expansion and are inseparable from it. The retired #14 index is **not reused**.
- The shared `shared/models/vizs/` tree is the source of truth for chart configs. The `src/lib/ui/viz/` tree is the render layer. The `src/components/VisualizationContainer/VizSettingsForm/` tree is the settings UI. Don't blur those layers — each chart-type's three files should change together.
- Row #10 (`viz-settings-fieldsets`) is a **layout** refinement on the fieldsets — it can land before or after this row. If it lands first, this row will need a small fixup to use the refined layout primitives; if it lands after, it will fold cleanly on top of the fieldsets this row introduces.
- The PTRCK-005/006/007/008 commits (`517daefc`, `7b738f13`) are the chart-suite expansion. Their diffs are bundled into this row by design (per the operator rule). If you grep the inventory for "pie" or "funnel" expecting a separate row, you won't find one — it lives here.
- The "axis-mapping tooltip on Series header" is in `SeriesAwareVizForm.tsx`. The exact tooltip text varies by chart family (XY vs radar vs pie). Don't try to abstract those strings into a single helper during the migration — they're intentionally chart-specific.

## What this feature is

Expands the visualization stack from a 4-chart-type stack (bar, line, scatter, table) to the **full 8-type suite**: bar, line, area, scatter, bubble, pie, funnel, radar. Adds:

- **Per-series configuration** across all chart types. Each chart's config now has a `series` array; each series carries `xKey` / `yKey` (XY charts), `sizeKey` (bubble), or `nameKey` / `valueKey` (pie/funnel). Axis-mapping tooltip on the Series header explains the mapping ("Each series is numeric on Y axis, grouped by X axis 'colName'" or the radar/radial equivalent).
- **Auto-hydration of axes from query results.** `hydrate*FromQuery` (seed defaults on fresh column list) and `hydrate*FromQueryResult` (rehydrate on every result, **prune stale keys on column change**) per chart family. `shouldHydrateVizFromQueryResult` short-circuits when both axes are still valid.
- **`CurveType` shared type** (`"linear" | "natural" | "monotone" | "step"`) — used on Line/Area `curveType` setting.
- **`withLegend` boolean** across Bar/Line/Area (default true).
- **`hydratePieFromQuery` / `hydratePieFromQueryResult` utilities** — pie + funnel share these.
- **Dashboard data migration V3** (`AvaPageDataMigrationV3.ts`) — converts pre-existing single-key DataViz blocks (`{ vizType: "bar", yAxisKey: "value" }`) to the new series-array shape (`{ vizType: "bar", series: [{ renderAs: "bar", key: "value" }], layout: "group", withLegend: false }`). Application-level (no DB schema change).

Per the operator rule ("migrate refactored code, not legacy"), the original multi-series PR and the PTRCK-005/006/007/008 chart-suite expansion (pie/funnel/radar + area/bubble + CurveType/withLegend + auto-hydration) are bundled into this single row.

Sources: CHECKPOINT 1 (`claude/add-series-support`); commits `7c8d08a`, `add9d03`, `3d7f527`, `517daefc` (PTRCK-005+006), `7b738f13` (PTRCK-007+008).

## Steps to migrate

**Step 0** — `/deslop undrift viz-multi-series-and-chart-types` (the skill runs this before the steps below).

1. Create the refactor branch:
   ```sh
   git fetch origin develop
   git checkout -b refactor-009/viz-multi-series-and-chart-types origin/develop
   ```
2. Copy the new chart-type config modules (`PieChartVizConfig/`, `FunnelChartVizConfig/`, `RadarChartVizConfig/`, plus the new shared types) verbatim.
3. Copy the new render components, hydration helpers, fieldsets, and the V3 migration verbatim.
4. Surgically port the modifications to the existing chart configs, the `VizConfig` union, `VisualizationContainer`, `VizSettingsForm`, and the existing render components.
5. Run the chart fieldset tests + migration tests under `vitest`. **The V3 migration tests are mandatory** — they're how reviewers verify the dashboard schema-bump path.
6. Run verification.

### Files to copy verbatim

#### Shared types + utilities

```
shared/models/vizs/CurveType.ts
shared/models/vizs/SeriesConfig.ts
shared/models/vizs/ChartStyle.ts
shared/models/vizs/SettingDescriptor.ts
shared/models/vizs/resolveColumnKey.ts
```

#### Hydration helpers (with co-located tests)

```
shared/models/vizs/applyVizConfigFromQueryResult.ts (+ test)
shared/models/vizs/shouldHydrateVizFromQueryResult.ts (+ test)
shared/models/vizs/hydrateXYFromQueryResult.ts (+ test)
shared/models/vizs/hydrateXYSeriesFromQuery.ts
shared/models/vizs/hydrateXYSeriesFromQueryResult.ts
shared/models/vizs/hydratePieFromQuery.ts (+ test)
shared/models/vizs/hydratePieFromQueryResult.ts (+ test)
shared/models/vizs/hydrateRadarSeriesFromQuery.ts
shared/models/vizs/hydrateRadarSeriesFromQueryResult.ts
shared/models/vizs/hydrateScatterSeriesFromQuery.ts
shared/models/vizs/hydrateScatterSeriesFromQueryResult.ts (+ test)
shared/models/vizs/hydrateBubbleSeriesFromQuery.ts
shared/models/vizs/hydrateBubbleSeriesFromQueryResult.ts (+ test)
```

#### New chart-type config modules

```
shared/models/vizs/PieChartVizConfig/PieChartVizConfig.types.ts
shared/models/vizs/PieChartVizConfig/PieChartVizConfigs.ts
shared/models/vizs/FunnelChartVizConfig/FunnelChartVizConfig.types.ts
shared/models/vizs/FunnelChartVizConfig/FunnelChartVizConfigs.ts
shared/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types.ts
shared/models/vizs/RadarChartVizConfig/RadarChartVizConfigs.ts
shared/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts
shared/models/vizs/BubbleChartVizConfig/BubbleChartVizConfigs.ts
shared/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types.ts
shared/models/vizs/AreaChartVizConfig/AreaChartVizConfigs.ts
```

#### New render components

```
src/lib/ui/viz/PieChart.tsx
src/lib/ui/viz/FunnelChart.tsx
src/lib/ui/viz/RadarChart.tsx
src/lib/ui/viz/BubbleChart.tsx
src/lib/ui/viz/AreaChart.tsx
src/lib/ui/viz/renderXYComposite.tsx
src/lib/ui/viz/ChartConstants.ts
src/lib/ui/viz/SeriesRenderer.props.test.tsx
```

#### New fieldsets

```
src/components/VisualizationContainer/VizSettingsForm/AreaChartForm.tsx
src/components/VisualizationContainer/VizSettingsForm/BubbleChartForm.tsx
src/components/VisualizationContainer/VizSettingsForm/BubbleSeriesFieldset.tsx
src/components/VisualizationContainer/VizSettingsForm/FunnelChartForm.tsx
src/components/VisualizationContainer/VizSettingsForm/PieChartForm.tsx
src/components/VisualizationContainer/VizSettingsForm/PieFunnelChartForm.test.tsx
src/components/VisualizationContainer/VizSettingsForm/RadarChartForm.tsx
src/components/VisualizationContainer/VizSettingsForm/ScatterChartForm.tsx
src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm.tsx
src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm.descriptors.test.tsx
src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm.test.tsx
src/components/VisualizationContainer/VizSettingsForm/PairSeriesFieldset.tsx
src/components/VisualizationContainer/VizSettingsForm/Control.tsx
```

#### Dashboard data migration

```
shared/models/dashboard/migrations/AvaPageDataMigrationV3.ts (+ test)
```

(Place this alongside the existing migrations directory on `develop`. The exact path depends on how `develop` organizes the migrations folder — find where `AvaPageDataMigrationV2` lives and drop V3 next to it. **Do not** ship `AvaPageDataMigrationV4` here — that lands with row #69.)

### Files to surgically edit on `develop`

#### Chart config modules

- `shared/models/vizs/BarChartVizConfig/BarChartVizConfigs.ts`
  - Add `series` array (replaces flat `yAxisKey`), `layout`, `withLegend`, `chartStyle`.
  - Update `hydrateFromQueryResult` to call `hydrateXYSeriesFromQueryResult`.
- `shared/models/vizs/BarChartVizConfig/BarChartVizConfig.types.ts`
  - Add the new fields to the type union.
- `shared/models/vizs/LineChartVizConfig/LineChartVizConfigs.ts`
  - Add `series`, `withLegend`, `curveType`, `chartStyle`.
  - Same hydration update.
- `shared/models/vizs/LineChartVizConfig/LineChartVizConfig.types.ts`
- `shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfigs.ts`
  - Refactor to per-series (`xKey`, `yKey`), remove flat-field shape.
- `shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts`
- `shared/models/vizs/TableVizConfig/TableVizConfigs.ts` (and `.types.ts`)
  - Minor adjustments for series-shape consistency.
- `shared/models/vizs/VizConfig/VizConfig.types.ts`
  - Expand the discriminated union to include `pie | funnel | radar | bubble | area` alongside the existing types.
- `shared/models/vizs/VizConfig/VizConfigs.ts`
  - Add module impls for pie / funnel / radar / area / bubble.
- `shared/models/vizs/VizConfig/IVizConfigModule.ts`
  - Clarify the `hydrateFromQueryResult` contract (each module dispatches to the right helper).

#### Render components

- `src/lib/ui/viz/BarChart.tsx`
  - Add `withLegend`, `chartStyle` plumbing; thread `dateColumns` for time-aware axes.
- `src/lib/ui/viz/LineChart.tsx`
  - Add `withLegend`, `curveType`, `chartStyle`.
- `src/lib/ui/viz/ScatterChart.tsx`
  - Minor adjustments to consume the new per-series shape.
- `src/lib/ui/viz/DataGrid.tsx`
  - Minor.
- `src/lib/ui/viz/ChartTypes.ts`
  - Extend the chart-type registry to include pie / funnel / radar / area / bubble.

#### Forms

- `src/components/VisualizationContainer/VizSettingsForm/BarChartForm.tsx` — refactor to use series arrays + descriptors.
- `src/components/VisualizationContainer/VizSettingsForm/LineChartForm.tsx` — same.
- `src/components/VisualizationContainer/VizSettingsForm/VizSettingsForm.tsx` — router across all 8 chart-type forms.
- `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody.tsx` — support the new form components.
- `src/components/VisualizationContainer/VizSettingsForm/VizSettingsForm.test.tsx` — update fixtures.

#### Host container

- `src/components/VisualizationContainer/VisualizationContainer.tsx`
  - Dispatch for all 8 chart types (was 4–5).
  - Add Zod schemas for each new type.

#### Migration registry

- `shared/models/dashboard/migrations/index.ts` (or whatever aggregates the migrations on `develop`)
  - Register `AvaPageDataMigrationV3` so it runs on dashboard load.

### Files to delete

None.

### Dependency changes

None. Existing dependencies cover the entire stack:

- `@mantine/charts: ^9.2.0`
- `recharts: ^3.8.1`

`AreaChart.tsx` uses raw Recharts (bypasses a Mantine Fragment-rendering quirk) — verify Recharts version stays aligned in `package.json`.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run \
  shared/models/vizs \
  shared/models/dashboard/migrations \
  src/components/VisualizationContainer \
  src/lib/ui/viz
```

All must pass. The hydration tests (7 new files) cover prune-on-column-change and the pie/scatter/bubble/radar paths. The V3 migration tests cover the bar/line/area `yAxisKey` → `series[]` upgrade and any downgrade safeguards.

### Manual

1. `pnpm dev`.
2. Open the Data Explorer with a saved dataset that has at least one numeric and one date column.
3. **XY suite (bar/line/area)** — switch chart type via the Visualization Settings panel. Confirm:
   - Defaults are seeded from query columns (auto-hydration).
   - Adding a second series via the Series fieldset renders correctly.
   - Removing a column from the query (re-edit SQL) prunes the dependent series keys — the chart re-renders without crashing.
   - `CurveType` (Line/Area) and `withLegend` (Bar/Line/Area) toggle in the form and reflect on the chart.
4. **Scatter / Bubble** — confirm xKey/yKey/sizeKey wiring and per-series rendering.
5. **Pie / Funnel** — confirm nameKey/valueKey fieldset, donut variant (pie only), label toggles, and that hydration seeds defaults from the first categorical + numeric columns.
6. **Radar** — confirm series rendering against numeric columns; axis is the categorical column.
7. Open an existing dashboard that contains a v2-shape DataViz block (created on `develop` before this PR lands). Reload the dashboard. Confirm:
   - The V3 migration runs at load time.
   - The block re-renders identically to before (single-series equivalent).
   - The block's stored config (inspect via React DevTools or a `console.log`) now uses the `series` array shape.
8. Create a new DataViz block from the chat tool (uses `addDashboardBlock` from row #65 if available, otherwise via the dashboard editor). Confirm the new shape is the default.

If your dev environment doesn't have a v2-shape dashboard handy, hand-craft one in Supabase or via a fixture and verify the migration runs. **Don't ship without confirming this.**

## Risks + things to look out for

- **Dashboard data migration V3 must run on every existing dashboard.** `AvaPageDataMigrationV3` is application-level (no DB schema change), but if a dashboard loads before the migration runs you'll get blank charts. Verify the migration registry (`migrations/index.ts` or equivalent) wires V3 in.
- **V3 vs V4 ordering.** Row #69 (`dashboard-per-viz-filters`) ships `AvaPageDataMigrationV4`. V3 must land first. If you find you're holding V4 already on `develop` somehow (you shouldn't), stop and surface — the migration ordering matters.
- **AreaChart uses raw Recharts** (comment: bypasses Mantine Fragment bug). Don't switch it to `@mantine/charts` — the comment is load-bearing.
- **Chart-color-picker (row #14)** is bundled in CHECKPOINT 1's chart fixes. It ships **alongside** this row (commit `c8fb6b6`), not as a follow-up. If you find color rendering broken on big-number columns, that's the row #14 fix — verify it's included in the modified files above.
- **Chat better P-block generation (row #21)** teaches the chat tool to suggest pie/funnel/radar. It's a follow-up to this row; don't try to fold it in.
- **`shouldHydrateVizFromQueryResult` short-circuit.** The "2B short-circuit" path returns early when both axes are still valid — without it, every query result reruns hydration unnecessarily. Verify the optimization survives the port.
- **Recharts version drift.** Pinned to `^3.8.1` on both branches. If `develop` has drifted to a newer Recharts during the wait, run the chart fieldsets QA carefully — Recharts has shifted props between minor versions before.

## How to mark this feature completed

When the operator runs `/deslop complete viz-multi-series-and-chart-types`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-009/viz-multi-series-and-chart-types origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-009/viz-multi-series-and-chart-types 2>/dev/null || true`
   - `git push origin --delete refactor-009/viz-multi-series-and-chart-types`
   - `rm docs/deslop/009-viz-multi-series-and-chart-types.md`
   - `docs/deslop/ALL_FEATURES.md`: flip row #9 to `[x] ($MERGE_SHA)`.
   - `docs/deslop/STATE.md`: move the entry from `In-flight migrations` to `Completed migrations log`.
   - Commit `chore(deslop): mark viz-multi-series-and-chart-types as completed ($MERGE_SHA)` and push to `feat/ict4d-demo`.
