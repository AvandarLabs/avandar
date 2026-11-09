# F1 Threshold Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user set one break at 95 and get a red "Below 95%" class and a neutral "95% or above" class, with those exact words on the live legend, the PDF, and a dashboard embed.

**Architecture:** A graduated `ColorSpec` holds exactly one color and one optional label per class. Every write goes through `MapLayerUpdates.withLayerColor`, which fits the ramp and labels to the class count with `GraduatedRamps.fitColorToClassCount` (resampling from the preset the ramp came from, or from the current colors when they were edited by hand). `classifyLayerValues` writes `classLabels[index] ?? generatedLabel` into the persisted legend entries, which the legend, the PDF, and embeds already read. A new `AvaMapConfig` version 6 adds `classLabels` and its migration resamples every stored graduated ramp.

**Tech Stack:** TypeScript, React, Mantine 9 (`ColorPicker`, `Popover`, `NumberInput`, `Fieldset`), zod 4, Lingui, Vitest, Playwright.

**Spec:** [workflow-b-map-features-design.md](workflow-b-map-features-design.md) §3

**Depends on:** nothing. This plan creates `AvaMapConfig` version 6. F3 (version 7) builds on the exports `AvaMapConfigV6Schema` and `AvaMapConfigV6LayerSchema` from `AvaMapConfigV6Schema.ts`, so keep those names.

**Schema work:** none. No `supabase/` file changes, no `pnpm db:*` command, no `ava supabase switch` required.

---

## Design decisions

### Where the ramp's preset comes from

Today `GraduatedRampSelect` identifies the preset with `ramp[0] === GRADUATED_RAMPS.orange[0]`. That breaks as soon as the ramp is reversed (the first color is the darkest) or a class color is edited. No preset key is persisted. Instead, `GraduatedRamps.findPreset(ramp)` compares the ramp with every preset resampled to `ramp.length`, read both light to dark and dark to light:

| Ramp state | `findPreset` result | Select shows | Class-count change resamples from |
| --- | --- | --- | --- |
| A preset, as picked | `{ key, isReversed: false }` | Preset name | The full preset |
| A preset after "Reverse colors" | `{ key, isReversed: true }` | Preset name | The full preset, reversed |
| Any class color edited | `undefined` | Placeholder "Custom colors" | The current colors |

This keeps the model to the two fields the spec names, needs no extra persisted field, and makes shrinking to two classes and growing back lossless for presets.

### Resampling

`MapLayer.resampleColorRamp(sourceColors, classCount)` places classes at evenly spaced positions `i * (n - 1) / (classCount - 1)` along the source stops. A position on a stop takes that stop's exact string. A position between stops blends the two neighbors in RGB (rounded per channel, lowercase `#rrggbb`). Two classes therefore get the lightest and darkest, never the two lightest. This lives in `shared/` because the config migration needs it.

### Where the per-class rows live

The spec puts the swatch and label inputs in `ClassificationBreakList`. That component only renders for the `manual` method (`GraduatedClassCountControl.tsx:46-53`) and is a single comma-separated text input. Per-class colors are needed for every method, so the rows are a new `GraduatedClassList` rendered by `GraduatedControls` directly under the ramp select, for every method. `ClassificationBreakList` keeps editing the break values.

### Fraction detection

The inspector has no raw values today: the legend persists only cuts. `classifyLayerValues` now also returns `valueDomain` (min and max classified value), `classifyLayerGeometry` forwards it, and `makeLayerRender` puts it on `MapLayerViewState.classifiedValueDomain`. `LayerInspectorFocusedView` already receives `viewState`, so it passes the domain down to the "Highlight values below" input. Runtime only, nothing persisted.

### When labels apply

`classifyLayerValues` applies `classLabels` only when the data yields exactly `classLabels.length` classes. When an automatic method produces fewer classes than asked for (few distinct values, deduplicated quantiles), a label written for one interval must not land on another, so the generated labels are used.

### Readers of `ramp[0]` that keep working unchanged

| Reader | Behavior after F1 |
| --- | --- |
| `LayerSwatch.tsx:30` | Shows the first class color. After "Reverse colors" that is the darkest color. No change. |
| `symbologyTypeUpdates.ts:30` (`_getSingleColor`) | Flattens to the first class color. No change. |
| `ClassificationColorModeSelect.tsx:47` | Same as above. Only its preset import changes (Task 4). |
| `HeatmapRampSelect.tsx:15` | Reads `HeatmapSymbology.ramp`, a different field that fitting and the migration never touch. No change. |
| `makeColorExpressionFromColor.ts:14` | Matches class index `i` to `ramp[i]`. With a fitted ramp the map paint loses the two-lightest bug too. No change. |
| `GraduatedRampSelect.tsx:27` | Replaced by `GraduatedRamps.findPreset` (Tasks 4 and 8). |

---

## File structure

| File | Action | Responsibility |
| --- | --- | --- |
| `shared/models/AvaMap/MapLayer/MapLayerModule/graduatedColorHelpers.ts` | Create | `resampleColorRamp`, `getGraduatedClassCount` |
| `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts` | Modify | Expose both helpers on `MapLayer` |
| `shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.graduatedColor.test.ts` | Create | Resampling and class-count tests |
| `shared/models/AvaMap/MapLayer/LayerSymbology.types.ts` | Modify | `classLabels` on graduated `ColorSpec`, ramp doc |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts` | Create | Version 6 zod schema |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts` | Modify | Version 5 to 6 migration |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts` | Modify | Parse and serialize version 6 |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts` | Modify | `AvaMapConfigRead` version 6 |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts` | Modify | `makeEmpty` version 6 |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v6SchemaSuites.ts` | Create | Migration and round-trip tests |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts` | Modify | Version 5 graduated fixture, version 6 layer fixture |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/AvaMapConfigSchema.test.ts`, `v4SchemaSuites.ts`, `v5SchemaSuites.ts`, `AvaMapConfigModule/AvaMapConfigModule.test.ts` | Modify | Expect version 6 |
| `src/views/GisApp/layers/GraduatedRamps/GraduatedRamps.ts` | Create | Presets, `findPreset`, `createPresetRamp`, `fitColorToClassCount`, swatch colors |
| `src/views/GisApp/layers/GraduatedRamps/GraduatedRamps.test.ts` | Create | Preset detection and fitting tests |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedControls.constants.ts` | Delete | Replaced by `GraduatedRamps.presets` |
| `src/views/GisApp/layers/MapLayerUpdates/layerMetaUpdates.ts` | Modify | `withLayerColor` fits graduated colors |
| `src/views/GisApp/layers/MapLayerUpdates/graduatedColorUpdates.ts` | Create | `withClassColor`, `withClassLabel`, `withRampPreset`, `withReversedRamp`, `withHighlightBelow` |
| `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts` | Modify | Spread `graduatedColorUpdates` |
| `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.graduatedColor.test.ts` | Create | Updater tests |
| `src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.ts` | Modify | Apply labels, return `valueDomain`, export `legendBreakToLabel` |
| `src/views/GisApp/layers/useAvaMapRender/classifyLayerGeometry.ts` | Modify | Pass labels, forward `valueDomain` |
| `src/views/GisApp/layers/useAvaMapRender/makeLayerRender.ts` | Modify | Put the domain on the view state |
| `src/views/GisApp/layers/MapLayerViewState.types.ts` | Modify | `classifiedValueDomain` |
| `src/views/GisApp/layers/useAvaMapRender/useAvaMapRender.test.ts` | Modify | Domain reaches the view state |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedRampSelect.tsx` | Modify | New presets, "Custom colors", Reverse button |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassList.tsx` | Create | One row per class |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassRow.tsx` | Create | Swatch with `ColorPicker`, label input |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassList.module.css` | Create | Row layout |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/HighlightValuesBelowInput.tsx` | Create | The shortcut input with the fraction rule |
| `.../GraduatedControls/GraduatedControls.tsx`, `GraduatedMethodControls.tsx`, `ClassificationEditor/ClassificationEditor.tsx`, `ClassificationColorModeSelect.tsx`, `LayerInspectorBody/LayerInspectorFocusedView.tsx` | Modify | Wiring |
| `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx` | Modify | Component tests |
| Graduated fixtures in `getResolvedMapLayerMetadata.test.ts`, `MapLayerUpdates.classification.test.ts`, `MapLayerUpdates.symbology.test.ts`, `makeLayerSpecFromMapLayer.fill.test.ts` | Modify | Add `classLabels` |
| `tests/e2e/gis-threshold-colors.spec.ts` | Create | ZIP choropleth legend reads "Below 95%" |
| `src/i18n/locales/*/messages.po` | Regenerate | New strings |

---

### Task 0: Workspace

**Files:** none.

- [ ] **Step 1: Create the worktree**

Load the `using-wt` skill, then run from the `demo/measles` checkout:

```bash
wt new feat/gis-threshold-colors demo/measles
```

All later commands run from the new worktree root.

- [ ] **Step 2: Confirm no database work is planned**

This plan changes no `supabase/` file and runs no `pnpm db:*`, `supabase start/stop/db diff`, or `ava supabase switch`. Run only `ava supabase status` to learn which local stack the e2e in Task 12 will use.

- [ ] **Step 3: Check the unit test runner**

Run: `pnpm vitest run src/views/GisApp/layers/classifyLayerValues`
Expected: 3 files, 22 tests pass.

- [ ] **Step 4: Load the e2e data (needed only before Task 12)**

The Workflow B catalog listings and parquet parts come from the mirror-catalog scripts (ask Pablo for the folder). From the worktree root:

```bash
REPO=$PWD bash <mirror-catalog>/load-local.sh
```

It reads `.env.development` and refuses non-local URLs. It inserts with `on conflict do nothing`, so re-running is safe.

---

### Task 1: Ramp resampling and class count helpers

**Files:**
- Create: `shared/models/AvaMap/MapLayer/MapLayerModule/graduatedColorHelpers.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts:4-8` (imports), `:120-127` (module members)
- Test: `shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.graduatedColor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

const BLUE_RAMP = [
  "#eff3ff",
  "#bdd7e7",
  "#6baed6",
  "#2171b5",
  "#08306b",
] as const;

describe("MapLayer.resampleColorRamp", () => {
  it("gives two classes the lightest and darkest colors", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 2)).toEqual([
      "#eff3ff",
      "#08306b",
    ]);
  });

  it("gives three classes the first, middle, and last colors", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 3)).toEqual([
      "#eff3ff",
      "#6baed6",
      "#08306b",
    ]);
  });

  it("keeps a five-color ramp unchanged for five classes", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 5)).toEqual([...BLUE_RAMP]);
  });

  it("blends neighboring colors for seven classes", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 7)).toEqual([
      "#eff3ff",
      "#cee0ef",
      "#a2c9e1",
      "#6baed6",
      "#3a85c0",
      "#195b9c",
      "#08306b",
    ]);
  });

  it("blends between stops when four classes fall between them", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 4)).toEqual([
      "#eff3ff",
      "#a2c9e1",
      "#3a85c0",
      "#08306b",
    ]);
  });

  it("takes the nearer stop when a color is not hex", () => {
    expect(MapLayer.resampleColorRamp(["red", "blue"], 3)).toEqual([
      "red",
      "blue",
      "blue",
    ]);
  });

  it("returns no colors for zero classes", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 0)).toEqual([]);
  });
});

describe("MapLayer.getGraduatedClassCount", () => {
  it("counts one more class than manual breaks", () => {
    expect(
      MapLayer.getGraduatedClassCount({ method: "manual", breaks: [95] }),
    ).toBe(2);
  });

  it("reads the class count of an automatic method", () => {
    expect(
      MapLayer.getGraduatedClassCount({ method: "jenks", classCount: 4 }),
    ).toBe(4);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.graduatedColor.test.ts`
Expected: FAIL with `MapLayer.resampleColorRamp is not a function`.

- [ ] **Step 3: Write the helpers**

`shared/models/AvaMap/MapLayer/MapLayerModule/graduatedColorHelpers.ts`:

```ts
import type {
  ClassificationConfig, // oxfmt-ignore
} from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";

/** How close to a stop a class position must be to take that stop exactly. */
const STOP_TOLERANCE = 1e-9;

/** Reads a `#rgb` or `#rrggbb` color as red, green, blue channels. */
function _parseHexColor(color: string): readonly number[] | undefined {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  const hexDigits = match?.[1];
  if (hexDigits === undefined) {
    return undefined;
  }
  const fullDigits =
    hexDigits.length === 3
      ? [...hexDigits]
          .map((digit) => {
            return `${digit}${digit}`;
          })
          .join("")
      : hexDigits;
  const packed = Number.parseInt(fullDigits, 16);
  return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
}

/** Writes red, green, blue channels as a lowercase `#rrggbb` color. */
function _buildHexColor(channels: readonly number[]): string {
  const hexChannels = channels.map((channel) => {
    return channel.toString(16).padStart(2, "0");
  });
  return `#${hexChannels.join("")}`;
}

/** Blends two colors in RGB, or picks the nearer one when either is not hex. */
function _mixColors(
  options: Readonly<{ fromColor: string; toColor: string; fraction: number }>,
): string {
  const { fromColor, toColor, fraction } = options;
  const fromChannels = _parseHexColor(fromColor);
  const toChannels = _parseHexColor(toColor);
  if (!fromChannels || !toChannels) {
    return fraction < 0.5 ? fromColor : toColor;
  }
  return _buildHexColor(
    fromChannels.map((channel, index) => {
      return Math.round(channel + ((toChannels[index] ?? 0) - channel) * fraction);
    }),
  );
}

/**
 * Picks `classCount` colors at evenly spaced positions along `sourceColors`,
 * blending neighbors in RGB where a position falls between two stops. With
 * two or more classes the first and last classes get the first and last
 * source colors.
 *
 * Use it wherever a graduated ramp must hold exactly one color per class,
 * for example when a classification gains or loses a class.
 */
export function resampleColorRamp(
  sourceColors: readonly string[],
  classCount: number,
): string[] {
  if (classCount <= 0 || sourceColors.length === 0) {
    return [];
  }
  const lastStopIndex = sourceColors.length - 1;
  return Array.from({ length: classCount }, (_, classIndex) => {
    const position =
      classCount === 1 ? 0 : (classIndex * lastStopIndex) / (classCount - 1);
    const lowerStopIndex = Math.floor(position);
    const fraction = position - lowerStopIndex;
    const lowerColor = sourceColors[lowerStopIndex]!;
    const upperColor =
      sourceColors[Math.min(lowerStopIndex + 1, lastStopIndex)]!;
    if (fraction < STOP_TOLERANCE) {
      return lowerColor;
    }
    if (1 - fraction < STOP_TOLERANCE) {
      return upperColor;
    }
    return _mixColors({ fromColor: lowerColor, toColor: upperColor, fraction });
  });
}

/**
 * How many classes a graduated classification asks for: the class count of
 * an automatic method, or one more than the number of manual breaks. Use it
 * to size per-class arrays such as a ramp or its labels.
 */
export function getGraduatedClassCount(
  classification: ClassificationConfig,
): number {
  return classification.method === "manual"
    ? classification.breaks.length + 1
    : classification.classCount;
}
```

In `MapLayerModule.ts`, add to the import block after line 8:

```ts
import {
  getGraduatedClassCount,
  resampleColorRamp,
} from "$/models/AvaMap/MapLayer/MapLayerModule/graduatedColorHelpers.ts";
```

and add these members right after `areDisputedStatusValuesDisjoint,` (line 127):

```ts

  /** Resamples a color ramp to one evenly spaced color per class. */
  resampleColorRamp,

  /** How many classes a graduated classification asks for. */
  getGraduatedClassCount,
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run shared/models/AvaMap/MapLayer/MapLayerModule`
Expected: PASS, including the 9 new tests.

- [ ] **Step 5: Commit**

```bash
git add shared/models/AvaMap/MapLayer/MapLayerModule/graduatedColorHelpers.ts shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.graduatedColor.test.ts
git commit -m "feat(gis): resample graduated color ramps to one color per class"
```

---

### Task 2: `classLabels` on the graduated color model

**Files:**
- Modify: `shared/models/AvaMap/MapLayer/LayerSymbology.types.ts:74-82`
- Modify: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationColorModeSelect.tsx:59-67`
- Modify (fixtures): `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/__tests__/getResolvedMapLayerMetadata.test.ts:178`, `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.classification.test.ts:30`, `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.symbology.test.ts:72`, `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.fill.test.ts:103`, `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx:54`

This task is a type change, so the compiler is the failing test.

- [ ] **Step 1: Change the model type**

Replace the `graduated` member of `ColorSpec` (lines 74-82) with:

```ts
  | {
      type: "graduated";
      value: LayerValueRef;
      /** Exactly one color per class, in class order. */
      ramp: readonly string[];
      classification: ClassificationConfig;
      normalization: NormalizationConfig | undefined;
      noData: NoDataStyle;
      /**
       * One legend label per class, in class order. `undefined` keeps the
       * generated interval label, such as `< 95`.
       */
      classLabels: readonly (string | undefined)[];
    };
```

- [ ] **Step 2: Run the type check to see it fail**

Run: `pnpm tsc -b --force`
Expected: FAIL with `Property 'classLabels' is missing` at `ClassificationColorModeSelect.tsx` and the five fixture files listed above.

- [ ] **Step 3: Add `classLabels` everywhere a graduated color is built**

`ClassificationColorModeSelect.tsx`, inside the `mode === "graduated"` return (after `noData,` on line 66):

```ts
      classLabels: Array.from({ length: 5 }, () => {
        return undefined;
      }),
```

Fixture lines, each inserted directly after the `ramp:` line of the graduated literal:

- `getResolvedMapLayerMetadata.test.ts` after line 178: `          classLabels: [undefined, undefined],`
- `MapLayerUpdates.classification.test.ts` after line 30: `        classLabels: [undefined, undefined],`
- `MapLayerUpdates.symbology.test.ts` after line 72: `          classLabels: [undefined, undefined],`
- `makeLayerSpecFromMapLayer.fill.test.ts` after line 103: `          classLabels: [undefined, undefined],`
- `ClassificationEditor.test.tsx` after line 54: `        classLabels: [undefined, undefined, undefined, undefined, undefined],`

- [ ] **Step 4: Run the type check to see it pass**

Run: `pnpm tsc -b --force`
Expected: PASS. (The V5 schema output lacks `classLabels`, but `AvaMapConfigSchema.ts` already casts with `as AvaMapConfigRead`, and a type with an extra required field is a valid cast target.)

- [ ] **Step 5: Commit**

```bash
git add shared/models/AvaMap/MapLayer/LayerSymbology.types.ts src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationColorModeSelect.tsx src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/__tests__/getResolvedMapLayerMetadata.test.ts src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.classification.test.ts src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.symbology.test.ts src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.fill.test.ts src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx
git commit -m "feat(gis): add per-class legend labels to graduated colors"
```

---

### Task 3: `AvaMapConfig` version 6 and its migration

**Files:**
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts:17-28`, `:116-155`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts` (whole file)
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts:155-159`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts:82`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v6SchemaSuites.ts`
- Modify: `.../AvaMapConfigSchema.test/schemaTestFixtures.ts:222-234` and append, `.../AvaMapConfigSchema.test/AvaMapConfigSchema.test.ts:11,20,47,110,205`, `.../v4SchemaSuites.ts:20`, `.../v5SchemaSuites.ts:14`, `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts:9,15,17`

- [ ] **Step 1: Write the failing tests**

In `schemaTestFixtures.ts`, change `createEmptyVersion5Json` so it stays a version 5 fixture after the bump (line 226):

```ts
    version: 5,
```

Append to `schemaTestFixtures.ts`:

```ts
/** A version 5 ZIP layer: a 5-color ramp classified by one manual break. */
export function createVersion5JsonWithGraduatedLayer() {
  const layer = MapLayer.createArea("ZIP coverage");
  return {
    ...createEmptyVersion5Json(),
    layers: [
      {
        ...layer,
        symbology: {
          ...MapLayer.createDefaultFillSymbology(),
          color: {
            type: "graduated",
            value: {
              type: "areaAggregation",
              outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
            },
            ramp: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
            classification: { method: "manual", breaks: [95] },
            normalization: undefined,
            noData: { color: "#ced4da", label: "" },
          },
        },
        legend: {
          ...layer.legend,
          breaks: [
            { lower: undefined, upper: 95 },
            { lower: 95, upper: undefined },
          ],
          entries: [
            { type: "value", color: "#eff3ff", label: "< 95", count: 3 },
            { type: "value", color: "#bdd7e7", label: "≥ 95", count: 4 },
            { type: "noData", color: "#ced4da", label: "", count: 1 },
          ],
        },
      },
    ],
  };
}

/** A version 6 ZIP layer with one custom class label and one unset. */
export function createGraduatedAreaLayer(): MapLayer.T {
  const layer = MapLayer.createArea("ZIP coverage");
  return {
    ...layer,
    symbology: {
      ...MapLayer.createDefaultFillSymbology(),
      color: {
        type: "graduated",
        value: {
          type: "areaAggregation",
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        ramp: ["#d7301f", "#d9d9d9"],
        classification: { method: "manual", breaks: [0.95] },
        normalization: undefined,
        noData: { color: "#ced4da", label: "" },
        classLabels: ["Below 95%", undefined],
      },
    },
  };
}
```

Create `v6SchemaSuites.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import {
  createGraduatedAreaLayer,
  createVersion5JsonWithGraduatedLayer,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";

describe("AvaMapConfigSchema v6 class colors", () => {
  it("resamples a version 5 ramp to the lightest and darkest colors for two classes", () => {
    const parsed = AvaMapConfigSchema.fromJson(
      createVersion5JsonWithGraduatedLayer(),
    );

    expect(parsed.version).toBe(6);
    expect(parsed.layers[0]?.symbology).toMatchObject({
      color: { ramp: ["#eff3ff", "#08306b"] },
    });
  });

  it("gives every migrated class an unset label", () => {
    const parsed = AvaMapConfigSchema.fromJson(
      createVersion5JsonWithGraduatedLayer(),
    );

    expect(parsed.layers[0]?.symbology).toMatchObject({
      color: { classLabels: [undefined, undefined] },
    });
  });

  it("recolors the persisted legend keys of a migrated graduated layer", () => {
    const parsed = AvaMapConfigSchema.fromJson(
      createVersion5JsonWithGraduatedLayer(),
    );

    const legendColors = parsed.layers[0]?.legend.entries.map((entry) => {
      return entry.color;
    });
    expect(legendColors).toEqual(["#eff3ff", "#08306b", "#ced4da"]);
  });

  it("round-trips class labels, keeping an unset label unset", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: createGraduatedAreaLayer(),
    });

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("writes an unset class label as null in JSON", () => {
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: createGraduatedAreaLayer(),
    });
    const json = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ symbology: { color: { classLabels: unknown[] } } }>;
    };

    expect(json.layers[0]!.symbology.color.classLabels).toEqual([
      "Below 95%",
      null,
    ]);
  });
});
```

In `AvaMapConfigSchema.test.ts` add after line 11:

```ts
import "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v6SchemaSuites.ts";
```

and change `version: 5` (line 20) to `version: 6`, both `expect(parsed.version).toBe(5)` (lines 47, 110) to `toBe(6)`, and `version: 6` in the future-version test (line 205) to `version: 7`. In `v4SchemaSuites.ts:20` and `v5SchemaSuites.ts:14` change `toBe(5)` to `toBe(6)`. In `AvaMapConfigModule.test.ts` change lines 9 and 17 to `toBe(6)` and the test name on line 15 to `"starts version 6 maps with no overlay and annotations on top"`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig`
Expected: FAIL. Version assertions report `expected 5 to be 6`, and the v6 suite fails because `ramp` still has 5 colors and `classLabels` is missing.

- [ ] **Step 3: Write the version 6 schema**

`AvaMapConfigV6Schema.ts`:

```ts
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import {
  SingleColorSpecSchema,
  StrokeSpecSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  CircleSymbologySchema,
  FillSymbologySchema,
  LineSymbologySchema,
  ProportionalSymbolSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import {
  AvaMapConfigV5LayerSchema,
  AvaMapConfigV5Schema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts";

const [, CategoricalColorSpecSchema, V5GraduatedColorSpecSchema] =
  CircleSymbologySchema.shape.color.options;
const [V5StandardLayerSchema, V5AggregateOnlyLayerSchema] =
  AvaMapConfigV5LayerSchema.options;

/**
 * One legend label per class. JSON has no `undefined`, so an unset label is
 * written as `null` and read back as `undefined`.
 */
const ClassLabelsSchema = z
  .array(
    z
      .string()
      .nullish()
      .transform((label) => {
        return label ?? undefined;
      }),
  )
  .readonly();

const V6ColorSpecSchema = z.discriminatedUnion("type", [
  SingleColorSpecSchema,
  CategoricalColorSpecSchema,
  V5GraduatedColorSpecSchema.extend({ classLabels: ClassLabelsSchema }).strict(),
]);

const V6FillSymbologySchema = FillSymbologySchema.extend({
  color: V6ColorSpecSchema,
}).strict();
const V6SymbologySchema = z.discriminatedUnion("type", [
  CircleSymbologySchema.extend({ color: V6ColorSpecSchema }).strict(),
  ProportionalSymbolSchema.extend({ color: V6ColorSpecSchema }).strict(),
  LineSymbologySchema.extend({ color: V6ColorSpecSchema }).strict(),
  V6FillSymbologySchema,
  z.strictObject({
    type: z.literal("cluster"),
    radiusPx: z.number(),
    color: SingleColorSpecSchema,
    stroke: StrokeSpecSchema,
  }),
  z.strictObject({
    type: z.literal("heatmap"),
    radiusPx: z.number(),
    weight: uuidType<"QueryColumn">().optional(),
    ramp: z.array(z.string()).readonly(),
  }),
]);

/** Version 6 layer: graduated colors carry one optional label per class. */
export const AvaMapConfigV6LayerSchema = z.union([
  V5StandardLayerSchema.extend({ symbology: V6SymbologySchema }).strict(),
  V5AggregateOnlyLayerSchema.extend({
    symbology: V6FillSymbologySchema,
  }).strict(),
]);

/** Version 6 persisted map configuration. */
export const AvaMapConfigV6Schema = AvaMapConfigV5Schema.extend({
  version: z.literal(6),
  layers: z.array(AvaMapConfigV6LayerSchema).readonly(),
}).strict();
```

- [ ] **Step 4: Write the migration**

In `migrateAvaMapConfig.ts`, add after line 18:

```ts
import {
  AvaMapConfigV6LayerSchema,
  AvaMapConfigV6Schema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts";
```

add after line 28 (`type ConfigV4 = ...`):

```ts
type ConfigV5 = z.infer<typeof AvaMapConfigV5Schema>;
type ConfigV5Layer = ConfigV5["layers"][number];
type ConfigV6Layer = z.infer<typeof AvaMapConfigV6LayerSchema>;
```

and replace lines 116-155 (from `/** Migrates a valid version 4 config` to the end) with:

```ts
/** Migrates a valid version 4 config into the version 5 representation. */
function _migrateVersion4(config: ConfigV4): ConfigV5 {
  return AvaMapConfigV5Schema.parse({
    ...config,
    version: 5,
    exportLayout: DEFAULT_EXPORT_LAYOUT,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        disputedStatusColumn: undefined,
        disputedStatusValues: { disputed: [], undetermined: [] },
      };
    }),
  });
}

/**
 * Resamples a version 5 graduated ramp to one color per class and recolors
 * the layer's persisted legend keys to match, so a saved legend agrees with
 * the map before the GIS app reclassifies the layer. Every class starts with
 * an unset label.
 */
function _migrateVersion5Layer(layer: ConfigV5Layer): ConfigV6Layer {
  const { symbology } = layer;
  if (!("color" in symbology) || symbology.color.type !== "graduated") {
    return AvaMapConfigV6LayerSchema.parse(layer);
  }
  const classCount = MapLayer.getGraduatedClassCount(
    symbology.color.classification,
  );
  const ramp = MapLayer.resampleColorRamp(symbology.color.ramp, classCount);
  return AvaMapConfigV6LayerSchema.parse({
    ...layer,
    symbology: {
      ...symbology,
      color: {
        ...symbology.color,
        ramp,
        classLabels: Array.from({ length: classCount }, () => {
          return undefined;
        }),
      },
    },
    legend: {
      ...layer.legend,
      entries: layer.legend.entries.map((entry, index) => {
        return entry.type === "value"
          ? { ...entry, color: ramp[index] ?? entry.color }
          : entry;
      }),
    },
  });
}

/** Migrates a valid version 5 config into the current persisted shape. */
function _migrateVersion5(config: ConfigV5): AvaMapConfigRead {
  return AvaMapConfigV6Schema.parse({
    ...config,
    version: 6,
    layers: config.layers.map(_migrateVersion5Layer),
    // The cast bridges `PopupConfig.action`, a required `| undefined` field
    // on `MapLayer.T` that `PopupSchema` still infers as an optional key.
  }) as AvaMapConfigRead;
}

/** Migrates a parsed older config into the current persisted shape. */
export const migrateAvaMapConfig = {
  /** Migrates a valid version 1 config into the current representation. */
  fromV1: (config: ConfigV1): AvaMapConfigRead => {
    return _migrateVersion5(
      _migrateVersion4(
        _migrateVersion3(_migrateVersion2(_migrateVersion1(config))),
      ),
    );
  },

  /** Migrates a valid version 2 config into the current representation. */
  fromV2: (config: ConfigV2): AvaMapConfigRead => {
    return _migrateVersion5(
      _migrateVersion4(_migrateVersion3(_migrateVersion2(config))),
    );
  },

  /** Migrates a valid version 3 config into the current representation. */
  fromV3: (config: ConfigV3): AvaMapConfigRead => {
    return _migrateVersion5(_migrateVersion4(_migrateVersion3(config)));
  },

  /** Migrates a valid version 4 config into the current representation. */
  fromV4: (config: ConfigV4): AvaMapConfigRead => {
    return _migrateVersion5(_migrateVersion4(config));
  },

  /** Migrates a valid version 5 config into the current representation. */
  fromV5: _migrateVersion5,
};
```

- [ ] **Step 5: Parse and serialize version 6**

In `AvaMapConfigSchema.ts`: add the import

```ts
import { AvaMapConfigV6Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts";
```

replace `AvaMapConfigV5Schema.parse(json)` in `_parseCurrentConfig` (line 29) with `AvaMapConfigV6Schema.parse(json)`, add a version 5 branch after the `version === 4` branch (after line 56):

```ts
  if (version === 5) {
    return migrateAvaMapConfig.fromV5(AvaMapConfigV5Schema.parse(json));
  }
```

and replace `schema: AvaMapConfigV5Schema,` (line 63) with `schema: AvaMapConfigV6Schema,` and `AvaMapConfigV5Schema.parse(config)` in `toJson` (line 79) with `AvaMapConfigV6Schema.parse(config)`. Keep the `AvaMapConfigV5Schema` import: the version 5 branch uses it.

In `AvaMapConfig.types.ts` change the version argument of `AvaMapConfigRead` (line 157) from `5` to `6`. In `AvaMapConfigModule.ts:82` change `version: 5,` to `version: 6,`.

- [ ] **Step 6: Run the tests and the type check**

Run: `pnpm vitest run shared/models/AvaMap`
Expected: PASS, including the 5 new v6 tests.

Run: `pnpm tsc -b --force`
Expected: PASS. If zod reports that `.options` is not a tuple, replace the two destructurings with explicit index reads (`CircleSymbologySchema.shape.color.options[1]`) and re-run.

- [ ] **Step 7: Commit**

```bash
git add shared/models/AvaMap/AvaMapConfig
git commit -m "feat(gis): add map config version 6 with one color and label per class"
```

---

### Task 4: `GraduatedRamps` presets, preset detection, and fitting

**Files:**
- Create: `src/views/GisApp/layers/GraduatedRamps/GraduatedRamps.ts`
- Test: `src/views/GisApp/layers/GraduatedRamps/GraduatedRamps.test.ts`
- Delete: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedControls.constants.ts`
- Modify: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationColorModeSelect.tsx:5,63`, `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedRampSelect.tsx:4,27,35-38`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

const BLUE_RAMP = ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"];

function _createColor(overrides: Partial<GraduatedColor>): GraduatedColor {
  return {
    type: "graduated",
    value: {
      type: "areaAggregation",
      outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
    },
    ramp: ["#eff3ff", "#6baed6", "#08306b"],
    classification: { method: "quantile", classCount: 3 },
    normalization: undefined,
    noData: { color: "#ced4da", label: "" },
    classLabels: [undefined, "Middle", undefined],
    ...overrides,
  };
}

describe("GraduatedRamps.findPreset", () => {
  it("names the preset a two-class ramp was resampled from", () => {
    expect(GraduatedRamps.findPreset(["#fee5d9", "#a50f15"])).toEqual({
      key: "red",
      isReversed: false,
    });
  });

  it("names a reversed preset as reversed", () => {
    expect(
      GraduatedRamps.findPreset(["#08306b", "#6baed6", "#eff3ff"]),
    ).toEqual({ key: "blue", isReversed: true });
  });

  it("finds no preset once a class color was edited", () => {
    expect(
      GraduatedRamps.findPreset(["#d7301f", "#6baed6", "#08306b"]),
    ).toBeUndefined();
  });
});

describe("GraduatedRamps.fitColorToClassCount", () => {
  it("returns the same color when the ramp and labels already fit", () => {
    const color = _createColor({});

    expect(GraduatedRamps.fitColorToClassCount(color)).toBe(color);
  });

  it("resamples the whole preset when the class count grows", () => {
    const color = _createColor({
      classification: { method: "quantile", classCount: 5 },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).ramp).toEqual(
      BLUE_RAMP,
    );
  });

  it("resamples a reversed preset in reverse", () => {
    const color = _createColor({
      ramp: ["#08306b", "#6baed6", "#eff3ff"],
      classification: { method: "quantile", classCount: 5 },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).ramp).toEqual(
      BLUE_RAMP.toReversed(),
    );
  });

  it("resamples hand-edited colors when the class count shrinks", () => {
    const color = _createColor({
      ramp: ["#111111", "#222222", "#333333"],
      classification: { method: "manual", breaks: [95] },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).ramp).toEqual([
      "#111111",
      "#333333",
    ]);
  });

  it("resets every class label when the class count changes", () => {
    const color = _createColor({
      classification: { method: "manual", breaks: [95] },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).classLabels).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("gives a new graduated color one unset label per class", () => {
    const color = _createColor({
      ramp: BLUE_RAMP,
      classification: { method: "quantile", classCount: 5 },
      classLabels: [],
    });

    expect(GraduatedRamps.fitColorToClassCount(color)).toMatchObject({
      ramp: BLUE_RAMP,
      classLabels: [undefined, undefined, undefined, undefined, undefined],
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/layers/GraduatedRamps`
Expected: FAIL with `Failed to resolve import "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps"`.

- [ ] **Step 3: Write the module**

`src/views/GisApp/layers/GraduatedRamps/GraduatedRamps.ts`:

```ts
import { objectKeys } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

/**
 * ColorBrewer ramps a graduated color can start from, each safe for common
 * color vision deficiencies. `threshold` flags values below one break in red
 * against a neutral gray.
 */
const GRADUATED_RAMP_PRESETS = {
  blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
  orange: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
  red: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
  redBlue: ["#ca0020", "#f4a582", "#f7f7f7", "#92c5de", "#0571b0"],
  threshold: ["#d7301f", "#d9d9d9"],
} as const;

/** The key of one graduated ramp preset. */
export type GraduatedRampPresetKey = keyof typeof GRADUATED_RAMP_PRESETS;

/** A preset ramp, read light to dark or, when reversed, dark to light. */
export type GraduatedRampSource = {
  key: GraduatedRampPresetKey;
  isReversed: boolean;
};

const GRADUATED_RAMP_SOURCES: readonly GraduatedRampSource[] = objectKeys(
  GRADUATED_RAMP_PRESETS,
).flatMap((key) => {
  return [
    { key, isReversed: false },
    { key, isReversed: true },
  ];
});

const GRADUATED_SWATCH_COLORS: readonly string[] = [
  ...new Set(Object.values(GRADUATED_RAMP_PRESETS).flat()),
];

function _createPresetRamp(
  options: Readonly<GraduatedRampSource & { classCount: number }>,
): string[] {
  const colors: readonly string[] = GRADUATED_RAMP_PRESETS[options.key];
  return MapLayer.resampleColorRamp(
    options.isReversed ? colors.toReversed() : colors,
    options.classCount,
  );
}

function _isSameRamp(
  leftRamp: readonly string[],
  rightRamp: readonly string[],
): boolean {
  return (
    leftRamp.length === rightRamp.length &&
    leftRamp.every((color, index) => {
      return color.toLowerCase() === rightRamp[index]?.toLowerCase();
    })
  );
}

function _findPreset(
  ramp: readonly string[],
): GraduatedRampSource | undefined {
  return GRADUATED_RAMP_SOURCES.find((source) => {
    return _isSameRamp(
      _createPresetRamp({ ...source, classCount: ramp.length }),
      ramp,
    );
  });
}

function _resampleRamp(
  ramp: readonly string[],
  classCount: number,
): string[] {
  // A ramp that still matches a preset is resampled from the whole preset,
  // so shrinking to two classes and growing back loses no colors.
  const source = _findPreset(ramp);
  return source
    ? _createPresetRamp({ ...source, classCount })
    : MapLayer.resampleColorRamp(ramp, classCount);
}

function _fitColorToClassCount(color: GraduatedColor): GraduatedColor {
  const classCount = MapLayer.getGraduatedClassCount(color.classification);
  const isRampFitted = color.ramp.length === classCount;
  if (isRampFitted && color.classLabels.length === classCount) {
    return color;
  }
  return {
    ...color,
    ramp: isRampFitted ? color.ramp : _resampleRamp(color.ramp, classCount),
    classLabels: Array.from({ length: classCount }, () => {
      return undefined;
    }),
  };
}

/**
 * Preset color ramps for graduated map colors, and the rule that keeps a
 * layer's ramp and labels at exactly one entry per class. Use it wherever a
 * graduated color is created or its class count changes, such as a ramp
 * select or a layer update that adds a manual break.
 */
export const GraduatedRamps = {
  presets: GRADUATED_RAMP_PRESETS,

  /** Every preset color once, offered as swatches by a class color picker. */
  swatchColors: GRADUATED_SWATCH_COLORS,

  /** A preset resampled to one color per class. */
  createPresetRamp: _createPresetRamp,

  /** The preset and direction a ramp was made from, if it still matches one. */
  findPreset: _findPreset,

  /**
   * Fits a graduated color to its class count. When the count changed, the
   * ramp is resampled and every class label is reset to unset.
   */
  fitColorToClassCount: _fitColorToClassCount,
};
```

- [ ] **Step 4: Point the old constant's readers at the module and delete it**

`ClassificationColorModeSelect.tsx`: replace line 5 with

```ts
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
```

and line 63 `ramp: GRADUATED_RAMPS.blue,` with `ramp: GraduatedRamps.presets.blue,`.

`GraduatedRampSelect.tsx`: replace line 4 with the same import, and replace `GRADUATED_RAMPS` with `GraduatedRamps.presets` on lines 27, 37, and 38. (Task 8 rewrites this file.)

```bash
git rm src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedControls.constants.ts
```

- [ ] **Step 5: Run the tests and the type check**

Run: `pnpm vitest run src/views/GisApp/layers/GraduatedRamps`
Expected: PASS, 9 tests.

Run: `pnpm tsc -b --force`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp/layers/GraduatedRamps src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationColorModeSelect.tsx src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedRampSelect.tsx
git commit -m "feat(gis): add red, red-blue, and threshold graduated ramp presets"
```

---

### Task 5: Layer updates fit graduated colors and edit classes

**Files:**
- Modify: `src/views/GisApp/layers/MapLayerUpdates/layerMetaUpdates.ts:1-16`
- Create: `src/views/GisApp/layers/MapLayerUpdates/graduatedColorUpdates.ts`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts:1-28`
- Test: `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.graduatedColor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

function _createGraduatedLayer(
  overrides: Partial<GraduatedColor> = {},
): MapLayer.T {
  return {
    ...MapLayer.createArea("ZIP codes"),
    symbology: {
      ...MapLayer.createDefaultFillSymbology(),
      color: {
        type: "graduated",
        value: {
          type: "areaAggregation",
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
        ramp: ["#eff3ff", "#6baed6", "#08306b"],
        classification: { method: "quantile", classCount: 3 },
        normalization: undefined,
        noData: { color: "#ced4da", label: "" },
        classLabels: [undefined, "Middle", undefined],
        ...overrides,
      },
    },
  };
}

function _getGraduatedColor(layer: MapLayer.T): GraduatedColor {
  if (
    layer.symbology.type === "heatmap" ||
    layer.symbology.color.type !== "graduated"
  ) {
    throw new Error("Expected a graduated color");
  }
  return layer.symbology.color;
}

describe("graduated color updates", () => {
  it("gives two manual classes the lightest and darkest preset colors", () => {
    const updated = MapLayerUpdates.withManualBreaks({
      layer: _createGraduatedLayer(),
      breaks: [95],
    });

    expect(_getGraduatedColor(updated).ramp).toEqual(["#eff3ff", "#08306b"]);
  });

  it("replaces only the edited class color", () => {
    const updated = MapLayerUpdates.withClassColor({
      layer: _createGraduatedLayer(),
      classIndex: 1,
      color: "#d7301f",
    });

    expect(_getGraduatedColor(updated).ramp).toEqual([
      "#eff3ff",
      "#d7301f",
      "#08306b",
    ]);
  });

  it("stores a typed class label on its class", () => {
    const updated = MapLayerUpdates.withClassLabel({
      layer: _createGraduatedLayer(),
      classIndex: 0,
      label: "Lowest",
    });

    expect(_getGraduatedColor(updated).classLabels).toEqual([
      "Lowest",
      "Middle",
      undefined,
    ]);
  });

  it("unsets a class label typed as blank", () => {
    const updated = MapLayerUpdates.withClassLabel({
      layer: _createGraduatedLayer(),
      classIndex: 1,
      label: "  ",
    });

    expect(_getGraduatedColor(updated).classLabels).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("fills every class from a picked preset", () => {
    const updated = MapLayerUpdates.withRampPreset({
      layer: _createGraduatedLayer(),
      presetKey: "red",
    });

    expect(_getGraduatedColor(updated).ramp).toEqual([
      "#fee5d9",
      "#fb6a4a",
      "#a50f15",
    ]);
  });

  it("reverses the class colors", () => {
    const updated = MapLayerUpdates.withReversedRamp(_createGraduatedLayer());

    expect(_getGraduatedColor(updated).ramp).toEqual([
      "#08306b",
      "#6baed6",
      "#eff3ff",
    ]);
  });

  it("highlights values below one break with threshold colors and labels", () => {
    const updated = MapLayerUpdates.withHighlightBelow({
      layer: _createGraduatedLayer(),
      breakValue: 0.95,
      belowLabel: "Below 95%",
      aboveLabel: "95% or above",
    });

    expect(_getGraduatedColor(updated)).toMatchObject({
      classification: { method: "manual", breaks: [0.95] },
      ramp: ["#d7301f", "#d9d9d9"],
      classLabels: ["Below 95%", "95% or above"],
    });
  });

  it("leaves a single-color layer unchanged", () => {
    const layer = MapLayer.createArea("ZIP codes");

    expect(
      MapLayerUpdates.withClassColor({ layer, classIndex: 0, color: "#000" }),
    ).toBe(layer);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.graduatedColor.test.ts`
Expected: FAIL. The first test still gets the unfitted 3-color ramp, and the rest fail with `MapLayerUpdates.withClassColor is not a function`.

- [ ] **Step 3: Fit colors in `withLayerColor`**

In `layerMetaUpdates.ts`, add after line 1:

```ts
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
```

and replace `withLayerColor` (lines 3-16) with:

```ts
/**
 * Replaces color behavior and invalidates its derived legend output. A
 * graduated color is fitted to one color and one label per class.
 */
function withLayerColor(
  options: Readonly<{ layer: MapLayer.T; color: MapLayer.Color }>,
): MapLayer.T {
  const { layer, color } = options;
  if (layer.symbology.type === "heatmap") {
    return layer;
  }
  return {
    ...layer,
    symbology: {
      ...layer.symbology,
      color:
        color.type === "graduated"
          ? GraduatedRamps.fitColorToClassCount(color)
          : color,
    },
    legend: { ...layer.legend, breaks: [], entries: [] },
  } as MapLayer.T;
}
```

- [ ] **Step 4: Write the class updaters**

`src/views/GisApp/layers/MapLayerUpdates/graduatedColorUpdates.ts`:

```ts
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import { layerMetaUpdates } from "./layerMetaUpdates";
import type { GraduatedRampPresetKey } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

/** Applies `update` to a graduated color, or returns any other layer as is. */
function _withGraduatedColor(
  options: Readonly<{
    layer: MapLayer.T;
    update: (color: GraduatedColor) => GraduatedColor;
  }>,
): MapLayer.T {
  const { layer, update } = options;
  if (
    layer.symbology.type === "heatmap" ||
    layer.symbology.color.type !== "graduated"
  ) {
    return layer;
  }
  return layerMetaUpdates.withLayerColor({
    layer,
    color: update(layer.symbology.color),
  });
}

/** Sets one class's color, leaving the other classes as they are. */
function withClassColor(
  options: Readonly<{ layer: MapLayer.T; classIndex: number; color: string }>,
): MapLayer.T {
  const { layer, classIndex, color } = options;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        ramp: current.ramp.map((rampColor, index) => {
          return index === classIndex ? color : rampColor;
        }),
      };
    },
  });
}

/** Sets one class's legend label. A blank label restores the generated one. */
function withClassLabel(
  options: Readonly<{ layer: MapLayer.T; classIndex: number; label: string }>,
): MapLayer.T {
  const { layer, classIndex } = options;
  const label = options.label.trim() === "" ? undefined : options.label;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        classLabels: current.classLabels.map((classLabel, index) => {
          return index === classIndex ? label : classLabel;
        }),
      };
    },
  });
}

/** Recolors every class from a preset, read light to dark. */
function withRampPreset(
  options: Readonly<{ layer: MapLayer.T; presetKey: GraduatedRampPresetKey }>,
): MapLayer.T {
  const { layer, presetKey } = options;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        ramp: GraduatedRamps.createPresetRamp({
          key: presetKey,
          isReversed: false,
          classCount: MapLayer.getGraduatedClassCount(current.classification),
        }),
      };
    },
  });
}

/** Reverses the class colors, so the first class takes the last color. */
function withReversedRamp(layer: MapLayer.T): MapLayer.T {
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return { ...current, ramp: current.ramp.toReversed() };
    },
  });
}

/**
 * Flags values below one number: a manual classification with that single
 * break, the threshold preset, and the two given legend labels. The labels
 * arrive already localized.
 */
function withHighlightBelow(
  options: Readonly<{
    layer: MapLayer.T;
    breakValue: number;
    belowLabel: string;
    aboveLabel: string;
  }>,
): MapLayer.T {
  const { layer, breakValue, belowLabel, aboveLabel } = options;
  return _withGraduatedColor({
    layer,
    update: (current) => {
      return {
        ...current,
        classification: { method: "manual", breaks: [breakValue] },
        ramp: GraduatedRamps.createPresetRamp({
          key: "threshold",
          isReversed: false,
          classCount: 2,
        }),
        classLabels: [belowLabel, aboveLabel],
      };
    },
  });
}

/** Per-class colors and labels, ramp presets, and the highlight shortcut. */
export const graduatedColorUpdates = {
  withClassColor,
  withClassLabel,
  withRampPreset,
  withReversedRamp,
  withHighlightBelow,
};
```

In `MapLayerUpdates.ts` add `import { graduatedColorUpdates } from "./graduatedColorUpdates";` after line 4 and `...graduatedColorUpdates,` after `...symbologyPaintUpdates,` (line 24).

- [ ] **Step 5: Run the updater tests**

Run: `pnpm vitest run src/views/GisApp/layers/MapLayerUpdates`
Expected: PASS, including the 8 new tests. The existing "sets graduated color and clears incompatible derived legend output" test still passes because its 2-color ramp and 2 labels already fit `classCount: 2`.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp/layers/MapLayerUpdates
git commit -m "feat(gis): fit graduated colors to the class count and edit each class"
```

---

### Task 6: Class labels in the classified legend

**Files:**
- Modify: `src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.ts:1-24`, `:112-120`, `:129-198`
- Modify: `src/views/GisApp/layers/useAvaMapRender/classifyLayerGeometry.ts:196-200`
- Test: `src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.test.ts`

- [ ] **Step 1: Write the failing tests**

In `classifyLayerValues.test.ts`, replace `_classify` (lines 8-18) with:

```ts
function _classify(
  values: readonly unknown[],
  classification: MapLayer.Classification,
  classLabels: readonly (string | undefined)[] = [],
) {
  return classifyLayerValues(
    values.map((value, index) => {
      return { featureId: String(index), value };
    }),
    { classification, ramp, noData, classLabels },
  );
}
```

and add inside the `describe` block:

```ts
  it("uses a custom class label in place of the generated interval label", () => {
    const result = _classify([0.62, 0.9, 0.97], {
      method: "manual",
      breaks: [0.95],
    }, ["Below 95%", "95% or above"]);

    expect(result.entries.map(({ label }) => {
      return label;
    })).toEqual(["Below 95%", "95% or above"]);
  });

  it("keeps the generated label for a class whose label is unset", () => {
    const result = _classify([0.62, 0.97], {
      method: "manual",
      breaks: [0.95],
    }, ["Below 95%", undefined]);

    expect(result.entries[1]?.label).toBe("≥ 0.95");
  });

  it("uses generated labels when the data yields fewer classes than labels", () => {
    const result = _classify([1, 1, 2, 2], {
      method: "equalInterval",
      classCount: 3,
    }, ["Low", "Middle", "High"]);

    expect(result.entries.map(({ label }) => {
      return label;
    })).toEqual(["< 1.5", "≥ 1.5"]);
  });

  it("reports the lowest and highest classified value", () => {
    const result = _classify([0.97, null, 0.62, 0.8], {
      method: "quantile",
      classCount: 2,
    });

    expect(result.valueDomain).toEqual([0.62, 0.97]);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.test.ts`
Expected: FAIL. The label tests get `["< 0.95", "≥ 0.95"]` and the domain test gets `undefined`.

- [ ] **Step 3: Implement**

In `classifyLayerValues.ts`, change line 3 to a value import:

```ts
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
```

add a field to `LayerClassification` after `didSample: boolean;`:

```ts
  /** Lowest and highest classified value, or `undefined` when none. */
  valueDomain: readonly [number, number] | undefined;
```

add a field to `Options`:

```ts
  classLabels: readonly (string | undefined)[];
```

replace `_formatBreak` (lines 112-120) with:

```ts
/**
 * The generated legend label for one interval, such as `< 95` or `≥ 95`.
 * Use it wherever a class needs a name the user has not written, such as a
 * legend entry or the placeholder of a class label input.
 */
export function legendBreakToLabel(value: MapLayer.LegendBreak): string {
  if (value.lower === undefined) {
    return `< ${value.upper}`;
  }
  if (value.upper === undefined) {
    return `≥ ${value.lower}`;
  }
  return `${value.lower} to ${value.upper}`;
}
```

and replace `classifyLayerValues` (lines 129-198) with these helpers and the function:

```ts
function _countClasses(
  options: Readonly<{
    finiteValues: ReadonlyArray<{ featureId: string; value: number }>;
    cuts: readonly number[];
    classCount: number;
  }>,
): { classIndexByFeatureId: Map<string, number>; counts: number[] } {
  const classIndexByFeatureId = new Map<string, number>();
  const counts = Array.from({ length: options.classCount }, () => {
    return 0;
  });
  options.finiteValues.forEach(({ featureId, value }) => {
    const classIndex = _findClassIndex(value, options.cuts);
    classIndexByFeatureId.set(featureId, classIndex);
    counts[classIndex] = (counts[classIndex] ?? 0) + 1;
  });
  return { classIndexByFeatureId, counts };
}

function _buildValueEntries(
  options: Readonly<{
    breaks: readonly MapLayer.LegendBreak[];
    counts: readonly number[];
    ramp: readonly string[];
    classLabels: readonly (string | undefined)[];
  }>,
): MapLayer.LegendEntry[] {
  const { breaks, counts, ramp } = options;
  // A label names one interval, so labels apply only while the data still
  // yields exactly the classes they were written for.
  const labels =
    options.classLabels.length === breaks.length ? options.classLabels : [];
  return breaks.map((legendBreak, index): MapLayer.LegendEntry => {
    return {
      type: "value",
      color: ramp[Math.min(index, ramp.length - 1)] ?? "",
      label: labels[index] ?? legendBreakToLabel(legendBreak),
      count: counts[index] ?? 0,
    };
  });
}

function _getRecommendation(
  distinctValueCount: number,
): LayerClassification["recommendation"] {
  if (distinctValueCount === 0) {
    return "noData";
  }
  return distinctValueCount === 1 ? "singleColor" : "classified";
}

/** Classifies finite feature values into deterministic legend intervals. */
export function classifyLayerValues(
  sourceValues: readonly LayerValue[],
  options: Options,
): LayerClassification {
  const finiteValues = sourceValues.filter(
    (item): item is { featureId: string; value: number } => {
      return typeof item.value === "number" && Number.isFinite(item.value);
    },
  );
  const sortedNumbers = finiteValues
    .map(({ value }) => {
      return value;
    })
    .toSorted((left, right) => {
      return left - right;
    });
  const distinctValueCount = new Set(sortedNumbers).size;
  const classCount = Math.min(
    MapLayer.getGraduatedClassCount(options.classification),
    distinctValueCount,
  );
  const { cuts, didSample } =
    classCount === 0
      ? { cuts: [], didSample: false }
      : _makeCuts(sortedNumbers, options.classification, classCount);
  const breaks = classCount === 0 ? [] : _buildBreaks(cuts);
  const { classIndexByFeatureId, counts } = _countClasses({
    finiteValues,
    cuts,
    classCount: breaks.length,
  });
  const noDataCount = sourceValues.length - finiteValues.length;
  const noDataEntries: MapLayer.LegendEntry[] =
    noDataCount > 0 ? [{ type: "noData", ...options.noData, count: noDataCount }] : [];
  return {
    breaks,
    entries: [
      ..._buildValueEntries({ breaks, counts, ramp: options.ramp, classLabels: options.classLabels }),
      ...noDataEntries,
    ],
    classIndexByFeatureId,
    sourceValueCount: sourceValues.length,
    classifiedValueCount: finiteValues.length,
    distinctValueCount,
    didSample,
    valueDomain:
      sortedNumbers.length === 0
        ? undefined
        : [sortedNumbers[0]!, sortedNumbers.at(-1)!],
    recommendation: _getRecommendation(distinctValueCount),
  };
}
```

In `classifyLayerGeometry.ts`, inside the `classifyLayerValues` options (lines 196-200), add:

```ts
          classLabels: color.classLabels,
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/views/GisApp/layers/classifyLayerValues`
Expected: PASS, 26 tests (22 existing plus 4 new). Run `pnpm format` afterwards so oxfmt rewraps the long lines above.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.ts src/views/GisApp/layers/classifyLayerValues/classifyLayerValues.test.ts src/views/GisApp/layers/useAvaMapRender/classifyLayerGeometry.ts
git commit -m "feat(gis): write custom class labels into the classified legend"
```

---

### Task 7: The classified value domain reaches the layer view state

**Files:**
- Modify: `src/views/GisApp/layers/useAvaMapRender/classifyLayerGeometry.ts:13-22`, `:122`, `:172-183`, `:231-272`
- Modify: `src/views/GisApp/layers/useAvaMapRender/makeLayerRender.ts:186-199`
- Modify: `src/views/GisApp/layers/MapLayerViewState.types.ts:37-41`
- Test: `src/views/GisApp/layers/useAvaMapRender/useAvaMapRender.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `useAvaMapRender.test.ts` (new imports at the top: `import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";`):

```ts
function _makeValuedPolygon(value: number): GeoJSON.Feature {
  return {
    ...POLYGON_COLLECTION.features[0]!,
    id: value,
    properties: { [MapLayerSpatialFeatureProperties.value]: value },
  };
}

describe("useAvaMapRender classified values", () => {
  it("reports the lowest and highest classified value on the view state", () => {
    const boundLayer = _makeBoundFillLayer();
    const layer: MapLayer.T = {
      ...boundLayer,
      symbology: {
        ...MapLayer.createDefaultFillSymbology(),
        color: {
          type: "graduated",
          value: {
            type: "areaAggregation",
            outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
          },
          ramp: ["#d7301f", "#d9d9d9"],
          classification: { method: "manual", breaks: [0.95] },
          normalization: undefined,
          noData: { color: "#ced4da", label: "" },
          classLabels: [undefined, undefined],
        },
      },
    };
    const { result } = renderHook(() => {
      return useAvaMapRender({
        mapConfig: _makeMapConfig({
          layer,
          annotations: { isVisible: true, features: [] },
          annotationsZIndex: 0,
        }),
        layerQueryStates: new Map([
          [
            layer.id,
            _makeReadyQueryState({
              type: "FeatureCollection",
              features: [_makeValuedPolygon(0.97), _makeValuedPolygon(0.82)],
            }),
          ],
        ]),
      });
    });

    expect(
      result.current.layerViewStates.get(layer.id)?.classifiedValueDomain,
    ).toEqual([0.82, 0.97]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/layers/useAvaMapRender/useAvaMapRender.test.ts`
Expected: FAIL with `expected undefined to deeply equal [ 0.82, 0.97 ]`.

- [ ] **Step 3: Implement**

`MapLayerViewState.types.ts`, after `filterCount: number;` (line 41):

```ts

  /**
   * Lowest and highest value the layer's graduated colors classified. The
   * classification editor reads it to tell fractions from percents.
   */
  classifiedValueDomain?: readonly [number, number];
```

`classifyLayerGeometry.ts`:

- In `ClassifiedGeometry` (lines 13-16) add `valueDomain: readonly [number, number] | undefined;`.
- In `LegendClassification` (lines 18-22) add `valueDomain: readonly [number, number] | undefined;`.
- `_classifyCategories` return (line 122) becomes `return { breaks: [], classIndexByFeatureId: classIndexes, entries, valueDomain: undefined };`.
- Both early returns in `_classifyLegend` (lines 178 and 182) become `return { breaks: [], classIndexByFeatureId: new Map(), entries: [], valueDomain: undefined };`.
- In `classifyLayerGeometry`, the `!hasQueryData` return (line 239) becomes `return { geometry, legendUpdate: undefined, valueDomain: undefined };`, and the final return object gets `valueDomain: classification.valueDomain,` after the `legendUpdate` property.

`makeLayerRender.ts`, replace lines 186-199 with:

```ts
  const { geometry, legendUpdate, valueDomain } = classifyLayerGeometry({
    layer,
    geometry: rawGeometry,
    hasQueryData: queryState?.data !== undefined,
  });
  const viewState: MapLayerViewState = {
    ...makeLayerViewState({
      layer,
      hasBinding: layer.geoBinding !== undefined,
      geometry,
      queryState,
      audit:
        queryState?.data?.type === "rows" ? queryState.data.audit : undefined,
      aggregation,
    }),
    classifiedValueDomain: valueDomain,
  };
```

(`MapLayerViewState` is already imported as a type on line 17.)

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/views/GisApp/layers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/layers/useAvaMapRender src/views/GisApp/layers/MapLayerViewState.types.ts
git commit -m "feat(gis): expose the classified value range on the layer view state"
```

---

### Task 8: Ramp presets and the Reverse button

Before this task and Tasks 9-10, read `docs/design/app-view-layout.md`, the Named Rules in `DESIGN.md`, and `docs/design/gis/feature-home-inventory.md` §1.2 (the classification editor is reached from the inspector's ramp row; editing stays in the inspector).

**Files:**
- Modify: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedRampSelect.tsx` (whole file)
- Test: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add after `_createLayer` in `ClassificationEditor.test.tsx`:

```ts
type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

function _withGraduatedColor(
  layer: MapLayer.T,
  overrides: Partial<GraduatedColor>,
): MapLayer.T {
  if (
    layer.symbology.type !== "fill" ||
    layer.symbology.color.type !== "graduated"
  ) {
    throw new Error("Expected a graduated fill layer");
  }
  return {
    ...layer,
    symbology: {
      ...layer.symbology,
      color: { ...layer.symbology.color, ...overrides },
    },
  };
}
```

Add inside `describe("ClassificationEditor")`:

```ts
  it("names a reversed preset in the color ramp select", () => {
    boundarySourceState.options = [];
    const layer = _withGraduatedColor(_createLayer(), {
      ramp: ["#08306b", "#2171b5", "#6baed6", "#bdd7e7", "#eff3ff"],
    });
    render(
      <ClassificationEditor layer={layer} onLayerChange={vi.fn()} onBack={vi.fn()} />,
    );

    expect(screen.getByRole("combobox", { name: "Color ramp" })).toHaveValue(
      "Blue",
    );
  });

  it("shows custom colors when the ramp matches no preset", () => {
    boundarySourceState.options = [];
    const layer = _withGraduatedColor(_createLayer(), {
      ramp: ["#d7301f", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
    });
    render(
      <ClassificationEditor layer={layer} onLayerChange={vi.fn()} onBack={vi.fn()} />,
    );

    const rampSelect = screen.getByRole("combobox", { name: "Color ramp" });
    expect(rampSelect).toHaveValue("");
    expect(rampSelect).toHaveAttribute("placeholder", "Custom colors");
  });

  it("fills every class from the picked red preset", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor layer={layer} onLayerChange={onLayerChange} onBack={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Color ramp" }));
    fireEvent.click(screen.getByRole("option", { name: "Red", hidden: true }));

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color.ramp).toEqual([
      "#fee5d9",
      "#fcae91",
      "#fb6a4a",
      "#de2d26",
      "#a50f15",
    ]);
  });

  it("reverses the class colors from the Reverse colors button", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor layer={layer} onLayerChange={onLayerChange} onBack={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reverse colors" }));

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color.ramp).toEqual([
      "#08306b",
      "#2171b5",
      "#6baed6",
      "#bdd7e7",
      "#eff3ff",
    ]);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector/ClassificationEditor`
Expected: FAIL for three of the four. The reversed-preset test already passes because the old `ramp[0]` check falls back to "Blue" for any ramp; it stays as a guard. The custom-colors test fails with value "Blue", there is no "Red" option, and there is no "Reverse colors" button.

- [ ] **Step 3: Rewrite `GraduatedRampSelect.tsx`**

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Select } from "@mantine/core";
import { IconArrowsLeftRight } from "@tabler/icons-react";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { GraduatedRampPresetKey } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  color: Extract<MapLayer.Color, { type: "graduated" }>;
  onLayerChange: LayerChangeHandler;
};

function _isPresetKey(value: string | null): value is GraduatedRampPresetKey {
  return value !== null && value in GraduatedRamps.presets;
}

/**
 * Picks a preset color ramp for graduated symbology and reverses the class
 * colors. A ramp that matches no preset, because a class color was edited,
 * shows as custom colors until a preset is picked again.
 */
export function GraduatedRampSelect({
  color,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Group gap="xs" align="flex-end" wrap="nowrap">
      <Select
        flex={1}
        label={t`Color ramp`}
        placeholder={t`Custom colors`}
        data={[
          { value: "blue", label: t`Blue` },
          { value: "orange", label: t`Orange` },
          { value: "red", label: t`Red` },
          { value: "redBlue", label: t`Red to blue` },
          { value: "threshold", label: t`Threshold` },
        ]}
        value={GraduatedRamps.findPreset(color.ramp)?.key ?? null}
        allowDeselect={false}
        onChange={(value) => {
          if (!_isPresetKey(value)) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withRampPreset({
              layer: current,
              presetKey: value,
            });
          });
        }}
      />
      <ActionIcon
        variant="default"
        size="input-sm"
        aria-label={t`Reverse colors`}
        onClick={() => {
          onLayerChange(MapLayerUpdates.withReversedRamp);
        }}
      >
        <IconArrowsLeftRight size={16} aria-hidden />
      </ActionIcon>
    </Group>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector/ClassificationEditor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedRampSelect.tsx src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx
git commit -m "feat(gis): pick and reverse graduated ramp presets"
```

---

### Task 9: A color swatch and a label for each class

**Files:**
- Create: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassList.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassRow.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassList.module.css`
- Modify: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedControls.tsx:1-5`, `:45`
- Test: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add inside `describe("ClassificationEditor")`:

```ts
  it("shows one label input per class", () => {
    boundarySourceState.options = [];
    render(
      <ClassificationEditor layer={_createLayer()} onLayerChange={vi.fn()} onBack={vi.fn()} />,
    );

    expect(
      screen.getAllByRole("textbox", { name: /^Class \d label$/ }),
    ).toHaveLength(5);
  });

  it("shows the generated interval as a class label placeholder", () => {
    boundarySourceState.options = [];
    render(
      <ClassificationEditor layer={_createLayer()} onLayerChange={vi.fn()} onBack={vi.fn()} />,
    );

    expect(
      screen.getByRole("textbox", { name: "Class 1 label" }),
    ).toHaveAttribute("placeholder", "< 10");
  });

  it("writes a typed label to its class", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor layer={layer} onLayerChange={onLayerChange} onBack={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Class 2 label" }), {
      target: { value: "95% or above" },
    });

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color.classLabels).toEqual([
      undefined,
      "95% or above",
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("writes a picked swatch color to its class", async () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor layer={layer} onLayerChange={onLayerChange} onBack={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Class 1 color" }));
    fireEvent.click(await screen.findByRole("button", { name: "#d7301f" }));

    const updated = onLayerChange.mock.calls.at(-1)![0](layer);
    expect(updated.symbology.color.ramp).toEqual([
      "#d7301f",
      "#bdd7e7",
      "#6baed6",
      "#2171b5",
      "#08306b",
    ]);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector/ClassificationEditor`
Expected: FAIL with `Unable to find an accessible element with the role "textbox" and name "Class 1 label"`.

- [ ] **Step 3: Write the row, the list, and the styles**

`GraduatedClassList.module.css`:

```css
.graduatedClassRow {
  align-items: center;
  display: flex;
  gap: var(--mantine-spacing-xs);
}

/* Same footprint as an `sm` input, so the swatch lines up with its label. */
.graduatedClassSwatch {
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  flex: none;
  height: calc(2.25rem * var(--mantine-scale));
  width: calc(2.25rem * var(--mantine-scale));
}

.graduatedClassLabel {
  flex: 1;
}
```

`GraduatedClassRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ColorPicker, Popover, TextInput, UnstyledButton } from "@mantine/core";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import css from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassList.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The class's 1-based position, used in its accessible names. */
  classNumber: number;
  color: string;
  label: string | undefined;

  /** The interval label the legend shows while `label` is unset. */
  generatedLabel: string;
  onColorChange: (color: string) => void;
  onLabelChange: (label: string) => void;
};

/**
 * One graduated class: a swatch that opens a color picker offering the
 * preset colors, and a text input for the class's legend label.
 */
export function GraduatedClassRow({
  classNumber,
  color,
  label,
  generatedLabel,
  onColorChange,
  onLabelChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.graduatedClassRow}>
      <Popover position="bottom-start" trapFocus>
        <Popover.Target>
          <UnstyledButton
            className={css.graduatedClassSwatch}
            aria-label={t`Class ${classNumber} color`}
            style={{ backgroundColor: color }}
          />
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <ColorPicker
            format="hex"
            defaultValue={color}
            swatches={[...GraduatedRamps.swatchColors]}
            swatchesPerRow={7}
            onChangeEnd={onColorChange}
          />
        </Popover.Dropdown>
      </Popover>
      <TextInput
        className={css.graduatedClassLabel}
        aria-label={t`Class ${classNumber} label`}
        placeholder={generatedLabel}
        value={label ?? ""}
        onChange={(event) => {
          onLabelChange(event.currentTarget.value);
        }}
      />
    </div>
  );
}
```

`GraduatedClassList.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Fieldset, Stack } from "@mantine/core";
import { legendBreakToLabel } from "@/views/GisApp/layers/classifyLayerValues/classifyLayerValues";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { GraduatedClassRow } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassRow";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  color: Extract<MapLayer.Color, { type: "graduated" }>;
  onLayerChange: LayerChangeHandler;
};

/**
 * Edits each graduated class's color and legend label, one row per class.
 * A label left blank shows the class's generated interval in the legend.
 */
export function GraduatedClassList({
  layer,
  color,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Fieldset legend={t`Class colors`} variant="unstyled">
      <Stack gap="xs">
        {color.ramp.map((classColor, classIndex) => {
          const classNumber = classIndex + 1;
          const legendBreak = layer.legend.breaks[classIndex];
          return (
            <GraduatedClassRow
              key={classIndex}
              classNumber={classNumber}
              color={classColor}
              label={color.classLabels[classIndex]}
              generatedLabel={
                legendBreak
                  ? legendBreakToLabel(legendBreak)
                  : t`Class ${classNumber}`
              }
              onColorChange={(nextColor) => {
                onLayerChange((current) => {
                  return MapLayerUpdates.withClassColor({
                    layer: current,
                    classIndex,
                    color: nextColor,
                  });
                });
              }}
              onLabelChange={(nextLabel) => {
                onLayerChange((current) => {
                  return MapLayerUpdates.withClassLabel({
                    layer: current,
                    classIndex,
                    label: nextLabel,
                  });
                });
              }}
            />
          );
        })}
      </Stack>
    </Fieldset>
  );
}
```

In `GraduatedControls.tsx`, add the import

```ts
import { GraduatedClassList } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedClassList/GraduatedClassList";
```

and render the list directly after `<GraduatedRampSelect ... />` (line 45):

```tsx
      <GraduatedClassList
        layer={layer}
        color={color}
        onLayerChange={onLayerChange}
      />
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector/ClassificationEditor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/panels/LayerInspector/ClassificationEditor
git commit -m "feat(gis): edit each graduated class's color and legend label"
```

---

### Task 10: "Highlight values below" shortcut with the fraction rule

**Files:**
- Create: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/HighlightValuesBelowInput.tsx`
- Modify: `.../GraduatedControls/GraduatedMethodControls.tsx:12-18`, `:55-95`
- Modify: `.../GraduatedControls/GraduatedControls.tsx:12-17`, `:26-44`
- Modify: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.tsx:12-16`, `:32-56`
- Modify: `src/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorFocusedView.tsx:37-44`
- Test: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
  it("stores a typed percent as a fraction when every value is a fraction", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        classifiedValueDomain={[0.62, 1]}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Highlight values below" }),
      { target: { value: "95" } },
    );

    const updated = onLayerChange.mock.calls.at(-1)![0](layer);
    expect(updated.symbology.color).toMatchObject({
      classification: { method: "manual", breaks: [0.95] },
      ramp: ["#d7301f", "#d9d9d9"],
      classLabels: ["Below 95%", "95% or above"],
    });
  });

  it("stores the typed number as is when values are not fractions", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        classifiedValueDomain={[3, 410]}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Highlight values below" }),
      { target: { value: "100" } },
    );

    const updated = onLayerChange.mock.calls.at(-1)![0](layer);
    expect(updated.symbology.color).toMatchObject({
      classification: { method: "manual", breaks: [100] },
      classLabels: ["Below 100", "100 or above"],
    });
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector/ClassificationEditor`
Expected: FAIL. `tsc` would also reject the unknown `classifiedValueDomain` prop; Vitest reports `Unable to find an accessible element with the role "textbox" and name "Highlight values below"`.

- [ ] **Step 3: Write the input**

`HighlightValuesBelowInput.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { useState } from "react";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  /** Lowest and highest classified value, when the layer has classified. */
  classifiedValueDomain: readonly [number, number] | undefined;
  onLayerChange: LayerChangeHandler;
};

/** True when every classified value lies between 0 and 1. */
function _isFractionDomain(
  domain: readonly [number, number] | undefined,
): boolean {
  return domain !== undefined && domain[0] >= 0 && domain[1] <= 1;
}

/**
 * A shortcut that flags every value below one number. It writes ordinary
 * fields: a manual classification with that single break, the threshold
 * colors, and "Below" and "or above" class labels. When every classified
 * value is a fraction, the number is typed as a percent and stored as a
 * fraction, so 95 flags values below 0.95.
 */
export function HighlightValuesBelowInput({
  classifiedValueDomain,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const [typedValue, setTypedValue] = useState<number | string>("");
  const isFraction = _isFractionDomain(classifiedValueDomain);
  return (
    <NumberInput
      label={t`Highlight values below`}
      description={
        isFraction
          ? t`These values are fractions, so type a percent such as 95.`
          : undefined
      }
      rightSection={isFraction ? t`%` : undefined}
      value={typedValue}
      onChange={(value) => {
        setTypedValue(value);
        if (typeof value !== "number") {
          return;
        }
        const threshold = String(value);
        const belowLabel = isFraction
          ? t`Below ${threshold}%`
          : t`Below ${threshold}`;
        const aboveLabel = isFraction
          ? t`${threshold}% or above`
          : t`${threshold} or above`;
        const breakValue = isFraction ? value / 100 : value;
        onLayerChange((current) => {
          return MapLayerUpdates.withHighlightBelow({
            layer: current,
            breakValue,
            belowLabel,
            aboveLabel,
          });
        });
      }}
    />
  );
}
```

- [ ] **Step 4: Wire the domain through**

`GraduatedMethodControls.tsx`: add the import

```ts
import { HighlightValuesBelowInput } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/HighlightValuesBelowInput";
```

add to `Props` (after `manualBreaks`): `classifiedValueDomain: readonly [number, number] | undefined;`, destructure `classifiedValueDomain` in the component, and render between the method `<Select ... />` and `<GraduatedClassCountControl ... />`:

```tsx
      <HighlightValuesBelowInput
        classifiedValueDomain={classifiedValueDomain}
        onLayerChange={onLayerChange}
      />
```

`GraduatedControls.tsx`: add `classifiedValueDomain: readonly [number, number] | undefined;` to `Props`, destructure it, and pass `classifiedValueDomain={classifiedValueDomain}` to `<GraduatedMethodControls>`.

`ClassificationEditor.tsx`: add to `Props`

```ts
  /** Lowest and highest classified value, from the layer's view state. */
  classifiedValueDomain?: readonly [number, number];
```

destructure `classifiedValueDomain` in the component signature, and pass `classifiedValueDomain={classifiedValueDomain}` to `<GraduatedControls>`.

`LayerInspectorFocusedView.tsx` (lines 38-44):

```tsx
      <ClassificationEditor
        layer={layer}
        classifiedValueDomain={viewState?.classifiedValueDomain}
        onLayerChange={onLayerChange}
        onBack={onCloseMatchReport}
      />
```

- [ ] **Step 5: Run the tests and the type check**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector`
Expected: PASS.

Run: `pnpm tsc -b --force`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp/panels/LayerInspector
git commit -m "feat(gis): add the highlight values below shortcut"
```

---

### Task 11: Translations, formatting, lint, and the GIS suite

**Files:**
- Regenerate: `src/i18n/locales/*/messages.po`

- [ ] **Step 1: Extract the new strings**

Run: `pnpm i18n:extract`
Expected: `src/i18n/locales/en/messages.po` gains `Class colors`, `Class {classNumber} color`, `Class {classNumber} label`, `Class {classNumber}`, `Custom colors`, `Red`, `Red to blue`, `Threshold`, `Reverse colors`, `Highlight values below`, `These values are fractions, so type a percent such as 95.`, `%`, `Below {threshold}%`, `{threshold}% or above`, `Below {threshold}`, `{threshold} or above`, each with a `#:` reference to the new files.

- [ ] **Step 2: Format and lint**

Run: `pnpm format`
Run: `pnpm eslint shared/models/AvaMap src/views/GisApp`
Expected: no errors. Fix any function over 45 lines or naming finding before continuing.

- [ ] **Step 3: Type check and run every touched unit suite**

Run: `pnpm tsc -b --force`
Run: `pnpm vitest run shared/models/AvaMap src/views/GisApp src/clients/maps`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A src/i18n/locales shared/models/AvaMap src/views/GisApp
git commit -m "chore(i18n): extract the class color strings"
```

---

### Task 12: E2E: a ZIP choropleth whose legend reads "Below 95%"

**Files:**
- Create: `tests/e2e/gis-threshold-colors.spec.ts`

Preconditions: Task 0 Step 4 loaded the mirror-catalog listings into the local stack this worktree uses. The listings are looked up by Socrata id as an oracle read. Everything the user does (adding the two listings to the workspace, binding the layer, the shortcut) goes through the UI. The map is seeded empty before the first page load, and the map and both datasets are deleted in `finally`.

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { parseDatasetIdFromDataManagerUrl } from "./helpers/manualUploadCloudSyncFlow";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Locator, Page } from "@playwright/test";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

const MAP_NAME = "E2E GIS threshold colors";

/** Socrata id of the mirrored Modified ZIP Code Tabulation Areas. */
const MODZCTA_DATASET_ID = "pri4-ifjk";

/** Socrata id of the mirrored School Immunization Survey, 2019-20 onward. */
const SCHOOL_SURVEY_DATASET_ID = "btkd-y8bp";

async function _selectOption(
  page: Page,
  scope: Locator,
  label: string,
  option: string,
): Promise<void> {
  await scope.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** A mirrored listing's catalog name with whitespace collapsed, if loaded. */
async function _getListingName(
  admin: AdminClient,
  externalDatasetId: string,
): Promise<string | undefined> {
  const { data, error } = await admin
    .from("data_catalog_listings")
    .select("display_name")
    .eq("external_dataset_id", externalDatasetId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`listing lookup ${externalDatasetId}: ${error.message}`);
  }
  return data?.display_name?.replace(/\s+/g, " ");
}

/** Adds one open data listing through the catalog and returns its dataset id. */
async function _addListingToWorkspace(
  options: Readonly<{ page: Page; workspaceSlug: string; listingName: string }>,
): Promise<string> {
  const { page, workspaceSlug, listingName } = options;
  await page.getByRole("link", { name: "Data Sources" }).click();
  await page.getByRole("button", { name: "Add new dataset" }).click();
  await page.getByRole("tab", { name: "Open data" }).click();
  await page
    .getByRole("textbox", { name: "Search open data" })
    .fill(listingName, { timeout: LONG_WAIT });
  await page
    .getByRole("region", { name: "Results" })
    .getByRole("listbox", { name: "Open datasets" })
    .getByRole("option", { name: listingName })
    .click();
  await page.getByRole("button", { name: "Add dataset to workspace" }).click();
  await expect(page.getByText("Dataset added")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await page.getByRole("link", { name: listingName }).click();
  await page.waitForURL(/\/data-manager\/[0-9a-f-]{36}/i);
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (!datasetId) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  return datasetId;
}

test("labels the classes below and above 95% in a ZIP choropleth legend", async ({
  page,
  e2eWorkerDb,
}) => {
  const admin = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  const modzctaName = await _getListingName(admin, MODZCTA_DATASET_ID);
  const schoolSurveyName = await _getListingName(
    admin,
    SCHOOL_SURVEY_DATASET_ID,
  );
  if (modzctaName === undefined || schoolSurveyName === undefined) {
    test.skip(true, "Load the Workflow B mirror-catalog listings first.");
    return;
  }
  const datasetIds: string[] = [];
  let mapId = "";
  try {
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    mapId = await seedAvaMap({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
      name: MAP_NAME,
    });
    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });
    for (const listingName of [modzctaName, schoolSurveyName]) {
      datasetIds.push(
        await _addListingToWorkspace({ page, workspaceSlug, listingName }),
      );
    }

    await page.getByRole("link", { name: "Maps" }).click();
    await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
    const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
    await mapRegion.getByRole("button", { name: "Add a layer" }).click();
    await page.getByPlaceholder("Search data sources").click();
    await page.getByRole("option", { name: schoolSurveyName }).click();

    const inspector = page.getByRole("region", { name: "Layer" });
    await _selectOption(page, inspector, "Geometry", "Aggregate points to boundaries");
    await _selectOption(page, inspector, "Point geometry", "Point geometry column");
    await _selectOption(page, inspector, "Point geometry column", "location");
    await _selectOption(page, inspector, "Boundary dataset", modzctaName);
    await _selectOption(page, inspector, "Boundary geometry column", "the_geom");
    await _selectOption(page, inspector, "Boundary key column", "modzcta");
    await _selectOption(page, inspector, "Aggregation", "Average");
    await _selectOption(page, inspector, "Measure", "percent_immunized_measles");
    await inspector.getByRole("button", { name: "Edit classification" }).click();
    await _selectOption(page, inspector, "Color mode", "Graduated");

    // The shortcut can tell fractions from percents only once the layer has
    // classified its values, which is when the legend first lists a class.
    const legend = page.getByRole("region", { name: "Legend" });
    await expect(legend.getByRole("listitem").first()).toBeVisible({
      timeout: LONG_WAIT,
    });
    await inspector
      .getByRole("textbox", { name: "Highlight values below" })
      .fill("95");

    await expect(legend.getByText("Below 95%", { exact: true })).toBeVisible({
      timeout: LONG_WAIT,
    });
    await expect(
      legend.getByText("95% or above", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: ".temp/feat-gis-threshold-colors/threshold-legend.png",
    });
    await expect(
      page.getByRole("status", { name: "All changes saved" }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await page.reload();
    await expect(legend.getByText("Below 95%", { exact: true })).toBeVisible({
      timeout: LONG_WAIT,
    });
  } finally {
    await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
    for (const datasetId of datasetIds) {
      await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
    }
  }
});
```

- [ ] **Step 2: Run it**

Run: `pnpm test:e2e gis-threshold-colors.spec.ts`
Expected: PASS within the local 45 s per-test limit. Do not raise the limit: if adding the two listings or the spatial aggregation is slow, record the timing and report it instead.

If it fails, it fails at the step whose UI was not verifiable while writing this plan (see Self-review). Fix the locator, not the product, unless the product is wrong.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/gis-threshold-colors.spec.ts
git commit -m "test(gis): assert a ZIP choropleth legend reads Below 95%"
```

---

### Task 13: Log the feature

Do this only after the branch is merged into `demo/measles` with Pablo's explicit go-ahead.

**Files:**
- Modify: `docs/measles-demo/pr-feature-log.md` (on `demo/measles`)

- [ ] **Step 1: List the commits**

Run: `git log --format='%h %s' demo/measles -- shared/models/AvaMap src/views/GisApp/layers/GraduatedRamps src/views/GisApp/layers/MapLayerUpdates/graduatedColorUpdates.ts tests/e2e/gis-threshold-colors.spec.ts | head -20`

- [ ] **Step 2: Add the entry**

Add a section named `Threshold colors (map config version 6)` with: status `not started`, depends on none, PR title `feat(gis): threshold colors with per-class colors and labels`, every commit hash from Step 1 with its files, the file list from this plan's File structure table, the regenerate-not-copy note for `src/i18n/locales/*`, and the verification commands from Task 11 plus `pnpm test:e2e gis-threshold-colors.spec.ts`. Add each commit to the Branch coverage checklist.

- [ ] **Step 3: Commit**

```bash
git add docs/measles-demo/pr-feature-log.md
git commit -m "docs(measles-demo): log the threshold colors feature"
```

---

## Self-review

### Spec coverage

| Spec bullet (§3) | Task |
| --- | --- |
| 3.1 One break at 95 gives red "Below 95%" and neutral "95% or above" in legend and PDF | 5, 6, 10, 12 |
| 3.2 `ramp` holds exactly one color per class; a preset is a UI action that rewrites it | 2, 4, 5, 8 |
| 3.2 `classLabels: readonly (string \| undefined)[]`, `undefined` keeps the generated label | 2, 3, 6 |
| 3.2 Changing the class count resamples from the preset it came from, or from hand-edited colors | 4, 5 |
| 3.2 Evenly spaced stops: two classes get lightest and darkest | 1, 4, 5 |
| 3.2 Changing the class count resets `classLabels` | 4 |
| 3.2 `classifyLayerValues` uses `ramp[index]` and `classLabels[index] ?? generatedLabel` | 6 |
| 3.2 Persisted `LegendConfig.entries` carry the label, so live map, PDF, and embed match | 6 (no export change: `getExportLegendEntries` already prints `entry.label`, and `PersistedLayerLegends` refingerprints on any symbology change) |
| 3.2 Migration resamples every graduated ramp to its class count | 3 |
| 3.3 Presets `red`, `redBlue`, `threshold` (`#d7301f`, `#d9d9d9`) added to `blue`, `orange` | 4, 8 |
| 3.3 Reverse action next to the select | 5, 8 |
| 3.4 `GraduatedRampSelect` gets the new presets and a Reverse icon button | 8 |
| 3.4 Swatch opening `ColorPicker` with preset swatches, and a label input with the generated placeholder, per class | 9 (in `GraduatedClassList`, not `ClassificationBreakList`: see Design decisions) |
| 3.4 "Highlight values below": manual single break, threshold preset, `Below {value}` and `{value} or above` | 5, 10 |
| 3.4 Fractions: all values in [0, 1] means type 95, store 0.95, labels `Below 95%` and `95% or above` | 6, 7, 10 |
| 3.5 Unit: resampling 2, 3, 5, 7 classes from a 5-color preset | 1 |
| 3.5 Unit: label reset on class-count change | 4 |
| 3.5 Unit: `classifyLayerValues` uses labels | 6 |
| 3.5 Unit: migration of a 5-color ramp with 2 manual classes | 3 |
| 3.5 Component: editing a swatch and a label updates the layer and the legend | 9 (layer); the legend half follows from Task 6's label tests plus the existing `withLayerColor` legend-clearing test |
| 3.5 E2E: ZIP choropleth with "Highlight values below 95", legend reads "Below 95" | 12 (asserts the exact fraction-mode label "Below 95%") |

### Could not verify in code

1. zod 4 typing of `.options` on `CircleSymbologySchema.shape.color` and `AvaMapConfigV5LayerSchema` as destructurable tuples. Task 3 Step 6 gives the fallback.
2. Mantine 9 `Popover` and `ColorPicker` in jsdom: the swatch test assumes an uncontrolled `Popover` opens on target click and that each preset swatch is a button whose accessible name is its hex (confirmed in `Swatches.mjs`, `aria-label: color`, `onChangeEnd` on click). The open-on-click behavior is assumed from `StatusColorPicker.test.tsx`, which uses a controlled `Popover`.
3. `fireEvent.change` on a Mantine `NumberInput` with a `rightSection` calls `onChange` with a number. Assumed from `CrsOverrideField.test.tsx`, whose input has no right section.
4. E2E catalog flow for these API-resource listings: that "Data Sources" then "Add new dataset" shows an "Open data" tab, that the added dataset's name in "Search data sources" and "Boundary dataset" equals the listing's display name (the school survey name has a double space in the catalog, collapsed by `_getListingName`), and that the WKT `location` and `the_geom` columns need no "Encoding" choice. The column types are confirmed from the mirror's `relation_columns.json`: `percent_immunized_measles` is `DOUBLE`, `location`, `the_geom`, and `modzcta` are `VARCHAR`.
5. Whether adding 5,026 survey rows and a statewide-to-MODZCTA spatial average fits the local 45 s e2e limit.
6. That every MODZCTA average lands in [0, 1]. The survey stores fractions, so an average should, unless a source row carries a percent by mistake. If one does, the input stays in number mode and the legend reads "Below 95".
7. The pr-feature-log entry's commit list exists only after the merge, so Task 13 gives the command that produces it rather than the hashes.
