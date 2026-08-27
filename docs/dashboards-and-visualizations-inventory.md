# Dashboards & Visualizations: Feature Inventory

A complete inventory of what the dashboards and visualizations product does
today, as of branch `feat/dash2` (AvaPage schema version 4).

This is a *descriptive* inventory of shipped behavior, not a roadmap. Every
entry below is backed by code in the repo; paths are repo-relative.

---

## 1. Product surfaces

| Surface | Route | Auth | Component |
| --- | --- | --- | --- |
| Dashboard list | `/$workspaceSlug/dashboards` | authenticated + `dashboards__can_view_dashboard` | `DashboardListView` |
| Dashboard editor | `/$workspaceSlug/dashboards/edit/$dashboardId` | authenticated | `DashboardEditorView` |
| Owner preview | `/$workspaceSlug/dashboards/preview/$dashboardId` | authenticated (bypasses `isPublic`) | `DashboardViewerView` (`mode="preview"`) |
| Public canonical viewer | `/public/dashboards/$workspaceSlug/$dashboardId` | anonymous; gated on `isPublic` | `DashboardViewerView` (`mode="public"`) |
| Public vanity viewer | `/d/$slug` | anonymous; gated on `isPublic` | `DashboardViewerView` (`mode="public"`) |
| Data Explorer (viz authoring) | `/$workspaceSlug/data-explorer` | authenticated | `DataExplorerApp` + `VisualizationContainer` + `VizSettingsForm` |
| Slug validation API | `POST dashboards/validate-slug` | edge function (admin client) | `supabase/functions/dashboards` |

Route guard: `src/routes/_auth/$workspaceSlug/dashboards/route.tsx` enforces
the `dashboards__can_view_dashboard` permission with a resource-share
fallback (`type: "dashboard"`, `minRole: "viewer"`), so a dashboard shared
directly with a user is reachable even without the app role.

---

## 2. Visualization types (9)

Registered in `shared/models/vizs/VizConfig/VizConfigs.ts`. Every type
implements `IVizConfigModule`: `displayName`, `descriptors`,
`makeEmptyConfig`, `hydrateFromQuery`, `hydrateFromQueryResult`,
`convertVizConfig`.

| Type | Config | Renderer | Library |
| --- | --- | --- | --- |
| `table` | `TableVizConfig` (no settings) | `DataGrid` | AG Grid (`themeMaterial`, Avandar-themed) |
| `bar` | `BarChartVizConfig` | `BarChart` | Mantine Charts `BarChart` |
| `line` | `LineChartVizConfig` | `LineChart` | Mantine Charts `LineChart` |
| `area` | `AreaChartVizConfig` | `AreaChart` | Recharts directly (documented Mantine wrapper bug) |
| `scatter` | `ScatterPlotVizConfig` | `ScatterChart` | Mantine Charts `ScatterChart` |
| `pie` | `PieChartVizConfig` | `PieChart` / `DonutChart` | Mantine Charts |
| `funnel` | `FunnelChartVizConfig` | `FunnelChart` | Mantine Charts |
| `radar` | `RadarChartVizConfig` | `RadarChart` | Mantine Charts |
| `bubble` | `BubbleChartVizConfig` | `BubbleChart` | Recharts directly (multi-series, Excel parity) |

### 2.1 Multi-series model

`shared/models/vizs/SeriesConfig.ts` defines five series shapes:

- **`BarSeries`** — `renderAs: "bar"`, `key`, `label?`, `color?`,
  `fillOpacity?`, `stackId?`
- **`LineSeries`** — `renderAs: "line"`, `key`, `label?`, `color?`,
  `curveType?`, `strokeWidth?`, `withDots?`
- **`AreaSeries`** — `renderAs: "area"`, `key`, `label?`, `color?`,
  `curveType?`, `strokeWidth?`, `fillOpacity?`, `withDots?`
- **`RadarSeries`** — `key`, `label?`, `color?`, `strokeWidth?`,
  `fillOpacity?` (no `renderAs`; radar does not compose)
- **`ScatterSeries`** — `key` (Y), `xKey`, `label?`, `color?`; **`BubbleSeries`**
  extends it with `sizeKey`

**Composable hosts.** `bar` / `line` / `area` are hosts that accept any
`XYSeries`. When any series' `renderAs` differs from the host `vizType`, the
wrapper falls back to `renderXYComposite` (Mantine `CompositeChart`), which
applies per-series `barProps` / `lineProps` / `areaProps`. A line series can
live inside a bar host and vice versa.

**Independent X per series.** `scatter` and `bubble` carry their own `xKey`
per series (and `sizeKey` for bubble), so unrelated metric pairs/triples
share one canvas.

**Series conversion.** `convertSeriesRenderAs` preserves `key`, `label`,
`color` across mark changes and reseeds mark-specific defaults (area gets
`fillOpacity: 0.6`).

### 2.2 Chart-level layout and style

- `BarChartVizConfig.layout`: `group` | `stack` | `percent`
- `AreaChartVizConfig.layout`: `default` (overlapping) | `stacked` |
  `percent` | `split` (+/-)
- `PieChartVizConfig`: `isDonut`, `withLabels`, `labelsType`
  (`value` | `percent`), `seriesColors` (per-slice override, keyed by slice
  name)
- `FunnelChartVizConfig`: `seriesColors` per step
- `withLegend` on bar / line / area / radar
- `ChartStyle` (`shared/models/vizs/ChartStyle.types.ts`), host-only and
  deliberately **not** composable:
  - `xAxis` / `yAxis`: `label`, `labelColor`, `tickColor`, `hide`, plus
    `min`, `max`, `tickInterval` on value axes and `tickAngle` on the X axis
  - `grid`: `color`, `horizontal` (default `true`), `vertical` (default
    `false`), fixed `strokeDasharray: "5 5"`
  - `legend.position`: `top` | `bottom` | `left` | `right`
- `applyChartStyle` (`src/lib/ui/viz/applyChartStyle/applyChartStyle.ts`)
  translates `ChartStyle` into Mantine/Recharts props, including a 64px
  default Y-axis width sized for compact ticks. The bar / line / area
  wrappers layer their own 30px X-axis end padding (`X_AXIS_PADDING`) in
  through `baseXAxisProps` so edge tick labels aren't clipped.
- Value-axis bounds and tick steps are resolved by pure modules under
  `src/lib/ui/viz/axis/`: `computeValueExtent` (stacking-aware data range),
  `resolveAxisScale` (bounds and interval to Recharts `domain` / `ticks`), and
  `resolveTickRotation` (angle to `tick`, `interval`, and axis `height`).
  Recharts has no tick-step prop and its nice-number generator would round a
  deliberate step, so exact intervals are expressed as explicit tick arrays.

### 2.3 Color system

`src/lib/ui/viz/ChartConstants.ts`:

- `CHART_COLORS` — 10-color Mantine cycle (`blue.6`, `teal.6`, `yellow.6`,
  `orange.6`, `red.6`, `grape.6`, `indigo.6`, `cyan.6`, `green.6`, `pink.6`)
  used for pie / donut / funnel / radar slices
- `CHART_COLOR_SWATCHES` — the same 10 as hex, used as `ColorInput` swatches
- `BUBBLE_SIZE_RANGE` — `[100, 3200]` px² for the Recharts `ZAxis`

### 2.4 Number and date formatting

`formatChartNumber` (`src/lib/ui/viz/formatChartNumber/`):

- `|x| < 1` → 3 significant figures
- `1 ≤ |x| < 1e6` → 2 decimals with grouping
- `|x| ≥ 1e6` → 0 decimals with grouping
- `compact: true` (axis ticks) → `1.5K` / `2.3M` / `1.5B` above 1000

Date handling: `getDateColumns` classifies columns as temporal via the
declared `AvaDataType` **or** by sniffing the first row for an ISO date
string / epoch-ms. Date columns get `formatDate` tick formatters and tooltip
label formatters on the X axis, and a `YYYY-MM-DD HH:mm:ss Z` value
formatter in the table.

### 2.5 Render row caps

`shared/config/GlobalVizConfig.ts` + `useVizDataLimit`. Data is truncated
client-side and a one-shot warning toast fires on the transition from
"within limit" to "over limit" (not on every re-render).

| Viz | Max rows | Noun |
| --- | --- | --- |
| table | *(uncapped)* | — |
| bar | 200 | bars |
| line | 500 | points |
| area | 500 | points |
| scatter | 1000 | points |
| bubble | 500 | bubbles |
| pie | 50 | slices |
| funnel | 50 | steps |
| radar | 50 | axes |

### 2.6 Render-time validation

`VisualizationContainer` validates each config with a per-type Zod schema
(rebuilt per render so messages follow the active Lingui locale) before
rendering. Failures render a user-facing error instead of a broken chart.
Bar charts use the richer `VisualizationRenderError` callout (flattened Zod
field errors as a list, plus a summary that special-cases missing axes /
series); the other types currently fall back to `DangerText` +
`prettifyError`.

Schemas: `XYSeriesConfigSchema` (bar/line/area: `xAxisKey` + ≥1 series),
`ScatterPlotConfigSchema`, `BubbleChartConfigSchema` (`key`/`xKey`(/`sizeKey`)
non-empty, ≥1 series), `PieChartConfigSchema` / `FunnelChartConfigSchema`
(`nameKey` + `valueKey`), `RadarChartConfigSchema` (`nameKey` + ≥1 series).

### 2.7 Table (DataGrid) features

AG Grid with: per-column filters enabled, pagination (50 rows/page,
toggleable), flex columns with 120px minimum, date/number value formatters,
and `onGridReady` / `onGridSizeChanged` / `onRowDataUpdated` hooks for
callers.

---

## 3. Viz settings form (descriptor-driven)

### 3.1 Setting vs. control

`shared/models/vizs/SettingDescriptor.ts` establishes the vocabulary used
across the code, tests, and docs:

- **Setting** — the persisted config field, addressed by a typed dotted path
  (`color`, `chartStyle.xAxis.labelColor`)
- **Control** — the Mantine widget that edits it

A `SettingDescriptor` binds one setting to one `ControlSpec` plus metadata
(`label`, `group`, and for series settings `composable` and `appliesTo`).

### 3.2 Control specs (7)

`color` (ColorInput + swatches), `switch`, `segmented` (≤4 options),
`select` (>4 options), `number` (`min`/`max`/`step`/`unit`), `text`
(`placeholder`), `columnPicker` (options derived from live query result
columns, filterable by `numeric` | `temporal` | `text` | `any`).

Rendered by `Control` (`src/components/VisualizationContainer/VizSettingsForm/Control/`).

### 3.3 Descriptor coverage

| Viz | Chart descriptors | Series descriptors |
| --- | --- | --- |
| bar | `layout`, `withLegend`, `chartStyle.legend.position`, 5× X axis, 7× Y axis, 3× grid (18) | `color`, `label`, `fillOpacity`, `stackId` |
| line | same minus `layout` (17) | `color`, `label`, `curveType`, `strokeWidth` (Line width), `withDots` |
| area | same as bar, `layout` = Area layout (18) | `color`, `label`, `curveType`, `strokeWidth`, `fillOpacity`, `withDots` |
| scatter | 8× X axis, 7× Y axis (15), rendered below the hand-coded series fieldset | — |
| bubble | 8× X axis, 7× Y axis (15), rendered below the hand-coded series fieldset | — |
| radar | `withLegend`, `chartStyle.legend.position` (2) | `color`, `label`, `strokeWidth`, `fillOpacity` |
| table, pie, funnel | `EMPTY_VIZ_SETTING_DESCRIPTORS`, hand-coded forms | — |

Axis descriptors are generated by `makeAxisDescriptors`
(`shared/models/vizs/makeAxisDescriptors/`) rather than repeated per module. A
`value` axis gets `min`, `max`, and `tickInterval`; a `category` axis does not.
Only the X axis offers `tickAngle`.

All series descriptors above are `composable: true`.

### 3.4 Form components

- **`VizSettingsForm`** — viz type `Select` (labels from
  `VizConfigs.getDisplayName`) + `VizSettingsFormBody`
- **`VizSettingsFormBody`** — dispatches per `vizType`; returns `null` for
  table
- **`SeriesAwareVizForm`** — the shared descriptor-driven form for bar /
  line / area / radar. Layout order: Series fieldset first (with an
  explanatory tooltip and an "Add series" button that auto-picks the next
  unused numeric column and disables once exhausted), then the axis fieldset
  (X axis, or "Category axis" for radar; descriptors whose `group` matches
  the axis legend merge into it), then `ChartSettingsFieldsets` for every
  remaining group
- **`ChartSettingsFieldsets`** — renders one Mantine `<Fieldset>` per
  chart-level descriptor group ("Y axis", "Legend", "Grid", "Layout"), in
  registry order, with one `Control` per descriptor. Ungrouped descriptors
  collect into a trailing "Chart settings" fieldset, and `excludeGroup` lets a
  caller lay one group out itself. Shared by `SeriesAwareVizForm`,
  `ScatterChartForm`, and `BubbleChartForm`
- **`SeriesCard`** — per-series card with numeric `columnPicker`, a
  "Render as" `SegmentedControl` (bar / line / area; hidden for radar),
  grouped descriptor controls, and a remove action. When a series is
  embedded in a foreign host, only `composable` descriptors are shown
- **`PieChartForm`** / **`FunnelChartForm`** — name + value column pickers,
  chart toggles (pie only: donut, labels, label type), and a per-slice
  `ColorInput` list derived from the distinct values in the name column
- **`ScatterChartForm`** → **`PairSeriesFieldset`** — per-series X / Y
  numeric pickers, label, color, add / remove, followed by
  `ChartSettingsFieldsets` for the scatter axis descriptors
- **`BubbleChartForm`** → **`BubbleSeriesFieldset`** — same plus a Size
  column picker, likewise followed by the bubble axis fieldsets

`readSetting` (dotted-path getter) and `useUpdateSettingPath` (dotted-path
immutable setter) sit flat under `VizSettingsForm/` and back every
descriptor-driven control.

The whole form layer is pure and prop-driven, so it is reused verbatim in
the Data Explorer sidebar and in the dashboard editor's Puck side panel.

### 3.5 Config hydration and type conversion

- **`VizConfigs.convertVizConfig`** — every type converts to every other
  type, preserving as much as possible (e.g. bubble → scatter drops
  `sizeKey`; funnel → area carries the value column and its slice color into
  a single area series).
- **`hydrateFromQuery`** — seeds empty configs from a `PartialStructuredQuery`
  (per-type helpers: `hydrateXYFromQuery`, `hydrateXYSeriesFromQuery`,
  `hydratePieFromQuery`, `hydrateRadarSeriesFromQuery`,
  `hydrateScatterSeriesFromQuery`, `hydrateBubbleSeriesFromQuery`).
- **`hydrateFromQueryResult`** — seeds from executed-result column metadata;
  prunes series referencing missing columns and seeds from the first N
  numeric columns when empty.
- **`applyVizConfigFromQueryResult`** — reconciles a persisted config against
  the latest result columns. Keys pass through `resolveColumnKey` (exact
  match wins, case-insensitive match falls back to the canonical name,
  unresolved keys are dropped), then result hydration runs only when
  `shouldHydrateVizFromQueryResult` says so.
- **`shouldHydrateVizFromQueryResult`** — the gate that preserves manual axis
  choices across refetches. Returns `false` when the config has all
  minimum-required keys *and* every key resolves in the result; returns
  `true` for raw-SQL paths, empty structured queries, missing keys, or when
  no structured derived column name appears in the result.
- **`isVizConfigEqualForQueryResultSync`** — per-type structural comparison
  used by the Data Explorer to decide whether a sync is needed.

---

## 4. Dashboard page model (AvaPage)

Dashboards are Puck (`@puckeditor/core`) pages. The Avandar-specific layer is
called **AvaPage**; draggable components are called **P-blocks** (pblocks)
and side-panel custom fields **P-fields** (pfields).

### 4.1 Root props

`AvaPageRootProps` (`src/views/DashboardApp/AvaPage/AvaPage.types.ts`) and
its Puck field config:

| Prop | Control | Values |
| --- | --- | --- |
| `title` | text | — |
| `subtitle` | text | — |
| `author` | text | — |
| `publishedAt` | text | — |
| `isTitleHidden` / `isSubtitleHidden` / `isAuthorHidden` / `isPublishedAtHidden` | radio (No/Yes) | — |
| `theme` | select | `default`, `ocean`, `forest`, `rose`, `amber`, `graphite` |
| `typography` | select | `system`, `serif`, `mono` |
| `containerMaxWidth` | custom (`ContainerMaxWidthPField`) | `%` (clamped 20–100) or `px` (non-negative int; default 860) |
| `horizontalPadding` / `verticalPadding` | select | `none`, `xs`, `sm`, `md`, `lg`, `xl` |
| `schemaVersion` | custom, `visible: false` | debug-only readout |

### 4.2 Design tokens

`DashboardDesignTokens` maps `theme` → `pageBackground`, `accentColor`,
`titleColor`, `subtitleColor`, `bylineColor`, and `typography` → body /
heading font families (system stack, Source Serif Pro stack, IBM Plex Mono
stack). Tokens drive the page background, the title color, and the section
accent bar. Theme and typography option labels are localized hooks
(`useThemeOptions`, `useTypographyOptions`).

### 4.3 P-blocks (17)

Grouped into three editor categories.

**Layout** (`layout`, default-expanded)

| Block | Fields |
| --- | --- |
| `Section` | `maxWidth` (narrow/normal/wide/full), `padding` (sm/md/lg), `background` (none/subtle), `content` slot |
| `Columns` | `numColumns` (up to 12 slots `col1`…`col12`), `leftSpan`, `rightSpan`, `gap` (xs–lg), `collapseAt` (sm/md/lg) |
| `Grid` | `numColumns`, `numRows`, `gap`; generates `r{row}c{col}` slots dynamically |
| `SidebarLayout` | `sidebarPosition` (left/right radio), `sidebarSpan`, `gap`, `collapseAt`, `sidebar` slot, `main` slot |

**Content** (`content`, default-expanded)

| Block | Fields |
| --- | --- |
| `DataViz` | `nlQuery` (custom), `vizType` (select, all 9), `vizConfig` (custom), `globalFilterSubscription` (custom), `localFilters` (custom) |
| `Filter` | `filterId`, `label`, `columnName`, `mode` (single/multi/contains), `optionsRaw`, `defaultValue` |
| `Card` | `title`, `content` slot |
| `CalloutBlock` | `tone` (info/warning/neutral), `title`, `body` |
| `CodeBlock` | `language`, `code` |
| `HeadingBlock` | `text`, `level` (1–4), `align` (left/center/right) |
| `ParagraphBlock` | `text` (textarea), `align` |
| `ListBlock` | `type` (ordered/unordered), `items` (Puck array field) |
| `QuoteBlock` | `quote`, `cite` |
| `TableBlock` | `delimiter` (comma/tab/pipe), `hasHeader`, `data` (textarea, parsed client-side) |
| `DividerBlock` | *(none)* |

**Media** (`media`)

| Block | Fields |
| --- | --- |
| `FigureBlock` | `src`, `alt`, `caption` |
| `EmbedBlock` | `title`, `url`, `height` (clamped 200–1200, default 420) |

### 4.4 P-fields (5 custom Puck fields)

- **`NLQueryPField`** — a three-tab query editor for a `DataViz` block:
  - **Prompt** — natural-language prompt, submitted through `useNLPQuery`
    (workspace-scoped LLM SQL generation); each success appends to a
    `generations[]` history (`{prompt, rawSql}` or `{prompt, error}`)
  - **Manual** — the Data Explorer's structured `ManualQueryForm`, wired via
    `useDashboardManualQueryState` (waits for the dataset parser to be ready)
  - **SQL** — raw SQL editing plus `isStructuredQueryInSync` /
    `sqlSyncWarnings` feedback
- **`VizConfigPField`** — reads the selected block's `nlQuery.rawSql` from
  the Puck store, runs it through `useDataQuery` to discover columns, and
  renders the shared `VizSettingsFormBody`. Shows "no extra settings" for
  table and "generate a query first" when SQL is empty. Auth switches on the
  page metadata (workspace vs. public).
- **`GlobalFilterSubscriptionPField`** — segmented `all` / `selected` /
  `none` with localized descriptions; in `selected` mode it renders a live
  checkbox list of registered `Filter` blocks (read from the filter state
  manager) rather than asking the editor to type filter ids.
- **`LocalFiltersPField`** — add / edit / remove per-viz filters
  (`label`, `columnName`, `mode`, comma-separated options, default value)
  via `LocalFilterEditor`.
- **`ContainerMaxWidthPField`** — `NumberInput` + `%`/`px` segmented toggle
  with normalization and clamping.

### 4.5 DataViz block runtime

`DataVizPBlock` is the adapter from persisted props to a rendered chart:

1. Reads page metadata (`useAvaPageMetadata`, Zod-validated: `dashboardId` +
   `auth: "workspace" | "public"`).
2. Builds local-filter state (`useLocalFilterState`, with defaults parsed
   from each filter's `defaultValue` and stale overrides dropped).
3. Composes SQL through `useApplyDashboardFiltersToSql`.
4. Executes via `useDataQuery` (workspace-authed or public-authed).
5. Derives date columns, runs `applyVizConfigFromQueryResult`, and renders
   `VisualizationContainer` in a fixed 420px-high box with a
   `LoadingOverlay`.
6. Empty states: "Add a prompt and generate SQL…" when the prompt is empty;
   "Run a query to see results." when the SQL is empty.

`resolveDataVizPBlockProps` (the Puck `resolveData` hook) keeps `vizType` and
`vizConfig.vizType` in sync in both directions (type picker change →
`convertVizConfig`; config change → adopt its type) and backfills defaults
for older saved blocks.

---

## 5. Filtering

Two independent filter layers, both compiled into SQL.

### 5.1 Global (dashboard-wide) filters

- `Filter` P-blocks register themselves with `DashboardFilterStateManager` on
  mount (`registerFilter`) and unregister on unmount. Viewer-selected values
  survive Puck re-mounts because `registerFilter` merges over an existing
  value.
- Record shape: `filterId`, `columnName`, `label`, `operator`
  (`equals` | `in` | `contains`), `value`.
- Widgets: `MultiSelect` (clearable + searchable) for multi, `TextInput` for
  contains, `Select` (clearable + searchable) for single.
- `filterId` is auto-assigned in `resolveData` when missing, so a
  freshly-dropped filter works immediately.
- Unconfigured filters (missing id / label / column) render a configuration
  hint instead of an input.
- The state manager is mounted by both `DashboardEditorView` and
  `DashboardViewerView`, so the editor preview and the public viewer share
  identical filter semantics.
- Selection changes emit the `dashboard.filter_changed` analytics event
  (single + multi modes).

### 5.2 Per-visualization subscription

Each `DataViz` block carries `globalFilterSubscription`:

- `all` — apply every dashboard filter (default)
- `selected` — apply only `subscribedFilterIds`, intersected with the
  currently-registered filters so stale ids are ignored
- `none` — ignore all global filters

### 5.3 Local (per-visualization) filters

`localFilters` render above the chart (`DataVizLocalFilters` /
`DataVizLocalFilterInput`) and never enter the global filter manager. Modes
map to operators: `select_multi` → `in`, `contains` → `contains`,
`select_single` → `equals`. Multi-select defaults accept either a JSON array
or a comma-separated string.

### 5.4 SQL composition

`applyDashboardFiltersToSql` wraps the query in a subselect rather than
editing it:

```sql
SELECT * FROM (<original sql>) AS _ava_filtered WHERE <clauses AND …>
```

- Identifiers go through `quoteSqlIdentifier`; string literals escape `'`
  by doubling.
- `in` → `col IN (…)`, `contains` → `col ILIKE '%…%'`, `equals` → `col = …`.
- Inactive filters (undefined, empty string, empty array) are skipped; with
  no active filters the SQL is returned untouched.
- `useApplyDashboardFiltersToSql` applies global filters first, then wraps a
  second time for local filters, so both compose with any WHERE / GROUP BY
  the inner query already has.

---

## 6. Editor experience

- **Puck editor** mounted full-height, keyed on `editorRevision` so
  programmatic content changes force a clean remount.
- **Toolbar** (`headerActions` override): Save, Share (RBAC resource share),
  View (preview), Publish, Export PDF, Delete.
- **Save** — `SaveDashboardButton` reads Puck's live store, persists
  `{name, config}` via `DashboardClient.useUpdate`, invalidates the list and
  by-id queries, and shows a success toast. Bound to `⌘S` / `Ctrl+S` with a
  visible `Kbd` hint. The dashboard name is derived from the Puck root
  `title`.
- **Unsaved-change tracking** — `DashboardEditorStateManager.hasUnsavedChanges`
  gates Publish (with an explanatory tooltip) and warns on View, since both
  read the persisted config rather than the in-memory edits.
- **Share-only access banner** — users with no `dashboards` app role see an
  informational "Shared with you" alert; it never blocks rendering.
- **Delete** — confirm modal ("This cannot be undone."), then navigate back
  to the list.
- **Schema migration on load** — `upgradeAvaPageData` runs on every editor,
  viewer, and PDF-capture mount.

### 6.1 Editor state manager

`DashboardEditorStateManager` holds `activeDashboardId`, `editorData`,
`hasUnsavedChanges`, `editorRevision`, `appendedBlockIds`, and
`pendingBlocks`. Notable behaviors:

- Registers/unregisters the active dashboard so the chat panel knows whether
  to offer the `addDashboardBlock` tool.
- **Pending-block buffering**: chat-generated blocks that arrive before the
  editor mounts are buffered instead of dropped, then flushed onto the
  content when the matching dashboard registers. Buffered blocks survive
  React StrictMode's mount → unmount → mount cycle; blocks for a different
  dashboard are discarded on switch.
- **De-duplication** on both the stable Puck content-item id and the LLM's
  `pendingId`, so a block can't be appended twice.
- **Absorption**: once a buffered block appears in Puck's own data it is
  dropped from the buffer, so deleting it doesn't resurrect it on remount.

---

## 7. AI / chat integration

- The chat panel offers an `addDashboardBlock` tool only when a dashboard
  editor is active (`supabase/functions/chat/PostChatMessages/prompt/buildChatToolConfig.ts`).
- Supported `kind` values: `DataViz`, `HeadingBlock`, `ParagraphBlock`,
  `QuoteBlock`, `DividerBlock`, `CalloutBlock`, `ListBlock`, `CodeBlock`,
  `TableBlock`, `Card` (10 of the 17 P-blocks; layout blocks are not
  LLM-creatable).
- `DataViz` tool calls accept `prompt`, `sql` (DuckDB SELECT), and `vizType`
  restricted to `table` | `bar` | `line` | `area` | `scatter` | `pie` — a
  narrower set than the 9 the product supports.
- `buildPendingDashboardBlock` converts a `ChatGeneratedDashboardBlock` into
  a Puck content item, minting a `{type}-{uuid}` id, seeding a `generations`
  history entry for DataViz, and defaulting the viz config via
  `VizConfigs.makeEmptyConfig`.
- Appended blocks emit `dashboard.block_added_via_chat`.
- `buildPendingDataVizBlock` remains as a deprecated shim over
  `buildPendingDashboardBlock`.

---

## 8. Publishing and sharing

### 8.1 Share modal (publishing lives inside it)

`PublishDashboardModal` and `PublishDashboardButton` no longer exist. P3 merged
publishing into the Drive-style share surface: `DashboardShareButton` opens
`DashboardShareModal`, which owns publishing state
(`useDashboardPublishingControl`) and renders the resource-generic
`ShareResourceModal` with an optional `publishing` prop. The publish target is
picked in the modal's General access dropdown ("Only me", "Restricted",
"Anyone in `<workspace>`", "Anyone with the link"), which maps to
`dashboards.visibility` (`draft` | `workspace` | `public`). See
`docs/superpowers/specs/2026-08-15-private-dashboards-merged-share-surface-design.md`.

The publishing section still carries what the old modal carried (opened only
when there are no unsaved changes, and offline-gated via `OfflineGated` /
`useOfflineGate`):

- **Status** — what is published today, which URL is canonical, and a warning
  when the selected target has not been applied yet (red, naming the live
  exposure, when the dashboard is still public on the web).
- **Vanity slug** — `VanitySlugField` + `toVanitySlug` normalization, with
  live availability checking against the `dashboards/validate-slug` edge
  function. States: pending, accepted, rejected; the submit button is
  disabled while pending or rejected. Slug rules (server-side):
  non-empty, no spaces, `^[a-z0-9-]+$`, 3–64 characters, and unique **within
  the target's namespace** (globally for `public`, per workspace for
  `workspace`), with the dashboard being edited excluded from the collision
  check so re-publishing with its own slug passes. Changing the target
  re-validates, because a slug free in one namespace can be taken in the
  other.
- **Per-dataset publish slices** — see below.
- **Share links** (once published) — `PublishedShareLinks` / `ShareUrlRow`
  with one-click copy and a "Show QR code" modal (generated client-side with
  `qrcode`, no network call, downloadable as an image). `buildShareUrls`
  returns both URLs for the current target: `canonical`
  (`/d/<dashboardId>` for `public`, `/<workspaceSlug>/d/<dashboardId>` for
  `workspace`) and, when a slug is set, `vanity` (the same prefix with the
  slug). The QR affordance encodes `canonical` and is hidden on the vanity
  row, so a printed QR follows the id rather than a renameable slug. It is
  **not** audience-stable: the canonical URL differs between the two
  namespaces, so republishing to a different audience yields a different
  canonical URL. The legacy
  `/public/dashboards/<workspaceSlug>/<dashboardId>` path survives only as a
  redirect for QR codes already in circulation.
- Submit button reads "Publish" or "Update & republish"; an Unpublish action
  sits alongside it once something is published.
- Publishing emits `dashboard.published` (payload carries `visibility`);
  unpublishing emits `dashboard.unpublished`.

### 8.2 Publish slice configuration (data minimization)

`PublishSliceConfig` + `DashboardSliceBuilder` decide exactly what data
leaves the workspace for each dataset a dashboard references.

Three modes per dataset:

- **`queried`** (default, recommended) — publish only the columns the
  dashboard actually reads.
- **`all_columns`** — publish every column and row.
- **`custom`** — an explicit column allow-list plus row filters.

Row filter kinds: `enum` (value list), `range_number` (`min`/`max`),
`range_date` (`start`/`end`). The UI (`SliceModeEditor`,
`CustomSliceEditor`, `PublishSliceRowFilter`, `AddRowFilterMenu`,
`QueriedSlicePreview`) offers per-column checkboxes with "Select all" /
"Just what's queried" shortcuts, badges marking which columns are queried,
and filter kinds restricted by column type.

Column discovery: `extractReferencedColumns` collects SQL from every
`DataViz` block plus `columnName` from every `Filter` block, parses column
references with `node-sql-parser` (PostgreSQL dialect), and marks a dataset
`unparseable` when the SQL uses `*` or fails to parse — in which case it is
treated as `all_columns` rather than silently under-publishing.

Dataset ids are recovered from SQL by UUID regex
(`extractDatasetIdsFromSql`); `collectDatasetIds` additionally scopes them to
ids known to belong to the workspace.

### 8.3 Publish execution

`DashboardClient.publishDashboard`:

1. Loads the dashboard and resolves the effective publish config (incoming,
   else previously persisted, else narrowest default).
2. Finds dependent datasets in the workspace.
3. Per dataset, materializes the slice and uploads to the public bucket via
   `PublicDatasetParquetStorageClient`:
   - **virtual** datasets → build slice SQL over `rawSql`, run through
     `WorkspaceQETLClient`, upload the resulting parquet
   - **open_data** / workspace datasets → materialize via SQL when the mode
     is `queried`/`custom` or any row filters exist
   - **`all_columns` + no row filters** → fast path, direct parquet copy
     (open_data prefers the locally-cached parquet, falling back to the
     open-dataset bucket)
   - Failures surface a "Some datasets are not synced online yet or failed to
     publish" error toast and abort
4. Persists the slice config back into the dashboard `config` JSON so
   re-publishes default to the same selection.
5. Sets `visibility` to the publish target (`workspace` or `public`) and
   writes / clears the slug. `is_public` is a generated column derived from
   `visibility = 'public'`, so it is never written directly. Snapshots route
   to the `published` bucket for `public` and `published-private` for
   `workspace`.

`validateDashboardSlug` is a separate mutation backed by the edge function so
the uniqueness lookup runs with admin privileges, unblocked by RLS.

### 8.4 Public viewing

`DashboardViewerView` renders with `<PuckPageRender>` (no editor chrome):

- `mode="published"` denies a `draft` dashboard and shows
  `DashboardAccessDeniedView` otherwise; who may read a non-draft snapshot is
  enforced by RLS and the bucket policies, not by a client flag.
- `mode="preview"` is auth-gated by the route, and additionally denies a
  `draft` dashboard to anyone whose effective role is below `editor` (P3). It
  shows a banner stating whether the dashboard is published, plus a "Back to
  editor" button.
- `useEnsurePublishedDashboardDatasets` loads all published parquet
  dependencies into DuckDB before rendering, with dedicated loading and
  error states plus an error toast.
- The public vanity route (`/d/<slugOrId>`) resolves `slug` + `is_public`
  directly with no workspace lookup, relying on the anon SELECT policy. The
  workspace route (`/<workspaceSlug>/d/<slugOrId>`) resolves inside the
  workspace's slug namespace and is gated by authenticated RLS instead.

---

## 9. PDF export

`ExportPdfModal` — a two-step flow (`dashboard.pdf_export_opened` fires on
open):

1. **Choose** — export immediately, or annotate first.
2. **Snapshot** — the dashboard is rendered off-screen with
   `<PuckPageRender>` at a fixed PDF-page width (so no editor chrome
   appears), captured with `html-to-image` `toCanvas` at `pixelRatio: 2`
   with `skipFonts` (cross-origin font stylesheets can reject `cssRules`
   access) and a white background.
3. **Annotate** (optional) — `PdfAnnotator` + `PdfAnnotationCanvas` +
   `PdfAnnotationToolbar`:
   - Tools: `freehand`, `arrow`, `text`
   - Controls: color picker, roughness slider (hand-drawn look, seeded per
     stroke), stroke width, undo, clear-all
   - Strokes are persisted as a typed `PdfAnnotationStroke[]` and drawn via
     `drawPdfAnnotationStroke`
4. **Export** — `PdfExport.captureAndDownloadPdf` composites the annotation
   canvas over the base canvas, then paginates onto letter-size portrait
   pages (612×792pt, 28pt margins) with `jsPDF`, sets the document title, and
   downloads as `<slugified-dashboard-name>.pdf`.

---

## 10. Dashboard list

- Card grid (`DashboardCard`) with name, description (with an
  "No description has been added yet." fallback), and dates
  (`formatDashboardDate`).
- **Offline-readiness badges** — per dashboard, referenced dataset ids are
  compared against the user's locally-cached datasets to compute
  `full` | `partial` | `none`; "Offline ready" is badged for `full`.
- Empty state with an illustrated call to action.
- **Create** — inserts a `Dashboard` with `DashboardConfigs.makeEmpty()`
  (v4 root props, empty content, "Untitled dashboard"), then navigates
  straight into the editor.
- Responsive sizing via `useIsTabletSize`.
- Scoped to the current workspace only. P3 removed the `owner_id` filter, so
  the index now shows every dashboard RLS returns, including ones shared with
  the viewer. `sortDashboardsForList` orders the current user's own dashboards
  first, and cards carry ownership and visibility badges. There is
  deliberately no filter control (P3 §6.3).

---

## 11. Data model, persistence, and versioning

### 11.1 Database

`public.dashboards` (`supabase/schemas/10.dashboards.sql`):

`id`, `workspace_id` (FK, cascade), `owner_id` (FK `auth.users`, no-action
delete), `owner_profile_id` (FK `user_profiles`, no-action delete),
`created_at`, `updated_at` (trigger-maintained), `name`, `description`,
`visibility` (`dashboard_visibility`, default `draft`), `is_public` (stored
generated column, `visibility = 'public'`), `slug`, `config` (jsonb, not
null), `is_restricted`, `snapshot_revision`, and the
`snapshot_transition_*` claim columns.

Indexes: `idx_dashboards__slug`, `idx_dashboards__workspace_owner`; two
partial unique indexes, one per slug namespace, so a collision fails at the DB
level even if the frontend check is bypassed:
`dashboards__slug_unique_when_public` on `(slug)` where `visibility =
'public'`, and `dashboards__slug_unique_per_workspace_when_internal` on
`(workspace_id, slug)` where `visibility = 'workspace'`.

### 11.2 RLS (`supabase/schemas/17.rls.dashboards.sql`)

- anon SELECT limited to `is_public = true`
- authenticated SELECT via owner short-circuit or
  `util__auth_user_may_select_dashboard` (so workspace editors can't read
  other members' unrestricted rows without an explicit share)
- INSERT requires editor app role in the workspace
- UPDATE requires editor access and the owner must remain a workspace member
- DELETE requires admin access

Effective resource-role matrix: viewer = SELECT; editor = SELECT / INSERT /
UPDATE; admin = + DELETE. `is_restricted` disables tag-based app roles while
leaving explicit shares functional.

### 11.3 AvaPage schema versioning

`CURRENT_SCHEMA_VERSION = 4`. `AvaPageDataMigrator` holds a bidirectional
registry keyed by version, upgrading in a loop until current and supporting
single-step downgrades.

| Migration | Change |
| --- | --- |
| V0 → V1 | `DataViz` gains an `nlQuery` object (`prompt`, `rawSql`, `generations`), replacing loose `prompt` / `sql` / `sqlError` / `generateSqlRequestId` props |
| V1 → V2 | `DataViz` gains `vizType` + `vizConfig`, both defaulting to `table` |
| V2 → V3 | Single-key viz configs (`yAxisKey`, `color`) become series arrays; radar gains `series`; pie / funnel / scatter / bubble unchanged |
| V3 → V4 | `DataViz` gains `globalFilterSubscription` (default `all`) and `localFilters` (default `[]`) |

Each migration lives in its own module with **frozen** type snapshots and an
explicit rule against importing live app types (only the newest migration may
import `AvaPageTypes`), so version history stays statically readable and old
migrations don't break when current types change. Every migration has tests
covering upgrade and downgrade.

`DashboardConfig` (`shared/models/Dashboard/DashboardConfig/`) still exists
with a legacy `queries` / `widgets` shape but is unused for storage — Puck
data is stored directly, and the type is flagged for removal.

---

## 12. Cross-cutting concerns

- **Internationalization** — every user-facing string in the dashboards and
  viz layers uses Lingui (`Trans` / `useLingui().t` / `msg` for the Puck
  config). Zod error messages and viz-type labels are rebuilt per locale so
  they follow the active language. A `zh-Hans` catalog exists.
- **Offline** — `OfflineGated` / `useOfflineGate` disable Publish while
  offline; the list computes per-dashboard offline readiness from cached
  datasets; the Data Explorer has an offline chat pipeline that also
  references `addDashboardBlock`.
- **Analytics** — `dashboard.published`, `dashboard.block_added_via_chat`,
  `dashboard.filter_changed`, `dashboard.pdf_export_opened` are emitted.
  `dashboard.unpublished` is declared in `analyticsEventTypes.ts` but never
  emitted — there is no unpublish flow in the product today.
- **Permissions / sharing** — `ShareResourceButton` in the editor toolbar
  grants per-resource viewer / editor / admin roles; the dashboards route
  falls back to resource shares when the app role is absent.
- **Reuse boundary** — `VisualizationContainer`, `VizSettingsForm`,
  `VizSettingsFormBody`, and `getDateColumns` are pure and app-agnostic;
  they are consumed by both `DataExplorerApp` and the dashboard editor
  (through `VizConfigPField` and `DataVizPBlock`).
- **Data Explorer → dashboard** — `SaveToDashboardModal` saves the
  explorer's current SQL + prompt + viz config as a new `DataViz` block. It
  opens in `list` mode when the user has dashboards (with auto-switch once
  the query resolves) and `create` mode otherwise, supports creating a
  dashboard inline, and shows a success toast linking straight into the
  editor.

---

## 13. Test coverage

**Unit / component (vitest)** — `VisualizationContainer`, `useVizDataLimit`,
`VizSettingsForm`, `SeriesAwareVizForm` (+ descriptor tests),
`PieFunnelChartForm`, `PairChartForms` (scatter + bubble),
`SeriesRenderer.props`, `formatChartNumber`, `applyChartStyle`, the axis
modules (`computeValueExtent`, `needsValueExtent`, `toExtentSeries`,
`getAreaStacking`, `resolveAxisScale`, `resolveTickRotation`),
`getAxisRoles`, `makeAxisDescriptors`,
`applyVizConfigFromQueryResult`, `shouldHydrateVizFromQueryResult`,
`resolveColumnKey`, all `hydrate*FromQuery*` helpers,
`DashboardEditorView`, `DashboardEditorStateManager`, `DataVizPBlock`,
`DataVizFilters`, `resolveDataVizPBlockProps`, `buildPendingDashboardBlock`,
`buildPendingDataVizBlock`, `applyDashboardFiltersToSql`,
`DashboardSliceBuilder`, `collectDatasetIds`, `VizConfigPField`,
`DashboardDesignTokens`, `toVanitySlug`, `validateDashboardSlug`, and all
four AvaPage migrations.

**End-to-end (Playwright)** — `dashboard-create.spec.ts`,
`dashboard-chat-block.spec.ts`, `dataviz-pblock-visualizations.spec.ts`,
`save-to-dashboard.spec.ts`,
`save-to-dashboard-renders-in-editor.spec.ts`, with helpers
`createDashboardWithDataVizBlock.ts` and `seedDashboard.ts`.

---

## 14. Known gaps visible in the code

Recorded because they bound what exists today, not as a work plan.

- **No unpublish** — the `dashboard.unpublished` analytics name exists but
  nothing sets `isPublic` back to `false`.
- **Descriptor migration incomplete** — pie, funnel, and table still use
  hand-coded forms (`EMPTY_VIZ_SETTING_DESCRIPTORS`), so they miss the
  grouped-fieldset treatment and the shared control layer. Scatter and bubble
  are half-migrated: their chart-level axis settings are descriptor-driven,
  but their series editors are still hand-coded fieldsets.
- **Error UI inconsistency** — only bar charts get the
  `VisualizationRenderError` callout; the other seven chart types fall back
  to raw `prettifyError` text.
- **Chart-level `ChartStyle` coverage is uneven** — pie and funnel expose no
  `ChartStyle` settings at all. Scatter and bubble expose axis settings only:
  they have no grid or legend styling settings and no `withLegend` (scatter
  always shows a legend, bubble shows one whenever there is more than one
  series). Radar exposes only legend settings.
- **LLM viz-type subset** — the chat tool exposes 6 of the 9 viz types
  (no funnel, radar, bubble).
- **Date-column detection is heuristic** — flagged in-code as "not a great
  way to handle date columns".
- **`DataViz` block height is fixed** at 420px, with no per-block sizing
  control.
- **Dataset id extraction is regex-based** — any UUID in the SQL text is
  treated as a candidate dataset id.
- **Legacy `DashboardConfig` model** remains in `shared/models/` with a
  `TODO` to delete it.
