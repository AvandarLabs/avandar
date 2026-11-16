# How to author a bundled plugin

This guide shows how to add a bundled plugin that puts a command in the Data
Explorer toolbar, adds a chart type, reads records an admin chooses for it, or
bundles datasets. It assumes a checkout of this repository with dependencies
installed, and the `ava` CLI on your `PATH` (run `pnpm build:ava-cli` if it is
not).

Bundled plugins live in `plugins/<name>/`, are listed in
`plugins/bundled.yaml`, and are built into the app as lazy chunks. A workspace
without a plugin installed downloads none of that plugin's manifest, code, or
styles, unless a page shows a chart saved from that plugin. Once a settings
admin installs it in Settings → Plugins, its code downloads only when someone
first uses one of its commands or views one of its charts. The small plugin
host and one installations request load for every workspace.

Design background:
`docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`,
`docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`,
`docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`, and
`docs/superpowers/specs/2026-11-11-plugins-1d-data-slots-design.md`. Package
exports: the READMEs of `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, and
`@avandar/plugin-ui` (see `docs/avandar-packages.md`).

## 1. Create the plugin

```bash
ava plugin init case-tools
pnpm install
ava plugin validate case-tools
pnpm dev
```

Then open Settings → Plugins in a workspace where you are a settings admin and
install the plugin. Its `hello` command appears in the Data Explorer toolbar.

`ava plugin init [name] [--publisher <publisher>] [--help]`:

| Part | Behavior |
| --- | --- |
| `name` | The folder name under `plugins/`, in kebab-case (lowercase letters, digits, single hyphens). In a terminal it is asked for when omitted. Without a terminal, omitting it fails and prints the exact command to run |
| `--publisher <publisher>` | The first part of the plugin id (`publisher.name`), also kebab-case. Defaults to `avandar`. When the command asks for a missing name in a terminal, it also asks for the publisher unless this flag is given |
| `-h`, `--help` | Prints the purpose, usage, arguments, options, and examples |

The command fails before writing anything when the name or publisher is not
kebab-case, `plugins/<name>` already exists, or `plugins/bundled.yaml` is not a
valid plugin list. Otherwise it writes the files in the next section and adds
the folder to `plugins/bundled.yaml`, keeping that file's comments.

## 2. Lay out the code

`ava plugin init` writes the five files a plugin needs. The entry starts as
`definePlugin({ commands })`, and you add `vizTypes` when you add chart types:

```text
plugins/<name>/
  ava.yaml            the manifest
  package.json        approved dependencies only
  tsconfig.json       extends the repo's base config
  locales/en.json     every user-visible string (other locales optional)
  src/index.tsx       export default definePlugin({ commands: { ... } })
```

Plugin code follows the same repository rules as app code. Put each module in
its own folder, named after the module, with its test beside it. A directory
holds at most one `*.test.ts(x)` file outside a `__tests__/` directory (see
`docs/rules/testing.md`). The epidemiology plugin is the reference:

```text
plugins/epidemiology/src/
  index.tsx                                  the plugin entry
  index.test.tsx
  derivedColumns/                            shared by the column commands
    AddColumnsFooter.tsx
    useAddColumns.ts
    getColumnNamesFromColumns/
      getColumnNamesFromColumns.ts
      getColumnNamesFromColumns.test.ts
    makeColumnNameSlugFromName/
      makeColumnNameSlugFromName.ts
      makeColumnNameSlugFromName.test.ts
  epicurve/                                  the epicurve chart type
    getBucketStartFromDate/
      getBucketStartFromDate.ts
      getBucketStartFromDate.test.ts
    getDateFromCellValue/
      getDateFromCellValue.ts
      getDateFromCellValue.test.ts
    makeEpicurveFromRows/
      makeEpicurveFromRows.ts                its transform
      makeEpicurveFromRows.test.ts
  fitLinearRegression/
    fitLinearRegression.ts
    fitLinearRegression.test.ts
  getNumberFromCellValue/
    getNumberFromCellValue.ts
    getNumberFromCellValue.test.ts
  incidence/                                 the "Incidence per 100k" command
    makeIncidenceColumnsFromOptions/
      makeIncidenceColumnsFromOptions.ts
      __tests__/
        makeIncidenceColumnsFromOptions.test.ts
        makeIncidenceColumnsFromOptions.executed.test.ts
    IncidenceModal/
      IncidenceModal.tsx
      IncidenceModal.test.tsx
      IncidenceModal.types.ts
      IncidenceForm.tsx
      PopulationFields.tsx
      RateBaseControl.tsx
      useIncidenceForm.ts
  makeRegressionPointsFromRows/
    makeRegressionPointsFromRows.ts
    makeRegressionPointsFromRows.test.ts
  ratePlot/                                  the rate plot chart type
    makeRatePlotPointsFromRows/
      makeRatePlotPointsFromRows.ts
      makeRatePlotPointsFromRows.test.ts
    makeRateTextFromPoint/
      makeRateTextFromPoint.ts
      makeRateTextFromPoint.test.ts
    RatePlot/
      RatePlot.tsx                           its component
      RatePlot.test.tsx
      RatePlot.types.ts
      RatePlotChart.tsx
      RatePlotTooltip.tsx
  RegressionModal/
    RegressionModal.tsx
    RegressionModal.test.tsx
    RegressionModal.constants.ts
    RegressionModal.types.ts
    ColumnPickers.tsx
    FitOutcome.tsx
    FittedResult.tsx
    RegressionForm.tsx
    makeStatisticTextFromNumber/
      makeStatisticTextFromNumber.ts
      makeStatisticTextFromNumber.test.ts
  rollingAverage/                            the "Rolling average" command
    makeRollingAverageColumnFromOptions/
      makeRollingAverageColumnFromOptions.ts
      __tests__/
        makeRollingAverageColumnFromOptions.test.ts
        makeRollingAverageColumnFromOptions.executed.test.ts
    RollingAverageModal/
      RollingAverageModal.tsx
      RollingAverageModal.test.tsx
      RollingAverageModal.types.ts
      RollingAverageForm.tsx
      ColumnPickers.tsx
      WindowFields.tsx
      useRollingAverageForm.ts
```

Plugin tests run with the repo's Vitest setup (`pnpm vitest run plugins/<name>`).
Tests named `*.executed.test.ts` run SQL in real DuckDB instead, with
`pnpm test:executed plugins/<name>`. They cannot import the repo's
executed-test helpers under `tests/`, because no plugin file may import from
outside its folder, so they open their own database with
`DuckDBInstance.create(":memory:")` from `@duckdb/node-api`.

## 3. Write the manifest

`ava.yaml` is strict YAML 1.2, validated by `@avandar/plugin-manifest`. Unknown
keys, duplicate keys, aliases, and parser warnings are all errors, so a typo
fails the build instead of being ignored. Under YAML 1.2, `NO` stays a string.

```yaml
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots
permissions:
  - data:context
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
  menus:
    dataExplorer.toolbar:
      - command: regression.linear
        when:
          numericColumnCount: { gte: 2 }
```

| Key | Rule |
| --- | --- |
| `id` | `publisher.name`, lowercase letters, digits, and hyphens in each part |
| `version` | A quoted semver string, for example `"0.1.0"`. An unquoted `1.10` parses as a number and fails |
| `license` | A non-empty string, such as `MIT` |
| `engines.avandar` | A non-empty version range for the host, such as `"^1"` |
| `name`, `description`, command `title` | A `%key%` reference to `locales/en.json`, such as `"%plugin.name%"`. The text is plain, with no ICU arguments. A key missing from `en.json` fails |
| `icon` (plugin and command) | A Tabler icon name in kebab-case, such as `trending-up`. It must be a real icon in `@tabler/icons-react`, matched with exact case |
| `entry` | A relative `.ts` or `.tsx` path inside the plugin folder. The file must exist. Required when the plugin contributes commands, chart types, or AI tools. A plugin that only bundles datasets leaves it out (see section 14) |
| `permissions` | A list of `data:context`, `query:addColumns`, and `data:slots` (see the API table in section 5). `data:slots` and `dataSlots` require each other (see section 13) |
| `dataSlots` | Optional. The records the plugin reads, keyed by slot id (see section 13) |
| `contributes.content` | Optional. The datasets the plugin bundles (see section 14) |
| `contributes.commands[].id` | Lowercase letters, digits, and hyphens in dot-separated words. Unique within the plugin |
| `contributes.menus.<slot>[].command` | The id of a command declared in the same manifest |

Quote any value YAML could read as something else: versions, and strings that
start with `%` (YAML needs the quotes there).

Edit `ava.yaml`, `locales/*.json`, or `plugins/bundled.yaml` while `pnpm dev`
runs and the page reloads. An invalid file shows the error in the browser
overlay and keeps the previous plugins. Adding a new npm dependency to a
bundled plugin needs a dev server restart, because the dev server computes its
`optimizeDeps` entries at startup.

## 4. Decide when a command shows

A menu entry's optional `when` decides whether its button shows, without
loading any plugin code. An entry with no `when` always shows. A condition is
exactly one of:

- **A fact comparison**: one fact and one or more operators, such as
  `numericColumnCount: { gte: 2 }`. Operators on one fact must all hold.
- **`all: [...]`**: every condition holds.
- **`any: [...]`**: at least one condition holds.
- **`not: ...`**: the condition does not hold.

Combinators need at least one condition, and a comparison names exactly one
fact. The operators are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, and `in`. `in`
takes a non-empty list, and every other operator takes a single value. Number
facts accept every operator, and boolean facts accept only `eq` and `ne`. A
value of the wrong type, an operator that does not fit the fact, or a fact the
slot does not declare fails validation. A condition that names a fact the slot
did not provide at runtime is false, even under `not` or `any`.

```yaml
when:
  all:
    - hasResult: { eq: true }
    - rowCount: { gt: 0 }
    - not: { dateColumnCount: { eq: 0 } }
```

The `dataExplorer.toolbar` slot is the only slot. Its facts:

| Fact | Type | Meaning |
| --- | --- | --- |
| `hasResult` | boolean | A settled query result is on screen |
| `rowCount` | number | Rows in that result |
| `columnCount` | number | Columns in that result |
| `numericColumnCount` | number | Columns of type whole number (`bigint`) or decimal (`double`) |
| `dateColumnCount` | number | Columns of type `date`, `time`, or `timestamp` |

While no result is on screen, `hasResult` is `false` and the counts are `0`.
Up to two matching commands render as toolbar buttons. With more than two, all
of them collapse into one "Plugins" menu. Buttons are disabled while a result
loads or another command is running.

## 5. Write the command

A plugin's entry module exports `definePlugin(...)` as its default export. The
`commands` keys must match the command ids in `ava.yaml`. A handler receives
the scoped `avandar` object and may be async.

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { RegressionModal } from "./RegressionModal/RegressionModal";

// eslint-disable-next-line react-refresh/only-export-components
export default definePlugin({
  commands: {
    "regression.linear": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("regression.linear.title"),
        content: <RegressionModal />,
      });
    },
  },
});
```

The `avandar` API, from `@avandar/plugin-sdk`:

| Member | Purpose | Permission |
| --- | --- | --- |
| `avandar.context` | What the command was invoked on: `{ slotId: "dataExplorer.toolbar", queryHandle, columns: [{ name, dataType }], rowCount }` | none |
| `avandar.data.fetchRows(handle, { columns, limit })` | Resolves `{ rows, isTruncated }` for the invoked-on result, or for a data slot `querySlot` read, with only the requested columns. `limit` defaults to 50,000 and is clamped to at most 200,000. `isTruncated` is true when the result had more rows | `data:context` |
| `avandar.data.querySlot(slotId)` | Reads the records an admin chose for one of the plugin's data slots and resolves `{ queryHandle, columns, rowCount, isTruncated }`. Commands only (see section 13) | `data:slots` |
| `avandar.ui.openModal({ title, content })` | Opens a modal. `content` is a React tree built from `@avandar/plugin-ui` | none |
| `avandar.ui.openDrawer({ title, content })` | Opens a drawer with the same options | none |
| `avandar.ui.notify({ title?, message, color? })` | Shows a notification. `title` defaults to the plugin name. `color` is `blue` (default), `green`, `red`, or `yellow` | none |
| `avandar.ui.closeModal()` | Closes the modal this invocation opened last. Does nothing when it opened none, or the user already closed it | none |
| `avandar.ui.openDataSlotBinding(slotId)` | Opens the modal that chooses a data slot's records, and resolves when it closes. Commands only (see section 13) | `data:slots` |
| `avandar.dataExplorer.addColumns(columns)` | Adds computed columns to the Data Explorer query the command was invoked on, and resolves `{ columnNames }`. `avandar.dataExplorer` is undefined outside a Data Explorer toolbar command (see section 6) | `query:addColumns` |
| `avandar.i18n.t(key, values?)` | Synchronous. Formats a message from `locales/` for the workspace locale | none |
| `avandar.workspace` | `{ id, slug, locale }`, read-only | none |

`fetchRows` accepts only the `queryHandle` of the current invocation, or a
handle `querySlot` returned during the same invocation. Any other handle
rejects with a `PluginError` coded `PermissionDenied`, and a result that is no
longer available rejects with `InvalidHandle`. A handler that throws or
rejects shows a failure notification, and a plugin chunk that fails to load can
be retried by clicking the button again.

Inside plugin UI, read the same scoped object with `useAvandar()`, and the
translator with `useT()`. Both throw a `PluginError` outside the content a
plugin opens through `avandar.ui`. The host wraps that content in an error
boundary, so a component that throws shows a failure message in the modal or
drawer and the rest of the app is unaffected.

```tsx
import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Text } from "@avandar/plugin-ui";

function RowCount() {
  const avandar = useAvandar();
  const t = useT();
  return (
    <Text>
      {t("modal.n")}: {avandar.context.rowCount}
    </Text>
  );
}
```

## 6. Add columns to the Data Explorer query

A Data Explorer toolbar command can add computed columns to the query it was
invoked on, such as an incidence rate or a rolling average. The columns are
part of the query, so they can be charted, filtered, and saved to a dashboard
like any other column. Declare `query:addColumns` in the manifest's
`permissions` and call `avandar.dataExplorer.addColumns`:

```ts
const result = await avandar.dataExplorer?.addColumns([
  {
    name: "incidence_per_100k",
    expression: "{cases} * 100000.0 / NULLIF({population}, 0)",
    inputs: { cases: "case_count", population: "pop_2024" },
  },
]);
```

`avandar.dataExplorer` is defined only for a command run from the
`dataExplorer.toolbar` slot while a finished result is on screen (it is
undefined while a query is still running). Check it before you
use it, and tell the user why nothing can be added when it is undefined.

Each column is a `DerivedColumn` from `@avandar/plugin-sdk`:

| Field | Rule |
| --- | --- |
| `name` | Lowercase snake case: a letter, then lowercase letters, digits, and underscores (`^[a-z][a-z0-9_]*$`) |
| `expression` | One SQL scalar or window expression in DuckDB's dialect, such as `{cases} * 2` or `avg({value}) OVER (ORDER BY {date})`. No `SELECT`, subquery, alias, or clause (`FROM`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `QUALIFY`, `WINDOW`, `INTO`), and no `DISTINCT` or `TOP`. `;`, `--`, and `/*` are rejected anywhere, even inside a string literal. Some DuckDB functions are denied (see below) |
| `inputs` | Maps each `{placeholder}` in `expression` to the name of a column in the result the command was invoked on, spelled exactly as `avandar.context.columns` lists it |

Never paste a column name into `expression`. Write a placeholder, a letter or
underscore followed by letters, digits, and underscores in braces, and bind it
in `inputs`. Avandar replaces it with the column's quoted identifier, so a
column named `Case count` or `a"b` works without any quoting on your side.
The expression is checked after the substitution, so a column whose name
contains `;`, `--`, or `/*` makes `addColumns` reject.
Write number literals with a decimal point, such as `100000.0` or `9.0`, where
a division must not truncate.

An expression must not call a function that reads files, runs SQL, reaches
the network or another database, reads settings, variables, or the
environment, changes state, or loads an extension. Avandar rejects, in any case and with or without a schema prefix,
every function whose name starts with `read_`, `query`, `parquet_`,
`iceberg_`, `delta_`, `http_`, `pragma_`, `duckdb_`, `sniff_`, `sqlite_`,
`postgres_`, `mysql_`, `ducklake_`, or `json_execute_`, and the functions
`glob`, `current_setting`, `getenv`, `nextval`, `setval`, `currval`,
`which_secret`, `load`, `install`, `checkpoint`, `force_checkpoint`, and
`getvariable`. The check covers nested calls and
`OVER` windows too.

When a name is already taken, by a result column or by an earlier column in
the same call, compared without case, Avandar adds `_2`, then `_3`, and so on.
`addColumns` resolves `{ columnNames }`: the names the columns were added
under, in the order you passed them. A command that calls `addColumns` again
on its own output should read these names rather than assume its own.

Avandar then:

1. Wraps the SQL behind the result, whether it was typed or built from the
   query builder, so every row keeps its order:

   ```sql
   WITH ava_source AS (
     SELECT *, row_number() OVER () AS __ava_row FROM (
   <the query's SQL>
     )
   )
   SELECT * EXCLUDE (__ava_row),
     (<expression>) AS "<name>"
   FROM ava_source
   ORDER BY __ava_row
   ```

   When the query came from the query builder with no SQL of its own, the
   automatic row limit the Data Explorer applied to it becomes part of the
   wrapped SQL.

2. Puts the wrapped SQL in the SQL editor and runs it. The query builder no
   longer matches the SQL, and the Data Explorer says so as it does for any
   edited SQL.
3. Shows a "Columns added" notification that lists the new columns, with an
   **Undo** button. The notification closes after 10 seconds, and a newer one
   replaces it. Undo restores the SQL, the query builder state, and the chart
   settings from before the command, and runs that query again. If the SQL in
   the editor is no longer the SQL the command added, Undo changes nothing
   and shows "Nothing to undo".

`addColumns` resolves once the wrapped SQL is in the editor and running. If
the SQL then fails, for example because DuckDB rejects the expression for a
column's type, the Data Explorer shows the query error as it does for any
query, and Undo still restores the query from before. "Save to dashboard"
saves the wrapped SQL like any other SQL.

`addColumns` rejects with a `PluginError` and changes nothing when:

| `code` | When |
| --- | --- |
| `InvalidExpression` | The list is empty, a `name` breaks the rule above, a placeholder has no `inputs` entry, an input names a column the result does not have, an `expression` is not exactly one scalar or window expression or calls a denied function, or the result has a column named `__ava_row` (any case), which Avandar reserves for the row order |
| `InvalidHandle` | The Data Explorer no longer shows the result the command was invoked on, for example because the user ran another query while the command's modal was open. The message asks the user to run the command again |

A command that opens a modal and adds columns from its form should await
`addColumns`, then call `avandar.ui.closeModal()` to close the modal. On a
rejection, keep the modal open and show the error's `message` in it, so the
user can change a field and try again. The epidemiology plugin's incidence
and rolling average commands work this way (`src/derivedColumns/useAddColumns.ts`).

## 7. Declare a chart type

A chart type adds an entry to the chart type pickers of the Data Explorer and
the dashboard editor, in a "Plugins" group that lists the chart types of
installed, enabled, and approved plugins. Declare it under
`contributes.vizTypes` in `ava.yaml`. Avandar draws its settings form from the
manifest, so the picker and the form never load plugin code.

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
        - key: interval
          label: "%viz.epicurve.interval%"
          control:
            kind: segmented
            options:
              - { value: day, label: "%viz.epicurve.interval.day%" }
              - { value: epiWeek, label: "%viz.epicurve.interval.epiWeek%" }
              - { value: month, label: "%viz.epicurve.interval.month%" }
          default: epiWeek
```

| Key | Rule |
| --- | --- |
| `id` | Lowercase letters, digits, and hyphens in dot-separated words, like a command id. Unique within the plugin. Its code in `definePlugin` uses the same key |
| `title` | A `%key%` reference. It names the chart in the picker and in its error messages |
| `icon` | A Tabler icon name, checked like command icons |
| `render` | `transform` or `component` (see the next section) |
| `settings[].key` | A letter, then letters and digits. Unique within the chart type |
| `settings[].label` | A `%key%` reference |
| `settings[].control` | One of the controls below |
| `settings[].required` | Optional, `false` by default. Until every required setting has a value, the chart area asks for each one ("You haven't chosen: Date column") instead of drawing the chart |
| `settings[].default` | Optional. It must fit the control, as the table below says |

Settings render in the order they are declared, in one group. When someone
picks the chart type, each setting starts at its `default`, and each required
column picker starts at the first result column of its data type. Optional
column pickers start unset, so one column is never bound to several roles,
such as a rate and its bounds, at once.

| `kind` | Options | The chart receives | `default` |
| --- | --- | --- | --- |
| `columnPicker` | `dataType`: `numeric`, `temporal`, `text`, or `any`. Omitted means `any` | The column's name | Not allowed |
| `select` | `options`: one or more `{ value, label }`, each `label` a `%key%` | The chosen `value` | One of the `value`s |
| `segmented` | `options`: two or more `{ value, label }` | The chosen `value` | One of the `value`s |
| `switch` | None | `true` or `false` | A boolean |
| `number` | `min`, `max`, `step`, and `unit` (a `%key%`), all optional | A number | A number from `min` to `max` |
| `text` | `placeholder` (a `%key%`), optional | The text | A string |
| `color` | None | A color, as text | A string |

Duplicate ids, setting keys, or option values, a `default` that does not fit
its control, and a `number` whose `min` is above its `max` all fail
validation. Chart types need no permission: a chart receives only rows its
viewer can already see.

## 8. Draw a chart type

Give each chart type its code under `vizTypes` in `definePlugin`, keyed by its
manifest `id`. A `transform` chart type provides `transform`, and a
`component` chart type provides `Component`:

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";

// eslint-disable-next-line react-refresh/only-export-components
export default definePlugin({
  vizTypes: {
    epicurve: { transform: makeEpicurveFromRows },
    "rate-plot": { Component: RatePlot },
  },
});
```

Both receive a `PluginVizInput`:

| Field | Meaning |
| --- | --- |
| `rows` | The query result, as rows keyed by column name |
| `columns` | `[{ name, dataType }]`, the result's columns |
| `settings` | The chart's settings, keyed by `key`. A column setting holds the column's name. An unset setting is `undefined` |
| `isTruncated` | True when `rows` holds only the first part of the result. A component's rows are cut at 1,000, which sets it. The host can also set it for a result it cut short, and no caller does today |

A **transform** is a pure, synchronous function that turns the input into new
rows and a `PluginChartSpec`, and Avandar draws the result with its own bar,
line, or area chart. It suits charts that aggregate, so it receives every row
of the fetched result, and Avandar runs it again only when its input or the
locale changes. Avandar calls it as `transform(input, { i18n, locale })`:
`i18n.t` translates labels such as "Other", and `locale` is the viewer's
locale.

```ts
import type {
  PluginVizContext,
  PluginVizInput,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";

export function makeCountsFromRows(
  input: PluginVizInput,
  context: PluginVizContext,
): PluginVizTransformResult {
  const groupColumn = String(input.settings.groupColumn);
  const counts = new Map<string, number>();
  input.rows.forEach((row) => {
    const group = String(row[groupColumn]);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  });
  return {
    rows: [...counts].map(([group, count]) => {
      return { group, count };
    }),
    chart: {
      kind: "bar",
      xColumn: "group",
      series: [{ column: "count", label: context.i18n.t("chart.count") }],
    },
  };
}
```

| `PluginChartSpec` field | Meaning |
| --- | --- |
| `kind` | `bar`, `line`, or `area` |
| `xColumn` | The output column on the x axis |
| `xColumnType` | Optional, `category` by default. `date` formats the x values as `YYYY-MM-DD` in UTC. Write dates as `YYYY-MM-DD` |
| `series` | At least one `{ column, label }`, one per series. `label` is optional plain text, so translate it with `context.i18n.t` |
| `layout` | Optional, `group` by default. `stack` stacks the series, and `group` sets them side by side. It applies to `bar` and `area`, and a `line` chart ignores it |
| `barGap` | Optional, `default` by default. `none` removes the space between bars, as an epicurve or a histogram needs. It applies to `bar` only |

Name output columns yourself, such as `series_0`, rather than after data
values: a value such as `a.b` would be read as a nested path, and a value
could collide with another column. Avandar checks the returned spec, and that
`xColumn` and every series column exist in the first returned row. Empty rows
pass that check.

Avandar draws at most as many rows as its own chart of that kind: 200 for
`bar`, and 500 for `line` and `area`. Over the limit, a `bar` chart keeps the
first rows, and `line` and `area` charts show an even sample across the whole
range, with a warning toast either way. A transform that returns more should
aggregate further. The epicurve does: it keeps at most the latest 200 buckets,
to match the 200-bar limit, so a longer span drops the earliest buckets. When
an epicurve's span holds more than 200 buckets at its interval, such as more
than 200 days at the day interval, choose a coarser one: epi week or month.

A **component** draws the chart itself, at the width and height Avandar
measured, from the Recharts building blocks in `@avandar/plugin-ui/charts`.
It suits charts Avandar's own charts cannot draw, such as error bars. It
receives the input plus `width` and `height`, and at most 1,000 rows:

```tsx
import { useT } from "@avandar/plugin-sdk";
import {
  ComposedChart,
  Scatter,
  useChartTheme,
  XAxis,
  YAxis,
} from "@avandar/plugin-ui/charts";
import type { PluginVizComponentProps } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

export function DotPlot(props: PluginVizComponentProps): ReactNode {
  const t = useT();
  const theme = useChartTheme();
  return (
    <ComposedChart
      width={props.width}
      height={props.height}
      data={props.rows}
      role="img"
      title={t("chart.title")}
    >
      <XAxis type="number" dataKey={String(props.settings.xColumn)} />
      <YAxis type="number" dataKey={String(props.settings.yColumn)} />
      <Scatter fill={theme.colors[0]} />
    </ComposedChart>
  );
}
```

Inside a chart component, `useT()` works as it does in command UI.
`useAvandar()` is not available: it throws an error naming the chart type,
because a chart has no workspace and no invocation, and public dashboard links
show charts to people outside any workspace. Give the chart an accessible
name, as `role="img"` and `title` do above.

`@avandar/plugin-ui/charts` exports:

| Export | Purpose |
| --- | --- |
| `ComposedChart`, `Bar`, `Scatter`, `ErrorBar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ReferenceLine`, `Legend` | Recharts building blocks |
| `useChartTheme()` | `{ colors, textColor, gridColor }`: Avandar's chart colors, text color, and grid color for the current color scheme, dark mode included |

Recharts already ships in the app, so these exports add no bytes to app
chunks.

A saved chart renders from the plugin code this deployment bundles, wherever
it is shown: the Data Explorer, the dashboard editor, a workspace dashboard,
and a public dashboard link. Avandar does not check that the plugin is
installed. Installing only decides whether a plugin's chart types appear in
the pickers, so a chart saved before an uninstall keeps rendering.

Until the query result has columns, a plugin chart's area stays empty, with no
loader, because its settings name columns that cannot be found yet. Callers
show their own loading state while a query runs. After that, when something
goes wrong, the chart area shows what, and the rest of the page is unaffected:

| Failure | The chart area shows |
| --- | --- |
| The plugin or chart type is not bundled | "Plugin not available", naming the plugin. The stored chart is kept |
| The stored settings fail validation | "Invalid chart settings". The stored chart is kept |
| A required setting is unset, or its column is not in the result | "You haven't chosen: *setting label*", one line per such setting, such as "You haven't chosen: Date column" |
| The plugin code fails to load | "This chart couldn't load", with a "Retry" button |
| The transform throws or returns an invalid spec | "*Title* couldn't render". The error is logged with the plugin and chart ids |
| The component throws | "*Title* couldn't render". The error boundary logs it with the plugin name |
| The plugin code declares no usable chart for the chart type | "*Title* couldn't render". The error is logged with the plugin and chart ids |

A chart that crashed draws again when its settings, its data, or its chart type
change, so fixing a setting clears the error without a reload.

## 9. Translate plugin strings

Every user-visible string lives in `locales/<lang>.json`, as a flat map of key
to text. `en.json` is required and must define every `%key%` the manifest uses.
Other languages are optional. A key missing from the workspace's exact locale
(`es-MX`) falls back to its base language (`es`), then to English, then to the
bare key.

Manifest strings are plain text. Strings used in plugin code are ICU messages,
so they can take arguments and plurals:

```json
{
  "modal.truncated": "Fitted on the first {count, plural, one {# row} other {# rows}} of the result."
}
```

```ts
avandar.i18n.t("modal.truncated", { count: 50000 });
```

A message that cannot be compiled or formatted is returned as written instead
of throwing.

## 10. Stay within the import allowlist

Plugin code may import only:

- relative files inside the plugin
- `@avandar/plugin-sdk`, `@avandar/plugin-ui`, and `@avandar/plugin-ui/charts`
- `react` and `react/jsx-runtime`
- the approved npm packages: `simple-statistics`, `d3-array`, and `date-fns`
  (including its subpaths)

ESLint enforces this for `plugins/**` (`eslint/plugin-restrictions.js`). Test
files are exempt from the package list, since they import the test runner, but
no plugin file, test or not, may import a file outside its own plugin folder:
not app code through a relative path, and not another plugin.
`ava plugin validate` also fails when `package.json` lists a dependency outside
the approved list. The list is `APPROVED_PLUGIN_DEPENDENCIES` in
`@avandar/plugin-manifest`, and the ESLint patterns must stay in step with it.

Build plugin UI only from `@avandar/plugin-ui`: `Alert`, `Badge`, `Button`,
`Divider`, `Group`, `Loader`, `NumberInput`, `SegmentedControl`, `Select`,
`SimpleGrid`, `Stack`, `Switch`, `Table`, `Text`, `TextInput`, and `Title`, and
draw charts only from `@avandar/plugin-ui/charts`, in a chart component or in
command UI such as a modal. Every API call is async or fire-and-forget and
passes serializable data, with three exceptions: the synchronous `i18n.t`, the
React `content` of `openModal` and `openDrawer`, and chart components, which
are React components too.

## 11. Validate

```bash
ava plugin validate case-tools
```

`ava plugin validate [name] [--help]` checks one plugin, or every plugin in
`plugins/bundled.yaml` when no name is given (in a terminal it asks, and an
empty answer means all). For each plugin it runs:

1. The manifest checks: `ava.yaml` against the schema, locale files, the
   referenced `%key%` strings, the entry file, each content file (it exists
   and is at most 1 MiB), Tabler icons, and `package.json` dependencies.
2. `tsc` on `plugins/<name>/tsconfig.json`.
3. `eslint` on `plugins/<name>`.

Steps 2 and 3 are skipped when step 1 fails, and for a plugin with no `entry`,
which has no code to check: the command prints
`No plugin code, skipping tsc and eslint.` instead. The command exits nonzero
when any plugin fails, so CI can use it. The same manifest checks run on every
`vite build` and `pnpm dev`, and an invalid manifest fails the build.

Before you open a pull request, also run `pnpm check:plugin-bundle`. It builds
the app and fails if plugin code lands in any chunk the app can load without a
plugin, including lazily loaded routes, or if the plugin host outgrows its size
budget.

## 12. Add a tool the chat can call

A plugin can give the hosted data agent a tool.

1. Declare it under `contributes.aiTools` in `ava.yaml`. Each tool has a
   `name`, a plain-text `description` the model sees, and `parameters`. A
   `name` may not match a built-in tool's name (`run_query`, `lookup_values`,
   or `ask_user`) once both are lowercased with underscores removed, so
   `runQuery` and `askUser` fail validation too.
2. Export `aiTools.<name>` from the plugin entry. The key matches `name`.
3. In the handler, read rows with `avandar.data.fetchRows` on
   `avandar.context.queryHandle`. The handler does not receive rows as an
   argument.
4. Return a JSON object of aggregates, never row values.

An aggregate over a few rows can give those rows away. A line fitted over two
rows passes through both points, for example. Refuse to compute over fewer rows
than a small-cell minimum, as `fitRegression` does with 10.

Throw `PluginError("InvalidToolInput", message)` for a caller mistake. The
message must not contain a cell value. Any other throw becomes
`The tool failed.` for the model.

The tool runs only when the plugin's install status is `installed`, and only on
the hosted data agent. A tool handler's `avandar` has no `querySlot` or
`openDataSlotBinding` (see section 13).

For a working example, see the handler in
`plugins/epidemiology/src/fitRegression/runFitRegression.ts` and the
`fitRegression` block in `plugins/epidemiology/ava.yaml`.

## 13. Read records an admin chooses

A command can read workspace records nobody opened for it, such as every case
of a case type, through a **data slot**. The manifest declares the shape of
the records the plugin needs, and a settings admin binds the slot to a case
type or a dataset, attribute by attribute. The binding is the permission
grant: the plugin reads only the fields the admin chose, under its own
attribute names.

Declare slots under the top-level `dataSlots` key, and list `data:slots` in
`permissions`:

```yaml
permissions:
  - data:context
  - data:slots
dataSlots:
  cases:
    title: "%slot.cases.title%"
    description: "%slot.cases.description%"
    concept: Case
    required: false
    attributes:
      onsetDate:
        type: date
        title: "%slot.cases.onsetDate%"
      district:
        type: geo.admin2
        title: "%slot.cases.district%"
        required: false
```

| Key | Rule |
| --- | --- |
| Slot id | A letter, then letters and digits, such as `cases`. Unique within the plugin. `querySlot` takes it |
| `title` | A `%key%` reference |
| `description` | Optional `%key%` reference, shown above the slot's fields |
| `concept` | Optional. A case type name the install wizard lists first, compared without case. A hint, not a requirement |
| `required` | Optional, `false` by default. A required slot must be bound before Install. An optional slot can be skipped and bound later |
| `attributes` | At least one, keyed by attribute key: a letter, then letters and digits. Each key names a column `querySlot` returns. Two keys in one slot may not differ only by case, because DuckDB ignores identifier case |
| `attributes.<key>.type` | One of the types below |
| `attributes.<key>.title` | A `%key%` reference |
| `attributes.<key>.required` | Optional, `true` by default. A binding must map every required attribute |

| `type` | Binds to fields of type | The admin reads |
| --- | --- | --- |
| `number` | whole number (`bigint`) or decimal (`double`) | Number |
| `date` | `date` or `timestamp` | Date |
| `text` | text (`varchar`) | Text |
| `boolean` | `boolean` | Yes / no |
| `geo.admin1` | text (`varchar`) | Province or region, name or code |
| `geo.admin2` | text (`varchar`) | District, name or code |

A manifest that declares `dataSlots` must list `data:slots` in `permissions`,
and one that lists `data:slots` must declare at least one slot. The geo types
only change the admin's labels: Avandar does not check the values against
known boundaries.

### Binding a slot

The Install button on a plugin's card in Settings → Plugins opens a wizard
with the steps its manifest needs: Review, Records (when it declares
`dataSlots`), Datasets (when it declares `contributes.content`), and Confirm.
The Records step has one page per slot. On each, the admin picks a case type
or a dataset, case types whose name matches `concept` first, then a field for
each attribute. Each attribute lists only the fields whose type fits it. Once
every required attribute has a field, the wizard checks the records: how many
there are, how many have a value for each attribute, and the first 5 rows.
**Next** stays disabled until the slot is bound. An optional slot also has
**Skip for now**, and a required slot has no way past its page until it is
bound. The Install button is on the Confirm step, and it saves the
installation and its bindings together.

After install, the plugin's card lists its slots under "Records it reads",
each with its status (Bound, Not bound, or Broken) and, once chosen, its
source, such as "Case type: Measles cases" or "Dataset: Line list". A broken
slot lists why under it. A binding breaks when its case type or dataset is
deleted or no longer readable, a chosen field is deleted or changes to a type
the attribute does not accept, or a required attribute has no field. Workspace
admins with the plugin-management permission see Choose or Change on each
slot, and Remove on an optional slot that has a binding, bound or broken.
Other members see the status only. The database enforces the same rule: it
refuses a binding write
from anyone who is not a settings admin or the workspace owner. An admin who
approves `data:slots` under "Review new permissions" binds the slots from the
card. Uninstalling the plugin deletes its bindings.

### Reading a slot

```ts
const { querySlot } = avandar.data;
if (querySlot === undefined) {
  return;
}
const slot = await querySlot("cases");
const { rows } = await avandar.data.fetchRows(slot.queryHandle, {
  columns: ["onsetDate", "district"],
  limit: slot.rowCount,
});
```

`querySlot(slotId)` resolves:

| Field | Meaning |
| --- | --- |
| `queryHandle` | A handle `fetchRows` accepts during this invocation, and in no other. Only the 3 newest handles of an invocation stay readable: `fetchRows` on an older one rejects with `InvalidHandle` |
| `columns` | One `{ name, dataType }` per attribute, in manifest order, named by attribute key. `dataType` is the bound field's type. An unmapped optional attribute is `null` in every row, and its `dataType` follows its attribute type: `double` for `number`, `date` for `date`, `boolean` for `boolean`, and `varchar` for the rest |
| `rowCount` | The number of rows `queryHandle` holds. It is the slot's total unless `isTruncated` is true, and then it is the read limit of 200,000 |
| `isTruncated` | True when the slot holds more than 200,000 records, so `queryHandle` holds only some of them |

Avandar builds the query from the binding and runs it in the browser's DuckDB
with the current user's access, so nobody reads records they could not already
read. The plugin sees only its own attribute keys, never the workspace's field
names. `fetchRows` reads 50,000 rows unless told otherwise, so pass
`limit: slot.rowCount` to read them all. Several `querySlot` calls in one
invocation run one at a time, in call order. Every call also checks that the
plugin is still installed and enabled, so a modal that outlives a Disable
cannot keep reading.

`querySlot` rejects with a `PluginError`:

| `code` | When |
| --- | --- |
| `InvalidSlot` | The manifest declares no data slot with that id |
| `SlotNotBound` | Nobody has chosen the slot's records yet |
| `SlotBroken` | The binding no longer fits the slot. The message names attribute keys and the reasons, never a field name, a value, or a source name |
| `PermissionDenied` | The current user cannot read the bound case type or dataset, or the plugin is not currently installed and enabled, or its permissions are awaiting approval |
| `InvalidHandle` | The workspace the command started in is no longer open. Run the command again |
| `CommandFailed` | Any other failure. The message is always "The data slot could not be read." The host logs the details and never sends them to the plugin, because they can name workspace data the plugin was not given |

`avandar.ui.openDataSlotBinding(slotId)` opens a modal titled "Choose records
for *slot title*", the same one the card's Choose and Change buttons open. An
admin with the plugin-management permission chooses the records there and
saves them. Anyone else reads "Ask a workspace admin to choose which records
this plugin reads." and a Close button, because the modal checks the
permission itself. It resolves when the modal closes, saved or not, so a
command can call `querySlot` again then. A slot id the manifest does not
declare rejects with `InvalidSlot`, and a plugin that is no longer installed
and enabled with `PermissionDenied`. The epidemiology plugin's Case epicurve
does both: on `SlotNotBound` or `SlotBroken` it shows an alert with a "Choose
records" button, then reads the slot again
(`plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/useCaseSlotRows.ts`).
Its `ava.yaml` declares the `cases` slot, with a required `onsetDate` and an
optional `district`, and the `cases.epicurve` command.

Only commands get data slots. An AI tool handler's and a chart's `avandar`
have no `querySlot` or `openDataSlotBinding`. A tool that aggregates every
bound record without anyone looking at it, and returns the result to the
model, needs its own privacy review. For the same reason, do not keep
`avandar` or `querySlot` anywhere that outlives the command handler and the
overlays it opens: a tool handler that captured it could read bound records
and return them to the model.

Records a slot returns are workspace data the admin shared with the plugin for
the person running it. Show them to that person, or aggregate them, as the
Case epicurve does. Never send a value anywhere else: not in a network
request, not into browser storage or a URL, and not into SQL a command adds to
a query.

Host code that serves slots follows one split. Logic shared by Settings and
the command runtime lives in `src/lib/pluginDataSlots/`. Code only commands
use lives in `src/lib/plugins/dataSlots/` and is reached only through the lazy
command runner, so it stays out of the plugin host's size budget (see section
11).

## 14. Bundle datasets

A plugin can bundle CSV files that installing it imports as ordinary
workspace datasets, such as a country's district boundaries. Such a plugin
needs no code. The Mozambique pack is a manifest, a `package.json`, a locale
file, and two CSV files:

```text
plugins/mozambique/
  ava.yaml            no entry, no permissions, contributes.content
  package.json        name, version, private, license, type, and no dependencies
  locales/en.json
  content/mz-adm1.csv
  content/mz-adm2.csv
  content/README.md   where the data came from, its license, and what changed
```

A plugin with no commands, chart types, or AI tools leaves out `entry`,
`src/`, and `tsconfig.json`. Keep its `package.json`, as every plugin has one:
`ava plugin validate` reads its `dependencies`. Declare each file under
`contributes.content`:

```yaml
license: CC-BY-3.0-IGO
contributes:
  content:
    - id: provinces
      kind: dataset
      title: "%content.provinces.title%"
      description: "%content.provinces.description%"
      file: content/mz-adm1.csv
```

| Key | Rule |
| --- | --- |
| `id` | Lowercase letters, digits, and hyphens in dot-separated words, like a command id. Unique within the plugin. Keep it stable: it is how a workspace remembers what it already imported |
| `kind` | `dataset`, the only kind |
| `title`, `description` | `%key%` references. They become the dataset's name and description, in the language of the admin who installs it |
| `file` | A relative path to a `.csv` file inside the plugin folder, made of letters, digits, `_`, `-`, `.`, and `/`. It must not start with `/` or contain `..`. The file must exist and be at most 1 MiB (1,048,576 bytes) |

A content file goes through the same import as a CSV uploaded in Data
Manager: DuckDB detects the delimiter, the header row, and each column's type.
Give it a header row. For map boundaries, add a geometry column as WKT text in
longitude and latitude (EPSG:4326), as `mz-adm1.csv` does, and GIS detects the
column when the dataset is added as a map layer. Commit the script that builds
the files, as `scripts/plugins/buildMozambiqueBoundaries.ts` does for the
Mozambique pack. It simplifies the shapes until each file fits the size limit.

None of the files downloads until an admin imports it. Installing the plugin
works like this:

1. The wizard's Datasets step lists each item, every one checked to start
   with. An item this workspace already imported shows "Already in this
   workspace" and is not imported again.
2. The Install button on the Confirm step saves the installation, and then the
   Confirm step imports the checked items one at a time, each showing Waiting,
   Importing, Imported, or "Failed: *reason*" with a Retry button. A failure
   stops that item only, and the install stands. The wizard cannot be closed
   while an import runs, and Done stays disabled until the imports finish.
3. Importing creates a dataset, so the admin also needs the right to create
   datasets in the workspace. Without it, the item fails with the database's
   reason.

After install, the plugin's card lists its items under "Datasets it includes",
each linked to its dataset once imported, with Import for an item that is
missing and Retry for one that failed. Uninstalling the plugin keeps the
datasets. Deleting an imported dataset lets the item be imported again.

Bundled data needs attribution recorded with it. Credit its source and license
in the description, because that is where workspace members see where the data
came from, and set the manifest's `license` and `package.json`'s `license` to
the data's license. Also keep a `README.md` beside the files that names the
source, the license, and every change you made to the data, as
`plugins/mozambique/content/README.md` does. The Mozambique pack's data is the
geoBoundaries gbHumanitarian release, built from Mozambique INE and UN OCHA
ROSEA data, under CC BY 3.0 IGO. Its descriptions say so, and its README says
the shapes were simplified.

## Rules to keep in mind

- **Permissions are declared, not enforced.** A manifest lists the permissions
  it needs and Settings → Plugins shows them to admins. The host does not
  enforce them: bundled plugins run in-process. Declare `data:context`
  whenever the plugin calls `fetchRows`, `query:addColumns` whenever it
  calls `avandar.dataExplorer.addColumns`, and `data:slots` whenever it
  declares `dataSlots` (the manifest fails without it), so the manifest states
  what the plugin does. Adding a permission to a plugin that workspaces already
  installed hides its contributions there until a settings admin approves
  it under "Review new permissions" in Settings → Plugins.
- **Never bundle a contract plugin.** This repository is public. A plugin that
  carries a customer's logic or data must wait for a distribution path that
  keeps it out of this repository.
- **Keep chart type ids and setting keys stable.** Dashboards and Data
  Explorer links store them. A renamed chart type id shows the missing-plugin
  placeholder wherever the old one was saved, and a renamed setting key loses
  that setting's value.
- **Keep data slot ids, attribute keys, and content ids stable.** Bindings
  store the slot id and attribute keys, so renaming one leaves the slot unbound
  or broken in every workspace. Workspaces remember imports by content id, so
  a renamed id imports the dataset a second time.
- **Do not keep `avandar` or `querySlot` past the command.** Use them only in
  the command handler and in the modals and drawers it opens. Never store them
  in a module-level variable, a cache, or a global, and never hand them to an
  AI tool handler. A tool that held on to `querySlot` could return bound
  records to the model, which data slots must never do (see section 13).
