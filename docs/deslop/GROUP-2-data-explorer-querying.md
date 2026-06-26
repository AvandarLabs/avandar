# Group 2 — Data Explorer & querying (consolidated migration plan)

- **Group**: 2 of 5
- **Name**: Data Explorer & querying
- **Refactor branch**: `refactor-g2/data-explorer-querying`
- **Migration strategy:** one PR per group — the whole group lands as a single PR off `refactor-g2/data-explorer-querying`; the per-row order below is the in-branch build sequence.
- **Source branch**: `feat/ict4d-demo`
- **Target branch / base**: `origin/develop` — base captured at `6ec98d45`
  in the brief, but `origin/develop` has since advanced to **`6ec98d45`**
  (PR #253 `fix(test-utils): mount custom render wrapper`). Cut the
  refactor branch from whatever `origin/develop` HEAD is at migration
  time and re-run the drift checks below.
- **Constituent rows**: `#008` floating-query-windows, `#009`
  viz-multi-series-and-chart-types, `#010` viz-settings-fieldsets,
  `#011` codemirror-sql-editor, `#012` sql-pill-rendering, `#013`
  chart-number-formatting, `#096` data-explorer-url-session-sync,
  `#097` data-explorer-auto-open-ai-panel, `#044`
  sql-to-structured-query, `#045` structured-query-to-sql, `#046`
  recursive-filter-ui, `#047` sql-form-sync-data-explorer, `#049`
  duckdb-sql-parser-updates.
- **Depends on**: **Group 1 (data foundation & ingestion)** must land
  first. The Data Explorer sits directly on the import pipeline +
  `DuckDbClient`, the `OpenDatasetDrawer`/`SavedDatasetsView` rework,
  `datasetRowCountCache`, `manualQueryLimit`, and
  `resolveManualQueryForExecution`. The huge
  `origin/develop..feat/ict4d-demo` diff under `src/views/DataExplorerApp/`
  (~15k lines) is mostly Group 1 surface interleaved with this group —
  do not try to migrate Group 2 against a develop that lacks Group 1.
- **Estimated size**: **very large.** `#009` alone is ~80 files /
  +7.2k LoC; `#008`, `#011`, `#012`, `#096` are each medium; the SQL
  machinery (`#044`/`#045`/`#046`/`#047`/`#049`) is medium; `#010`,
  `#013`, `#097` are small/tiny. As a group this is the heaviest of the
  five, but it still ships as a **single PR** off
  `refactor-g2/data-explorer-querying`. The numbered order below is the
  in-branch build sequence (the order to port the rows as commits on the
  branch), NOT a list of separate PRs. (Fallback the operator declined for
  now: if the single PR proves intractable to review, the natural seam is
  the viz chain vs. the SQL chain vs. the floating-windows/URL-sync surface.)

---

## Notes for future you

Read this whole section before touching anything. The per-feature
plan files in this group were authored on 2026-06-07 against an older
`develop`/`feat` snapshot and several of their **file paths are now
stale**. The corrections below override the paths in the individual
`NNN-*.md` files.

### Drift vs current develop (verified 2026-06-26 via git reads)

1. **`#096` is the single biggest drift. develop already has a
   *predecessor* URL-sync implementation that feat REPLACED, not a
   greenfield.** The `#096` plan says "all four new files don't exist
   on develop — clean path-scoped checkout." That is **false now.**
   - develop (since PR #238 `98d6535c`) has:
     `src/views/DataExplorerApp/serializeDataExplorerStateToUrl/`,
     `.../buildDataExplorerStateFromUrl/`,
     `.../useDataExplorerUrlSync/useDataExplorerUrlSync.ts` +
     `useHydrateDataExplorerStateFromUrl.ts`, and
     `.../QueryColumnMultiSelect/remapColumnsByBaseId.ts`
     (the last is **byte-identical** to feat).
   - feat **deletes** all of those (`serialize…`, `build…`, lowercase
     `useDataExplorerUrlSync/`) and consolidates into
     `src/views/DataExplorerApp/DataExplorerURLState.ts` (+332),
     `dataExplorerURLHydration.ts` (+54), and `useDataExplorerURLSync.ts`
     (capital "URL", +299).
   - The driver commit the plan cites (`7b738f13`) **is already an
     ancestor of develop** — that SHA is the *base* PR #238, not the
     refactor feat layered on top afterward. So `#096` is a **refactor
     of an existing develop feature**, and its real job is: add the
     three consolidated files AND **delete develop's three lowercase
     url-sync dirs**. Real paths are flat under `DataExplorerApp/`, NOT
     under a `urlState/` subdir as the plan claims. Confirm the deletes
     do not orphan imports in `DataExplorerApp.tsx`.

2. **`#008` (floating windows): develop has NO `FloatingPanel/` and NO
   old `QueryDetailsPanel/` sidebar dir.** The plan's "delete
   `src/views/DataExplorerApp/QueryDetailsPanel/`" is a no-op — that dir
   doesn't exist on develop. The real feat `FloatingPanel/` tree is
   richer than the plan lists; copy the actual files:
   `FloatingPanel.tsx`, `FloatingPanel.module.css`,
   `FloatingPanel.escapeClose.test.tsx`, `isFloatingPanelTypingTarget.ts`,
   `shouldAutoFocusFloatingPanelOnOpen.ts`, `useFloatingPanelDismiss.ts`,
   `useFloatingPanelDismiss.test.ts`, `useFloatingPanelMorphTransition.ts`.
   The `dataExplorerPanelPreferences.ts` + `.test.ts` and
   `QueryDetailsBody/` + `SqlQueryView/` trees are new on feat and absent
   from develop (clean copy).

3. **SQL parser machinery lives in `shared/models/queries/StructuredQuery/`,
   NOT `src/lib/sql/`.** The `#044`/`#045`/`#049` plans all say
   `src/lib/sql/...`. Real paths:
   - `shared/models/queries/StructuredQuery/sqlToStructuredQuery.ts`
     (+ `.test.ts`) — `#044`.
   - `shared/models/queries/StructuredQuery/structuredQueryToSQL.ts`
     (+ `.test.ts`, **capital SQL**) — `#045`. develop already has the
     sibling `StructuredQuery.ts`, `StructuredQuery.types.ts`,
     `StructuredQueryModule.ts`, `toRawDuckDBQuery.ts` in that dir, so
     `#045`'s "extract from `toRawDuckDBQuery`" is a surgical edit of an
     existing develop file at
     `shared/models/queries/StructuredQuery/toRawDuckDBQuery.ts`.
   - `#049` parser-config updates land in `sqlToStructuredQuery.ts`
     (same dir), not `src/lib/sql/`.

4. **`#046` (recursive filter UI) real paths differ.** Plan says
   `src/views/DataExplorerApp/QueryForm/QueryFiltersField.tsx` (correct)
   plus `src/lib/query/QueryFilterGroup.ts` and
   `src/lib/query/queryBuilderAdapter.ts` (these `src/lib/query/` paths
   were not found on feat — locate the real intermediate-shape/adapter
   files before copying; they may be colocated under `QueryForm/` or
   `shared/models/queries/`). feat also ships
   `QueryFiltersField.module.css` and
   `QueryForm/buildSqlMappingDatasets.ts` +
   `QueryForm/useSqlToStructuredQuery.ts` that the plan omits.

5. **`#047` (sql↔form sync) real paths differ.** Plan lists a
   `DataExplorerApp/sync/` dir (`applySqlMapping.ts`, `useSqlFormSync.ts`,
   `SqlSyncAlert.tsx`). On feat the sync wiring lives in
   `QueryForm/useSqlToStructuredQuery.ts`,
   `QueryForm/useManualQueryDataSourceChange.ts`,
   `QueryForm/buildSqlMappingDatasets.ts`, and the
   `ManualQueryForm.tsx`/`DataExplorerApp.tsx` edits — there is no
   `sync/` subdir. Re-derive the exact file set from the
   `QueryForm/` diff at migration time; the plan's filenames are
   aspirational.

6. **`#097` (auto-open AI panel): the chat panel it opens already exists
   on develop.** `src/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager.tsx`
   is present on develop (cleaned up by PR #238). `ChatPanelStateManager.useContext()`
   returns `[state, dispatch]` and the effect calls `chatPanelDispatch.open()`.
   `#097` has **no plan file** — its full inline plan is authored in the
   per-feature breakdown below (commit `6d3841b6`, PR #240).

7. **`dataExplorerPanelPreferences.ts` is touched by THREE rows.** It is
   created by `#008` (panel open/collapse/position prefs), and `#097`
   appends `DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY` to it. Build `#008`'s
   commit (the base file) before `#097`'s commit (which appends the one
   exported const + the `useAuth.ts` import) on the branch. Do not let
   `#097` recreate the file.

8. **`#097` introduces a small duplication you should clean up.** In
   `6d3841b6`, `DataExplorerApp.tsx` defines a local literal
   `const AI_PANEL_SESSION_KEY = "ava.data-explorer.ai-panel-auto-opened"`
   while `dataExplorerPanelPreferences.ts` exports
   `DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY` with the **same string**, and
   `useAuth.ts` imports the exported one. Prefer importing the exported
   constant in `DataExplorerApp.tsx` too, so the sign-out clear and the
   mount guard can never drift apart. (Same string today; keep them one
   source.)

9. **test-utils `render` wrapper fix is already on develop (PR #253,
   `6ec98d45`).** `src/test-utils/render/render.tsx` now composes a
   custom `options.wrapper` *inside* `TestProviders` instead of dropping
   it. Several Group 2 vitest suites pass a custom `wrapper` (chart
   fieldset tests, sync tests). Migrating onto a develop that predates
   `6ec98d45` would make those tests silently lose their wrapper — so
   **base the refactor branch at or after `6ec98d45`.**

### Multi-feature hotspot files (touched by several rows in this group)

Sequence these so later rows fold onto earlier ones cleanly; expect
conflicts if migrated out of order:

- **`src/views/DataExplorerApp/DataExplorerApp.tsx`** — the central
  hotspot. Edited by `#008` (mount FloatingPanels), `#096` (mount
  URL-sync, reset-to-bare), `#011` (swap textarea→`SqlEditor`), `#047`
  (mount sync hook + Alert), `#097` (`openChatPanelOnMount` effect +
  `ChatPanelStateManager.useContext`). +513/−254 vs develop. Migrate
  `#008` first to establish the new render tree, then layer the rest.
- **`src/views/DataExplorerApp/dataExplorerPanelPreferences.ts`** —
  `#008` (creates) + `#097` (appends AI-panel key). See note 7.
- **`shared/models/queries/StructuredQuery/sqlToStructuredQuery.ts`** —
  `#044` (creates) + `#049` (parser-config mappings). `#049` is a
  surgical follow-up edit to the file `#044` ships.
- **`shared/models/queries/StructuredQuery/structuredQueryToSQL.ts`** /
  **`toRawDuckDBQuery.ts`** — `#045` (extract renderer) + `#046`
  (WHERE-clause rendering for the recursive filter shape).
- **`src/components/VisualizationContainer/VizSettingsForm/*`** — `#009`
  (creates the per-chart fieldsets + `SeriesAwareVizForm`,
  `VizSettingsForm.tsx`, `VizSettingsFormBody.tsx`) + `#010`
  (re-groups the same fieldsets into labelled sections). `#010` is a
  pure layout refinement on top of `#009`.
- **`src/components/SqlEditor/SqlEditor.tsx`** — `#011` (creates) +
  `#012` (adds pill-decoration extension + `pillsEnabled` prop).
- **`src/components/AvaSqlBlock/AvaSqlBlock.tsx`** — `#012` (read-only
  pills); consumes `SqlEditor` from `#011`.
- **`src/lib/ui/viz/*Chart.tsx` (Bar/Line/Area/Scatter/Bubble/Pie/Funnel/Radar)
  + `DataGrid.tsx`** — `#009` (creates/expands all render components) +
  `#013` (swaps inline number formatting for `formatChartNumber`). `#013`
  must land after `#009` because half its target files don't exist until
  `#009` ships them.
- **Mixed driver commit `4e85af6`** spans `#010` (VizSettingsForm) AND
  `#012` (AvaSqlBlock pills). When porting either, scope with
  `git show 4e85af6 -- <subtree>`. Same for `c8fb6b6` (`#009` color-fix
  + `#013` number-format) and `673419e` (`#001` import pipeline + `#049`
  parser) and `7b738f13` (`#009` chart suite + `#096` URL sync) and
  `a01db18` (`#012` pills + `#021` chat pblock).

### Intra-group sequencing + operator decisions

- **Build it row-by-row on the branch, then ship one PR.** The group is
  large (`#009` alone is a multi-pass review), but it lands as a single
  PR off `refactor-g2/...`; the row order below is the in-branch commit
  sequence, not separate PRs.
- **`#047` is the capstone** of the SQL↔form sync machinery: it depends
  on `#044` (SQL→structured), `#045` (structured→SQL), and `#046`
  (recursive filter UI) all being merged first. `#049` (parser config)
  should also precede `#047` so round-tripping handles DuckDB built-ins.
- **`#096` deletes develop code.** Flag to the operator that the `#096`
  commit removes three existing develop directories
  (`serializeDataExplorerStateToUrl/`, `buildDataExplorerStateFromUrl/`,
  `useDataExplorerUrlSync/`) and replaces them — this is refactor work,
  not additive, and reviewers should diff behavior (short keys
  `ds/cols/agg/orderBy/orderDir/sql/vc/od` are preserved on both sides;
  do not change them — deep links exist in the wild).
- **`#010`/`#013` are visual/helper refinements** that only make sense
  after `#009`. Build them as commits right after `#009` so the related
  diffs sit together in the single group PR.
- **`#097` is trivial** (3 files, +26 LoC) and can ride near the end
  of the branch once `#008` (panel prefs file) and the chat panel are in
  place.

---

## Migration order within this group

Numbered dependency order. Rows with no listed prerequisite within the
group may be parallelized, but the SQL chain and viz chain each have a
strict internal order.

**Foundational / independent (any order, but do these first):**

1. **`#008` floating-query-windows** — establishes the new
   `DataExplorerApp.tsx` render tree (FloatingPanels), ships
   `dataExplorerPanelPreferences.ts`, `QueryDetailsBody/`,
   `SqlQueryView/`. Everything else mounts into this tree.
2. **`#009` viz-multi-series-and-chart-types** — the chart suite +
   fieldsets + hydration + V3 dashboard migration. Largest row; do it
   early so `#010`/`#013` have anchors.
3. **`#011` codemirror-sql-editor** — the editor primitive
   (`SqlEditor/`), adds `@codemirror/*` + `@uiw/react-codemirror` deps.
4. **`#044` sql-to-structured-query** — `sqlToStructuredQuery.ts`, adds
   `node-sql-parser` dep.
5. **`#045` structured-query-to-sql** — extracts `structuredQueryToSQL.ts`
   from `toRawDuckDBQuery.ts`; uses `knex` (already on develop).

**Layered (require the above):**

6. **`#010` viz-settings-fieldsets** — needs `#009`. Layout-only reflow
   of the VizSettingsForm fieldsets.
7. **`#013` chart-number-formatting** — needs `#009`. `formatChartNumber`
   helper wired into all render components.
8. **`#012` sql-pill-rendering** — needs `#011`. Pills in `SqlEditor` +
   `AvaSqlBlock`.
9. **`#049` duckdb-sql-parser-updates** — needs `#044`. Parser-config
   mappings in `sqlToStructuredQuery.ts`.
10. **`#046` recursive-filter-ui** — needs `#045`. `QueryFiltersField`
    + `react-querybuilder` deps; renderer in `#045` walks the tree.
11. **`#096` data-explorer-url-session-sync** — independent of the SQL
    chain, but touches `DataExplorerApp.tsx`, so sequence after `#008`.
    **Replaces develop's lowercase url-sync trio** (see Notes #1).

**Capstones (require multiple of the above):**

12. **`#047` sql-form-sync-data-explorer** — needs `#044`, `#045`,
    `#046` (and benefits from `#049`). Wires bidirectional sync +
    `SqlSyncAlert` into the manual query form.
13. **`#097` data-explorer-auto-open-ai-panel** — needs `#008` (panel
    prefs file) + the chat panel (already on develop). Tiny.

---

## Consolidated changes

Deduped across all 13 rows. **All paths verified against
`feat/ict4d-demo` and `origin/develop` on 2026-06-26.** Where a per-row
plan disagrees, this section wins.

### Files to copy verbatim (new on develop)

```
# #008 floating windows
src/components/FloatingPanel/FloatingPanel.tsx
src/components/FloatingPanel/FloatingPanel.module.css
src/components/FloatingPanel/FloatingPanel.escapeClose.test.tsx
src/components/FloatingPanel/isFloatingPanelTypingTarget.ts
src/components/FloatingPanel/shouldAutoFocusFloatingPanelOnOpen.ts
src/components/FloatingPanel/useFloatingPanelDismiss.ts
src/components/FloatingPanel/useFloatingPanelDismiss.test.ts
src/components/FloatingPanel/useFloatingPanelMorphTransition.ts
src/views/DataExplorerApp/QueryDetailsBody/QueryDetailsBody.tsx
src/views/DataExplorerApp/QueryDetailsBody/QueryDetailsBody.module.css
src/views/DataExplorerApp/SqlQueryView/SqlQueryView.tsx
src/views/DataExplorerApp/SqlQueryView/SqlQueryView.module.css
src/views/DataExplorerApp/dataExplorerPanelPreferences.ts        # base file; #097 appends to it
src/views/DataExplorerApp/dataExplorerPanelPreferences.test.ts

# #009 viz suite — shared models (chart configs, types, hydration helpers)
shared/models/vizs/CurveType.ts
shared/models/vizs/SeriesConfig.ts
shared/models/vizs/ChartStyle.ts
shared/models/vizs/SettingDescriptor.ts
shared/models/vizs/resolveColumnKey.ts
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
shared/models/vizs/PieChartVizConfig/{*.types.ts,*Configs.ts}
shared/models/vizs/FunnelChartVizConfig/{*.types.ts,*Configs.ts}
shared/models/vizs/RadarChartVizConfig/{*.types.ts,*Configs.ts}
shared/models/vizs/BubbleChartVizConfig/{*.types.ts,*Configs.ts}
shared/models/vizs/AreaChartVizConfig/{*.types.ts,*Configs.ts}
shared/models/dashboard/migrations/AvaPageDataMigrationV3.ts (+ test)  # place next to V2; do NOT ship V4 (that's #069)

# #009 viz suite — render layer + fieldsets
src/lib/ui/viz/PieChart.tsx
src/lib/ui/viz/FunnelChart.tsx
src/lib/ui/viz/RadarChart.tsx
src/lib/ui/viz/BubbleChart.tsx
src/lib/ui/viz/AreaChart.tsx            # raw Recharts on purpose (Mantine Fragment bug) — do not "fix"
src/lib/ui/viz/renderXYComposite.tsx
src/lib/ui/viz/ChartConstants.ts
src/lib/ui/viz/SeriesRenderer.props.test.tsx
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

# #011 CodeMirror SQL editor
src/components/SqlEditor/SqlEditor.tsx
src/components/SqlEditor/SqlEditor.module.css
src/components/SqlEditor/SqlEditor.test.tsx
src/components/SqlEditor/SqlQueryEditPanel.tsx
src/components/SqlEditor/index.ts

# #012 SQL pills
src/components/AvaSqlBlock/AvaSqlBlock.tsx
src/components/AvaSqlBlock/AvaSqlBlock.module.css
src/components/AvaSqlBlock/AvaSqlBlock.test.tsx
src/components/AvaSqlBlock/PillEditPopover.tsx
src/components/AvaSqlBlock/PillEditPopover.test.tsx
src/components/AvaSqlBlock/index.ts
# (pill CodeMirror decoration extension: locate under src/components/SqlEditor/ — exact filename per source tree)

# #013 chart number formatting
src/lib/ui/viz/formatChartNumber.ts
src/lib/ui/viz/formatChartNumber.test.ts

# #044 SQL → structured
shared/models/queries/StructuredQuery/sqlToStructuredQuery.ts
shared/models/queries/StructuredQuery/sqlToStructuredQuery.test.ts

# #045 structured → SQL
shared/models/queries/StructuredQuery/structuredQueryToSQL.ts
shared/models/queries/StructuredQuery/structuredQueryToSQL.test.ts

# #046 recursive filter UI
src/views/DataExplorerApp/QueryForm/QueryFiltersField.tsx
src/views/DataExplorerApp/QueryForm/QueryFiltersField.module.css
src/views/DataExplorerApp/QueryForm/buildSqlMappingDatasets.ts
# (QueryFilterGroup intermediate shape + queryBuilderAdapter: locate real paths on feat — NOT under src/lib/query/)

# #047 sql↔form sync
src/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery.ts
src/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange.ts
# (SqlSyncAlert: derive from ManualQueryForm.tsx / DataExplorerApp.tsx diff — no sync/ subdir on feat)

# #096 URL session sync (consolidated form that REPLACES develop's lowercase trio)
src/views/DataExplorerApp/DataExplorerURLState.ts
src/views/DataExplorerApp/dataExplorerURLHydration.ts
src/views/DataExplorerApp/dataExplorerURLHydration.test.ts
src/views/DataExplorerApp/useDataExplorerURLSync.ts
```

### Files to surgically edit on develop

- **`src/views/DataExplorerApp/DataExplorerApp.tsx`** (the hotspot —
  edited by #008, #096, #011, #047, #097): mount FloatingPanels (#008),
  wire URL sync + reset-to-bare (#096), swap SQL textarea→`SqlEditor`
  (#011), mount sync hook + `SqlSyncAlert` (#047), add
  `openChatPanelOnMount` effect + `ChatPanelStateManager.useContext()`
  (#097). Layer in the migration order above.
- **`src/views/DataExplorerApp/dataExplorerPanelPreferences.ts`** (#097):
  append exported `DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY`.
- **`src/lib/hooks/auth/useAuth.ts`** (#097): import the AI-panel key and
  `sessionStorage.removeItem(...)` it on `SIGNED_OUT` (restructure the
  existing `if (event === "SIGNED_OUT" && ...)` into a nested `if`).
- **`src/config/Theme/Theme.ts`** (#008): add `floatingPanel: 250`
  z-index constant (between app-shell 200 and Mantine modal 300).
- **`shared/models/vizs/{Bar,Line,Scatter,Table}…VizConfig/*` +
  `VizConfig/{VizConfig.types.ts,VizConfigs.ts,IVizConfigModule.ts}`**
  (#009): add `series` arrays, `withLegend`, `curveType`, `chartStyle`;
  expand the discriminated union to pie/funnel/radar/area/bubble; update
  `hydrateFromQueryResult` dispatch.
- **`src/lib/ui/viz/{BarChart,LineChart,ScatterChart,DataGrid}.tsx` +
  `ChartTypes.ts`** (#009): plumb new settings; extend chart registry.
  Then (#013) replace inline `toLocaleString()`/`Math.round` with
  `formatChartNumber(value)` across all 9 render components.
- **`src/components/VisualizationContainer/VisualizationContainer.tsx`**
  (#009): dispatch 8 chart types + Zod schemas.
- **`src/components/VisualizationContainer/VizSettingsForm/{VizSettingsForm,VizSettingsFormBody,BarChartForm,LineChartForm,VizSettingsForm.test}.tsx`**
  (#009 creates/edits) then (#010) re-group into labelled fieldsets.
- **`shared/models/dashboard/migrations/index.ts`** (#009): register
  `AvaPageDataMigrationV3`.
- **`src/components/SqlEditor/SqlEditor.tsx`** (#012): add pill-decoration
  extension + `pillsEnabled?: boolean` prop.
- **`shared/models/queries/StructuredQuery/toRawDuckDBQuery.ts`** (#045):
  replace inline rendering with `structuredQueryToSQL(...)`.
- **`shared/models/queries/StructuredQuery/sqlToStructuredQuery.ts`**
  (#049): add DuckDB built-in mappings (`LIST_VALUE`, `STRUCT_PACK`,
  `*::TYPE` casts).
- **`src/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect.tsx`**
  (#096): call `remapColumnsByBaseId` (note: `remapColumnsByBaseId.ts`
  already exists on develop, identical — keep it).
- **`src/views/DataExplorerApp/QueryForm/ManualQueryForm.tsx`** (#046/#047):
  mount `QueryFiltersField` + sync hooks + Alert.
- Any chat-side `AvaSqlBlock` caller (e.g. ChatPanel message renderer)
  (#012): render via `<SqlEditor readOnly pillsEnabled />`.

### Files to delete on develop

```
# #096 — develop's lowercase predecessor url-sync, REPLACED by the consolidated form
src/views/DataExplorerApp/serializeDataExplorerStateToUrl/serializeDataExplorerStateToUrl.ts
src/views/DataExplorerApp/serializeDataExplorerStateToUrl/serializeDataExplorerStateToUrl.test.ts
src/views/DataExplorerApp/buildDataExplorerStateFromUrl/buildDataExplorerStateFromUrl.ts
src/views/DataExplorerApp/buildDataExplorerStateFromUrl/buildDataExplorerStateFromUrl.test.ts
src/views/DataExplorerApp/useDataExplorerUrlSync/useDataExplorerUrlSync.ts
src/views/DataExplorerApp/useDataExplorerUrlSync/useHydrateDataExplorerStateFromUrl.ts
```

(No `QueryDetailsPanel/` sidebar dir exists on develop, despite the #008
plan — that delete is a no-op. `remapColumnsByBaseId.ts` is **kept**.)

### Dependency changes

All already present on `feat/ict4d-demo`'s `package.json`; add to develop
as each row lands. develop currently has only `knex@^3.1.0`.

- **#011**: `@codemirror/state@^6.6.0`, `@codemirror/view@^6.43.0`,
  `@codemirror/lang-sql@^6.10.0`, `@codemirror/commands@^6.10.3`,
  `@codemirror/language@^6.12.3`, `@codemirror/autocomplete@^6.20.2`,
  `@uiw/react-codemirror@^4.25.9`. (Confirm Vite still lazy-chunks
  CodeMirror; ~150 KB gzipped.)
- **#044**: `node-sql-parser@^5.4.0`.
- **#045**: `knex@^3.1.0` — already on develop, no change.
- **#046**: `react-querybuilder@^8.16.1`,
  `@react-querybuilder/mantine@^8.16.1`.
- **#008 / #009 / #010 / #012 / #013 / #047 / #049 / #096 / #097**: none.

---

## Per-feature breakdown

Each subsection points to its source plan. Where this group doc and the
plan disagree on paths, **this doc wins** (the plans predate current
drift). Migration-order index in brackets.

### [1] `#008` floating-query-windows → `008-floating-query-windows.md`
Container feature: two draggable/collapsible floating windows replace the
old sidebar; ships `FloatingPanel/`, `QueryDetailsBody/`, `SqlQueryView/`,
`dataExplorerPanelPreferences.ts`. z-index 250. **No `QueryDetailsPanel/`
to delete on develop.** Copy the full `FloatingPanel/` tree (8 files, see
Notes #2). Establishes the `DataExplorerApp.tsx` render tree the rest of
the group layers onto.

### [2] `#009` viz-multi-series-and-chart-types → `009-viz-multi-series-and-chart-types.md`
Largest row (~80 files, +7.2k). Full 8-chart suite, per-series config,
auto-hydration, `CurveType`/`withLegend`, `AvaPageDataMigrationV3`. Absorbs
retired #14 (color-picker fix, `c8fb6b6`). V3 migration + hydration tests
are mandatory. Do not ship V4.

### [3] `#011` codemirror-sql-editor → `011-codemirror-sql-editor.md`
`SqlEditor/` primitive (CodeMirror 6) replacing the textarea. Adds
`@codemirror/*` + `@uiw/react-codemirror`. Reusable, read-only mode for
`AvaSqlBlock`. Watch bundle size / lazy chunk.

### [4] `#044` sql-to-structured-query → `044-sql-to-structured-query.md`
`sqlToStructuredQuery()` in `shared/models/queries/StructuredQuery/`
(NOT `src/lib/sql/`). 12 tests. Adds `node-sql-parser`. `unmappedReasons`
surfaces gaps; don't make it exhaustive.

### [5] `#045` structured-query-to-sql → `045-structured-query-to-sql.md`
`structuredQueryToSQL()` (capital SQL) extracted from existing
`shared/models/queries/StructuredQuery/toRawDuckDBQuery.ts`. Knex-based;
renders the recursive WHERE clause for #046. 5 tests.

### [6] `#010` viz-settings-fieldsets → `010-viz-settings-fieldsets.md`
Layout-only fieldset regrouping (Axes/Series/Style/Legend). Needs #009.
Driver `4e85af6` is mixed with #012 — scope to `VizSettingsForm/` only.
Visual QA only.

### [7] `#013` chart-number-formatting → `013-chart-number-formatting.md`
`formatChartNumber()` helper wired into all 9 render components. Needs
#009. Driver `c8fb6b6` is mixed with #009's color fix — scope to the
number-format portion. Real path `src/lib/ui/viz/formatChartNumber.ts`.

### [8] `#012` sql-pill-rendering → `012-sql-pill-rendering.md`
Dataset/column pills in `SqlEditor` (interactive) + `AvaSqlBlock`
(read-only). Needs #011. Drivers `4e85af6`/`6febbcf`/`a01db18` are mixed —
scope to pill code. Keep the widened dropdown from `a01db18`.

### [9] `#049` duckdb-sql-parser-updates → `049-duckdb-sql-parser-updates.md`
DuckDB-dialect mappings in `sqlToStructuredQuery.ts`. Needs #044. Driver
`673419e` is mixed with #001 (Group 1) — scope to parser portion.

### [10] `#046` recursive-filter-ui → `046-recursive-filter-ui.md`
`QueryFiltersField` (nested AND/OR) via `react-querybuilder` +
`@react-querybuilder/mantine`. Needs #045 (renderer walks the tree).
Real path `DataExplorerApp/QueryForm/QueryFiltersField.tsx` (+ `.module.css`);
locate the `QueryFilterGroup`/adapter files on feat (NOT `src/lib/query/`).

### [11] `#096` data-explorer-url-session-sync → `096-data-explorer-url-session-sync.md`
**Refactor, not greenfield (see Notes #1).** Ships consolidated
`DataExplorerURLState.ts` + `dataExplorerURLHydration.ts` +
`useDataExplorerURLSync.ts` (flat under `DataExplorerApp/`, capital URL)
and **deletes develop's three lowercase url-sync dirs**. Short keys
preserved. Sequence after #008.

### [12] `#047` sql-form-sync-data-explorer → `047-sql-form-sync-data-explorer.md`
Bidirectional form↔SQL sync + `SqlSyncAlert`. Needs #044, #045, #046
(and #049). Real wiring in `QueryForm/useSqlToStructuredQuery.ts` +
`useManualQueryDataSourceChange.ts` + `ManualQueryForm.tsx` /
`DataExplorerApp.tsx` (no `sync/` subdir on feat — see Notes #5).

### [13] `#097` data-explorer-auto-open-ai-panel — INLINE PLAN (no plan file)

- **Slug**: `data-explorer-auto-open-ai-panel`
- **Refactor branch**: folded into `refactor-g2/...` as a final commit
  on the branch (the group ships as one PR; this is not a separate PR).
- **Depends on**: `#008` (creates `dataExplorerPanelPreferences.ts`).
  The chat panel itself (`ChatPanelStateManager`) is **already on develop**.
- **Source**: PR #240, commit **`6d3841b6`** (3 files, +26/−6 LoC).
- **Estimated size**: tiny.

**What it is**: On the user's first visit to the Data Explorer in a
session, the AI chat panel auto-opens once. A `sessionStorage` guard
(`ava.data-explorer.ai-panel-auto-opened`) prevents re-opening on
subsequent navigations within the same session; the guard is cleared on
sign-out so the panel auto-opens again on next login.

**Files to surgically edit on develop**:

1. `src/views/DataExplorerApp/dataExplorerPanelPreferences.ts` — append:
   ```ts
   /**
    * Session-storage key that guards the one-time auto-open of the AI chat
    * panel when the user first visits the Data Explorer. Must be cleared on
    * sign-out so the panel auto-opens again on the next login.
    */
   export const DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY =
     "ava.data-explorer.ai-panel-auto-opened" as const;
   ```
2. `src/views/DataExplorerApp/DataExplorerApp.tsx`:
   - Import `ChatPanelStateManager` from
     `@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager`.
   - Import `DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY` from
     `./dataExplorerPanelPreferences` **and use it** (do not re-declare a
     local literal — see Notes #8; the upstream commit duplicated the
     string, we de-dupe here).
   - Add `const [, chatPanelDispatch] = ChatPanelStateManager.useContext();`
     near the other state hooks.
   - Add the effect:
     ```tsx
     useEffect(function openChatPanelOnMount() {
       const alreadyOpened = sessionStorage.getItem(
         DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY,
       );
       if (!alreadyOpened) {
         chatPanelDispatch.open();
         sessionStorage.setItem(DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY, "true");
       }
     }, [chatPanelDispatch]);
     ```
3. `src/lib/hooks/auth/useAuth.ts`:
   - Import `DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY` from
     `@/views/DataExplorerApp/dataExplorerPanelPreferences`.
   - Restructure the `onAuthStateChange` handler's `SIGNED_OUT` branch
     into a nested `if` and, after the offline guard, call
     `sessionStorage.removeItem(DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY)`.

**Verification**: `pnpm tsc -b --noEmit`; `pnpm lint`;
`pnpm vitest run src/views/DataExplorerApp src/lib/hooks/auth`. Manual:
open Data Explorer fresh in a new session → chat panel opens once;
navigate away and back → it does not re-open; sign out and back in →
it opens again.

**Mark completed**: handled by the group-level single-PR ritual below —
when the group PR merges, `#097` is flipped to `[x]` along with every
other row (it has no `097-*.md` plan file to delete; this group doc is its
plan of record).

---

## Verification

### Automated

Run after each row's commit on the branch; a full green pass (type-check +
vitest + eslint + relevant e2e) is required before opening the single group
PR. Type-check and lint are global; scope vitest to the row's paths.

```sh
pnpm tsc -b --noEmit
pnpm lint

# #008
pnpm vitest run src/components/FloatingPanel src/views/DataExplorerApp

# #009
pnpm vitest run \
  shared/models/vizs \
  shared/models/dashboard/migrations \
  src/components/VisualizationContainer \
  src/lib/ui/viz

# #010
pnpm vitest run src/components/VisualizationContainer/VizSettingsForm

# #011 / #012
pnpm vitest run src/components/SqlEditor src/components/AvaSqlBlock

# #013
pnpm vitest run src/lib/ui/viz

# #044 / #045 / #049
pnpm vitest run shared/models/queries/StructuredQuery

# #096
pnpm vitest run src/views/DataExplorerApp

# #097
pnpm vitest run src/views/DataExplorerApp src/lib/hooks/auth

# e2e (where applicable)
pnpm playwright test \
  tests/e2e/data-explorer-grid-layout.spec.ts \
  tests/e2e/data-explorer-query-details.spec.ts \
  tests/e2e/dataviz-pblock-visualizations.spec.ts
```

Note: several suites pass a custom `wrapper` to the test-utils `render`;
this only works correctly at/after develop `6ec98d45` (PR #253). Confirm
the base before trusting green output.

### Manual checklist

- **#008**: Data Explorer has no static sidebar; toolbar buttons morph
  in the Query Details + Viz Settings floating windows; drag/collapse/
  close work; state persists in sessionStorage; Mantine modals stack
  above (z-index 250); narrow viewport clamps.
- **#009**: all 8 chart types render; per-series add/remove; prune on
  column removal doesn't crash; `CurveType`/`withLegend` toggle; pie/
  funnel nameKey/valueKey; radar; **load a pre-existing v2 DataViz
  dashboard and confirm V3 migration upgrades it in place** (mandatory).
- **#010**: fieldsets grouped/labelled per
  `docs/superpowers/specs/2026-05-21-sql-pills-viz-settings-design.md`.
- **#011**: SQL editor highlights, line numbers, bracket matching,
  read-only mode; CodeMirror lazy-chunked in `pnpm build`.
- **#012**: dataset/column pills render in editor + `AvaSqlBlock`;
  interactive popover swaps refs; unresolved tokens stay plain text.
- **#013**: million/billion axis ticks render `1.2M`; tooltip uses same
  formatter; locale-aware (`de-DE` → `1,2M`).
- **#044/#045/#046/#047/#049**: in Data Explorer, edit form → SQL
  regenerates; edit SQL → form round-trips or shows `SqlSyncAlert` with
  reasons; nested AND/OR filter builds correct WHERE; DuckDB built-ins
  parse.
- **#096**: state serializes to URL (short keys); new-tab hydration
  matches; reset goes bare (`?` absent); `ds=vds:<id>` rehydrates virtual
  datasets; stale `baseId` doesn't crash (`remapColumnsByBaseId` drops it).
- **#097**: fresh-session Data Explorer auto-opens chat panel once; no
  re-open on intra-session nav; reopens after sign-out/sign-in.

---

## How to mark this group completed

This group ships as a **single PR** off `refactor-g2/data-explorer-querying`.
The operator opens exactly one PR for the group against `develop`. On merge:

1. Verify the refactor branch merged into `develop`
   (`git merge-base --is-ancestor refactor-g2/data-explorer-querying origin/develop`).
2. `MERGE_SHA=$(git rev-parse --short origin/develop)`.
3. Flip ALL 13 constituent rows (#008, #009, #010, #011, #012, #013, #044,
   #045, #046, #047, #049, #096, #097) to `[x] ($MERGE_SHA)` in
   `docs/deslop/ALL_FEATURES.md` (the same merge SHA for all).
4. Log the group completion in `docs/deslop/STATE.md`: move the rows from
   `In-flight migrations` to the `Completed migrations log` with date + SHA.
5. Delete all of the group's per-feature plan files (#008, #009, #010, #011,
   #012, #013, #044, #045, #046, #047, #049, #096). **`#097` has no `097-*.md`
   plan file** (its plan is the inline subsection above); it just gets flipped
   in `ALL_FEATURES.md` like the rest.
6. Delete this group plan file `docs/deslop/GROUP-2-data-explorer-querying.md`.
7. Delete the refactor branch `refactor-g2/data-explorer-querying` locally +
   remote, then commit + push the bookkeeping to `feat/ict4d-demo`.

### `#097` row plan note (created here)

`ALL_FEATURES.md` row `#97 data-explorer-auto-open-ai-panel` was added on
the 2026-06-25 update run with no plan file. Its authoritative plan is the
inline subsection `[13]` in this group doc (commit `6d3841b6`, PR #240).
Do not author a separate `097-*.md`; treat this group doc as its plan of
record until the group PR merges, at which point `#097` is flipped to `[x]`
along with every other row and this doc is deleted.
