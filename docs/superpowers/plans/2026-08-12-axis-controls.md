# Axis Min/Max/Tick Interval/Label Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a dashboard author set an explicit minimum, maximum, and tick interval on a value axis, and rotate X-axis tick labels, on bar, line, area, scatter, and bubble charts.

**Architecture:** Four optional fields are added to the shared `AxisStyle` type. Three new pure modules under `src/lib/ui/viz/axis/` do the math: `computeValueExtent` derives the data range (stacking-aware), `resolveAxisScale` turns bounds plus interval into Recharts `domain` and `ticks`, and `resolveTickRotation` turns an angle into `tick`, `interval`, and axis `height`. `applyChartStyle` composes all three and stays the single translation point from `ChartStyle` to Mantine/Recharts props. Each chart wrapper computes its own extent because only the wrapper knows its stacking layout. On the form side, a `makeAxisDescriptors` factory replaces the duplicated axis descriptor blocks, and a `ChartSettingsFieldsets` component extracted from `SeriesAwareVizForm` lets the hand-coded scatter and bubble forms render descriptor-driven fieldsets.

**Tech Stack:** TypeScript, React 19, Mantine 8 (`@mantine/charts`), Recharts, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-12-axis-controls-design.md`

---

## Orientation for someone new to this codebase

Read this before starting. It will save you an hour.

**Two import aliases.** `$/` maps to `shared/` and `@/` maps to `src/`. Files under `shared/` must use `.ts` extensions in their import specifiers (`"$/models/vizs/ChartStyle.types.ts"`); files under `src/` must not (`"@/lib/ui/viz/applyChartStyle"`). Copy the convention from the file you are editing.

**Running tests.** Everything in this plan is a frontend test:

```bash
pnpm test:frontend                              # all of them
pnpm vitest run path/to/file.test.ts            # one file
pnpm vitest run path/to/file.test.ts -t "name"  # one test
```

`pnpm type-check` runs `tsc -b --noEmit` across the workspace. Run it before every commit; the aliases and the `VizConfig` union catch a lot.

**Vocabulary that matters.** A **setting** is a persisted config field addressed by a dotted path (`chartStyle.yAxis.min`). A **control** is the Mantine widget that edits it. A **descriptor** binds one setting to one control. This is spelled out at the top of `shared/models/vizs/SettingDescriptor.ts` and the codebase is strict about it. Do not call a switch a setting.

**Why the tick math looks the way it does.** Recharts has no "tick every N" prop. Its `interval` prop means "skip every Nth label". An exact step requires passing an explicit `ticks={[...]}` array. `domain` accepts a function that receives the data extent, but `ticks` does not, so we cannot borrow Recharts' own extent calculation and must compute it ourselves, stacking included.

**Two existing test suites do a lot of work for free.**

- `SeriesAwareVizForm.descriptors.test.tsx` iterates `VizConfigs.getDescriptors(vizType).chart` and drives every descriptor's control generically. Any descriptor you add is automatically covered. Do not hand-write per-descriptor form tests.
- `SeriesRenderer.props.test.tsx` mocks the Mantine chart components and asserts props. This is where renderer wiring gets tested.

**Private helper naming.** A module-level function that is not exported is prefixed with an underscore: `_formatYAxisTick` in `src/lib/ui/viz/applyChartStyle.ts`, `_bucketKeyFor`, `_clamp`. This is widespread established practice in this repo (about half of all module-level functions), not an optional flourish. Exported functions never take the prefix.

**A trap.** Mantine spreads `...xAxisProps` *after* its own defaults, so anything you pass wins. Its default X tick object is `{ transform: "translate(0, 10)", fontSize: 12, fill: "currentColor" }`. Passing your own `tick` **replaces** it wholesale rather than merging. Task 5 fixes this.

---

## File structure

**New files**

| File | Responsibility |
| --- | --- |
| `shared/models/vizs/getAxisRoles/getAxisRoles.ts` | `AxisRole` type and `getAxisRoles(vizType)` lookup |
| `shared/models/vizs/getAxisRoles/getAxisRoles.test.ts` | Tests for the above |
| `shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts` | `makeAxisDescriptors` factory |
| `shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.test.ts` | Tests for the above |
| `src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.ts` | Stacking-aware data range |
| `src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.test.ts` | Tests |
| `src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.ts` | Predicate: does this axis need an extent at all |
| `src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.test.ts` | Tests |
| `src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.ts` | Resolve each series' stacking bucket |
| `src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.test.ts` | Tests |
| `src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.ts` | Bounds + interval → `domain`, `ticks` |
| `src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.test.ts` | Tests |
| `src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.ts` | Angle → `tick`, `interval`, `height` |
| `src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.test.ts` | Tests |
| `src/lib/ui/viz/applyChartStyle.test.ts` | Unit tests for the composed translator |
| `src/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/ChartSettingsFieldsets.tsx` | Renders one `<Fieldset>` per descriptor group |
| `src/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/readSetting.ts` | Moved from `SeriesAwareVizForm/` |
| `src/components/VisualizationContainer/VizSettingsForm/PairChartForms.test.tsx` | Scatter/bubble form tests |
| `src/lib/ui/viz/axis/getAreaStacking/getAreaStacking.test.ts` | Area's layout-to-stacking rule |
| `src/lib/ui/viz/SeriesRenderer.props.test.tsx` | Scatter axis prop assertions |

**A note on renderer test coverage.** `BarChart`, `LineChart`, and `ScatterChart` use Mantine wrappers, so the established prop-mock pattern works and they get renderer-level tests. `AreaChart` and `BubbleChart` render Recharts primitives directly. Recharts reads axis children as declarative config via `findAllByType` rather than rendering them as ordinary components, and `ResponsiveContainer` collapses to zero size under jsdom, so a spy component is not reliably invoked — and no test in this repo mocks Recharts today. `SeriesRenderer.props.test.tsx` already documents `AreaChart` as deliberately exempt for this reason. Their correctness rides on the unit-tested pure modules plus the manual verification at the end. Do not add Recharts mocking to this plan.

**Modified files**

| File | Change |
| --- | --- |
| `shared/models/vizs/ChartStyle.types.ts` | Four new `AxisStyle` fields |
| `shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts` | Add `chartStyle` |
| `shared/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts` | Add `chartStyle` |
| `shared/models/vizs/{Bar,Line,Area}ChartVizConfig/*VizConfigs.ts` | Use `makeAxisDescriptors` |
| `shared/models/vizs/{ScatterPlot,BubbleChart}VizConfig/*VizConfigs.ts` | Real descriptors, carry `chartStyle` on convert |
| `src/lib/ui/viz/applyChartStyle.ts` | Options object, compose resolvers, tick-defaults merge |
| `src/lib/ui/viz/{BarChart,LineChart,AreaChart,ScatterChart,BubbleChart}.tsx` | Compute extent, pass options |
| `src/components/VisualizationContainer/VisualizationContainer.tsx` | Pass `chartStyle` to scatter and bubble |
| `src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm.tsx` | Use `ChartSettingsFieldsets` |
| `src/components/VisualizationContainer/VizSettingsForm/{ScatterChartForm,BubbleChartForm}.tsx` | Render `ChartSettingsFieldsets` |
| `src/lib/ui/viz/SeriesRenderer.props.test.tsx` | New axis prop assertions |
| `docs/dashboards-and-visualizations-inventory.md` | Sections 2.2 and 3.3 |

---

## Task 1: `AxisStyle` fields and `getAxisRoles`

**Files:**
- Modify: `shared/models/vizs/ChartStyle.types.ts`
- Create: `shared/models/vizs/getAxisRoles/getAxisRoles.ts`
- Test: `shared/models/vizs/getAxisRoles/getAxisRoles.test.ts`

- [ ] **Step 1: Add the four fields to `AxisStyle`**

Replace the `AxisStyle` type in `shared/models/vizs/ChartStyle.types.ts`:

```ts
export type AxisStyle = {
  /** Display label for the axis (e.g. "Revenue (USD)"). */
  label?: string;

  /** CSS color for the axis label text. */
  labelColor?: string;

  /** CSS color for the tick label text. */
  tickColor?: string;

  /** Hide the axis line, ticks, and labels entirely. */
  hide?: boolean;

  /**
   * Lower bound of a value axis. Unset means derive it from the data
   * (zero-anchored when the data is non-negative). Ignored on a
   * category axis.
   */
  min?: number;

  /**
   * Upper bound of a value axis. Unset means derive it from the data.
   * Ignored on a category axis.
   */
  max?: number;

  /**
   * Step between ticks on a value axis, in data units (Excel's "major
   * unit"). Recharts has no step prop, so this generates an explicit
   * tick array. Ignored on a category axis.
   */
  tickInterval?: number;

  /**
   * Tick label rotation in degrees, -90 to 90. Unset or `0` means
   * horizontal. Only wired for the X axis; the field lives on the
   * shared axis type so adding Y rotation later needs no type change.
   */
  tickAngle?: number;
};
```

- [ ] **Step 2: Write the failing test for `getAxisRoles`**

Create `shared/models/vizs/getAxisRoles/getAxisRoles.test.ts`:

```ts
import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles.ts";
import { describe, expect, it } from "vitest";

describe("getAxisRoles", () => {
  it("gives bar, line, and area a category X and a value Y", () => {
    expect(getAxisRoles("bar")).toEqual({ x: "category", y: "value" });
    expect(getAxisRoles("line")).toEqual({ x: "category", y: "value" });
    expect(getAxisRoles("area")).toEqual({ x: "category", y: "value" });
  });

  it("gives scatter and bubble two value axes", () => {
    expect(getAxisRoles("scatter")).toEqual({ x: "value", y: "value" });
    expect(getAxisRoles("bubble")).toEqual({ x: "value", y: "value" });
  });

  it("gives vizs without cartesian axes no value axis", () => {
    expect(getAxisRoles("pie")).toEqual({ x: "category", y: "category" });
    expect(getAxisRoles("funnel")).toEqual({ x: "category", y: "category" });
    expect(getAxisRoles("radar")).toEqual({ x: "category", y: "category" });
    expect(getAxisRoles("table")).toEqual({ x: "category", y: "category" });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run shared/models/vizs/getAxisRoles/getAxisRoles.test.ts`
Expected: FAIL — cannot resolve `$/models/vizs/getAxisRoles/getAxisRoles.ts`.

- [ ] **Step 4: Implement `getAxisRoles`**

Create `shared/models/vizs/getAxisRoles/getAxisRoles.ts`:

```ts
import type { VizType } from "$/models/vizs/VizConfig/VizConfig.types.ts";

/**
 * Which kind of scale an axis uses. Minimum, maximum, and tick interval
 * are only meaningful on a `value` axis; a `category` axis places
 * discrete labels and has no numeric domain to bound.
 */
export type AxisRole = "category" | "value";

export type AxisRoles = { x: AxisRole; y: AxisRole };

const CATEGORY_X: AxisRoles = { x: "category", y: "value" };
const BOTH_VALUE: AxisRoles = { x: "value", y: "value" };
const NEITHER: AxisRoles = { x: "category", y: "category" };

/**
 * Exhaustive so that adding a viz type is a compile error here rather
 * than a silently wrong axis form.
 */
const AXIS_ROLES_BY_VIZ_TYPE: Record<VizType, AxisRoles> = {
  bar: CATEGORY_X,
  line: CATEGORY_X,
  area: CATEGORY_X,
  scatter: BOTH_VALUE,
  bubble: BOTH_VALUE,
  radar: NEITHER,
  pie: NEITHER,
  funnel: NEITHER,
  table: NEITHER,
};

/**
 * The axis roles for a viz type. Read by descriptor authoring (which
 * controls exist) and by `applyChartStyle` (whether to resolve a
 * numeric domain for an axis).
 *
 * When horizontal bar orientation lands, this becomes
 * `getAxisRoles(vizType, orientation)`: `orientation: "vertical"` swaps
 * bar's roles to `{ x: "value", y: "category" }`.
 */
export function getAxisRoles(vizType: VizType): AxisRoles {
  return AXIS_ROLES_BY_VIZ_TYPE[vizType];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run shared/models/vizs/getAxisRoles/getAxisRoles.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Type-check and commit**

```bash
pnpm type-check
git add shared/models/vizs/ChartStyle.types.ts shared/models/vizs/getAxisRoles
git commit -m "feat(viz): add axis scale and rotation fields to AxisStyle"
```

---

## Task 2: `computeValueExtent`

The extent is the numeric range a value axis must cover. It is stacking-aware because a stacked bar chart's visual maximum is a row-wise sum, not a per-column maximum.

**Files:**
- Create: `src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.ts`
- Test: `src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";

const DATA = [
  { x: "a", v: 10, w: 5 },
  { x: "b", v: 20, w: 4 },
  { x: "c", v: 30, w: 3 },
];

describe("computeValueExtent", () => {
  it("takes the plain min and max when every series is its own bucket", () => {
    expect(computeValueExtent(DATA, [{ key: "v" }, { key: "w" }])).toEqual({
      min: 3,
      max: 30,
    });
  });

  it("sums row-wise when series share a stack", () => {
    expect(
      computeValueExtent(DATA, [
        { key: "v", stackId: "s" },
        { key: "w", stackId: "s" },
      ]),
    ).toEqual({ min: 15, max: 33 });
  });

  it("treats separate stack ids as independent stacks", () => {
    const data = [{ a: 1, b: 2, c: 10, d: 20 }];
    expect(
      computeValueExtent(data, [
        { key: "a", stackId: "left" },
        { key: "b", stackId: "left" },
        { key: "c", stackId: "right" },
        { key: "d", stackId: "right" },
      ]),
    ).toEqual({ min: 3, max: 30 });
  });

  it("sums positives and negatives separately within a stack", () => {
    const data = [{ up: 10, down: -4, alsoDown: -6 }];
    expect(
      computeValueExtent(data, [
        { key: "up", stackId: "s" },
        { key: "down", stackId: "s" },
        { key: "alsoDown", stackId: "s" },
      ]),
    ).toEqual({ min: -10, max: 10 });
  });

  it("handles all-negative data", () => {
    const data = [{ v: -5 }, { v: -1 }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: -5,
      max: -1,
    });
  });

  it("ignores non-numeric and null cells", () => {
    const data = [{ v: 5 }, { v: null }, { v: "not a number" }, { v: 9 }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9,
    });
  });

  it("returns undefined for empty data", () => {
    expect(computeValueExtent([], [{ key: "v" }])).toBeUndefined();
  });

  it("returns undefined when no series are given", () => {
    expect(computeValueExtent(DATA, [])).toBeUndefined();
  });

  it("returns undefined when the column holds no finite values", () => {
    const data = [{ v: null }, { v: undefined }];
    expect(computeValueExtent(data, [{ key: "v" }])).toBeUndefined();
  });

  it("returns undefined when the column is missing entirely", () => {
    expect(computeValueExtent(DATA, [{ key: "nope" }])).toBeUndefined();
  });

  it("ignores cells that Number() would coerce to a finite zero", () => {
    // `Number("")`, `Number([])`, and `Number(false)` are all `0`. Left
    // unguarded they would drag the extent down to zero.
    const data = [{ v: 5 }, { v: "" }, { v: [] }, { v: false }, { v: 9 }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9,
    });
  });

  it("reads numeric strings", () => {
    const data = [{ v: "5" }, { v: "9.5" }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9.5,
    });
  });

  it("reads bigint values, which DuckDB returns for bigint columns", () => {
    const data = [{ v: 5n }, { v: 9n }];
    expect(computeValueExtent(data, [{ key: "v" }])).toEqual({
      min: 5,
      max: 9,
    });
  });

  it("never merges an ungrouped series into a same-named stack", () => {
    // The ungrouped series sits at index 1 and the stack is literally
    // named "1"; they must stay separate buckets.
    const data = [{ a: 100, b: 1 }];
    expect(
      computeValueExtent(data, [{ key: "a", stackId: "1" }, { key: "b" }]),
    ).toEqual({ min: 1, max: 100 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `computeValueExtent`**

Create `src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.ts`:

```ts
import type { UnknownDataFrame } from "@avandar/utils";

/** The numeric range a value axis must cover. */
export type ValueExtent = { min: number; max: number };

/**
 * A series contributing to an axis extent. Series sharing a `stackId`
 * stack on top of each other, so their values sum row-wise; a series
 * with no `stackId` stands alone.
 */
export type ExtentSeries = { key: string; stackId?: string };

/**
 * Bucket key for a series. Stacked series key by their `stackId` (a
 * string), ungrouped series by their index (a number). Keying the two
 * kinds with two different primitive types means a user-typed stack
 * group can never collide with a generated key — `stackId` is a
 * free-text control in the bar chart form.
 */
function _bucketKeyFor(series: ExtentSeries, index: number): string | number {
  return series.stackId ?? index;
}

/**
 * Coerce a cell to a finite number, or `NaN` when it is not numeric.
 *
 * `Number()` on its own is far too permissive: it turns `null`, `""`,
 * `[]`, and `false` all into a finite `0`, which would silently drag an
 * axis extent down to zero. Only real numbers, bigints (DuckDB returns
 * `bigint` columns as such), and non-blank numeric strings count.
 */
function _toFiniteNumber(cell: unknown): number {
  if (typeof cell === "number") {
    return cell;
  }
  if (typeof cell === "bigint") {
    return Number(cell);
  }
  if (typeof cell === "string" && cell.trim() !== "") {
    return Number(cell);
  }
  return Number.NaN;
}

/**
 * The extent a value axis needs to cover for the given series.
 *
 * Values are bucketed per row by `stackId`, with positives and
 * negatives summed separately within a bucket. That one rule covers
 * every layout we render: grouped (each series is its own bucket, so
 * the result is the plain per-column min/max), stacked (one shared
 * bucket, so the result is the row-wise sum), several independent
 * stacks in one chart, and Recharts' sign-split stacking where
 * positives grow upward and negatives downward.
 *
 * Returns `undefined` when there is nothing finite to measure, which
 * tells callers to leave the axis to Recharts.
 */
export function computeValueExtent(
  data: UnknownDataFrame,
  series: readonly ExtentSeries[],
): ValueExtent | undefined {
  if (series.length === 0) {
    return undefined;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sawFiniteValue = false;

  data.forEach((row) => {
    const positiveSums = new Map<string | number, number>();
    const negativeSums = new Map<string | number, number>();

    series.forEach((s, index) => {
      const value = _toFiniteNumber(row[s.key]);
      if (!Number.isFinite(value)) {
        return;
      }
      sawFiniteValue = true;
      const sums = value < 0 ? negativeSums : positiveSums;
      const bucket = _bucketKeyFor(s, index);
      sums.set(bucket, (sums.get(bucket) ?? 0) + value);
    });

    const widen = (total: number): void => {
      if (total > max) {
        max = total;
      }
      if (total < min) {
        min = total;
      }
    };
    positiveSums.forEach(widen);
    negativeSums.forEach(widen);
  });

  if (!sawFiniteValue) {
    return undefined;
  }
  return { min, max };
}
```

**Why `_toFiniteNumber` and not bare `Number()`:** `Number()` maps `null`, `""`, `[]`, and `false` to a finite `0`. Any of those in a charted column would silently pull the axis extent down to zero, and an empty-string cell in a numeric column is entirely ordinary in real query results. The allowlist (number, bigint, non-blank numeric string) is the whole point of the helper, so do not simplify it back to `Number()`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/ui/viz/axis/computeValueExtent/computeValueExtent.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/axis/computeValueExtent
git commit -m "feat(viz): add stacking-aware computeValueExtent"
```

---

## Task 3: Extent helpers — `needsValueExtent` and `toExtentSeries`

Two small modules the wrappers share.

`needsValueExtent` is a guard so a wrapper skips the extent scan entirely when no scale setting is configured, keeping the "no settings means zero behavior change and zero added cost" guarantee.

`toExtentSeries` turns a chart's series plus its stacking decision into `ExtentSeries[]`. It exists so the layout-to-stacking rule — the only genuinely tricky per-wrapper logic — is unit-testable without rendering a chart. `AreaChart` and `BubbleChart` render Recharts primitives directly and the codebase already documents them as exempt from renderer-level prop tests, so this module is where their correctness is actually proven.

**Files:**
- Create: `src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.ts`
- Test: `src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.test.ts`
- Create: `src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.ts`
- Test: `src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";

describe("needsValueExtent", () => {
  it("is false for an undefined axis", () => {
    expect(needsValueExtent(undefined)).toBe(false);
  });

  it("is false when only cosmetic settings are present", () => {
    expect(needsValueExtent({ label: "Revenue", tickColor: "#fff" })).toBe(
      false,
    );
  });

  it("is true when a minimum is set", () => {
    expect(needsValueExtent({ min: 0 })).toBe(true);
  });

  it("is true when a maximum is set", () => {
    expect(needsValueExtent({ max: 100 })).toBe(true);
  });

  it("is true when a tick interval is set", () => {
    expect(needsValueExtent({ tickInterval: 25 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `needsValueExtent`**

Create `src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.ts`:

```ts
import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

/**
 * Whether an axis has any setting that requires knowing the data's
 * numeric range. Chart wrappers call this before scanning their data
 * so an unconfigured chart pays nothing.
 */
export function needsValueExtent(axis: AxisStyle | undefined): boolean {
  return (
    axis?.min !== undefined ||
    axis?.max !== undefined ||
    axis?.tickInterval !== undefined
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/ui/viz/axis/needsValueExtent/needsValueExtent.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing test for `toExtentSeries`**

Create `src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toExtentSeries } from "@/lib/ui/viz/axis/toExtentSeries/toExtentSeries";

describe("toExtentSeries", () => {
  it("leaves every series unstacked when there is no shared stack", () => {
    expect(toExtentSeries([{ key: "v" }, { key: "w" }], undefined)).toEqual([
      { key: "v", stackId: undefined },
      { key: "w", stackId: undefined },
    ]);
  });

  it("puts every series in the shared stack when there is one", () => {
    expect(toExtentSeries([{ key: "v" }, { key: "w" }], "stack")).toEqual([
      { key: "v", stackId: "stack" },
      { key: "w", stackId: "stack" },
    ]);
  });

  it("lets a per-series stack id win over the shared one", () => {
    expect(
      toExtentSeries([{ key: "v", stackId: "g1" }, { key: "w" }], "stack"),
    ).toEqual([
      { key: "v", stackId: "g1" },
      { key: "w", stackId: "stack" },
    ]);
  });

  it("keeps per-series stack ids when there is no shared stack", () => {
    expect(
      toExtentSeries(
        [
          { key: "v", stackId: "g1" },
          { key: "w", stackId: "g1" },
          { key: "z" },
        ],
        undefined,
      ),
    ).toEqual([
      { key: "v", stackId: "g1" },
      { key: "w", stackId: "g1" },
      { key: "z", stackId: undefined },
    ]);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `toExtentSeries`**

Create `src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.ts`:

```ts
import type { ExtentSeries } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";

/**
 * Resolve each series' stacking bucket for an extent calculation.
 *
 * `sharedStackId` is the id the renderer puts on every mark when the
 * chart's layout stacks (Mantine uses `"stack"` for bar, our AreaChart
 * uses `AREA_STACK_ID`), or `undefined` when the layout groups. A series
 * that declares its own `stackId` keeps it, mirroring how both renderers
 * let a per-series id override the layout-implied one.
 *
 * Input and output are both `ExtentSeries`: this narrows *which bucket*
 * each series belongs to, it does not change the shape.
 */
export function toExtentSeries(
  series: readonly ExtentSeries[],
  sharedStackId: string | undefined,
): ExtentSeries[] {
  return series.map((s) => {
    return { key: s.key, stackId: s.stackId ?? sharedStackId };
  });
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/ui/viz/axis/toExtentSeries/toExtentSeries.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/axis/needsValueExtent src/lib/ui/viz/axis/toExtentSeries
git commit -m "feat(viz): add extent helpers for wrapper stacking decisions"
```

---

## Task 4: `resolveAxisScale`

Turns `{ min, max, tickInterval }` plus an extent into Recharts `domain`, `ticks`, and `allowDataOverflow`.

**Files:**
- Create: `src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.ts`
- Test: `src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveAxisScale } from "@/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale";

const EXTENT = { min: 0, max: 100 };

describe("resolveAxisScale — no configuration", () => {
  it("returns nothing when the axis is undefined", () => {
    expect(resolveAxisScale(undefined, EXTENT)).toEqual({});
  });

  it("returns nothing when only cosmetic settings are present", () => {
    expect(resolveAxisScale({ label: "Revenue" }, EXTENT)).toEqual({});
  });
});

describe("resolveAxisScale — bounds without an interval", () => {
  it("uses both explicit bounds and clips data to them", () => {
    expect(resolveAxisScale({ min: 10, max: 90 }, EXTENT)).toEqual({
      domain: [10, 90],
      allowDataOverflow: true,
    });
  });

  it("zero-anchors a derived minimum for non-negative data", () => {
    expect(resolveAxisScale({ max: 90 }, { min: 20, max: 100 })).toEqual({
      domain: [0, 90],
      allowDataOverflow: true,
    });
  });

  it("uses the data minimum when the data goes negative", () => {
    expect(resolveAxisScale({ max: 90 }, { min: -30, max: 100 })).toEqual({
      domain: [-30, 90],
      allowDataOverflow: true,
    });
  });

  it("derives the maximum from the data when only a minimum is set", () => {
    expect(resolveAxisScale({ min: 10 }, EXTENT)).toEqual({
      domain: [10, 100],
      allowDataOverflow: true,
    });
  });

  it("falls back to auto when there is no extent to derive from", () => {
    expect(resolveAxisScale({ min: 10 }, undefined)).toEqual({
      domain: [10, "auto"],
      allowDataOverflow: true,
    });
  });
});

describe("resolveAxisScale — tick interval", () => {
  it("generates the motivating chart's ticks", () => {
    expect(
      resolveAxisScale(
        { min: 0, max: 120000, tickInterval: 24000 },
        { min: 0, max: 118000 },
      ),
    ).toEqual({
      domain: [0, 120000],
      ticks: [0, 24000, 48000, 72000, 96000, 120000],
      allowDataOverflow: true,
    });
  });

  it("works from the interval alone by deriving both bounds", () => {
    expect(resolveAxisScale({ tickInterval: 25 }, { min: 0, max: 90 })).toEqual(
      { domain: [0, 100], ticks: [0, 25, 50, 75, 100] },
    );
  });

  it("anchors the tick lattice at an explicit non-aligned minimum", () => {
    expect(
      resolveAxisScale({ min: 1000, tickInterval: 24000 }, { min: 0, max: 50000 }),
    ).toEqual({
      domain: [1000, 73000],
      ticks: [1000, 25000, 49000, 73000],
      allowDataOverflow: true,
    });
  });

  it("truncates the last tick when an explicit maximum falls between ticks", () => {
    expect(
      resolveAxisScale(
        { min: 0, max: 100000, tickInterval: 24000 },
        { min: 0, max: 100000 },
      ),
    ).toEqual({
      domain: [0, 100000],
      ticks: [0, 24000, 48000, 72000, 96000],
      allowDataOverflow: true,
    });
  });

  it("does not set allowDataOverflow when both bounds are derived", () => {
    const result = resolveAxisScale({ tickInterval: 25 }, { min: 0, max: 90 });
    expect(result.allowDataOverflow).toBeUndefined();
  });

  it("drops ticks but keeps the domain when the count exceeds the cap", () => {
    const result = resolveAxisScale(
      { min: 0, max: 1_000_000, tickInterval: 1 },
      { min: 0, max: 1_000_000 },
    );
    expect(result.ticks).toBeUndefined();
    expect(result.domain).toEqual([0, 1_000_000]);
  });

  it("survives a fractional interval without floating point drift", () => {
    expect(
      resolveAxisScale({ min: 0, max: 1, tickInterval: 0.1 }, { min: 0, max: 1 })
        .ticks,
    ).toHaveLength(11);
  });

  it("keeps the final tick when the division lands just under a whole step", () => {
    // `(0.3 - 0) / 0.1` is `2.9999999999999996`, so without
    // TICK_COUNT_EPSILON this lattice silently loses its endpoint.
    // The 0-to-1 case above does not exercise the epsilon: `1 / 0.1` is
    // exactly `10` in IEEE754.
    const result = resolveAxisScale(
      { min: 0, max: 0.3, tickInterval: 0.1 },
      { min: 0, max: 0.3 },
    );
    expect(result.ticks).toHaveLength(4);
  });
});

describe("resolveAxisScale — guards", () => {
  it("ignores an inverted explicit range", () => {
    expect(resolveAxisScale({ min: 100, max: 10 }, EXTENT)).toEqual({});
  });

  it("ignores an equal explicit range", () => {
    expect(resolveAxisScale({ min: 50, max: 50 }, EXTENT)).toEqual({});
  });

  it("ignores a zero interval", () => {
    expect(resolveAxisScale({ tickInterval: 0 }, EXTENT)).toEqual({});
  });

  it("ignores a negative interval but honors the bounds beside it", () => {
    expect(resolveAxisScale({ min: 0, max: 50, tickInterval: -5 }, EXTENT)).toEqual(
      { domain: [0, 50], allowDataOverflow: true },
    );
  });

  it("ignores non-finite values", () => {
    expect(
      resolveAxisScale({ min: Number.NaN, max: Number.POSITIVE_INFINITY }, EXTENT),
    ).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `resolveAxisScale`**

Create `src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.ts`:

```ts
import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

/**
 * Hard ceiling on generated ticks. A tiny interval over a huge range
 * would otherwise allocate a giant array and lock up the tab.
 */
const MAX_GENERATED_TICKS = 100;

/**
 * Tolerance for the tick-count division. Without it a lattice like
 * `0.1` steps across `0` to `1` lands on `9.999...` and loses a tick.
 */
const TICK_COUNT_EPSILON = 1e-9;

/** A Recharts domain bound: a concrete number or Recharts' own choice. */
export type AxisBound = number | "auto";

export type AxisScaleProps = {
  domain?: [AxisBound, AxisBound];
  ticks?: number[];
  allowDataOverflow?: boolean;
};

type AxisScaleStyle = Pick<AxisStyle, "min" | "max" | "tickInterval">;

function _finiteOrUndefined(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Translate a value axis's bounds and tick interval into Recharts
 * props.
 *
 * Recharts has no tick-step prop and its nice-number tick generator
 * would round a deliberate step (24,000) to a tidy one (25,000), so an
 * exact interval has to be expressed as an explicit `ticks` array,
 * which in turn needs concrete numbers at both ends of the domain.
 *
 * `extent` supplies those numbers for whichever bound the user left
 * blank. Pass `undefined` when the data has nothing finite to measure.
 */
export function resolveAxisScale(
  axis: AxisScaleStyle | undefined,
  extent: ValueExtent | undefined,
): AxisScaleProps {
  const explicitMin = _finiteOrUndefined(axis?.min);
  const explicitMax = _finiteOrUndefined(axis?.max);
  const rawInterval = _finiteOrUndefined(axis?.tickInterval);
  const interval = rawInterval !== undefined && rawInterval > 0 ? rawInterval : undefined;

  // Nothing configured: leave the axis exactly as it renders today.
  if (explicitMin === undefined && explicitMax === undefined && interval === undefined) {
    return {};
  }

  // An inverted or empty explicit range is meaningless.
  if (
    explicitMin !== undefined &&
    explicitMax !== undefined &&
    explicitMin >= explicitMax
  ) {
    return {};
  }

  const hasExplicitBound = explicitMin !== undefined || explicitMax !== undefined;
  // `allowDataOverflow` is what makes Recharts honor a bound that cuts
  // into the data instead of silently widening back out. Derived bounds
  // always contain the data, so they never need it.
  const overflow = hasExplicitBound ? { allowDataOverflow: true } : {};

  // A derived low bound anchors at zero for non-negative data, because a
  // value axis floating off zero misrepresents the marks it scales.
  const derivedLow =
    extent === undefined ? undefined
    : extent.min >= 0 ? 0
    : extent.min;
  const low = explicitMin ?? derivedLow;
  const high = explicitMax ?? extent?.max;

  // Without two concrete numbers we cannot build a lattice, so hand the
  // unset side back to Recharts.
  if (low === undefined || high === undefined || low >= high) {
    return { domain: [explicitMin ?? "auto", explicitMax ?? "auto"], ...overflow };
  }

  if (interval === undefined) {
    return { domain: [low, high], ...overflow };
  }

  // Ticks form a lattice anchored at the low bound, which is what Excel
  // does and what honors an explicit minimum exactly. A derived high is
  // extended outward onto that lattice so the domain ends on a tick; an
  // explicit high is never moved, so it may truncate the last tick.
  const resolvedHigh =
    explicitMax !== undefined ?
      high
    : low + Math.ceil((high - low) / interval) * interval;

  const tickCount =
    Math.floor((resolvedHigh - low) / interval + TICK_COUNT_EPSILON) + 1;

  if (tickCount > MAX_GENERATED_TICKS) {
    return { domain: [low, resolvedHigh], ...overflow };
  }

  const ticks = Array.from({ length: tickCount }, (_unused, index) => {
    return low + index * interval;
  });

  return { domain: [low, resolvedHigh], ticks, ...overflow };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale.test.ts`
Expected: PASS, 20 tests.

Two notes on the fractional cases. First, `low + index * interval` can produce `0.30000000000000004`; both tests assert only length, which is deliberate — Recharts renders values through a tick formatter, so do **not** add rounding. Second, the `0`-to-`1` case does not actually exercise `TICK_COUNT_EPSILON` (`1 / 0.1` is exactly `10` in IEEE754); the `0`-to-`0.3` case is the one that does, and it fails without the epsilon.

One more thing the plan's own test text gets wrong: `resolveAxisScale({ label: "Revenue" }, EXTENT)` does not type-check. `AxisScaleStyle` is a `Pick` of three fields, and TypeScript's excess-property check rejects `label` on a fresh object *literal* — even though a real caller passing a value already typed `AxisStyle` is structurally fine. Hoist it instead of weakening the parameter type:

```ts
    // Excess-property checking only bites on fresh literals; in practice
    // the scale resolver only reads the scale fields, but the object it
    // receives carries the cosmetic ones too.
    const cosmeticOnly: AxisStyle = { label: "Revenue" };
    expect(resolveAxisScale(cosmeticOnly, EXTENT)).toEqual({});
```

- [ ] **Step 5: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/axis/resolveAxisScale
git commit -m "feat(viz): add resolveAxisScale for axis bounds and tick interval"
```

---

## Task 5: `resolveTickRotation`

**Files:**
- Create: `src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.ts`
- Test: `src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveTickRotation } from "@/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation";

const LABELS = ["1/2014", "2/2014", "3/2014"];
const FONT_SIZE = 12;

describe("resolveTickRotation", () => {
  it("returns nothing for an undefined angle", () => {
    expect(resolveTickRotation(undefined, LABELS, FONT_SIZE)).toEqual({});
  });

  it("returns nothing for a zero angle", () => {
    expect(resolveTickRotation(0, LABELS, FONT_SIZE)).toEqual({});
  });

  it("returns nothing for a non-finite angle", () => {
    expect(resolveTickRotation(Number.NaN, LABELS, FONT_SIZE)).toEqual({});
  });

  it("anchors negative angles at the end of the label", () => {
    const result = resolveTickRotation(-45, LABELS, FONT_SIZE);
    expect(result.tick).toEqual({ angle: -45, textAnchor: "end" });
  });

  it("anchors positive angles at the start of the label", () => {
    const result = resolveTickRotation(45, LABELS, FONT_SIZE);
    expect(result.tick).toEqual({ angle: 45, textAnchor: "start" });
  });

  it("clamps beyond ninety degrees", () => {
    expect(resolveTickRotation(200, LABELS, FONT_SIZE).tick?.angle).toBe(90);
    expect(resolveTickRotation(-200, LABELS, FONT_SIZE).tick?.angle).toBe(-90);
  });

  it("forces every label to render", () => {
    expect(resolveTickRotation(-90, LABELS, FONT_SIZE).interval).toBe(0);
  });

  it("grows the axis height for longer labels", () => {
    // Both label lengths sit strictly inside the unclamped band (at 12px
    // and 90 degrees the floor saturates below ~3 chars and the ceiling
    // above ~22). Comparing two clamped values would pass even if the
    // growth term were deleted, so the bounds assertions keep this test
    // honest if the constants ever change.
    const short = resolveTickRotation(-90, ["abc"], FONT_SIZE).height ?? 0;
    const long =
      resolveTickRotation(-90, ["abcdefghij"], FONT_SIZE).height ?? 0;
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThan(30);
    expect(long).toBeLessThan(160);
  });

  it("never goes below the default axis height", () => {
    expect(resolveTickRotation(-5, ["a"], FONT_SIZE).height).toBe(30);
  });

  it("never exceeds the ceiling", () => {
    const label = "x".repeat(200);
    expect(resolveTickRotation(-90, [label], FONT_SIZE).height).toBe(160);
  });

  it("handles an empty label list without producing NaN", () => {
    const height = resolveTickRotation(-90, [], FONT_SIZE).height;
    expect(Number.isFinite(height)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `resolveTickRotation`**

Create `src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.ts`:

```ts
/** Recharts' default X axis height, and our floor. */
const MIN_AXIS_HEIGHT = 30;

/** Ceiling, so a rotated axis never swallows the plot area. */
const MAX_AXIS_HEIGHT = 160;

/** Rough average glyph width as a fraction of the font size. */
const CHAR_WIDTH_RATIO = 0.6;

/** Breathing room between the rotated labels and the axis label below. */
const AXIS_HEIGHT_PADDING = 12;

export type TickRotation = {
  tick?: { angle: number; textAnchor: "start" | "end" };
  interval?: 0;
  height?: number;
};

function _clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * Translate a tick label rotation into Recharts props.
 *
 * Recharts rotates via the `tick` object but does not grow the plot to
 * fit the result, so labels clip past roughly thirty degrees unless the
 * axis `height` grows with them. Height is estimated from the longest
 * label because measuring real text would mean rendering it first.
 *
 * `interval: 0` matters as much as the angle: Mantine defaults to
 * `preserveStartEnd`, so a user who rotates specifically to fit every
 * label would otherwise still see only some of them.
 */
export function resolveTickRotation(
  angle: number | undefined,
  tickLabels: readonly string[],
  fontSize: number,
): TickRotation {
  if (angle === undefined || !Number.isFinite(angle) || angle === 0) {
    return {};
  }

  const clampedAngle = _clamp(angle, -90, 90);
  const radians = (Math.abs(clampedAngle) * Math.PI) / 180;

  const longestLabelChars = tickLabels.reduce((longest, label) => {
    return Math.max(longest, label.length);
  }, 0);
  const longestLabelPx = longestLabelChars * fontSize * CHAR_WIDTH_RATIO;

  const estimatedHeight =
    Math.sin(radians) * longestLabelPx +
    Math.cos(radians) * fontSize +
    AXIS_HEIGHT_PADDING;

  return {
    tick: { angle: clampedAngle, textAnchor: clampedAngle < 0 ? "end" : "start" },
    interval: 0,
    height: Math.round(_clamp(estimatedHeight, MIN_AXIS_HEIGHT, MAX_AXIS_HEIGHT)),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/axis/resolveTickRotation
git commit -m "feat(viz): add resolveTickRotation with auto axis height"
```

---

## Task 6: Compose the resolvers in `applyChartStyle`

This changes `applyChartStyle`'s signature from `(style, baseXAxisProps)` to `(style, options)`. All four existing call sites are updated in this task so the build stays green; the wrappers start *using* the new options in Tasks 7 to 10.

**Files:**
- Modify: `src/lib/ui/viz/applyChartStyle.ts`
- Modify: `src/lib/ui/viz/BarChart.tsx:69`, `src/lib/ui/viz/LineChart.tsx:52`, `src/lib/ui/viz/AreaChart.tsx:84`
- Test: `src/lib/ui/viz/applyChartStyle.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/viz/applyChartStyle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle";

describe("applyChartStyle — no axis scale settings", () => {
  it("passes no domain or ticks when nothing is configured", () => {
    const result = applyChartStyle(undefined, {
      yExtent: { min: 0, max: 100 },
    });
    expect(result.yAxisProps?.domain).toBeUndefined();
    expect(result.yAxisProps?.ticks).toBeUndefined();
  });

  it("passes no tick object when no tick setting is configured", () => {
    const result = applyChartStyle({ xAxis: { label: "Month" } });
    expect(result.xAxisProps?.tick).toBeUndefined();
  });
});

describe("applyChartStyle — tick defaults merge", () => {
  it("keeps the theme-following fill when only an angle is set", () => {
    const result = applyChartStyle(
      { xAxis: { tickAngle: -90 } },
      { xTickLabels: ["1/2014"] },
    );
    expect(result.xAxisProps?.tick).toMatchObject({
      fill: "currentColor",
      fontSize: 12,
      angle: -90,
      textAnchor: "end",
    });
  });

  it("lets an explicit tick color win over the default fill", () => {
    const result = applyChartStyle({ xAxis: { tickColor: "#00ff00" } });
    expect(result.xAxisProps?.tick).toMatchObject({
      fill: "#00ff00",
      fontSize: 12,
    });
  });
});

describe("applyChartStyle — axis roles gate the value settings", () => {
  it("resolves a value Y axis", () => {
    const result = applyChartStyle(
      { yAxis: { min: 0, max: 100, tickInterval: 25 } },
      { yExtent: { min: 0, max: 100 }, axisRoles: { x: "category", y: "value" } },
    );
    expect(result.yAxisProps?.domain).toEqual([0, 100]);
    expect(result.yAxisProps?.ticks).toEqual([0, 25, 50, 75, 100]);
  });

  it("ignores value settings on a category X axis", () => {
    const result = applyChartStyle(
      { xAxis: { min: 0, max: 100 } },
      { xExtent: { min: 0, max: 100 }, axisRoles: { x: "category", y: "value" } },
    );
    expect(result.xAxisProps?.domain).toBeUndefined();
  });

  it("resolves a value X axis for scatter-style charts", () => {
    const result = applyChartStyle(
      { xAxis: { min: 0, max: 100 } },
      { xExtent: { min: 0, max: 100 }, axisRoles: { x: "value", y: "value" } },
    );
    expect(result.xAxisProps?.domain).toEqual([0, 100]);
  });
});

describe("applyChartStyle — rotation", () => {
  it("forces every label and grows the axis when rotated", () => {
    const result = applyChartStyle(
      { xAxis: { tickAngle: -90 } },
      { xTickLabels: ["1/2014", "2/2014"] },
    );
    expect(result.xAxisProps?.interval).toBe(0);
    expect(result.xAxisProps?.height).toBeGreaterThan(30);
  });

  it("leaves interval and height alone when unrotated", () => {
    const result = applyChartStyle({ xAxis: { label: "Month" } });
    expect(result.xAxisProps?.interval).toBeUndefined();
    expect(result.xAxisProps?.height).toBeUndefined();
  });
});

describe("applyChartStyle — existing behavior is preserved", () => {
  it("still layers baseXAxisProps underneath", () => {
    const padding = { left: 30, right: 30 };
    const result = applyChartStyle(undefined, {
      baseXAxisProps: { padding },
    });
    expect(result.xAxisProps?.padding).toEqual(padding);
  });

  it("still maps hide to withXAxis and withYAxis", () => {
    const result = applyChartStyle({
      xAxis: { hide: true },
      yAxis: { hide: true },
    });
    expect(result.withXAxis).toBe(false);
    expect(result.withYAxis).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/applyChartStyle.test.ts`
Expected: FAIL — `applyChartStyle` takes `baseXAxisProps` positionally, so the options object is treated as X axis props and the scale assertions fail.

- [ ] **Step 3: Rewrite `applyChartStyle`**

Replace the body of `src/lib/ui/viz/applyChartStyle.ts` from the `ChartStyleProps` type onward. Keep the existing `DEFAULT_TICK_FONT_SIZE`, `DEFAULT_Y_AXIS_WIDTH`, and `_formatYAxisTick` definitions and their comments exactly as they are, and add these imports at the top:

```ts
import { resolveAxisScale } from "@/lib/ui/viz/axis/resolveAxisScale/resolveAxisScale";
import { resolveTickRotation } from "@/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation";
import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { AxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
```

Add these constants below `DEFAULT_Y_AXIS_WIDTH`:

```ts
/**
 * Baseline tick styling. Mantine sets its own defaults on the tick
 * object, but `xAxisProps` spreads last, so any tick object we pass
 * replaces Mantine's wholesale rather than merging. Passing our
 * overrides on top of these keeps `fill: "currentColor"` — the
 * mechanism that makes ticks follow the theme — instead of dropping it.
 * `AreaChart` and `BubbleChart` render raw Recharts axes and never had
 * Mantine's defaults, so they gain the same styling here.
 */
const TICK_DEFAULTS = {
  fontSize: DEFAULT_TICK_FONT_SIZE,
  fill: "currentColor",
} as const;

/** Bar, line, and area: a category X axis over a value Y axis. */
const DEFAULT_AXIS_ROLES: AxisRoles = { x: "category", y: "value" };
```

Add the options type next to `ChartStyleProps`:

```ts
export type ApplyChartStyleOptions = {
  /**
   * Chart-specific X axis settings (padding, date tick formatter) that
   * `chartStyle` layers on top of.
   */
  baseXAxisProps?: Omit<XAxisProps, "ref">;

  /** Numeric range of the X axis data. Only used on a value X axis. */
  xExtent?: ValueExtent;

  /** Numeric range of the Y axis data. Only used on a value Y axis. */
  yExtent?: ValueExtent;

  /**
   * Formatted X tick label strings, used to size a rotated axis. Only
   * needed when `chartStyle.xAxis.tickAngle` is set.
   */
  xTickLabels?: readonly string[];

  /** Which axes carry numeric scales. Defaults to bar/line/area's shape. */
  axisRoles?: AxisRoles;
};
```

Then replace the `applyChartStyle` function. Everything from `const horizontal = ...` (grid) downward is unchanged; only the signature and the two axis prop blocks change:

```ts
export function applyChartStyle(
  style: ChartStyle | undefined,
  options: ApplyChartStyleOptions = {},
): ChartStyleProps {
  const {
    baseXAxisProps,
    xExtent,
    yExtent,
    xTickLabels = [],
    axisRoles = DEFAULT_AXIS_ROLES,
  } = options;

  const xAxisStyle = style?.xAxis;
  const yAxisStyle = style?.yAxis;
  const gridStyle = style?.grid;
  const legendStyle = style?.legend;

  const xRotation = resolveTickRotation(
    xAxisStyle?.tickAngle,
    xTickLabels,
    DEFAULT_TICK_FONT_SIZE,
  );
  const xScale =
    axisRoles.x === "value" ? resolveAxisScale(xAxisStyle, xExtent) : {};
  const yScale =
    axisRoles.y === "value" ? resolveAxisScale(yAxisStyle, yExtent) : {};

  // Only emit a tick object when something actually customizes it, so
  // an unstyled chart keeps whichever defaults its renderer supplies.
  const xTick =
    xAxisStyle?.tickColor !== undefined || xRotation.tick !== undefined ?
      {
        ...TICK_DEFAULTS,
        ...(xAxisStyle?.tickColor !== undefined ?
          { fill: xAxisStyle.tickColor }
        : {}),
        ...(xRotation.tick ?? {}),
      }
    : undefined;

  const xAxisProps: Omit<XAxisProps, "ref"> = {
    ...baseXAxisProps,
    ...(xTick !== undefined ? { tick: xTick } : {}),
    ...(xRotation.interval !== undefined ? { interval: xRotation.interval } : {}),
    ...(xRotation.height !== undefined ? { height: xRotation.height } : {}),
    ...xScale,
  };

  const yTick =
    yAxisStyle?.tickColor !== undefined ?
      { ...TICK_DEFAULTS, fill: yAxisStyle.tickColor }
    : undefined;

  const yAxisProps: Omit<YAxisProps, "ref"> = {
    tickFormatter: _formatYAxisTick,
    width: DEFAULT_Y_AXIS_WIDTH,
    ...(yTick !== undefined ? { tick: yTick } : {}),
    ...yScale,
  };

  // ... grid, legend, labels, styles, and the return statement are unchanged
}
```

- [ ] **Step 4: Update the three existing call sites**

In `src/lib/ui/viz/BarChart.tsx`, `LineChart.tsx`, and `AreaChart.tsx`, change:

```ts
return applyChartStyle(chartStyle, baseXAxisProps);
```

to:

```ts
return applyChartStyle(chartStyle, { baseXAxisProps });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/ui/viz/applyChartStyle.test.ts src/lib/ui/viz/SeriesRenderer.props.test.tsx`
Expected: PASS. The existing `SeriesRenderer` suite must stay green — that is the proof this refactor changed no behavior.

- [ ] **Step 6: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/applyChartStyle.ts src/lib/ui/viz/applyChartStyle.test.ts src/lib/ui/viz/BarChart.tsx src/lib/ui/viz/LineChart.tsx src/lib/ui/viz/AreaChart.tsx
git commit -m "feat(viz): compose axis scale and rotation into applyChartStyle"
```

---

## Task 7: Wire `BarChart`

**Files:**
- Modify: `src/lib/ui/viz/BarChart.tsx`
- Test: `src/lib/ui/viz/SeriesRenderer.props.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/ui/viz/SeriesRenderer.props.test.tsx`, before the trailing `AreaChart` comment:

```ts
describe("BarChart — axis scale and rotation", () => {
  it("passes an explicit Y domain and generated ticks", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { yAxis: { min: 0, max: 120000, tickInterval: 24000 } },
    });
    const props = lastProps<{
      yAxisProps?: { domain?: unknown; ticks?: number[] };
    }>(mantineBarChartMock);
    expect(props.yAxisProps?.domain).toEqual([0, 120000]);
    expect(props.yAxisProps?.ticks).toEqual([
      0, 24000, 48000, 72000, 96000, 120000,
    ]);
  });

  it("derives the Y domain from the data when only an interval is set", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { yAxis: { tickInterval: 1 } },
    });
    const props = lastProps<{ yAxisProps?: { ticks?: number[] } }>(
      mantineBarChartMock,
    );
    expect(props.yAxisProps?.ticks).toEqual([0, 1, 2, 3]);
  });

  it("sums stacked series when deriving the Y extent", () => {
    renderBar({
      ...BAR_BASELINE,
      layout: "stack",
      series: [
        { renderAs: "bar", key: "v" },
        { renderAs: "bar", key: "w" },
      ],
      chartStyle: { yAxis: { tickInterval: 6 } },
    });
    // Row sums are 6, 6, 6, so the derived high lands on the first tick
    // past the data rather than on the largest single value (3).
    const props = lastProps<{ yAxisProps?: { domain?: unknown } }>(
      mantineBarChartMock,
    );
    expect(props.yAxisProps?.domain).toEqual([0, 6]);
  });

  it("ignores value settings on the category X axis", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { xAxis: { min: 0, max: 10 } },
    });
    const props = lastProps<{ xAxisProps?: { domain?: unknown } }>(
      mantineBarChartMock,
    );
    expect(props.xAxisProps?.domain).toBeUndefined();
  });

  it("rotates X tick labels and grows the axis to fit them", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { xAxis: { tickAngle: -90 } },
    });
    const props = lastProps<{
      xAxisProps?: {
        tick?: { angle?: number; textAnchor?: string };
        interval?: number;
        height?: number;
      };
    }>(mantineBarChartMock);
    expect(props.xAxisProps?.tick?.angle).toBe(-90);
    expect(props.xAxisProps?.tick?.textAnchor).toBe("end");
    expect(props.xAxisProps?.interval).toBe(0);
    expect(props.xAxisProps?.height).toBeGreaterThan(30);
  });

  it("adds no domain or ticks when no axis settings are configured", () => {
    renderBar(BAR_BASELINE);
    const props = lastProps<{
      xAxisProps?: { domain?: unknown; height?: unknown };
      yAxisProps?: { domain?: unknown; ticks?: unknown };
    }>(mantineBarChartMock);
    expect(props.yAxisProps?.domain).toBeUndefined();
    expect(props.yAxisProps?.ticks).toBeUndefined();
    expect(props.xAxisProps?.height).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/ui/viz/SeriesRenderer.props.test.tsx -t "axis scale and rotation"`
Expected: FAIL — `yAxisProps.domain` is `undefined` because `BarChart` never computes an extent.

- [ ] **Step 3: Wire `BarChart`**

In `src/lib/ui/viz/BarChart.tsx`, add these imports:

```ts
import { computeValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";
import { toExtentSeries } from "@/lib/ui/viz/axis/toExtentSeries/toExtentSeries";
import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles";
```

Move the `allBars` check above the memos (it is a plain expression, not a hook, so it can move freely), then add the extent and tick label memos and update the `applyChartStyle` call:

```ts
  const allBars = series.every(propEq("renderAs", "bar"));

  const yExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.yAxis)) {
      return undefined;
    }
    // Percent layout sets Recharts `stackOffset: "expand"`, which
    // normalizes each column to sum to 1 and only formats the ticks as
    // percentages. The real domain is 0 to 1.
    if (allBars && layout === "percent") {
      return { min: 0, max: 1 };
    }
    // The composite renderer always groups, so a layout-implied stack
    // only applies when every series really is a bar.
    const layoutStacks = allBars && layout === "stack";
    return computeValueExtent(
      data,
      toExtentSeries(
        series.map((s) => {
          // `stackId` only exists on bar series, and `series` is a union.
          return { key: s.key, stackId: "stackId" in s ? s.stackId : undefined };
        }),
        layoutStacks ? "stack" : undefined,
      ),
    );
  }, [data, series, layout, allBars, chartStyle?.yAxis]);

  const xTickLabels = useMemo(() => {
    if (chartStyle?.xAxis?.tickAngle === undefined) {
      return undefined;
    }
    const format = baseXAxisProps.tickFormatter;
    return data.map((row) => {
      const value = row[xAxisKey];
      // `baseXAxisProps.tickFormatter` is locally typed as
      // `(value: unknown) => string` — one parameter, no cast needed.
      return format !== undefined ? format(value) : String(value ?? "");
    });
  }, [data, xAxisKey, baseXAxisProps, chartStyle?.xAxis?.tickAngle]);

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      baseXAxisProps,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("bar"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);
```

Delete the now-duplicated `const allBars = ...` line further down the file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/ui/viz/SeriesRenderer.props.test.tsx`
Expected: PASS, including every pre-existing test.

- [ ] **Step 5: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/BarChart.tsx src/lib/ui/viz/SeriesRenderer.props.test.tsx
git commit -m "feat(viz): wire axis scale and rotation into BarChart"
```

---

## Task 8: Wire `LineChart`

Line charts never stack, so every series is its own bucket.

**Files:**
- Modify: `src/lib/ui/viz/LineChart.tsx`
- Test: `src/lib/ui/viz/SeriesRenderer.props.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/ui/viz/SeriesRenderer.props.test.tsx`:

```ts
describe("LineChart — axis scale and rotation", () => {
  it("passes an explicit Y domain and generated ticks", () => {
    renderLine({
      ...LINE_BASELINE,
      chartStyle: { yAxis: { min: 0, max: 10, tickInterval: 5 } },
    });
    const props = lastProps<{
      yAxisProps?: { domain?: unknown; ticks?: number[] };
    }>(mantineLineChartMock);
    expect(props.yAxisProps?.domain).toEqual([0, 10]);
    expect(props.yAxisProps?.ticks).toEqual([0, 5, 10]);
  });

  it("never stacks when deriving the Y extent", () => {
    renderLine({
      ...LINE_BASELINE,
      series: [
        { renderAs: "line", key: "v" },
        { renderAs: "line", key: "w" },
      ],
      chartStyle: { yAxis: { tickInterval: 1 } },
    });
    // Largest single value is 5, not the row sum of 6.
    const props = lastProps<{ yAxisProps?: { domain?: unknown } }>(
      mantineLineChartMock,
    );
    expect(props.yAxisProps?.domain).toEqual([0, 5]);
  });

  it("rotates X tick labels", () => {
    renderLine({
      ...LINE_BASELINE,
      chartStyle: { xAxis: { tickAngle: 45 } },
    });
    const props = lastProps<{
      xAxisProps?: { tick?: { angle?: number; textAnchor?: string } };
    }>(mantineLineChartMock);
    expect(props.xAxisProps?.tick?.angle).toBe(45);
    expect(props.xAxisProps?.tick?.textAnchor).toBe("start");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/ui/viz/SeriesRenderer.props.test.tsx -t "LineChart — axis scale"`
Expected: FAIL — no domain is passed.

- [ ] **Step 3: Wire `LineChart`**

In `src/lib/ui/viz/LineChart.tsx`, add the same three imports as Task 7, then insert before the existing `styleProps` memo and replace that memo:

```ts
  const yExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.yAxis)) {
      return undefined;
    }
    return computeValueExtent(
      data,
      series.map((s) => {
        return { key: s.key };
      }),
    );
  }, [data, series, chartStyle?.yAxis]);

  const xTickLabels = useMemo(() => {
    if (chartStyle?.xAxis?.tickAngle === undefined) {
      return undefined;
    }
    const format = baseXAxisProps.tickFormatter;
    return data.map((row) => {
      const value = row[xAxisKey];
      // `baseXAxisProps.tickFormatter` is locally typed as
      // `(value: unknown) => string` — one parameter, no cast needed.
      return format !== undefined ? format(value) : String(value ?? "");
    });
  }, [data, xAxisKey, baseXAxisProps, chartStyle?.xAxis?.tickAngle]);

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      baseXAxisProps,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("line"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/ui/viz/SeriesRenderer.props.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/LineChart.tsx src/lib/ui/viz/SeriesRenderer.props.test.tsx
git commit -m "feat(viz): wire axis scale and rotation into LineChart"
```

---

## Task 9: Wire `AreaChart`

Area's four layouts map to buckets as follows. `default` overlaps, so each series stands alone. `stacked` and `split` both set one shared `stackId` of `"1"` on every `<Area>` (`split` adds `stackOffset: "sign"`, which stacks positives upward and negatives downward — exactly what `computeValueExtent` already does within a bucket). `percent` sets `stackOffset: "expand"`, normalizing to 0 to 1.

**This task carries two commits.** The first is a behaviour-preserving refactor; the second is the Area wiring.

### Commit 1: extract `useXTickLabels`

`BarChart` and `LineChart` now carry a byte-identical tick-label memo, and Area needs the same one, so this is the third instance and the point to factor it out. Create `src/lib/ui/viz/axis/useXTickLabels/useXTickLabels.ts`:

```ts
import { useMemo } from "react";
import type { UnknownDataFrame } from "@avandar/utils";

/**
 * The formatted X tick label strings, or `undefined` when the axis is
 * not rotated.
 *
 * Only a rotated axis needs these: `resolveTickRotation` sizes the axis
 * from the longest label, and measuring real text would mean rendering
 * it first. Returning `undefined` when `tickAngle` is unset keeps an
 * unrotated chart from scanning its data at all.
 *
 * The labels must be the *formatted* strings, not the raw cell values —
 * a date axis is drawn as `2014-01-01`, so sizing it against a raw
 * epoch number would overshoot badly.
 */
export function useXTickLabels(
  data: UnknownDataFrame,
  xAxisKey: string,
  tickAngle: number | undefined,
  tickFormatter: ((value: unknown) => string) | undefined,
): readonly string[] | undefined {
  return useMemo(() => {
    if (tickAngle === undefined) {
      return undefined;
    }
    return data.map((row) => {
      const value = row[xAxisKey];
      return tickFormatter !== undefined ?
          tickFormatter(value)
        : String(value ?? "");
    });
  }, [data, xAxisKey, tickAngle, tickFormatter]);
}
```

Then replace the inline memo in `BarChart.tsx` and `LineChart.tsx` with:

```ts
  const xTickLabels = useXTickLabels(
    data,
    xAxisKey,
    chartStyle?.xAxis?.tickAngle,
    baseXAxisProps.tickFormatter,
  );
```

Note this narrows the dependency from the whole `baseXAxisProps` object to just its `tickFormatter`, which is a small improvement. `SeriesRenderer.props.test.tsx` must stay green and unedited — it is the proof this refactor changed nothing. Commit as `refactor(viz): extract useXTickLabels from the chart wrappers`.

### Commit 2: wire `AreaChart`

**On testing.** `AreaChart` renders Recharts primitives directly, and the header comment in `SeriesRenderer.props.test.tsx` documents it as deliberately exempt from the prop-mock pattern. Do not try to mock Recharts' `XAxis`/`YAxis`: Recharts reads axis children as declarative config via `findAllByType` rather than rendering them as ordinary components, and `ResponsiveContainer` collapses to zero size under jsdom, so a spy component is not reliably invoked. No test in this repo mocks Recharts today and this task is not the place to pioneer it.

Instead the logic is already covered: the layout-to-bucket rule is unit-tested through `toExtentSeries` and the map added below, `resolveAxisScale` and `resolveTickRotation` are unit-tested directly, and `applyChartStyle` is unit-tested. What remains is a two-line spread that is visible in review and confirmed by the manual verification section at the end of this plan.

**Files:**
- Modify: `src/lib/ui/viz/AreaChart.tsx`
- Create: `src/lib/ui/viz/axis/getAreaStacking/getAreaStacking.ts`
- Test: `src/lib/ui/viz/axis/getAreaStacking/getAreaStacking.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui/viz/axis/getAreaStacking/getAreaStacking.test.ts`:

```ts
/**
 * Area's layout-to-stacking rule, which drives the value extent. Kept
 * as a pure unit test because `AreaChart` renders Recharts primitives
 * directly and is documented as exempt from the renderer prop-mock
 * pattern in `SeriesRenderer.props.test.tsx`.
 */
import { describe, expect, it } from "vitest";
import { getAreaStacking } from "@/lib/ui/viz/axis/getAreaStacking/getAreaStacking";

describe("getAreaStacking", () => {
  it("keeps series independent in the default layout", () => {
    expect(getAreaStacking("default")).toEqual({
      isPercent: false,
      sharedStackId: undefined,
    });
  });

  it("shares one stack when stacked", () => {
    expect(getAreaStacking("stacked")).toEqual({
      isPercent: false,
      sharedStackId: "1",
    });
  });

  it("treats split as stacked, because it stacks by sign", () => {
    expect(getAreaStacking("split")).toEqual({
      isPercent: false,
      sharedStackId: "1",
    });
  });

  it("flags percent, which Recharts normalizes to a 0-to-1 domain", () => {
    expect(getAreaStacking("percent")).toEqual({
      isPercent: true,
      sharedStackId: "1",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/axis/getAreaStacking/getAreaStacking.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Wire `AreaChart`**

First create the stacking helper as its own module, `src/lib/ui/viz/axis/getAreaStacking/getAreaStacking.ts`. It does not live in `AreaChart.tsx`: exporting a helper from a component file purely so a test can reach it is a smell, and adding an `AreaChart.*.test.ts` sibling would force `AreaChart.tsx` into its own directory under the same-base-name rule. As its own module it sits beside the five other axis modules and is testable in isolation:

```ts
/**
 * The single stack id every area shares when its layout stacks. Named
 * so the extent calculation and the `<Area>` element cannot drift.
 */
export const AREA_STACK_ID = "1";

/** The area chart's four layout modes. */
export type AreaLayout = "default" | "stacked" | "percent" | "split";

/** How an area layout stacks, as far as the value extent is concerned. */
export type AreaStacking = {
  isPercent: boolean;
  sharedStackId: string | undefined;
};

/**
 * How an area layout stacks, for extent purposes.
 *
 * `split` counts as stacked: it sets `stackOffset: "sign"`, which stacks
 * positives upward and negatives downward, and `computeValueExtent`
 * already sums the two signs separately within a bucket. `percent` sets
 * `stackOffset: "expand"`, which normalizes each column to sum to 1 and
 * only formats the ticks as percentages, so its real domain is 0 to 1
 * rather than 0 to 100.
 */
export function getAreaStacking(layout: AreaLayout): AreaStacking {
  return {
    isPercent: layout === "percent",
    sharedStackId: layout === "default" ? undefined : AREA_STACK_ID,
  };
}
```

Then in `src/lib/ui/viz/AreaChart.tsx`, add the same four imports as Task 7 plus `getAreaStacking` and `AREA_STACK_ID`, and replace the bare `"1"` in the `<Area>` element with the constant:

Update the `<Area>` element further down to use the constant, replacing `stackId={isStacked ? "1" : undefined}`:

```tsx
                  stackId={isStacked ? AREA_STACK_ID : undefined}
```

Then add the memos and update the `styleProps` memo. `allAreas` and `tickFormatter` both move above them: `allAreas` is a plain expression and `tickFormatter` is a `useMemo` currently declared below `styleProps`, so it must move up for the reference to resolve.

```ts
  const allAreas = series.every(propEq("renderAs", "area"));

  const yExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.yAxis)) {
      return undefined;
    }
    const { isPercent, sharedStackId } = getAreaStacking(layout);
    if (allAreas && isPercent) {
      return { min: 0, max: 1 };
    }
    return computeValueExtent(
      data,
      // The composite renderer always groups, so a layout-implied stack
      // only applies when every series really is an area.
      toExtentSeries(
        series.map((s) => {
          return { key: s.key };
        }),
        allAreas ? sharedStackId : undefined,
      ),
    );
  }, [data, series, layout, allAreas, chartStyle?.yAxis]);

  const xTickLabels = useXTickLabels(
    data,
    xAxisKey,
    chartStyle?.xAxis?.tickAngle,
    tickFormatter,
  );

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      baseXAxisProps,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("area"),
    });
  }, [chartStyle, baseXAxisProps, yExtent, xTickLabels]);
```

Delete the now-duplicated `const allAreas = ...` line further down the file.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/ui/viz/axis/getAreaStacking/getAreaStacking.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Confirm nothing else regressed**

Run: `pnpm vitest run src/lib/ui/viz`
Expected: PASS. `AreaChart` has no renderer-level test, so this is checking that the shared modules it now imports did not break the charts that do.

- [ ] **Step 6: Commit**

```bash
pnpm type-check
git add src/lib/ui/viz/AreaChart.tsx src/lib/ui/viz/axis/getAreaStacking
git commit -m "feat(viz): wire axis scale and rotation into AreaChart"
```

---

## Task 10: Give scatter and bubble a `chartStyle`

Config types, container threading, and renderer wiring. Both axes are value axes here, so all four settings apply to both.

**On testing.** `ScatterChart` uses Mantine's wrapper, so it takes the proven prop-mock pattern. `BubbleChart` renders Recharts primitives directly, exactly like `AreaChart`, so it gets the same treatment as Task 9: no Recharts mocking, correctness carried by the unit-tested `computeValueExtent`, `resolveAxisScale`, `resolveTickRotation`, and `applyChartStyle`, plus the manual verification at the end of this plan.

**Files:**
- Modify: `shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts`
- Modify: `shared/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts`
- Modify: `shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfigs.ts`
- Modify: `shared/models/vizs/BubbleChartVizConfig/BubbleChartVizConfigs.ts`
- Modify: `src/lib/ui/viz/ScatterChart.tsx`, `src/lib/ui/viz/BubbleChart.tsx`
- Modify: `src/components/VisualizationContainer/VisualizationContainer.tsx`
- Test: `src/lib/ui/viz/SeriesRenderer.props.test.tsx` (extend)

- [ ] **Step 1: Write the failing tests**

Extend `src/lib/ui/viz/SeriesRenderer.props.test.tsx`. It is already the home for "a chartStyle setting reaches the chart's props" assertions for bar and line, and scatter is Mantine-wrapped exactly like them, so the scatter cases belong there rather than in a new `ScatterChart.*.test.tsx` (which would drag `ScatterChart.tsx` into its own directory under the same-base-name rule).

Three edits to that file, in place:

**(a)** Add the scatter spy beside the existing mock declarations:

```ts
const mantineScatterChartMock = vi.fn();
```

**(b)** Add one entry to the **existing** `vi.mock("@mantine/charts", ...)` factory — do not create a second `vi.mock` call for the same module, which would override the first:

```ts
    ScatterChart: (props: unknown) => {
      mantineScatterChartMock(props);
      return <div data-testid="mantine-scatter" />;
    },
```

and clear it in the existing `beforeEach`:

```ts
  mantineScatterChartMock.mockClear();
```

**(c)** Append the render helper and the describe block. Note these reuse the file's existing `DATA` fixture (`[{x:"a",v:1,w:5},{x:"b",v:2,w:4},{x:"c",v:3,w:3}]`) via its two numeric columns, so `v` runs 1-to-3 on X and `w` runs 3-to-5 on Y:

```tsx
function renderScatter(chartStyle?: ChartStyle): void {
  render(
    <AvandarAppProvider>
      <ScatterChart
        data={DATA}
        series={[{ key: "w", xKey: "v" }]}
        chartStyle={chartStyle}
      />
    </AvandarAppProvider>,
  );
}

describe("ScatterChart — both axes are value axes", () => {
  it("bounds the X axis", () => {
    renderScatter({ xAxis: { min: 0, max: 4, tickInterval: 1 } });
    const props = lastProps<{
      xAxisProps?: { domain?: unknown; ticks?: number[] };
    }>(mantineScatterChartMock);
    expect(props.xAxisProps?.domain).toEqual([0, 4]);
    expect(props.xAxisProps?.ticks).toEqual([0, 1, 2, 3, 4]);
  });

  it("bounds the Y axis", () => {
    renderScatter({ yAxis: { min: 0, max: 40, tickInterval: 20 } });
    const props = lastProps<{ yAxisProps?: { ticks?: number[] } }>(
      mantineScatterChartMock,
    );
    expect(props.yAxisProps?.ticks).toEqual([0, 20, 40]);
  });

  it("derives the X extent from the xKey column, not the Y column", () => {
    renderScatter({ xAxis: { tickInterval: 1 } });
    const props = lastProps<{ xAxisProps?: { domain?: unknown } }>(
      mantineScatterChartMock,
    );
    // `v` runs 1 to 3, so the derived domain is 0 to 3. Reading `w`
    // instead would give 0 to 5, which is what this case rules out.
    expect(props.xAxisProps?.domain).toEqual([0, 3]);
  });

  it("prefers a configured axis label over the derived column name", () => {
    renderScatter({ xAxis: { label: "Spend" } });
    const props = lastProps<{
      xAxisProps?: { label?: { value?: string } };
    }>(mantineScatterChartMock);
    expect(props.xAxisProps?.label?.value).toBe("Spend");
  });

  it("still derives the axis label from the column when unset", () => {
    renderScatter(undefined);
    const props = lastProps<{
      xAxisProps?: { label?: { value?: string } };
    }>(mantineScatterChartMock);
    expect(props.xAxisProps?.label?.value).toBe("v");
  });

  it("rotates X tick labels", () => {
    renderScatter({ xAxis: { tickAngle: -90 } });
    const props = lastProps<{
      xAxisProps?: { tick?: { angle?: number }; interval?: number };
    }>(mantineScatterChartMock);
    expect(props.xAxisProps?.tick?.angle).toBe(-90);
    expect(props.xAxisProps?.interval).toBe(0);
  });

  it("adds no domain or ticks when nothing is configured", () => {
    renderScatter(undefined);
    const props = lastProps<{
      xAxisProps?: { domain?: unknown; ticks?: unknown };
    }>(mantineScatterChartMock);
    expect(props.xAxisProps?.domain).toBeUndefined();
    expect(props.xAxisProps?.ticks).toBeUndefined();
  });
});
```

Add a `ChartStyle` type import to the file if it does not already have one.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/ui/viz/SeriesRenderer.props.test.tsx`
Expected: FAIL — `ScatterChart` does not accept a `chartStyle` prop.

- [ ] **Step 3: Add `chartStyle` to both config types**

`shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types.ts`:

```ts
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig.ts";

/** Viz config for a multi-series scatter plot. */
export type ScatterPlotVizConfig = {
  vizType: "scatter";
  /** One entry per independent (X, Y) cloud of points. */
  series: ScatterSeries[];
  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
```

`shared/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types.ts`:

```ts
import type { BubbleSeries } from "$/models/vizs/SeriesConfig.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";

/** Viz config for a multi-series bubble chart. */
export type BubbleChartVizConfig = {
  vizType: "bubble";
  /** One entry per independent (X, Y, size) cloud of bubbles. */
  series: BubbleSeries[];
  /** Canvas-level styling (axes, grid, legend position). */
  chartStyle?: ChartStyle;
};
```

- [ ] **Step 4: Carry `chartStyle` through `convertVizConfig`**

Axis styling should survive a chart-type switch. In `ScatterPlotVizConfigs.ts`, destructure `chartStyle` alongside the existing locals in `convertVizConfig`:

```ts
    const firstSeries = vizConfig.series[0];
    const xAxisKey = firstSeries?.xKey;
    const yAxisKey = firstSeries?.key;
    const { chartStyle } = vizConfig;
```

Then add `chartStyle` to each branch whose target config accepts it, which is bar, line, area, radar, and bubble. Table, pie, and funnel have no `chartStyle` field and stay untouched:

```ts
      .with("bar", (vizType): BarChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("bar"),
          layout: "group",
          withLegend: true,
          chartStyle,
        };
      })
      .with("line", (vizType): LineChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("line"),
          withLegend: true,
          chartStyle,
        };
      })
      .with("area", (vizType): AreaChartVizConfig => {
        return {
          vizType,
          xAxisKey,
          series: xySeries("area"),
          layout: "default",
          withLegend: true,
          chartStyle,
        };
      })
```

and in the radar and bubble branches:

```ts
      .with("radar", (vizType): RadarChartVizConfig => {
        const radarSeries: RadarSeries[] =
          yAxisKey === undefined ? [] : [{ key: yAxisKey }];
        return {
          vizType,
          nameKey: xAxisKey,
          series: radarSeries,
          withLegend: true,
          chartStyle,
        };
      })
      .with("bubble", (vizType): BubbleChartVizConfig => {
        const bubbleSeries: BubbleSeries[] = vizConfig.series.map((s) => {
          return {
            xKey: s.xKey,
            key: s.key,
            sizeKey: s.key,
            label: s.label,
            color: s.color,
          };
        });
        return { vizType, series: bubbleSeries, chartStyle };
      })
```

In `BubbleChartVizConfigs.ts`, make the same `const { chartStyle } = vizConfig;` addition and add `chartStyle` to its bar, line, area, and radar branches with the identical shape shown above, plus its scatter branch:

```ts
      .with("scatter", (vizType): ScatterPlotVizConfig => {
        // Drop sizeKey; keep xKey and key
        const scatterSeries: ScatterSeries[] = vizConfig.series.map((s) => {
          return { xKey: s.xKey, key: s.key, label: s.label, color: s.color };
        });
        return { vizType, series: scatterSeries, chartStyle };
      })
```

Each file's self-conversion branch (`.with("scatter", () => vizConfig)` in the scatter module, `.with("bubble", () => vizConfig)` in the bubble module) already returns the whole config, so it carries `chartStyle` with no change.

While you are here, add `chartStyle` to the scatter and bubble branches of the **other** modules' `convertVizConfig` implementations too, so styling survives in both directions. Those branches live in `BarChartVizConfigs.ts`, `LineChartVizConfigs.ts`, `AreaChartVizConfigs.ts`, and `RadarChartVizConfigs.ts`, and each builds a `{ vizType, series }` object that now also takes `chartStyle`. `pnpm type-check` will not catch a miss here because `chartStyle` is optional, so grep for `"scatter"` and `"bubble"` across `shared/models/vizs/*/​*VizConfigs.ts` and check each hit.

- [ ] **Step 5: Wire `ScatterChart`**

In `src/lib/ui/viz/ScatterChart.tsx`, add `chartStyle?: ChartStyle` to `Props`, add the imports from Task 7 plus `applyChartStyle`, and replace the axis prop construction:

```ts
  const xExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.xAxis)) {
      return undefined;
    }
    return computeValueExtent(
      data,
      series.map((s) => {
        return { key: s.xKey };
      }),
    );
  }, [data, series, chartStyle?.xAxis]);

  const yExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.yAxis)) {
      return undefined;
    }
    return computeValueExtent(
      data,
      series.map((s) => {
        return { key: s.key };
      }),
    );
  }, [data, series, chartStyle?.yAxis]);

  const xTickLabels = useMemo(() => {
    if (chartStyle?.xAxis?.tickAngle === undefined) {
      return undefined;
    }
    return scatterSeries.flatMap((s) => {
      return s.data.map((point) => {
        return formatChartNumber(point.x);
      });
    });
  }, [scatterSeries, chartStyle?.xAxis?.tickAngle]);

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      xExtent,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("scatter"),
    });
  }, [chartStyle, xExtent, yExtent, xTickLabels]);
```

Then let a configured label win over the derived one. Replace the existing `xLabel` / `yLabel` declarations:

```ts
  const isSingleSeries = series.length === 1;
  const firstSeries = series[0];
  const derivedXLabel =
    isSingleSeries && firstSeries !== undefined ? firstSeries.xKey : undefined;
  const derivedYLabel =
    isSingleSeries && firstSeries !== undefined ? firstSeries.key : undefined;
  const xLabel = chartStyle?.xAxis?.label ?? derivedXLabel;
  const yLabel = chartStyle?.yAxis?.label ?? derivedYLabel;
```

Then replace the whole `<MantineScatterChart>` element. `styleProps` spreads first so the label objects layer on top of `styleProps.xAxisProps` / `styleProps.yAxisProps` rather than replacing them. Mantine's `ScatterChart` accepts the full `ChartStyleProps` surface (`withXAxis`, `withYAxis`, `xAxisProps`, `yAxisProps`, `gridProps`, `gridColor`, `legendProps`, `xAxisLabel`, `yAxisLabel`, `styles`), so spreading `styleProps` is safe:

```tsx
    <MantineScatterChart
      h={height}
      data={scatterSeries}
      dataKey={{ x: "x", y: "y" }}
      withLegend
      valueFormatter={formatChartNumber}
      {...styleProps}
      xAxisProps={{
        ...styleProps.xAxisProps,
        ...(xLabel !== undefined ?
          {
            label: {
              value: xLabel,
              position: "insideBottom",
              offset: -15,
              fontSize: 12,
            },
          }
        : {}),
      }}
      yAxisProps={{
        ...styleProps.yAxisProps,
        ...(yLabel !== undefined ?
          {
            width: 80,
            label: {
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: -15,
              fontSize: 12,
            },
          }
        : {}),
      }}
      scatterChartProps={
        xLabel !== undefined || yLabel !== undefined ?
          {
            margin: {
              bottom: xLabel !== undefined ? 40 : undefined,
              left: yLabel !== undefined ? 30 : undefined,
              right: yLabel !== undefined ? 5 : undefined,
            },
          }
        : undefined
      }
    />
```

- [ ] **Step 6: Wire `BubbleChart`**

In `src/lib/ui/viz/BubbleChart.tsx`, add `chartStyle?: ChartStyle` to `Props`, destructure it in the component signature, and add the same imports as Step 5. Its `seriesData` memo already builds `{ x, y, z }` point arrays from `xKey` / `key` / `sizeKey`, so the extents read the same columns scatter's do:

```ts
  const xExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.xAxis)) {
      return undefined;
    }
    return computeValueExtent(
      data,
      series.map((s) => {
        return { key: s.xKey };
      }),
    );
  }, [data, series, chartStyle?.xAxis]);

  const yExtent = useMemo(() => {
    if (!needsValueExtent(chartStyle?.yAxis)) {
      return undefined;
    }
    return computeValueExtent(
      data,
      series.map((s) => {
        return { key: s.key };
      }),
    );
  }, [data, series, chartStyle?.yAxis]);

  const xTickLabels = useMemo(() => {
    if (chartStyle?.xAxis?.tickAngle === undefined) {
      return undefined;
    }
    return seriesData.flatMap((entry) => {
      return entry.points.map((point) => {
        return formatChartNumber(point.x, { compact: true });
      });
    });
  }, [seriesData, chartStyle?.xAxis?.tickAngle]);

  const styleProps = useMemo(() => {
    return applyChartStyle(chartStyle, {
      xExtent,
      yExtent,
      xTickLabels,
      axisRoles: getAxisRoles("bubble"),
    });
  }, [chartStyle, xExtent, yExtent, xTickLabels]);
```

Spread the resolved props onto its hand-rolled axes, keeping the existing compact formatters as defaults so `styleProps` can override them:

```tsx
<XAxis
  dataKey="x"
  type="number"
  name="x"
  tickFormatter={(value) => {
    return formatChartNumber(value, { compact: true });
  }}
  {...styleProps.xAxisProps}
/>
<YAxis
  dataKey="y"
  type="number"
  name="y"
  width={64}
  tickFormatter={(value) => {
    return formatChartNumber(value, { compact: true });
  }}
  {...styleProps.yAxisProps}
/>
```

Note that `styleProps.yAxisProps` carries a `tickFormatter` and a `width` of its own, so spreading it replaces both. That is the same behavior the other Recharts-direct wrapper (`AreaChart`) already has.

- [ ] **Step 7: Pass `chartStyle` from the container**

In `src/components/VisualizationContainer/VisualizationContainer.tsx`, add `chartStyle={config.chartStyle}` to the `<ScatterChart>` and `<BubbleChart>` elements in the `scatter` and `bubble` match branches, matching the `bar` branch at line 161.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/ui/viz/SeriesRenderer.props.test.tsx`
Expected: PASS, 7 tests.

Then confirm nothing regressed across the whole viz folder:

Run: `pnpm vitest run src/lib/ui/viz`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
pnpm type-check
git add shared/models/vizs/ScatterPlotVizConfig shared/models/vizs/BubbleChartVizConfig src/lib/ui/viz/ScatterChart.tsx src/lib/ui/viz/BubbleChart.tsx src/lib/ui/viz/SeriesRenderer.props.test.tsx src/components/VisualizationContainer/VisualizationContainer.tsx
git commit -m "feat(viz): add axis styling to scatter and bubble charts"
```

---

## Task 11: `makeAxisDescriptors` factory

Bar, line, and area currently repeat near-identical eight-descriptor axis blocks. This replaces them with one factory and adds the new settings in a single place.

**Files:**
- Create: `shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts`
- Test: `shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.test.ts`
- Modify: `shared/models/vizs/BarChartVizConfig/BarChartVizConfigs.ts`
- Modify: `shared/models/vizs/LineChartVizConfig/LineChartVizConfigs.ts`
- Modify: `shared/models/vizs/AreaChartVizConfig/AreaChartVizConfigs.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.test.ts`:

```ts
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import { describe, expect, it } from "vitest";

function keysOf(
  descriptors: ReadonlyArray<{ key: string }>,
): readonly string[] {
  return descriptors.map((d) => {
    return d.key;
  });
}

describe("makeAxisDescriptors", () => {
  it("emits only cosmetic settings for a category axis", () => {
    expect(keysOf(makeAxisDescriptors("xAxis", "category"))).toEqual([
      "chartStyle.xAxis.label",
      "chartStyle.xAxis.labelColor",
      "chartStyle.xAxis.tickColor",
      "chartStyle.xAxis.hide",
    ]);
  });

  it("adds the scale settings for a value axis", () => {
    expect(keysOf(makeAxisDescriptors("yAxis", "value"))).toEqual([
      "chartStyle.yAxis.label",
      "chartStyle.yAxis.labelColor",
      "chartStyle.yAxis.tickColor",
      "chartStyle.yAxis.hide",
      "chartStyle.yAxis.min",
      "chartStyle.yAxis.max",
      "chartStyle.yAxis.tickInterval",
    ]);
  });

  it("appends rotation last when requested", () => {
    const keys = keysOf(
      makeAxisDescriptors("xAxis", "category", { rotation: true }),
    );
    expect(keys.at(-1)).toBe("chartStyle.xAxis.tickAngle");
  });

  it("groups every descriptor under the axis name", () => {
    makeAxisDescriptors("yAxis", "value").forEach((descriptor) => {
      expect(descriptor.group).toBe("Y axis");
    });
    makeAxisDescriptors("xAxis", "category").forEach((descriptor) => {
      expect(descriptor.group).toBe("X axis");
    });
  });

  it("bounds the rotation control to a half turn", () => {
    const rotation = makeAxisDescriptors("xAxis", "category", {
      rotation: true,
    }).at(-1);
    expect(rotation?.control).toMatchObject({ kind: "number", min: -90, max: 90 });
  });
});

describe("descriptor registries keep their existing field order", () => {
  it("bar still leads with layout, legend, then the axes and grid", () => {
    expect(keysOf(VizConfigs.getDescriptors("bar").chart)).toEqual([
      "layout",
      "withLegend",
      "chartStyle.legend.position",
      "chartStyle.xAxis.label",
      "chartStyle.xAxis.labelColor",
      "chartStyle.xAxis.tickColor",
      "chartStyle.xAxis.hide",
      "chartStyle.xAxis.tickAngle",
      "chartStyle.yAxis.label",
      "chartStyle.yAxis.labelColor",
      "chartStyle.yAxis.tickColor",
      "chartStyle.yAxis.hide",
      "chartStyle.yAxis.min",
      "chartStyle.yAxis.max",
      "chartStyle.yAxis.tickInterval",
      "chartStyle.grid.color",
      "chartStyle.grid.horizontal",
      "chartStyle.grid.vertical",
    ]);
  });

  it("line has the same shape without a layout setting", () => {
    const keys = keysOf(VizConfigs.getDescriptors("line").chart);
    expect(keys).not.toContain("layout");
    expect(keys).toContain("chartStyle.xAxis.tickAngle");
    expect(keys).toContain("chartStyle.yAxis.tickInterval");
  });

  it("area keeps its layout setting and gains the axis settings", () => {
    const keys = keysOf(VizConfigs.getDescriptors("area").chart);
    expect(keys).toContain("layout");
    expect(keys).toContain("chartStyle.xAxis.tickAngle");
    expect(keys).toContain("chartStyle.yAxis.min");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

Create `shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts`:

```ts
import type { AxisRole } from "$/models/vizs/getAxisRoles/getAxisRoles.ts";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types.ts";
import type { ChartSettingDescriptor } from "$/models/vizs/SettingDescriptor.ts";

/** Which axis of `chartStyle` the descriptors address. */
export type AxisKey = "xAxis" | "yAxis";

export type MakeAxisDescriptorsOptions = {
  /**
   * Include the tick label rotation control. Only the X axis offers it:
   * rotating Y tick labels is a capability nobody asks for and would
   * need a different layout lever.
   */
  rotation?: boolean;
};

const AXIS_GROUP: Record<AxisKey, string> = {
  xAxis: "X axis",
  yAxis: "Y axis",
};

const AXIS_NOUN: Record<AxisKey, string> = {
  xAxis: "X axis",
  yAxis: "Y axis",
};

/**
 * The chart-level descriptors for one axis.
 *
 * Every axis gets the cosmetic settings. A `value` axis additionally
 * gets minimum, maximum, and tick interval, which have no meaning on a
 * category scale. Rotation is opt-in via `options.rotation`.
 *
 * Bar, line, area, scatter, and bubble all call this instead of
 * repeating the same literals, so a new axis setting is added once.
 *
 * The `TConfig` cast is safe because every caller's config carries an
 * optional `chartStyle`, which is exactly the shape these dotted paths
 * address; `Paths<TConfig>` cannot be computed generically here.
 */
export function makeAxisDescriptors<
  TConfig extends { chartStyle?: ChartStyle },
>(
  axis: AxisKey,
  role: AxisRole,
  options: MakeAxisDescriptorsOptions = {},
): ReadonlyArray<ChartSettingDescriptor<TConfig>> {
  const group = AXIS_GROUP[axis];
  const noun = AXIS_NOUN[axis];

  const descriptors = [
    {
      key: `chartStyle.${axis}.label`,
      label: `${noun} label`,
      group,
      control: { kind: "text" },
    },
    {
      key: `chartStyle.${axis}.labelColor`,
      label: `${noun} label color`,
      group,
      control: { kind: "color" },
    },
    {
      key: `chartStyle.${axis}.tickColor`,
      label: `${noun} tick color`,
      group,
      control: { kind: "color" },
    },
    {
      key: `chartStyle.${axis}.hide`,
      label: `Hide ${noun}`,
      group,
      control: { kind: "switch" },
    },
    ...(role === "value" ?
      [
        {
          key: `chartStyle.${axis}.min`,
          label: `${noun} minimum`,
          group,
          control: { kind: "number" },
        },
        {
          key: `chartStyle.${axis}.max`,
          label: `${noun} maximum`,
          group,
          control: { kind: "number" },
        },
        {
          key: `chartStyle.${axis}.tickInterval`,
          label: `${noun} tick interval`,
          group,
          control: { kind: "number", min: 0 },
        },
      ]
    : []),
    ...(options.rotation === true ?
      [
        {
          key: `chartStyle.${axis}.tickAngle`,
          label: `${noun} label rotation`,
          group,
          control: { kind: "number", min: -90, max: 90, step: 15, unit: "°" },
        },
      ]
    : []),
  ];

  return descriptors as unknown as ReadonlyArray<
    ChartSettingDescriptor<TConfig>
  >;
}
```

Note the label wording: the existing bar descriptors use `"Hide X axis"` and `"X axis label"`, so these strings match what the form already renders. Do not change them; `SeriesAwareVizForm` merges the X axis group into the axis fieldset by matching the `group` string against its `axisLegend`, which is the translated `"X axis"`.

- [ ] **Step 4: Replace the axis blocks in bar, line, and area**

In `shared/models/vizs/BarChartVizConfig/BarChartVizConfigs.ts`, delete the eight hand-written axis descriptor literals and replace them with two spreads, preserving position (after the legend settings, before the grid settings):

```ts
const descriptors: VizSettingDescriptors<BarChartVizConfig, BarSeries> = {
  chart: [
    {
      key: "layout",
      label: "Bar layout",
      group: "Layout",
      control: { kind: "segmented", options: BAR_LAYOUT_OPTIONS },
    },
    {
      key: "withLegend",
      label: "Show legend",
      group: "Legend",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.legend.position",
      label: "Legend position",
      group: "Legend",
      control: { kind: "segmented", options: LEGEND_POSITION_OPTIONS },
    },
    ...makeAxisDescriptors<BarChartVizConfig>("xAxis", "category", {
      rotation: true,
    }),
    ...makeAxisDescriptors<BarChartVizConfig>("yAxis", "value"),
    {
      key: "chartStyle.grid.color",
      label: "Gridline color",
      group: "Grid",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.grid.horizontal",
      label: "Horizontal gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.grid.vertical",
      label: "Vertical gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
  ],
  series: [
    // unchanged
  ],
};
```

Add the import at the top of the file:

```ts
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
```

`LineChartVizConfigs.ts` has no `layout` setting, so its chart array becomes:

```ts
const descriptors: VizSettingDescriptors<LineChartVizConfig, LineSeries> = {
  chart: [
    {
      key: "withLegend",
      label: "Show legend",
      group: "Legend",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.legend.position",
      label: "Legend position",
      group: "Legend",
      control: { kind: "segmented", options: LEGEND_POSITION_OPTIONS },
    },
    ...makeAxisDescriptors<LineChartVizConfig>("xAxis", "category", {
      rotation: true,
    }),
    ...makeAxisDescriptors<LineChartVizConfig>("yAxis", "value"),
    {
      key: "chartStyle.grid.color",
      label: "Gridline color",
      group: "Grid",
      control: { kind: "color" },
    },
    {
      key: "chartStyle.grid.horizontal",
      label: "Horizontal gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
    {
      key: "chartStyle.grid.vertical",
      label: "Vertical gridlines",
      group: "Grid",
      control: { kind: "switch" },
    },
  ],
  series: [
    // unchanged
  ],
};
```

`AreaChartVizConfigs.ts` matches bar's shape exactly, keeping its own `layout` descriptor (labelled "Area layout" with `AREA_LAYOUT_OPTIONS`) first:

```ts
    ...makeAxisDescriptors<AreaChartVizConfig>("xAxis", "category", {
      rotation: true,
    }),
    ...makeAxisDescriptors<AreaChartVizConfig>("yAxis", "value"),
```

in place of its eight hand-written axis literals, between the legend settings and the grid settings. Do not touch the `series` arrays or the layout option constants in any of the three files.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run shared/models/vizs/makeAxisDescriptors/makeAxisDescriptors.test.ts src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm.descriptors.test.tsx`
Expected: PASS. The `SeriesAwareVizForm.descriptors` suite is data-driven over the registries, so it now exercises every new control automatically. If a new control's label collides with an existing one under `getByLabelText`, rename the new label rather than loosening the matcher.

- [ ] **Step 6: Commit**

```bash
pnpm type-check
git add shared/models/vizs/makeAxisDescriptors shared/models/vizs/BarChartVizConfig shared/models/vizs/LineChartVizConfig shared/models/vizs/AreaChartVizConfig
git commit -m "refactor(viz): generate axis descriptors from a shared factory"
```

---

## Task 12: `ChartSettingsFieldsets` and the scatter/bubble forms

**Files:**
- Create: `src/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/ChartSettingsFieldsets.tsx`
- Move: `src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/readSetting.ts` → `.../ChartSettingsFieldsets/readSetting.ts`
- Modify: `src/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm.tsx`
- Modify: `src/components/VisualizationContainer/VizSettingsForm/ScatterChartForm.tsx`
- Modify: `src/components/VisualizationContainer/VizSettingsForm/BubbleChartForm.tsx`
- Modify: `shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfigs.ts`
- Modify: `shared/models/vizs/BubbleChartVizConfig/BubbleChartVizConfigs.ts`
- Test: `src/components/VisualizationContainer/VizSettingsForm/PairChartForms.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/VisualizationContainer/VizSettingsForm/PairChartForms.test.tsx`:

```ts
/**
 * The scatter and bubble forms keep their hand-coded pair-series
 * editors but render chart-level descriptors through the shared
 * `ChartSettingsFieldsets`. These tests prove the axis settings appear
 * and write back to the config.
 */
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { BubbleChartForm } from "@/components/VisualizationContainer/VizSettingsForm/BubbleChartForm";
import { ScatterChartForm } from "@/components/VisualizationContainer/VizSettingsForm/ScatterChartForm";
import { fireEvent, render, screen } from "@/test-utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BubbleChartVizConfig } from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types";

const COLUMNS: readonly QueryResultColumn[] = [
  { name: "spend", dataType: "double" },
  { name: "revenue", dataType: "double" },
  { name: "weight", dataType: "double" },
];

const scatterConfig: ScatterPlotVizConfig = {
  vizType: "scatter",
  series: [{ key: "revenue", xKey: "spend" }],
};

const bubbleConfig: BubbleChartVizConfig = {
  vizType: "bubble",
  series: [{ key: "revenue", xKey: "spend", sizeKey: "weight" }],
};

describe("ScatterChartForm — axis settings", () => {
  it("renders a minimum control for each value axis", () => {
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={scatterConfig}
          onConfigChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByLabelText(/^X axis minimum$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Y axis minimum$/i)).toBeInTheDocument();
  });

  it("writes the tick interval back to the config", () => {
    const onConfigChange = vi.fn();
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={scatterConfig}
          onConfigChange={onConfigChange}
        />
      </AvandarAppProvider>,
    );
    fireEvent.change(screen.getByLabelText(/^Y axis tick interval$/i), {
      target: { value: "25" },
    });
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        chartStyle: expect.objectContaining({
          yAxis: expect.objectContaining({ tickInterval: 25 }),
        }),
      }),
    );
  });

  it("offers rotation on the X axis only", () => {
    render(
      <AvandarAppProvider>
        <ScatterChartForm
          fields={COLUMNS}
          config={scatterConfig}
          onConfigChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(
      screen.getByLabelText(/^X axis label rotation$/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/^Y axis label rotation$/i),
    ).not.toBeInTheDocument();
  });
});

describe("BubbleChartForm — axis settings", () => {
  it("renders the axis controls", () => {
    render(
      <AvandarAppProvider>
        <BubbleChartForm
          fields={COLUMNS}
          config={bubbleConfig}
          onConfigChange={vi.fn()}
        />
      </AvandarAppProvider>,
    );
    expect(screen.getByLabelText(/^X axis maximum$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Y axis maximum$/i)).toBeInTheDocument();
  });

  it("writes a maximum back to the config", () => {
    const onConfigChange = vi.fn();
    render(
      <AvandarAppProvider>
        <BubbleChartForm
          fields={COLUMNS}
          config={bubbleConfig}
          onConfigChange={onConfigChange}
        />
      </AvandarAppProvider>,
    );
    fireEvent.change(screen.getByLabelText(/^Y axis maximum$/i), {
      target: { value: "500" },
    });
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        chartStyle: expect.objectContaining({
          yAxis: expect.objectContaining({ max: 500 }),
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm/PairChartForms.test.tsx`
Expected: FAIL — no axis controls render; both forms only show series fieldsets.

- [ ] **Step 3: Extract `ChartSettingsFieldsets`**

Move `readSetting.ts` from `SeriesAwareVizForm/` to a new `ChartSettingsFieldsets/` directory unchanged, then create `ChartSettingsFieldsets/ChartSettingsFieldsets.tsx`:

```tsx
import { makeBucketMap } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { useMemo } from "react";
import { readSetting } from "@/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/readSetting";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import type { AnyChartSettingDescriptor } from "$/models/vizs/SettingDescriptor";
import type { ReactNode } from "react";

type Props = {
  /** Chart-level descriptors to render, in registry order. */
  descriptors: readonly AnyChartSettingDescriptor[];
  /** The config the descriptors read their current values from. */
  config: object;
  /** Called with the descriptor's dotted path and the new value. */
  onSettingChange: (path: string, value: unknown) => void;
  /**
   * Groups rendered elsewhere by the caller. `SeriesAwareVizForm`
   * excludes its axis group because it merges those controls into the
   * axis fieldset alongside the column picker.
   */
  excludeGroups?: readonly string[];
};

/**
 * Renders one Mantine `<Fieldset>` per chart-level descriptor group
 * ("Y axis", "Legend", "Grid", …). Shared by the descriptor-driven
 * `SeriesAwareVizForm` and by the hand-coded scatter and bubble forms,
 * which keep their own pair-series editors but delegate chart-level
 * settings here.
 */
export function ChartSettingsFieldsets({
  descriptors,
  config,
  onSettingChange,
  excludeGroups = [],
}: Props): ReactNode {
  const { t } = useLingui();

  const grouped = useMemo(() => {
    return makeBucketMap(descriptors, {
      keyFn: (descriptor) => {
        return descriptor.group ?? "";
      },
    });
  }, [descriptors]);

  const visibleGroups = Array.from(grouped.entries()).filter(([group]) => {
    return !excludeGroups.includes(group);
  });

  return visibleGroups.map(([group, groupDescriptors]) => {
    const legend = group === "" ? t`Chart settings` : group;
    return (
      <Fieldset key={legend} legend={legend}>
        <Stack gap="xs">
          {groupDescriptors.map((descriptor) => {
            return (
              <Control
                key={descriptor.key}
                label={descriptor.label}
                spec={descriptor.control}
                value={readSetting(config, descriptor.key)}
                onChange={(nextValue) => {
                  onSettingChange(descriptor.key, nextValue);
                }}
              />
            );
          })}
        </Stack>
      </Fieldset>
    );
  });
}
```

- [ ] **Step 4: Use it from `SeriesAwareVizForm`**

In `SeriesAwareVizForm.tsx`, update the `readSetting` import path to the new location, delete the `groupedChartDescriptors` / `otherGroupedDescriptors` block and the trailing `otherGroupedDescriptors.map(...)` JSX, and replace that JSX with:

```tsx
      <ChartSettingsFieldsets
        descriptors={chartDescriptors}
        config={config}
        onSettingChange={updateChartPath}
        excludeGroups={[axisLegend]}
      />
```

Keep the axis `<Fieldset>` exactly as it is, but fix a latent i18n bug while you are in here.

**The bug.** `axisLegend` is currently `isRadar ? t\`Category axis\` : t\`X axis\`` — a *translated* string — and it is used for two different jobs: as the display legend on the axis fieldset, and as the key to look up which descriptors belong to the axis group. But `descriptor.group` is the *untranslated* literal `"X axis"` emitted by `makeAxisDescriptors`. So the match only succeeds in English; under any other locale the axis settings fall out of the merged fieldset and appear as a second one. Separate the two jobs:

```ts
  /**
   * The `group` string axis descriptors actually carry. It is an
   * untranslated identifier, not display text — `makeAxisDescriptors`
   * emits it — so the lookup must not go through Lingui or it would
   * only match in English.
   */
  const axisGroupKey = isRadar ? "Category axis" : "X axis";

  /** Display text for the axis fieldset. Translated. */
  const axisLegend = isRadar ? t\`Category axis\` : t\`X axis\`;

  const axisGroupDescriptors = useMemo(() => {
    return chartDescriptors.filter((descriptor) => {
      return descriptor.group === axisGroupKey;
    });
  }, [chartDescriptors, axisGroupKey]);
```

Match on `axisGroupKey`; keep rendering `axisLegend` as the `<Fieldset legend>`. Pass `excludeGroups={[axisGroupKey]}` to `ChartSettingsFieldsets`, not `axisLegend`.

`makeBucketMap` is no longer used in this file, so drop it from the `@avandar/utils` import. `ChartSettingsFieldsets` owns the grouping now.

Note the remaining group legends (`"Y axis"`, `"Legend"`, `"Grid"`, `"Layout"`) are already rendered untranslated today, since the old code used the raw `group` string as the fieldset legend. That is pre-existing and out of scope here — do not start a translation pass for descriptor group names.

- [ ] **Step 5: Give scatter and bubble real descriptors**

In `shared/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfigs.ts`, replace `descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS` with a real registry:

```ts
const descriptors: VizSettingDescriptors<ScatterPlotVizConfig, ScatterSeries> = {
  chart: [
    ...makeAxisDescriptors<ScatterPlotVizConfig>("xAxis", "value", {
      rotation: true,
    }),
    ...makeAxisDescriptors<ScatterPlotVizConfig>("yAxis", "value"),
  ],
  series: [],
};
```

and change the module's field from `descriptors: EMPTY_VIZ_SETTING_DESCRIPTORS` to `descriptors: descriptors as unknown as AnyVizSettingDescriptors`, matching `BarChartVizConfigs`. Drop the now-unused `EMPTY_VIZ_SETTING_DESCRIPTORS` import and add imports for `makeAxisDescriptors`, `ScatterSeries`, and the `AnyVizSettingDescriptors` / `VizSettingDescriptors` types. `series` stays empty because `PairSeriesFieldset` still owns per-series editing.

`BubbleChartVizConfigs.ts` gets the same treatment:

```ts
const descriptors: VizSettingDescriptors<BubbleChartVizConfig, BubbleSeries> = {
  chart: [
    ...makeAxisDescriptors<BubbleChartVizConfig>("xAxis", "value", {
      rotation: true,
    }),
    ...makeAxisDescriptors<BubbleChartVizConfig>("yAxis", "value"),
  ],
  series: [],
};
```

with the same `descriptors: descriptors as unknown as AnyVizSettingDescriptors` field change and the same import adjustments, using `BubbleSeries` instead of `ScatterSeries`.

- [ ] **Step 6: Render the fieldsets in both forms**

`ScatterChartForm.tsx`:

```tsx
export function ScatterChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const updateChartPath = useCallback(
    (path: string, value: unknown) => {
      onConfigChange(
        setValue(config as never, path as never, value as never) as ScatterPlotVizConfig,
      );
    },
    [config, onConfigChange],
  );

  return (
    <Stack gap="sm">
      <PairSeriesFieldset
        fields={fields}
        series={config.series}
        onChange={(next: ScatterSeries[]) => {
          onConfigChange({ ...config, series: next });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={VizConfigs.getDescriptors("scatter").chart}
        config={config}
        onSettingChange={updateChartPath}
      />
    </Stack>
  );
}
```

Import `setValue` from `@avandar/utils`, `useCallback` from `react`, `VizConfigs` from `$/models/vizs/VizConfig/VizConfigs`, and `ChartSettingsFieldsets` from its new path.

`BubbleChartForm.tsx`:

```tsx
export function BubbleChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const updateChartPath = useCallback(
    (path: string, value: unknown) => {
      onConfigChange(
        setValue(
          config as never,
          path as never,
          value as never,
        ) as BubbleChartVizConfig,
      );
    },
    [config, onConfigChange],
  );

  return (
    <Stack gap="sm">
      <BubbleSeriesFieldset
        fields={fields}
        series={config.series}
        onChange={(next: BubbleSeries[]) => {
          onConfigChange({ ...config, series: next });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={VizConfigs.getDescriptors("bubble").chart}
        config={config}
        onSettingChange={updateChartPath}
      />
    </Stack>
  );
}
```

`setValue` creates the intermediate objects a dotted path needs, so writing `chartStyle.yAxis.max` on a config with no `chartStyle` works; that behavior is already relied on by `SeriesAwareVizForm` and is documented at `packages/shared/utils/src/objects/setValue/setValue.ts:61`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm`
Expected: PASS, including the pre-existing `SeriesAwareVizForm`, `VizSettingsForm`, and `PieFunnelChartForm` suites. The `SeriesAwareVizForm` suites are the regression proof that extracting the fieldsets changed nothing.

- [ ] **Step 8: Commit**

```bash
pnpm type-check
git add src/components/VisualizationContainer/VizSettingsForm shared/models/vizs/ScatterPlotVizConfig shared/models/vizs/BubbleChartVizConfig
git commit -m "feat(viz): render axis settings in the scatter and bubble forms"
```

---

## Task 13: Update the inventory doc and run the full suite

**Files:**
- Modify: `docs/dashboards-and-visualizations-inventory.md`

- [ ] **Step 1: Update section 2.2**

Replace the `ChartStyle` bullet list so the axis line reads:

```markdown
  - `xAxis` / `yAxis`: `label`, `labelColor`, `tickColor`, `hide`, plus
    `min`, `max`, `tickInterval` on value axes and `tickAngle` on the X axis
```

and add after the `applyChartStyle` bullet:

```markdown
- Value-axis bounds and tick steps are resolved by three pure modules under
  `src/lib/ui/viz/axis/`: `computeValueExtent` (stacking-aware data range),
  `resolveAxisScale` (bounds and interval to Recharts `domain` / `ticks`), and
  `resolveTickRotation` (angle to `tick`, `interval`, and axis `height`).
  Recharts has no tick-step prop and its nice-number generator would round a
  deliberate step, so exact intervals are expressed as explicit tick arrays.
```

- [ ] **Step 2: Update section 3.3**

Replace the descriptor coverage table:

```markdown
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
```

- [ ] **Step 3: Run the full frontend suite**

Run: `pnpm test:frontend`
Expected: PASS. Investigate any failure before committing; this is the last gate.

- [ ] **Step 4: Lint and type-check**

```bash
pnpm type-check
pnpm lint
```

Expected: both clean. Fix any `react-doctor` or eslint findings in the files this plan touched.

- [ ] **Step 5: Commit**

```bash
git add docs/dashboards-and-visualizations-inventory.md
git commit -m "docs: record axis scale and rotation settings in the viz inventory"
```

---

## Manual verification

Automated tests prove the props reach the Mantine-wrapped charts and prove the math. Area and bubble have no renderer-level test by design, and the rotated-label layout question cannot be answered in jsdom, so these checks are not optional:

- [ ] **Run the app:** `pnpm dev`, open a dashboard, add a bar chart with a date X axis and a dozen or more categories.
- [ ] **Check rotation:** set X axis label rotation to `-90`. Every label should render (not every other one), none should clip at the bottom of the tile, and the axis label, if set, should sit below the rotated ticks rather than through them. If it collides, offset the `<Label>` by the computed height inside `applyChartStyle` and add a case to `applyChartStyle.test.ts`.
- [ ] **Check bounds:** set Y axis minimum `0`, maximum `120000`, tick interval `24000`. Ticks should read 0, 24K, 48K, 72K, 96K, 120K. Then set the maximum below the tallest bar and confirm the bars clip rather than the axis silently widening.
- [ ] **Check the theme:** set a tick color, then toggle light and dark mode. Ticks without an explicit color must still follow the theme, which is the `fill: "currentColor"` fix from Task 6.
- [ ] **Check area, which has no renderer test:** switch the chart to area, set a Y minimum, maximum, and tick interval, and confirm the ticks land where asked. Then switch the area layout to Stacked and confirm the derived domain covers the summed stack rather than the tallest single series. Then switch to 100% stacked and confirm a tick interval of `0.25` gives four bands (its domain is 0 to 1, not 0 to 100).
- [ ] **Check bubble, which has no renderer test:** switch to a bubble chart and confirm both the X and Y axis bounds and tick intervals apply, since bubble is the only chart where the X axis is numeric *and* rendered through raw Recharts.
- [ ] **Check the composite path:** on a bar chart, set one series' "Render as" to Line so the chart falls back to `CompositeChart`, then confirm a Y tick interval still applies. This is the branch where the layout-implied stack must be ignored.
