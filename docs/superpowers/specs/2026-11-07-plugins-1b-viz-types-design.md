# Plugins Slice 1b: Viz Types and Derived Columns

**Author:** Juan Pablo Sarmiento (pablo@avandarlabs.com)
**Date:** 2026-11-07
**Status:** Design approved
**Parent:** `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`
(Milestone 1, slice 1b)
**Builds on:** `docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`

## Context

Slice 1a built the plugin core: manifests, build-time bundling, per-workspace
installs, lazy loading, and toolbar commands in the Data Explorer. Slice 1b
lets a plugin add chart types, and lets a command add computed columns to the
Data Explorer's query.

The work is driven by the measles demo
(`docs/measles-demo/measles-outbreak-response.md`). Its Workflow D
(epidemiological analysis) has no existing support. Section 7.5 of that plan
asks for an epi-curve chart, rates per 100,000, and rolling averages as
selectable operations rather than hand-written SQL. This slice delivers all
three through the epidemiology plugin.

Plugins in Milestone 1 are trusted and run in-process. Every API in this slice
passes serializable data, except chart components, which are React components
like 1a's modal content. Milestone 2 moves both behind the sandbox.

## Goals

- A plugin declares chart types in `ava.yaml`. Avandar draws their settings
  forms from the manifest, without loading plugin code.
- A plugin chart type draws itself in one of two ways:
  - **Transform:** a pure function turns the query rows and settings into new
    rows plus a built-in chart spec, and Avandar's own renderer draws it.
  - **Component:** a React component draws the chart with chart building
    blocks from `@avandar/plugin-ui/charts`.
- Plugin charts work wherever built-in charts work today: the Data Explorer,
  the dashboard editor, the workspace dashboard view, and public dashboard
  links.
- A toolbar command can add computed columns to the Data Explorer's current
  query.
- The epidemiology plugin ships an epicurve (transform), a rate plot with
  confidence intervals (component), and two commands: Incidence per 100k and
  Rolling average.
- **No load-time cost for plugins that are not used.** Plugin manifests, code,
  and strings stay in their own chunks, and CI keeps enforcing it.

## Non-goals

- Chat choosing or configuring plugin charts. That belongs to slice 1c (AI
  tools). Chat's fixed list of six chart types is unchanged.
- Live chart bodies inside rich-text gadgets. Gadget cards show the plugin
  chart's title, as they show built-in chart labels today.
- Plugin charts in `apps/ava-video-producer`. Its chart shim renders the
  missing-plugin placeholder for plugin configs.
- Sandboxed rendering, Remote DOM, and `<CustomFrame>` (Milestone 2).
- Enforcing permissions. As in 1a, permissions are declared and approved but
  not enforced until the Milestone 2 broker.
- Built-in chart types other than bar, line, and area as transform output.

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Public dashboards | A stored plugin chart renders from bundled code everywhere, including public links, without an install check. Installs control only whether a plugin's chart types appear in the picker and whether its commands appear |
| 2 | Render paths | Both transform and component are supported. The manifest picks one per chart type |
| 3 | Component consumer | The epidemiology rate plot exercises the component path. Built-in charts cannot draw error bars |
| 4 | Epi extras | Incidence per 100k and Rolling average are commands that add columns to the query, so their results can be charted like any other column |
| 5 | Config shape | One open `plugin` member in `AvaVizConfig` and `UiVizConfig`, as the parent design specifies. Column settings are stored apart from other settings |
| 6 | Settings | Declared in the manifest with the seven control kinds built-in charts already use, and drawn by Avandar's existing descriptor form |
| 7 | Transform output | A `PluginChartSpec` owned by the SDK, converted by the host to a built-in config. Packages cannot import app models, and a small spec keeps the plugin contract stable |
| 8 | Adding columns | The host wraps the current SQL and puts the result in the SQL editor. Nothing new is persisted, so saving to a dashboard works unchanged |
| 9 | Delivery | One spec and two implementation plans on one branch (`feat/plugins-viz`): Part A (viz types) first, then Part B (derived columns) |

## Part A: plugin chart types

### Manifest: `contributes.vizTypes`

```yaml
contributes:
  vizTypes:
    - id: epicurve
      title: "%viz.epicurve.title%"
      icon: chart-histogram
      render: transform
      settings:
        - key: dateColumn
          label: "%viz.epicurve.dateColumn%"
          control: { kind: columnPicker, dataType: temporal }
          required: true
        - key: countColumn
          label: "%viz.epicurve.countColumn%"
          control: { kind: columnPicker, dataType: numeric }
        - key: interval
          label: "%viz.epicurve.interval%"
          control:
            kind: segmented
            options:
              - { value: day, label: "%viz.epicurve.interval.day%" }
              - { value: epiWeek, label: "%viz.epicurve.interval.epiWeek%" }
              - { value: month, label: "%viz.epicurve.interval.month%" }
          default: epiWeek
        - key: stackByColumn
          label: "%viz.epicurve.stackByColumn%"
          control: { kind: columnPicker, dataType: text }
```

| Field | Rule |
| --- | --- |
| `id` | Same pattern as command IDs (`^[a-z0-9-]+(?:\.[a-z0-9-]+)*$`). Unique within the plugin |
| `title` | A `%key%` reference |
| `icon` | A Tabler icon name, checked like command icons |
| `render` | `transform` or `component` |
| `settings[].key` | `^[a-zA-Z][a-zA-Z0-9]*$`. Unique within the chart type |
| `settings[].label` | A `%key%` reference |
| `settings[].control` | One of the existing `ControlSpec` kinds: `columnPicker`, `select`, `segmented`, `switch`, `number`, `text`, `color`, with the same options. Option labels are `%key%` references |
| `settings[].required` | Optional, defaults to `false` |
| `settings[].default` | Optional. Must fit the control: an option value for `select` and `segmented`, a boolean for `switch`, a number within `min` and `max` for `number`, a string for `text` and `color`. Not allowed on `columnPicker` |

Settings render in declaration order in one group. The manifest compiler
rejects duplicate IDs, keys, and option values, invalid defaults, and `%key%`
references missing from `locales/en.json`.

Chart types need no permission in 1b. A chart receives only rows the viewer
can already see.

### SDK

`definePlugin` gains `vizTypes`, keyed by the manifest IDs:

```ts
export default definePlugin({
  commands: { ... },
  vizTypes: {
    epicurve: { transform: makeEpicurveFromRows },
    "rate-plot": { Component: RatePlot },
  },
});
```

```ts
/** What a plugin chart receives. */
type PluginVizInput = {
  rows: ReadonlyArray<Record<string, unknown>>;
  columns: ReadonlyArray<{ name: string; dataType: AvaDataType }>;
  /** Column settings arrive as column names. Unset settings are undefined. */
  settings: Readonly<Record<string, string | number | boolean | undefined>>;
  isTruncated: boolean;
};

/** A transform turns the input into rows plus a built-in chart spec. */
type PluginVizTransform = (input: PluginVizInput) => {
  rows: ReadonlyArray<Record<string, unknown>>;
  chart: PluginChartSpec;
};

type PluginChartSpec = {
  kind: "bar" | "line" | "area";
  xColumn: string;
  /** `date` formats the x values as dates in the viewer's locale. */
  xColumnType?: "category" | "date";
  series: ReadonlyArray<{ column: string; label?: string }>;
  layout?: "group" | "stack";
  barGap?: "default" | "none";
};

/** A component draws the chart at the size Avandar measured. */
type PluginVizComponentProps = PluginVizInput & {
  width: number;
  height: number;
};
```

Series labels are plain strings. Plugins translate them with `i18n.t` before
returning them.

Inside a chart component, `useT()` works as it does in command UI. Charts get
a smaller API than commands, because public dashboards have no workspace and
no invocation: `useAvandar()` is not available inside a chart and throws an
error naming the chart type.

### The `plugin` viz config member

```ts
type AvaPluginVizConfig = {
  vizType: "plugin";
  pluginId: string; // "avandar.epidemiology"
  pluginVizId: string; // "epicurve"
  columnSettings: Readonly<Record<string, QueryColumn.Id | undefined>>;
  settings: Readonly<Record<string, string | number | boolean | undefined>>;
};
```

`UiVizConfig` gets the same member, with column names in `columnSettings`.
Keeping column settings in their own record lets the generic code convert IDs
to names and remap provisional IDs without loading the manifest.

`VizType` now includes `"plugin"`. A `BuiltInVizType` type (the nine existing
values) serves the places that list or build built-in charts.

Building a plugin config needs the manifest, so the plugin member does not fit
`IAvaVizConfigModule`, whose `makeEmptyConfig` takes no arguments. A
`PluginVizConfigs` module provides the plugin operations, and `AvaVizConfigs`
routes `plugin` configs to it.

**Changes at each switch site:**

| Site | Plugin behavior |
| --- | --- |
| ID to name, name to ID, provisional ID remap, column slots | Map over `columnSettings` |
| The 9 built-in conversion matrices | One `plugin` branch each: converting from a plugin chart to a built-in chart builds the built-in config from the current result, as a fresh selection does |
| Converting to a plugin chart, or between plugin charts | Builds the plugin config from the current result |
| `getAxisRolesFromVizType`, `VIZ_RENDER_LIMITS` | Plugin entries (see "Row limits") |
| `vizTypeLabel` | Plugin labels come from the manifest title through a `useVizTypeLabel(config)` hook. Synchronous callers, such as gadget summaries, show "Plugin chart" until the manifest has loaded |
| `VisualizationContainer` | Routes `plugin` configs to `PluginVizRenderer` |
| `VizSettingsFormBody` | Draws the plugin settings form from manifest descriptors with the existing `Control` component |
| Frozen migration types (`AvaPageDataMigrationV3`) | Unchanged. They describe older stored shapes |
| Chat (`chat.types.ts`, `parseDashboardBlock.ts`, prompts) | Unchanged |

**Building a config from the manifest.** Selecting a plugin chart, or
converting to one, builds:

- `settings` from each setting's `default`.
- `columnSettings` for **required** column pickers only, each set to the first
  result column whose data type matches. Optional column pickers start unset.
  Auto-filling them would bind one column to several roles, such as rate,
  lower, and upper.

`setActiveVizType` accepts a `BuiltInVizType` or
`{ pluginId, pluginVizId }`.

**Row limits.** A transform receives the full fetched result, since it
usually aggregates. Its output is capped by the built-in limit of the chart
kind it returns, for example 200 bars. A component receives at most 1,000
rows.

### Picker

`VizTypeSelect` (Data Explorer) and the dashboard block's chart type select
gain a "Plugins" group. It lists the chart types of plugins that are
installed and enabled in the workspace and whose permissions are approved,
read from `ActivePluginsContext`. Option values are encoded as
`plugin:<pluginId>/<pluginVizId>`, for example
`plugin:avandar.epidemiology/epicurve`.

### Persistence

- **Data Explorer URL.** The `vc` search param carries the `UiVizConfig` as
  JSON, as it does today. The plugin member is checked with a zod schema on
  read. A URL whose plugin config fails the check falls back to the table
  view.
- **Data Explorer memory.** The per-type config memory gains a separate map,
  keyed by `<pluginId>/<pluginVizId>`, so switching away from a plugin chart
  and back restores its settings.
- **Dashboards.** A `DataViz` block stores `vizType: "plugin"` and an
  `AvaPluginVizConfig` with `columnBindingVersion: 1`. "Save to dashboard"
  copies it. The new member is additive, so the dashboard schema version and
  its migrations are unchanged. A stored plugin config that fails the zod
  check renders an "invalid chart settings" placeholder and is left as is.

### Registry and rendering

**Registry.** `getPluginVizType(pluginId, pluginVizId)` reads the bundled
plugin index (`virtual:ava-plugin-index`) and loads the manifest lazily, at
most once per session, through the existing module cache. It does not depend
on `PluginHost`, so it works on the public `/d/$slugOrId` route, which has no
workspace layout.

**`PluginVizRenderer`**, the `plugin` branch of `VisualizationContainer`:

1. Validates the config and looks up the chart type. An unknown plugin or
   chart type renders the missing-plugin placeholder, naming the plugin.
2. Shows the existing empty state when a required setting is unset, for
   example "Choose a date column".
3. Loads the plugin's code with the cached loader commands use. The chart area
   shows a loader while the chunk downloads.
4. **Transform:** runs the transform, memoized on the rows and settings.
   Validates the output with a zod schema for `PluginChartSpec`, and checks
   that `xColumn` and every series column exist in the output rows. Converts
   the spec to a built-in `UiVizConfig` and draws it with the existing
   renderer. When the input was truncated, a note under the chart reads
   "Built from the first N rows of the result."
5. **Component:** renders the component at the measured width and height,
   inside a `PluginErrorBoundary` and an `AvandarProvider` that supplies the
   chart API.

Plugin strings resolve in the viewer's current locale, on public pages too.

**Built-in bar gap.** The built-in bar chart gains a `barGap` style setting
(`default` or `none`). `none` removes the space between bars, which epicurves
and histograms need. It also appears in the built-in bar chart's settings
form.

### `@avandar/plugin-ui/charts`

A new export path of `@avandar/plugin-ui` for component charts:

- A curated set of Recharts building blocks: `ComposedChart`, `Scatter`,
  `ErrorBar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ReferenceLine`,
  `Legend`.
- `useChartTheme()`, which returns Avandar's chart colors, text color, and
  grid color for the current color scheme, including dark mode.

Recharts already ships in the app, so this path adds no bytes to app chunks.
The plugin import allowlist (`eslint/plugin-restrictions.js`) adds the path.

### Errors

| Failure | Behavior |
| --- | --- |
| The plugin or chart type is not bundled | Placeholder naming the missing plugin. The stored config is kept |
| The stored config fails validation | "Invalid chart settings" placeholder. The stored config is kept |
| A required setting is unset | The existing empty state |
| The code chunk fails to load | A "Retry" button in the chart area. The cached promise is cleared so a retry refetches |
| The transform throws or returns an invalid spec | "*Chart title* couldn't render" in the chart area. The error is logged with the plugin and chart IDs |
| The component throws while rendering | The error boundary shows the same message. The rest of the page is unaffected |

### Load-time cost

Plugin manifests, code, and strings still load only when a plugin chart
renders or the picker lists installed plugins' charts. The registry and
renderer add host code to the Data Explorer and dashboard chunks, including
the public dashboard route. The implementation plan re-measures the
`check:plugin-bundle` budget and adjusts it if needed. The rule CI enforces is
unchanged: no plugin manifest, code, or string bytes in any chunk outside the
plugin's own chunks.

## Part B: derived columns

### API

```ts
await avandar.dataExplorer.addColumns([
  {
    name: "incidence_per_100k",
    expression: "{cases} * 100000.0 / NULLIF({population}, 0)",
    inputs: { cases: "case_count", population: "pop_2024" },
  },
]);
```

- `avandar.dataExplorer` exists only for invocations from the
  `dataExplorer.toolbar` slot.
- It requires a new permission, `query:addColumns`, added to
  `PLUGIN_PERMISSIONS` with a description shown in Settings → Plugins.
- Each `{placeholder}` is replaced by the quoted identifier of the column bound
  in `inputs`. Plugins never paste column names into SQL.
- The host parses each expression with `node-sql-parser` (already a
  dependency). It must be a single scalar or window expression, every
  placeholder must be bound, and every bound column must exist in the current
  result. A violation rejects with a new `PluginError` code,
  `InvalidExpression`.
- `name` must match `^[a-z][a-z0-9_]*$`. A name that already exists in the
  result gets a `_2` suffix, then `_3`, and so on.

### Host behavior

1. The host takes the SQL the Data Explorer last ran, whether raw SQL or SQL
   generated from the structured query, and wraps it. The row number keeps the
   original row order, which window functions would otherwise change:

   ```sql
   WITH ava_source AS (
     SELECT *, row_number() OVER () AS __ava_row FROM (<current SQL>)
   )
   SELECT * EXCLUDE (__ava_row),
     <expression 1> AS "incidence_per_100k",
     <expression 2> AS "incidence_per_100k_lower"
   FROM ava_source
   ORDER BY __ava_row
   ```

2. It puts the wrapped SQL in the SQL editor and runs it. The structured query
   drops out of sync, and the Data Explorer's existing sync warning says so.
3. It shows a notification listing the added columns, with an **Undo**
   action. Undo restores the SQL and the chart config from before the command.

A query error from the wrapped SQL uses the existing query error display, and
Undo stays available. "Save to dashboard" stores the wrapped SQL like any
other SQL, so dashboards need no changes.

### Permission approval

Adding `query:addColumns` to the epidemiology manifest hides its contributions
in workspaces where it is already installed, until a settings admin approves
the new permission. This is 1a's "Review new permissions" flow. The demo
workspace needs one approval.

## The epidemiology plugin

### Epicurve (transform)

| Setting | Control | Notes |
| --- | --- | --- |
| `dateColumn` | Column picker, temporal, required | The date to bucket by, for example symptom onset |
| `countColumn` | Column picker, numeric, optional | When unset, each row counts as one case, which fits a line list |
| `interval` | Segmented: day, epi week, month. Default epi week | Epi weeks follow the CDC MMWR definition: Sunday to Saturday, week 1 is the first week with at least four days in the new year, and some years have a week 53 |
| `stackByColumn` | Column picker, text, optional | For example vaccination status |

The transform:

1. Skips rows with no valid date.
2. Buckets rows by interval, keyed by the bucket's start date, and sums
   `countColumn` (or counts rows).
3. Fills every empty bucket between the first and last date with zero. A gap
   in an outbreak is information.
4. With a stack-by column, pivots to one series per value: the 8 values with
   the most cases, plus "Other". Null values are labeled "Unknown".
5. Returns a bar spec with `layout: "stack"`, `barGap: "none"`, and
   `xColumnType: "date"`.

### Rate plot (component)

| Setting | Control | Notes |
| --- | --- | --- |
| `labelColumn` | Column picker, text, required | One chart row per value, for example borough |
| `rateColumn` | Column picker, numeric, required | The dot |
| `lowerColumn` | Column picker, numeric, optional | Left whisker |
| `upperColumn` | Column picker, numeric, optional | Right whisker |
| `sort` | Segmented: rate, label. Default rate | Rate sorts from highest to lowest |

It draws one horizontal row per label, with a dot at the rate and whiskers
from lower to upper, using `ComposedChart`, `Scatter`, and `ErrorBar`. The
tooltip shows the rate and interval, for example "12.4 (9.8–15.6)". Whiskers
are omitted when either bound is unset.

### Incidence per 100k (command `incidence.rate`)

- **Shown when:** `numericColumnCount: { gte: 1 }`.
- **The modal asks for:**
  - the cases column (numeric)
  - the population: a numeric column or a fixed number
  - the rate base: 1,000, 10,000, 100,000, or 1,000,000. The default is
    100,000
- **It adds three columns,** named after the base, for example
  `incidence_per_100k`, `incidence_per_100k_lower`, and
  `incidence_per_100k_upper`. The suffixes for the other bases are `_per_1k`,
  `_per_10k`, and `_per_1m`.
- **Confidence interval:** 95%, using Byar's approximation of the exact
  Poisson interval, where `a` is the case count, `n` the population, and `k`
  the base:
  - lower = `a * (1 - 1/(9a) - 1.96/(3*sqrt(a)))^3 / n * k`, and 0 when
    `a = 0`
  - upper = `(a+1) * (1 - 1/(9(a+1)) + 1.96/(3*sqrt(a+1)))^3 / n * k`
- Rows with a missing or zero population get NULL in all three columns.

### Rolling average (command `rolling.average`)

- **Shown when:**
  `all: [{ dateColumnCount: { gte: 1 } }, { numericColumnCount: { gte: 1 } }]`.
- **The modal asks for:**
  - the value column (numeric)
  - the date column (temporal)
  - the window: a number plus days or weeks. The default is 7 days
  - an optional group-by column
- **It adds one column,** named `<value>_<n>d_avg` or `<value>_<n>w_avg`, for
  example `cases_7d_avg`:
  ```sql
  avg({value}) OVER (
    PARTITION BY {group}
    ORDER BY {date}
    RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW
  )
  ```
  The interval is the window minus one day: `6 DAY` for 7 days, and
  `13 DAY` for 2 weeks. A `RANGE` window over dates means missing days do
  not stretch the window. Without a group-by column, `PARTITION BY` is
  omitted.
- The modal notes that the command expects one row per date, or per date and
  group.

### Manifest changes

- `permissions` adds `query:addColumns`.
- `contributes` adds the two chart types and the two commands, with menu
  entries in `dataExplorer.toolbar`.
- `locales/en.json` adds every new string.

## Documentation

`docs/plugin-authoring.md` gains sections on chart types (manifest, both render
paths, `@avandar/plugin-ui/charts`) and on `avandar.dataExplorer.addColumns`.

## Tests

Tests follow red/green TDD and `docs/rules/testing.md`.

| Area | Tests |
| --- | --- |
| Manifest | `vizTypes` schema: valid manifests, duplicate IDs and keys, invalid defaults, defaults on column pickers, missing locale keys, the new permission |
| Viz config | Building from the manifest (defaults, required-only auto-fill), conversions to and from plugin charts, ID and name remapping, zod rejection of bad URL and dashboard configs |
| Picker | Lists only installed, enabled, approved plugins' chart types. Encodes and decodes option values |
| Renderer | Transform path, component path, every row of the errors table, the truncation note, rendering with no `PluginHost` (public route) |
| Bar gap | The built-in bar chart's new setting, in the form and the renderer |
| Derived columns | SQL wrapping: quoting, row order, name clashes, rejected expressions, unbound placeholders. Data Explorer integration: the wrapped SQL runs, and Undo restores the SQL and chart config |
| Epidemiology | Epi weeks across year boundaries and week 53, zero-fill, the top-8 stacking with "Other" and "Unknown", Byar intervals against published reference values, the rolling-average SQL executed in DuckDB through `@duckdb/node-api`, rate plot rendering and sorting |
| E2E | Two specs, each run on its own: (1) build an epicurve in the Data Explorer, save it to a dashboard, publish it, and open the public link; (2) run Incidence per 100k, then switch the chart to the rate plot. Both drive the UI only, and restore any state they change |

## Acceptance

1. The epicurve renders in the Data Explorer, the dashboard editor, the
   workspace dashboard view, and a public dashboard link.
2. Incidence per 100k and Rolling average add their columns. Undo works, and
   the columns survive "Save to dashboard".
3. The rate plot draws the incidence columns with confidence whiskers.
4. After an uninstall, the picker no longer lists the plugin's chart types,
   and existing plugin charts still render. A chart from a plugin that is not
   bundled shows the missing-plugin placeholder.
5. All checks stay green, including `check:plugin-bundle`.
