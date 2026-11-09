# F4 Feature List in the PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The exported map PDF can carry one layer's feature list as a table on the pages after the map, fetched at download time with the on-screen filters, with "Page n of N" and the footer on every page.

**Architecture:** `ExportLayout` gains a persisted `featureList` (map config version 8). At download, `useExportPdfDownload` calls a new `loadExportFeatureTable`, which runs F3's `fetchMapLayerFeatureList` with the workspace's datasets and columns and turns the result into plain localized strings (`ExportFeatureTable`), formatting cells with F3's `formatFeatureListCell` so the PDF reads like the drawer. `composeExportPdf` lays those strings out with a new pure `drawExportFeatureTable` (beside `drawExportLegend`) and prints one jsPDF page per table page after the map page and any legend overflow page.

**Tech Stack:** TypeScript, React 19, Mantine, Lingui (`msg` + `i18n._`), zod 4, jsPDF 4, Vitest, Playwright.

**Spec:** [workflow-b-map-features-design.md](workflow-b-map-features-design.md) §6

**Depends on:** F3 (filter by layer, and the feature list) merged into `demo/measles`, which itself builds on F1. The source of truth for every F3 name used here is [workflow-b-f3-filter-by-layer-plan.md](workflow-b-f3-filter-by-layer-plan.md): `AvaMapConfig` version 7 (`AvaMapConfigV7Schema`, `AvaMapConfigV7LayerSchema`, `_migrateVersion6`; F1 added version 6), `MapLayer.T.spatialFilter`, `BufferOfLayerBinding.distanceUnit` and `.labelColumn`, `MapLayer.getBufferDistanceFromMeters`, `src/clients/maps/MapLayerFeatureList/` (`fetchMapLayerFeatureList`, `getFeatureListAccessFromMapLayer`, `MAP_LAYER_FEATURE_LIST_ROW_KEYS`, and the types), `BUFFER_DISTANCE_UNIT_LABELS`, and the drawer's `formatFeatureListCell`. This plan consumes them and never reimplements them.

**No schema work.** Nothing here touches `supabase/`, so no `ava supabase switch` and no `pnpm db:*` command is needed.

---

## File structure

| File | Action | Responsibility |
| --- | --- | --- |
| `shared/models/AvaMap/AvaMapConfig/ExportLayout.types.ts` | Modify | `ExportFeatureList`, `ExportFeatureListSort`, `ExportFeatureListSortDirection`, and `ExportLayout.featureList` |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts` | Modify | Sort directions, default row cap 200, maximum 1,000 |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts` | Modify | Namespace exports `AvaMapConfig.ExportFeatureList` and `AvaMapConfig.ExportFeatureListSort` |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts` | Modify | `AvaMapConfigRead` version literal 7 to 8 |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV8Schema.ts` | Create | Version 8 zod schema: version 7 plus `exportLayout.featureList` |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts` | Modify | `_migrateVersion7`, `fromV7`, and a version 5 default export layout without `featureList` |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts` | Modify | Parse version 7 through migration, version 8 as current |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.ts` | Modify | Default `featureList: undefined`, feature list equality, row cap normalization |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts` | Modify | `makeEmpty` version 8; `withLayerRemoved` clears a feature list whose layer is removed |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v8SchemaSuites.ts` | Create | Version 7 to 8 migration and round-trip tests |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts` | Modify | `omitFeatureListField`, `createEmptyVersion7Json`, `createVersion8FeatureListJson`; F1's and F3's older-version fixtures drop `featureList` |
| `src/views/GisApp/export/getExportFeatureTableCopy/getExportFeatureTableCopy.ts` (+ test) | Create | Summary line and truncation note, localized |
| `src/views/GisApp/export/loadExportFeatureTable/loadExportFeatureTable.ts` (+ test) | Create | Fetches the list at download and builds an `ExportFeatureTable` with `formatFeatureListCell` |
| `src/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable.ts` (+ test) | Create | Pure table layout: wrapping, header repeat, pagination, `toPdfSafeText` |
| `src/views/GisApp/export/composeExportPdf/composeExportPdf.ts` (+ test, + snapshot) | Modify | Table pages, "Page n of N" across all pages, footer on every page |
| `src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.ts` (+ test) | Modify | Reads the workspace's datasets and columns, loads the feature table at download, and hands it to the composer |
| `src/views/GisApp/GisAppMapShell.tsx` | Modify | Passes `app.avaMap.workspaceId` to `ExportSheet` |
| `src/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig.ts` (+ test) | Create | Eligible layers, defaults, and pure edits for the export sheet |
| `src/views/GisApp/export/ExportSheet/updateExportFeatureList.ts` | Create | Funnels a feature list edit through `updateExportLayout` |
| `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListFields.tsx` | Create | "Include a feature list" switch |
| `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListOptions.tsx` | Create | Layer select plus the column, sort, and row cap fields |
| `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListColumnFields.tsx` | Create | Column checkboxes |
| `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListSortFields.tsx` | Create | Sort column and direction |
| `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListMaxRowsField.tsx` | Create | Row cap input |
| `src/views/GisApp/export/ExportSheet/ExportSheetControls.tsx` | Modify | Renders the feature list section |
| `src/views/GisApp/export/ExportSheet/ExportSheet.tsx`, `updateExportLayout.ts` | Modify | `workspaceId` prop for the download hook; docstrings name the one other `exportLayout` writer |
| `src/views/GisApp/export/ExportSheet/ExportSheet.test.tsx` | Modify | Section behavior |
| `src/i18n/locales/*/messages.po` | Modify (generated) | Extracted strings |
| `tests/e2e/gis-export-feature-list.spec.ts` | Create | Downloaded PDF has more than one page |

---

### Task 0: Workspace

**Files:** none.

- [ ] **Step 1: Wait for F3, then create the worktree**

F4 branches from `demo/measles` only after F3 is merged into it. Load the `using-wt` skill, then:

```bash
wt new feat/gis-pdf-feature-list demo/measles
```

- [ ] **Step 2: Confirm F3's names are present**

```bash
git grep -n "export async function fetchMapLayerFeatureList" -- src/clients/maps/MapLayerFeatureList
git grep -n "export function getFeatureListAccessFromMapLayer" -- src/clients/maps/MapLayerFeatureList
git grep -n "export const MAP_LAYER_FEATURE_LIST_ROW_KEYS" -- src/clients/maps/MapLayerFeatureList
git grep -n "export function formatFeatureListCell" -- src/views/GisApp/panels/FeatureListDrawer
git grep -n "export const BUFFER_DISTANCE_UNIT_LABELS" -- src/views/GisApp/layers
git grep -n "getBufferDistanceFromMeters" -- shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts
git grep -n "export const AvaMapConfigV7Schema\|export const AvaMapConfigV7LayerSchema" -- shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema
git grep -n "function _migrateVersion6\|fromV6: _migrateVersion6" -- shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts
```

Expected: every command prints at least one hit. They are all created by F3's plan (`docs/measles-demo/workflow-b-f3-filter-by-layer-plan.md`, Tasks 2, 4, 12, 15, 17, and 20).

- [ ] **Step 3: Know the F3 facts this plan builds on**

No action; these come from F3's plan and decide the code below.

1. `fetchMapLayerFeatureList(options: FetchMapLayerFeatureListOptions)` takes `config`, `layerId`, `columnIds: readonly QueryColumn.Id[] | "popup"`, `sort: MapLayerFeatureListSort | undefined` (`{ key: string; direction: "asc" | "desc" }`), `limit: number | undefined`, `workspaceId: Workspace.Id`, `datasets: readonly Dataset.T[]`, `datasetColumns: readonly DatasetColumn.T[]`, `i18n: I18n`, and an optional `signal`. It throws for any layer whose `getFeatureListAccessFromMapLayer` is not `"rows"`.
2. A source column's row key is `QueryColumn.getDerivedColumnName(column)`. The distance and nearest-site keys are `MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance` (`"__avandar_distance"`) and `.nearestLabel` (`"__avandar_nearest_label"`). Every row also carries `.longitude` and `.latitude`, which are not columns and must never print; this plan prints only `list.columns`, so they cannot.
3. Distance values in rows are already in `list.distanceUnit`, which is the buffer's own `BufferOfLayerBinding.distanceUnit` (version 7 stores both `distanceMeters` and `distanceUnit`). Nothing in this plan converts a row distance.
4. With `sort: undefined` the list is ordered by distance ascending when a buffer filters the layer, otherwise in source order. Sorting and `limit` run after the query, so `totalCount` is the count before the cap.
5. A layer can be listed only when `getFeatureListAccessFromMapLayer(layer) === "rows"`: exact sensitivity and a `latLngColumns` or `geometryColumn` binding. Boundary joins, point aggregation, grid bins, and buffers are never listable.
6. The drawer formats cells with `formatFeatureListCell({ value, column, distanceUnit, i18n })` ("0.09 mi", blanks as "", objects as JSON). The PDF uses the same function so a printed cell reads like the drawer's.
7. The drawer reads `datasets` and `datasetColumns` with `DatasetClient.useGetAll` and `DatasetColumnClient.useGetAll` filtered by `workspace_id`; `useGisAppRendering` already loads the same two queries, so the export hook reuses the cached results.

- [ ] **Step 4: Run the baseline suites**

```bash
pnpm vitest run src/views/GisApp/export shared/models/AvaMap src/clients/maps
```

Expected: all pass.

- [ ] **Step 5: Note the test data**

Unit tests use inline fixtures only. The e2e spec uses the repo's `tests/data/gis/dated-points.csv`, so it does not need the mirrored Workflow B listings. To try the feature by hand on real data, load the 8 Workflow B listings with the mirror-catalog scripts (ask Pablo for the folder): `REPO=$PWD bash <mirror-catalog>/load-local.sh`.

---

### Task 1: Persist `featureList` in map config version 8

**Files:**
- Modify: `shared/models/AvaMap/AvaMapConfig/ExportLayout.types.ts:1-35`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts:1-15`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts:17-22,55-63`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts:155-159`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV8Schema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.ts:8-66`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts:80-92`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v8SchemaSuites.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts` (append, and F1's `createEmptyVersion5Json` and F3's `createVersion6BufferJson`)
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/AvaMapConfigSchema.test.ts` (suite import, current-version assertions, future-version test)
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.test.ts`

Line ranges are those on `demo/measles` before F1 and F3; find the same blocks if they moved.

- [ ] **Step 1: Add the version 7 and version 8 fixtures**

Versions 5, 6, and 7 persist export furniture through version 5's strict `ExportLayoutSchema`, which rejects any unknown key, even one whose value is `undefined`. Once `featureList` joins the model, a fixture that copies today's `config.exportLayout` into older-version JSON fails to parse. Append to `schemaTestFixtures.ts` (it already imports `uuid`, `AvaMapConfig`, `MapLayer`, and the `QueryColumn` type):

```ts
/**
 * Export furniture as versions 5 to 7 persist it: today's layout without the
 * `featureList` key, which their strict schemas reject.
 */
export function omitFeatureListField(exportLayout: AvaMapConfig.ExportLayout) {
  const { featureList: _featureList, ...olderExportLayout } = exportLayout;
  return olderExportLayout;
}

/** A version 7 config: today's empty map with version 7 export furniture. */
export function createEmptyVersion7Json() {
  const config = AvaMapConfig.makeEmpty();
  return {
    ...config,
    version: 7,
    exportLayout: omitFeatureListField(config.exportLayout),
  } as const;
}

/** A version 8 config whose export prints a one-layer feature list. */
export function createVersion8FeatureListJson(
  options: Readonly<{ maxRows?: number; hasSort?: boolean }> = {},
) {
  const layer = MapLayer.makeEmpty("Schools");
  const columnId = uuid<QueryColumn.Id>();
  return {
    ...AvaMapConfig.makeEmpty(),
    layers: [layer],
    exportLayout: {
      ...AvaMapConfig.defaultExportLayout,
      featureList: {
        layerId: layer.id,
        columnIds: [columnId],
        sort:
          options.hasSort === false
            ? undefined
            : { columnId, direction: "desc" },
        maxRows: options.maxRows ?? 200,
      },
    },
  } as const;
}
```

Then make the two existing older-version fixtures that copy today's layout use the helper. In F1's `createEmptyVersion5Json` (`version: 5`) and F3's `createVersion6BufferJson` (`version: 6`), replace `exportLayout: config.exportLayout,` with `exportLayout: omitFeatureListField(config.exportLayout),`. Check for any other: `git grep -n "exportLayout: config.exportLayout\|defaultExportLayout" -- shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test` and apply the same change to every fixture whose `version` is 5, 6, or 7.

- [ ] **Step 2: Write the failing schema suite**

Create `v8SchemaSuites.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createEmptyVersion7Json,
  createVersion8FeatureListJson,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";

describe("AvaMapConfigSchema v8 feature list", () => {
  it("migrates a version 7 config to version 8 with no feature list", () => {
    const parsed = AvaMapConfigSchema.fromJson(createEmptyVersion7Json());

    expect(parsed.version).toBe(8);
    expect(parsed.exportLayout.featureList).toBeUndefined();
  });

  it("round-trips a feature list with a sort", () => {
    const config = AvaMapConfigSchema.fromJson(createVersion8FeatureListJson());

    expect(config.exportLayout.featureList?.sort?.direction).toBe("desc");
    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("round-trips a feature list in its default order", () => {
    const config = AvaMapConfigSchema.fromJson(
      createVersion8FeatureListJson({ hasSort: false }),
    );

    expect(config.exportLayout.featureList?.sort).toBeUndefined();
    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("rejects a row cap above 1,000 at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(
        createVersion8FeatureListJson({ maxRows: 1001 }),
      );
    }).toThrow();
  });

  it("rejects a row cap of zero at the json boundary", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(
        createVersion8FeatureListJson({ maxRows: 0 }),
      );
    }).toThrow();
  });
});
```

In `AvaMapConfigSchema.test.ts`, after the existing suite imports (`v4SchemaSuites.ts`, `v5SchemaSuites.ts`, and any F1 or F3 added), add:

```ts
import "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v8SchemaSuites.ts";
```

- [ ] **Step 3: Write the failing equality test**

Add to the `describe("exportLayoutUpdaters")` block in `exportLayoutUpdaters.test.ts`, and add the imports `import { uuid } from "$/lib/uuid.ts";`, `import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";`, and `import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";` at the top:

```ts
  it("defaults a new map to no feature list", () => {
    expect(AvaMapConfig.makeEmpty().exportLayout.featureList).toBeUndefined();
  });

  it("stores a changed feature list sort direction", () => {
    const columnId = uuid<QueryColumn.Id>();
    const featureList: AvaMapConfig.ExportFeatureList = {
      layerId: uuid<MapLayer.Id>(),
      columnIds: [columnId],
      sort: { columnId, direction: "asc" },
      maxRows: 200,
    };
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: { ...AvaMapConfig.defaultExportLayout, featureList },
    });

    const nextConfig = AvaMapConfig.withExportLayout({
      config,
      exportLayout: {
        ...config.exportLayout,
        featureList: { ...featureList, sort: { columnId, direction: "desc" } },
      },
    });

    expect(nextConfig.exportLayout.featureList?.sort?.direction).toBe("desc");
  });

  it("returns the same config when an equal feature list is applied", () => {
    const featureList: AvaMapConfig.ExportFeatureList = {
      layerId: uuid<MapLayer.Id>(),
      columnIds: [uuid<QueryColumn.Id>()],
      sort: undefined,
      maxRows: 200,
    };
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: { ...AvaMapConfig.defaultExportLayout, featureList },
    });

    expect(
      AvaMapConfig.withExportLayout({
        config,
        exportLayout: {
          ...config.exportLayout,
          featureList: { ...featureList, columnIds: [...featureList.columnIds] },
        },
      }),
    ).toBe(config);
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig`
Expected: FAIL. The version 7 test reports `expected 7 to be 8`; the version 8 fixtures throw `Unrecognized key: "featureList"`; "stores a changed feature list sort direction" reports `expected 'asc' to be 'desc'` because `_isSameLayout` ignores the new field.

- [ ] **Step 5: Add the types and values**

In `AvaMapConfigValues.ts`, add three keys to the `AvaMapConfigValues` object after `exportOrientations`:

```ts
  exportFeatureListSortDirections: ["asc", "desc"] as const,
  exportFeatureListDefaultMaxRows: 200,
  exportFeatureListMaxRows: 1000,
```

In `ExportLayout.types.ts`, add two imports below the existing one:

```ts
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
```

Add these types above the `ExportLayout` docstring:

```ts
/** Which way a printed feature list sorts its chosen column. */
export type ExportFeatureListSortDirection =
  (typeof AvaMapConfigValues.exportFeatureListSortDirections)[number];

/** The column a printed feature list sorts by, and in which direction. */
export type ExportFeatureListSort = {
  columnId: QueryColumn.Id;
  direction: ExportFeatureListSortDirection;
};

/**
 * One layer's features, printed as a table on the pages after the map.
 *
 * `columnIds` are query columns of the layer, in the layer's column order.
 * `sort` unset means the list's own default order, which puts the nearest
 * feature first when a buffer filters the layer. `maxRows` caps the printed
 * rows between 1 and 1,000.
 */
export type ExportFeatureList = {
  layerId: MapLayer.Id;
  columnIds: readonly QueryColumn.Id[];
  sort: ExportFeatureListSort | undefined;
  maxRows: number;
};
```

Add this field as the last member of `ExportLayout`:

```ts
  /**
   * A feature list printed after the map, or unset for none. Cleared when
   * its layer is removed from the map.
   */
  featureList: ExportFeatureList | undefined;
```

In `AvaMapConfig.ts`, extend the `ExportLayout.types.ts` type import:

```ts
import type {
  ExportFeatureList as ExportFeatureListType,
  ExportFeatureListSort as ExportFeatureListSortType,
  ExportHeaderLine as ExportHeaderLineType,
  ExportLayout as ExportLayoutType,
  ExportOrientation as ExportOrientationType,
  ExportPaper as ExportPaperType,
} from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";
```

and add to the end of the `AvaMapConfig` namespace:

```ts
  /** One layer's features, printed as a table after the map. */
  export type ExportFeatureList = ExportFeatureListType;
  /** The column and direction a printed feature list sorts by. */
  export type ExportFeatureListSort = ExportFeatureListSortType;
```

In `AvaMapConfig.types.ts`, change the version literal of `AvaMapConfigRead` from `7` to `8`.

- [ ] **Step 6: Create the version 8 schema**

Create `AvaMapConfigV8Schema.ts`. Version schemas are frozen snapshots, so the export layout fields are declared here rather than borrowed from version 5's private pieces:

```ts
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import { AvaMapConfigV7Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV7Schema.ts";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";

const ExportHeaderLineSchema = z.strictObject({
  isVisible: z.boolean(),
  text: z.string(),
});

/** A feature list printed after the map. `sort` unset is the default order. */
const ExportFeatureListSchema = z.strictObject({
  layerId: uuidType<"MapLayer">(),
  columnIds: z.array(uuidType<"QueryColumn">()).readonly(),
  sort: z
    .strictObject({
      columnId: uuidType<"QueryColumn">(),
      direction: z.enum(AvaMapConfigValues.exportFeatureListSortDirections),
    })
    .optional(),
  maxRows: z
    .number()
    .int()
    .min(1)
    .max(AvaMapConfigValues.exportFeatureListMaxRows),
});

/**
 * Fills in a missing `disclaimer` key with `undefined` before validation, so
 * an absent key and an explicit `undefined` parse identically, as version 5
 * does.
 */
function _fillMissingDisclaimer(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !("disclaimer" in value)) {
    return { ...value, disclaimer: undefined };
  }
  return value;
}

/** Version 8 page furniture: version 5's fields plus `featureList`. */
export const V8ExportLayoutSchema = z.preprocess(
  _fillMissingDisclaimer,
  z.strictObject({
    paper: z.enum(AvaMapConfigValues.exportPapers),
    orientation: z.enum(AvaMapConfigValues.exportOrientations),
    title: ExportHeaderLineSchema,
    subtitle: ExportHeaderLineSchema,
    northArrow: z.boolean(),
    scaleBar: z.boolean(),
    sourceLine: z.string(),
    disclaimer: z.union([z.string().min(1), z.undefined()]),
    featureList: ExportFeatureListSchema.optional(),
  }),
);

/** Version 8 persisted map configuration. */
export const AvaMapConfigV8Schema = AvaMapConfigV7Schema.extend({
  version: z.literal(8),
  exportLayout: V8ExportLayoutSchema,
}).strict();
```

- [ ] **Step 7: Default and compare the new field**

In `exportLayoutUpdaters.ts`, add `featureList: undefined,` as the last key of `DEFAULT_EXPORT_LAYOUT`. Add this helper below `_isSameHeaderLine`:

```ts
/** True when two feature lists, or two unset lists, are equal. */
function _isSameFeatureList(
  first: ExportLayout["featureList"],
  second: ExportLayout["featureList"],
): boolean {
  if (first === undefined || second === undefined) {
    return first === second;
  }
  return (
    first.layerId === second.layerId &&
    first.maxRows === second.maxRows &&
    first.sort?.columnId === second.sort?.columnId &&
    first.sort?.direction === second.sort?.direction &&
    first.columnIds.length === second.columnIds.length &&
    first.columnIds.every((columnId, index) => {
      return columnId === second.columnIds[index];
    })
  );
}
```

Change the exhaustiveness guard and its docstring to account for the new key:

```ts
/**
 * Compile-time exhaustiveness guard: fails `pnpm type-check` if `ExportLayout`
 * gains a field that neither `_SCALAR_KEYS`, `_isSameHeaderLine`'s two call
 * sites, nor `_isSameFeatureList` account for, so a forgotten field can never
 * silently make `_isSameLayout` treat a real edit as a no-op.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type test - this variable is intentionally not used
type _ExhaustiveExportLayoutKeys = Expect<
  IsEqual<keyof ExportLayout, _ScalarKey | "title" | "subtitle" | "featureList">
>;
```

and `_isSameLayout`:

```ts
/** True when two layouts are field-for-field equal. */
function _isSameLayout(first: ExportLayout, second: ExportLayout): boolean {
  return (
    _SCALAR_KEYS.every((key) => {
      return first[key] === second[key];
    }) &&
    _isSameHeaderLine(first.title, second.title) &&
    _isSameHeaderLine(first.subtitle, second.subtitle) &&
    _isSameFeatureList(first.featureList, second.featureList)
  );
}
```

- [ ] **Step 8: Migrate version 7 to version 8**

In `migrateAvaMapConfig.ts`:

1. Add imports:

```ts
import { AvaMapConfigV7Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV7Schema.ts";
import { AvaMapConfigV8Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV8Schema.ts";
```

(F3 already imports `AvaMapConfigV7Schema` here; keep one import) and `type ConfigV7 = z.infer<typeof AvaMapConfigV7Schema>;` beside the other `ConfigVn` aliases. F3 declares `ConfigV6` but not `ConfigV7`.

2. Below the type aliases, add the version 5 default. Version 5's strict schema rejects any unknown key, including one whose value is `undefined`, so the current default cannot be passed to it as is:

```ts
/**
 * Export furniture a version 4 map gains on its way to version 5: today's
 * default without `featureList`, a key version 5's strict schema rejects.
 */
const { featureList: _featureList, ...VERSION_5_EXPORT_LAYOUT } =
  DEFAULT_EXPORT_LAYOUT;
```

In `_migrateVersion4`, replace `exportLayout: DEFAULT_EXPORT_LAYOUT,` with `exportLayout: VERSION_5_EXPORT_LAYOUT,`.

3. In F3's `_migrateVersion6`, change `function _migrateVersion6(config: ConfigV6): AvaMapConfigRead {` to `function _migrateVersion6(config: ConfigV6): ConfigV7 {`, and delete its trailing `as AvaMapConfigRead` and the two-line `// The cast bridges ...` comment above it, the same way F3 made F1's `_migrateVersion5` return `ConfigV6`. Change its docstring to "Migrates a valid version 6 config into the version 7 representation."

4. Add below `_migrateVersion6`:

```ts
/** Migrates a valid version 7 config into the current persisted shape. */
function _migrateVersion7(config: ConfigV7): AvaMapConfigRead {
  return AvaMapConfigV8Schema.parse({
    ...config,
    version: 8,
    exportLayout: { ...config.exportLayout, featureList: undefined },
    // The cast bridges `PopupConfig.action`, a required `| undefined` field
    // on `MapLayer.T` that `PopupSchema` still infers as an optional key.
  }) as AvaMapConfigRead;
}
```

5. F3's exported object chains each version through the next (`fromV1` calls `migrateAvaMapConfig.fromV2(_migrateVersion1(config))`, and so on up to `fromV5` calling `fromV6`), so only its last entry changes. Replace `fromV6: _migrateVersion6,` and its docstring with:

```ts
  /** Migrates a valid version 6 config into the current representation. */
  fromV6: (config: ConfigV6): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV7(_migrateVersion6(config));
  },

  /** Migrates a valid version 7 config into the current representation. */
  fromV7: _migrateVersion7,
```

- [ ] **Step 9: Parse version 8 as current**

In `AvaMapConfigSchema.ts`:

1. Add `import { AvaMapConfigV8Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV8Schema.ts";` (F3 already imports `AvaMapConfigV7Schema` and adds the `version === 6` branch).
2. In `_parseAnyVersion`, add before the final `return _parseCurrentConfig(json);`:

```ts
  if (version === 7) {
    return migrateAvaMapConfig.fromV7(AvaMapConfigV7Schema.parse(json));
  }
```

3. Replace F3's `_parseCurrentConfig` (which parses with `AvaMapConfigV7Schema` and normalizes only `aoi` and `timeRange`) with:

```ts
function _parseCurrentConfig(json: unknown): AvaMapConfigRead {
  // The cast bridges `PopupConfig.action`, a required `| undefined` field on
  // `MapLayer.T` that `PopupSchema` still infers as an optional key.
  const parsed = AvaMapConfigV8Schema.parse(json) as AvaMapConfigRead;
  return {
    ...parsed,
    aoi: parsed.aoi,
    timeRange: parsed.timeRange,
    exportLayout: {
      ...parsed.exportLayout,
      featureList: parsed.exportLayout.featureList,
    },
  };
}
```

4. Point `schema:` and `toJson` at `AvaMapConfigV8Schema`.

In `AvaMapConfigModule.ts`, change `version: 7,` inside `makeEmpty` to `version: 8,`.

- [ ] **Step 10: Move "current version" assertions to 8**

```bash
git grep -n "toBe(7)\|version: 7" -- shared/models/AvaMap src/clients/maps src/views/GisApp
```

Change to `8` every hit that asserts the version a migration or `makeEmpty` produces (for example `expect(parsed.version).toBe(7)` in `v4SchemaSuites.ts`, `v5SchemaSuites.ts`, F1's `v6SchemaSuites.ts`, F3's `v7SchemaSuites.ts`, `AvaMapConfigSchema.test.ts`, and `AvaMapConfigModule.test.ts`, plus `version: 7` inside an expected migrated object), and rename any test title that says "version 7 maps" to "version 8 maps". Leave alone every `version: 7` that builds a version 7 input fixture, including `createEmptyVersion7Json`.

In `AvaMapConfigSchema.test.ts`, the test "rejects a config written by a future version" spreads a `version` one above the current one (F1 set it to 7; F3's plan does not name it). Set it to `version: 9`, whatever it reads now, since 8 is current.

- [ ] **Step 11: Run the tests to verify they pass**

Run: `pnpm vitest run shared/models/AvaMap src/clients/maps src/views/GisApp`
Expected: PASS.

Run: `pnpm tsc -b --force`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add shared/models/AvaMap src/clients/maps src/views/GisApp
git commit -m "feat(gis): persist an export feature list in map config version 8"
```

---

### Task 2: Cap the feature list at 1 to 1,000 whole rows

**Files:**
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters/exportLayoutUpdaters.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to the `describe("exportLayoutUpdaters")` block:

```ts
  it.each([
    { typedRows: 5000, storedRows: 1000 },
    { typedRows: 0, storedRows: 1 },
    { typedRows: 12.6, storedRows: 13 },
    { typedRows: Number.NaN, storedRows: 200 },
  ])(
    "stores a typed row cap of $typedRows as $storedRows",
    ({ typedRows, storedRows }) => {
      const config = AvaMapConfig.withExportLayout({
        config: AvaMapConfig.makeEmpty(),
        exportLayout: {
          ...AvaMapConfig.defaultExportLayout,
          featureList: {
            layerId: uuid<MapLayer.Id>(),
            columnIds: [],
            sort: undefined,
            maxRows: typedRows,
          },
        },
      });

      expect(config.exportLayout.featureList?.maxRows).toBe(storedRows);
    },
  );
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters`
Expected: FAIL with `expected 5000 to be 1000` (and the 0, 12.6, NaN cases).

- [ ] **Step 3: Normalize the cap**

In `exportLayoutUpdaters.ts`, add `import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";` and this helper below `_normalizeDisclaimer`:

```ts
/**
 * Keeps a feature list's row cap a whole number from 1 to 1,000, so a typed
 * value can never make the persisted config fail its schema. A value that is
 * not a number falls back to the default cap.
 */
function _normalizeFeatureList(
  featureList: ExportLayout["featureList"],
): ExportLayout["featureList"] {
  if (featureList === undefined) {
    return undefined;
  }
  const maxRows = Number.isFinite(featureList.maxRows)
    ? Math.min(
        AvaMapConfigValues.exportFeatureListMaxRows,
        Math.max(1, Math.round(featureList.maxRows)),
      )
    : AvaMapConfigValues.exportFeatureListDefaultMaxRows;
  return maxRows === featureList.maxRows
    ? featureList
    : { ...featureList, maxRows };
}
```

In `withExportLayout`, build the normalized layout with both fields and extend the docstring:

```ts
  /**
   * Replaces the map's export furniture.
   *
   * A blank disclaimer is normalized to unset, so the furniture strip and the
   * page fall back to the localized default instead of showing nothing. A
   * feature list's row cap is kept a whole number from 1 to 1,000.
   */
  withExportLayout: (
    options: Readonly<{
      config: AvaMapConfigRead;
      exportLayout: ExportLayout;
    }>,
  ): AvaMapConfigRead => {
    const { config, exportLayout } = options;
    const normalizedExportLayout: ExportLayout = {
      ...exportLayout,
      disclaimer: _normalizeDisclaimer(exportLayout.disclaimer),
      featureList: _normalizeFeatureList(exportLayout.featureList),
    };
    return _isSameLayout(config.exportLayout, normalizedExportLayout)
      ? config
      : { ...config, exportLayout: normalizedExportLayout };
  },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/exportLayoutUpdaters
git commit -m "feat(gis): cap an export feature list at 1,000 rows"
```

---

### Task 3: Clear the feature list when its layer is removed

**Files:**
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts:147-156`
- Modify: `src/views/GisApp/export/ExportSheet/updateExportLayout.ts:3-9`
- Modify: `src/views/GisApp/export/ExportSheet/ExportSheet.tsx:26-36`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`

`AvaMapConfig.withLayerRemoved` is the only layer deletion path (`src/views/GisApp/useGisAppLayerActions.tsx` calls it).

- [ ] **Step 1: Write the failing tests**

Add to `describe("layer operations")`:

```ts
  it("clears the export feature list when its layer is removed", () => {
    const listed = MapLayer.makeEmpty("Schools");
    const base = AvaMapConfig.makeEmpty();
    const config: AvaMapConfig.T = {
      ...base,
      layers: [listed],
      exportLayout: {
        ...base.exportLayout,
        featureList: {
          layerId: listed.id,
          columnIds: [],
          sort: undefined,
          maxRows: 200,
        },
      },
    };

    expect(
      AvaMapConfig.withLayerRemoved({ config, layerId: listed.id })
        .exportLayout.featureList,
    ).toBeUndefined();
  });

  it("keeps the export feature list when another layer is removed", () => {
    const listed = MapLayer.makeEmpty("Schools");
    const other = MapLayer.makeEmpty("Roads");
    const base = AvaMapConfig.makeEmpty();
    const featureList: AvaMapConfig.ExportFeatureList = {
      layerId: listed.id,
      columnIds: [],
      sort: undefined,
      maxRows: 200,
    };
    const config: AvaMapConfig.T = {
      ...base,
      layers: [listed, other],
      exportLayout: { ...base.exportLayout, featureList },
    };

    expect(
      AvaMapConfig.withLayerRemoved({ config, layerId: other.id }).exportLayout
        .featureList,
    ).toBe(featureList);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`
Expected: FAIL on "clears the export feature list when its layer is removed" (received an object, expected undefined).

- [ ] **Step 3: Clear the list on removal**

In `AvaMapConfigModule.ts`, add `import type { ExportLayout } from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";` and this helper above `AvaMapConfigModule`:

```ts
/** The export layout without its feature list when that list prints `layerId`. */
function _clearFeatureListOfLayer(
  options: Readonly<{ exportLayout: ExportLayout; layerId: MapLayer.Id }>,
): ExportLayout {
  const { exportLayout, layerId } = options;
  return exportLayout.featureList?.layerId === layerId
    ? { ...exportLayout, featureList: undefined }
    : exportLayout;
}
```

Replace F3's `withLayerRemoved` (F3 Task 5 made it clear `spatialFilter` on layers that pointed at the removed one) with this, which keeps F3's layer mapping and adds the `exportLayout` key:

```ts
  /**
   * Removes a layer by id. Layers it filtered lose that spatial filter, and
   * the export feature list goes when it printed that layer. Unknown ids
   * leave the config untouched.
   */
  withLayerRemoved: (
    options: Readonly<{ config: AvaMapConfigRead; layerId: MapLayer.Id }>,
  ): AvaMapConfigRead => {
    const { config, layerId } = options;
    const nextLayers = config.layers.filter(propNotEq("id", layerId));
    if (nextLayers.length === config.layers.length) {
      return config;
    }
    return {
      ...config,
      layers: nextLayers.map((layer) => {
        return layer.spatialFilter?.layerId === layerId
          ? { ...layer, spatialFilter: undefined }
          : layer;
      }),
      exportLayout: _clearFeatureListOfLayer({
        exportLayout: config.exportLayout,
        layerId,
      }),
    };
  },
```

- [ ] **Step 4: Name the second writer in the sheet's docstrings**

In `updateExportLayout.ts`, replace the docstring with:

```ts
/**
 * Applies one edit to the map's persisted export layout.
 *
 * Every export sheet control funnels through this single helper, which is
 * why `AvaMapConfig.withExportLayout` has exactly one call site outside
 * tests. The only other writer of `exportLayout` is
 * `AvaMapConfig.withLayerRemoved`, which clears a feature list whose layer
 * is gone.
 */
```

In `ExportSheet.tsx`, replace the second paragraph of the component docstring with:

```ts
 * This sheet is the sole editor of `exportLayout`: every field routes its
 * edit through `ExportSheetControls`, which calls
 * `AvaMapConfig.withExportLayout`. The one other writer is
 * `AvaMapConfig.withLayerRemoved`, which clears a feature list whose layer
 * is removed. Download is never gated by anything the sheet checks, because
 * Export snapshots whatever the screen already shows; a failed download
 * leaves the button enabled so the same click can retry.
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule src/views/GisApp/export/ExportSheet/updateExportLayout.ts src/views/GisApp/export/ExportSheet/ExportSheet.tsx
git commit -m "feat(gis): clear the export feature list when its layer is removed"
```

---

### Task 4: `getExportFeatureTableCopy`

**Files:**
- Create: `src/views/GisApp/export/getExportFeatureTableCopy/getExportFeatureTableCopy.ts`
- Test: `src/views/GisApp/export/getExportFeatureTableCopy/getExportFeatureTableCopy.test.ts`

The buffer's distance prints in the unit the author typed it in (`BufferOfLayerBinding.distanceUnit`, from F3), formatted the way F3's `formatFeatureListCell` formats a distance: `i18n.number` to two decimals plus the `BUFFER_DISTANCE_UNIT_LABELS` label.

- [ ] **Step 1: Write the failing test**

```ts
import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getExportFeatureTableCopy } from "@/views/GisApp/export/getExportFeatureTableCopy/getExportFeatureTableCopy";

/** Exposure sites, an 805 m buffer typed in `distanceUnit`, and schools in it. */
function _bufferedMap(
  distanceUnit: MapLayer.BufferDistanceUnit,
): { config: AvaMapConfig.T; schools: MapLayer.T } {
  const sites = MapLayer.makeEmpty("Exposure sites");
  const buffer: MapLayer.T = {
    ...MapLayer.createArea("Buffer of Exposure sites"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: sites.id,
      distanceMeters: 805,
      distanceUnit,
      labelColumn: undefined,
      dissolve: false,
    },
  };
  const schools: MapLayer.T = {
    ...MapLayer.makeEmpty("Schools"),
    spatialFilter: { layerId: buffer.id },
  };
  return {
    config: { ...AvaMapConfig.makeEmpty(), layers: [sites, buffer, schools] },
    schools,
  };
}

/** A map holding only an unfiltered "Schools" layer. */
function _unfilteredMap(): { config: AvaMapConfig.T; schools: MapLayer.T } {
  const schools = MapLayer.makeEmpty("Schools");
  return {
    config: { ...AvaMapConfig.makeEmpty(), layers: [schools] },
    schools,
  };
}

describe("getExportFeatureTableCopy", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  it("states the count and layer name when no buffer filters the layer", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 42,
      shownCount: 42,
      i18n,
    });

    expect(copy.summaryLine).toBe("42 Schools");
  });

  it("states the buffer distance and source when a buffer filters the layer", () => {
    const { config, schools } = _bufferedMap("mi");
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 42,
      shownCount: 42,
      i18n,
    });

    expect(copy.summaryLine).toBe("42 Schools within 0.5 mi of Exposure sites");
  });

  it("states the buffer distance in the unit it was typed in", () => {
    const { config, schools } = _bufferedMap("m");
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 3,
      shownCount: 3,
      i18n,
    });

    expect(copy.summaryLine).toBe("3 Schools within 805 m of Exposure sites");
  });

  it("adds a truncation note when the row cap cut the list", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 1500,
      shownCount: 200,
      i18n,
    });

    expect(copy.truncationNote).toBe(
      "Showing 200 of 1,500. Download the full list as CSV from the map.",
    );
  });

  it("adds no truncation note when every row is shown", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 12,
      shownCount: 12,
      i18n,
    });

    expect(copy.truncationNote).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/getExportFeatureTableCopy`
Expected: FAIL with "Failed to resolve import ... getExportFeatureTableCopy".

- [ ] **Step 3: Implement**

```ts
import { propEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { I18n } from "@lingui/core";

/** The buffer that filters a layer, and the name of the layer it buffers. */
type BufferFilter = {
  binding: MapLayer.BufferOfLayerBinding;
  sourceLayerName: string;
};

/** The buffer filtering `layer`, or undefined when no buffer filters it. */
function _getBufferFilter(
  options: Readonly<{ config: AvaMapConfig.T; layer: MapLayer.T }>,
): BufferFilter | undefined {
  const { config, layer } = options;
  const filterLayerId = layer.spatialFilter?.layerId;
  const binding =
    filterLayerId === undefined
      ? undefined
      : config.layers.find(propEq("id", filterLayerId))?.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    return undefined;
  }
  const sourceLayer = config.layers.find(propEq("id", binding.layerId));
  return sourceLayer === undefined
    ? undefined
    : { binding, sourceLayerName: sourceLayer.name };
}

/** A buffer's distance in the unit it was typed in, for example "0.5 mi". */
function _formatBufferDistance(
  options: Readonly<{ binding: MapLayer.BufferOfLayerBinding; i18n: I18n }>,
): string {
  const { binding, i18n } = options;
  const distance = i18n.number(
    MapLayer.getBufferDistanceFromMeters({
      distanceMeters: binding.distanceMeters,
      unit: binding.distanceUnit,
    }),
    { maximumFractionDigits: 2 },
  );
  const unit = i18n._(BUFFER_DISTANCE_UNIT_LABELS[binding.distanceUnit]);
  return i18n._(msg`${distance} ${unit}`);
}

/** "{count} {layer}" or "{count} {layer} within {distance} of {source}". */
function _getSummaryLine(
  options: Readonly<{
    countText: string;
    layerName: string;
    bufferFilter: BufferFilter | undefined;
    i18n: I18n;
  }>,
): string {
  const { countText, layerName, bufferFilter, i18n } = options;
  if (bufferFilter === undefined) {
    return i18n._(msg`${countText} ${layerName}`);
  }
  const distanceText = _formatBufferDistance({
    binding: bufferFilter.binding,
    i18n,
  });
  const sourceLayerName = bufferFilter.sourceLayerName;
  return i18n._(
    msg`${countText} ${layerName} within ${distanceText} of ${sourceLayerName}`,
  );
}

/**
 * The line printed above the PDF feature table, and the note printed under it
 * when the row cap cut the list. Both are localized here, with `msg`, because
 * this runs at download time outside any component.
 */
export function getExportFeatureTableCopy(
  options: Readonly<{
    config: AvaMapConfig.T;
    layer: MapLayer.T;
    totalCount: number;
    shownCount: number;
    i18n: I18n;
  }>,
): { summaryLine: string; truncationNote: string | undefined } {
  const { config, layer, totalCount, shownCount, i18n } = options;
  const countText = i18n.number(totalCount);
  const shownText = i18n.number(shownCount);
  return {
    summaryLine: _getSummaryLine({
      countText,
      layerName: layer.name,
      bufferFilter: _getBufferFilter({ config, layer }),
      i18n,
    }),
    truncationNote:
      shownCount < totalCount
        ? i18n._(
            msg`Showing ${shownText} of ${countText}. Download the full list as CSV from the map.`,
          )
        : undefined,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/getExportFeatureTableCopy`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export/getExportFeatureTableCopy
git commit -m "feat(gis): word the PDF feature list summary and truncation note"
```

---

### Task 5: `drawExportFeatureTable` (pure layout)

**Files:**
- Create: `src/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable.ts`
- Test: `src/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable.test.ts`

Like `drawExportLegend`, this computes positions and never touches jsPDF. The composer passes jsPDF's `splitTextToSize` in as `wrapText`; tests pass a deterministic stand-in. With the test wrapper, one character is one millimetre, every short cell takes one 4 mm line, and every row is 7 mm tall (4 mm line plus 1.5 mm padding above and below).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { drawExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
import type {
  ExportFeatureTable,
  ExportFeatureTablePage,
} from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";

/**
 * 200 mm wide, so each of two columns is 100 mm. 70 mm tall: the first page
 * spends 7 mm on the summary and 7 mm on the header, leaving room for exactly
 * 8 rows of 7 mm. Later pages spend only the header, leaving room for 9.
 */
const BLOCK = { x: 10, y: 20, width: 200, height: 70 };

/** One millimetre holds one character, so wrapping is predictable. */
function _wrapByCharacters(text: string, widthMm: number): string[] {
  const size = Math.max(1, Math.floor(widthMm));
  if (text.length === 0) {
    return [""];
  }
  return Array.from({ length: Math.ceil(text.length / size) }, (_, index) => {
    return text.slice(index * size, (index + 1) * size);
  });
}

/** A two-column table of `rowCount` schools. */
function _table(
  rowCount: number,
  overrides: Partial<ExportFeatureTable> = {},
): ExportFeatureTable {
  return {
    summaryLine: `${rowCount} Schools`,
    truncationNote: undefined,
    headerLabels: ["School", "Distance"],
    rows: Array.from({ length: rowCount }, (_, index) => {
      return [`School ${index}`, `${index} mi`];
    }),
    ...overrides,
  };
}

function _pages(table: ExportFeatureTable): ExportFeatureTablePage[] {
  return drawExportFeatureTable({
    block: BLOCK,
    table,
    wrapText: _wrapByCharacters,
  });
}

/** The first column's body text on one page, top to bottom. */
function _schoolNames(page: ExportFeatureTablePage): string[] {
  return page.texts
    .filter((text) => {
      return !text.isHeader && text.text.startsWith("School ");
    })
    .map((text) => {
      return text.text;
    });
}

/** The header labels on one page. */
function _headerLabels(page: ExportFeatureTablePage): string[] {
  return page.texts
    .filter((text) => {
      return text.isHeader;
    })
    .map((text) => {
      return text.text;
    });
}

describe("drawExportFeatureTable", () => {
  it("prints the summary and header on one page when there are no rows", () => {
    const pages = _pages(_table(0));

    expect(pages).toHaveLength(1);
    expect(pages[0]!.texts.map((text) => {
      return text.text;
    })).toEqual(["0 Schools", "School", "Distance"]);
  });

  it("prints a single row on the first page", () => {
    const pages = _pages(_table(1));

    expect(pages).toHaveLength(1);
    expect(_schoolNames(pages[0]!)).toEqual(["School 0"]);
  });

  it("keeps exactly one page of rows on one page", () => {
    expect(_pages(_table(8))).toHaveLength(1);
  });

  it("starts a second page with a repeated header when one more row arrives", () => {
    const pages = _pages(_table(9));

    expect(pages).toHaveLength(2);
    expect(_headerLabels(pages[1]!)).toEqual(["School", "Distance"]);
    expect(_schoolNames(pages[1]!)).toEqual(["School 8"]);
  });

  it("prints every row once, in order, across many pages", () => {
    const pages = _pages(_table(30));

    expect(pages).toHaveLength(4);
    expect(pages.flatMap(_schoolNames)).toEqual(
      Array.from({ length: 30 }, (_, index) => {
        return `School ${index}`;
      }),
    );
  });

  it("starts each later page's header at the top of the block", () => {
    const pages = _pages(_table(9));

    expect(pages[1]!.headerRuleYMm).toBe(BLOCK.y + 7);
    expect(pages[0]!.headerRuleYMm).toBe(BLOCK.y + 14);
  });

  it("prints the truncation note under the summary on the first page only", () => {
    const note = "Showing 30 of 90. Download the full list as CSV from the map.";
    const pages = _pages(_table(30, { truncationNote: note }));
    const firstPageTexts = pages[0]!.texts.map((text) => {
      return text.text;
    });

    expect(firstPageTexts.slice(0, 2)).toEqual(["30 Schools", note]);
    expect(
      pages.slice(1).some((page) => {
        return page.texts.some((text) => {
          return text.text === note;
        });
      }),
    ).toBe(false);
  });

  it("wraps a long cell onto lines below each other", () => {
    const longName = "x".repeat(150);
    const pages = _pages(_table(1, { rows: [[longName, "1 mi"]] }));
    const cellLines = pages[0]!.texts.filter((text) => {
      return !text.isHeader && text.text.startsWith("x");
    });

    expect(cellLines.map((line) => {
      return line.text.length;
    })).toEqual([97, 53]);
    expect(cellLines[1]!.yMm - cellLines[0]!.yMm).toBe(4);
  });

  it("cuts a cell at four lines and marks the cut", () => {
    const pages = _pages(_table(1, { rows: [["y".repeat(1000), "1 mi"]] }));
    const cellLines = pages[0]!.texts.filter((text) => {
      return !text.isHeader && text.text.startsWith("y");
    });

    expect(cellLines).toHaveLength(4);
    expect(cellLines[3]!.text.endsWith("...")).toBe(true);
  });

  it("prints characters the PDF font lacks as safe text", () => {
    const pages = _pages(
      _table(1, { headerLabels: ["≥ 95%", "Name"], rows: [["0.98", "東京"]] }),
    );
    const texts = pages[0]!.texts.map((text) => {
      return text.text;
    });

    expect(texts).toContain(">= 95%");
    expect(texts).toContain("??");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/composeExportPdf/drawExportFeatureTable`
Expected: FAIL with "Failed to resolve import ... drawExportFeatureTable".

- [ ] **Step 3: Implement**

```ts
import { isDefined } from "@avandar/utils";
import { toPdfSafeText } from "@/views/GisApp/export/toPdfSafeText/toPdfSafeText";

/** A millimetre rectangle on the printed page. */
type BlockMm = Readonly<{ x: number; y: number; width: number; height: number }>;

/** The feature list a PDF prints after the map, localized and formatted. */
export type ExportFeatureTable = {
  /** "{count} {layer}" or "{count} {layer} within {distance} of {source}". */
  summaryLine: string;
  /** Printed under the summary when the row cap cut the list. */
  truncationNote: string | undefined;
  headerLabels: readonly string[];
  /** One entry per row, one cell text per header label. */
  rows: ReadonlyArray<readonly string[]>;
};

/** One run of text at its page position. Header runs print bold. */
export type ExportFeatureTableText = {
  text: string;
  xMm: number;
  yMm: number;
  isHeader: boolean;
};

/** One table page: its text runs and the rule under its header row. */
export type ExportFeatureTablePage = {
  texts: ExportFeatureTableText[];
  headerRuleYMm: number;
};

/** Splits text into lines that fit `widthMm` at the current font size. */
export type ExportTextWrapper = (text: string, widthMm: number) => string[];

/** Height of one printed text line, in millimetres. */
const LINE_HEIGHT_MM = 4;

/** Space above and below a row's text, and either side of a cell's text. */
const CELL_PADDING_MM = 1.5;

/** Space between the summary lines and the header row. */
const INTRO_GAP_MM = 3;

/** Lines one cell may take before it is cut, so a row always fits a page. */
const MAX_LINES_PER_CELL = 4;

/** Where a line's baseline sits within its line height. */
const BASELINE_RATIO = 0.75;

/** Tolerance for floating point sums of row heights. */
const FIT_TOLERANCE_MM = 1e-6;

/** One row's wrapped cells and the height its tallest cell needs. */
type WrappedRow = { cellLines: string[][]; heightMm: number };

/** Wraps one cell, cutting it at `MAX_LINES_PER_CELL` with a trailing "...". */
function _wrapCell(
  options: Readonly<{ text: string; widthMm: number; wrapText: ExportTextWrapper }>,
): string[] {
  const { text, widthMm, wrapText } = options;
  const lines = wrapText(toPdfSafeText(text), widthMm);
  if (lines.length === 0) {
    return [""];
  }
  if (lines.length <= MAX_LINES_PER_CELL) {
    return lines;
  }
  const keptLines = lines.slice(0, MAX_LINES_PER_CELL);
  return [...keptLines.slice(0, -1), `${keptLines.at(-1) ?? ""}...`];
}

/** Wraps every cell of a row to its column's text width. */
function _wrapRow(
  options: Readonly<{
    cells: readonly string[];
    columnWidthMm: number;
    wrapText: ExportTextWrapper;
  }>,
): WrappedRow {
  const { cells, columnWidthMm, wrapText } = options;
  const cellLines = cells.map((text) => {
    return _wrapCell({
      text,
      widthMm: columnWidthMm - 2 * CELL_PADDING_MM,
      wrapText,
    });
  });
  const lineCount = Math.max(
    1,
    ...cellLines.map((lines) => {
      return lines.length;
    }),
  );
  return {
    cellLines,
    heightMm: lineCount * LINE_HEIGHT_MM + 2 * CELL_PADDING_MM,
  };
}

/** Positions every line of a row whose top edge is `topMm`. */
function _placeRow(
  options: Readonly<{
    row: WrappedRow;
    topMm: number;
    leftMm: number;
    columnWidthMm: number;
    isHeader: boolean;
  }>,
): ExportFeatureTableText[] {
  const { row, topMm, leftMm, columnWidthMm, isHeader } = options;
  return row.cellLines.flatMap((lines, columnIndex) => {
    return lines.map((text, lineIndex) => {
      return {
        text,
        xMm: leftMm + columnIndex * columnWidthMm + CELL_PADDING_MM,
        yMm:
          topMm + CELL_PADDING_MM + LINE_HEIGHT_MM * (lineIndex + BASELINE_RATIO),
        isHeader,
      };
    });
  });
}

/** The summary and truncation note at the block's top, and their height. */
function _placeIntro(
  options: Readonly<{
    table: ExportFeatureTable;
    block: BlockMm;
    wrapText: ExportTextWrapper;
  }>,
): { texts: ExportFeatureTableText[]; heightMm: number } {
  const { table, block, wrapText } = options;
  const lines = [table.summaryLine, table.truncationNote]
    .filter(isDefined)
    .flatMap((line) => {
      return wrapText(toPdfSafeText(line), block.width);
    });
  return {
    texts: lines.map((text, index) => {
      return {
        text,
        xMm: block.x,
        yMm: block.y + LINE_HEIGHT_MM * (index + BASELINE_RATIO),
        isHeader: false,
      };
    }),
    heightMm: lines.length * LINE_HEIGHT_MM + INTRO_GAP_MM,
  };
}

/**
 * Splits rows into pages: the first page has `firstPageSpaceMm` below its
 * header, later pages `laterPageSpaceMm`. A page always takes at least one
 * row, so a row taller than the space still prints rather than looping.
 */
function _groupRowsIntoPages(
  options: Readonly<{
    rows: readonly WrappedRow[];
    firstPageSpaceMm: number;
    laterPageSpaceMm: number;
  }>,
): WrappedRow[][] {
  const { rows, firstPageSpaceMm, laterPageSpaceMm } = options;
  return rows.reduce<{ pages: WrappedRow[][]; usedMm: number }>(
    (state, row) => {
      const currentPage = state.pages.at(-1) ?? [];
      const spaceMm =
        state.pages.length === 1 ? firstPageSpaceMm : laterPageSpaceMm;
      const isFitting =
        currentPage.length === 0 ||
        state.usedMm + row.heightMm <= spaceMm + FIT_TOLERANCE_MM;
      return isFitting
        ? {
            pages: [...state.pages.slice(0, -1), [...currentPage, row]],
            usedMm: state.usedMm + row.heightMm,
          }
        : { pages: [...state.pages, [row]], usedMm: row.heightMm };
    },
    { pages: [[]], usedMm: 0 },
  ).pages;
}

/** Positions one page's intro, header row, and body rows. */
function _placePage(
  options: Readonly<{
    rows: readonly WrappedRow[];
    header: WrappedRow;
    topMm: number;
    leftMm: number;
    columnWidthMm: number;
    introTexts: readonly ExportFeatureTableText[];
  }>,
): ExportFeatureTablePage {
  const { rows, header, topMm, leftMm, columnWidthMm, introTexts } = options;
  const headerRuleYMm = topMm + header.heightMm;
  const body = rows.reduce<{ texts: ExportFeatureTableText[]; rowTopMm: number }>(
    (state, row) => {
      return {
        texts: [
          ...state.texts,
          ..._placeRow({ row, topMm: state.rowTopMm, leftMm, columnWidthMm, isHeader: false }),
        ],
        rowTopMm: state.rowTopMm + row.heightMm,
      };
    },
    { texts: [], rowTopMm: headerRuleYMm },
  );
  return {
    texts: [
      ...introTexts,
      ..._placeRow({ row: header, topMm, leftMm, columnWidthMm, isHeader: true }),
      ...body.texts,
    ],
    headerRuleYMm,
  };
}

/**
 * Lays the feature list out across as many pages as it needs, each the
 * size of `block`.
 *
 * The first page opens with the summary line and, when the row cap cut the
 * list, the truncation note. Every page repeats the header row. Columns share
 * the block's width equally, long cells wrap (at most four lines, the last
 * ending in "..."), and every string goes through `toPdfSafeText` before it
 * is measured, so what is measured is what prints. With no rows the result is
 * still one page, so the summary can say "0".
 */
export function drawExportFeatureTable(
  options: Readonly<{
    block: BlockMm;
    table: ExportFeatureTable;
    wrapText: ExportTextWrapper;
  }>,
): ExportFeatureTablePage[] {
  const { block, table, wrapText } = options;
  const columnWidthMm = block.width / Math.max(1, table.headerLabels.length);
  const header = _wrapRow({ cells: table.headerLabels, columnWidthMm, wrapText });
  const intro = _placeIntro({ table, block, wrapText });
  const rows = table.rows.map((cells) => {
    return _wrapRow({ cells, columnWidthMm, wrapText });
  });
  const pageGroups = _groupRowsIntoPages({
    rows,
    firstPageSpaceMm: block.height - intro.heightMm - header.heightMm,
    laterPageSpaceMm: block.height - header.heightMm,
  });
  return pageGroups.map((pageRows, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    return _placePage({
      rows: pageRows,
      header,
      topMm: isFirstPage ? block.y + intro.heightMm : block.y,
      leftMm: block.x,
      columnWidthMm,
      introTexts: isFirstPage ? intro.texts : [],
    });
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/composeExportPdf/drawExportFeatureTable`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export/composeExportPdf/drawExportFeatureTable
git commit -m "feat(gis): lay out the PDF feature table across pages"
```

---

### Task 6: Print the table pages in `composeExportPdf`

**Files:**
- Modify: `src/views/GisApp/export/composeExportPdf/composeExportPdf.ts:1-41,247-256,321-378`
- Test: `src/views/GisApp/export/composeExportPdf/composeExportPdf.test.ts`
- Create (generated): `src/views/GisApp/export/composeExportPdf/__snapshots__/composeExportPdf.test.ts.snap`

- [ ] **Step 1: Teach the fake document the new calls and the input the new field**

In `composeExportPdf.test.ts`:

1. Add to the hoisted fake `document` object:

```ts
    setFont: vi.fn(),
    splitTextToSize: vi.fn((text: string) => {
      return [text];
    }),
```

2. Add the type import `import type { ExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";`.

3. Add above `_options`:

```ts
/** A two-column feature table of `rowCount` schools. */
function _makeFeatureTable(rowCount: number): ExportFeatureTable {
  return {
    summaryLine: `${rowCount} Schools`,
    truncationNote: undefined,
    headerLabels: ["School", "Distance"],
    rows: Array.from({ length: rowCount }, (_, index) => {
      return [`School ${index}`, `${index} mi`];
    }),
  };
}
```

4. Add `featureRowCount?: number;` to `_options`'s overrides type, and this key to the returned object (after `pageNumberLabel`):

```ts
    featureTable:
      overrides.featureRowCount === undefined
        ? undefined
        : _makeFeatureTable(overrides.featureRowCount),
```

- [ ] **Step 2: Write the failing tests**

Insert directly after the `it("uses light surfaces regardless of the app theme", ...)` test, before the two tests that make `addImage` and `text` throw (`vi.clearAllMocks` keeps those throwing implementations for every later test):

```ts
  it("prints the feature list on a page after the map", async () => {
    await composeExportPdf(_options({ featureRowCount: 3 }));

    expect(fakeDocument.addPage).toHaveBeenCalledTimes(1);
    expect(_writtenText()).toEqual(
      expect.arrayContaining(["3 Schools", "School", "Distance", "School 2"]),
    );
  });

  it("prints no table page when the layout has no feature list", async () => {
    await composeExportPdf(_options({}));

    expect(_writtenText()).not.toContain("School");
  });

  it("numbers the map, legend overflow, and table pages as one sequence", async () => {
    await composeExportPdf(
      _options({ legendEntryCount: 60, featureRowCount: 3 }),
    );

    expect(_writtenText()).toEqual(
      expect.arrayContaining(["Page 1 of 3", "Page 2 of 3", "Page 3 of 3"]),
    );
  });

  it("prints the disclaimer on every page", async () => {
    await composeExportPdf(
      _options({ legendEntryCount: 60, featureRowCount: 100 }),
    );
    const pageCount = fakeDocument.addPage.mock.calls.length + 1;
    const disclaimerCount = _writtenText().filter((line) => {
      return line === "Boundaries are not authoritative.";
    }).length;

    expect(pageCount).toBeGreaterThan(3);
    expect(disclaimerCount).toBe(pageCount);
    expect(_writtenText()).toContain(`Page ${pageCount} of ${pageCount}`);
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run src/views/GisApp/export/composeExportPdf/composeExportPdf.test.ts`
Expected: FAIL. "prints the feature list on a page after the map" sees no `addPage` call; "prints the disclaimer on every page" counts 1 disclaimer against 2 pages, because the legend overflow page has no footer today.

- [ ] **Step 4: Implement**

In `composeExportPdf.ts`:

1. Imports:

```ts
import { drawExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
import type {
  ExportFeatureTable,
  ExportFeatureTablePage,
  ExportFeatureTableText,
} from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
```

2. Add as the last member of `ExportPdfInput`:

```ts
  /** The feature list printed after the map, or unset for none. */
  featureTable: ExportFeatureTable | undefined;
```

3. Rename `_getFullPageLegendBlock` to `_getFullPageBlock` and change its docstring to `/** The header-to-footer rectangle every page after the map page prints in. */`. Update its one call in `_composeOverflowPage`.

4. In `_composeOverflowPage`, draw the footer before the page number:

```ts
  _drawFooter(document, { block: input.page.footerMm, input });
  _drawPageNumber(document, {
    block: input.page.footerMm,
    input,
    page: 2,
    total: totalPages,
  });
```

5. Add these helpers above `composeExportPdf`:

```ts
/** Lays the feature list out at the body font size, or no pages when unset. */
function _layoutFeatureTable(
  document: jsPDF,
  input: Readonly<ExportPdfInput>,
): ExportFeatureTablePage[] {
  if (input.featureTable === undefined) {
    return [];
  }
  document.setFontSize(BODY_FONT_SIZE_PT);
  return drawExportFeatureTable({
    block: _getFullPageBlock(input.page),
    table: input.featureTable,
    wrapText: (text, widthMm) => {
      const lines: unknown = document.splitTextToSize(text, widthMm);
      return Array.isArray(lines) ? lines.map(String) : [String(lines)];
    },
  });
}

/** Prints laid-out table text, bold for the header row. */
function _drawFeatureTableTexts(
  document: jsPDF,
  texts: readonly ExportFeatureTableText[],
): void {
  document.setTextColor(INK_COLOR);
  document.setFontSize(BODY_FONT_SIZE_PT);
  texts.forEach((text) => {
    document.setFont("helvetica", text.isHeader ? "bold" : "normal");
    document.text(text.text, text.xMm, text.yMm);
  });
  document.setFont("helvetica", "normal");
}

/** Adds one feature table page with its header rule, footer, and number. */
function _composeFeatureTablePage(
  document: jsPDF,
  options: Readonly<{
    input: ExportPdfInput;
    tablePage: ExportFeatureTablePage;
    pageNumber: number;
    totalPages: number;
  }>,
): void {
  const { input, tablePage, pageNumber, totalPages } = options;
  const block = _getFullPageBlock(input.page);
  document.addPage();
  _paintPageBackground(document, input.page.pageMm);
  _drawFeatureTableTexts(document, tablePage.texts);
  document.setDrawColor(INK_COLOR);
  document.setLineDashPattern([], 0);
  document.line(
    block.x,
    tablePage.headerRuleYMm,
    block.x + block.width,
    tablePage.headerRuleYMm,
  );
  _drawFooter(document, { block: input.page.footerMm, input });
  _drawPageNumber(document, {
    block: input.page.footerMm,
    input,
    page: pageNumber,
    total: totalPages,
  });
}
```

6. Replace `composeExportPdf` and its docstring:

```ts
/**
 * Composes the map snapshot and furniture into a PDF and saves it.
 *
 * Every displayable string arrives already localized: this module runs
 * outside React and must not reach for a Lingui hook. The page is always
 * painted with hardcoded light surfaces, regardless of the app's theme.
 *
 * The map frame is drawn at `input.page.mapFrameMm` no matter how the legend
 * fits, so it is never shrunk. When the legend's entries do not fit
 * `input.page.legendMm`, the whole legend (never a truncated slice of it)
 * moves to a second page sized to the full header-to-footer span. A feature
 * list, when set, follows on as many pages as it needs. Every page carries
 * the footer, since a field team may print only the list, and every page is
 * numbered "Page n of N" once there is more than one. `document.save()` is
 * the last call in the happy path, so a throw anywhere above it leaves no
 * file written.
 */
export async function composeExportPdf(
  input: Readonly<ExportPdfInput>,
): Promise<void> {
  const entries = _getLegendEntries(input);
  const fit = drawExportLegend({ block: input.page.legendMm, entries });
  const document = new jsPDF({
    unit: "mm",
    format: input.layout.paper,
    orientation: input.layout.orientation,
  });
  document.setProperties({ title: input.text.title ?? "" });
  const tablePages = _layoutFeatureTable(document, input);
  const overflowPageCount = fit.fitsOnPage ? 0 : 1;
  const totalPages = 1 + overflowPageCount + tablePages.length;

  _composePrimaryPage(document, { input, fit, totalPages });
  if (!fit.fitsOnPage) {
    _composeOverflowPage(document, { input, entries, totalPages });
  }
  tablePages.forEach((tablePage, tablePageIndex) => {
    _composeFeatureTablePage(document, {
      input,
      tablePage,
      pageNumber: 2 + overflowPageCount + tablePageIndex,
      totalPages,
    });
  });

  document.save(input.filename);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/views/GisApp/export/composeExportPdf`
Expected: PASS, including every pre-existing test.

- [ ] **Step 6: Add the draw-call snapshot**

Add after the four new tests (still before the throwing tests):

```ts
  it("draws a small table's text, fonts, and header rule", async () => {
    await composeExportPdf(_options({ featureRowCount: 2 }));

    expect({
      text: fakeDocument.text.mock.calls,
      setFont: fakeDocument.setFont.mock.calls,
      line: fakeDocument.line.mock.calls,
    }).toMatchSnapshot();
  });
```

Run: `pnpm vitest run src/views/GisApp/export/composeExportPdf/composeExportPdf.test.ts`
Expected: PASS with "1 snapshot written". Open `__snapshots__/composeExportPdf.test.ts.snap` and check by eye: the `text` calls end with `"2 Schools"`, `"School"`, `"Distance"`, `"School 0"`, `"0 mi"`, `"School 1"`, `"1 mi"`, then the footer lines and `"Page 2 of 2"`; `setFont` alternates `"bold"` for the two header runs and `"normal"` for the rest; `line` holds the header rule from x 12 to x 285.

- [ ] **Step 7: Commit**

```bash
git add src/views/GisApp/export/composeExportPdf
git commit -m "feat(gis): print the feature list pages in the export PDF"
```

---

### Task 7: `loadExportFeatureTable`

**Files:**
- Create: `src/views/GisApp/export/loadExportFeatureTable/loadExportFeatureTable.ts`
- Test: `src/views/GisApp/export/loadExportFeatureTable/loadExportFeatureTable.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { i18n } from "@lingui/core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createDatasetQueryColumn } from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { MAP_LAYER_FEATURE_LIST_ROW_KEYS } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.constants";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const { fetchMapLayerFeatureListMock } = vi.hoisted(() => {
  return { fetchMapLayerFeatureListMock: vi.fn() };
});

vi.mock("@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList", () => {
  return { fetchMapLayerFeatureList: fetchMapLayerFeatureListMock };
});

const { loadExportFeatureTable } =
  await import("@/views/GisApp/export/loadExportFeatureTable/loadExportFeatureTable");

const SITE_ID = createDatasetQueryColumn({ name: "site_id", dataType: "varchar" });
const CASES = createDatasetQueryColumn({ name: "cases", dataType: "bigint" });
const LATITUDE = createDatasetQueryColumn({ name: "latitude", dataType: "double" });
const LONGITUDE = createDatasetQueryColumn({ name: "longitude", dataType: "double" });
const WORKSPACE_ID = uuid<Workspace.Id>();

const LIST: MapLayerFeatureList = {
  columns: [
    { key: "site_id", label: "site_id", kind: "source" },
    { key: "cases", label: "cases", kind: "source" },
  ],
  rows: [
    { site_id: "S1", cases: 10 },
    { site_id: "S2", cases: 20 },
  ],
  totalCount: 2,
  distanceUnit: undefined,
};

/** An exact "Sites" point layer whose query returns four columns. */
function _sitesLayer(): MapLayer.T {
  const layer = MapLayer.makeEmpty("Sites");
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [SITE_ID, CASES, LATITUDE, LONGITUDE],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: LATITUDE.id,
      longitude: LONGITUDE.id,
    },
  };
}

/** A map holding `layer` whose export lists `layerId` (default: `layer`). */
function _config(
  options: Readonly<{
    layer: MapLayer.T;
    layerId?: MapLayer.Id;
    featureList?: Partial<AvaMapConfig.ExportFeatureList>;
  }>,
): AvaMapConfig.T {
  const base = AvaMapConfig.makeEmpty();
  return {
    ...base,
    layers: [options.layer],
    exportLayout: {
      ...base.exportLayout,
      featureList: {
        layerId: options.layerId ?? options.layer.id,
        columnIds: [SITE_ID.id, CASES.id],
        sort: undefined,
        maxRows: 200,
        ...options.featureList,
      },
    },
  };
}

/** Loads with loaded (empty) workspace metadata. */
async function _load(
  config: AvaMapConfig.T,
): ReturnType<typeof loadExportFeatureTable> {
  return await loadExportFeatureTable({
    config,
    workspaceId: WORKSPACE_ID,
    datasets: [],
    datasetColumns: [],
    i18n,
  });
}

describe("loadExportFeatureTable", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  beforeEach(() => {
    fetchMapLayerFeatureListMock.mockReset();
    fetchMapLayerFeatureListMock.mockResolvedValue(LIST);
  });

  it("returns no table and fetches nothing when the layout has no feature list", async () => {
    expect(await _load(AvaMapConfig.makeEmpty())).toBeUndefined();
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
  });

  it("returns no table when the listed layer is no longer exact", async () => {
    const jittered = MapLayer.withSensitivity(_sitesLayer(), {
      mode: "jitter",
      radiusMeters: 500,
    });

    expect(await _load(_config({ layer: jittered }))).toBeUndefined();
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
  });

  it("returns no table when the listed layer is not on the map", async () => {
    const config = _config({
      layer: _sitesLayer(),
      layerId: uuid<MapLayer.Id>(),
    });

    expect(await _load(config)).toBeUndefined();
  });

  it("asks for the saved columns, the sort column's row key, and the row cap", async () => {
    const layer = _sitesLayer();
    const config = _config({
      layer,
      featureList: {
        sort: { columnId: CASES.id, direction: "desc" },
        maxRows: 50,
      },
    });

    await _load(config);

    expect(fetchMapLayerFeatureListMock).toHaveBeenCalledWith({
      config,
      layerId: layer.id,
      columnIds: [SITE_ID.id, CASES.id],
      sort: { key: "cases", direction: "desc" },
      limit: 50,
      workspaceId: WORKSPACE_ID,
      datasets: [],
      datasetColumns: [],
      i18n,
    });
  });

  it("falls back to the popup columns and default order when the saved columns are gone", async () => {
    const goneColumnId = uuid<QueryColumn.Id>();
    const config = _config({
      layer: _sitesLayer(),
      featureList: {
        columnIds: [goneColumnId],
        sort: { columnId: goneColumnId, direction: "asc" },
      },
    });

    await _load(config);

    expect(fetchMapLayerFeatureListMock).toHaveBeenCalledWith(
      expect.objectContaining({ columnIds: "popup", sort: undefined }),
    );
  });

  it("refuses to print while the workspace's datasets are still loading", async () => {
    await expect(
      loadExportFeatureTable({
        config: _config({ layer: _sitesLayer() }),
        workspaceId: WORKSPACE_ID,
        datasets: undefined,
        datasetColumns: [],
        i18n,
      }),
    ).rejects.toThrow("still loading");
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
  });

  it("returns the list's labels and each row's printed cells", async () => {
    expect(await _load(_config({ layer: _sitesLayer() }))).toEqual({
      summaryLine: "2 Sites",
      truncationNote: undefined,
      headerLabels: ["site_id", "cases"],
      rows: [
        ["S1", "10"],
        ["S2", "20"],
      ],
    });
  });

  it("prints distances as the drawer shows them and never the row's coordinates", async () => {
    const keys = MAP_LAYER_FEATURE_LIST_ROW_KEYS;
    fetchMapLayerFeatureListMock.mockResolvedValue({
      columns: [
        { key: "site_id", label: "site_id", kind: "source" },
        { key: keys.distance, label: "Distance to nearest Sites", kind: "distance" },
      ],
      rows: [
        {
          site_id: "S1",
          [keys.distance]: 0.0935,
          [keys.longitude]: -73.99,
          [keys.latitude]: 40.73,
        },
      ],
      totalCount: 1,
      distanceUnit: "mi",
    } satisfies MapLayerFeatureList);

    const table = await _load(_config({ layer: _sitesLayer() }));

    expect(table?.headerLabels).toEqual(["site_id", "Distance to nearest Sites"]);
    expect(table?.rows).toEqual([["S1", "0.09 mi"]]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/loadExportFeatureTable`
Expected: FAIL with "Failed to resolve import ... loadExportFeatureTable".

- [ ] **Step 3: Implement**

```ts
import { prop, propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fetchMapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList";
import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import { getExportFeatureTableCopy } from "@/views/GisApp/export/getExportFeatureTableCopy/getExportFeatureTableCopy";
import { formatFeatureListCell } from "@/views/GisApp/panels/FeatureListDrawer/formatFeatureListCell/formatFeatureListCell";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListSort,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
import type { I18n } from "@lingui/core";

type ListOptions = Readonly<{
  layer: MapLayer.T;
  featureList: AvaMapConfig.ExportFeatureList;
}>;

/** The listed layer, or undefined when it is gone or can no longer list rows. */
function _getListedLayer(config: AvaMapConfig.T): MapLayer.T | undefined {
  const { featureList } = config.exportLayout;
  const layer =
    featureList === undefined
      ? undefined
      : config.layers.find(propEq("id", featureList.layerId));
  return layer !== undefined && getFeatureListAccessFromMapLayer(layer) === "rows"
    ? layer
    : undefined;
}

/** Saved columns still in the layer's query, or the popup's when none are. */
function _getColumnIds(
  options: ListOptions,
): readonly QueryColumn.Id[] | "popup" {
  const { layer, featureList } = options;
  const columnIds = featureList.columnIds.filter((columnId) => {
    return layer.source.queryColumns.some(propEq("id", columnId));
  });
  return columnIds.length > 0 ? columnIds : "popup";
}

/** The saved sort as a row key, or the default order when its column is gone. */
function _getSort(options: ListOptions): MapLayerFeatureListSort | undefined {
  const { sort } = options.featureList;
  const sortColumn =
    sort === undefined
      ? undefined
      : options.layer.source.queryColumns.find(propEq("id", sort.columnId));
  return sort === undefined || sortColumn === undefined
    ? undefined
    : {
        key: QueryColumn.getDerivedColumnName(sortColumn),
        direction: sort.direction,
      };
}

/** Each row's printed cells, one per list column, formatted as the drawer does. */
function _getPrintedRows(
  options: Readonly<{ list: MapLayerFeatureList; i18n: I18n }>,
): string[][] {
  const { list, i18n } = options;
  return list.rows.map((row) => {
    return list.columns.map((column) => {
      return formatFeatureListCell({
        value: row[column.key],
        column,
        distanceUnit: list.distanceUnit,
        i18n,
      });
    });
  });
}

/**
 * Fetches the export's feature list at download time and turns it into the
 * strings the PDF prints.
 *
 * The rows come from F3's `fetchMapLayerFeatureList`, the query the feature
 * list drawer runs, with the map's AOI, time, and spatial filters as they
 * are on screen, so the list and the map cannot disagree. Only `list.columns`
 * print, so a row's hidden coordinates never reach the page. Returns
 * undefined when the layout has no feature list, or when its layer was
 * removed or can no longer list rows (not exact, or not drawn from rows).
 * @throws When the workspace's datasets or columns have not loaded yet.
 */
export async function loadExportFeatureTable(
  options: Readonly<{
    config: AvaMapConfig.T;
    workspaceId: Workspace.Id;
    datasets: readonly Dataset.T[] | undefined;
    datasetColumns: readonly DatasetColumn.T[] | undefined;
    i18n: I18n;
  }>,
): Promise<ExportFeatureTable | undefined> {
  const { config, workspaceId, datasets, datasetColumns, i18n } = options;
  const { featureList } = config.exportLayout;
  const layer = _getListedLayer(config);
  if (featureList === undefined || layer === undefined) {
    return undefined;
  }
  if (datasets === undefined || datasetColumns === undefined) {
    throw new Error("The workspace's datasets are still loading");
  }
  const list = await fetchMapLayerFeatureList({
    config,
    layerId: layer.id,
    columnIds: _getColumnIds({ layer, featureList }),
    sort: _getSort({ layer, featureList }),
    limit: featureList.maxRows,
    workspaceId,
    datasets,
    datasetColumns,
    i18n,
  });
  return {
    ...getExportFeatureTableCopy({
      config,
      layer,
      totalCount: list.totalCount,
      shownCount: list.rows.length,
      i18n,
    }),
    headerLabels: list.columns.map(prop("label")),
    rows: _getPrintedRows({ list, i18n }),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/loadExportFeatureTable`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export/loadExportFeatureTable
git commit -m "feat(gis): fetch the export feature list at download time"
```

---

### Task 8: Load the table when downloading

**Files:**
- Modify: `src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.ts:1-22,33-43,176-268`
- Modify: `src/views/GisApp/export/ExportSheet/ExportSheet.tsx:13-25,38-60`
- Modify: `src/views/GisApp/GisAppMapShell.tsx:156-172`
- Test: `src/views/GisApp/export/useExportPdfDownload/useExportPdfDownload.test.tsx`
- Test: `src/views/GisApp/export/ExportSheet/ExportSheet.test.tsx:74-90`

`fetchMapLayerFeatureList` needs the workspace id and the workspace's datasets and dataset columns. The GIS app already holds the id as `app.avaMap.workspaceId` and loads both lists in `useGisAppRendering` with `DatasetClient.useGetAll` and `DatasetColumnClient.useGetAll` filtered by `workspace_id`. The hook makes the same two calls, so it reads React Query's cached results rather than a second fetch, and `ExportSheet` passes the id down.

- [ ] **Step 1: Write the failing tests**

In `useExportPdfDownload.test.tsx`:

1. Add `fetchMapLayerFeatureListMock: vi.fn(),` to the hoisted object and destructure it, then add beside the other mocks:

```ts
vi.mock("@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList", () => {
  return { fetchMapLayerFeatureList: fetchMapLayerFeatureListMock };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});
```

2. Add the imports `import { uuid } from "$/lib/uuid";`, `import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";`, `import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";`, and `import type { Workspace } from "$/models/Workspace/Workspace";`. In `_input`, add `workspaceId: uuid<Workspace.Id>(),` after `workspaceName`. Add this helper below `_input`:

```ts
/** A hook input whose export lists an exact "Sites" point layer. */
function _inputWithFeatureList(): UseExportPdfDownloadInput {
  const base = _input();
  const layer: MapLayer.T = {
    ...MapLayer.makeEmpty("Sites"),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
  return {
    ...base,
    config: {
      ...base.config,
      layers: [layer],
      exportLayout: {
        ...base.config.exportLayout,
        featureList: {
          layerId: layer.id,
          columnIds: [],
          sort: undefined,
          maxRows: 200,
        },
      },
    },
  };
}
```

3. Add these tests at the end of the `describe` block:

```ts
  it("hands the composer the feature list fetched at download", async () => {
    fetchMapLayerFeatureListMock.mockResolvedValue({
      columns: [{ key: "site_id", label: "site_id", kind: "source" }],
      rows: [{ site_id: "S1" }, { site_id: "S2" }],
      totalCount: 2,
      distanceUnit: undefined,
    });
    const input = _inputWithFeatureList();
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(input);
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(fetchMapLayerFeatureListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: input.workspaceId,
        datasets: [],
        datasetColumns: [],
      }),
    );
    expect(composeExportPdfMock.mock.calls[0]![0].featureTable).toEqual({
      summaryLine: "2 Sites",
      truncationNote: undefined,
      headerLabels: ["site_id"],
      rows: [["S1"], ["S2"]],
    });
  });

  it("passes no table and fetches nothing when the layout has no list", async () => {
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
    expect(composeExportPdfMock.mock.calls[0]![0].featureTable).toBeUndefined();
  });

  it("writes no file when the feature list cannot be fetched", async () => {
    fetchMapLayerFeatureListMock.mockRejectedValue(new Error("query failed"));
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_inputWithFeatureList());
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("error");
    expect(composeExportPdfMock).not.toHaveBeenCalled();
  });
```

In `ExportSheet.test.tsx`, add `import { uuid } from "$/lib/uuid";` and `import type { Workspace } from "$/models/Workspace/Workspace";`, and add `workspaceId: uuid<Workspace.Id>(),` to the object `_props` returns, after `workspaceName`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/views/GisApp/export/useExportPdfDownload`
Expected: FAIL. The first test sees no `fetchMapLayerFeatureList` call and `featureTable` undefined; the third sees status `success`.

- [ ] **Step 3: Implement the hook**

In `useExportPdfDownload.ts`:

1. Imports:

```ts
import { where } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { loadExportFeatureTable } from "@/views/GisApp/export/loadExportFeatureTable/loadExportFeatureTable";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
```

(merge `where` into the existing `@avandar/utils` import of `formatDate` and `isDefined`).

2. Add to `UseExportPdfDownloadInput`, after `workspaceName`:

```ts
  /** The map's workspace, whose datasets a feature list query reads. */
  workspaceId: Workspace.Id;
```

3. In `_buildComposePdfInput`, add `featureTable: ExportFeatureTable | undefined;` to the options type, add `featureTable` to the destructuring, and `featureTable,` to the returned object after `filename`.

4. In `useExportPdfDownload`, after `const { i18n } = useLingui();`, add:

```ts
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", input.workspaceId),
  );
  const [datasetColumns] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", input.workspaceId),
  );
```

5. In `download`, right after `const page = ExportPageLayout.fromLayout(config.exportLayout);`, add:

```ts
      const featureTable = await loadExportFeatureTable({
        config,
        workspaceId: input.workspaceId,
        datasets,
        datasetColumns,
        i18n,
      });
```

and change the composer call to:

```ts
      await composeExportPdf(
        _buildComposePdfInput({
          canvas,
          page,
          config,
          strings,
          input,
          i18n,
          featureTable,
        }),
      );
```

6. Add this paragraph to the hook's docstring, after the production date paragraph:

```ts
 * When the layout includes a feature list, its rows are fetched first, at
 * download, with the map's on-screen filters, so the printed list and the
 * printed map cannot disagree. A failed fetch fails the download like a
 * failed capture does.
```

- [ ] **Step 4: Pass the workspace id down**

In `ExportSheet.tsx`, add `import type { Workspace } from "$/models/Workspace/Workspace";`, add `workspaceId: Workspace.Id;` to `Props` after `workspaceName`, add `workspaceId,` to the destructured props, and pass `workspaceId,` to `useExportPdfDownload({ ... })` after `workspaceName`.

In `GisAppMapShell.tsx`, add `workspaceId={app.avaMap.workspaceId}` to `<ExportSheet ... />` after `workspaceName={workspace.name}`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/views/GisApp/export/useExportPdfDownload src/views/GisApp/export/ExportSheet`
Expected: PASS, including every pre-existing test.

Run: `pnpm tsc -b --force`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/views/GisApp/export/useExportPdfDownload src/views/GisApp/export/ExportSheet src/views/GisApp/GisAppMapShell.tsx
git commit -m "feat(gis): fetch the feature list rows when downloading the PDF"
```

---

### Task 9: `ExportFeatureListConfig` (sheet defaults and edits)

**Files:**
- Create: `src/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig.ts`
- Test: `src/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig.test.ts`

The layer select offers exactly the layers F3's drawer can list: `getFeatureListAccessFromMapLayer(layer) === "rows"`, which means exact sensitivity and a `latLngColumns` or `geometryColumn` binding. Boundary joins, point aggregation, grid bins, and buffers never appear. Default columns follow F3's `"popup"` rule: the popup's columns, or every query column except the geometry column when the popup shows all.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createDatasetQueryColumn } from "$/models/queries/QueryColumn/QueryColumn.fixtures";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

const NAME = createDatasetQueryColumn({ name: "school_name", dataType: "varchar" });
const RATE = createDatasetQueryColumn({ name: "percent_immunized_measles", dataType: "double" });
const LOCATION = createDatasetQueryColumn({ name: "location", dataType: "varchar" });

/** An exact point layer bound to latitude and longitude columns. */
function _pointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

/** An exact "Schools" layer whose query returns name, rate, and WKT location. */
function _schoolsLayer(): MapLayer.T {
  const layer = MapLayer.makeEmpty("Schools");
  return {
    ...layer,
    source: { ...layer.source, queryColumns: [NAME, RATE, LOCATION] },
    geoBinding: {
      type: "geometryColumn",
      column: LOCATION.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

describe("ExportFeatureListConfig", () => {
  it("offers only layers whose rows can be listed, top of the stack first", () => {
    const bottom = _pointLayer("Bottom");
    const jittered = MapLayer.withSensitivity(_pointLayer("Cases"), {
      mode: "jitter",
      radiusMeters: 500,
    });
    const unbound = MapLayer.makeEmpty("Unbound");
    const buffer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Bottom"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: bottom.id,
        distanceMeters: 805,
        distanceUnit: "mi",
        labelColumn: undefined,
        dissolve: false,
      },
    };
    const top = _pointLayer("Top");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [bottom, jittered, unbound, buffer, top],
    };

    expect(
      ExportFeatureListConfig.getEligibleLayers(config).map((layer) => {
        return layer.name;
      }),
    ).toEqual(["Top", "Bottom"]);
  });

  it("starts from the popup's columns when the popup lists them", () => {
    const layer = {
      ..._schoolsLayer(),
      popup: { columnIds: [RATE.id], action: undefined },
    };

    expect(ExportFeatureListConfig.createFromLayer(layer)).toEqual({
      layerId: layer.id,
      columnIds: [RATE.id],
      sort: undefined,
      maxRows: 200,
    });
  });

  it("starts from every column but the geometry when the popup shows all", () => {
    expect(
      ExportFeatureListConfig.createFromLayer(_schoolsLayer()).columnIds,
    ).toEqual([NAME.id, RATE.id]);
  });

  it("keeps the row cap and resets columns and sort when the layer changes", () => {
    const layer = _schoolsLayer();
    const otherLayer = _pointLayer("Childcare");

    expect(
      ExportFeatureListConfig.withLayer({
        featureList: {
          layerId: layer.id,
          columnIds: [NAME.id],
          sort: { columnId: NAME.id, direction: "desc" },
          maxRows: 50,
        },
        layer: otherLayer,
      }),
    ).toEqual({
      layerId: otherLayer.id,
      columnIds: [],
      sort: undefined,
      maxRows: 50,
    });
  });

  it("orders checked columns as the query does and drops an unchecked sort", () => {
    const layer = _schoolsLayer();

    expect(
      ExportFeatureListConfig.withColumns({
        featureList: {
          layerId: layer.id,
          columnIds: [NAME.id, RATE.id],
          sort: { columnId: NAME.id, direction: "asc" },
          maxRows: 200,
        },
        layer,
        selectedIds: [LOCATION.id, RATE.id],
      }),
    ).toEqual({
      layerId: layer.id,
      columnIds: [RATE.id, LOCATION.id],
      sort: undefined,
      maxRows: 200,
    });
  });

  it("sorts ascending by a chosen listed column and clears the sort for the default order", () => {
    const layer = _schoolsLayer();
    const featureList = {
      layerId: layer.id,
      columnIds: [NAME.id, RATE.id],
      sort: undefined,
      maxRows: 200,
    };
    const sorted = ExportFeatureListConfig.withSortColumn({
      featureList,
      columnId: RATE.id,
    });

    expect(sorted.sort).toEqual({ columnId: RATE.id, direction: "asc" });
    expect(
      ExportFeatureListConfig.withSortColumn({
        featureList: sorted,
        columnId: "default",
      }).sort,
    ).toBeUndefined();
  });

  it("changes the direction only of a set sort", () => {
    const layer = _schoolsLayer();
    const unsorted = {
      layerId: layer.id,
      columnIds: [NAME.id],
      sort: undefined,
      maxRows: 200,
    };

    expect(
      ExportFeatureListConfig.withSortDirection({
        featureList: unsorted,
        direction: "desc",
      }),
    ).toBe(unsorted);
    expect(
      ExportFeatureListConfig.withSortDirection({
        featureList: {
          ...unsorted,
          sort: { columnId: NAME.id, direction: "asc" },
        },
        direction: "desc",
      }).sort?.direction,
    ).toBe("desc");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/views/GisApp/export/ExportFeatureListConfig`
Expected: FAIL with "Failed to resolve import ... ExportFeatureListConfig".

- [ ] **Step 3: Implement**

```ts
import { prop } from "@avandar/utils";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues";
import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** The popup's columns, or every column but the geometry when it shows all. */
function _getPopupColumnIds(layer: MapLayer.T): QueryColumn.Id[] {
  if (layer.popup.columnIds !== "all") {
    return [...layer.popup.columnIds];
  }
  const geometryColumnId =
    layer.geoBinding?.type === "geometryColumn"
      ? layer.geoBinding.column
      : undefined;
  return layer.source.queryColumns.map(prop("id")).filter((columnId) => {
    return columnId !== geometryColumnId;
  });
}

/** A new list for `layer`: its popup columns, default order, 200 rows. */
function _createFromLayer(layer: MapLayer.T): AvaMapConfig.ExportFeatureList {
  return {
    layerId: layer.id,
    columnIds: _getPopupColumnIds(layer),
    sort: undefined,
    maxRows: AvaMapConfigValues.exportFeatureListDefaultMaxRows,
  };
}

/** Defaults and pure edits behind the export sheet's feature list section. */
export const ExportFeatureListConfig = {
  /** The most rows a feature list may print. */
  maxRows: AvaMapConfigValues.exportFeatureListMaxRows,

  /**
   * Layers a feature list may print, top of the stack first: the layers the
   * feature list drawer lists rows for. A jittered or aggregate-only layer
   * is left out because exact rows would undo its protection, and a boundary
   * join, bin, or buffer because its features are not rows.
   */
  getEligibleLayers: (config: AvaMapConfig.T): MapLayer.T[] => {
    return AvaMapConfig.toStackOrder(config).filter((layer) => {
      return getFeatureListAccessFromMapLayer(layer) === "rows";
    });
  },

  /** A new feature list for `layer`, with the drawer's columns. */
  createFromLayer: _createFromLayer,

  /** Points the list at another layer, keeping only the row cap. */
  withLayer: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      layer: MapLayer.T;
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    return {
      ..._createFromLayer(options.layer),
      maxRows: options.featureList.maxRows,
    };
  },

  /**
   * Sets the checked columns, in the layer's column order. A sort on a column
   * that is no longer checked falls back to the default order.
   */
  withColumns: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      layer: MapLayer.T;
      selectedIds: readonly string[];
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    const { featureList, layer, selectedIds } = options;
    const columnIds = layer.source.queryColumns
      .map(prop("id"))
      .filter((columnId) => {
        return selectedIds.includes(columnId);
      });
    const isSortKept =
      featureList.sort !== undefined &&
      columnIds.includes(featureList.sort.columnId);
    return {
      ...featureList,
      columnIds,
      sort: isSortKept ? featureList.sort : undefined,
    };
  },

  /**
   * Sorts by a listed column, keeping the current direction (ascending when
   * none). Any other value, such as the "default" option, clears the sort.
   */
  withSortColumn: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      columnId: string | null;
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    const { featureList, columnId } = options;
    const sortColumnId = featureList.columnIds.find((candidate) => {
      return candidate === columnId;
    });
    return {
      ...featureList,
      sort:
        sortColumnId === undefined
          ? undefined
          : {
              columnId: sortColumnId,
              direction: featureList.sort?.direction ?? "asc",
            },
    };
  },

  /** Changes the direction of a set sort. The default order has none. */
  withSortDirection: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      direction: string;
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    const { featureList, direction } = options;
    if (featureList.sort === undefined) {
      return featureList;
    }
    return {
      ...featureList,
      sort: {
        ...featureList.sort,
        direction: direction === "desc" ? "desc" : "asc",
      },
    };
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/views/GisApp/export/ExportFeatureListConfig`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/views/GisApp/export/ExportFeatureListConfig
git commit -m "feat(gis): add feature list defaults and edits for the export sheet"
```

---

### Task 10: "Include a feature list" in the export sheet

**Files:**
- Create: `src/views/GisApp/export/ExportSheet/updateExportFeatureList.ts`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListFields.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListOptions.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListColumnFields.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListSortFields.tsx`
- Create: `src/views/GisApp/export/ExportSheet/ExportSheetFeatureListMaxRowsField.tsx`
- Modify: `src/views/GisApp/export/ExportSheet/ExportSheetControls.tsx:1-63`
- Test: `src/views/GisApp/export/ExportSheet/ExportSheet.test.tsx`

Before writing UI, read `docs/design/app-view-layout.md`, the Named Rules in `DESIGN.md`, and `docs/design/gis/feature-home-inventory.md` (the export sheet is the "Export layout" surface). This adds a section to an existing sheet, so the `impeccable` skill is not needed. Follow the sheet's existing pattern: Mantine controls in a `Stack`, `Divider` between sections, no new CSS.

- [ ] **Step 1: Write the failing tests**

Add to `ExportSheet.test.tsx`. Task 8 already added the `uuid` and `Workspace` imports; add `import { createDatasetQueryColumn } from "$/models/queries/QueryColumn/QueryColumn.fixtures";` and `import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";`. The sheet's default `_config()` layer is an unbound area, which F3's `getFeatureListAccessFromMapLayer` does not list, so these tests build a point layer. Add this helper below `_aggregateOnlyLayer`:

```ts
/** An exact point layer, which a feature list can print. */
function _pointLayer(
  queryColumns: MapLayer.T["source"]["queryColumns"] = [],
): MapLayer.T {
  const layer = MapLayer.makeEmpty("Sites");
  return {
    ...layer,
    source: { ...layer.source, queryColumns },
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

/** A map holding `layer`, with an optional export feature list. */
function _configWithLayer(
  options: Readonly<{
    layer: MapLayer.T;
    featureList?: AvaMapConfig.ExportFeatureList;
  }>,
): AvaMapConfig.T {
  const base = AvaMapConfig.makeEmpty();
  return {
    ...base,
    layers: [options.layer],
    exportLayout: { ...base.exportLayout, featureList: options.featureList },
  };
}
```

Then add these tests inside `describe("ExportSheet")`:

```ts
  it("includes a feature list of the first listable layer, capped at 200 rows", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    const config = _configWithLayer({ layer: _pointLayer() });
    render(<ExportSheet {..._props({ onConfigChange })} config={config} />);

    fireEvent.click(
      screen.getByRole("switch", { name: "Include a feature list" }),
    );

    expect(
      onConfigChange.mock.calls.at(-1)![0](config).exportLayout.featureList,
    ).toEqual({
      layerId: config.layers[0]!.id,
      columnIds: [],
      sort: undefined,
      maxRows: 200,
    });
  });

  it("removes the feature list when the switch is turned off", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    const layer = _pointLayer();
    const config = _configWithLayer({
      layer,
      featureList: {
        layerId: layer.id,
        columnIds: [],
        sort: undefined,
        maxRows: 200,
      },
    });
    render(<ExportSheet {..._props({ onConfigChange })} config={config} />);

    fireEvent.click(
      screen.getByRole("switch", { name: "Include a feature list" }),
    );

    expect(
      onConfigChange.mock.calls.at(-1)![0](config).exportLayout.featureList,
    ).toBeUndefined();
  });

  it.each([
    { label: "an aggregate-only layer", layers: [_aggregateOnlyLayer()] },
    { label: "an unbound area layer", layers: [MapLayer.createArea("Zones")] },
  ])("disables the feature list when the map has only $label", ({ layers }) => {
    _render({ layers });

    expect(
      screen.getByRole("switch", { name: "Include a feature list" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Only point, line, or polygon layers with exact locations can be listed.",
      ),
    ).toBeInTheDocument();
  });

  it("adds a checked column to the feature list in the layer's column order", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    const siteId = createDatasetQueryColumn({ name: "site_id", dataType: "varchar" });
    const cases = createDatasetQueryColumn({ name: "cases", dataType: "bigint" });
    const layer = _pointLayer([siteId, cases]);
    const config = _configWithLayer({
      layer,
      featureList: {
        layerId: layer.id,
        columnIds: [cases.id],
        sort: undefined,
        maxRows: 200,
      },
    });
    render(<ExportSheet {..._props({ onConfigChange })} config={config} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "site_id" }));

    expect(
      onConfigChange.mock.calls.at(-1)![0](config).exportLayout.featureList
        ?.columnIds,
    ).toEqual([siteId.id, cases.id]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/views/GisApp/export/ExportSheet`
Expected: FAIL with "Unable to find an accessible element with the role "switch" and name "Include a feature list"".

- [ ] **Step 3: Create `updateExportFeatureList.ts`**

```ts
import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Applies one edit to the export layout's feature list, through
 * `updateExportLayout`. Does nothing when the layout has no feature list.
 */
export function updateExportFeatureList(
  options: Readonly<{
    onConfigChange: (
      update: (config: AvaMapConfig.T) => AvaMapConfig.T,
    ) => void;
    update: (
      featureList: AvaMapConfig.ExportFeatureList,
    ) => AvaMapConfig.ExportFeatureList;
  }>,
): void {
  const { onConfigChange, update } = options;
  updateExportLayout({
    onConfigChange,
    update: (layout) => {
      return layout.featureList === undefined
        ? layout
        : { ...layout, featureList: update(layout.featureList) };
    },
  });
}
```

- [ ] **Step 4: Create `ExportSheetFeatureListFields.tsx`**

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack, Switch } from "@mantine/core";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { ExportSheetFeatureListOptions } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListOptions";
import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  config: AvaMapConfig.T;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/**
 * The "Include a feature list" switch and, while it is on, the list's
 * options. Only layers the feature list drawer lists rows for can be printed
 * (exact points, lines, or polygons drawn from rows), so with none on the map
 * the switch is disabled and says why. A list that is already on can always
 * be turned off.
 */
export function ExportSheetFeatureListFields({
  config,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const eligibleLayers = ExportFeatureListConfig.getEligibleLayers(config);
  const firstLayer = eligibleLayers[0];
  const { featureList } = config.exportLayout;
  return (
    <Stack gap="sm">
      <Switch
        label={t`Include a feature list`}
        description={
          firstLayer === undefined
            ? t`Only point, line, or polygon layers with exact locations can be listed.`
            : t`Prints the layer's features as a table after the map.`
        }
        disabled={firstLayer === undefined && featureList === undefined}
        checked={featureList !== undefined}
        onChange={(event) => {
          const isChecked = event.currentTarget.checked;
          updateExportLayout({
            onConfigChange,
            update: (layout) => {
              return {
                ...layout,
                featureList:
                  isChecked && firstLayer !== undefined
                    ? ExportFeatureListConfig.createFromLayer(firstLayer)
                    : undefined,
              };
            },
          });
        }}
      />
      {featureList !== undefined ? (
        <ExportSheetFeatureListOptions
          featureList={featureList}
          eligibleLayers={eligibleLayers}
          onConfigChange={onConfigChange}
        />
      ) : null}
    </Stack>
  );
}
```

- [ ] **Step 5: Create `ExportSheetFeatureListOptions.tsx`**

```tsx
import { useLingui } from "@lingui/react/macro";
import { Select, Stack } from "@mantine/core";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { ExportSheetFeatureListColumnFields } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListColumnFields";
import { ExportSheetFeatureListMaxRowsField } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListMaxRowsField";
import { ExportSheetFeatureListSortFields } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListSortFields";
import { updateExportFeatureList } from "@/views/GisApp/export/ExportSheet/updateExportFeatureList";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  featureList: AvaMapConfig.ExportFeatureList;
  eligibleLayers: readonly MapLayer.T[];
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** The listed layer, then its columns, order, and row cap. */
export function ExportSheetFeatureListOptions({
  featureList,
  eligibleLayers,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const layer = eligibleLayers.find((candidate) => {
    return candidate.id === featureList.layerId;
  });
  return (
    <Stack gap="sm">
      <Select
        label={t`Layer`}
        placeholder={t`Pick a layer`}
        data={eligibleLayers.map((candidate) => {
          return { value: candidate.id, label: candidate.name };
        })}
        value={layer?.id ?? null}
        allowDeselect={false}
        onChange={(layerId) => {
          const nextLayer = eligibleLayers.find((candidate) => {
            return candidate.id === layerId;
          });
          if (nextLayer === undefined) {
            return;
          }
          updateExportFeatureList({
            onConfigChange,
            update: (current) => {
              return ExportFeatureListConfig.withLayer({
                featureList: current,
                layer: nextLayer,
              });
            },
          });
        }}
      />
      {layer !== undefined ? (
        <ExportSheetFeatureListColumnFields
          layer={layer}
          featureList={featureList}
          onConfigChange={onConfigChange}
        />
      ) : null}
      {layer !== undefined ? (
        <ExportSheetFeatureListSortFields
          layer={layer}
          featureList={featureList}
          onConfigChange={onConfigChange}
        />
      ) : null}
      <ExportSheetFeatureListMaxRowsField
        featureList={featureList}
        onConfigChange={onConfigChange}
      />
    </Stack>
  );
}
```

- [ ] **Step 6: Create `ExportSheetFeatureListColumnFields.tsx`**

Column labels are the layer's own field names, which are data, not interface copy, so they are not translated.

```tsx
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Stack } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { updateExportFeatureList } from "@/views/GisApp/export/ExportSheet/updateExportFeatureList";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  featureList: AvaMapConfig.ExportFeatureList;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** One checkbox per field of the listed layer, in the layer's order. */
export function ExportSheetFeatureListColumnFields({
  layer,
  featureList,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Checkbox.Group
      label={t`Columns`}
      value={[...featureList.columnIds]}
      onChange={(selectedIds) => {
        updateExportFeatureList({
          onConfigChange,
          update: (current) => {
            return ExportFeatureListConfig.withColumns({
              featureList: current,
              layer,
              selectedIds,
            });
          },
        });
      }}
    >
      <Stack gap={4} mt="xs">
        {layer.source.queryColumns.map((column) => {
          return (
            <Checkbox
              key={column.id}
              value={column.id}
              label={QueryColumn.getDerivedColumnName(column)}
            />
          );
        })}
      </Stack>
    </Checkbox.Group>
  );
}
```

- [ ] **Step 7: Create `ExportSheetFeatureListSortFields.tsx`**

```tsx
import { useLingui } from "@lingui/react/macro";
import { SegmentedControl, Select, Stack } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { updateExportFeatureList } from "@/views/GisApp/export/ExportSheet/updateExportFeatureList";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  featureList: AvaMapConfig.ExportFeatureList;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** The "Sort by" option value that clears the sort. */
const DEFAULT_ORDER_VALUE = "default";

/** The column the list sorts by, or its default order, and the direction. */
export function ExportSheetFeatureListSortFields({
  layer,
  featureList,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const listedColumns = layer.source.queryColumns.filter((column) => {
    return featureList.columnIds.includes(column.id);
  });
  return (
    <Stack gap="xs">
      <Select
        label={t`Sort by`}
        description={t`The default order lists the nearest first when a buffer filters the layer.`}
        data={[
          { value: DEFAULT_ORDER_VALUE, label: t`Default order` },
          ...listedColumns.map((column) => {
            return { value: column.id, label: QueryColumn.getDerivedColumnName(column) };
          }),
        ]}
        value={featureList.sort?.columnId ?? DEFAULT_ORDER_VALUE}
        allowDeselect={false}
        onChange={(columnId) => {
          updateExportFeatureList({
            onConfigChange,
            update: (current) => {
              return ExportFeatureListConfig.withSortColumn({ featureList: current, columnId });
            },
          });
        }}
      />
      <SegmentedControl
        aria-label={t`Sort direction`}
        disabled={featureList.sort === undefined}
        data={[
          { value: "asc", label: t`Ascending` },
          { value: "desc", label: t`Descending` },
        ]}
        value={featureList.sort?.direction ?? "asc"}
        onChange={(direction) => {
          updateExportFeatureList({
            onConfigChange,
            update: (current) => {
              return ExportFeatureListConfig.withSortDirection({ featureList: current, direction });
            },
          });
        }}
      />
    </Stack>
  );
}
```

- [ ] **Step 8: Create `ExportSheetFeatureListMaxRowsField.tsx`**

The model clamps the stored value (Task 2); `clampBehavior="strict"` stops the field from showing a value it would not store.

```tsx
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { ExportFeatureListConfig } from "@/views/GisApp/export/ExportFeatureListConfig/ExportFeatureListConfig";
import { updateExportFeatureList } from "@/views/GisApp/export/ExportSheet/updateExportFeatureList";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  featureList: AvaMapConfig.ExportFeatureList;
  onConfigChange: (update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

/** How many rows the PDF prints at most. */
export function ExportSheetFeatureListMaxRowsField({
  featureList,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <NumberInput
      label={t`Maximum rows`}
      description={t`Up to 1,000. The PDF says when the list is cut short.`}
      min={1}
      max={ExportFeatureListConfig.maxRows}
      clampBehavior="strict"
      allowDecimal={false}
      value={featureList.maxRows}
      onChange={(value) => {
        if (typeof value !== "number") {
          return;
        }
        updateExportFeatureList({
          onConfigChange,
          update: (current) => {
            return { ...current, maxRows: value };
          },
        });
      }}
    />
  );
}
```

- [ ] **Step 9: Render the section in `ExportSheetControls.tsx`**

Add the import `import { ExportSheetFeatureListFields } from "@/views/GisApp/export/ExportSheet/ExportSheetFeatureListFields";` and insert between `ExportSheetSourceAndDisclaimerFields` and the last `<Divider />`:

```tsx
      <Divider />
      <ExportSheetFeatureListFields
        config={config}
        onConfigChange={onConfigChange}
      />
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `pnpm vitest run src/views/GisApp/export/ExportSheet`
Expected: PASS, including every pre-existing test.

- [ ] **Step 11: Commit**

```bash
git add src/views/GisApp/export/ExportSheet
git commit -m "feat(gis): add \"Include a feature list\" to the export sheet"
```

---

### Task 11: Strings, types, lint, and format

**Files:**
- Modify (generated): `src/i18n/locales/*/messages.po`

- [ ] **Step 1: Extract the new strings**

Run: `pnpm i18n:extract`
Expected: `src/i18n/locales/en/messages.po` gains `#:` references to `getExportFeatureTableCopy.ts`, `ExportSheetFeatureListFields.tsx`, `ExportSheetFeatureListOptions.tsx`, `ExportSheetFeatureListColumnFields.tsx`, `ExportSheetFeatureListSortFields.tsx`, and `ExportSheetFeatureListMaxRowsField.tsx`, including "Include a feature list" and "Showing {shownText} of {countText}. Download the full list as CSV from the map.". Do not edit any `messages.ts`.

- [ ] **Step 2: Type check, lint, and format the changed files**

```bash
pnpm tsc -b --force
pnpm exec eslint src/views/GisApp/export shared/models/AvaMap
git diff --name-only demo/measles...HEAD -- '*.ts' '*.tsx' | xargs pnpm format:oxfmt
```

Expected: no type errors, no lint errors. If oxfmt rewrites files, review the diff.

- [ ] **Step 3: Run every touched suite**

Run: `pnpm vitest run src/views/GisApp/export shared/models/AvaMap src/clients/maps`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales src/views/GisApp/export shared/models/AvaMap
git commit -m "chore(i18n): extract the PDF feature list strings"
```

---

### Task 12: E2E: the downloaded PDF has the list pages

**Files:**
- Create: `tests/e2e/gis-export-feature-list.spec.ts`

`tests/e2e/gis-export-pdf.spec.ts` already proves Playwright's headless Chromium fires a real `download` for the export. This spec reads the downloaded file with `download.path()`. jsPDF writes an uncompressed PDF with one `/Type /Page` dictionary per page (checked against jsPDF 4: three pages give three matches; `/Type /Pages` is the page tree root and is excluded). The spec is tagged `E2E_ONLINE_TAG` because the list query runs on the GIS layer stack, which needs DuckDB `spatial` (see that tag's docstring); confirm with `pnpm test:e2e:offline gis-export-feature-list.spec.ts` and drop the tag only if it passes offline.

- [ ] **Step 1: Write the spec**

```ts
/**
 * Feature list in the PDF, end to end.
 *
 * Turning on "Include a feature list" in the export sheet and downloading
 * produces a PDF whose list follows the map on its own pages, so the file
 * has more than one page. The page count is read from the file's page
 * dictionaries; the table's layout is covered by
 * `drawExportFeatureTable.test.ts` and `composeExportPdf.test.ts`.
 */
import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_DATED_POINTS_CSV_PATH,
  GIS_DATED_POINTS_ROW_COUNT,
} from "./helpers/constants";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";

const POINT_DATASET_NAME = "dated-points.csv";
const MAP_NAME = "E2E GIS export feature list";

/** Page dictionaries in a jsPDF file. `/Type /Pages` is the tree, not a page. */
function _countPdfPages(pdfText: string): number {
  return pdfText.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

test(
  "downloads a PDF with the feature list on pages after the map",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    const admin = createSupabaseAdminClient();
    const { primaryUser, workspaceSlug } = e2eWorkerDb;
    let datasetId = "";
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
      datasetId = await importDatasetViaUi({
        page,
        workspaceSlug,
        filePath: GIS_DATED_POINTS_CSV_PATH,
        expectedRowCount: GIS_DATED_POINTS_ROW_COUNT,
      });
      await page.getByRole("link", { name: "Maps" }).click();
      await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
      const mapRegion = page.getByRole("region", { name: new RegExp(MAP_NAME) });
      await mapRegion.getByRole("button", { name: "Add a layer" }).click();
      await page.getByPlaceholder("Search data sources").click();
      await page.getByRole("option", { name: POINT_DATASET_NAME }).click();
      const inspector = page.getByRole("region", { name: "Layer" });
      await expect(
        inspector.getByText(
          `${GIS_DATED_POINTS_ROW_COUNT} of ${GIS_DATED_POINTS_ROW_COUNT} rows mapped`,
        ),
      ).toBeVisible({ timeout: LONG_WAIT });

      await page.getByRole("button", { name: "Export" }).click();
      const exportDialog = page.getByRole("dialog", { name: "Export" });
      await exportDialog
        .getByRole("switch", { name: "Include a feature list" })
        .click();
      await expect(
        exportDialog.getByRole("combobox", { name: "Layer" }),
      ).toHaveValue(POINT_DATASET_NAME, { timeout: MEDIUM_WAIT });

      const downloadEventPromise = page.waitForEvent("download", {
        timeout: LONG_WAIT,
      });
      await exportDialog.getByRole("button", { name: "Download PDF" }).click();
      const download = await downloadEventPromise;
      const pdfText = await readFile(await download.path(), "latin1");

      expect(_countPdfPages(pdfText)).toBeGreaterThan(1);
    } finally {
      await deleteMapsByIds({ admin, mapIds: mapId ? [mapId] : [] });
      if (datasetId) {
        await deleteDatasetAndShares({ supabaseAdminClient: admin, datasetId });
      }
    }
  },
);
```

- [ ] **Step 2: Run the spec**

Run: `pnpm test:e2e gis-export-feature-list.spec.ts`
Expected: PASS within the 45 s local timeout. If it fails, take a screenshot into `.temp/feat-gis-pdf-feature-list/` and use the `systematic-debugging` skill; do not raise the timeout. If the sheet shows "The PDF could not be created", the message names the failed step (capture or list query).

- [ ] **Step 3: Re-run the neighbouring export spec**

Run: `pnpm test:e2e gis-export-pdf.spec.ts`
Expected: PASS (a map without a list still downloads one page).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/gis-export-feature-list.spec.ts
git commit -m "test(gis): assert the exported PDF carries the feature list pages"
```

---

### Task 13: Log the feature

**Files:**
- Modify (on `demo/measles`, after this branch merges into it): `docs/measles-demo/pr-feature-log.md`

- [ ] **Step 1: Add the log entry**

After `feat/gis-pdf-feature-list` is merged into `demo/measles`, take the next free `F<n>` in the log's Features table and add a row: `| F<n> | Feature list in the export PDF | not started | the F-number of F3's entry | |`. Add a section in the log's existing shape: Status (`not started. Built on feat/gis-pdf-feature-list, branched from demo/measles.`), Purpose and Value (field teams get the candidate list on the pages after the map, fetched at export with the on-screen filters), Design (`docs/measles-demo/workflow-b-map-features-design.md` §6), PR title `feat(gis): print a layer's feature list in the export PDF`, Depends on (F3's entry), and a "Commits to read" table listing each commit from Tasks 1 to 12 with "All of it".

- [ ] **Step 2: Commit**

```bash
git add docs/measles-demo/pr-feature-log.md
git commit -m "docs(measles-demo): log the PDF feature list feature"
```

---

## Self-review

### Spec coverage

| Spec §6 requirement | Task |
| --- | --- |
| `ExportLayout.featureList` with `layerId`, `columnIds`, `sort`, `maxRows`; default unset | 1 |
| New `AvaMapConfig` version 8, migration from 7 | 1 |
| Persisted like the rest of the export furniture | 1 (schema), 2 (normalization) |
| Field resets to unset when its layer is deleted | 3 |
| "Include a feature list" section in the export sheet | 10 |
| Layer select offers only layers the drawer lists rows for (exact, drawn from rows) | 9 (`getEligibleLayers` via `getFeatureListAccessFromMapLayer`), 10 |
| Column checkboxes default to the drawer's (popup) columns | 9 (`createFromLayer`), 10 |
| Sort | 9 (`withSortColumn`, `withSortDirection`), 10 |
| Row cap default 200, maximum 1,000 | 1 (values, schema), 2 (clamp), 9, 10 |
| Table pages after the map page and any legend overflow page | 6 |
| `drawExportFeatureTable` beside `drawExportLegend`, jsPDF only, no new dependency | 5, 6 |
| Header row repeats on every page | 5 |
| Long cells wrap | 5 |
| Every string through `toPdfSafeText` | 5 |
| Paginates | 5 |
| "{count} {layer name} within {distance} of {source}" when filtered by a buffer, else "{count} {layer name}" | 4 |
| "Showing {maxRows} of {count}. Download the full list as CSV from the map." | 4 |
| "Page n of N" across all pages | 6 |
| Footer with source line and disclaimer on every page | 6 (adds it to the legend overflow page too) |
| Rows from the drawer's query at export time, with on-screen filters | 7, 8 |
| Unit: pagination 0, 1, exactly one page, many pages | 5 |
| Unit: header repeat, truncation note, long cell wrapping | 5, 4 |
| Unit: page numbering across map, legend overflow, and table pages | 6 |
| Snapshot of jsPDF draw calls for a small table | 6 (step 6) |
| E2E: export with a list, download has more than one page | 12 |

### Aligned with F3's final plan

Checked against `workflow-b-f3-filter-by-layer-plan.md` (Tasks 1, 2, 4, 5, 12, 15, 17, 20): the `fetchMapLayerFeatureList` options (including `workspaceId`, `datasets`, `datasetColumns`, `i18n`); row keys (`QueryColumn.getDerivedColumnName` for source columns, `MAP_LAYER_FEATURE_LIST_ROW_KEYS` for distance and nearest label, hidden longitude and latitude never printed); distances already in `distanceUnit` (no conversion here; the summary converts only the buffer's stored meters, with `MapLayer.getBufferDistanceFromMeters`); the default order (distance ascending under a buffer, otherwise source order); listable layers (`getFeatureListAccessFromMapLayer === "rows"`); the version 7 names and F3's chained `migrateAvaMapConfig` object; F3's `withLayerRemoved` body; and `MapLayer.makeEmpty` carrying `spatialFilter: undefined`.

### Could not verify in code

1. F1 and F3 are plans, not code on `demo/measles` yet. Every F3 name is taken from F3's plan and re-checked by Task 0 step 2 once F3 merges. If F3's implementation drifts from its plan, Task 0 step 2 is where it shows.
2. `AvaMapConfigV7Schema` is built with `AvaMapConfigV6Schema.extend(...).strict()` in F3's plan, so Task 1's `.extend` on it stays strict (checked against zod 4 in this repo for a strict object).
3. That `formatFeatureListCell` prints "0.09 mi" for 0.0935 miles and `String(value)` for a source number, as F3's plan writes it; Task 7's last two tests rely on both.
4. Whether the e2e spec passes offline. It is tagged `@online` by analogy with the other GIS layer specs; Task 12 says how to check.
5. Mantine `Checkbox.Group` firing `onChange` on `fireEvent.click` under happy-dom (the existing sheet tests click Mantine checkboxes and radios, so this is expected to work).

Verified by running code in this repo: Vitest runs single files with `pnpm vitest run <path>`; zod 4 `strictObject` rejects an unknown key whose value is `undefined` (why Task 1 strips `featureList` from the version 5 default and from F1's and F3's older-version fixtures); `.extend` on a strict object stays strict; jsPDF 4's `splitTextToSize` returns `string[]` and its output has one `/Type /Page` per page.
