# Axis minimum, maximum, tick interval, and label rotation

Design for gap-analysis items **E16** (axis minimum, maximum, tick interval)
and **E17** (axis label rotation), both listed as "quick win / must build now"
in `.temp/mark-dashboard-feature-gap-analysis.md`.

## Goal

Let a dashboard author pin a value axis to an explicit range, set an exact
tick step in data units, and rotate tick labels so a dense category axis stays
readable. The motivating chart has a Y axis running `0` to `120,000` with a
deliberately non-round `24,000` step, and an X axis of nineteen month-and-year
labels rotated ninety degrees.

## Scope

| Viz                      | X axis      | Y axis       | In scope |
| ------------------------ | ----------- | ------------ | -------- |
| `bar`                    | category    | value        | yes      |
| `line`                   | category    | value        | yes      |
| `area`                   | category    | value        | yes      |
| `scatter`                | value       | value        | yes      |
| `bubble`                 | value       | value        | yes      |
| `radar`                  | polar angle | polar radius | no       |
| `pie`, `funnel`, `table` | none        | none         | n/a      |

Radar is deliberately excluded. Its polar radius axis could carry a minimum,
maximum, and interval, but rotation is meaningless on a polar angle axis and
radar has no axis descriptor group today, so it would be a separate piece of
work rather than a variation on this one.

Out of scope, tracked elsewhere in the gap analysis: axis **number format**
(E15, the keystone item that reformats ticks as currency or percent) and
horizontal bar orientation (E4). Both interact with this work; see
[Forward compatibility](#forward-compatibility).

## Data model

### New `AxisStyle` fields

In `shared/models/vizs/ChartStyle.types.ts`:

```ts
export type AxisStyle = {
  label?: string;
  labelColor?: string;
  tickColor?: string;
  hide?: boolean;

  /** Lower bound of a value axis. Unset means derive from the data. */
  min?: number;
  /** Upper bound of a value axis. Unset means derive from the data. */
  max?: number;
  /** Step between ticks on a value axis, in data units (Excel's major unit). */
  tickInterval?: number;
  /** Tick label rotation in degrees, -90 to 90. Unset or 0 means horizontal. */
  tickAngle?: number;
};
```

All four are optional, so every saved dashboard renders exactly as it does
today. `V3_ChartStyle` in
`src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3.types.ts`
is a frozen snapshot of the V3 shape and is **not** touched. Additive optional
fields need no migration and no AvaPage schema version bump.

`tickAngle` sits on the shared `AxisStyle` rather than on an X-only type, but
only the X axis is wired and only the X axis gets a descriptor. Rotating Y tick
labels is a real capability nobody asks for, and it would need a different
layout lever anyway (`width` rather than `height`). Putting the field on the
shared type means a future Y-axis rotation is a wiring change with no type
change.

### `chartStyle` on scatter and bubble

`ScatterPlotVizConfig` and `BubbleChartVizConfig` gain `chartStyle?: ChartStyle`.
Their `convertVizConfig` implementations carry `chartStyle` across the same way
the XY modules already do, so axis styling survives a chart-type switch.

### Axis roles

New module `shared/models/vizs/getAxisRoles/getAxisRoles.ts`:

```ts
export type AxisRole = "category" | "value";

export function getAxisRoles(vizType: VizType): { x: AxisRole; y: AxisRole };
```

- `bar`, `line`, `area` → `{ x: "category", y: "value" }`
- `scatter`, `bubble` → `{ x: "value", y: "value" }`

Consulted in exactly two places: descriptor authoring (which controls exist for
a given viz) and `applyChartStyle`, which skips `resolveAxisScale` for any axis
in the `category` role. That second check is belt-and-braces — the form never
offers the controls on a category axis — but it keeps a hand-edited or
converted config from producing a nonsensical domain.
Minimum, maximum, and tick interval are only meaningful on a `value` axis;
rotation is offered on the X axis regardless of role, because long numeric
labels benefit from it as much as long category labels do.

## Why explicit tick arrays

Recharts has no "tick every N" prop. Its `interval` prop means "skip every Nth
label" on a category axis, not a step size. An exact step requires generating
an explicit `ticks={[...]}` array, which requires concrete numbers at both ends
of the domain.

Two alternatives were rejected:

- **`domain` as a function.** Recharts accepts `domain={([dMin, dMax]) => [lo, hi]}`,
  which would let Recharts do the stacking math for us. But `ticks` does not
  accept a function, so the computed extent can never reach tick generation.
- **`domain` plus `tickCount`.** Recharts runs `getNiceTickValues`, which rounds
  to human-friendly steps. It turns a deliberate `24,000` step into `25,000`,
  breaking the exact requirement that motivated the feature.

So the extent must be computed application-side, including the stacking math
Recharts would otherwise do for us.

## Architecture

Three pure modules under `src/lib/ui/viz/axis/`, each a folder with a colocated
test, matching the existing `formatChartNumber/` and `resolveColumnKey/`
pattern. `applyChartStyle` composes them and remains the single translation
point from `ChartStyle` to Mantine/Recharts props.

```
chart wrapper (knows data + layout)
  ├─ needsValueExtent(axisStyle) ────────▶ skip everything below when false
  ├─ toExtentSeries(series, sharedStackId) ──▶ per-series stacking buckets
  └─ computeValueExtent(data, series) ──▶ { min, max } | undefined
       │
       ▼
  applyChartStyle(style, { baseXAxisProps, xExtent, yExtent, xTickLabels, axisRoles })
       ├─ resolveAxisScale(axisStyle, extent)   ──▶ { domain, ticks, allowDataOverflow }
       └─ resolveTickRotation(angle, labels, fontSize) ──▶ { tick, interval, height }
       │
       ▼
  { xAxisProps, yAxisProps, gridProps, legendProps, ... }
```

### `computeValueExtent/`

```ts
export type ValueExtent = { min: number; max: number };
export type ExtentSeries = { key: string; stackId?: string };

export function computeValueExtent(
  data: UnknownDataFrame,
  series: readonly ExtentSeries[],
): ValueExtent | undefined;
```

Per row, values are bucketed by effective `stackId` (an unset `stackId` is its
own bucket), positives and negatives are summed separately within each bucket,
then the max and min are taken across buckets. That single algorithm covers:

- **grouped** — every series is its own bucket, so the extent is the plain
  per-column min/max
- **stacked** — all series share one bucket, so the extent is the row-wise sum
- **mixed** — bar already supports per-series `stackId` under `layout: "group"`,
  which produces several independent stacks in one chart

Returns `undefined` when no finite value exists (empty data, all-null column,
non-numeric cells), which makes callers fall back to Recharts' own defaults.

Percent layouts never call it. Mantine sets Recharts `stackOffset: "expand"`,
which normalizes each column to sum to `1` and then formats the ticks as
percentages, so the true domain is `0`-to-`1`. The wrapper passes
`{ min: 0, max: 1 }` directly, which means a user wanting a tick every ten
percent enters `0.1`.

### `resolveAxisScale/`

```ts
export type AxisScaleProps = {
  domain?: AxisDomain;
  ticks?: number[];
  allowDataOverflow?: boolean;
};

export function resolveAxisScale(
  axis: Pick<AxisStyle, "min" | "max" | "tickInterval"> | undefined,
  extent: ValueExtent | undefined,
): AxisScaleProps;
```

1. None of `min`, `max`, or `tickInterval` set → return `{}`. Existing charts
   are bit-for-bit unchanged.
2. Resolve concrete bounds. An unset `min` becomes `0` when the extent's min is
   non-negative, otherwise the extent's min. An unset `max` becomes the extent's
   max. Zero-anchoring matters because a bar chart whose Y axis floats off zero
   is a misleading chart. If the extent is `undefined`, fall back to `'auto'`
   for the unset side and skip tick generation entirely.
3. Generate ticks only when `tickInterval` is finite and `> 0`. Ticks form a
   lattice anchored at the low bound: `low, low + i, low + 2i, …` while
   `<= high`. Anchoring at the bound rather than at a multiple of the interval
   is what Excel does and is what honors an explicitly set `min` exactly (a
   `min` of `1000` with an interval of `24000` yields `1000, 25000, 49000, …`,
   not `0, 24000, …`).

   A **derived** bound is then extended outward onto that same lattice so the
   domain ends exactly on a tick: a derived high becomes
   `low + ceil((high - low) / i) * i`. A derived low, which is `0` for
   non-negative data, is already on the lattice. An **explicit** bound is never
   moved, so a user-set maximum that falls between ticks simply truncates the
   last one.

4. **Cap the tick count at 100.** `tickInterval: 1` on a `0`-to-`1e9` axis would
   otherwise allocate a billion-element array and hang the tab. Over the cap,
   drop `ticks` and keep the domain.
5. Set `allowDataOverflow: true` only when the user explicitly set a bound, so a
   maximum _below_ the data actually clips instead of Recharts silently widening
   it back out. Derived bounds never set it.
6. Guards: an explicit `min >= max` ignores both bounds; a non-finite or
   non-positive `tickInterval` is ignored.

### `resolveTickRotation/`

```ts
export type TickRotationProps = {
  tick?: { angle: number; textAnchor: "start" | "end" };
  interval?: 0;
  height?: number;
};

export function resolveTickRotation(
  angle: number | undefined,
  tickLabels: readonly string[],
  fontSize: number,
): TickRotationProps;
```

An unset or `0` angle returns `{}`. Otherwise the angle is clamped to
`[-90, 90]`, `textAnchor` is `"end"` for negative angles and `"start"` for
positive, and:

```
height = clamp(30, |sin θ| · longestLabelPx + |cos θ| · fontSize + 12, 160)
```

with `longestLabelPx` estimated at `0.6 · fontSize` per character. Recharts does
not grow the plot to fit rotated labels, so without this the labels simply clip
past roughly thirty degrees. The 160px ceiling stops a rotated axis from eating
the plot area.

`interval: 0` is essential: Mantine sets `interval: "preserveStartEnd"` and
`minTickGap: 5`, so a user who rotates specifically to fit all nineteen labels
would otherwise still see only some of them.

The wrapper passes the **formatted** label strings, run through the same date or
value formatter the axis uses, so a date axis is measured as `2014-01` rather
than as an epoch integer.

### `applyChartStyle` changes

Its second positional parameter becomes an options object, since it now needs
more than `baseXAxisProps`:

```ts
applyChartStyle(style, {
  baseXAxisProps,
  xExtent,
  yExtent,
  xTickLabels,
  axisRoles,
});
```

Four call sites and the existing prop test change mechanically.

**Tick-object merge fix.** Mantine's default X tick is
`{ transform: "translate(0, 10)", fontSize: 12, fill: "currentColor" }` and
`xAxisProps` spreads last, so today's `tickColor` handling replaces that object
wholesale and drops `fill: "currentColor"` — the mechanism that makes ticks
follow the theme. `tickAngle` would inherit the same bug. Tick objects are now
built by merging over explicit `X_TICK_DEFAULTS` / `Y_TICK_DEFAULTS` constants.
This also gives `AreaChart` and `BubbleChart`, which render raw Recharts axes
and never received Mantine's defaults, the same tick styling.

## Renderer wiring

Each wrapper produces the extent and the formatted tick labels, then hands them
to `applyChartStyle`. Nothing else about the wrappers moves.

**`BarChart.tsx`** — effective stack id per series is
`s.stackId ?? (layout === "stack" || layout === "percent" ? "stack" : undefined)`,
matching what Mantine assigns to the `<Bar>` elements. `layout: "percent"`
short-circuits to `{ min: 0, max: 1 }`. `xTickLabels` comes from mapping the
`xAxisKey` column through the date formatter the axis already uses. The
composite path (`renderXYComposite`, used when series have mixed `renderAs`)
already receives `styleProps`, so it inherits everything unchanged.

**`LineChart.tsx`** — identical minus stacking; every series is its own bucket.

**`AreaChart.tsx`** — same, with its four layouts mapped: `default` → per-series
buckets, `stacked` and `split` → one shared bucket, `percent` → `{0, 1}`. Split
belongs with stacked, not with default: it sets `stackOffset: "sign"`, which
stacks positives upward and negatives downward, and `computeValueExtent` already
sums the two signs separately within a bucket, so one shared bucket is exactly
right. It renders raw Recharts and already spreads `{...styleProps.xAxisProps}`
after its own defaults, so `domain`, `ticks`, `tick`, `interval`, and `height`
all land. Its `label` prop is applied after the spread and stays untouched.

**Composite renders.** `BarChart` and `AreaChart` fall back to
`renderXYComposite` when series have mixed `renderAs`, and that path always
groups, ignoring `layout`. So the extent must be computed from per-series
`stackId` alone whenever the composite path is taken. Both wrappers currently
compute `styleProps` before deciding on the composite branch; the branch check
moves above the extent computation.

**`ScatterChart.tsx`** — gains a `chartStyle` prop and its first
`applyChartStyle` call. X extent over the series' `xKey`s, Y extent over their
`key`s, both axes in the `value` role. Its existing auto-derived axis labels
(column names, when there is a single series) become the fallback used when
`chartStyle.xAxis.label` is unset, so nothing regresses for anyone who never
opens the new controls.

**`BubbleChart.tsx`** — the largest of the five diffs. It hand-rolls
`<XAxis>` / `<YAxis>` with inline `tickFormatter`s and has no chartStyle support
at all, so `styleProps` gets spread onto both axes while the compact formatters
stay as defaults.

**`VisualizationContainer.tsx`** — passes `chartStyle={config.chartStyle}` in the
`scatter` and `bubble` branches, which it does not today.

### Known visual check

Recharts positions an axis `<Label>` with `position: "insideBottom"` relative to
the axis box, so growing `height` for rotation should push the label below the
rotated ticks rather than through them. This is asserted visually rather than
assumed. If the label collides, the fix is offsetting it by the computed height,
local to `applyChartStyle`.

## Form wiring

### `makeAxisDescriptors` factory

Bar, line, and area currently hand-author nearly identical fourteen-descriptor
arrays. Writing the new axis block five times would make a threefold duplication
fivefold, so the axis descriptors move into a factory in
`shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts`:

```ts
export function makeAxisDescriptors<
  TConfig extends { chartStyle?: ChartStyle },
>(
  axis: "xAxis" | "yAxis",
  role: AxisRole,
  options?: { rotation?: boolean },
): ReadonlyArray<ChartSettingDescriptor<TConfig>>;
```

It emits `label`, `labelColor`, `tickColor`, and `hide` for any axis; adds
`min`, `max`, and `tickInterval` when `role === "value"`; and adds `tickAngle`
when `options.rotation` is set. The `group` is `"X axis"` or `"Y axis"`, which is
what `SeriesAwareVizForm` already matches on to merge the X axis group into the
axis fieldset.

Each viz module then reads:

```ts
chart: [
  { key: "layout", ... },
  { key: "withLegend", ... },
  { key: "chartStyle.legend.position", ... },
  ...makeAxisDescriptors<BarChartVizConfig>("xAxis", "category", { rotation: true }),
  ...makeAxisDescriptors<BarChartVizConfig>("yAxis", "value"),
  ...gridDescriptors,
]
```

The factory emits descriptors in the same order the modules author them today,
so the rendered form does not shuffle. Tests pin that order explicitly.

### `ChartSettingsFieldsets` extraction

The group-to-`<Fieldset>` renderer at `SeriesAwareVizForm.tsx:262-283` moves to
`VizSettingsForm/ChartSettingsFieldsets/`, along with `readSetting`, which
currently sits under `SeriesAwareVizForm/`:

```ts
type Props = {
  descriptors: readonly AnyChartSettingDescriptor[];
  config: object;
  onSettingChange: (path: string, value: unknown) => void;
  /** Groups rendered elsewhere. SeriesAwareVizForm excludes the axis group it merges inline. */
  excludeGroups?: readonly string[];
};
```

`SeriesAwareVizForm` keeps its exact current layout by passing
`excludeGroups: [axisLegend]`. `ScatterChartForm` and `BubbleChartForm` render
it below their existing series fieldsets. Their series editors
(`PairSeriesFieldset`, `BubbleSeriesFieldset`) are untouched: scatter and bubble
carry a per-series `xKey` rather than one shared `xAxisKey`, so migrating them
onto `SeriesAwareVizForm` wholesale is a separate refactor and not part of this
work.

### Controls

No change to `Control` or `ControlSpec`. The existing `number` case already
calls `onChange(undefined)` on an emptied input, which is exactly the "blank
means auto" semantics this design needs.

- `tickAngle` → `{ kind: "number", min: -90, max: 90, step: 15, unit: "°" }`
- `tickInterval` → `{ kind: "number", min: 0 }`
- `min` / `max` → `{ kind: "number" }`

## Testing

Unit tests on the three pure modules carry the weight:

- **`computeValueExtent`** — grouped, stacked, mixed `stackId` under grouped
  layout, negative values, empty data, all-null column, non-numeric cells
- **`resolveAxisScale`** — each of the six rules, the 100-tick cap, the
  `min >= max` guard, `allowDataOverflow` appearing only for explicit bounds,
  and the lattice cases: the motivating `0 / 120,000 / 24,000` chart, an
  explicit non-aligned `min` (`1000` with interval `24000`), an explicit
  `max` that falls between ticks, and a derived high extended onto the lattice
- **`resolveTickRotation`** — unset and `0` return `{}`, sign determines
  `textAnchor`, height clamps at both 30 and 160

`src/lib/ui/viz/SeriesRenderer.props.test.tsx` extends with per-viz assertions
that `domain`, `ticks`, `tick.angle`, `interval: 0`, and `height` reach each
chart, plus a no-regression case asserting that a config carrying none of the
new settings still passes no `domain` and no `ticks` at all.

Form tests extend `SeriesAwareVizForm.descriptors.test.tsx` for the new controls
and for descriptor order after the factory refactor, and add coverage that the
scatter and bubble forms render their axis fieldsets.

No Playwright spec. The props tests prove the wiring, and the resolvers are
where the real logic lives.

Renderer-level tests cover `BarChart`, `LineChart`, and `ScatterChart`, which
use Mantine wrappers and so work with the established prop-mock pattern.
`AreaChart` and `BubbleChart` render Recharts primitives directly: Recharts
reads axis children as declarative config rather than rendering them as
ordinary components, and `ResponsiveContainer` collapses to zero size under
jsdom, so a spy component is not reliably invoked. `SeriesRenderer.props.test.tsx`
already documents `AreaChart` as exempt for exactly this reason. Their
per-chart logic is therefore pushed into `toExtentSeries` and a small exported
`getAreaStacking` helper, both unit-tested, leaving only a props spread that
manual verification confirms.

## Forward compatibility

**Horizontal bars (E4).** Mantine's `orientation="vertical"` swaps the axis
roles: X becomes `type: "number"` and Y becomes `type: "category"`. Axis role is
therefore really a function of `(vizType, orientation)`. `getAxisRoles` is
written as a lookup so E4 extends it with one branch rather than reworking it.

**Axis number format (E15).** The gap analysis calls the number format system
the keystone that all four axes read from. It replaces `applyChartStyle`'s
hardcoded `_formatYAxisTick`. That is a change to the tick _formatter_, not to
the tick _values_, so it composes with this work: `resolveAxisScale` keeps
producing the values and E15 changes how they are printed. The only coupling is
`resolveTickRotation`'s label measurement, which already takes formatted strings
as input and so picks up any new formatter automatically.

## Files touched

New:

- `shared/models/vizs/getAxisRoles/getAxisRoles.ts` + test
- `shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts` + test
- `src/lib/ui/viz/axis/computeValueExtent/` + test
- `src/lib/ui/viz/axis/needsValueExtent/` + test
- `src/lib/ui/viz/axis/toExtentSeries/` + test
- `src/lib/ui/viz/axis/resolveAxisScale/` + test
- `src/lib/ui/viz/axis/resolveTickRotation/` + test
- `src/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/`

Modified:

- `shared/models/vizs/ChartStyle.types.ts`
- `shared/models/vizs/{Bar,Line,Area,ScatterPlot,BubbleChart}*VizConfig*` (types
  and descriptor registries)
- `src/lib/ui/viz/applyChartStyle.ts`
- `src/lib/ui/viz/{BarChart,LineChart,AreaChart,ScatterChart,BubbleChart}.tsx`
- `src/components/VisualizationContainer/VisualizationContainer.tsx`
- `src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm.tsx`
- `src/components/VisualizationContainer/VizSettingsForm/{ScatterChartForm,BubbleChartForm}.tsx`
- `src/lib/ui/viz/SeriesRenderer.props.test.tsx`
- `docs/dashboards-and-visualizations-inventory.md` (sections 2.2 and 3.3)
