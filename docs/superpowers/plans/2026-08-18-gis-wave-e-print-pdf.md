# GIS Wave E: print and PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted export layout, disputed-boundary rendering on screen
and on the page, and a PDF download whose map frame matches the on-screen
camera and carries no authoring chrome.

**Architecture:** `AvaMapConfig` advances to version 5 with an `exportLayout`
object; each `MapLayer` gains `disputedStatusColumn` and
`disputedStatusValues`. The disputed status reaches MapLibre as an ordinary
feature property (no new `ST_*`), and the renderer paints a dashed grey casing
layer above the layer's own outline. Export is a sheet that writes
`exportLayout`, plus a pipeline that mounts a second offscreen MapLibre map
with `preserveDrawingBuffer`, snapshots its canvas at 200 dpi, and composes it
with hardcoded light furniture into `jsPDF`.

**Tech Stack:** TypeScript, React 19, MapLibre GL JS, `jspdf` (already a
dependency), TanStack Query, Mantine, Lingui, Zod, Vitest, Testing Library,
Playwright. No new npm dependency. No Supabase schema or database change.

**Approved design:**
`docs/superpowers/specs/2026-08-18-gis-wave-e-print-pdf-design.md`

## Global Constraints

- Read and follow `AGENTS.md`, `docs/rules/typescript.md`,
  `docs/rules/testing.md`, `docs/rules/e2e-testing.md`, `docs/rules/css.md`,
  `docs/rules/i18n.md`, and `docs/rules/sql.md` before implementation.
- Use red/green TDD. Add a failing behavioral test before each production
  behavior, run it to confirm the intended failure, implement only enough to
  pass, then rerun the focused file.
- Keep every function at 45 lines or fewer. Exported interfaces need
  docstrings. Non-exported top-level helpers use an underscore prefix.
- `shared/**` imports use explicit `.ts` extensions. `src/**` imports omit
  them.
- Import models through their namespace entry, except inside the model's own
  folder. Do not add barrels.
- Do not manually edit generated `*.gen.*` files or Lingui `messages.ts`
  files.
- All user-visible copy uses Lingui. Persisted author strings (title, subtitle,
  source line, custom disclaimer) are **not** passed through Lingui.
- Use CSS Modules and Mantine tokens for on-screen surfaces. The PDF furniture
  layout hardcodes light colors and is not themed.
- Do not add a geospatial npm dependency. Do not emit any new `ST_*` function.
  The disputed status is a selected attribute, exactly like the classification
  and denominator columns already are.
- Do not add a Supabase migration, schema file, database type change, RPC, or
  production database write.
- Do not add public map routes, a Map PBlock, isochrones, offline basemaps, a
  browser print dialog, or a PNG export.
- Aggregate only must never produce GeoJSON points or MapLibre `circle`,
  `symbol`, `cluster`, or `heatmap` layers, including inside the export spec.
- A control becomes usable only when its model, execution, diagnostics,
  rendering, and focused tests are present. The Export button stays
  `aria-disabled` with the later-release reason until Task 18.
- Run Playwright specs one file at a time. Keep local timeouts at 45 seconds or
  less. Every database mutation in a spec must be cleaned up in `finally`.
- The commit commands in this plan are review checkpoint suggestions. Do not
  run them unless the user separately authorizes commits.

## Deviation from the design document

Spec §4.3 types `disputedStatusColumn` as `QueryColumn.Id | undefined`, but
§4.4 requires the column to come from the **boundary** dataset for
`joinToBoundaries` and `aggregatePointsToBoundaries`. Boundary columns are
`DatasetColumn.Id`, not `QueryColumn.Id` (see `BoundarySourceRef` in
`shared/models/AvaMap/MapLayer/GeoBinding.types.ts`), so a single
`QueryColumn.Id` cannot express both cases.

This plan resolves that by persisting a discriminated reference, mirroring the
`NormalizationRef` shape that already exists for the graduated denominator and
already has a resolver and a rebind path:

```ts
type DisputedStatusRef =
  | { type: "queryColumn"; column: QueryColumn.Id }
  | { type: "boundaryColumn"; column: DatasetColumn.Id };
```

Every other requirement of §4.3 and §4.4 is unchanged: unset means all settled,
the arrays must be disjoint, the bound column must be text, and the bind is
offered only on the eligible symbologies and bindings.

---

## File structure

Create these files. Existing files listed under each task are modified in
place. Do not introduce barrels.

| File                                                                                                        | Responsibility                                        |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `shared/models/AvaMap/AvaMapConfig/ExportLayout.types.ts`                                                   | `ExportLayout`, paper, orientation types               |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts`                              | Version 5 Zod schema                                   |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.ts`          | Immutable `exportLayout` updates                       |
| `shared/models/AvaMap/MapLayer/DisputedStatus.types.ts`                                                     | `DisputedStatusRef`, `DisputedStatusValues`            |
| `shared/models/AvaMap/MapLayer/MapLayerModule/disputedStatusHelpers.ts`                                     | Eligibility and disjointness predicates                |
| `src/views/GisApp/layers/MapLayerUpdates/disputedStatusUpdates.ts`                                          | Inspector updaters for the bind                        |
| `src/views/GisApp/layers/DisputedBoundary/DisputedBoundary.ts`                                              | Property name, casing colors, classification           |
| `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeDisputedCasingLayerSpec.ts` | Dashed casing `MapLayerSpec`                           |
| `src/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedStatusControls.tsx`      | Column select plus the two value multi-selects         |
| `src/views/GisApp/panels/LegendPanel/MapLegend/DisputedLegendRow/DisputedLegendRow.tsx`                     | Locked legend row                                      |
| `src/views/GisApp/export/ExportPageLayout/ExportPageLayout.ts`                                              | Millimetre geometry for both orientations              |
| `src/views/GisApp/export/makeExportMapSpec/makeExportMapSpec.ts`                                            | Chrome-free export `MapSpec`                           |
| `src/views/GisApp/export/getExportFilterReadout/getExportFilterReadout.ts`                                  | Derived time and AOI disclosure                        |
| `src/views/GisApp/export/getExportFurnitureText/getExportFurnitureText.ts`                                  | Title, subtitle, source-line fallbacks                 |
| `src/views/GisApp/export/getExportFilename/getExportFilename.ts`                                            | `{title}-{yyyy-mm-dd}.pdf`                             |
| `src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.ts`                                  | Offscreen MapLibre mount, idle wait, snapshot          |
| `src/views/GisApp/export/composeExportPdf/composeExportPdf.ts`                                              | `jsPDF` composition and paging                         |
| `src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.ts`                                      | Download orchestration and status                      |
| `src/views/GisApp/export/ExportSheet/ExportSheet.tsx`                                                       | The sheet, sole writer of `exportLayout`               |
| `src/views/GisApp/export/ExportSheet/ExportSheetControls.tsx`                                               | Paper, orientation, text, furniture toggles            |
| `src/views/GisApp/export/ExportSheet/ExportSheetNotices.tsx`                                                | Aggregate-only, dark-basemap, filter readout           |
| `src/views/GisApp/export/ExportSheet/ExportSheetPreview.tsx`                                                | Scaled preview using the same composition              |
| `tests/data/gis-wave-e/disputed-boundaries.csv`                                                             | Polygon fixture with a disputed-status column          |
| `tests/e2e/gis-disputed-boundaries.spec.ts`                                                                 | Slice 8.5 test 1                                       |
| `tests/e2e/gis-export-layout.spec.ts`                                                                       | Slice 8.5 test 2                                       |
| `tests/e2e/gis-export-pdf.spec.ts`                                                                          | Slice 8.5 test 3                                       |

## Defaults (use these exact values)

Put these on `AvaMapConfigModule`, beside `GisWaveDDefaults`. Do not add a
second constants file.

```ts
export const GisWaveEDefaults = {
  paper: "a4",
  orientation: "landscape",
  marginMm: 12,
  legendColumnWidthMm: 56,
  exportDpi: 200,
  idleTimeoutMs: 15_000,
} as const;
```

Paper sizes, in millimetres, portrait orientation:

```ts
export const ExportPaperSizesMm = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
} as const;
```

Disputed casing ink (shell §6.7 suppressed texture ink):

```ts
export const DisputedCasingColors = {
  light: "#555555",
  dark: "#b7b7b7",
} as const;
export const DISPUTED_DASHARRAY = [3, 2] as const;
```

Reserved feature property, alongside `MapLayerSpatialFeatureProperties`:

```ts
disputedStatus: "__avandar_disputed_status";
```

Its emitted values are the literals `"disputed"`, `"undetermined"`, and
`"settled"`. The renderer treats anything else, including a missing property
and `null`, as `"settled"`.

---

## Stage 1: persisted contracts (slice 7.1)

### Task 1: Export layout and disputed types

**Files:**

- Create: `shared/models/AvaMap/AvaMapConfig/ExportLayout.types.ts`
- Create: `shared/models/AvaMap/MapLayer/DisputedStatus.types.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.ts`

This task is type-only; its behavior is proven by Task 2's schema tests. Do not
write a test that only asserts types compile.

- [ ] **Step 1: Write the export layout types**

Create `shared/models/AvaMap/AvaMapConfig/ExportLayout.types.ts`:

```ts
/** Paper sizes the export sheet offers. */
export type ExportPaper = "a4" | "letter";

/** Page orientations the export sheet offers. */
export type ExportOrientation = "landscape" | "portrait";

/** One optional header line: whether it prints, and the author's text. */
export type ExportHeaderLine = { isVisible: boolean; text: string };

/**
 * Persisted export furniture. Reopening Export shows the last sitrep, so two
 * exports of one saved map cannot disagree.
 *
 * Empty `title.text`, `subtitle.text`, and `sourceLine` mean "use the live
 * fallback"; the sheet shows that fallback as a placeholder. `disclaimer`
 * unset means the Lingui default at display time, which is why `""` is
 * rejected rather than stored: a blank disclaimer must be impossible.
 *
 * The camera and the production date are deliberately absent. The camera is
 * whatever is on screen, and the date is the instant of download, so a
 * forwarded sitrep cannot look like it was produced at save time.
 */
export type ExportLayout = {
  paper: ExportPaper;
  orientation: ExportOrientation;
  title: ExportHeaderLine;
  subtitle: ExportHeaderLine;
  northArrow: boolean;
  scaleBar: boolean;
  sourceLine: string;
  disclaimer: string | undefined;
};
```

- [ ] **Step 2: Write the disputed status types**

Create `shared/models/AvaMap/MapLayer/DisputedStatus.types.ts`:

```ts
import type {
  DatasetColumn, // prettier-ignore
} from "$/models/datasets/DatasetColumn/DatasetColumn.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/**
 * Where a layer's disputed-status values come from.
 *
 * Boundary bindings read the status from the boundary dataset rather than the
 * point source, because the boundary is the thing whose line is disputed.
 */
export type DisputedStatusRef =
  | { type: "queryColumn"; column: QueryColumn.Id }
  | { type: "boundaryColumn"; column: DatasetColumn.Id };

/**
 * Which source values mean disputed and which mean undetermined. The two
 * arrays must be disjoint. Every other value, including null and values absent
 * from the column, is settled.
 */
export type DisputedStatusValues = {
  disputed: readonly string[];
  undetermined: readonly string[];
};

/** How one feature's boundary line is drawn. */
export type DisputedStatus = "disputed" | "undetermined" | "settled";
```

- [ ] **Step 3: Add the fields to the config and layer bodies**

In `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`, import the export
layout type and add it to `AvaMapConfigBody`, then bump the version argument:

```ts
import type {
  ExportLayout, // prettier-ignore
} from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";
```

Inside `AvaMapConfigBody`, after `annotationsZIndex`:

```ts
  /** Persisted page furniture for the PDF export. */
  exportLayout: ExportLayout;
```

Change the model version at the bottom of the same file:

```ts
export type AvaMapConfigRead = Model.Versioned<
  "AvaMapConfig",
  5,
  AvaMapConfigBody
>;
```

In `shared/models/AvaMap/MapLayer/MapLayer.types.ts`, import the disputed types
and add both fields to `MapLayerCommon`, after `applyAoiFilter`:

```ts
import type {
  DisputedStatusRef,
  DisputedStatusValues,
} from "$/models/AvaMap/MapLayer/DisputedStatus.types.ts";
```

```ts
  /** Column carrying disputed-boundary status, or unset when all settled. */
  disputedStatusColumn: DisputedStatusRef | undefined;

  /** Which source values mean disputed and which mean undetermined. */
  disputedStatusValues: DisputedStatusValues;
```

- [ ] **Step 4: Re-export both through the model namespaces**

In `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts`, add to the type import
list and the namespace:

```ts
import type {
  ExportLayout as ExportLayoutType,
  ExportOrientation as ExportOrientationType,
  ExportPaper as ExportPaperType,
} from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";
```

```ts
  /** Persisted page furniture for the PDF export. */
  export type ExportLayout = ExportLayoutType;
  /** A paper size the export sheet offers. */
  export type ExportPaper = ExportPaperType;
  /** A page orientation the export sheet offers. */
  export type ExportOrientation = ExportOrientationType;
```

In `shared/models/AvaMap/MapLayer/MapLayer.ts`:

```ts
import type {
  DisputedStatusRef as DisputedStatusRefType,
  DisputedStatus as DisputedStatusType,
  DisputedStatusValues as DisputedStatusValuesType,
} from "$/models/AvaMap/MapLayer/DisputedStatus.types.ts";
```

```ts
  /** Where a layer's disputed-status values come from. */
  export type DisputedStatusRef = DisputedStatusRefType;
  /** Which source values mean disputed and which mean undetermined. */
  export type DisputedStatusValues = DisputedStatusValuesType;
  /** How one feature's boundary line is drawn. */
  export type DisputedStatus = DisputedStatusType;
```

- [ ] **Step 5: Confirm the expected compile break**

Run: `pnpm type-check`
Expected: FAIL. `AvaMapConfigModule.makeEmpty`, `MapLayerModule.makeEmpty`, the
v4 schema, and `migrateAvaMapConfig` do not yet supply the new fields. Task 2
and Task 3 close those. Do not patch call sites here.

---

### Task 2: Version 5 schema and migration

**Files:**

- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v5SchemaSuites.ts`

- [ ] **Step 1: Export the v4 layer schema so migration can read it**

`AvaMapConfigV4Schema.ts` currently keeps `V4LayerSchema` private. Export it
and the common shape so v5 can extend rather than restate them:

```ts
export const V4LayerCommonShape = {
  ...LayerCommonShape,
  legend: V4LegendSchema,
  timeColumn: uuidType<"QueryColumn">().optional(),
  applyAoiFilter: z.boolean(),
} as const;
```

Change the two declarations that already exist from `const V4LayerCommonShape`
and `const V4LayerSchema` to `export const`, and export
`V4StandardLayerSchema`, `V4AggregateOnlyLayerSchema`, and
`AnnotationLayerSchema` — and only these, because only these have a real v5
consumer.
Add `export` only; do not change any shape in this file.

- [ ] **Step 2: Write the failing v5 schema suite**

Create
`shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v5SchemaSuites.ts`:

```ts
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import {
  createVersion4JsonWithLayer,
  createVersion5BlankDisclaimerJson,
  createVersion5OverlappingDisputedJson,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { describe, expect, it } from "vitest";

describe("AvaMapConfigSchema v5 export layout", () => {
  it("migrates a version 4 config into the default export layout", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion4JsonWithLayer());

    expect(parsed.version).toBe(5);
    expect(parsed.exportLayout).toEqual({
      paper: "a4",
      orientation: "landscape",
      title: { isVisible: true, text: "" },
      subtitle: { isVisible: true, text: "" },
      northArrow: true,
      scaleBar: true,
      sourceLine: "",
      disclaimer: undefined,
    });
  });

  it("migrates every version 4 layer to an unbound disputed status", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion4JsonWithLayer());

    expect(parsed.layers[0]?.disputedStatusColumn).toBeUndefined();
    expect(parsed.layers[0]?.disputedStatusValues).toEqual({
      disputed: [],
      undetermined: [],
    });
  });

  it("keeps version 4 overlay behavior through the migration", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion4JsonWithLayer());

    expect(parsed.aoi).toBeUndefined();
    expect(parsed.timeRange).toBeUndefined();
    expect(parsed.layers[0]?.applyAoiFilter).toBe(true);
    expect(parsed.layers[0]?.timeColumn).toBeUndefined();
  });

  it("rejects a blank disclaimer at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(createVersion5BlankDisclaimerJson());
    }).toThrow();
  });

  it("rejects a value listed as both disputed and undetermined", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(
        createVersion5OverlappingDisputedJson(),
      );
    }).toThrow();
  });

  it("round-trips an edited export layout and a disputed bind", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        paper: "letter",
        orientation: "portrait",
        title: { isVisible: true, text: "Cholera response" },
        subtitle: { isVisible: false, text: "" },
        northArrow: false,
        scaleBar: true,
        sourceLine: "OCHA",
        disclaimer: "Our own required wording.",
      },
    });

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });
});
```

- [ ] **Step 3: Add the fixtures the suite imports**

Append to
`shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts`:

```ts
export function omitExportFields(layer: MapLayer.T) {
  const {
    disputedStatusColumn: _disputedStatusColumn,
    disputedStatusValues: _disputedStatusValues,
    ...legacyLayer
  } = layer;
  return legacyLayer;
}

export function createVersion4JsonWithLayer() {
  const config = AvaMapConfig.makeEmpty();
  return {
    __type: config.__type,
    version: 4,
    basemap: config.basemap,
    view: config.view,
    bookmarks: config.bookmarks,
    layers: [omitExportFields(waveCLayer)],
    annotations: config.annotations,
    annotationsZIndex: 0,
  };
}

export function createEmptyVersion5Json() {
  const config = AvaMapConfig.makeEmpty();
  return {
    __type: config.__type,
    version: config.version,
    basemap: config.basemap,
    view: config.view,
    bookmarks: config.bookmarks,
    layers: config.layers,
    annotations: config.annotations,
    annotationsZIndex: config.annotationsZIndex,
    exportLayout: config.exportLayout,
  };
}

export function createVersion5BlankDisclaimerJson() {
  const json = createEmptyVersion5Json();
  return {
    ...json,
    exportLayout: { ...json.exportLayout, disclaimer: "" },
  };
}

export function createVersion5OverlappingDisputedJson() {
  const layer = MapLayer.createArea("Admin 1");
  return {
    ...createEmptyVersion5Json(),
    layers: [
      {
        ...layer,
        disputedStatusColumn: {
          type: "queryColumn",
          column: uuid<QueryColumn.Id>(),
        },
        disputedStatusValues: {
          disputed: ["Disputed"],
          undetermined: ["Disputed"],
        },
      },
    ],
  };
}
```

`createEmptyVersion4Json` stays as it is; `omitOverlayFields` and
`createVersion3Json` are unchanged.

- [ ] **Step 4: Run the suite to verify it fails**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v5SchemaSuites.ts`
Expected: FAIL. `createVersion4JsonWithLayer` is not exported yet and
`AvaMapConfigV5Schema` does not exist.

- [ ] **Step 5: Write the version 5 schema**

Create
`shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts`:

```ts
import { uuidType } from "$/lib/zodHelpers.ts";
import {
  BasemapSchema,
  BookmarkSchema,
  ViewStateSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import {
  AnnotationLayerSchema,
  AoiPolygonSchema,
  TimeRangeSchema,
  V4AggregateOnlyLayerSchema,
  V4LayerCommonShape,
  V4StandardLayerSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts";
import { z } from "zod";

/** Where a layer reads its disputed-status values from. */
const DisputedStatusRefSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("queryColumn"),
    column: uuidType<"QueryColumn">(),
  }),
  z.strictObject({
    type: z.literal("boundaryColumn"),
    column: uuidType<"DatasetColumn">(),
  }),
]);

/** Disputed and undetermined value lists, which must not overlap. */
const DisputedStatusValuesSchema = z
  .strictObject({
    disputed: z.array(z.string()).readonly(),
    undetermined: z.array(z.string()).readonly(),
  })
  .refine((values) => {
    const disputed = new Set(values.disputed);
    return !values.undetermined.some((value) => {
      return disputed.has(value);
    });
  }, "A value cannot be both disputed and undetermined");

const V5LayerCommonShape = {
  ...V4LayerCommonShape,
  disputedStatusColumn: DisputedStatusRefSchema.optional(),
  disputedStatusValues: DisputedStatusValuesSchema,
} as const;

const V5StandardLayerSchema = V4StandardLayerSchema.extend(
  V5LayerCommonShape,
).strict();
const V5AggregateOnlyLayerSchema = V4AggregateOnlyLayerSchema.extend(
  V5LayerCommonShape,
).strict();

/** Version 5 layer: standard paint or aggregate-only fill. */
export const AvaMapConfigV5LayerSchema = z.union([
  V5StandardLayerSchema,
  V5AggregateOnlyLayerSchema,
]);

const ExportHeaderLineSchema = z.strictObject({
  isVisible: z.boolean(),
  text: z.string(),
});

/** Persisted page furniture. A blank disclaimer is rejected, not stored. */
export const ExportLayoutSchema = z.strictObject({
  paper: z.enum(["a4", "letter"]),
  orientation: z.enum(["landscape", "portrait"]),
  title: ExportHeaderLineSchema,
  subtitle: ExportHeaderLineSchema,
  northArrow: z.boolean(),
  scaleBar: z.boolean(),
  sourceLine: z.string(),
  disclaimer: z.string().min(1).optional(),
});

/** Version 5 persisted map configuration. */
export const AvaMapConfigV5Schema = z.strictObject({
  __type: z.literal("AvaMapConfig"),
  version: z.literal(5),
  basemap: BasemapSchema,
  view: ViewStateSchema,
  bookmarks: z.array(BookmarkSchema).readonly(),
  layers: z.array(AvaMapConfigV5LayerSchema).readonly(),
  aoi: AoiPolygonSchema.optional(),
  timeRange: TimeRangeSchema.optional(),
  annotations: AnnotationLayerSchema,
  annotationsZIndex: z.number().int().min(0),
  exportLayout: ExportLayoutSchema,
});
```

Import from v4 only what v5 actually consumes, and export from v4 only what v5
actually imports. Do not add pass-through re-exports "so v5 owns every symbol":
nothing needs them, and they read as load-bearing when they are not. Confirm
with grep before exporting a v4 symbol that it has a real consumer.

If `V4StandardLayerSchema.extend(...).strict()` does not typecheck against the
`z.strictObject` returned by v4, restate the two layer schemas with
`z.strictObject({ ...V5LayerCommonShape, geoBinding: ..., symbology: ...,
sensitivity: ... })` using the same members v4 uses. Do not weaken `strict`.

- [ ] **Step 6: Write the version 4 to version 5 migration**

In `migrateAvaMapConfig.ts`, add the import and the new step:

```ts
import { AvaMapConfigV5Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts";
```

```ts
type ConfigV4 = z.infer<typeof AvaMapConfigV4Schema>;

/** Default export furniture applied to every migrated and new map. */
const DEFAULT_EXPORT_LAYOUT = {
  paper: "a4",
  orientation: "landscape",
  title: { isVisible: true, text: "" },
  subtitle: { isVisible: true, text: "" },
  northArrow: true,
  scaleBar: true,
  sourceLine: "",
  disclaimer: undefined,
} as const;

/** Migrates a valid version 4 config into the current persisted shape. */
function _migrateVersion4(config: ConfigV4): AvaMapConfigRead {
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
  }) as AvaMapConfigRead;
}
```

Change `_migrateVersion3` to return `ConfigV4` instead of `AvaMapConfigRead`:
drop its `as AvaMapConfigRead` cast and let it return the parsed v4 value. Then
rewrite the exported object:

```ts
export const migrateAvaMapConfig = {
  /** Migrates a valid version 1 config into the current representation. */
  fromV1: (config: ConfigV1): AvaMapConfigRead => {
    return _migrateVersion4(
      _migrateVersion3(_migrateVersion2(_migrateVersion1(config))),
    );
  },

  /** Migrates a valid version 2 config into the current representation. */
  fromV2: (config: ConfigV2): AvaMapConfigRead => {
    return _migrateVersion4(_migrateVersion3(_migrateVersion2(config)));
  },

  /** Migrates a valid version 3 config into the current representation. */
  fromV3: (config: ConfigV3): AvaMapConfigRead => {
    return _migrateVersion4(_migrateVersion3(config));
  },

  /** Migrates a valid version 4 config into the current representation. */
  fromV4: _migrateVersion4,
};
```

- [ ] **Step 7: Route version 4 through the migration**

In `AvaMapConfigSchema.ts`, swap the current schema and add the v4 branch:

```ts
import { AvaMapConfigV5Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts";
```

**The buffer invariant must move out of the current-version path.** Until now
version 4 *was* the current version, so `_assertBufferInvariants` ran on every
version 4 document by way of `_parseCurrentConfig`. Once version 4 routes
through the migration, that check would be skipped for it and for versions 1
through 3. A buffer cycle in a persisted version 2 map is exactly as
unrenderable as one in a version 5 map, so the assertion belongs after the
version branch, not inside one arm of it.

```ts
function _parseCurrentConfig(json: unknown): AvaMapConfigRead {
  const parsed = AvaMapConfigV5Schema.parse(json) as AvaMapConfigRead;
  return {
    ...parsed,
    aoi: parsed.aoi,
    timeRange: parsed.timeRange,
  };
}

/** Parses or migrates by version, without asserting cross-layer invariants. */
function _readConfigByVersion(json: unknown, version: number): AvaMapConfigRead {
  if (version === 1) {
    return migrateAvaMapConfig.fromV1(AvaMapConfigV1Schema.parse(json));
  }
  if (version === 2) {
    return migrateAvaMapConfig.fromV2(AvaMapConfigV2Schema.parse(json));
  }
  if (version === 3) {
    return migrateAvaMapConfig.fromV3(AvaMapConfigV3Schema.parse(json));
  }
  if (version === 4) {
    return migrateAvaMapConfig.fromV4(AvaMapConfigV4Schema.parse(json));
  }
  return _parseCurrentConfig(json);
}
```

`fromJson` then reads the version, calls `_readConfigByVersion`, and asserts
the invariant once on the result:

```ts
  fromJson: (json: unknown): AvaMapConfigRead => {
    const version = z
      .looseObject({
        __type: z.literal("AvaMapConfig"),
        version: z.number().int(),
      })
      .parse(json).version;
    const config = _readConfigByVersion(json, version);
    _assertBufferInvariants(config.layers);
    return config;
  },
```

Migration runs before the check, which is correct: a cycle is a property of the
layer graph, and migration preserves that graph.

In the `AvaMapConfigSchema` object also set `schema: AvaMapConfigV5Schema`, and
change `toJson` to parse with `AvaMapConfigV5Schema`.

A *missing* buffer source stays legal; only a cycle is rejected. The existing
"keeps a buffer whose source layer is missing" and "round-trips a buffer whose
source layer is missing" cases must keep passing, so do not tighten this beyond
the cycle check.

- [ ] **Step 8: Run the suite to verify it passes**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/`
Expected: PASS, including the existing `v4SchemaSuites.ts` and
`AvaMapConfigSchema.test.ts`. The v4 suite's assertion `expect(parsed.version)
.toBe(4)` now fails; change that one line to `.toBe(5)` and leave every other
assertion in that file untouched. Its buffer-cycle, round-trip, and
reversed-time cases must still pass unchanged.

- [ ] **Step 9: Commit**

```bash
git add shared/models/AvaMap
git commit -m "feat(gis): add AvaMapConfig version 5 with export layout and disputed status"
```

---

### Task 3: Constructors and updaters

**Files:**

- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.ts`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.test.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.test.ts`
- Create: `shared/models/AvaMap/MapLayer/MapLayerModule/disputedStatusHelpers.ts`

- [ ] **Step 1: Write the failing updater test**

Create
`shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.test.ts`:

```ts
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { describe, expect, it } from "vitest";

describe("exportLayoutUpdaters", () => {
  it("defaults a new map to A4 landscape with no disclaimer", () => {
    const config = AvaMapConfig.makeEmpty();

    expect(config.exportLayout.paper).toBe("a4");
    expect(config.exportLayout.orientation).toBe("landscape");
    expect(config.exportLayout.disclaimer).toBeUndefined();
  });

  it("stores an edited layout", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        paper: "letter",
        title: { isVisible: true, text: "Cholera response" },
      },
    });

    expect(config.exportLayout.paper).toBe("letter");
    expect(config.exportLayout.title.text).toBe("Cholera response");
  });

  it("returns the same config when nothing changed", () => {
    const config = AvaMapConfig.makeEmpty();

    expect(
      AvaMapConfig.withExportLayout({
        config,
        exportLayout: config.exportLayout,
      }),
    ).toBe(config);
  });

  it("stores a cleared disclaimer as unset rather than blank", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        disclaimer: "   ",
      },
    });

    expect(config.exportLayout.disclaimer).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.test.ts`
Expected: FAIL with "withExportLayout is not a function".

- [ ] **Step 3: Write the updater**

Create
`shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.ts`:

```ts
import type { AvaMapConfigRead } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";
import type {
  ExportLayout, // prettier-ignore
} from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";

/** Export furniture applied to every new and migrated map. */
export const DEFAULT_EXPORT_LAYOUT: ExportLayout = {
  paper: "a4",
  orientation: "landscape",
  title: { isVisible: true, text: "" },
  subtitle: { isVisible: true, text: "" },
  northArrow: true,
  scaleBar: true,
  sourceLine: "",
  disclaimer: undefined,
};

/** Blank or whitespace-only disclaimers become unset, never stored. */
function _normalizeDisclaimer(
  disclaimer: string | undefined,
): string | undefined {
  return disclaimer && disclaimer.trim() ? disclaimer : undefined;
}

/** True when two layouts are field-for-field equal. */
function _isSameLayout(first: ExportLayout, second: ExportLayout): boolean {
  return (
    first.paper === second.paper &&
    first.orientation === second.orientation &&
    first.title.isVisible === second.title.isVisible &&
    first.title.text === second.title.text &&
    first.subtitle.isVisible === second.subtitle.isVisible &&
    first.subtitle.text === second.subtitle.text &&
    first.northArrow === second.northArrow &&
    first.scaleBar === second.scaleBar &&
    first.sourceLine === second.sourceLine &&
    first.disclaimer === second.disclaimer
  );
}

/** Export-layout updates for map configuration. */
export const exportLayoutUpdaters = {
  /** Export furniture applied to every new and migrated map. */
  defaultExportLayout: DEFAULT_EXPORT_LAYOUT,

  /**
   * Replaces the map's export furniture.
   *
   * A blank disclaimer is normalized to unset, so the furniture strip and the
   * page fall back to the localized default instead of showing nothing.
   */
  withExportLayout: (
    options: Readonly<{
      config: AvaMapConfigRead;
      exportLayout: ExportLayout;
    }>,
  ): AvaMapConfigRead => {
    const { config, exportLayout } = options;
    const next: ExportLayout = {
      ...exportLayout,
      disclaimer: _normalizeDisclaimer(exportLayout.disclaimer),
    };
    return _isSameLayout(config.exportLayout, next) ?
        config
      : { ...config, exportLayout: next };
  },
};
```

- [ ] **Step 4: Wire the module and bump `makeEmpty`**

In `AvaMapConfigModule.ts`, import the updaters, add
`exportLayout: DEFAULT_EXPORT_LAYOUT` and `version: 5` inside `makeEmpty`, and
spread `...exportLayoutUpdaters` beside `...overlayConfigUpdaters`. Import
`DEFAULT_EXPORT_LAYOUT` from the new file rather than restating it, and have
`migrateAvaMapConfig.ts` import it too so the default exists in exactly one
place.

- [ ] **Step 5: Add the layer defaults and eligibility helper**

Create `shared/models/AvaMap/MapLayer/MapLayerModule/disputedStatusHelpers.ts`:

```ts
import type {
  DisputedStatusValues, // prettier-ignore
} from "$/models/AvaMap/MapLayer/DisputedStatus.types.ts";
import type { MapLayerRead } from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

/** No values assigned: every outline renders as settled. */
export const EMPTY_DISPUTED_STATUS_VALUES: DisputedStatusValues = {
  disputed: [],
  undetermined: [],
};

/**
 * True when a layer may carry a disputed-status bind.
 *
 * Buffer rings and grid cells are excluded because they are derived geometry,
 * not administrative boundaries: dashing them would assert a dispute the data
 * never claimed.
 */
export function canBindDisputedStatus(layer: MapLayerRead): boolean {
  const isOutlineSymbology =
    layer.symbology.type === "fill" || layer.symbology.type === "line";
  const binding = layer.geoBinding?.type;
  const isBoundaryBinding =
    binding === "geometryColumn" ||
    binding === "joinToBoundaries" ||
    binding === "aggregatePointsToBoundaries";
  return isOutlineSymbology && isBoundaryBinding;
}

/** True when no value appears in both the disputed and undetermined lists. */
export function areDisputedStatusValuesDisjoint(
  values: DisputedStatusValues,
): boolean {
  const disputed = new Set(values.disputed);
  return !values.undetermined.some((value) => {
    return disputed.has(value);
  });
}
```

In `MapLayerModule.ts`, import those and add
`disputedStatusColumn: undefined` and
`disputedStatusValues: EMPTY_DISPUTED_STATUS_VALUES` to the object
`makeEmpty` returns, then expose `canBindDisputedStatus`,
`areDisputedStatusValuesDisjoint`, and
`emptyDisputedStatusValues: EMPTY_DISPUTED_STATUS_VALUES` on the module.

- [ ] **Step 6: Add the eligibility test**

Append to `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.test.ts`:

```ts
describe("disputed status", () => {
  it("starts unbound with no values assigned", () => {
    const layer = MapLayer.makeEmpty("Admin 1");

    expect(layer.disputedStatusColumn).toBeUndefined();
    expect(layer.disputedStatusValues).toEqual({
      disputed: [],
      undetermined: [],
    });
  });

  it("does not offer the bind on a circle layer", () => {
    expect(MapLayer.canBindDisputedStatus(MapLayer.makeEmpty("Cases"))).toBe(
      false,
    );
  });

  it("does not offer the bind on a buffer layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Buffer"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: uuid<MapLayer.Id>(),
        distanceMeters: MapLayer.defaultBufferDistanceMeters,
        dissolve: false,
      },
    };

    expect(MapLayer.canBindDisputedStatus(layer)).toBe(false);
  });

  it("offers the bind on a polygon geometry-column fill layer", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      geoBinding: {
        type: "geometryColumn",
        column: uuid<QueryColumn.Id>(),
        encoding: "geojson",
        family: "polygon",
        simplification: undefined,
        sourceCrs: undefined,
      },
    };

    expect(MapLayer.canBindDisputedStatus(layer)).toBe(true);
  });

  it("rejects a value listed in both arrays", () => {
    expect(
      MapLayer.areDisputedStatusValuesDisjoint({
        disputed: ["Disputed"],
        undetermined: ["Disputed"],
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 7: Run the model tests**

Run: `pnpm vitest run shared/models/AvaMap`
Expected: PASS. Fix any fixture in `shared/models/AvaMap` that constructs a
layer or config literally rather than through `MapLayer.makeEmpty` /
`AvaMapConfig.makeEmpty`.

- [ ] **Step 8: Typecheck the whole app**

Run: `pnpm type-check`
Expected: PASS, or failures only in `src/**` fixtures that build layer or
config literals. Fix those by spreading the constructors; do not add the new
fields by hand in more than one place.

- [ ] **Step 9: Commit**

```bash
git add shared/models/AvaMap
git commit -m "feat(gis): default export layout and disputed-status fields on new maps"
```

---

### Task 4: Furniture strip reads the persisted disclaimer

**Files:**

- Modify: `src/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.tsx`
- Modify: `src/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.test.tsx`
- Modify: `src/views/GisApp/GisAppFurnitureBar.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.test.tsx`,
following the render helper already in that file:

```ts
it("shows the localized default disclaimer when none is persisted", () => {
  _renderFurnitureBar({ disclaimer: undefined });

  expect(
    screen.getByText(
      "The boundaries and names shown do not imply official endorsement or acceptance.",
    ),
  ).toBeInTheDocument();
});

it("shows the persisted disclaimer verbatim", () => {
  _renderFurnitureBar({ disclaimer: "Our own required wording." });

  expect(screen.getByText("Our own required wording.")).toBeInTheDocument();
});
```

If the file has no shared render helper, add one that renders
`<MapFurnitureBar mapInstance={...} attribution="MapLibre" disclaimer={...} />`
with the same `mapInstance` stub the existing tests use.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.test.tsx`
Expected: FAIL. `MapFurnitureBar` has no `disclaimer` prop.

- [ ] **Step 3: Add the prop**

In `MapFurnitureBar.tsx`, add to `Props`:

```ts
  /** Persisted disclaimer, or unset to show the localized default. */
  disclaimer: string | undefined;
```

and replace the disclaimer span's body:

```tsx
      <span className={css.mapFurnitureBarDisclaimer}>
        {disclaimer ??
          t`The boundaries and names shown do not imply official endorsement or acceptance.`}
      </span>
```

- [ ] **Step 4: Pass it from the GIS app**

In `GisAppFurnitureBar.tsx`:

```tsx
  return (
    <MapFurnitureBar
      mapInstance={app.mapInstance}
      attribution={attribution}
      disclaimer={app.mapConfig.exportLayout.disclaimer}
    />
  );
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run src/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp
git commit -m "feat(gis): furniture strip shows the persisted export disclaimer"
```

---

## Stage 2: disputed rendering (slice 7.2)

### Task 5: Disputed status classification

**Files:**

- Create: `src/views/GisApp/layers/DisputedBoundary/DisputedBoundary.ts`
- Create: `src/views/GisApp/layers/DisputedBoundary/DisputedBoundary.test.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants.ts`

- [ ] **Step 1: Write the failing test**

Create `src/views/GisApp/layers/DisputedBoundary/DisputedBoundary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";

const VALUES = {
  disputed: ["Disputed"],
  undetermined: ["Undetermined", "Unknown"],
};

describe("DisputedBoundary.getStatusFromValue", () => {
  it("reads a disputed value", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: "Disputed", values: VALUES }),
    ).toBe("disputed");
  });

  it("reads an undetermined value", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: "Unknown", values: VALUES }),
    ).toBe("undetermined");
  });

  it("treats an unlisted value as settled", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: "Agreed", values: VALUES }),
    ).toBe("settled");
  });

  it("treats null as settled", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: null, values: VALUES }),
    ).toBe("settled");
  });

  it("treats a missing property as settled", () => {
    expect(
      DisputedBoundary.getStatusFromValue({ value: undefined, values: VALUES }),
    ).toBe("settled");
  });
});

describe("DisputedBoundary.hasDrawnDisputedFeature", () => {
  it("is false when the layer has no bind", () => {
    expect(
      DisputedBoundary.hasDrawnDisputedFeature({
        values: { disputed: [], undetermined: [] },
        featureCollection: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [] },
              properties: { [DisputedBoundary.propertyName]: "Disputed" },
            },
          ],
        },
      }),
    ).toBe(false);
  });

  it("is true when at least one drawn feature is disputed", () => {
    expect(
      DisputedBoundary.hasDrawnDisputedFeature({
        values: VALUES,
        featureCollection: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [] },
              properties: { [DisputedBoundary.propertyName]: "Agreed" },
            },
            {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [] },
              properties: { [DisputedBoundary.propertyName]: "Undetermined" },
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it("is false when every drawn feature is settled", () => {
    expect(
      DisputedBoundary.hasDrawnDisputedFeature({
        values: VALUES,
        featureCollection: { type: "FeatureCollection", features: [] },
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/layers/DisputedBoundary/DisputedBoundary.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the module**

Create `src/views/GisApp/layers/DisputedBoundary/DisputedBoundary.ts`:

```ts
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Feature property carrying the raw disputed-status value. */
const DISPUTED_STATUS_PROPERTY = "__avandar_disputed_status";

/**
 * Casing ink for disputed and undetermined outlines. Never the layer's own
 * stroke, so a dashed line cannot be read as a settled boundary. Every PDF
 * uses the light value, because the page is always light.
 */
const CASING_COLORS = { light: "#555555", dark: "#b7b7b7" } as const;

/** Dash pattern, in MapLibre pixels. */
const CASING_DASHARRAY: readonly [number, number] = [3, 2];

/** Classification, paint constants, and the property name for disputed lines. */
export const DisputedBoundary = {
  /** Feature property carrying the raw disputed-status value. */
  propertyName: DISPUTED_STATUS_PROPERTY,

  /** Casing ink, keyed by canvas. */
  casingColors: CASING_COLORS,

  /** Dash pattern, in MapLibre pixels. */
  dasharray: CASING_DASHARRAY,

  /**
   * Classifies one feature's status.
   *
   * Anything not explicitly listed is settled, including null and a missing
   * property, so a column that fails to resolve renders as settled lines
   * rather than dashing an entire map.
   */
  getStatusFromValue: (
    options: Readonly<{
      value: unknown;
      values: MapLayer.DisputedStatusValues;
    }>,
  ): MapLayer.DisputedStatus => {
    const { value, values } = options;
    if (typeof value !== "string") {
      return "settled";
    }
    if (values.disputed.includes(value)) {
      return "disputed";
    }
    return values.undetermined.includes(value) ? "undetermined" : "settled";
  },

  /** True when at least one drawn feature is disputed or undetermined. */
  hasDrawnDisputedFeature: (
    options: Readonly<{
      values: MapLayer.DisputedStatusValues;
      featureCollection: GeoJSON.FeatureCollection;
    }>,
  ): boolean => {
    const { values, featureCollection } = options;
    if (values.disputed.length === 0 && values.undetermined.length === 0) {
      return false;
    }
    return featureCollection.features.some((feature) => {
      return (
        DisputedBoundary.getStatusFromValue({
          value: feature.properties?.[DISPUTED_STATUS_PROPERTY],
          values,
        }) !== "settled"
      );
    });
  },
};
```

- [ ] **Step 4: Register the reserved property name**

In `src/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants.ts`,
add to `MapLayerSpatialFeatureProperties`, keeping the keys alphabetical:

```ts
  disputedStatus: "__avandar_disputed_status",
```

The literal must match `DisputedBoundary.propertyName` exactly. Add a test in
`DisputedBoundary.test.ts` asserting that:

```ts
it("uses the reserved spatial property name", () => {
  expect(DisputedBoundary.propertyName).toBe(
    MapLayerSpatialFeatureProperties.disputedStatus,
  );
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run src/views/GisApp/layers/DisputedBoundary/DisputedBoundary.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp/layers/DisputedBoundary src/clients/maps
git commit -m "feat(gis): classify disputed boundary status from a feature property"
```

---

### Task 6: Select the disputed column into the query

**Files:**

- Modify: `src/views/GisApp/layers/MapLayerUpdates/getRequiredColumnIds.ts`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/__tests__/` (add
  `getRequiredColumnIds.disputed.test.ts`)
- Modify: `src/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata.test.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts`

- [ ] **Step 1: Write the failing required-columns test**

Create
`src/views/GisApp/layers/MapLayerUpdates/__tests__/getRequiredColumnIds.disputed.test.ts`:

```ts
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { getRequiredColumnIds } from "@/views/GisApp/layers/MapLayerUpdates/getRequiredColumnIds";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

describe("getRequiredColumnIds with a disputed bind", () => {
  it("keeps a query-column disputed bind in the query", () => {
    const column = uuid<QueryColumn.Id>();
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      disputedStatusColumn: { type: "queryColumn", column },
    };

    expect(getRequiredColumnIds(layer).has(column)).toBe(true);
  });

  it("does not require a boundary-column bind from the source query", () => {
    const layer: MapLayer.T = {
      ...MapLayer.createArea("Admin 1"),
      disputedStatusColumn: {
        type: "boundaryColumn",
        column: uuid<DatasetColumn.Id>(),
      },
    };

    expect(getRequiredColumnIds(layer).size).toBe(0);
  });
});
```

Import `DatasetColumn` as a type from
`$/models/datasets/DatasetColumn/DatasetColumn`.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/layers/MapLayerUpdates/__tests__/getRequiredColumnIds.disputed.test.ts`
Expected: FAIL. The first case returns `false`.

- [ ] **Step 3: Include the bind in required columns**

In `getRequiredColumnIds.ts`, add a helper above `getRequiredColumnIds`:

```ts
/** The source column a disputed bind needs, when it reads the source query. */
function _getDisputedStatusColumnId(
  reference: MapLayer.DisputedStatusRef | undefined,
): QueryColumn.Id | undefined {
  return reference?.type === "queryColumn" ? reference.column : undefined;
}
```

and add `_getDisputedStatusColumnId(layer.disputedStatusColumn),` to the array
passed to `makeSet`, next to `layer.timeColumn`.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/views/GisApp/layers/MapLayerUpdates/__tests__/getRequiredColumnIds.disputed.test.ts`
Expected: PASS.

- [ ] **Step 5: Resolve the bind for the compiler**

In `MapLayerSpatialQuery.types.ts`, add to `ResolvedMapLayerMetadata`:

```ts
  /** Resolved name of the disputed-status column, when the layer binds one. */
  disputedStatusColumn:
    | { type: "queryColumn" | "boundaryColumn"; columnName: string }
    | undefined;
```

and add two reasons to `MapLayerRebindReason`:

```ts
  | "missingDisputedStatusColumn"
  | "disputedStatusColumnNotText"
```

In `getResolvedMapLayerMetadata.ts`, add a resolver that mirrors
`_getNormalizationDenominator` exactly: for `queryColumn`, look the id up in
`options.layer.source.queryColumns` and return
`{ type: "queryColumn", columnName: QueryColumn.getDerivedColumnName(column) }`;
for `boundaryColumn`, use the existing `_findBoundaryColumn` helper against
`binding.boundary.datasetId` and return
`{ type: "boundaryColumn", columnName: column.name }`. In both branches, return
`_createRebindRequired("missingDisputedStatusColumn", reference.column)` when
the column is absent, and
`_createRebindRequired("disputedStatusColumnNotText", reference.column)` when
`AvaDataType.isText(column.dataType)` is false. Return `undefined` when
`layer.disputedStatusColumn` is unset. Call it from
`getResolvedMapLayerMetadata` alongside the denominator resolution, propagate a
`rebindRequired` result, and place the resolved value on the returned metadata.

- [ ] **Step 6: Add resolver tests**

Append to `getResolvedMapLayerMetadata.test.ts`, following the existing
denominator cases in that file:

```ts
it("resolves a text boundary disputed column", () => {
  // Build a joinToBoundaries layer whose boundary dataset has a varchar
  // "status" column, bound as { type: "boundaryColumn", column: statusId }.
  expect(resolution).toMatchObject({
    type: "resolved",
    disputedStatusColumn: { type: "boundaryColumn", columnName: "status" },
  });
});

it("requires a rebind when the disputed column is numeric", () => {
  expect(resolution).toEqual({
    type: "rebindRequired",
    reason: "disputedStatusColumnNotText",
    referenceId: numericColumnId,
  });
});

it("requires a rebind when the disputed column is gone", () => {
  expect(resolution).toEqual({
    type: "rebindRequired",
    reason: "missingDisputedStatusColumn",
    referenceId: removedColumnId,
  });
});
```

Fill each case using the fixtures already at the top of that file; do not add a
second fixture factory.

- [ ] **Step 7: Add the bind to the layer query key**

In `MapLayerData.ts`, add `layer.disputedStatusColumn` and
`layer.disputedStatusValues` to the array `getQueryKeyFromMapLayer` returns,
after `layer.applyAoiFilter`. Rebinding the column must refetch; recoloring
must not.

- [ ] **Step 8: Run the affected suites**

Run: `pnpm vitest run src/clients/maps/MapLayerSpatialQuery src/views/GisApp/layers/useMapLayersData`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/clients/maps src/views/GisApp/layers
git commit -m "feat(gis): resolve the disputed-status column for the spatial compiler"
```

---

### Task 7: Emit the disputed property from the compiler

**Files:**

- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileGeometryColumnQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileBoundaryJoinQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compilePointAggregationQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/__tests__/` (add
  `compileMapLayerSpatialQuery.disputed.test.ts`)

- [ ] **Step 1: Write the failing compiler test**

Create
`src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.disputed.test.ts`,
using the compile fixtures already in that `__tests__` folder:

```ts
import { describe, expect, it } from "vitest";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";

describe("disputed status in compiled spatial SQL", () => {
  it("selects the bound source column as the disputed property", () => {
    const plan = _compileGeometryColumnPlanWithDisputedBind();

    expect(plan.rawSql).toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
    expect(plan.rawSql).toContain('"status"');
  });

  it("emits no disputed property when the layer has no bind", () => {
    const plan = _compileGeometryColumnPlan();

    expect(plan.rawSql).not.toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
  });

  it("selects the boundary column on a boundary join", () => {
    const plan = _compileBoundaryJoinPlanWithDisputedBind();

    expect(plan.rawSql).toContain(
      MapLayerSpatialFeatureProperties.disputedStatus,
    );
  });

  it("adds no spatial function for the disputed bind", () => {
    const withBind = _compileGeometryColumnPlanWithDisputedBind();
    const withoutBind = _compileGeometryColumnPlan();
    const countStFunctions = (sql: string): number => {
      return sql.match(/ST_[A-Za-z_]+/g)?.length ?? 0;
    };

    expect(countStFunctions(withBind.rawSql)).toBe(
      countStFunctions(withoutBind.rawSql),
    );
  });
});
```

Write the four `_compile*` helpers at the top of the file from the existing
fixtures in that folder. The last case is the one that guards spec §2.10.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.disputed.test.ts`
Expected: FAIL. The SQL has no disputed property.

- [ ] **Step 3: Emit the property on the geometry-column path**

In `compileGeometryColumnQuery.ts`, thread the resolved column into the
properties expression. Pass
`options.metadata.disputedStatusColumn?.type === "queryColumn" ?
options.metadata.disputedStatusColumn.columnName : undefined` into
`_buildGeometryColumnSql` as `disputedStatusColumnName`, and in
`_buildPropertiesExpression` append, when that name is defined:

```ts
`, '${MapLayerSpatialFeatureProperties.disputedStatus}', ${quoteSqlIdentifier(disputedStatusColumnName)}`;
```

Also add the name to `_getPropertyColumnNames`'s result so
`sourcePropertyColumnNames` carries it, and keep excluding the geometry column.

- [ ] **Step 4: Emit the property on the boundary paths**

In `compileBoundaryJoinQuery.ts`, add to `BoundaryJoinSqlParts` a
`disputedStatus: string` field built like `_buildBoundaryDenominatorSql`:

```ts
/** Selects the boundary's disputed-status column when the layer binds one. */
function _buildBoundaryDisputedStatusSql(
  metadata: ResolvedMapLayerMetadata,
): string {
  const reference = metadata.disputedStatusColumn;
  if (reference?.type !== "boundaryColumn") {
    return "";
  }
  const alias = quoteSqlIdentifier(
    MapLayerSpatialFeatureProperties.disputedStatus,
  );
  return `, ${quoteSqlIdentifier(reference.columnName)} AS ${alias}`;
}
```

Append that to the `boundary_rows` CTE's select list, beside
`parts.boundaryDenominator`, and add the property to the
`_buildBoundaryFeatureRowsCte` `json_object`:

```ts
      '${properties.disputedStatus}', ${disputedStatus},
```

where `disputedStatus` is
`boundary.${quoteSqlIdentifier(properties.disputedStatus)}` when bound and
`NULL` otherwise. Apply the identical change to
`compilePointAggregationQuery.ts`, which builds its boundary rows the same way.

- [ ] **Step 5: Run the compiler tests**

Run: `pnpm vitest run src/clients/maps/MapLayerSpatialQuery`
Expected: PASS, including the existing snapshot-style SQL assertions. If an
existing test asserts an exact `json_object` string, update it to include the
new key only for the fixtures that bind a disputed column.

- [ ] **Step 6: Carry the property through the row path**

Row-based (non-spatial) layers build properties from
`MapLayer.toPopupColumnNames`. In
`src/views/GisApp/layers/useAvaMapRender/makeLayerRender.ts`, change the
`propertyColumnNames` argument so a query-column disputed bind is always
included:

```ts
    propertyColumnNames: MapLayer.toPropertyColumnNames(options.layer),
```

and add `toPropertyColumnNames` to `MapLayerModule.ts` beside
`toPopupColumnNames`:

```ts
  /**
   * Column names a feature must carry: the popup's columns plus any column
   * paint depends on. The disputed bind is here rather than in the popup so a
   * dashed casing cannot vanish because the author trimmed the popup.
   */
  toPropertyColumnNames: (layer: MapLayerRead): string[] | "all" => {
    const popupNames = MapLayerModule.toPopupColumnNames(layer);
    const reference = layer.disputedStatusColumn;
    if (popupNames === "all" || reference?.type !== "queryColumn") {
      return popupNames;
    }
    const column = layer.source.queryColumns.find(
      propEq("id", reference.column),
    );
    const name = column ? QueryColumn.getDerivedColumnName(column) : undefined;
    return name && !popupNames.includes(name) ?
        [...popupNames, name]
      : popupNames;
  },
```

Add a test for it in `MapLayerModule.test.ts` asserting that a layer whose
popup selects only `name` still reports the bound `status` column.

- [ ] **Step 7: Run the model and render tests**

Run: `pnpm vitest run shared/models/AvaMap/MapLayer src/views/GisApp/layers/useAvaMapRender`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/clients/maps src/views/GisApp shared/models/AvaMap
git commit -m "feat(gis): carry disputed status into feature properties"
```

---

### Task 8: Dashed casing paint

**Files:**

- Create: `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeDisputedCasingLayerSpec.ts`
- Create: `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.disputed.test.ts`
- Modify: `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.ts`
- Modify: `src/views/GisApp/layers/MapLayerIds.ts`

- [ ] **Step 1: Write the failing paint test**

Create
`src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.disputed.test.ts`:

```ts
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { EMPTY_STATS, makeFillLayerFixture } from "./makeLayerSpecFromMapLayer.fixtures";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _boundLayer(): MapLayer.T {
  return {
    ...makeFillLayerFixture(),
    disputedStatusColumn: {
      type: "queryColumn",
      column: uuid<QueryColumn.Id>(),
    },
    disputedStatusValues: {
      disputed: ["Disputed"],
      undetermined: ["Undetermined"],
    },
  };
}

const FEATURES: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: { [DisputedBoundary.propertyName]: "Disputed" },
    },
  ],
};

describe("disputed casing paint", () => {
  it("adds a dashed grey casing above the layer outline", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: _boundLayer(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });
    const casing = spec.layers.at(-1)!;

    expect(casing.id).toBe(
      MapLayerIds.toDisputedCasingLayerId(_boundLayer().id),
    );
    expect(casing.type).toBe("line");
    expect(casing.paint["line-color"]).toBe(
      DisputedBoundary.casingColors.light,
    );
    expect(casing.paint["line-dasharray"]).toEqual([3, 2]);
  });

  it("never paints the casing in the layer's own stroke color", () => {
    const layer = _boundLayer();
    const spec = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(spec.layers.at(-1)!.paint["line-color"]).not.toBe(
      layer.symbology.stroke.color,
    );
  });

  it("filters the casing to disputed and undetermined features", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: _boundLayer(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(spec.layers.at(-1)!.filter).toEqual([
      "in",
      ["get", DisputedBoundary.propertyName],
      ["literal", ["Disputed", "Undetermined"]],
    ]);
  });

  it("adds no casing when the layer has no bind", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: makeFillLayerFixture(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(
      spec.layers.some((mapLayer) => {
        return mapLayer.id.endsWith("-disputed-casing");
      }),
    ).toBe(false);
  });

  it("adds no casing when both value arrays are empty", () => {
    const spec = makeLayerSpecFromMapLayer({
      layer: {
        ..._boundLayer(),
        disputedStatusValues: { disputed: [], undetermined: [] },
      },
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(
      spec.layers.some((mapLayer) => {
        return mapLayer.id.endsWith("-disputed-casing");
      }),
    ).toBe(false);
  });

  it("leaves the settled outline paint unchanged", () => {
    const layer = _boundLayer();
    const withBind = makeLayerSpecFromMapLayer({
      layer,
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });
    const withoutBind = makeLayerSpecFromMapLayer({
      layer: makeFillLayerFixture(),
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(withBind.layers[1]).toEqual(withoutBind.layers[1]);
  });

  it("draws the casing on a layer with no stroke width", () => {
    const layer = _boundLayer();
    const spec = makeLayerSpecFromMapLayer({
      layer: {
        ...layer,
        symbology: {
          ...layer.symbology,
          stroke: { width: 0, color: "transparent" },
        },
      },
      featureCollection: FEATURES,
      stats: EMPTY_STATS,
    });

    expect(spec.layers.at(-1)!.paint["line-width"]).toBeGreaterThan(0);
  });
});
```

Reuse `makeLayerSpecFromMapLayer.fixtures.ts`; if it has no fill-layer factory
or `EMPTY_STATS`, add both there rather than in the test file.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/__tests__/makeLayerSpecFromMapLayer.disputed.test.ts`
Expected: FAIL. No casing layer exists.

- [ ] **Step 3: Add the casing layer id**

In `MapLayerIds.ts`, beside the existing id helpers:

```ts
  /** MapLibre id of a layer's dashed disputed-boundary casing. */
  toDisputedCasingLayerId: (layerId: MapLayer.Id): string => {
    return `${MapLayerIds.toLayerId(layerId)}-disputed-casing`;
  },
```

- [ ] **Step 4: Write the casing spec builder**

Create
`src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeDisputedCasingLayerSpec.ts`:

```ts
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { MapLayerSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Casing width, in pixels. Wide enough to read as a distinct line. */
const CASING_WIDTH_PX = 1.5;

/**
 * The dashed casing drawn over disputed and undetermined outlines.
 *
 * It is a separate MapLibre layer rather than a data-driven expression on the
 * layer's own outline, because the casing must be drawn even when the layer
 * has no stroke at all: a boundary whose status is disputed may not go
 * unmarked simply because the author turned the outline off.
 *
 * @param options.layer The layer whose bind and id the casing follows.
 * @param options.sourceId The GeoJSON source the casing reads.
 * @param options.canvas Which ink to use. Every PDF passes `"light"`.
 * @returns One line layer, or an empty array when nothing is bound or no value
 * is assigned.
 */
export function makeDisputedCasingLayerSpec(
  options: Readonly<{
    layer: MapLayer.T;
    sourceId: string;
    canvas: "light" | "dark";
  }>,
): MapLayerSpec[] {
  const { layer, sourceId, canvas } = options;
  const values = layer.disputedStatusValues;
  const markedValues = [...values.disputed, ...values.undetermined];
  if (!layer.disputedStatusColumn || markedValues.length === 0) {
    return [];
  }
  return [
    {
      id: MapLayerIds.toDisputedCasingLayerId(layer.id),
      type: "line",
      source: sourceId,
      filter: [
        "in",
        ["get", DisputedBoundary.propertyName],
        ["literal", markedValues],
      ],
      paint: {
        "line-color": DisputedBoundary.casingColors[canvas],
        "line-width": CASING_WIDTH_PX,
        "line-dasharray": [...DisputedBoundary.dasharray],
      },
      ...(layer.isVisible ? {} : { layout: { visibility: "none" as const } }),
    },
  ];
}
```

- [ ] **Step 5: Append the casing in the layer spec builder**

In `makeLayerSpecFromMapLayer.ts`, add `canvas` to
`MakeLayerSpecFromMapLayerInput` as `canvas?: "light" | "dark"`, and in the
returned object append the casing after `layerSpecs`:

```ts
  const layerSpecs = _makeMapLayerSpecs({
    layer,
    stats,
    valueColumnName,
    sourceId,
  });
  const casingSpecs = makeDisputedCasingLayerSpec({
    layer,
    sourceId,
    canvas: canvas ?? "light",
  });
```

```ts
    layers: [...layerSpecs, ...casingSpecs],
```

Only `fill` and `line` symbologies can reach here with a bind, because
`canBindDisputedStatus` gates the inspector and the parser stores nothing
otherwise. Do not add a symbology check in this function.

- [ ] **Step 6: Run the paint tests**

Run: `pnpm vitest run src/views/GisApp/layers/makeMapSpecFromLayerSpecs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/GisApp/layers
git commit -m "feat(gis): draw dashed casing on disputed and undetermined boundaries"
```

---

### Task 9: Locked legend row

**Files:**

- Create: `src/views/GisApp/panels/LegendPanel/MapLegend/DisputedLegendRow/DisputedLegendRow.tsx`
- Create: `src/views/GisApp/panels/LegendPanel/MapLegend/DisputedLegendRow/DisputedLegendRow.module.css`
- Modify: `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.tsx`
- Modify: `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.test.tsx`
- Modify: `src/views/GisApp/GisAppMapLegend.tsx`
- Modify: `src/views/GisApp/layers/useAvaMapRender/makeLayerRender.ts`
- Modify: `src/views/GisApp/layers/useAvaMapRender/useAvaMapRender.ts`

- [ ] **Step 1: Write the failing legend test**

Append to `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.test.tsx`:

```ts
const DISPUTED_LABEL = "Disputed or undetermined boundary";

it("shows the locked row when a disputed segment is drawn", () => {
  render(
    <MapLegend
      layers={[_visibleFillLayer()]}
      hasDrawnDisputedFeature
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
    />,
  );

  expect(screen.getByText(DISPUTED_LABEL)).toBeInTheDocument();
});

it("omits the locked row when no disputed segment is drawn", () => {
  render(
    <MapLegend
      layers={[_visibleFillLayer()]}
      hasDrawnDisputedFeature={false}
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
    />,
  );

  expect(screen.queryByText(DISPUTED_LABEL)).toBeNull();
});

it("offers no control to hide the locked row", () => {
  render(
    <MapLegend
      layers={[_visibleFillLayer()]}
      hasDrawnDisputedFeature
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
    />,
  );
  const row = screen.getByText(DISPUTED_LABEL).closest("div")!;

  expect(within(row).queryByRole("button")).toBeNull();
  expect(within(row).queryByRole("checkbox")).toBeNull();
});

it("shows the locked row even when every layer legend is hidden", () => {
  const layer = _visibleFillLayer();
  render(
    <MapLegend
      layers={[{ ...layer, legend: { ...layer.legend, position: "hidden" } }]}
      hasDrawnDisputedFeature
      isCollapsed={false}
      onToggleCollapsed={vi.fn()}
    />,
  );

  expect(screen.getByText(DISPUTED_LABEL)).toBeInTheDocument();
});
```

Add `_visibleFillLayer` to the file if it does not already have an equivalent.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.test.tsx`
Expected: FAIL. `MapLegend` has no `hasDrawnDisputedFeature` prop.

- [ ] **Step 3: Write the row component**

Create
`src/views/GisApp/panels/LegendPanel/MapLegend/DisputedLegendRow/DisputedLegendRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/DisputedLegendRow/DisputedLegendRow.module.css";
import type { ReactNode } from "react";

/**
 * The locked legend entry shown whenever a disputed or undetermined boundary
 * is actually drawn. It carries no control: a reader may not be shown a dashed
 * line whose meaning has been switched off.
 */
export function DisputedLegendRow(): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.disputedLegendRow}>
      <span
        aria-hidden
        className={css.disputedLegendRowSwatch}
        style={{ borderTopColor: DisputedBoundary.casingColors.light }}
      />
      <span>{t`Disputed or undetermined boundary`}</span>
    </div>
  );
}
```

Create `DisputedLegendRow.module.css` with a flex row, a small gap, and a
`.disputedLegendRowSwatch` rule of `width: 24px; border-top: 2px dashed;`
whose color arrives as the inline runtime value above.

- [ ] **Step 4: Render it from the legend**

In `MapLegend.tsx`, add to `Props`:

```ts
  /** True when at least one drawn feature is disputed or undetermined. */
  hasDrawnDisputedFeature: boolean;
```

Change the early return so the panel still renders when the row is required:

```tsx
  if (shown.length === 0 && !hasDrawnDisputedFeature) {
    return null;
  }
```

and render `{hasDrawnDisputedFeature ? <DisputedLegendRow /> : null}` as the
last child of the body div.

- [ ] **Step 5: Compute the flag from rendered geometry**

In `makeLayerRender.ts`, add `hasDrawnDisputedFeature` to `LayerRender` and set
it from the geometry that is actually drawn:

```ts
    hasDrawnDisputedFeature:
      isRendered &&
      DisputedBoundary.hasDrawnDisputedFeature({
        values: layer.disputedStatusValues,
        featureCollection: geometry.featureCollection,
      }),
```

`geometry` here is the post-`classifyLayerGeometry` value, so suppression,
no-data drops, AOI, and time have already been applied. In
`useAvaMapRender.ts`, add to `AvaMapRender`:

```ts
  /** True when any visible layer draws a disputed or undetermined boundary. */
  hasDrawnDisputedFeature: boolean;
```

and set it in `_makeAvaMapRender`:

```ts
    hasDrawnDisputedFeature: renderedLayers.some(
      prop("hasDrawnDisputedFeature"),
    ),
```

- [ ] **Step 6: Pass it through the app**

In `GisAppMapLegend.tsx`, add
`hasDrawnDisputedFeature={app.hasDrawnDisputedFeature}` to `<MapLegend>`. The
flag reaches `app` through `useGisAppRendering`'s spread of `useAvaMapRender`;
no other wiring is needed.

- [ ] **Step 7: Run the legend and render tests**

Run: `pnpm vitest run src/views/GisApp/panels/LegendPanel src/views/GisApp/layers/useAvaMapRender`
Expected: PASS.

- [ ] **Step 8: Extract and compile messages**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: The new legend string appears in the catalogs. Do not hand-edit
`messages.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/views/GisApp src/i18n/locales
git commit -m "feat(gis): locked disputed-boundary legend row"
```

---

### Task 10: Inspector bind

**Files:**

- Create: `src/views/GisApp/layers/MapLayerUpdates/disputedStatusUpdates.ts`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Create: `src/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedStatusControls.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.disputed.test.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.tsx`

- [ ] **Step 1: Write the failing inspector test**

Create
`src/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.disputed.test.tsx`,
following `DataSection.timeColumn.test.tsx`'s mock of
`useLayerSourceColumns`:

```tsx
describe("DisputedStatusControls", () => {
  it("is not offered on a circle layer", () => {
    _render({ layer: _circleLayer() });

    expect(
      screen.queryByRole("combobox", { name: "Disputed status column" }),
    ).toBeNull();
  });

  it("is offered on a polygon fill layer", () => {
    _render({ layer: _polygonFillLayer() });

    expect(
      screen.getByRole("combobox", { name: "Disputed status column" }),
    ).toBeInTheDocument();
  });

  it("states that outlines are settled when nothing is bound", () => {
    _render({ layer: _polygonFillLayer() });

    expect(
      screen.getByText(
        "No disputed-status column. Outlines render as settled.",
      ),
    ).toBeInTheDocument();
  });

  it("states that outlines are settled when no value is assigned", () => {
    _render({ layer: _boundPolygonFillLayer() });

    expect(
      screen.getByText(
        "Column bound. No values assigned; outlines render as settled.",
      ),
    ).toBeInTheDocument();
  });

  it("does not offer a numeric column", () => {
    sourceColumnsState.columns = [
      _column("status", "varchar"),
      _column("population", "bigint"),
    ];
    _render({ layer: _polygonFillLayer() });
    fireEvent.click(
      screen.getByRole("combobox", { name: "Disputed status column" }),
    );

    expect(
      screen.getByRole("option", { name: "status", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "population", hidden: true }),
    ).toBeNull();
  });

  it("rejects assigning one value to both lists", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = _boundPolygonFillLayerWithDisputed(["Disputed"]);
    _render({ layer, onLayerChange });

    fireEvent.click(
      screen.getByRole("textbox", { name: "Undetermined values" }),
    );
    fireEvent.click(
      screen.getByRole("option", { name: "Disputed", hidden: true }),
    );

    expect(onLayerChange.mock.calls[0]![0](layer)).toBe(layer);
  });

  it("clears the values when the column is unbound", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = _boundPolygonFillLayerWithDisputed(["Disputed"]);
    _render({ layer, onLayerChange });

    fireEvent.click(
      screen.getByRole("button", { name: "Clear Disputed status column" }),
    );

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.disputedStatusColumn).toBeUndefined();
    expect(updated.disputedStatusValues).toEqual({
      disputed: [],
      undetermined: [],
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.disputed.test.tsx`
Expected: FAIL. No such combobox is rendered.

- [ ] **Step 3: Write the updaters**

Create `src/views/GisApp/layers/MapLayerUpdates/disputedStatusUpdates.ts`:

`MapLayer` is both a value and a namespace from one import, so a single import
covers the constructors and the types:

```ts
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Binds or clears the layer's disputed-status column. */
function _withDisputedStatusColumn(
  options: Readonly<{
    layer: MapLayer.T;
    reference: MapLayer.DisputedStatusRef | undefined;
  }>,
): MapLayer.T {
  const { layer, reference } = options;
  if (reference === undefined) {
    return layer.disputedStatusColumn === undefined ?
        layer
      : {
          ...layer,
          disputedStatusColumn: undefined,
          disputedStatusValues: MapLayer.emptyDisputedStatusValues,
        };
  }
  if (!MapLayer.canBindDisputedStatus(layer)) {
    return layer;
  }
  return {
    ...layer,
    disputedStatusColumn: reference,
    disputedStatusValues: MapLayer.emptyDisputedStatusValues,
  };
}

/**
 * Assigns source values to Disputed and Undetermined.
 *
 * Rejects an overlapping assignment by returning the layer unchanged: one
 * value cannot mean two things, and silently dropping it from one list would
 * hide the author's mistake.
 */
function _withDisputedStatusValues(
  options: Readonly<{
    layer: MapLayer.T;
    values: MapLayer.DisputedStatusValues;
  }>,
): MapLayer.T {
  const { layer, values } = options;
  if (
    layer.disputedStatusColumn === undefined ||
    !MapLayer.areDisputedStatusValuesDisjoint(values)
  ) {
    return layer;
  }
  return { ...layer, disputedStatusValues: values };
}

/** Disputed-boundary bindings for the layer inspector. */
export const disputedStatusUpdates = {
  withDisputedStatusColumn: _withDisputedStatusColumn,
  withDisputedStatusValues: _withDisputedStatusValues,
};
```

Spread `...disputedStatusUpdates` into `MapLayerUpdates.ts`.

- [ ] **Step 4: Write the controls**

Create
`src/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedStatusControls.tsx`.
It returns `null` when `MapLayer.canBindDisputedStatus(layer)` is false.
Otherwise it renders a Mantine `Select` labelled `t`Disputed status column``,
`clearable`, whose options are the text columns from the layer's source (via
`useLayerSourceColumns`, filtered with `AvaDataType.isText`) for
`geometryColumn` bindings, or the boundary dataset's text columns (via the
boundary dataset's columns hook, the same one
`useBoundarySourceOptions` uses) for `joinToBoundaries` and
`aggregatePointsToBoundaries`. Its `description` is:

```tsx
  const description =
    layer.disputedStatusColumn === undefined ?
      t`No disputed-status column. Outlines render as settled.`
    : layer.disputedStatusValues.disputed.length === 0 &&
      layer.disputedStatusValues.undetermined.length === 0 ?
      t`Column bound. No values assigned; outlines render as settled.`
    : undefined;
```

When a column is bound, it also renders two Mantine `MultiSelect`s labelled
`t`Disputed values`` and `t`Undetermined values``, whose options are the
distinct values observed in that column for the current layer data. Each
change calls `onLayerChange((current) =>
MapLayerUpdates.withDisputedStatusValues({ layer: current, values: next }))`.
The updater already rejects an overlap, which is what the sixth test asserts.

- [ ] **Step 5: Render it in the Data section**

In `DataSection.tsx`, after `<TimeColumnSelect ... />`:

```tsx
      <DisputedStatusControls layer={layer} onLayerChange={onLayerChange} />
```

- [ ] **Step 6: Run the inspector tests**

Run: `pnpm vitest run src/views/GisApp/panels/LayerInspector`
Expected: PASS.

- [ ] **Step 7: Extract and compile messages**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: The five new inspector strings appear in the catalogs.

- [ ] **Step 8: Commit**

```bash
git add src/views/GisApp src/i18n/locales
git commit -m "feat(gis): bind a disputed-status column from the layer inspector"
```

---

## Stage 3: the export sheet (slice 7.3)

### Task 11: Page geometry

**Files:**

- Create: `src/views/GisApp/export/ExportPageLayout/ExportPageLayout.ts`
- Create: `src/views/GisApp/export/ExportPageLayout/ExportPageLayout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/views/GisApp/export/ExportPageLayout/ExportPageLayout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ExportPageLayout } from "@/views/GisApp/export/ExportPageLayout/ExportPageLayout";

describe("ExportPageLayout.fromLayout", () => {
  it("puts the legend in a 56 mm right column in landscape", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "landscape",
    });

    expect(page.pageMm).toEqual({ width: 297, height: 210 });
    expect(page.legendMm.width).toBe(56);
    expect(page.legendMm.x).toBeGreaterThan(page.mapFrameMm.x);
    expect(page.legendMm.y).toBe(page.mapFrameMm.y);
  });

  it("puts the legend below the map frame in portrait", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "portrait",
    });

    expect(page.pageMm).toEqual({ width: 210, height: 297 });
    expect(page.legendMm.y).toBeGreaterThan(page.mapFrameMm.y);
    expect(page.legendMm.x).toBe(page.mapFrameMm.x);
  });

  it("keeps 12 mm margins on every edge", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "letter",
      orientation: "landscape",
    });

    expect(page.mapFrameMm.x).toBe(12);
    expect(page.pageMm.width - (page.legendMm.x + page.legendMm.width)).toBe(
      12,
    );
  });

  it("absorbs the letter width difference into the map frame", () => {
    const a4 = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "landscape",
    });
    const letter = ExportPageLayout.fromLayout({
      paper: "letter",
      orientation: "landscape",
    });

    expect(letter.legendMm.width).toBe(a4.legendMm.width);
    expect(letter.mapFrameMm.width).not.toBe(a4.mapFrameMm.width);
  });

  it("sizes the map canvas at 200 dpi", () => {
    const page = ExportPageLayout.fromLayout({
      paper: "a4",
      orientation: "landscape",
    });

    expect(page.mapCanvasPx.width).toBe(
      Math.round((page.mapFrameMm.width / 25.4) * 200),
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/ExportPageLayout/ExportPageLayout.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the module**

Create `src/views/GisApp/export/ExportPageLayout/ExportPageLayout.ts`. It
exports `ExportPageLayout.fromLayout(options: { paper; orientation })` returning

```ts
export type ExportPageGeometry = {
  pageMm: { width: number; height: number };
  mapFrameMm: { x: number; y: number; width: number; height: number };
  legendMm: { x: number; y: number; width: number; height: number };
  headerMm: { x: number; y: number; width: number; height: number };
  footerMm: { x: number; y: number; width: number; height: number };
  mapCanvasPx: { width: number; height: number };
};
```

Constants: `MARGIN_MM = 12`, `LEGEND_COLUMN_WIDTH_MM = 56`,
`LEGEND_ROW_HEIGHT_MM = 44`, `HEADER_HEIGHT_MM = 18`,
`FOOTER_HEIGHT_MM = 16`, `EXPORT_DPI = 200`, `MM_PER_INCH = 25.4`, and

```ts
const PAPER_SIZES_MM = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
} as const;
```

Landscape swaps width and height. The map frame takes the remaining space after
margins, header, footer, and the legend column (landscape) or legend row
(portrait). `mapCanvasPx` is `Math.round((mm / 25.4) * EXPORT_DPI)` on each
axis. Document in the file's header comment why paper size is not a layout
fork (shell §7.1: the ~18 mm width difference is absorbed by the map frame).

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/ExportPageLayout/ExportPageLayout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export
git commit -m "feat(gis): millimetre page geometry for the map export"
```

---

### Task 12: Furniture text and filter readout

**Files:**

- Create: `src/views/GisApp/export/getExportFurnitureText/getExportFurnitureText.ts`
- Create: `src/views/GisApp/export/getExportFurnitureText/getExportFurnitureText.test.ts`
- Create: `src/views/GisApp/export/getExportFilterReadout/getExportFilterReadout.ts`
- Create: `src/views/GisApp/export/getExportFilterReadout/getExportFilterReadout.test.ts`
- Create: `src/views/GisApp/export/getExportFilename/getExportFilename.ts`
- Create: `src/views/GisApp/export/getExportFilename/getExportFilename.test.ts`

- [ ] **Step 1: Write the failing furniture-text test**

Create
`src/views/GisApp/export/getExportFurnitureText/getExportFurnitureText.test.ts`:

```ts
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { getExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";

function _config(): AvaMapConfig.T {
  const layer = {
    ...MapLayer.createArea("Attack rate"),
    legend: {
      ...MapLayer.createArea("Attack rate").legend,
      title: "Attack rate by health zone",
    },
  };
  return AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer,
  });
}

describe("getExportFurnitureText", () => {
  it("falls back to the map resource name for an empty title", () => {
    expect(
      getExportFurnitureText({
        config: _config(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre, OpenStreetMap contributors",
      }).title,
    ).toBe("Cholera response");
  });

  it("uses the stored title verbatim when set", () => {
    const config = AvaMapConfig.withExportLayout({
      config: _config(),
      exportLayout: {
        ..._config().exportLayout,
        title: { isVisible: true, text: "North Kivu" },
      },
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).title,
    ).toBe("North Kivu");
  });

  it("omits an invisible title even when text is stored", () => {
    const config = AvaMapConfig.withExportLayout({
      config: _config(),
      exportLayout: {
        ..._config().exportLayout,
        title: { isVisible: false, text: "North Kivu" },
      },
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).title,
    ).toBeUndefined();
  });

  it("falls back to the top visible layer's legend title for the subtitle", () => {
    expect(
      getExportFurnitureText({
        config: _config(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).subtitle,
    ).toBe("Attack rate by health zone");
  });

  it("has no subtitle when there is no visible data layer", () => {
    expect(
      getExportFurnitureText({
        config: AvaMapConfig.makeEmpty(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).subtitle,
    ).toBeUndefined();
  });

  it("composes the source line from visible layers and the basemap", () => {
    expect(
      getExportFurnitureText({
        config: _config(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre, OpenStreetMap contributors",
      }).sourceLine,
    ).toContain("MapLibre, OpenStreetMap contributors");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/getExportFurnitureText/getExportFurnitureText.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the module**

Create `getExportFurnitureText.ts` exporting

```ts
/** Header and footer strings the page prints, with fallbacks resolved. */
export type ExportFurnitureText = {
  title: string | undefined;
  subtitle: string | undefined;
  sourceLine: string;
};

/**
 * Resolves the three fallback-bearing furniture strings.
 *
 * A stored empty string means "use the live fallback", which is why the sheet
 * shows the fallback as a placeholder rather than pre-filling the input: an
 * author who renames the map should not be left with a stale printed title.
 */
export function getExportFurnitureText(
  options: Readonly<{
    config: AvaMapConfig.T;
    mapName: string;
    basemapAttribution: string;
  }>,
): ExportFurnitureText;
```

Rules: an invisible line returns `undefined`. An empty visible `title.text`
returns `mapName`. An empty visible `subtitle.text` returns the legend title of
the top visible data layer (`config.layers` is bottom to top, so read from the
end), or `undefined` when there is none. An empty `sourceLine` is composed from
the visible layers' data-source names joined with `", "`, followed by the
basemap attribution. All three are author content and pass through no Lingui
call; the joining separators are punctuation, not copy.

- [ ] **Step 4: Write the filter readout**

Create `getExportFilterReadout/getExportFilterReadout.test.ts` asserting: no
readout when neither `timeRange` nor `aoi` is set; a time entry when
`timeRange` is set, formatted for the given locale from the stored inclusive
ISO-8601 range; an AOI entry when `aoi` is set; both when both are set; and
that the returned AOI entry carries no geometry. Then create
`getExportFilterReadout.ts` returning

```ts
/** Filters disclosed in furniture rather than drawn on the map. */
export type ExportFilterReadout = {
  timeWindow: string | undefined;
  hasAoi: boolean;
};
```

The AOI line's copy lives in the sheet and the composer, not here, because it
is a Lingui string; this function returns only the boolean. Format the time
window with `formatDate` from `@avandar/utils` at the caller's locale.

- [ ] **Step 5: Write the filename helper**

Create `getExportFilename/getExportFilename.test.ts` asserting:
`{ title: "Cholera response, North Kivu", producedAt: new Date("2026-08-18T09:00:00Z") }`
yields `"cholera-response-north-kivu-2026-08-18.pdf"`; that a title of only
punctuation falls back to `"map-2026-08-18.pdf"`; that a very long title is
truncated to 60 characters before the date; and that path separators and
`..` never appear in the result. Then write `getExportFilename.ts`.

- [ ] **Step 6: Run all three suites**

Run: `pnpm vitest run src/views/GisApp/export`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/GisApp/export
git commit -m "feat(gis): resolve export furniture text, filter readout, and filename"
```

---

### Task 13: The export MapSpec

**Files:**

- Create: `src/views/GisApp/export/makeExportMapSpec/makeExportMapSpec.ts`
- Create: `src/views/GisApp/export/makeExportMapSpec/makeExportMapSpec.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/views/GisApp/export/makeExportMapSpec/makeExportMapSpec.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeExportMapSpec } from "@/views/GisApp/export/makeExportMapSpec/makeExportMapSpec";
import { MapChromeOverlayIds } from "@/views/GisApp/MapCanvas/useMapChromeOverlays";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";

describe("makeExportMapSpec", () => {
  it("keeps visible data layers", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpec(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapLayerIds.toLayerId(_dataLayerId());
      }),
    ).toBe(true);
  });

  it("strips the AOI outline", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithAoiChrome(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapChromeOverlayIds.aoiLineLayer;
      }),
    ).toBe(false);
    expect(spec.sources[MapChromeOverlayIds.aoiSource]).toBeUndefined();
  });

  it("strips the measure overlay", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithMeasureChrome(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id.startsWith(MapChromeOverlayIds.measureSource);
      }),
    ).toBe(false);
  });

  it("keeps annotations when the overlay is visible", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithAnnotations(),
      annotations: { isVisible: true, features: [_textAnnotation()] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapLayerIds.annotationSymbolLayer;
      }),
    ).toBe(true);
  });

  it("omits annotations when the overlay is hidden", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithAnnotations(),
      annotations: { isVisible: false, features: [_textAnnotation()] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id === MapLayerIds.annotationSymbolLayer;
      }),
    ).toBe(false);
  });

  it("drops hidden data layers rather than exporting them invisible", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithHiddenLayer(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.layout?.visibility === "none";
      }),
    ).toBe(false);
  });

  it("keeps the disputed casing", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpecWithDisputedCasing(),
      annotations: { isVisible: true, features: [] },
    });

    expect(
      spec.layers.some((layer) => {
        return layer.id.endsWith("-disputed-casing");
      }),
    ).toBe(true);
  });

  it("produces no circle, symbol, cluster, or heatmap layer from an aggregate-only spec", () => {
    const spec = makeExportMapSpec({
      spec: _aggregateOnlyScreenSpec(),
      annotations: { isVisible: false, features: [] },
    });

    expect(
      spec.layers.every((layer) => {
        return layer.type === "fill" || layer.type === "line";
      }),
    ).toBe(true);
  });

  it("carries no feature-state expression into the export", () => {
    const spec = makeExportMapSpec({
      spec: _screenSpec(),
      annotations: { isVisible: true, features: [] },
    });

    expect(JSON.stringify(spec)).not.toContain("feature-state");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/makeExportMapSpec/makeExportMapSpec.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the module**

Create `src/views/GisApp/export/makeExportMapSpec/makeExportMapSpec.ts`:

```ts
/**
 * Strips authoring chrome from the on-screen spec.
 *
 * The export is a second MapLibre instance rather than a screenshot of the
 * live canvas, so this is the only place the difference between "what the
 * author is working in" and "what the reader receives" is decided. Anything
 * left in here prints.
 *
 * @param options.spec The spec currently applied to the on-screen map.
 * @param options.annotations The map's annotation overlay, which prints only
 * when visible.
 * @returns A spec with no AOI outline, measure overlay, hidden layer, or
 * hover and selection feature-state.
 */
export function makeExportMapSpec(
  options: Readonly<{
    spec: MapSpec;
    annotations: AvaMapConfig.AnnotationLayer;
  }>,
): MapSpec;
```

It removes every layer whose id is a `MapChromeOverlayIds` value or begins with
one, removes every source those layers used, removes every layer with
`layout.visibility === "none"`, removes the three annotation layer ids when
`annotations.isVisible` is false, and rewrites any `paint` value containing a
`["feature-state", ...]` expression to the expression's fallback (the last
element of the surrounding `["case", ...]`). Then it prunes sources no
remaining layer references. It never adds a layer, so the aggregate-only
invariant holds by construction: a spec that contained no circle layer cannot
gain one here.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/makeExportMapSpec/makeExportMapSpec.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export
git commit -m "feat(gis): build a chrome-free MapSpec for the export"
```

---

### Task 14: The export sheet

**Files:**

- Create: `src/views/GisApp/export/ExportSheet/ExportSheet.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheet.module.css`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetControls.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetNotices.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheet.test.tsx`

- [ ] **Step 1: Write the failing sheet test**

Create `src/views/GisApp/export/ExportSheet/ExportSheet.test.tsx`:

```tsx
describe("ExportSheet", () => {
  it("persists the paper size", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.click(screen.getByRole("radio", { name: "US Letter" }));

    expect(onConfigChange.mock.calls[0]![0](_config()).exportLayout.paper).toBe(
      "letter",
    );
  });

  it("persists the orientation", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.click(screen.getByRole("radio", { name: "Portrait" }));

    expect(
      onConfigChange.mock.calls[0]![0](_config()).exportLayout.orientation,
    ).toBe("portrait");
  });

  it("persists an edited title", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "North Kivu" },
    });

    expect(
      onConfigChange.mock.calls.at(-1)![0](_config()).exportLayout.title.text,
    ).toBe("North Kivu");
  });

  it("shows the live title fallback as a placeholder", () => {
    _render({ mapName: "Cholera response" });

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute(
      "placeholder",
      "Cholera response",
    );
  });

  it("unsets the disclaimer when the field is cleared", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange, disclaimer: "Our own wording." });

    fireEvent.change(screen.getByRole("textbox", { name: "Disclaimer" }), {
      target: { value: "" },
    });

    expect(
      onConfigChange.mock.calls.at(-1)![0](_config()).exportLayout.disclaimer,
    ).toBeUndefined();
  });

  it("keeps the mandatory controls checked, disabled, and focusable", () => {
    _render({});

    ["Source attribution", "Boundary disclaimer", "Production date"].forEach(
      (name) => {
        const control = screen.getByRole("checkbox", {
          name: new RegExp(name),
        });
        expect(control).toBeChecked();
        expect(control).toHaveAttribute("aria-disabled", "true");
        expect(control).toHaveAccessibleName(/Always included/);
      },
    );
  });

  it("does not let a mandatory control be unchecked", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Boundary disclaimer/ }),
    );

    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it("shows the filter readout only when a filter is set", () => {
    const { rerender } = _render({});
    expect(screen.queryByText("Area of interest applied")).toBeNull();

    _rerenderWithAoi(rerender);
    expect(screen.getByText("Area of interest applied")).toBeInTheDocument();
  });

  it("states the aggregate-only suppression when such a layer is visible", () => {
    _render({ layers: [_aggregateOnlyLayer()] });

    expect(
      screen.getByText(/applies the same suppression as the screen/),
    ).toBeInTheDocument();
  });

  it("warns about a dark basemap without disabling download", () => {
    _render({ basemap: { type: "builtIn", style: "dark" } });

    expect(screen.getByText(/photocopy poorly/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download PDF" }),
    ).toBeEnabled();
  });

  it("stays available with an empty layer stack", () => {
    _render({ layers: [] });

    expect(
      screen.getByRole("button", { name: "Download PDF" }),
    ).toBeEnabled();
  });

  it("stays available while DuckDB Spatial is unavailable", () => {
    _render({ spatialAvailability: "unavailable" });

    expect(
      screen.getByRole("button", { name: "Download PDF" }),
    ).toBeEnabled();
  });
});
```

The last two cases matter because Export snapshots whatever the screen already
shows. A map that is drawing a basemap and furniture, or drawing partial data
because spatial is down, is still a truthful page; blocking the download would
withhold the map the author can actually see.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/ExportSheet/ExportSheet.test.tsx`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the sheet**

Create `ExportSheet.tsx` as a Mantine `Drawer` (or the app's existing sheet
component; match `FeatureInspector`'s choice) with `title={t`Export`}`. Props:

```ts
type Props = {
  opened: boolean;
  onClose: () => void;
  config: AvaMapConfig.T;
  mapName: string;
  workspaceName: string;
  basemapAttribution: string;
  spec: MapSpec;
  view: AvaMapConfig.ViewState;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};
```

Every write goes through
`onConfigChange((current) => AvaMapConfig.withExportLayout({ config: current,
exportLayout: next }))`. This component is the only caller of
`withExportLayout` outside tests.

`ExportSheetControls.tsx` holds the paper radio group (`A4`, `US Letter`),
orientation radio group (`Landscape`, `Portrait`), title and subtitle text
inputs with visibility switches, north arrow and scale bar switches, the source
line input, and the disclaimer textarea. Title, subtitle, and source line use
`getExportFurnitureText` output as `placeholder`, never as `value`.

The three mandatory rows are Mantine `Checkbox`es with `checked`,
`aria-disabled`, no `disabled`, and an accessible name ending in
`t`Always included``. Their `onChange` is a no-op; they never call
`onConfigChange`.

`ExportSheetNotices.tsx` renders, in order: the filter readout when
`getExportFilterReadout` reports either filter (time window text and, for AOI,
`t`Area of interest applied``); the aggregate-only statement using shell §5.4
copy with the layer name and threshold filled from the layer, when any visible
layer is aggregate-only; and the dark or satellite basemap warning
(`t`A dark or satellite basemap may photocopy poorly.``).

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/ExportSheet/ExportSheet.test.tsx`
Expected: PASS. The download button may be a stub in this task; Task 18 wires
it. Do not remove the Export button's `aria-disabled` yet.

- [ ] **Step 5: Extract and compile messages**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: The sheet's strings appear in the catalogs.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp/export src/i18n/locales
git commit -m "feat(gis): export sheet writes the persisted export layout"
```

---

## Stage 4: the PDF pipeline (slice 7.4)

### Task 15: Offscreen map capture

**Files:**

- Create: `src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.ts`
- Create: `src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.test.ts`

- [ ] **Step 1: Write the failing test**

Create
`src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.test.ts`.
Mock `maplibre-gl` with a fake `Map` whose constructor records its options and
whose `once("idle", handler)` fires on demand:

```ts
describe("captureExportMapCanvas", () => {
  it("requests a preserved drawing buffer", async () => {
    await _capture();

    expect(
      mapConstructorOptions.canvasContextAttributes.preserveDrawingBuffer,
    ).toBe(true);
  });

  it("sizes the container to the 200 dpi map frame", async () => {
    await _capture({ mapCanvasPx: { width: 1800, height: 1200 } });

    expect(mapConstructorOptions.container.style.width).toBe("1800px");
    expect(mapConstructorOptions.container.style.height).toBe("1200px");
  });

  it("jumps to the view without a flight under reduced motion", async () => {
    _setPrefersReducedMotion(true);
    await _capture();

    expect(fakeMap.flyTo).not.toHaveBeenCalled();
    expect(mapConstructorOptions.center).toEqual([-74.006, 40.7128]);
  });

  it("rejects when the map never reaches idle", async () => {
    await expect(_captureWithoutIdle()).rejects.toThrow(
      "The export map did not finish rendering",
    );
  });

  it("rejects on a blank canvas rather than returning one", async () => {
    _setCanvasBlank(true);

    await expect(_capture()).rejects.toThrow("The export map rendered blank");
  });

  it("rejects when the WebGL context is lost", async () => {
    _emitWebglContextLost();

    await expect(_capture()).rejects.toThrow("The export map rendered blank");
  });

  it("removes the map and its container on success", async () => {
    await _capture();

    expect(fakeMap.remove).toHaveBeenCalled();
    expect(document.body.contains(mapConstructorOptions.container)).toBe(false);
  });

  it("removes the map and its container on failure", async () => {
    _setCanvasBlank(true);
    await _capture().catch(() => {});

    expect(fakeMap.remove).toHaveBeenCalled();
    expect(document.body.contains(mapConstructorOptions.container)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the module**

Create
`src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.ts`:

```ts
/** How long the offscreen map may take to reach idle, in milliseconds. */
const IDLE_TIMEOUT_MS = 15_000;

/**
 * Renders the export spec on a second, offscreen MapLibre map and returns its
 * canvas.
 *
 * A blank canvas, a lost WebGL context, or an idle timeout rejects. A PDF with
 * a black or empty map frame is worse than no PDF: it is a sitrep that says
 * nothing while looking like it says something.
 *
 * @param options.spec The chrome-free spec from `makeExportMapSpec`.
 * @param options.styleUrl The authored basemap style; it is never swapped for
 * a light one, because the author framed the map they framed.
 * @param options.view The on-screen camera, applied as a jump, never a flight.
 * @param options.mapCanvasPx Map frame size in pixels at export dpi.
 * @returns The rendered canvas, still attached to the offscreen map's
 * container until this function removes it.
 * @throws When the map does not reach idle, renders blank, or loses context.
 */
export async function captureExportMapCanvas(
  options: Readonly<{
    spec: MapSpec;
    styleUrl: string | StyleSpecification;
    view: AvaMapConfig.ViewState;
    mapCanvasPx: { width: number; height: number };
  }>,
): Promise<HTMLCanvasElement>;
```

Implementation: create a detached `div`, size it in pixels, position it
offscreen (`position: fixed; left: -10000px; top: 0`), append to
`document.body`. Construct `new maplibregl.Map({ container, style,
center: view.center, zoom: view.zoom,
canvasContextAttributes: { preserveDrawingBuffer: true },
interactive: false, attributionControl: false, fadeDuration: 0 })`. On
`style.load`, apply the spec with the existing `syncMap`. Race `once("idle")`
against an `IDLE_TIMEOUT_MS` timer and a `webglcontextlost` listener. On idle,
read `map.getCanvas()`, copy it into a detached 2D canvas of the same size
(so removing the map does not invalidate the pixels), and check that the copy
is not uniformly transparent or uniformly black before returning it. Always
`map.remove()` and `container.remove()` in a `finally`.

Reduced motion: the camera is set in the constructor, so there is never a
flight. The test asserts that `flyTo` is not called; do not add an `easeTo`
either.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export
git commit -m "feat(gis): snapshot an offscreen export map at 200 dpi"
```

---

### Task 16: PDF composition

**Files:**

- Create: `src/views/GisApp/export/composeExportPdf/composeExportPdf.ts`
- Create: `src/views/GisApp/export/composeExportPdf/composeExportPdf.test.ts`
- Create: `src/views/GisApp/export/composeExportPdf/drawExportLegend.ts`

- [ ] **Step 1: Write the failing test**

Create `src/views/GisApp/export/composeExportPdf/composeExportPdf.test.ts`.
Mock `jspdf` with a recording fake exposing `addImage`, `text`, `rect`,
`line`, `addPage`, `setProperties`, `save`, and a `getNumberOfPages`:

```ts
describe("composeExportPdf", () => {
  it("writes one page when the legend fits", async () => {
    await composeExportPdf(_options({ legendEntryCount: 3 }));

    expect(fakeDocument.addPage).not.toHaveBeenCalled();
  });

  it("moves the legend to page 2 when it cannot fit", async () => {
    await composeExportPdf(_options({ legendEntryCount: 60 }));

    expect(fakeDocument.addPage).toHaveBeenCalledTimes(1);
  });

  it("never shrinks the map frame to fit a legend", async () => {
    const small = await _capturedMapFrame({ legendEntryCount: 3 });
    const large = await _capturedMapFrame({ legendEntryCount: 60 });

    expect(large).toEqual(small);
  });

  it("adds page numbers only when there is a second page", async () => {
    await composeExportPdf(_options({ legendEntryCount: 60 }));

    expect(_writtenText()).toContain("Page 1 of 2");
  });

  it("names the file from the rendered title and production date", async () => {
    await composeExportPdf(
      _options({
        title: "Cholera response",
        producedAt: new Date("2026-08-18T09:00:00Z"),
      }),
    );

    expect(fakeDocument.save).toHaveBeenCalledWith(
      "cholera-response-2026-08-18.pdf",
    );
  });

  it("prints the production date", async () => {
    await composeExportPdf(
      _options({ producedAt: new Date("2026-08-18T09:00:00Z") }),
    );

    expect(_writtenText().join(" ")).toContain("2026");
  });

  it("prints the workspace name", async () => {
    await composeExportPdf(_options({ workspaceName: "DRC Response" }));

    expect(_writtenText()).toContain("DRC Response");
  });

  it("prints the filter readout when a filter is set", async () => {
    await composeExportPdf(_options({ hasAoi: true }));

    expect(_writtenText()).toContain("Area of interest applied");
  });

  it("omits the filter readout when no filter is set", async () => {
    await composeExportPdf(_options({ hasAoi: false, timeWindow: undefined }));

    expect(_writtenText()).not.toContain("Area of interest applied");
  });

  it("prints the locked disputed row when a disputed segment is drawn", async () => {
    await composeExportPdf(_options({ hasDrawnDisputedFeature: true }));

    expect(_writtenText()).toContain("Disputed or undetermined boundary");
  });

  it("uses light surfaces regardless of the app theme", async () => {
    _setAppTheme("dark");
    await composeExportPdf(_options({}));

    expect(fakeDocument.setFillColor).toHaveBeenCalledWith("#ffffff");
  });

  it("does not save when composition throws", async () => {
    fakeDocument.addImage.mockImplementation(() => {
      throw new Error("boom");
    });

    await expect(composeExportPdf(_options({}))).rejects.toThrow("boom");
    expect(fakeDocument.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/composeExportPdf/composeExportPdf.test.ts`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the composer**

Create `composeExportPdf.ts`:

```ts
/** Everything the page prints, already resolved. */
export type ExportPdfInput = {
  canvas: HTMLCanvasElement;
  page: ExportPageGeometry;
  layout: AvaMapConfig.ExportLayout;
  text: ExportFurnitureText;
  workspaceName: string;
  disclaimer: string;
  filterReadoutLines: readonly string[];
  legendEntries: readonly ExportLegendEntry[];
  hasDrawnDisputedFeature: boolean;
  disputedLegendLabel: string;
  scaleLabel: string | undefined;
  producedAtLabel: string;
  filename: string;
  pageNumberLabel: (options: { page: number; total: number }) => string;
};

/**
 * Composes the map snapshot and furniture into a PDF and saves it.
 *
 * Every displayable string arrives already localized: this module runs outside
 * React and must not reach for a Lingui hook.
 *
 * The map frame is never shrunk and the legend is never truncated. When the
 * legend does not fit, it takes page 2 and the footer gains page numbers.
 */
export async function composeExportPdf(input: ExportPdfInput): Promise<void>;
```

Construct `new jsPDF({ unit: "mm", format: input.layout.paper, orientation:
input.layout.orientation })`. Paint the page background `#ffffff` and all text
`#111111`, hardcoded, never from theme tokens. Draw header (title, subtitle,
workspace name, production date), place the canvas with `addImage` at
`page.mapFrameMm`, draw the legend via `drawExportLegend`, draw the north arrow
and scale into the legend block's foot (landscape) or right (portrait), and
draw the footer (source line, disclaimer, filter readout lines). Call
`document.save(input.filename)` last, so a throw anywhere above leaves no file.

`drawExportLegend.ts` also owns the legend entry type the composer's input
references:

```ts
/** One printed legend row: a swatch and its label. */
export type ExportLegendEntry = {
  label: string;
  swatch:
    | { type: "fill"; color: string }
    | { type: "line"; color: string; isDashed: boolean }
    | { type: "circle"; color: string; radiusPx: number };
};
```

`drawExportLegend.ts` exports a pure function that, given the legend block's
millimetre rectangle and the entries, returns either
`{ fitsOnPage: true; rows }` or `{ fitsOnPage: false }` after reflowing into as
many columns as the block allows. `composeExportPdf` calls `addPage()` and
redraws the legend full-page only in the second case. The locked disputed row,
when required, is the last entry and is passed in like any other; it is never
dropped by the fitting logic.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/composeExportPdf/composeExportPdf.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export
git commit -m "feat(gis): compose the export PDF from the snapshot and furniture"
```

---

### Task 17: Download orchestration

**Files:**

- Create: `src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.ts`
- Create: `src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.test.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetPreview.tsx`
- Modify: `src/views/GisApp/export/ExportSheet/ExportSheet.tsx`

- [ ] **Step 1: Write the failing hook test**

Create
`src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.test.tsx`,
mocking `captureExportMapCanvas` and `composeExportPdf`:

```tsx
describe("useExportPdfDownload", () => {
  it("starts idle with the download available", () => {
    const { result } = renderHook(() => useExportPdfDownload(_input()));

    expect(result.current.status).toBe("idle");
  });

  it("reports pending while the map is not idle", async () => {
    _deferCapture();
    const { result } = renderHook(() => useExportPdfDownload(_input()));

    act(() => {
      void result.current.download();
    });

    expect(result.current.status).toBe("pending");
  });

  it("reports an error and writes no file when capture fails", async () => {
    _failCapture(new Error("The export map rendered blank"));
    const { result } = renderHook(() => useExportPdfDownload(_input()));

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("error");
    expect(composeExportPdfMock).not.toHaveBeenCalled();
  });

  it("reports an error when composition throws", async () => {
    _failCompose(new Error("boom"));
    const { result } = renderHook(() => useExportPdfDownload(_input()));

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("error");
  });

  it("allows a retry after an error", async () => {
    _failCapture(new Error("blank"));
    const { result } = renderHook(() => useExportPdfDownload(_input()));
    await act(async () => {
      await result.current.download();
    });
    _succeedCapture();

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("success");
  });

  it("stamps the production date at download, not at render", async () => {
    const { result } = renderHook(() => useExportPdfDownload(_input()));
    vi.setSystemTime(new Date("2026-08-19T00:00:00Z"));

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].filename).toContain(
      "2026-08-19",
    );
  });

  it("prints a scale bar above zoom 4", async () => {
    const { result } = renderHook(() =>
      useExportPdfDownload(_input({ zoom: 8 })),
    );

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].scaleLabel).toMatch(/km|m$/);
  });

  it("replaces the bar with a caveat below zoom 4", async () => {
    const { result } = renderHook(() =>
      useExportPdfDownload(_input({ zoom: 3 })),
    );

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].scaleLabel).toBe(
      "Scale varies across this map",
    );
  });

  it("passes no scale when the author turned the bar off", async () => {
    const { result } = renderHook(() =>
      useExportPdfDownload(_input({ scaleBar: false })),
    );

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].scaleLabel).toBeUndefined();
  });
});
```

The last three cases implement spec §4.2's scale rule. Derive `scaleLabel` by
calling the existing `MapScale.fromMetersPerPixel` with the export camera's
resolution: a `bar` result becomes the distance string, a `varies` result
becomes `t`Scale varies across this map``, and `scaleBar: false` yields
`undefined`. Do not add a second scale calculation; printing a confidently
wrong scale is worse than printing none, and one implementation is how screen
and page stay in agreement.

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.test.tsx`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Write the hook**

Create `useExportPdfDownload.ts` returning

```ts
export type ExportDownloadStatus = "idle" | "pending" | "success" | "error";

/**
 * Orchestrates one PDF download.
 *
 * The production date is read at download time, so a sitrep forwarded three
 * weeks later cannot claim it was produced when the map was saved.
 */
export function useExportPdfDownload(
  input: Readonly<UseExportPdfDownloadInput>,
): {
  status: ExportDownloadStatus;
  errorMessage: string | undefined;
  download: () => Promise<void>;
};
```

It resolves the page geometry, builds the export spec, captures the canvas,
resolves furniture text and the filename with `new Date()` at call time, and
calls `composeExportPdf`. Every displayable string is resolved through
`useLingui` inside the hook and passed down; `composeExportPdf` receives only
finished strings. A rejection sets `status: "error"` and a localized message;
it never calls `composeExportPdf`.

- [ ] **Step 4: Add the preview and the download button**

`ExportSheetPreview.tsx` renders a scaled preview using the same
`ExportPageLayout` geometry and the same furniture components as the page, with
an `aria-label` of `t`Export preview``. Give it `role="img"` so it has one
accessible name rather than a tree of unlabeled boxes.

In `ExportSheet.tsx`, add the primary `Button` labelled `t`Download PDF``,
`loading` while `status === "pending"`, and render the error status with a
retry affordance when `status === "error"`. Add these tests to
`ExportSheet.test.tsx`:

```tsx
it("disables the download while the export is pending", () => { /* ... */ });
it("shows a retry status when the download fails", () => { /* ... */ });
it("gives the preview an accessible name", () => {
  _render({});

  expect(screen.getByRole("img", { name: "Export preview" })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the export suites**

Run: `pnpm vitest run src/views/GisApp/export`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp/export
git commit -m "feat(gis): download the composed export PDF with a failure status"
```

---

### Task 18: Enable the Export button

**Files:**

- Modify: `src/views/GisApp/shell/MapTopBar/MapOutputActions/MapOutputActions.tsx`
- Modify: `src/views/GisApp/shell/MapTopBar/MapTopBar.tsx`
- Modify: `src/views/GisApp/shell/MapTopBar/MapTopBar.test.tsx`
- Modify: `src/views/GisApp/GisAppTopBar.tsx`
- Modify: `src/views/GisApp/GisAppMapShell.tsx`

- [ ] **Step 1: Rewrite the disabled-button test**

In `MapTopBar.test.tsx`, replace the "Print and PDF export arrives in a later
release." assertion with:

```tsx
it("opens the export sheet", () => {
  const onOpenExport = vi.fn();
  _renderTopBar({ onOpenExport });

  fireEvent.click(screen.getByRole("button", { name: "Export" }));

  expect(onOpenExport).toHaveBeenCalledTimes(1);
});

it("does not mark export unavailable", () => {
  _renderTopBar({});

  expect(screen.getByRole("button", { name: "Export" })).not.toHaveAttribute(
    "aria-disabled",
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/views/GisApp/shell/MapTopBar/MapTopBar.test.tsx`
Expected: FAIL. The button is still `aria-disabled` and has no handler.

- [ ] **Step 3: Wire the button**

In `MapOutputActions.tsx`, remove the `Tooltip` wrapper and the
`aria-disabled` attribute, add `onOpenExport: () => void` to `Props`, and call
it from `onClick`. Thread `onOpenExport` through `MapTopBar.tsx` and
`GisAppTopBar.tsx`. In `GisAppMapShell.tsx`, hold the sheet's open state and
render `<ExportSheet ... />` beside `<FeatureInspector ... />`, passing
`app.mapConfig`, `app.name`, the workspace name from `useCurrentWorkspace()`,
the basemap attribution computed the same way `GisAppFurnitureBar` computes it,
`app.spec`, `app.mapConfig.view`, and `app.updateConfig`.

- [ ] **Step 4: Run the shell tests**

Run: `pnpm vitest run src/views/GisApp`
Expected: PASS. `GisApp.test.tsx` may assert the disabled Export button; update
that assertion the same way.

- [ ] **Step 5: Run the full frontend suite**

Run: `pnpm test:frontend`
Expected: PASS.

- [ ] **Step 6: Extract and compile messages**

Run: `pnpm i18n:extract && pnpm i18n:compile`
Expected: The later-release string is gone from the catalogs; no new
untranslated string remains.

- [ ] **Step 7: Commit**

```bash
git add src/views/GisApp src/i18n/locales
git commit -m "feat(gis): enable the map export control"
```

---

## Stage 5: end-to-end verification (slice 8.5)

### Task 19: Disputed boundaries end to end

**Files:**

- Create: `tests/data/gis-wave-e/disputed-boundaries.csv`
- Create: `tests/e2e/gis-disputed-boundaries.spec.ts`
- Modify: `tests/e2e/helpers/constants.ts`

- [ ] **Step 1: Create the fixture**

`tests/data/gis-wave-e/disputed-boundaries.csv` has four rows: a `name`
column, a `status` column, and a `geometry` column of GeoJSON polygon strings.
Two rows have `status` of `Agreed`, one `Disputed`, one `Undetermined`. Add
`GIS_DISPUTED_BOUNDARIES_CSV_PATH` and `GIS_DISPUTED_BOUNDARIES_ROW_COUNT` to
`tests/e2e/helpers/constants.ts`, following the Wave D entries.

- [ ] **Step 2: Write the spec**

Create `tests/e2e/gis-disputed-boundaries.spec.ts`, modelled on
`gis-geometry-column.spec.ts`. It imports the CSV through the UI, seeds a map
with `seedAvaMap`, binds the geometry column, binds `status` as the
disputed-status column, assigns `Disputed` and `Undetermined` to their lists,
reloads the page, and asserts:

- the locked legend row reads "Disputed or undetermined boundary"
- the rendered style contains a layer id ending `-disputed-casing` whose
  `line-dasharray` paint is `[3, 2]`, read through `window.__avandarE2EMap`
  the way `gis-time-range.spec.ts` reads sources
- the casing layer's `line-color` is not the fill layer's stroke color

Clean up the dataset and the map in `finally` with `deleteDatasetAndShares` and
`deleteMapsByIds`. Keep the local timeout at or under 45 seconds.

- [ ] **Step 3: Run the spec**

Run: `pnpm test:e2e tests/e2e/gis-disputed-boundaries.spec.ts`
Expected: PASS. Run this file alone; never the full suite.

- [ ] **Step 4: Commit**

```bash
git add tests
git commit -m "test(gis): disputed boundary casing and legend end to end"
```

---

### Task 20: Export layout persistence end to end

**Files:**

- Create: `tests/e2e/gis-export-layout.spec.ts`

- [ ] **Step 1: Write the spec**

Seed a map with `seedAvaMap`, open Export, set orientation to Portrait, type a
title, type a custom disclaimer, wait for the save indicator to settle, reload,
reopen Export, and assert the title input holds the typed title, Portrait is
selected, and the disclaimer textarea holds the typed text. Also assert that
the on-screen furniture strip shows the custom disclaimer rather than the
default, which is what proves screen and page agree. Delete the map in
`finally`.

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e tests/e2e/gis-export-layout.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests
git commit -m "test(gis): export layout persists across a reload"
```

---

### Task 21: PDF download end to end

**Files:**

- Create: `tests/e2e/gis-export-pdf.spec.ts`

- [ ] **Step 1: Write the spec**

Seed a map with one visible layer, open Export, click Download PDF, and await
`page.waitForEvent("download")`. Assert the suggested filename ends in `.pdf`
and starts with the slugified title. Do not parse the PDF bytes: a byte-level
assertion in Playwright tests `jspdf`, not this feature, and Task 16 already
covers composition.

Clean up the map in `finally`.

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e tests/e2e/gis-export-pdf.spec.ts`
Expected: PASS. If the headless browser cannot obtain a WebGL context, the
download must fail visibly rather than produce a blank page; if that happens,
assert the error status instead of the download and note it in the spec's
header comment. Do not weaken `captureExportMapCanvas`'s blank-canvas check to
make this pass.

- [ ] **Step 3: Commit**

```bash
git add tests
git commit -m "test(gis): map export downloads a PDF"
```

---

### Task 22: Full verification

- [ ] **Step 1: Typecheck**

Run: `pnpm type-check`
Expected: PASS with no errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: PASS. Fix any function over 45 lines and any exported symbol missing
a docstring rather than suppressing the rule.

- [ ] **Step 3: Frontend tests**

Run: `pnpm test:frontend`
Expected: PASS.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: i18n validation**

Run: `pnpm i18n:extract && pnpm i18n:compile && git diff --stat src/i18n/locales`
Expected: Only expected catalog changes. No untranslated user-visible string
remains, and no persisted author string (title, subtitle, source line, custom
disclaimer) has been wrapped in a Lingui macro.

- [ ] **Step 6: Re-run each end-to-end file individually**

```bash
pnpm test:e2e tests/e2e/gis-disputed-boundaries.spec.ts
pnpm test:e2e tests/e2e/gis-export-layout.spec.ts
pnpm test:e2e tests/e2e/gis-export-pdf.spec.ts
```

Expected: PASS, one file at a time.

- [ ] **Step 7: Confirm the completion criteria**

Walk spec §9 and confirm each item against a command you actually ran:

1. Every valid Wave D map opens unchanged — Task 2's migration suite.
2. `exportLayout` persists and is the only writer of disclaimer text — Task 3,
   Task 14, Task 20. Confirm with
   `grep -rn "withExportLayout" src | grep -v test` that only `ExportSheet.tsx`
   calls it.
3. Disputed casing and the locked row match on screen and in the export spec —
   Task 8, Task 9, Task 13, Task 16.
4. Download produces a PDF or a visible failure, never a blank map page —
   Task 15, Task 17.
5. The PDF map frame has no authoring chrome — Task 13.
6. Aggregate only still cannot put a source point in the result or MapLibre,
   including during export — Task 13's last two cases plus the existing
   `SensitivityViolationError` tests.
7. Type checking, lint, tests, build, i18n, and each e2e file pass — Steps 1
   through 6 above.

---

## What this plan does not do

Deferred by spec §3.2 and left untouched: the browser print dialog, PNG export,
any logo, public map routes and the Map PBlock, isochrones, offline basemap
caching, HDX and ABox sources, forcing a light basemap on export, the
greyscale diverging-ramp opposite-hatch from shell §6.6, categorical direct
labels, and any Supabase schema change.

Sibling Wave E worktrees rebase onto this migration and bump from version 5.
