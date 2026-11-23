# F3 Filter by Layer and Feature List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a map layer keep only the features inside another layer's polygons (for example "schools within half a mile of these sites"), and show that layer's rows in a sortable, downloadable feature list with each row's distance to the nearest buffered site.

**Architecture:** `MapLayerCommon.spatialFilter` names a polygon-output layer. Spatial-binding layers are compiled as before and then wrapped once, at the dispatcher level, in a `json_each` pass that keeps only features intersecting the filtering layer's features (`filter_geoms` CTE plus an `EXISTS (... ST_Intersects ...)` predicate); latitude/longitude layers get the same predicate on `ST_Point` inside `compileLatLngOverlaySql`. The feature list (`fetchMapLayerFeatureList`) reuses exactly these compiles, reads the features back through the same `json_each` pattern, and measures distance with `ST_Distance` in the meters CRS from `makeMetersCrsSql`, so the map, the list, and F4's PDF table always agree.

**Tech Stack:** TypeScript, React 19, Mantine 9, Lingui, zod, DuckDB (browser WASM through `WorkspaceQuerySession`, Node `@duckdb/node-api` for executed tests), Vitest, Playwright.

**Spec:** [workflow-b-map-features-design.md](workflow-b-map-features-design.md) §5

**Depends on:** F1 (threshold colors) merged into `demo/measles`. This plan adds `AvaMapConfig` **version 7** on top of F1's version 6 (`AvaMapConfigV6Schema.ts`, `migrateAvaMapConfig.fromV5`). F4 builds version 8 on top of this one and consumes the `MapLayerFeatureList` module defined in Task 12 and Task 15.

**Schema work:** none. This plan runs no `ava supabase` or `pnpm db:*` command.

**Contract note for F4:** `fetchMapLayerFeatureList` takes the brief's fields unchanged (`config`, `layerId`, `columnIds`, `sort`, `limit`) and adds `workspaceId`, `datasets`, `datasetColumns`, `i18n`, and an optional `signal`, because a compile needs workspace column metadata and the column labels must be localized outside a component. Distance values in `rows` are already in `distanceUnit`. Rows also carry hidden `__avandar_longitude` / `__avandar_latitude` keys that are not in `columns`.

---

## File structure

### Shared model (`shared/`, Deno-reachable, imports end in `.ts`)

| File | Change | Responsibility |
| --- | --- | --- |
| `shared/models/AvaMap/MapLayer/GeoBinding.types.ts` | Modify | `BUFFER_DISTANCE_UNITS`, `BufferDistanceUnit`; `BufferOfLayerBinding.distanceUnit` and `.labelColumn` |
| `shared/models/AvaMap/MapLayer/MapLayer.types.ts` | Modify | `MapLayerSpatialFilter`; `MapLayerCommon.spatialFilter` |
| `shared/models/AvaMap/MapLayer/MapLayer.ts` | Modify | Namespace types `SpatialFilter`, `BufferDistanceUnit`; re-export `BUFFER_DISTANCE_UNITS` |
| `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts` | Modify | `makeEmpty` sets `spatialFilter`; exposes `isAreaGeoBinding`, `isPointGeoBinding`, unit conversions |
| `shared/models/AvaMap/MapLayer/MapLayerModule/bufferDistanceHelpers.ts` | Create | Meters to and from a buffer distance unit |
| `shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.bufferDistance.test.ts` | Create | Unit conversion tests |
| `shared/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.ts` | Create | Cycle check across buffer sources and spatial filters |
| `shared/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers/getSpatialFilterCandidatesFromLayers.ts` | Create | Layers a given layer may be filtered by |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV7Schema.ts` | Create | Version 7 zod schema |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts` | Modify | `fromV6` and the version 6 to 7 step |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts` | Modify | Parse version 7, reject spatial filter cycles |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts` | Modify | Version literal 7 |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts` | Modify | `makeEmpty` version 7; `withLayerRemoved` clears dangling spatial filters |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/overlayConfigUpdaters/overlayConfigUpdaters.ts` | Modify | `withBufferLayerInserted` takes unit, ring label, and a caller-chosen id |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v7SchemaSuites.ts` | Create | Version 7 schema suites |

### Spatial query client (`src/clients/maps/MapLayerSpatialQuery/`)

| File | Change | Responsibility |
| --- | --- | --- |
| `FeatureSourceSqlHelpers/FeatureSourceSqlHelpers.ts` | Create | `MapLayerFeatureSource`; features CTE; spatial filter predicate; filtered envelope wrapper; JSON pointer |
| `getCompileMetadataFromMapLayer/getCompileMetadataFromMapLayer.ts` | Create | Leaf-source metadata resolution, moved out of `useMapLayersData` |
| `compileSpatialFilteredQuery/compileSpatialFilteredQuery.ts` | Create | Compile a layer plus its spatial filter; compile a filter's envelope |
| `compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types.ts` | Modify | `SpatialFilterCompileOptions` |
| `compileLatLngOverlaySql/compileLatLngOverlaySql.ts` | Modify | Spatial filter predicate on lat/lng rows |
| `compileLatLngLayerSourceSql/compileLatLngLayerSourceSql.ts` | Create | A lat/lng layer's filtered rows as a feature source |
| `compileBufferOfLayerQuery/compileBufferOfLayerQuery.ts` | Modify | Buffer lat/lng sources; per-ring label |

### Feature list client (`src/clients/maps/MapLayerFeatureList/`)

| File | Change | Responsibility |
| --- | --- | --- |
| `MapLayerFeatureList.types.ts` | Create | The cross-plan contract plus `MapLayerFeatureListAccess`, sort, options types |
| `MapLayerFeatureList.constants.ts` | Create | Row keys, SQL result columns, list zoom band |
| `MapLayerFeatureList.fixtures.ts` | Create | Sites, buffer, schools config for tests |
| `getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer.ts` | Create | rows / countOnly / unavailable from sensitivity and binding |
| `sortMapLayerFeatureListRows/sortMapLayerFeatureListRows.ts` | Create | Stable column sort, blanks last |
| `compileMapLayerFeatureListSql/compileMapLayerFeatureListSql.ts` | Create | Rows plus nearest distance and label SQL |
| `compileMapLayerFeatureSource/compileMapLayerFeatureSource.ts` | Create | Any listable layer as a filtered feature source |
| `fetchMapLayerFeatureList.ts` | Create | The contract function |
| `fetchMapLayerFeatureCount/fetchMapLayerFeatureCount.ts` | Create | Count only, for jitter layers |

### GIS app (`src/views/GisApp/`)

| File | Change | Responsibility |
| --- | --- | --- |
| `layers/MapLayerUpdates/spatialFilterUpdates.ts`, `MapLayerUpdates.ts` | Create / Modify | `withSpatialFilter` |
| `layers/useMapLayersData/MapLayerData.ts` | Modify | Query key and readiness follow spatial filters |
| `layers/useMapLayersData/useMapLayersData.ts` | Modify | Compile through `compileSpatialFilteredQuery`; lat/lng layers get the filter |
| `layers/useMapLayersData/runLatLngLayer.ts` | Modify | Use `compileLatLngLayerSourceSql` with the filter envelope |
| `layers/BufferDistanceUnit.constants.ts` | Create | Translated unit labels |
| `panels/LayerInspector/FilterSection/SpatialFilterSelect.tsx` | Create | "Only show features inside" select |
| `panels/LayerInspector/FilterSection/FilterSection.tsx`, `LayerInspectorBody/LayerInspectorSections.tsx` | Modify | Render the select, pass `layers` |
| `shell/MapToolCluster/BufferMapTool/*` | Modify / Create | Units, ring label, lat/lng allowed, "Filter another layer by this buffer" step |
| `shell/MapToolCluster/MapToolCluster.tsx`, `MapToolClusterToolbar.tsx`, `GisAppMapToolCluster.tsx` | Modify | Wire buffer id, filter, and list opening |
| `useGisApp/useGisAppFeatureList.ts`, `useGisApp/useGisAppState.ts` | Create / Modify | Which layer's list is open |
| `useGisAppLayerActions.tsx`, `panels/LayerPanel/**` | Modify | "Feature list" layer menu item |
| `panels/FeatureListDrawer/*` | Create | Drawer, table, sensitivity states, CSV |
| `GisAppFeatureListDrawer.tsx`, `GisAppMapShell.tsx` | Create / Modify | Mount the drawer, hide status and time slider while open, row click |

### E2E

| File | Change | Responsibility |
| --- | --- | --- |
| `tests/data/gis/nyc-exposure-sites.csv`, `tests/data/gis/README.md` | Create / Modify | Two NYC sites |
| `tests/e2e/helpers/constants.ts` | Modify | Fixture path and row count |
| `tests/e2e/gis-feature-list.spec.ts` | Create | Buffer 0.5 mi, filter schools, list count and first distance |

---

## Task 0: Workspace

**Files:** none

- [ ] **Step 1: Confirm F1 has merged into `demo/measles`.**

```bash
git show demo/measles:shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts | head -5
```

Expected: the file's first lines. If git reports the path does not exist, stop: F1 must merge first.

- [ ] **Step 2: Create the worktree.** Load the `using-wt` skill, then:

```bash
wt new feat/gis-filter-by-layer demo/measles
```

`cd` into the path `wt` prints. Every later command runs there.

- [ ] **Step 3: Read before coding.** `CLAUDE.md`, `docs/rules/typescript.md`, `docs/rules/testing.md`, `docs/rules/i18n.md`, `docs/rules/css.md`, `docs/rules/e2e-testing.md`. Before Tasks 16 to 20 also read `docs/design/app-view-layout.md`, the Named Rules in `DESIGN.md`, and `docs/design/gis/feature-home-inventory.md` (§1.5 bottom bar and the bottom-center stack).

- [ ] **Step 4: Check the test runners.**

```bash
pnpm vitest run src/views/GisApp/layers/classifyLayerValues
pnpm test:executed src/clients/maps/MapLayerSpatialQuery/makeSourceCrsTransformFromGeometrySql
```

Expected: both report all tests passed.

- [ ] **Step 5: Record F1's schema exports** for Task 4.

```bash
grep -n "^export const\|^const V6" shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts
grep -n "fromV5\|_migrateVersion5" shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts
```

Expected, per the F1 plan: `AvaMapConfigV6LayerSchema` and `AvaMapConfigV6Schema` are exported, the two layer variants are inline inside `AvaMapConfigV6LayerSchema`'s `z.union([...])`, `_migrateVersion4` returns `ConfigV5`, and `_migrateVersion5` returns `AvaMapConfigRead`. Task 4 names and exports the two variants.

No commit.

---

## Task 1: Model fields for spatial filters and buffer units

The red step for a pure type change is the compiler: adding required fields makes every hand-built layer literal fail `tsc`.

**Files:**
- Modify: `shared/models/AvaMap/MapLayer/GeoBinding.types.ts:103-111`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.types.ts:57-83`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.ts:46-110`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts:141-171`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts:100-116, 265-293`
- Modify (literals the compiler reports, listed in Step 4)

- [ ] **Step 1: Add the buffer unit and fields.** In `GeoBinding.types.ts`, replace the `BufferOfLayerBinding` block with:

```ts
/** Units a buffer distance is typed and shown in. Distances persist in meters. */
export const BUFFER_DISTANCE_UNITS = ["m", "km", "ft", "mi"] as const;
export type BufferDistanceUnit = (typeof BUFFER_DISTANCE_UNITS)[number];

/** Polygon geometry produced by buffering another layer's features. */
export type BufferOfLayerBinding = {
  type: "bufferOfLayer";
  layerId: MapLayerId;
  distanceMeters: number;

  /** The unit the author typed the distance in, used wherever it is shown. */
  distanceUnit: BufferDistanceUnit;

  /**
   * Source column each ring carries when rings are not dissolved, such as a
   * site name, so a ring's popup and a feature list can name its site.
   */
  labelColumn: QueryColumn.Id | undefined;

  dissolve: boolean;
};
```

- [ ] **Step 2: Add the spatial filter.** In `MapLayer.types.ts`, above `type MapLayerCommon`, add:

```ts
/** Another layer whose polygons a layer's features must intersect. */
export type MapLayerSpatialFilter = { layerId: MapLayerId };
```

and inside `MapLayerCommon`, directly after `applyAoiFilter: boolean;`:

```ts
  /** Keeps only features that intersect another layer's output. */
  spatialFilter: MapLayerSpatialFilter | undefined;
```

In `MapLayer.ts`, add `BufferDistanceUnit as BufferDistanceUnitType,` to the `GeoBinding.types.ts` type import, `MapLayerSpatialFilter,` to the `MapLayer.types.ts` type import, `BUFFER_DISTANCE_UNITS,` to the value re-export from `GeoBinding.types.ts`, and inside `export namespace MapLayer`:

```ts
  /** Another layer whose polygons this layer's features must intersect. */
  export type SpatialFilter = MapLayerSpatialFilter;
  /** A unit a buffer distance is typed and shown in. */
  export type BufferDistanceUnit = BufferDistanceUnitType;
```

In `MapLayerModule.makeEmpty`, after `applyAoiFilter: true,` add `spatialFilter: undefined,`.

- [ ] **Step 2b: Run the compiler and see it fail.**

```bash
pnpm tsc -b --force 2>&1 | grep "error TS" | head -40
```

Expected: errors such as `Property 'distanceUnit' is missing in type` and `Property 'spatialFilter' is missing` in the files listed in Step 4.

- [ ] **Step 3: Fix the schema fixtures.** Older-version JSON fixtures spread a current layer, and strict older schemas reject a `spatialFilter` key. In `schemaTestFixtures.ts`, replace `omitExportFields` with:

```ts
/**
 * Strips the spatial filter, which version 7 added to every layer, so a
 * current layer can stand in for one persisted under an older version.
 */
export function omitSpatialFilterField<
  T extends Pick<MapLayer.T, "spatialFilter">,
>(layer: T) {
  const { spatialFilter: _spatialFilter, ...legacyLayer } = layer;
  return legacyLayer;
}

/**
 * Generic for the same reason as `omitOverlayFields` above: it must accept
 * `omitOverlayFields`'s already-narrowed return type, not just a full
 * `MapLayer.T`. Strips every field version 5 and later added to a layer.
 */
export function omitExportFields<
  T extends Pick<
    MapLayer.T,
    "disputedStatusColumn" | "disputedStatusValues" | "spatialFilter"
  >,
>(layer: T) {
  const {
    disputedStatusColumn: _disputedStatusColumn,
    disputedStatusValues: _disputedStatusValues,
    ...legacyLayer
  } = layer;
  return omitSpatialFilterField(legacyLayer);
}
```

In `createMismatchedBufferJson`, the buffer is typed as `MapLayer.T` but serialized as version 4 JSON. Replace its `const buffer = ...` with:

```ts
  const buffer = {
    ...MapLayer.withSensitivity(MapLayer.createArea("Buffer of Cases"), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    }),
    geoBinding: {
      type: "bufferOfLayer" as const,
      layerId: source.id,
      distanceMeters: 1000,
      dissolve: false,
    },
  };
```

- [ ] **Step 4: Add the new fields to every typed literal the compiler reports.** For each `bufferOfLayer` literal typed as a current layer, add `distanceUnit: "m", labelColumn: undefined,` after `distanceMeters`. Known sites (verify against the Step 2b output):
  - `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts:155`
  - `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/overlayConfigUpdaters/overlayConfigUpdaters.ts:62` (Task 5 rewrites this; add the two fields now so it compiles)
  - `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v4SchemaSuites.ts:59,108` are `toEqual` expectations on parsed configs: add `distanceUnit: "m"` (Task 4's migration produces it). Leave `schemaTestFixtures.ts:125,143,162,171,196` alone: they are version 4 JSON.
  - `shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.disputedStatus.test.ts:75`
  - `shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.test.ts:63`
  - `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.test.ts:30,160`
  - `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.bufferBinding.test.ts:10,33,48`
  - `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.popup.test.ts:95`
  - `src/views/GisApp/layers/useMapLayersData/MapLayerData.getQueryKeyFromMapLayer.test.ts:88`
  - `src/views/GisApp/layers/useMapLayersData/MapLayerData.isQueryable.test.ts:89,107`
  - `src/views/GisApp/makeBufferLayersFromSource.ts:19`
  - `src/views/GisApp/panels/LayerInspector/DataSection/BufferOfLayerFields/BufferOfLayerFields.test.tsx:15`
  - `src/views/GisApp/panels/LayerInspector/DataSection/TimeColumnSelect/TimeColumnSelect.test.tsx:92`
  - `src/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.buffer.test.tsx:21`
  - `src/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.timeColumn.test.tsx:29`
  - `src/views/GisApp/panels/LayerInspector/FilterSection/FilterSection.test.tsx:201`
  - `src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx:490` and `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/overlayConfigUpdaters/overlayConfigUpdaters.test.ts:166` are `toEqual` expectations on a buffer the updater builds: add `distanceUnit: "m",` (the updater now writes it).

  For any layer literal that does not spread `MapLayer.makeEmpty`/`createArea` and is reported missing `spatialFilter`, add `spatialFilter: undefined,`.

- [ ] **Step 5: Run the compiler and the touched suites.**

```bash
pnpm tsc -b --force
pnpm vitest run shared/models/AvaMap src/views/GisApp/layers src/views/GisApp/panels/LayerInspector src/clients/maps
```

Expected: `tsc` exits 0. Vitest passes except the `v4SchemaSuites.ts` buffer expectations that now include `distanceUnit: "m"`, which fail until Task 4 migrates buffers (`expected ... distanceUnit: "m"` received no `distanceUnit`). That failure is the red step Task 4 turns green.

- [ ] **Step 6: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add shared/models/AvaMap/MapLayer shared/models/AvaMap/AvaMapConfig src/clients/maps src/views/GisApp
git commit -m "feat(gis): add spatial filter and buffer unit and label fields to map layers"
```

---

## Task 2: Polygon and point checks and buffer unit conversions

**Files:**
- Create: `shared/models/AvaMap/MapLayer/MapLayerModule/bufferDistanceHelpers.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts:74-86, 88-130`
- Test: `shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.bufferDistance.test.ts`
- Test: `shared/models/AvaMap/MapLayer/MapLayerModule/__tests__/MapLayerModule.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `MapLayerModule.bufferDistance.test.ts`:

```ts
/**
 * Buffer distance unit conversions on the `MapLayer` module.
 */
import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

describe("MapLayer buffer distance units", () => {
  it("stores half a mile as 805 whole meters", () => {
    expect(
      MapLayer.getMetersFromBufferDistance({ distance: 0.5, unit: "mi" }),
    ).toBe(805);
  });

  it.each([
    { distance: 1.2, unit: "km" as const, expected: 1200 },
    { distance: 1000, unit: "ft" as const, expected: 305 },
    { distance: 250, unit: "m" as const, expected: 250 },
  ])(
    "stores $distance $unit as $expected meters",
    ({ distance, unit, expected }) => {
      expect(MapLayer.getMetersFromBufferDistance({ distance, unit })).toBe(
        expected,
      );
    },
  );

  it("shows 805 meters as about half a mile", () => {
    expect(
      MapLayer.getBufferDistanceFromMeters({ distanceMeters: 805, unit: "mi" }),
    ).toBeCloseTo(0.5002, 4);
  });
});
```

Append to `MapLayerModule.test.ts`:

```ts
describe("MapLayer.isAreaGeoBinding", () => {
  it("treats a buffer as a polygon output", () => {
    expect(
      MapLayer.isAreaGeoBinding({
        type: "bufferOfLayer",
        layerId: uuid<MapLayer.Id>(),
        distanceMeters: 805,
        distanceUnit: "mi",
        labelColumn: undefined,
        dissolve: false,
      }),
    ).toBe(true);
  });

  it("does not treat latitude and longitude points as a polygon output", () => {
    expect(
      MapLayer.isAreaGeoBinding({
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      }),
    ).toBe(false);
  });
});

describe("MapLayer.isPointGeoBinding", () => {
  it("treats a point geometry column as points", () => {
    expect(
      MapLayer.isPointGeoBinding({
        type: "geometryColumn",
        column: uuid<QueryColumn.Id>(),
        encoding: "wkt",
        family: "point",
        simplification: undefined,
        sourceCrs: undefined,
      }),
    ).toBe(true);
  });

  it("does not treat a polygon geometry column as points", () => {
    expect(
      MapLayer.isPointGeoBinding({
        type: "geometryColumn",
        column: uuid<QueryColumn.Id>(),
        encoding: "wkt",
        family: "polygon",
        simplification: undefined,
        sourceCrs: undefined,
      }),
    ).toBe(false);
  });
});
```

If `MapLayerModule.test.ts` does not already import `uuid` and `QueryColumn`, add `import { uuid } from "$/lib/uuid.ts";` and `import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";`.

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run shared/models/AvaMap/MapLayer/MapLayerModule
```

Expected: FAIL with `MapLayer.getMetersFromBufferDistance is not a function` and `MapLayer.isAreaGeoBinding is not a function`.

- [ ] **Step 3: Implement.** Create `bufferDistanceHelpers.ts`:

```ts
import type { BufferDistanceUnit } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";

/** Meters in one of each buffer distance unit. */
const METERS_PER_BUFFER_DISTANCE_UNIT: Readonly<
  Record<BufferDistanceUnit, number>
> = {
  m: 1,
  km: 1000,
  ft: 0.3048,
  mi: 1609.344,
};

/**
 * Whole meters for a distance typed in `unit`, which is how a buffer
 * persists its distance. For example, "0.5 mi" becomes 805.
 */
export function getMetersFromBufferDistance(
  options: Readonly<{ distance: number; unit: BufferDistanceUnit }>,
): number {
  return Math.round(
    options.distance * METERS_PER_BUFFER_DISTANCE_UNIT[options.unit],
  );
}

/**
 * A meter distance restated in `unit`. Use it to show a buffer's distance, or
 * a feature's distance to the nearest site, in the unit the buffer was typed
 * in.
 */
export function getBufferDistanceFromMeters(
  options: Readonly<{ distanceMeters: number; unit: BufferDistanceUnit }>,
): number {
  return options.distanceMeters / METERS_PER_BUFFER_DISTANCE_UNIT[options.unit];
}
```

In `MapLayerModule.ts`, import both helpers:

```ts
import {
  getBufferDistanceFromMeters,
  getMetersFromBufferDistance,
} from "$/models/AvaMap/MapLayer/MapLayerModule/bufferDistanceHelpers.ts";
```

Add below `_isAreaGeoBinding`:

```ts
/** True when a binding draws one point per row. */
function _isPointGeoBinding(binding: MapLayerRead["geoBinding"]): boolean {
  return (
    binding?.type === "latLngColumns" ||
    (binding?.type === "geometryColumn" && binding.family === "point")
  );
}
```

and add to the `MapLayerModule` object, after `areDisputedStatusValuesDisjoint,`:

```ts
  /**
   * True when a binding outputs polygons, for example to decide whether a
   * layer can filter another layer by location.
   */
  isAreaGeoBinding: _isAreaGeoBinding,

  /**
   * True when a binding draws one point per row, for example to offer a
   * layer as the target of "Filter another layer by this buffer".
   */
  isPointGeoBinding: _isPointGeoBinding,

  /** Whole meters for a distance typed in a buffer distance unit. */
  getMetersFromBufferDistance,

  /** A meter distance restated in a buffer distance unit. */
  getBufferDistanceFromMeters,
```

- [ ] **Step 4: Run and see them pass.**

```bash
pnpm vitest run shared/models/AvaMap/MapLayer/MapLayerModule
```

Expected: PASS.

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add shared/models/AvaMap/MapLayer/MapLayerModule
git commit -m "feat(gis): add buffer unit conversions and geometry kind checks to MapLayer"
```

---

## Task 3: Spatial filter cycles and candidates

**Files:**
- Create: `shared/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.ts`
- Create: `shared/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers/getSpatialFilterCandidatesFromLayers.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.test.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers/getSpatialFilterCandidatesFromLayers.test.ts`

- [ ] **Step 1: Write the failing tests.** Create `hasSpatialFilterCycle.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

function _makePointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

function _filteredBy(layer: MapLayer.T, filterLayer: MapLayer.T): MapLayer.T {
  return { ...layer, spatialFilter: { layerId: filterLayer.id } };
}

describe("hasSpatialFilterCycle", () => {
  it("allows schools filtered by a buffer of sites", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _filteredBy(_makePointLayer("Schools"), buffer);

    expect(hasSpatialFilterCycle([sites, buffer, schools], schools.id)).toBe(
      false,
    );
  });

  it("finds a cycle when sites are filtered by their own buffer", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const filteredSites = _filteredBy(sites, buffer);

    expect(hasSpatialFilterCycle([filteredSites, buffer], sites.id)).toBe(true);
  });

  it("finds a cycle when two layers filter each other", () => {
    const first = MapLayer.createArea("First");
    const second = _filteredBy(MapLayer.createArea("Second"), first);
    const filteredFirst = _filteredBy(first, second);

    expect(hasSpatialFilterCycle([filteredFirst, second], first.id)).toBe(
      true,
    );
  });

  it("finds no cycle when the filtering layer is missing", () => {
    const schools = _filteredBy(
      _makePointLayer("Schools"),
      MapLayer.createArea("Deleted"),
    );

    expect(hasSpatialFilterCycle([schools], schools.id)).toBe(false);
  });
});
```

Create `getSpatialFilterCandidatesFromLayers.test.ts`:

```ts
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { getSpatialFilterCandidatesFromLayers } from "$/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers/getSpatialFilterCandidatesFromLayers.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

function _makePointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

describe("getSpatialFilterCandidatesFromLayers", () => {
  it("offers only other layers that output polygons", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");

    const candidates = getSpatialFilterCandidatesFromLayers({
      layers: [sites, buffer, schools],
      layerId: schools.id,
    });

    expect(candidates.map(prop("name"))).toEqual(["Buffer of Sites"]);
  });

  it("leaves out a buffer of the layer itself", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);

    const candidates = getSpatialFilterCandidatesFromLayers({
      layers: [sites, buffer],
      layerId: sites.id,
    });

    expect(candidates).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run shared/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle shared/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers
```

Expected: FAIL with `Failed to resolve import ".../hasSpatialFilterCycle.ts"`.

- [ ] **Step 3: Implement.** Create `hasSpatialFilterCycle.ts`:

```ts
import { makeIdLookupMap } from "@avandar/utils";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/** Layers a layer reads from: its buffer source and its spatial filter. */
function _getDependencyIds(layer: MapLayer.T): MapLayer.Id[] {
  const bufferSourceIds =
    layer.geoBinding?.type === "bufferOfLayer" ? [layer.geoBinding.layerId] : [];
  const filterLayerIds = layer.spatialFilter
    ? [layer.spatialFilter.layerId]
    : [];
  return [...bufferSourceIds, ...filterLayerIds];
}

/**
 * Returns whether following buffer sources and spatial filters from
 * `startLayerId` leads back to it. Use it to refuse a spatial filter that
 * would make a layer depend on itself, for example sites filtered by their
 * own buffer. Missing layers end a path rather than count as a cycle.
 */
export function hasSpatialFilterCycle(
  layers: readonly MapLayer.T[],
  startLayerId: MapLayer.Id,
): boolean {
  const byId = makeIdLookupMap(layers);
  const startLayer = byId.get(startLayerId);
  const pendingIds = startLayer ? _getDependencyIds(startLayer) : [];
  const visitedIds = new Set<MapLayer.Id>();
  for (
    let currentId = pendingIds.pop();
    currentId !== undefined;
    currentId = pendingIds.pop()
  ) {
    if (currentId === startLayerId) {
      return true;
    }
    const current = byId.get(currentId);
    if (current && !visitedIds.has(currentId)) {
      visitedIds.add(currentId);
      pendingIds.push(..._getDependencyIds(current));
    }
  }
  return false;
}
```

Create `getSpatialFilterCandidatesFromLayers.ts`:

```ts
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/**
 * The layers that `layerId` may be spatially filtered by: every other layer
 * that outputs polygons and does not depend on `layerId`. Use it to fill a
 * "keep features inside this layer" picker, for example in a layer
 * inspector.
 */
export function getSpatialFilterCandidatesFromLayers(
  options: Readonly<{ layers: readonly MapLayer.T[]; layerId: MapLayer.Id }>,
): MapLayer.T[] {
  const { layers, layerId } = options;
  return layers.filter((candidate) => {
    if (candidate.id === layerId) {
      return false;
    }
    if (!MapLayer.isAreaGeoBinding(candidate.geoBinding)) {
      return false;
    }
    const filteredLayers = layers.map((layer) => {
      return layer.id === layerId
        ? { ...layer, spatialFilter: { layerId: candidate.id } }
        : layer;
    });
    return !hasSpatialFilterCycle(filteredLayers, layerId);
  });
}
```

- [ ] **Step 4: Run and see them pass.** Same command as Step 2. Expected: PASS.

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add shared/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle shared/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers
git commit -m "feat(gis): detect spatial filter cycles and list filter candidates"
```

---

## Task 4: `AvaMapConfig` version 7

**Files:**
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV7Schema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts` (name and export the two layer variants)
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts:153-157`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts:80-93`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v7SchemaSuites.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/AvaMapConfigSchema.test.ts:10-12`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts` (append)

- [ ] **Step 1: Add the version 6 JSON fixture.** Append to `schemaTestFixtures.ts`:

```ts
export function createVersion6BufferJson() {
  const config = AvaMapConfig.makeEmpty();
  const source = {
    ...MapLayer.createArea("Sites"),
    geoBinding: {
      type: "geometryColumn" as const,
      column: uuid<QueryColumn.Id>(),
      encoding: "wkt" as const,
      family: "polygon" as const,
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
  const buffer = {
    ...MapLayer.createArea("Buffer of Sites"),
    geoBinding: {
      type: "bufferOfLayer" as const,
      layerId: source.id,
      distanceMeters: 805,
      dissolve: false,
    },
  };
  return {
    __type: config.__type,
    version: 6,
    basemap: config.basemap,
    view: config.view,
    bookmarks: config.bookmarks,
    layers: [omitSpatialFilterField(source), omitSpatialFilterField(buffer)],
    annotations: config.annotations,
    annotationsZIndex: 0,
    exportLayout: config.exportLayout,
  };
}
```

- [ ] **Step 2: Write the failing suites.** Create `v7SchemaSuites.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { createVersion6BufferJson } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/schemaTestFixtures.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

function _makeSitesLayer(): MapLayer.T {
  return {
    ...MapLayer.makeEmpty("Sites"),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(
  source: MapLayer.T,
  labelColumn: QueryColumn.Id | undefined,
): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer of Sites"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn,
      dissolve: false,
    },
  };
}

function _makeConfig(layers: readonly MapLayer.T[]): AvaMapConfig.T {
  return { ...AvaMapConfig.makeEmpty(), layers };
}

describe("AvaMapConfigSchema v7 spatial filters", () => {
  it("migrates a version 6 buffer to meters with no ring label", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion6BufferJson());
    const buffer = parsed.layers.find((layer) => {
      return layer.geoBinding?.type === "bufferOfLayer";
    });

    expect(parsed.version).toBe(7);
    expect(buffer?.geoBinding).toMatchObject({
      distanceMeters: 805,
      distanceUnit: "m",
      labelColumn: undefined,
    });
  });

  it("migrates every version 6 layer to no spatial filter", () => {
    const parsed = AvaMapConfigSchema.fromJson(createVersion6BufferJson());

    expect(
      parsed.layers.map((layer) => {
        return layer.spatialFilter;
      }),
    ).toEqual([undefined, undefined]);
  });

  it("round-trips a spatial filter, a ring label, and a typed unit", () => {
    const sites = _makeSitesLayer();
    const buffer = _makeBufferOf(sites, uuid<QueryColumn.Id>());
    const schools = {
      ..._makeSitesLayer(),
      name: "Schools",
      spatialFilter: { layerId: buffer.id },
    };
    const config = _makeConfig([sites, buffer, schools]);

    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("rejects a spatial filter cycle at the json boundary", () => {
    const sites = _makeSitesLayer();
    const buffer = _makeBufferOf(sites, undefined);
    const filteredSites = { ...sites, spatialFilter: { layerId: buffer.id } };
    const json = AvaMapConfigSchema.toJson(
      _makeConfig([filteredSites, buffer]),
    );

    expect(() => {
      return AvaMapConfigSchema.fromJson(json);
    }).toThrow("Spatial filter chain contains a cycle");
  });

  it("keeps a spatial filter whose layer is missing", () => {
    const missingLayerId = uuid<MapLayer.Id>();
    const schools = {
      ..._makeSitesLayer(),
      spatialFilter: { layerId: missingLayerId },
    };
    const parsed = AvaMapConfigSchema.fromJson(
      AvaMapConfigSchema.toJson(_makeConfig([schools])),
    );

    expect(parsed.layers[0]?.spatialFilter).toEqual({
      layerId: missingLayerId,
    });
  });
});
```

Add the suite import to `AvaMapConfigSchema.test.ts`, after the `v5SchemaSuites.ts` import (and after F1's `v6SchemaSuites.ts` import if present):

```ts
import "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test/v7SchemaSuites.ts";
```

- [ ] **Step 3: Run and see them fail.**

```bash
pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema
```

Expected: FAIL. `expected 6 to be 7`, the round-trip fails because the version 6 schema rejects `spatialFilter`, and Task 1's `v4SchemaSuites.ts` buffer expectations still fail on `distanceUnit`.

- [ ] **Step 4: Write the version 7 schema.** First, in F1's `AvaMapConfigV6Schema.ts`, replace the `AvaMapConfigV6LayerSchema` definition with named, exported variants (same schemas, now reusable):

```ts
/** Version 6 layer with full point, line, and polygon symbology. */
export const V6StandardLayerSchema = V5StandardLayerSchema.extend({
  symbology: V6SymbologySchema,
}).strict();

/** Version 6 layer restricted to aggregate-only fill paint. */
export const V6AggregateOnlyLayerSchema = V5AggregateOnlyLayerSchema.extend({
  symbology: V6FillSymbologySchema,
}).strict();

/** Version 6 layer: graduated colors carry one optional label per class. */
export const AvaMapConfigV6LayerSchema = z.union([
  V6StandardLayerSchema,
  V6AggregateOnlyLayerSchema,
]);
```

Then create `AvaMapConfigV7Schema.ts`:

```ts
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers.ts";
import {
  V3AreaGeoBindingSchema,
  V3GeoBindingSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import {
  AvaMapConfigV6Schema,
  V6AggregateOnlyLayerSchema,
  V6StandardLayerSchema,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts";
import { BUFFER_DISTANCE_UNITS } from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";

/** Buffer rings that remember their typed unit and an optional ring label. */
export const V7BufferOfLayerBindingSchema = z.strictObject({
  type: z.literal("bufferOfLayer"),
  layerId: uuidType<"MapLayer">(),
  distanceMeters: z.number().min(100).max(1_000_000),
  distanceUnit: z.enum(BUFFER_DISTANCE_UNITS),
  labelColumn: uuidType<"QueryColumn">().optional(),
  dissolve: z.boolean(),
});

const V7GeoBindingSchema = z.union([
  V3GeoBindingSchema,
  V7BufferOfLayerBindingSchema,
]);

const V7AreaGeoBindingSchema = z.union([
  V3AreaGeoBindingSchema,
  V7BufferOfLayerBindingSchema,
]);

/** Another layer whose polygons a layer's features must intersect. */
const SpatialFilterSchema = z.strictObject({
  layerId: uuidType<"MapLayer">(),
});

const V7StandardLayerSchema = V6StandardLayerSchema.extend({
  geoBinding: V7GeoBindingSchema.optional(),
  spatialFilter: SpatialFilterSchema.optional(),
}).strict();

const V7AggregateOnlyLayerSchema = V6AggregateOnlyLayerSchema.extend({
  geoBinding: V7AreaGeoBindingSchema.optional(),
  spatialFilter: SpatialFilterSchema.optional(),
}).strict();

/** Version 7 layer: standard paint or aggregate-only fill. */
export const AvaMapConfigV7LayerSchema = z.union([
  V7StandardLayerSchema,
  V7AggregateOnlyLayerSchema,
]);

/** Version 7 persisted map configuration. */
export const AvaMapConfigV7Schema = AvaMapConfigV6Schema.extend({
  version: z.literal(7),
  layers: z.array(AvaMapConfigV7LayerSchema).readonly(),
}).strict();
```

- [ ] **Step 5: Add the migration step.** In `migrateAvaMapConfig.ts`:
  1. Import `AvaMapConfigV6Schema` (if F1 did not already) and `AvaMapConfigV7Schema` from their files.
  2. Add `type ConfigV6 = z.infer<typeof AvaMapConfigV6Schema>;` beside the other aliases, and `type ConfigV5 = z.infer<typeof AvaMapConfigV5Schema>;` if F1 did not add it.
  3. Change F1's `_migrateVersion5` to return `ConfigV6` instead of `AvaMapConfigRead`: replace `): AvaMapConfigRead {` on that function with `): ConfigV6 {`, and delete its trailing `as AvaMapConfigRead` cast and the cast comment above it.
  4. Add, above the exported object:

```ts
/** Adds the version 7 buffer fields: meters as the typed unit, no ring label. */
function _migrateVersion6GeoBinding(
  binding: ConfigV6["layers"][number]["geoBinding"],
): unknown {
  return binding?.type === "bufferOfLayer"
    ? { ...binding, distanceUnit: "m", labelColumn: undefined }
    : binding;
}

/** Migrates a valid version 6 config into the current persisted shape. */
function _migrateVersion6(config: ConfigV6): AvaMapConfigRead {
  return AvaMapConfigV7Schema.parse({
    ...config,
    version: 7,
    layers: config.layers.map((layer) => {
      return {
        ...layer,
        geoBinding: _migrateVersion6GeoBinding(layer.geoBinding),
        spatialFilter: undefined,
      };
    }),
    // The cast bridges `PopupConfig.action`, a required `| undefined` field
    // on `MapLayer.T` that `PopupSchema` still infers as an optional key.
  }) as AvaMapConfigRead;
}
```

  5. Replace the exported object with:

```ts
/** Migrates a parsed older config into the current persisted shape. */
export const migrateAvaMapConfig = {
  /** Migrates a valid version 1 config into the current representation. */
  fromV1: (config: ConfigV1): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV2(_migrateVersion1(config));
  },

  /** Migrates a valid version 2 config into the current representation. */
  fromV2: (config: ConfigV2): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV3(_migrateVersion2(config));
  },

  /** Migrates a valid version 3 config into the current representation. */
  fromV3: (config: ConfigV3): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV4(_migrateVersion3(config));
  },

  /** Migrates a valid version 4 config into the current representation. */
  fromV4: (config: ConfigV4): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV5(_migrateVersion4(config));
  },

  /** Migrates a valid version 5 config into the current representation. */
  fromV5: (config: ConfigV5): AvaMapConfigRead => {
    return migrateAvaMapConfig.fromV6(_migrateVersion5(config));
  },

  /** Migrates a valid version 6 config into the current representation. */
  fromV6: _migrateVersion6,
};
```

  This requires `_migrateVersion4` to return `ConfigV5` (F1 made that change when it added version 6; if it still returns `AvaMapConfigRead`, change it to `ConfigV5` and drop its cast).

- [ ] **Step 6: Parse version 7 and check cycles.** Replace `AvaMapConfigSchema.ts` with:

```ts
import { z } from "zod";
import { AvaMapConfigV1Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV1Schema.ts";
import { AvaMapConfigV2Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV2Schema.ts";
import { AvaMapConfigV3Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV3Schema.ts";
import { AvaMapConfigV4Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts";
import { AvaMapConfigV5Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV5Schema.ts";
import { AvaMapConfigV6Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV6Schema.ts";
import { AvaMapConfigV7Schema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV7Schema.ts";
import { migrateAvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts";
import { hasBufferCycle } from "$/models/AvaMap/AvaMapConfig/hasBufferCycle.ts";
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { Json } from "$/types/database.types.ts";
// eslint-disable-next-line no-restricted-imports
import type { AvaMapConfigRead } from "../AvaMapConfig.types.ts";

function _assertBufferInvariants(layers: readonly MapLayer.T[]): void {
  const hasCycle = layers.some((layer) => {
    return (
      layer.geoBinding?.type === "bufferOfLayer" &&
      hasBufferCycle(layers, layer.id)
    );
  });
  if (hasCycle) {
    throw new Error("Buffer layer chain contains a cycle");
  }
}

function _assertSpatialFilterInvariants(layers: readonly MapLayer.T[]): void {
  const hasCycle = layers.some((layer) => {
    return (
      layer.spatialFilter !== undefined &&
      hasSpatialFilterCycle(layers, layer.id)
    );
  });
  if (hasCycle) {
    throw new Error("Spatial filter chain contains a cycle");
  }
}

function _parseCurrentConfig(json: unknown): AvaMapConfigRead {
  // The cast bridges `PopupConfig.action`, a required `| undefined` field on
  // `MapLayer.T` that `PopupSchema` still infers as an optional key.
  const parsed = AvaMapConfigV7Schema.parse(json) as AvaMapConfigRead;
  return {
    ...parsed,
    aoi: parsed.aoi,
    timeRange: parsed.timeRange,
  };
}

/** Validates and migrates a raw JSON value, whatever its persisted version. */
function _parseAnyVersion(json: unknown): AvaMapConfigRead {
  const version = z
    .looseObject({
      __type: z.literal("AvaMapConfig"),
      version: z.number().int(),
    })
    .parse(json).version;
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
  if (version === 5) {
    return migrateAvaMapConfig.fromV5(AvaMapConfigV5Schema.parse(json));
  }
  if (version === 6) {
    return migrateAvaMapConfig.fromV6(AvaMapConfigV6Schema.parse(json));
  }
  return _parseCurrentConfig(json);
}

/** Reads and writes the persisted JSON representation of a map config. */
export const AvaMapConfigSchema = {
  /** The Zod schema used to validate current persisted map configuration. */
  schema: AvaMapConfigV7Schema,

  /**
   * Validates and migrates a raw JSON value to the current config shape. The
   * buffer-cycle and spatial-filter-cycle invariants are checked once here,
   * after migration, so a cycle persisted under any past version is rejected
   * exactly like one written under the current version.
   */
  fromJson: (json: unknown): AvaMapConfigRead => {
    const config = _parseAnyVersion(json);
    _assertBufferInvariants(config.layers);
    _assertSpatialFilterInvariants(config.layers);
    return config;
  },

  /** Serializes a current map config into plain JSON for persistence. */
  toJson: (config: AvaMapConfigRead): Json => {
    return JSON.parse(JSON.stringify(AvaMapConfigV7Schema.parse(config)));
  },
};
```

  Then set the version literal to 7 in `AvaMapConfig.types.ts` (`Model.Versioned<"AvaMapConfig", 7, AvaMapConfigBody>`) and in `AvaMapConfigModule.makeEmpty` (`version: 7,`).

- [ ] **Step 7: Update current-version assertions.**

```bash
grep -rn "toBe(6)\|version: 6\b" shared/models/AvaMap/AvaMapConfig --include=*.ts
```

In every hit that asserts the *current* version (for example `AvaMapConfigModule.test.ts` "starts with no layers" and the `parsed.version` checks in `AvaMapConfigSchema.test.ts`, `v4SchemaSuites.ts`, `v5SchemaSuites.ts`, and F1's `v6SchemaSuites.ts`), change 6 to 7 and rename any test title that says "version 6 maps" to "version 7 maps". Leave fixtures that build version 6 JSON on purpose (`createVersion6BufferJson`) alone.

- [ ] **Step 8: Run and see them pass.**

```bash
pnpm vitest run shared/models/AvaMap
pnpm tsc -b --force
pnpm type-check:deno
```

Expected: PASS, including Task 1's `v4SchemaSuites.ts` expectations. Both type checks exit 0.

- [ ] **Step 9: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add shared/models/AvaMap/AvaMapConfig
git commit -m "feat(gis): add AvaMapConfig v7 with spatial filters and buffer units"
```

---

## Task 5: Config updaters: clear dangling filters, richer buffer insert

**Files:**
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts:147-157`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/overlayConfigUpdaters/overlayConfigUpdaters.ts:47-69, 191-219`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/overlayConfigUpdaters/overlayConfigUpdaters.test.ts`

- [ ] **Step 1: Write the failing tests.** In `AvaMapConfigModule.test.ts`, inside `describe("layer operations", ...)`, add:

```ts
  it("clears a spatial filter that named the removed layer", () => {
    const area = MapLayer.createArea("Buffer of Sites");
    const schools = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: area.id },
    };
    const config = { ...AvaMapConfig.makeEmpty(), layers: [area, schools] };

    const nextConfig = AvaMapConfig.withLayerRemoved({
      config,
      layerId: area.id,
    });

    expect(nextConfig.layers[0]?.spatialFilter).toBeUndefined();
  });
```

In `overlayConfigUpdaters.test.ts`, inside `describe("withBufferLayerInserted", ...)`, add:

```ts
  it("keeps the typed unit, the ring label, and the requested id", () => {
    const source = _makePolygonLayer();
    const labelColumn = uuid<QueryColumn.Id>();
    const bufferLayerId = uuid<MapLayer.Id>();
    const nextConfig = AvaMapConfig.withBufferLayerInserted({
      config: AvaMapConfig.withLayerAdded({
        config: AvaMapConfig.makeEmpty(),
        layer: source,
      }),
      sourceLayerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn,
      dissolve: false,
      name: "Buffer of Cases",
      bufferLayerId,
    });
    const buffer = nextConfig.layers[1];

    expect(buffer?.id).toBe(bufferLayerId);
    expect(buffer?.geoBinding).toMatchObject({
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn,
    });
  });
```

Change `import { QueryColumn } from ...` in that test file to a type import if the linter asks; it is already imported.

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule
```

Expected: FAIL. The removal test receives `{ layerId: ... }`, and the new buffer test fails with `expected <uuid> to be <bufferLayerId>` because the options are not read yet (TypeScript also flags the unknown keys; Vitest still runs).

- [ ] **Step 3: Implement.** In `AvaMapConfigModule.ts`, replace `withLayerRemoved` with:

```ts
  /**
   * Removes a layer by id and clears any spatial filter that named it, so no
   * layer keeps filtering by a layer that no longer exists. Unknown ids leave
   * the config untouched.
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
    };
  },
```

In `overlayConfigUpdaters.ts`, add `import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";`, then replace `_makeBufferLayer` with:

```ts
/** A new fill layer bound as a buffer of `sourceLayer`. */
function _makeBufferLayer(
  options: Readonly<{
    name: string;
    sourceLayer: MapLayer.T;
    distanceMeters: number;
    distanceUnit: MapLayer.BufferDistanceUnit;
    labelColumn: QueryColumn.Id | undefined;
    dissolve: boolean;
    bufferLayerId: MapLayer.Id | undefined;
  }>,
): MapLayer.T {
  const area = MapLayer.createArea(options.name);
  return MapLayer.withSensitivity(
    {
      ...area,
      id: options.bufferLayerId ?? area.id,
      geoBinding: {
        type: "bufferOfLayer",
        layerId: options.sourceLayer.id,
        distanceMeters: _clampBufferDistanceMeters(options.distanceMeters),
        distanceUnit: options.distanceUnit,
        labelColumn: options.labelColumn,
        dissolve: options.dissolve,
      },
    },
    options.sourceLayer.sensitivity,
  );
}
```

and replace `withBufferLayerInserted` with:

```ts
  /**
   * Inserts a buffer layer immediately above the source, copying sensitivity.
   * @param distanceUnit The unit the author typed, kept for display. Meters
   * when omitted.
   * @param labelColumn A source column each ring carries, such as a site name.
   * @param bufferLayerId An id the caller chose, so it can act on the new
   * buffer straight away. A fresh id when omitted.
   * @throws When the source is missing or has no geo binding.
   */
  withBufferLayerInserted: (
    options: Readonly<{
      config: AvaMapConfigRead;
      sourceLayerId: MapLayer.Id;
      distanceMeters: number;
      distanceUnit?: MapLayer.BufferDistanceUnit;
      labelColumn?: QueryColumn.Id;
      dissolve: boolean;
      name: string;
      bufferLayerId?: MapLayer.Id;
    }>,
  ): AvaMapConfigRead => {
    const { config, sourceLayerId, distanceUnit = "m" } = options;
    const sourceIndex = config.layers.findIndex(propEq("id", sourceLayerId));
    const sourceLayer = config.layers[sourceIndex];
    if (!sourceLayer?.geoBinding) {
      throw new Error("Cannot insert a buffer of a missing or unbound layer");
    }
    const buffer = _makeBufferLayer({
      name: options.name,
      sourceLayer,
      distanceMeters: options.distanceMeters,
      distanceUnit,
      labelColumn: options.labelColumn,
      dissolve: options.dissolve,
      bufferLayerId: options.bufferLayerId,
    });
    const nextLayers = [...config.layers];
    nextLayers.splice(sourceIndex + 1, 0, buffer);
    const annotationsZIndex =
      config.annotationsZIndex > sourceIndex
        ? config.annotationsZIndex + 1
        : config.annotationsZIndex;
    return { ...config, layers: nextLayers, annotationsZIndex };
  },
```


- [ ] **Step 4: Run and see them pass.** Same command as Step 2. Expected: PASS.

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule
git commit -m "feat(gis): clear dangling spatial filters and insert labelled buffers"
```

---
## Task 6: Feature source SQL helpers

One place builds the `json_each` features CTE (the pattern `compileBufferOfLayerQuery` already uses for its source), the `filter_geoms` predicate, and the wrapper that keeps an envelope's features inside a filter.

**Files:**
- Create: `src/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers.executed.test.ts`

- [ ] **Step 1: Write the failing executed test.**

```ts
/**
 * Row-level tests for the feature-source SQL helpers, run against a real
 * in-memory DuckDB with the spatial extension. Executing is the point: the
 * helpers nest one compiled query inside another, and only real rows show
 * that the features read back, the filter keeps the right ones, and the
 * envelope keeps its diagnostics.
 */
import { describe, expect, it } from "vitest";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeJsonPointerFromPropertyName,
  makeSpatialFilteredEnvelopeSql,
} from "./FeatureSourceSqlHelpers";

/** A one-row envelope literal shaped like a compiled layer query's output. */
function _makeEnvelopeSql(features: readonly GeoJSON.Feature[]): string {
  const collection = JSON.stringify({ type: "FeatureCollection", features });
  return `SELECT json('${collection}') AS "__avandar_feature_collection",
    json_object('sourceCount', ${features.length}) AS "__avandar_diagnostics"`;
}

const _POINTS_ENVELOPE_SQL = _makeEnvelopeSql([
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0.5, 0.5] },
    properties: { name: "inside" },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [5, 5] },
    properties: { name: "outside" },
  },
]);

const _SQUARE_ENVELOPE_SQL = _makeEnvelopeSql([
  {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: {},
  },
]);

/** Parses a DuckDB JSON cell, which the Node client returns as text. */
function _parseJsonCell(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

async function _runFilteredEnvelope(): Promise<Record<string, unknown>> {
  return withDuckDb(async (connection) => {
    await connection.run("INSTALL spatial; LOAD spatial;");
    const result = await connection.runAndReadAll(
      makeSpatialFilteredEnvelopeSql({
        envelopeSql: _POINTS_ENVELOPE_SQL,
        filterEnvelopeSql: _SQUARE_ENVELOPE_SQL,
      }),
    );
    return result.getRowObjects()[0] ?? {};
  });
}

describe("FeatureSourceSqlHelpers executed", () => {
  it("keeps only the features inside the filter polygons", async () => {
    const row = await _runFilteredEnvelope();
    const collection = _parseJsonCell(
      row.__avandar_feature_collection,
    ) as GeoJSON.FeatureCollection;

    expect(
      collection.features.map((feature) => {
        return feature.properties?.name;
      }),
    ).toEqual(["inside"]);
  });

  it("keeps the filtered layer's diagnostics", async () => {
    const row = await _runFilteredEnvelope();

    expect(_parseJsonCell(row.__avandar_diagnostics)).toEqual({
      sourceCount: 2,
    });
  });

  it("reads latitude and longitude rows as points carrying their columns", async () => {
    const rows = await withDuckDb(async (connection) => {
      await connection.run("INSTALL spatial; LOAD spatial;");
      await connection.run(
        `CREATE TABLE sites AS SELECT * FROM (VALUES
          ('Union Square', '40.7359', '-73.9906')
        ) AS t(site_name, latitude, longitude)`,
      );
      const cteSql = makeFeaturesCteSqlFromFeatureSource({
        cteName: "site_features",
        source: {
          type: "rows",
          sql: "SELECT * FROM sites",
          latitudeColumnName: "latitude",
          longitudeColumnName: "longitude",
        },
      });
      const result = await connection.runAndReadAll(
        `WITH ${cteSql}
        SELECT json_extract_string(properties, '/site_name') AS site_name,
          ST_X(geom) AS longitude, ST_Y(geom) AS latitude
        FROM site_features`,
      );
      return result.getRowObjects();
    });

    expect(rows).toEqual([
      { site_name: "Union Square", longitude: -73.9906, latitude: 40.7359 },
    ]);
  });

  it("reads a property whose name holds a slash and a tilde", async () => {
    const value = await withDuckDb(async (connection) => {
      const result = await connection.runAndReadAll(
        `SELECT json_extract_string('{"a/b~c":"found"}', '${makeJsonPointerFromPropertyName("a/b~c")}') AS value`,
      );
      return result.getRowObjects()[0]?.value;
    });

    expect(value).toBe("found");
  });
});
```

- [ ] **Step 2: Run and see it fail.**

```bash
pnpm test:executed src/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers
```

Expected: FAIL with `Failed to resolve import "./FeatureSourceSqlHelpers"`.

- [ ] **Step 3: Implement.**

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { MapLayerSpatialQueryColumns } from "../MapLayerSpatialQuery.constants";

/**
 * Where a layer's features come from when another query reads them: a
 * compiled one-row feature envelope, or the filtered rows of a latitude and
 * longitude layer. For example, a buffer reads its source this way, and so
 * does a feature list.
 */
export type MapLayerFeatureSource =
  | { type: "envelope"; sql: string }
  | {
      type: "rows";
      sql: string;
      latitudeColumnName: string;
      longitudeColumnName: string;
    };

/**
 * A JSON pointer (`/name`) that reads one property by its exact name, with
 * `~` and `/` escaped. Use it with `json_extract_string` for column names
 * that a JSONPath would misread, such as a name holding a dot or a quote.
 */
export function makeJsonPointerFromPropertyName(propertyName: string): string {
  return `/${propertyName.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

/**
 * CTE text that reads a feature source into `cteName`, one row per feature
 * with a JSON `properties` column and a WGS 84 `geom` column. A rows source
 * keeps every column of each row in `properties`.
 */
export function makeFeaturesCteSqlFromFeatureSource(
  options: Readonly<{ cteName: string; source: MapLayerFeatureSource }>,
): string {
  const { cteName, source } = options;
  if (source.type === "rows") {
    const longitude = quoteSqlIdentifier(source.longitudeColumnName);
    const latitude = quoteSqlIdentifier(source.latitudeColumnName);
    return `${cteName}_rows AS (
  ${source.sql}
),
${cteName} AS (
  SELECT to_json(${cteName}_rows) AS properties,
    TRY(ST_Point(TRY_CAST(${longitude} AS DOUBLE), TRY_CAST(${latitude} AS DOUBLE))) AS geom
  FROM ${cteName}_rows
)`;
  }
  const featureCollection = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  return `${cteName}_envelope AS (
  ${source.sql}
),
${cteName} AS (
  SELECT json_extract(feature.value, '$.properties') AS properties,
    ST_GeomFromGeoJSON(json_extract_string(feature.value, '$.geometry')) AS geom
  FROM ${cteName}_envelope,
    json_each(json_extract(${cteName}_envelope.${featureCollection}, '$.features')) AS feature
)`;
}

/**
 * True for a geometry that intersects any polygon in a `filter_geoms` CTE
 * built by {@link makeFeaturesCteSqlFromFeatureSource}. Use it as the WHERE
 * predicate of a spatially filtered query.
 */
export function makeSpatialFilterPredicateSql(geometrySql: string): string {
  return `EXISTS (SELECT 1 FROM filter_geoms WHERE filter_geoms.geom IS NOT NULL AND ST_Intersects(${geometrySql}, filter_geoms.geom))`;
}

/**
 * Wraps a compiled one-row envelope so it keeps only the features that
 * intersect the filtering layer's features, with its diagnostics unchanged.
 * Use it to apply a layer's spatial filter to any spatial compiler's output.
 */
export function makeSpatialFilteredEnvelopeSql(
  options: Readonly<{ envelopeSql: string; filterEnvelopeSql: string }>,
): string {
  const featureCollection = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnostics = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  return `WITH layer_envelope AS (
  ${options.envelopeSql}
),
${makeFeaturesCteSqlFromFeatureSource({ cteName: "filter_geoms", source: { type: "envelope", sql: options.filterEnvelopeSql } })},
kept_features AS (
  SELECT feature.value AS feature
  FROM layer_envelope,
    json_each(json_extract(layer_envelope.${featureCollection}, '$.features')) AS feature
  WHERE ${makeSpatialFilterPredicateSql("ST_GeomFromGeoJSON(json_extract_string(feature.value, '$.geometry'))")}
)
SELECT json_object('type', 'FeatureCollection',
  'features', coalesce((SELECT json_group_array(feature) FROM kept_features), json('[]')))
  AS ${featureCollection},
  layer_envelope.${diagnostics} AS ${diagnostics}
FROM layer_envelope`;
}
```

- [ ] **Step 4: Run and see it pass.** Same command as Step 2. Expected: PASS (4 tests).

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers
git commit -m "feat(gis): add feature source and spatial filter SQL helpers"
```

---

## Task 7: Metadata resolution outside the map render

`useMapLayersData` privately walks a buffer to its leaf source before resolving column names. The spatial filter and the feature list need the same thing, so it moves to the client.

**Files:**
- Create: `src/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer/getCompileMetadataFromMapLayer.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer/getCompileMetadataFromMapLayer.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createGeometryLayerFixture } from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { getCompileMetadataFromMapLayer } from "./getCompileMetadataFromMapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea("Buffer"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

describe("getCompileMetadataFromMapLayer", () => {
  it("resolves a buffer against its source layer's columns", () => {
    const { layer: source } = createGeometryLayerFixture();
    const buffer = _makeBufferOf(source);
    const labelColumn = source.source.queryColumns[1]!;

    const metadata = getCompileMetadataFromMapLayer({
      layer: buffer,
      stack: [source, buffer],
      datasets: [],
      datasetColumns: [],
    });

    expect(metadata.sourceColumnNames.get(labelColumn.id)).toBe("label");
  });

  it("throws when a bound column is no longer in the layer's query", () => {
    const { layer } = createGeometryLayerFixture();
    const unbound: MapLayer.T = {
      ...layer,
      geoBinding: {
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      },
    };

    expect(() => {
      return getCompileMetadataFromMapLayer({
        layer: unbound,
        stack: [unbound],
        datasets: [],
        datasetColumns: [],
      });
    }).toThrow("Map geometry requires rebinding: missingSourceColumn");
  });
});
```

- [ ] **Step 2: Run and see it fail.**

```bash
pnpm vitest run src/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer
```

Expected: FAIL with `Failed to resolve import "./getCompileMetadataFromMapLayer"`.

- [ ] **Step 3: Implement.**

```ts
import { makeIdLookupMap } from "@avandar/utils";
import { getResolvedMapLayerMetadata } from "../getResolvedMapLayerMetadata/getResolvedMapLayerMetadata";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ResolvedMapLayerMetadata } from "../MapLayerSpatialQuery.types";

/** Walks bufferOfLayer links to the layer whose columns a compile reads. */
function _getLeafSpatialSource(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): MapLayer.T {
  const byId = makeIdLookupMap(stack);
  const seen = new Set<MapLayer.Id>();
  let current = layer;
  while (current.geoBinding?.type === "bufferOfLayer") {
    if (seen.has(current.id)) {
      return current;
    }
    seen.add(current.id);
    const source = byId.get(current.geoBinding.layerId);
    if (!source) {
      return current;
    }
    current = source;
  }
  return current;
}

/**
 * The column names a spatial compile of `layer` reads, resolved against the
 * workspace's datasets. A buffer resolves against the layer it buffers. Use
 * it wherever a layer is compiled, for example to draw it, to filter
 * another layer by it, or to list its features.
 * @throws When a saved reference must be rebound before the layer can run.
 */
export function getCompileMetadataFromMapLayer(
  options: Readonly<{
    layer: MapLayer.T;
    stack: readonly MapLayer.T[];
    datasets: readonly Dataset.T[];
    datasetColumns: readonly DatasetColumn.T[];
  }>,
): ResolvedMapLayerMetadata {
  const metadata = getResolvedMapLayerMetadata({
    layer: _getLeafSpatialSource(options.layer, options.stack),
    datasets: options.datasets,
    datasetColumns: options.datasetColumns,
  });
  if (metadata.type === "rebindRequired") {
    throw new Error(`Map geometry requires rebinding: ${metadata.reason}`);
  }
  return metadata;
}
```

- [ ] **Step 4: Run and see it pass.** Same command as Step 2. Expected: PASS.

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer
git commit -m "refactor(gis): resolve compile metadata from a map layer in the client"
```

---

## Task 8: Compile a layer with its spatial filter

**Files:**
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types.ts`
- Create: `src/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery.test.ts`

- [ ] **Step 1: Add the options type.** Append to `compileMapLayerSpatialQuery.types.ts`:

```ts
/**
 * Compile inputs for a layer whose spatial filter names another layer. That
 * layer compiles with its own column metadata, so the caller supplies a
 * resolver instead of one layer's metadata. For example, the map render and
 * a feature list both compile through it.
 */
export type SpatialFilterCompileOptions = Omit<CompileOptions, "metadata"> & {
  resolveMetadata: (layer: MapLayer.T) => ResolvedMapLayerMetadata;
};
```

- [ ] **Step 2: Write the failing test.**

```ts
/**
 * Spatial filter compilation over every spatial compiler's output.
 */
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import {
  createGeometryLayerFixture,
  createGridBinLayerFixture,
  SAMPLE_AOI,
} from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { compileSpatialFilteredQuery } from "./compileSpatialFilteredQuery";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { SpatialFilterCompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { ResolvedMapLayerMetadata } from "../MapLayerSpatialQuery.types";

type LayerFixture = { layer: MapLayer.T; metadata: ResolvedMapLayerMetadata };

function _makeBoundary(): NonNullable<ResolvedMapLayerMetadata["boundary"]> {
  return {
    datasetId: uuid<Dataset.Id>(),
    datasetName: "Boundaries",
    geometryColumnName: "shape",
    geometryEncoding: "wkt",
    keyColumnName: "pcode",
    displayNameColumnName: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

function _makeBoundaryRef(
  boundary: NonNullable<ResolvedMapLayerMetadata["boundary"]>,
): MapLayer.BoundarySource {
  return {
    datasetId: boundary.datasetId,
    geometryColumnId: uuid<DatasetColumn.Id>(),
    geometryEncoding: "wkt",
    keyColumnId: uuid<DatasetColumn.Id>(),
    displayNameColumnId: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

function _createPointFixture(): LayerFixture {
  const fixture = createGeometryLayerFixture();
  const binding = fixture.layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    throw new Error("The fixture binds a geometry column");
  }
  return {
    layer: {
      ...fixture.layer,
      id: uuid<MapLayer.Id>(),
      geoBinding: { ...binding, family: "point", simplification: undefined },
    },
    metadata: fixture.metadata,
  };
}

function _createPointAggregationFixture(): LayerFixture {
  const fixture = createGeometryLayerFixture();
  const boundary = _makeBoundary();
  const layer = {
    ...fixture.layer,
    geoBinding: {
      type: "aggregatePointsToBoundaries" as const,
      points: {
        type: "geometryColumn" as const,
        column: fixture.layer.source.queryColumns[0]!.id,
        encoding: "wkt" as const,
        family: "point" as const,
        simplification: undefined,
        sourceCrs: undefined,
      },
      aggregation: {
        operation: "count" as const,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
      boundary: _makeBoundaryRef(boundary),
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
  return { layer, metadata: { ...fixture.metadata, boundary } };
}

function _createBoundaryJoinFixture(): LayerFixture {
  const fixture = createGeometryLayerFixture();
  const boundary = _makeBoundary();
  const layer = {
    ...fixture.layer,
    geoBinding: {
      type: "joinToBoundaries" as const,
      dataKeyColumn: fixture.layer.source.queryColumns[1]!.id,
      boundary: _makeBoundaryRef(boundary),
      matching: "exact" as const,
      aggregation: {
        operation: "count" as const,
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
    symbology: MapLayer.createDefaultFillSymbology(),
  } as MapLayer.T;
  return { layer, metadata: { ...fixture.metadata, boundary } };
}

/** Compile options over `fixtures`, each layer resolving its own metadata. */
function _makeOptions(
  target: MapLayer.T,
  fixtures: readonly LayerFixture[],
  overlay: SpatialFilterCompileOptions["overlay"] = {
    aoi: undefined,
    timeRange: undefined,
  },
): SpatialFilterCompileOptions {
  return {
    layer: target,
    stack: fixtures.map((fixture) => {
      return fixture.layer.id === target.id ? target : fixture.layer;
    }),
    overlay,
    zoomBand: 3,
    simplificationReferenceLatitude: 0,
    resolveMetadata: (layer) => {
      const match = fixtures.find((fixture) => {
        return fixture.layer.id === layer.id;
      });
      if (!match) {
        throw new Error("No metadata for this layer");
      }
      return match.metadata;
    },
  };
}

const COMPILER_FIXTURES = [
  { name: "geometry column", create: _createPointFixture },
  {
    name: "grid bin",
    create: () => {
      return createGridBinLayerFixture({ grid: "hex" });
    },
  },
  { name: "point aggregation", create: _createPointAggregationFixture },
  { name: "boundary join", create: _createBoundaryJoinFixture },
] as const;

describe("compileSpatialFilteredQuery", () => {
  it.each(COMPILER_FIXTURES)(
    "leaves an unfiltered $name layer's SQL unchanged",
    ({ create }) => {
      const target = create();
      const options = _makeOptions(target.layer, [target]);

      expect(compileSpatialFilteredQuery(options).rawSql).toBe(
        compileMapLayerSpatialQuery({ ...options, metadata: target.metadata })
          .rawSql,
      );
    },
  );

  it.each(COMPILER_FIXTURES)(
    "keeps only $name features that intersect the filter layer",
    ({ create }) => {
      const filter = createGeometryLayerFixture();
      const target = create();
      const filtered = {
        ...target.layer,
        spatialFilter: { layerId: filter.layer.id },
      };
      const { rawSql } = compileSpatialFilteredQuery(
        _makeOptions(filtered, [filter, target]),
      );

      expect(rawSql).toContain("filter_geoms AS (");
      expect(rawSql).toContain("kept_features AS (");
      expect(rawSql).toContain("EXISTS (SELECT 1 FROM filter_geoms");
      expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(rawSql).kind).toBe(
        "read",
      );
    },
  );

  it("compiles the filter layer at full detail whatever the map zoom", () => {
    const filter = createGeometryLayerFixture();
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: filter.layer.id },
    };
    const options = _makeOptions(filtered, [filter, target]);
    const fullDetailFilterSql = compileMapLayerSpatialQuery({
      ...options,
      layer: filter.layer,
      metadata: filter.metadata,
      zoomBand: 24,
    }).rawSql;

    expect(compileSpatialFilteredQuery(options).rawSql).toContain(
      fullDetailFilterSql,
    );
  });

  it("applies the area filter and the spatial filter together", () => {
    const filter = createGeometryLayerFixture();
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: filter.layer.id },
    };
    const { rawSql } = compileSpatialFilteredQuery(
      _makeOptions(filtered, [filter, target], {
        aoi: SAMPLE_AOI,
        timeRange: undefined,
      }),
    );

    expect(rawSql).toContain(JSON.stringify(SAMPLE_AOI));
    expect(rawSql).toContain("kept_features AS (");
  });

  it("refuses a filter layer that is missing", () => {
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: uuid<MapLayer.Id>() },
    };

    expect(() => {
      return compileSpatialFilteredQuery(_makeOptions(filtered, [target]));
    }).toThrow("Spatial filter layer is missing");
  });

  it("refuses a filter layer that does not output polygons", () => {
    const pointFilter = _createPointFixture();
    const target = _createPointFixture();
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: pointFilter.layer.id },
    };

    expect(() => {
      return compileSpatialFilteredQuery(
        _makeOptions(filtered, [pointFilter, target]),
      );
    }).toThrow("Spatial filter layer must output polygons");
  });

  it("refuses a filter layer that depends on the filtered layer", () => {
    const filter = createGeometryLayerFixture();
    const target = _createPointFixture();
    const loopedFilter = {
      ...filter,
      layer: { ...filter.layer, spatialFilter: { layerId: target.layer.id } },
    };
    const filtered = {
      ...target.layer,
      spatialFilter: { layerId: filter.layer.id },
    };

    expect(() => {
      return compileSpatialFilteredQuery(
        _makeOptions(filtered, [loopedFilter, target]),
      );
    }).toThrow("Spatial filter chain contains a cycle");
  });
});
```

- [ ] **Step 3: Run and see it fail.**

```bash
pnpm vitest run src/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery
```

Expected: FAIL with `Failed to resolve import "./compileSpatialFilteredQuery"`.

- [ ] **Step 4: Implement.**

```ts
import { propEq } from "@avandar/utils";
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { makeSpatialFilteredEnvelopeSql } from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import type { SpatialFilterCompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";

/**
 * Zoom band a filtering layer always compiles at. Polygon simplification
 * depends on zoom, so a fixed band keeps which features pass the filter
 * from changing as the map zooms.
 */
const SPATIAL_FILTER_ZOOM_BAND = 24;

/** The layer `options.layer` is filtered by, checked for every invariant. */
function _getSpatialFilterLayer(
  options: Readonly<SpatialFilterCompileOptions>,
): MapLayer.T | undefined {
  const spatialFilter = options.layer.spatialFilter;
  if (!spatialFilter) {
    return undefined;
  }
  const filterLayer = options.stack.find(propEq("id", spatialFilter.layerId));
  if (!filterLayer) {
    throw new Error("Spatial filter layer is missing");
  }
  if (!MapLayer.isAreaGeoBinding(filterLayer.geoBinding)) {
    throw new Error("Spatial filter layer must output polygons");
  }
  if (hasSpatialFilterCycle(options.stack, options.layer.id)) {
    throw new Error("Spatial filter chain contains a cycle");
  }
  return filterLayer;
}

/**
 * The one-row envelope SQL of the layer that `options.layer` is spatially
 * filtered by, or `undefined` when it has no spatial filter. Use it to
 * filter rows that never become an envelope, such as a latitude and
 * longitude layer's rows.
 * @throws When the filtering layer is missing, outputs no polygons, or
 * depends on the filtered layer.
 */
export function compileSpatialFilterEnvelopeSql(
  options: Readonly<SpatialFilterCompileOptions>,
): string | undefined {
  const filterLayer = _getSpatialFilterLayer(options);
  if (!filterLayer) {
    return undefined;
  }
  return compileSpatialFilteredQuery({
    ...options,
    layer: filterLayer,
    zoomBand: SPATIAL_FILTER_ZOOM_BAND,
  }).rawSql;
}

/**
 * Compiles a spatial-binding layer and, when it has a spatial filter, keeps
 * only the output features that intersect the filtering layer's features.
 * The filter wraps every compiler's output the same way, so geometry
 * columns, boundary joins, point aggregations, grid bins, and buffers all
 * honor it. Use it wherever a layer's features are queried.
 */
export function compileSpatialFilteredQuery(
  options: Readonly<SpatialFilterCompileOptions>,
): MapLayerSpatialQueryPlan {
  const plan = compileMapLayerSpatialQuery({
    ...options,
    metadata: options.resolveMetadata(options.layer),
  });
  const filterEnvelopeSql = compileSpatialFilterEnvelopeSql(options);
  if (filterEnvelopeSql === undefined) {
    return plan;
  }
  return {
    ...plan,
    rawSql: makeSpatialFilteredEnvelopeSql({
      envelopeSql: plan.rawSql,
      filterEnvelopeSql,
    }),
  };
}
```

`compileSpatialFilterEnvelopeSql` and `compileSpatialFilteredQuery` call each other; the cycle check in `_getSpatialFilterLayer` bounds the recursion.

- [ ] **Step 5: Run and see it pass.** Same command as Step 3. Expected: PASS. If the boundary join row fails because `compileBoundaryJoinQuery` needs a metadata field the fixture lacks, read the thrown message and add that field to `_createBoundaryJoinFixture`'s metadata; do not drop the row.

- [ ] **Step 6: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types.ts src/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery
git commit -m "feat(gis): compile map layers with their spatial filter"
```

---

## Task 9: Spatial filter on latitude and longitude rows

**Files:**
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql.test.ts`
- Create: `src/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql/compileLatLngLayerSourceSql.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql/compileLatLngLayerSourceSql.test.ts`

- [ ] **Step 1: Write the failing tests.** In `compileLatLngOverlaySql.test.ts`, add `spatialFilterEnvelopeSql: undefined,` to each of the five existing calls, then add:

```ts
  it("keeps only rows whose point falls inside the spatial filter layer", () => {
    const sql = compileLatLngOverlaySql({
      sourceSql: "SELECT * FROM cases",
      layer: latLngLayerWithTime,
      overlay: { aoi: undefined, timeRange: undefined },
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      timeColumnName: undefined,
      spatialFilterEnvelopeSql: "SELECT 1 AS buffer_envelope",
    });

    expect(sql).toContain("filter_geoms_envelope AS (");
    expect(sql).toContain("SELECT 1 AS buffer_envelope");
    expect(sql).toContain(
      'EXISTS (SELECT 1 FROM filter_geoms WHERE filter_geoms.geom IS NOT NULL AND ST_Intersects(ST_Point("longitude", "latitude")',
    );
  });

  it("applies the area filter and the spatial filter together", () => {
    const sql = compileLatLngOverlaySql({
      sourceSql: "SELECT * FROM cases",
      layer: latLngLayerWithTime,
      overlay: { aoi: sampleAoi, timeRange: undefined },
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      timeColumnName: undefined,
      spatialFilterEnvelopeSql: "SELECT 1 AS buffer_envelope",
    });

    expect(sql).toContain("ST_GeomFromGeoJSON(");
    expect(sql).toContain(" AND EXISTS (SELECT 1 FROM filter_geoms");
  });
```

Create `compileLatLngLayerSourceSql.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { createGeometryLayerFixture } from "../compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.fixtures";
import { compileLatLngLayerSourceSql } from "./compileLatLngLayerSourceSql";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** The geometry fixture rebound as latitude and longitude columns. */
function _createLatLngLayer(): MapLayer.T {
  const { layer } = createGeometryLayerFixture();
  const [latitude, longitude] = layer.source.queryColumns;
  return {
    ...layer,
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude!.id,
      longitude: longitude!.id,
    },
  };
}

describe("compileLatLngLayerSourceSql", () => {
  it("returns the layer's rows and the names of its coordinate columns", () => {
    const layer = _createLatLngLayer();

    const source = compileLatLngLayerSourceSql({
      layer,
      overlay: { aoi: undefined, timeRange: undefined },
      spatialFilterEnvelopeSql: undefined,
    });

    expect(source).toEqual({
      type: "rows",
      sql: structuredQueryToSql(layer.source),
      latitudeColumnName: 'shape"; DROP TABLE maps; --',
      longitudeColumnName: "label",
    });
  });

  it("returns nothing when a coordinate column is not in the query", () => {
    const layer: MapLayer.T = {
      ..._createLatLngLayer(),
      geoBinding: {
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      },
    };

    expect(
      compileLatLngLayerSourceSql({
        layer,
        overlay: { aoi: undefined, timeRange: undefined },
        spatialFilterEnvelopeSql: undefined,
      }),
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql src/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql
```

Expected: FAIL. The overlay tests do not find `filter_geoms_envelope AS (`; the new module cannot be resolved.

- [ ] **Step 3: Implement the overlay predicate.** Replace `compileLatLngOverlaySql.ts` with:

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { makeSourceAoiPredicateSql } from "../AoiPredicateSqlHelpers/AoiPredicateSqlHelpers";
import { applyTimePredicateToSourceSql } from "../applyTimePredicateToSourceSql/applyTimePredicateToSourceSql";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeSpatialFilterPredicateSql,
} from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapOverlay } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";

type CompileLatLngOverlayOptions = {
  sourceSql: string;
  layer: MapLayer.T;
  overlay: MapOverlay;
  latitudeColumnName: string;
  longitudeColumnName: string;
  timeColumnName: string | undefined;

  /** Declared type of the time column, which decides how it is compared. */
  timeColumnDataType?: string;

  /** Envelope SQL of the layer's spatial filter layer, when it has one. */
  spatialFilterEnvelopeSql: string | undefined;
};

/** The WHERE predicates the AOI and the spatial filter add to point rows. */
function _getPointPredicates(
  options: Readonly<CompileLatLngOverlayOptions>,
  pointSql: string,
): string[] {
  const aoi = options.layer.applyAoiFilter ? options.overlay.aoi : undefined;
  return [
    ...(aoi ? [makeSourceAoiPredicateSql(pointSql, aoi)] : []),
    ...(options.spatialFilterEnvelopeSql === undefined
      ? []
      : [makeSpatialFilterPredicateSql(pointSql)]),
  ];
}

/**
 * Returns lat/lng source SQL with the map clock, AOI, and spatial filter
 * applied.
 *
 * Always returns real SQL, even when no filter changes the source: a lat/lng
 * map layer must never pass `undefined` raw SQL downstream, since that falls
 * back to structured-query execution, where a large dataset with no filter is
 * silently capped at 100 rows.
 */
export function compileLatLngOverlaySql(
  options: Readonly<CompileLatLngOverlayOptions>,
): string {
  const wrappedSql = applyTimePredicateToSourceSql({
    sourceSql: options.sourceSql,
    timeColumnName: options.timeColumnName,
    timeRange: options.overlay.timeRange,
    timeColumnDataType: options.timeColumnDataType,
  });
  const pointSql = `ST_Point(${quoteSqlIdentifier(options.longitudeColumnName)}, ${quoteSqlIdentifier(options.latitudeColumnName)})`;
  const predicates = _getPointPredicates(options, pointSql);
  if (predicates.length === 0) {
    return wrappedSql;
  }
  const filterCtes =
    options.spatialFilterEnvelopeSql === undefined
      ? ""
      : `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "filter_geoms", source: { type: "envelope", sql: options.spatialFilterEnvelopeSql } })}\n`;
  return `${filterCtes}SELECT * FROM (${wrappedSql}) AS overlay_source WHERE ${predicates.join(" AND ")}`;
}
```

- [ ] **Step 4: Implement the rows source.** Create `compileLatLngLayerSourceSql.ts`:

```ts
import { propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { compileLatLngOverlaySql } from "../compileLatLngOverlaySql/compileLatLngOverlaySql";
import type { MapOverlay } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerFeatureSource } from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

/**
 * A latitude and longitude layer's rows, with the map clock, AOI, and
 * spatial filter applied, plus the names of its coordinate columns. Use it
 * to read such a layer's points from SQL, for example to draw them, to
 * buffer them, or to list them. `undefined` when the layer's source query or
 * coordinate columns are incomplete.
 */
export function compileLatLngLayerSourceSql(
  options: Readonly<{
    layer: MapLayer.T;
    overlay: MapOverlay;
    spatialFilterEnvelopeSql: string | undefined;
  }>,
): Extract<MapLayerFeatureSource, { type: "rows" }> | undefined {
  const { layer } = options;
  const coordinates = MapLayer.toGeoBinding(layer);
  const sourceSql = structuredQueryToSql(layer.source);
  if (!coordinates || !sourceSql) {
    return undefined;
  }
  const timeColumn = layer.timeColumn
    ? layer.source.queryColumns.find(propEq("id", layer.timeColumn))
    : undefined;
  return {
    type: "rows",
    sql: compileLatLngOverlaySql({
      sourceSql,
      layer,
      overlay: options.overlay,
      latitudeColumnName: coordinates.latitudeColumnName,
      longitudeColumnName: coordinates.longitudeColumnName,
      timeColumnName: timeColumn
        ? QueryColumn.getDerivedColumnName(timeColumn)
        : undefined,
      timeColumnDataType: timeColumn?.baseColumn.dataType,
      spatialFilterEnvelopeSql: options.spatialFilterEnvelopeSql,
    }),
    latitudeColumnName: coordinates.latitudeColumnName,
    longitudeColumnName: coordinates.longitudeColumnName,
  };
}
```

- [ ] **Step 5: Keep the tree compiling.** `compileLatLngOverlaySql` now requires `spatialFilterEnvelopeSql`. In `src/views/GisApp/layers/useMapLayersData/runLatLngLayer.ts`, add `spatialFilterEnvelopeSql: undefined,` to its `compileLatLngOverlaySql({...})` call (Task 11 replaces that call). Then run the Step 2 command and `pnpm tsc -b --force`. Expected: PASS, and `tsc` exits 0.

- [ ] **Step 6: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql src/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql src/views/GisApp/layers/useMapLayersData/runLatLngLayer.ts
git commit -m "feat(gis): apply spatial filters to latitude and longitude layers"
```

---

## Task 10: Buffer latitude and longitude layers, and label rings

**Files:**
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.ts` (whole file)
- Test: `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.test.ts`

- [ ] **Step 1: Write the failing tests.** In `compileBufferOfLayerQuery.test.ts`, replace `_makeBufferLayer` with:

```ts
function _makeBufferLayer(
  source: MapLayer.T,
  options: {
    dissolve?: boolean;
    sensitivity?: MapLayer.T["sensitivity"];
    labelColumn?: QueryColumn.Id;
  } = {},
): MapLayer.T {
  return MapLayer.withSensitivity(
    {
      ...MapLayer.createArea("Buffer"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: source.id,
        distanceMeters: 1000,
        distanceUnit: "m",
        labelColumn: options.labelColumn,
        dissolve: options.dissolve ?? false,
      },
    },
    options.sensitivity ?? source.sensitivity,
  );
}
```

add `import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";`, and add these tests inside the `describe`:

```ts
  it("buffers a latitude and longitude source from its points", () => {
    const { layer: geometrySource, metadata } = createGeometryLayerFixture();
    const [latitude, longitude] = geometrySource.source.queryColumns;
    const latLngSource: MapLayer.T = {
      ...geometrySource,
      geoBinding: {
        type: "latLngColumns",
        latitude: latitude!.id,
        longitude: longitude!.id,
      },
    };
    const bufferLayer = _makeBufferLayer(latLngSource);
    const { rawSql } = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, metadata, [latLngSource, bufferLayer]),
    );

    expect(rawSql).toContain("source_features_rows AS (");
    expect(rawSql).toContain('TRY(ST_Point(TRY_CAST("label" AS DOUBLE)');
    expect(rawSql).toContain("ST_Buffer");
    expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(rawSql).kind).toBe(
      "read",
    );
  });

  it("labels each ring with the source's label column", () => {
    const { layer: polygonSource, metadata } = createGeometryLayerFixture();
    const labelColumn = polygonSource.source.queryColumns[1]!;
    const bufferLayer = _makeBufferLayer(polygonSource, {
      labelColumn: labelColumn.id,
    });
    const plan = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, metadata, [polygonSource, bufferLayer]),
    );

    expect(plan.rawSql).toContain(
      "json_extract_string(properties, '/label') AS label",
    );
    expect(plan.rawSql).toContain("json_object('label', label)");
    expect(plan.sourcePropertyColumnNames).toEqual(["label"]);
  });

  it("drops ring labels when rings are dissolved", () => {
    const { layer: polygonSource, metadata } = createGeometryLayerFixture();
    const bufferLayer = _makeBufferLayer(polygonSource, {
      dissolve: true,
      labelColumn: polygonSource.source.queryColumns[1]!.id,
    });
    const { rawSql } = compileMapLayerSpatialQuery(
      _compileOptions(bufferLayer, metadata, [polygonSource, bufferLayer]),
    );

    expect(rawSql).not.toContain("json_extract_string(properties");
  });
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery
```

Expected: FAIL. The lat/lng test throws `The spatial binding is not supported by this compiler`; the label tests do not find the label SQL.

- [ ] **Step 3: Implement.** Replace `compileBufferOfLayerQuery.ts` with:

```ts
import { propEq } from "@avandar/utils";
import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { hasBufferCycle } from "$/models/AvaMap/AvaMapConfig/hasBufferCycle";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { compileLatLngLayerSourceSql } from "../compileLatLngLayerSourceSql/compileLatLngLayerSourceSql";
import { compileMapLayerSpatialQuery } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { makeSpatialQueryPlan } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQueryHelpers";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeJsonPointerFromPropertyName,
} from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import { makeMetersCrsSql } from "../makeMetersCrsSql";
import { MapLayerSpatialQueryColumns } from "../MapLayerSpatialQuery.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { CompileOptions } from "../compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerFeatureSource } from "../FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import type { MapLayerSpatialQueryPlan } from "../MapLayerSpatialQuery.types";

function _getBufferBinding(layer: MapLayer.T): MapLayer.BufferOfLayerBinding {
  const binding = layer.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    throw new Error("A buffer-of-layer binding is required");
  }
  return binding;
}

function _getSourceLayer(
  stack: readonly MapLayer.T[],
  sourceId: MapLayer.Id,
): MapLayer.T {
  const source = stack.find(propEq("id", sourceId));
  if (!source) {
    throw new Error("Buffer source layer is missing");
  }
  return source;
}

function _assertBufferInvariants(
  options: Readonly<CompileOptions>,
  source: MapLayer.T,
): void {
  if (hasBufferCycle(options.stack, options.layer.id)) {
    throw new Error("Buffer layer chain contains a cycle");
  }
  if (options.layer.sensitivity.mode !== source.sensitivity.mode) {
    throw new Error("Buffer sensitivity must match the source layer");
  }
}

/** The source column each ring carries, or none for dissolved rings. */
function _getLabelColumn(
  source: MapLayer.T,
  binding: MapLayer.BufferOfLayerBinding,
): QueryColumn.T | undefined {
  if (!binding.labelColumn || binding.dissolve) {
    return undefined;
  }
  return source.source.queryColumns.find(propEq("id", binding.labelColumn));
}

/** The buffer source's features, with the label column among its properties. */
function _compileSourceFeatures(
  options: Readonly<CompileOptions>,
  source: MapLayer.T,
  labelColumn: QueryColumn.T | undefined,
): MapLayerFeatureSource {
  if (source.geoBinding?.type === "latLngColumns") {
    const rows = compileLatLngLayerSourceSql({
      layer: source,
      overlay: options.overlay,
      spatialFilterEnvelopeSql: undefined,
    });
    if (!rows) {
      throw new Error("Buffer source coordinates are incomplete");
    }
    return rows;
  }
  const labelledSource: MapLayer.T = labelColumn
    ? { ...source, popup: { ...source.popup, columnIds: [labelColumn.id] } }
    : source;
  return {
    type: "envelope",
    sql: compileMapLayerSpatialQuery({ ...options, layer: labelledSource })
      .rawSql,
  };
}

function _buildProjectedSql(labelColumnName: string | undefined): string {
  const labelSql = labelColumnName
    ? `json_extract_string(properties, ${quoteSqlLiteral(makeJsonPointerFromPropertyName(labelColumnName))})`
    : "CAST(NULL AS VARCHAR)";
  return `buffer_crs AS (
  SELECT ${makeMetersCrsSql()} AS meters_crs
  FROM (
    SELECT avg(ST_X(ST_Centroid(geom))) AS centroid_longitude,
      avg(ST_Y(ST_Centroid(geom))) AS centroid_latitude
    FROM source_features
  ) centroid
),
projected AS (
  SELECT ST_Transform(
    geom, 'EPSG:4326', meters_crs, always_xy := true
  ) AS geom, meters_crs, ${labelSql} AS label
  FROM source_features, buffer_crs
)`;
}

function _buildBufferedSql(distanceMeters: number): string {
  return `buffered AS (
  SELECT ST_Transform(
    ST_Buffer(geom, ${distanceMeters}),
    meters_crs, 'EPSG:4326', always_xy := true
  ) AS geom, label
  FROM projected
)`;
}

function _buildOutputGeomsSql(dissolve: boolean): string {
  if (dissolve) {
    return `output_geoms AS (
  SELECT ST_Union_Agg(geom) AS geom, CAST(NULL AS VARCHAR) AS label
  FROM buffered
)`;
  }
  return `output_geoms AS (
  SELECT geom, label FROM buffered
)`;
}

function _buildBufferEnvelopeSelect(labelColumnName: string | undefined): string {
  const featureAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.featureCollection,
  );
  const diagnosticAlias = quoteSqlIdentifier(
    MapLayerSpatialQueryColumns.diagnostics,
  );
  const propertiesSql = labelColumnName
    ? `json_object(${quoteSqlLiteral(labelColumnName)}, label)`
    : "json_object()";
  return `feature_rows AS (
  SELECT json_object('type', 'Feature', 'geometry', json(ST_AsGeoJSON(geom)),
    'properties', ${propertiesSql}) AS feature
  FROM output_geoms
  WHERE geom IS NOT NULL
),
diagnostic_summary AS (
  SELECT count(*) AS source_count,
    count(geom) AS parsed_count,
    count(*) FILTER (WHERE geom IS NULL) AS invalid_count
  FROM source_features
)
SELECT json_object('type', 'FeatureCollection',
  'features', coalesce((SELECT json_group_array(feature) FROM feature_rows), json('[]')))
  AS ${featureAlias},
json_object('sourceCount', source_count, 'parsedCount', parsed_count,
  'invalidCount', invalid_count,
  'observedFamilies', json('["polygon"]'),
  'hasMixedFamilies', false)
  AS ${diagnosticAlias}
FROM diagnostic_summary`;
}

function _buildBufferSql(
  options: Readonly<{
    featureSource: MapLayerFeatureSource;
    binding: MapLayer.BufferOfLayerBinding;
    labelColumnName: string | undefined;
  }>,
): string {
  return `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "source_features", source: options.featureSource })},
${_buildProjectedSql(options.labelColumnName)},
${_buildBufferedSql(options.binding.distanceMeters)},
${_buildOutputGeomsSql(options.binding.dissolve)},
${_buildBufferEnvelopeSelect(options.labelColumnName)}`;
}

/**
 * Compiles a buffer-of-layer binding as polygons in a derived meters CRS.
 * Point, line, polygon, and latitude and longitude sources all buffer. When
 * rings are not dissolved and the binding names a label column, each ring
 * carries that source value as its one property.
 */
export function compileBufferOfLayerQuery(
  options: Readonly<CompileOptions>,
): MapLayerSpatialQueryPlan {
  const binding = _getBufferBinding(options.layer);
  const source = _getSourceLayer(options.stack, binding.layerId);
  _assertBufferInvariants(options, source);
  const labelColumn = _getLabelColumn(source, binding);
  const labelColumnName = labelColumn
    ? QueryColumn.getDerivedColumnName(labelColumn)
    : undefined;
  return makeSpatialQueryPlan({
    compile: options,
    rawSql: _buildBufferSql({
      featureSource: _compileSourceFeatures(options, source, labelColumn),
      binding,
      labelColumnName,
    }),
    family: "polygon",
    sourcePropertyColumnNames: labelColumnName ? [labelColumnName] : [],
  });
}
```

- [ ] **Step 4: Run and see them pass.** Same command as Step 2. Expected: PASS, including the existing tests ("buffers source output in a meters crs", "takes the CRS centroid from polygon centroids", the analyzer checks, dissolve, missing source, cycle, sensitivity mismatch).

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery
git commit -m "feat(gis): buffer latitude and longitude layers and label rings"
```

---

## Task 11: Draw filtered layers on the map

**Files:**
- Modify: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts:28-46, 71-105, 147-174`
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.ts:1-30, 63-145, 159-240`
- Modify: `src/views/GisApp/layers/useMapLayersData/runLatLngLayer.ts` (whole file)
- Test: `src/views/GisApp/layers/useMapLayersData/MapLayerData.getQueryKeyFromMapLayer.test.ts`
- Test: `src/views/GisApp/layers/useMapLayersData/MapLayerData.hasReadySourceFilters.test.ts`
- Test: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.test.ts`

- [ ] **Step 1: Write the failing tests.** Append to `MapLayerData.getQueryKeyFromMapLayer.test.ts`:

```ts
describe("MapLayerData.getQueryKeyFromMapLayer spatial filters", () => {
  it("changes when the filter layer's source changes", () => {
    const filterLayer = MapLayer.createArea("Buffer of Sites");
    const schools = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: filterLayer.id },
    };
    const editedFilterLayer = {
      ...filterLayer,
      source: { ...filterLayer.source, limit: 10 },
    };

    expect(
      MapLayerData.getQueryKeyFromMapLayer(schools, undefined, undefined, [
        filterLayer,
        schools,
      ]),
    ).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(schools, undefined, undefined, [
        editedFilterLayer,
        schools,
      ]),
    );
  });
});
```

Create `MapLayerData.hasReadySourceFilters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

describe("MapLayerData.hasReadySourceFilters", () => {
  it("waits for the spatial filter layer's saved filters to hydrate", () => {
    const area = MapLayer.createArea("ZIP codes");
    const filterLayer: MapLayer.T = {
      ...area,
      source: {
        ...area.source,
        sourceColumns: undefined,
        filters: {
          type: "group",
          combinator: "AND",
          rules: [
            {
              type: "rule",
              columnId: uuid<QueryColumn.Id>(),
              operator: "=",
              value: "Manhattan",
            },
          ],
        },
      },
    };
    const schools = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: filterLayer.id },
    };

    expect(
      MapLayerData.hasReadySourceFilters({
        layer: schools,
        stack: [filterLayer, schools],
      }),
    ).toBe(false);
  });
});
```

A rule with no hydrated `sourceColumns` is exactly the state `_hasReadySourceFilters` treats as not ready.

In `useMapLayersData.test.ts`, inside `describe("useMapLayersData", ...)`, add:

```ts
  it("draws a geometry layer's features only inside its spatial filter layer", async () => {
    const filterLayer = _createPolygonFilterLayer();
    const schools = {
      ...createSpatialLayer(),
      spatialFilter: { layerId: filterLayer.id },
    };
    runSpatialQueryMock.mockResolvedValue({
      id: uuid<QueryResult.Id>(),
      columns: [],
      numRows: 1,
      data: [
        {
          __avandar_feature_collection: {
            type: "FeatureCollection",
            features: [],
          },
          __avandar_diagnostics: {
            sourceCount: 0,
            parsedCount: 0,
            invalidCount: 0,
            observedFamilies: [],
            hasMixedFamilies: false,
          },
        },
      ],
    });

    renderHook(
      () => {
        return useMapLayersData({
          layers: [filterLayer, schools],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      expect(
        runSpatialQueryMock.mock.calls.some(([params]) => {
          return (params as { rawSql: string }).rawSql.includes(
            "kept_features AS (",
          );
        }),
      ).toBe(true);
    });
  });

  it("draws a latitude and longitude layer's points only inside its spatial filter layer", async () => {
    const filterLayer = _createPolygonFilterLayer();
    const schools = {
      ...createQueryableLayer(),
      spatialFilter: { layerId: filterLayer.id },
    };
    const { getDataSql } = _mockPointLayerQueries({ mappableRowCount: 3 });

    renderHook(
      () => {
        return useMapLayersData({
          layers: [filterLayer, schools],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      expect(
        getDataSql().some((sql) => {
          return sql.includes(
            "AS overlay_source WHERE EXISTS (SELECT 1 FROM filter_geoms",
          );
        }),
      ).toBe(true);
    });
  });
```

Add this helper above `describe("useMapLayersData", ...)`, and add `import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";` if the file only imports `MapLayer` as a value:

```ts
/** A WKT polygon layer whose geometry column is in its own query. */
function _createPolygonFilterLayer(): MapLayer.T {
  const base = createSpatialLayer();
  const binding = base.geoBinding;
  if (binding?.type !== "geometryColumn") {
    throw new Error("The spatial fixture binds a geometry column");
  }
  return { ...base, geoBinding: { ...binding, family: "polygon" } };
}
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/views/GisApp/layers/useMapLayersData
```

Expected: FAIL. The query key ignores the filter layer; readiness returns `true`; neither query includes the filter SQL.

- [ ] **Step 3: Update `MapLayerData`.** Add `isDefined` to the `@avandar/utils` import. Add below `_getBufferSourceQueryKey`:

```ts
/** Cache key parts of the layer `layer` is spatially filtered by. */
function _getSpatialFilterQueryKey(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): unknown {
  const filterLayer = layer.spatialFilter
    ? stack.find(propEq("id", layer.spatialFilter.layerId))
    : undefined;
  if (!filterLayer) {
    return undefined;
  }
  return {
    id: filterLayer.id,
    source: filterLayer.source,
    geoBinding: filterLayer.geoBinding,
    sensitivity: filterLayer.sensitivity,
    timeColumn: filterLayer.timeColumn,
    applyAoiFilter: filterLayer.applyAoiFilter,
    spatialFilter: filterLayer.spatialFilter,
    bufferSource: _getBufferSourceQueryKey(filterLayer, stack),
  };
}

/** Layers a layer's query reads: its buffer source and its filter layer. */
function _getDependencyLayers(
  layer: MapLayer.T,
  stack: readonly MapLayer.T[],
): MapLayer.T[] {
  const dependencyIds = [
    ...(layer.geoBinding?.type === "bufferOfLayer"
      ? [layer.geoBinding.layerId]
      : []),
    ...(layer.spatialFilter ? [layer.spatialFilter.layerId] : []),
  ];
  return dependencyIds
    .map((dependencyId) => {
      return stack.find(propEq("id", dependencyId));
    })
    .filter(isDefined);
}
```

Replace `hasReadySourceFilters` with:

```ts
  /**
   * True when the filters and having clauses of this layer, of each layer it
   * buffers, and of each layer it is spatially filtered by are hydrated, with
   * every rule targeting a column ID. Check it before running a layer's SQL,
   * for example to hold a layer's data query or the time slider's extent
   * until saved filters can apply. Missing layers and cycles return true, so
   * the compiler can report them.
   */
  hasReadySourceFilters: ({
    layer,
    stack,
  }: Readonly<{
    layer: MapLayer.T;
    stack: readonly MapLayer.T[];
  }>): boolean => {
    const visitedIds = new Set<MapLayer.Id>();
    const pendingLayers: MapLayer.T[] = [layer];
    for (
      let current = pendingLayers.pop();
      current !== undefined;
      current = pendingLayers.pop()
    ) {
      if (!visitedIds.has(current.id)) {
        if (!_hasReadySourceFilters(current)) {
          return false;
        }
        visitedIds.add(current.id);
        pendingLayers.push(..._getDependencyLayers(current, stack));
      }
    }
    return true;
  },
```

In `getQueryKeyFromMapLayer`, add `const filterKey = _getSpatialFilterQueryKey(layer, stack);` next to `sourceKey`, add `layer.spatialFilter,` after `layer.applyAoiFilter,`, and add `...(filterKey ? [filterKey] : []),` as the last array entry.

- [ ] **Step 4: Rewrite `runLatLngLayer.ts`.**

```ts
import { compileLatLngLayerSourceSql } from "@/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql/compileLatLngLayerSourceSql";
import { compileSpatialFilterEnvelopeSql } from "@/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery";
import { runPointLayerQuery } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { runStructuredQueryWithMetadata } from "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata";
import { getPaintValueColumnName } from "@/views/GisApp/layers/useAvaMapRender/getPaintValueColumnName";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  MapOverlay,
  SpatialFilterCompileOptions,
} from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { PointLayerSource } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/runPointLayerQuery";
import type { MapLayerDataResult } from "@/views/GisApp/layers/MapLayerDataResult.types";

type RunLatLngLayerOptions = {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  overlay: MapOverlay;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  stack: readonly MapLayer.T[];
  resolveMetadata: SpatialFilterCompileOptions["resolveMetadata"];
  signal?: AbortSignal;
};

/** The layer's filtered rows, or undefined when its columns are incomplete. */
function _getLatLngLayerSource(
  options: RunLatLngLayerOptions,
): ReturnType<typeof compileLatLngLayerSourceSql> {
  return compileLatLngLayerSourceSql({
    layer: options.layer,
    overlay: options.overlay,
    spatialFilterEnvelopeSql: compileSpatialFilterEnvelopeSql(options),
  });
}

/** The filtered SQL and column names a lat/lng layer aggregates over. */
function _getLatLngPointSource(
  options: RunLatLngLayerOptions,
): PointLayerSource | undefined {
  const layerSource = _getLatLngLayerSource(options);
  if (!layerSource) {
    return undefined;
  }
  return {
    sourceSql: layerSource.sql,
    latitudeColumnName: layerSource.latitudeColumnName,
    longitudeColumnName: layerSource.longitudeColumnName,
    valueColumnName: getPaintValueColumnName(options.layer),
  };
}

/**
 * Loads a lat/lng point layer's rows for `useMapLayersData`, letting DuckDB
 * aggregate the points when the row count would cost the browser more heap
 * than it has. A layer that cannot compile its own source SQL falls back to
 * structured-query execution, which is also where the Data Explorer's
 * large-dataset guard lives.
 */
export async function runLatLngLayer(
  options: RunLatLngLayerOptions,
): Promise<MapLayerDataResult> {
  const pointSource = _getLatLngPointSource(options);
  if (pointSource) {
    const { queryResult, audit, aggregation } = await runPointLayerQuery({
      ...pointSource,
      zoomBand: options.zoomBand,
      runQuery: async (rawSql) => {
        return await WorkspaceQuerySession.runQuery({
          rawSql,
          workspaceId: options.workspaceId,
          signal: options.signal,
        });
      },
    });
    return {
      type: "rows",
      queryResult,
      didAutoLimit: false,
      audit,
      aggregation,
    };
  }
  const { result, didAutoLimit } = await runStructuredQueryWithMetadata({
    auth: "workspace",
    workspaceId: options.workspaceId,
    query: options.layer.source,
    rawSql: _getLatLngLayerSource(options)?.sql,
  });
  return { type: "rows", queryResult: result, didAutoLimit };
}
```

- [ ] **Step 5: Update `useMapLayersData.ts`.**
  1. Replace the `getResolvedMapLayerMetadata` and `compileMapLayerSpatialQuery` imports with `import { compileSpatialFilteredQuery } from "@/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery";` and `import { getCompileMetadataFromMapLayer } from "@/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer/getCompileMetadataFromMapLayer";`; import `SpatialFilterCompileOptions` as a type from `compileMapLayerSpatialQuery.types`; drop the now-unused `makeIdLookupMap` import.
  2. Replace `RunSpatialLayerOptions` with:

```ts
type RunSpatialLayerOptions = {
  layer: MapLayer.T;
  workspaceId: Workspace.Id;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  overlay: MapOverlay;
  stack: readonly MapLayer.T[];
  resolveMetadata: SpatialFilterCompileOptions["resolveMetadata"];
  signal?: AbortSignal;
};
```

  3. In `_layerNeedsSpatial`, change the first check to `if (_isSpatialBinding(layer) || layer.spatialFilter !== undefined) {`.
  4. Delete `_getLeafSpatialSource` (moved in Task 7) and replace `_runSpatialLayer` with:

```ts
/** Compiles, executes, and parses one spatial layer. */
async function _runSpatialLayer(
  options: RunSpatialLayerOptions,
): Promise<MapLayerDataResult> {
  const plan = compileSpatialFilteredQuery(options);
  const queryResult = await WorkspaceQuerySession.runQuery({
    rawSql: plan.rawSql,
    workspaceId: options.workspaceId,
    signal: options.signal,
  });
  return {
    type: "spatial",
    ...parseMapLayerSpatialResult({
      queryResult,
      family: plan.family,
    }),
  };
}

/** Resolves any stacked layer's compile metadata from the loaded datasets. */
function _createMetadataResolver(
  context: LayerQueryContext,
): SpatialFilterCompileOptions["resolveMetadata"] {
  return (layer) => {
    return getCompileMetadataFromMapLayer({
      layer,
      stack: context.layers,
      datasets: context.datasets,
      datasetColumns: context.datasetColumns,
    });
  };
}
```

  Move the `type LayerQueryContext = {...}` declaration above `_runSpatialLayer` so `_createMetadataResolver` can use it.
  5. Replace the `queryFn` in `_createLayerQuery` with:

```ts
    queryFn: async ({ signal }): Promise<MapLayerDataResult> => {
      const runOptions = {
        layer,
        workspaceId: context.workspaceId,
        zoomBand: context.zoomBand,
        simplificationReferenceLatitude:
          context.simplificationReferenceLatitude,
        overlay: context.overlay,
        stack: context.layers,
        resolveMetadata: _createMetadataResolver(context),
        signal,
      };
      return _isSpatialBinding(layer)
        ? await _runSpatialLayer(runOptions)
        : await runLatLngLayer(runOptions);
    },
```

- [ ] **Step 6: Run and see them pass.**

```bash
pnpm vitest run src/views/GisApp/layers/useMapLayersData
pnpm tsc -b --force
```

Expected: PASS, including the existing "runs available geometry layers as raw SQL" test (its SQL still contains `ST_GeomFromText`). `tsc` exits 0.

- [ ] **Step 7: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/views/GisApp/layers/useMapLayersData
git commit -m "feat(gis): draw map layers through their spatial filter"
```

---
## Task 12: Feature list contract, access, and sort

**Files:**
- Create: `src/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types.ts`
- Create: `src/clients/maps/MapLayerFeatureList/MapLayerFeatureList.constants.ts`
- Create: `src/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer.ts`
- Create: `src/clients/maps/MapLayerFeatureList/sortMapLayerFeatureListRows/sortMapLayerFeatureListRows.ts`
- Test: `src/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer.test.ts`
- Test: `src/clients/maps/MapLayerFeatureList/sortMapLayerFeatureListRows/sortMapLayerFeatureListRows.test.ts`

- [ ] **Step 1: Write the contract types.** `MapLayerFeatureList.types.ts` (the first two types are the cross-plan contract, unchanged in shape; `distanceUnit` uses the model's unit type, which is the same four literals):

```ts
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { I18n } from "@lingui/core";

/** One column of a layer's feature list. */
export type MapLayerFeatureListColumn = {
  /** Row property name. */
  key: string;
  /** Already localized display label. */
  label: string;
  kind: "source" | "distance" | "nearestLabel";
};

/** Rows of one layer after AOI, time, and spatial filters. */
export type MapLayerFeatureList = {
  columns: readonly MapLayerFeatureListColumn[];
  /** Distance values are already in `distanceUnit`. */
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  /** Row count before `limit`. */
  totalCount: number;
  distanceUnit: MapLayer.BufferDistanceUnit | undefined;
};

/** One column and direction a feature list is sorted by. */
export type MapLayerFeatureListSort = {
  key: string;
  direction: "asc" | "desc";
};

/**
 * What a layer's feature list may show: every row, only a count (jittered
 * locations), or nothing (aggregate-only layers and layers without row
 * geometry).
 */
export type MapLayerFeatureListAccess = "rows" | "countOnly" | "unavailable";

/** Inputs to `fetchMapLayerFeatureList`. */
export type FetchMapLayerFeatureListOptions = {
  config: AvaMapConfig.T;
  layerId: MapLayer.Id;
  columnIds: readonly QueryColumn.Id[] | "popup";
  sort: MapLayerFeatureListSort | undefined;
  limit: number | undefined;
  workspaceId: Workspace.Id;
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
  /** Localizes the distance and nearest-site column labels. */
  i18n: I18n;
  signal?: AbortSignal;
};

/** Inputs to `fetchMapLayerFeatureCount`. */
export type FetchMapLayerFeatureCountOptions = Omit<
  FetchMapLayerFeatureListOptions,
  "columnIds" | "sort" | "limit" | "i18n"
>;
```

`MapLayerFeatureList.constants.ts`:

```ts
/** Keys a feature list row carries beside the layer's own column names. */
export const MAP_LAYER_FEATURE_LIST_ROW_KEYS = {
  distance: "__avandar_distance",
  nearestLabel: "__avandar_nearest_label",
  longitude: "__avandar_longitude",
  latitude: "__avandar_latitude",
} as const;

/** Result columns of the SQL that `compileMapLayerFeatureListSql` builds. */
export const MAP_LAYER_FEATURE_LIST_SQL_COLUMNS = {
  properties: "__avandar_properties",
  longitude: "__avandar_longitude",
  latitude: "__avandar_latitude",
  distanceMeters: "__avandar_distance_meters",
  nearestLabel: "__avandar_nearest_label",
} as const;

/** Zoom band a feature list compiles at, so listed polygons keep full detail. */
export const FEATURE_LIST_ZOOM_BAND = 24;
```

- [ ] **Step 2: Write the failing tests.** `getFeatureListAccessFromMapLayer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getFeatureListAccessFromMapLayer } from "./getFeatureListAccessFromMapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _makePointLayer(): MapLayer.T {
  return {
    ...MapLayer.makeEmpty("Schools"),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

describe("getFeatureListAccessFromMapLayer", () => {
  it("lists every row of an exact point layer", () => {
    expect(getFeatureListAccessFromMapLayer(_makePointLayer())).toBe("rows");
  });

  it("shows only a count for a layer with approximate locations", () => {
    const jittered = MapLayer.withSensitivity(_makePointLayer(), {
      mode: "jitter",
      radiusMeters: 500,
    });

    expect(getFeatureListAccessFromMapLayer(jittered)).toBe("countOnly");
  });

  it("offers no list for an aggregate-only layer", () => {
    const protectedLayer = MapLayer.withSensitivity(_makePointLayer(), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });

    expect(getFeatureListAccessFromMapLayer(protectedLayer)).toBe(
      "unavailable",
    );
  });

  it("offers no list for a buffer layer", () => {
    const buffer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Sites"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: uuid<MapLayer.Id>(),
        distanceMeters: 805,
        distanceUnit: "mi",
        labelColumn: undefined,
        dissolve: false,
      },
    };

    expect(getFeatureListAccessFromMapLayer(buffer)).toBe("unavailable");
  });
});
```

`sortMapLayerFeatureListRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sortMapLayerFeatureListRows } from "./sortMapLayerFeatureListRows";

const ROWS = [
  { name: "P.S. 10", distance: 0.4 },
  { name: "P.S. 9", distance: undefined },
  { name: "P.S. 2", distance: 0.1 },
];

function _getNames(rows: ReadonlyArray<Readonly<Record<string, unknown>>>) {
  return rows.map((row) => {
    return row.name;
  });
}

describe("sortMapLayerFeatureListRows", () => {
  it("orders numbers ascending with blanks last", () => {
    const sorted = sortMapLayerFeatureListRows({
      rows: ROWS,
      sort: { key: "distance", direction: "asc" },
    });

    expect(_getNames(sorted)).toEqual(["P.S. 2", "P.S. 10", "P.S. 9"]);
  });

  it("keeps blanks last when descending", () => {
    const sorted = sortMapLayerFeatureListRows({
      rows: ROWS,
      sort: { key: "distance", direction: "desc" },
    });

    expect(_getNames(sorted)).toEqual(["P.S. 10", "P.S. 2", "P.S. 9"]);
  });

  it("orders text with numbers in natural order", () => {
    const sorted = sortMapLayerFeatureListRows({
      rows: ROWS,
      sort: { key: "name", direction: "asc" },
    });

    expect(_getNames(sorted)).toEqual(["P.S. 2", "P.S. 9", "P.S. 10"]);
  });
});
```

- [ ] **Step 3: Run and see them fail.**

```bash
pnpm vitest run src/clients/maps/MapLayerFeatureList
```

Expected: FAIL with `Failed to resolve import "./getFeatureListAccessFromMapLayer"` and the same for the sort module.

- [ ] **Step 4: Implement.** `getFeatureListAccessFromMapLayer.ts`:

```ts
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerFeatureListAccess } from "../MapLayerFeatureList.types";

/**
 * What a layer's feature list may show. Exact layers drawn from rows list
 * every row; jittered layers show only a count, since exact rows would undo
 * the protection jitter gives; aggregate-only layers and layers whose
 * features are not rows (boundary joins, bins, buffers) have no list. Use it
 * to decide whether to offer a feature list, for example in a layer menu.
 */
export function getFeatureListAccessFromMapLayer(
  layer: MapLayer.T,
): MapLayerFeatureListAccess {
  const bindingType = layer.geoBinding?.type;
  const isRowLayer =
    bindingType === "latLngColumns" || bindingType === "geometryColumn";
  if (layer.sensitivity.mode === "aggregateOnly" || !isRowLayer) {
    return "unavailable";
  }
  return layer.sensitivity.mode === "jitter" ? "countOnly" : "rows";
}
```

`sortMapLayerFeatureListRows.ts`:

```ts
import type {
  MapLayerFeatureList,
  MapLayerFeatureListSort,
} from "../MapLayerFeatureList.types";

function _isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function _compareValues(first: unknown, second: unknown): number {
  if (typeof first === "number" && typeof second === "number") {
    return first - second;
  }
  return String(first).localeCompare(String(second), undefined, {
    numeric: true,
  });
}

/**
 * A feature list's rows ordered by one column, numbers numerically and text
 * in natural order ("P.S. 9" before "P.S. 10"), with blank cells last in
 * either direction. Use it to sort a feature list for display or print.
 */
export function sortMapLayerFeatureListRows(
  options: Readonly<{
    rows: MapLayerFeatureList["rows"];
    sort: MapLayerFeatureListSort;
  }>,
): MapLayerFeatureList["rows"] {
  const { rows, sort } = options;
  const directionSign = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((firstRow, secondRow) => {
    const first = firstRow[sort.key];
    const second = secondRow[sort.key];
    if (_isBlank(first) || _isBlank(second)) {
      return Number(_isBlank(first)) - Number(_isBlank(second));
    }
    return directionSign * _compareValues(first, second);
  });
}
```

- [ ] **Step 5: Run and see them pass.** Same command as Step 3. Expected: PASS.

- [ ] **Step 6: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerFeatureList
git commit -m "feat(gis): define the map layer feature list contract"
```

---

## Task 13: Feature list SQL with nearest distance

**Files:**
- Create: `src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureListSql/compileMapLayerFeatureListSql.ts`
- Test: `src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureListSql/compileMapLayerFeatureListSql.executed.test.ts`

The test pair is 0.5 mi (804.672 m) apart along a meridian at 40.73°N in Manhattan. UTM zone 18N, which `makeMetersCrsSql` picks there, measures it as about 804.42 m (checked with DuckDB spatial while writing this plan), inside the spec's 1 m tolerance.

- [ ] **Step 1: Write the failing executed test.**

```ts
/**
 * Row-level tests for {@link compileMapLayerFeatureListSql}, run against a
 * real in-memory DuckDB with the spatial extension, because distance
 * accuracy is a property of the executed SQL, not of its text.
 */
import { describe, expect, it } from "vitest";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import { compileMapLayerFeatureListSql } from "./compileMapLayerFeatureListSql";
import type { MapLayerFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

const _FIXTURE_SQL = `
  CREATE TABLE schools AS SELECT * FROM (VALUES
    ('Clinton', 40.73, -73.99)
  ) AS t(school_name, latitude, longitude);
  CREATE TABLE sites AS SELECT * FROM (VALUES
    ('North', 40.7372461, -73.99),
    ('Far', 41.5, -73.99)
  ) AS t(site_name, latitude, longitude);
`;

function _makeRowsSource(table: string): MapLayerFeatureSource {
  return {
    type: "rows",
    sql: `SELECT * FROM ${table}`,
    latitudeColumnName: "latitude",
    longitudeColumnName: "longitude",
  };
}

async function _runListSql(
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  return withDuckDb(async (connection) => {
    await connection.run("INSTALL spatial; LOAD spatial;");
    await connection.run(_FIXTURE_SQL);
    const result = await connection.runAndReadAll(sql);
    return result.getRowObjects();
  });
}

describe("compileMapLayerFeatureListSql executed", () => {
  it("measures half a mile within one meter", async () => {
    const [row] = await _runListSql(
      compileMapLayerFeatureListSql({
        layerSource: _makeRowsSource("schools"),
        nearest: {
          source: _makeRowsSource("sites"),
          labelPropertyName: "site_name",
        },
      }),
    );

    expect(
      Math.abs(Number(row?.__avandar_distance_meters) - 804.672),
    ).toBeLessThan(1);
  });

  it("names the nearest site", async () => {
    const [row] = await _runListSql(
      compileMapLayerFeatureListSql({
        layerSource: _makeRowsSource("schools"),
        nearest: {
          source: _makeRowsSource("sites"),
          labelPropertyName: "site_name",
        },
      }),
    );

    expect(row?.__avandar_nearest_label).toBe("North");
  });

  it("returns each row's columns and point with no distance when nothing is measured", async () => {
    const [row] = await _runListSql(
      compileMapLayerFeatureListSql({
        layerSource: _makeRowsSource("schools"),
        nearest: undefined,
      }),
    );

    expect(JSON.parse(String(row?.__avandar_properties))).toEqual({
      school_name: "Clinton",
      latitude: 40.73,
      longitude: -73.99,
    });
    expect(row?.__avandar_longitude).toBe(-73.99);
    expect(row?.__avandar_distance_meters).toBeNull();
  });
});
```

- [ ] **Step 2: Run and see it fail.**

```bash
pnpm test:executed src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureListSql
```

Expected: FAIL with `Failed to resolve import "./compileMapLayerFeatureListSql"`.

- [ ] **Step 3: Implement.**

```ts
import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import {
  makeFeaturesCteSqlFromFeatureSource,
  makeJsonPointerFromPropertyName,
} from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import { makeMetersCrsSql } from "@/clients/maps/MapLayerSpatialQuery/makeMetersCrsSql";
import { MAP_LAYER_FEATURE_LIST_SQL_COLUMNS } from "../MapLayerFeatureList.constants";
import type { MapLayerFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

/** Features each listed row is measured against, and the property naming them. */
export type MapLayerFeatureListNearestSource = {
  source: MapLayerFeatureSource;
  labelPropertyName: string | undefined;
};

function _buildListRowsCte(): string {
  return `list_rows AS (
  SELECT row_number() OVER () AS list_row_id, properties, geom
  FROM list_features
  WHERE geom IS NOT NULL
)`;
}

function _buildNearestCtes(nearest: MapLayerFeatureListNearestSource): string {
  const labelSql =
    nearest.labelPropertyName === undefined
      ? "CAST(NULL AS VARCHAR)"
      : `json_extract_string(nearest_features.properties, ${quoteSqlLiteral(makeJsonPointerFromPropertyName(nearest.labelPropertyName))})`;
  return `${makeFeaturesCteSqlFromFeatureSource({ cteName: "nearest_features", source: nearest.source })},
list_crs AS (
  SELECT ${makeMetersCrsSql()} AS meters_crs
  FROM (
    SELECT avg(ST_X(ST_Centroid(geom))) AS centroid_longitude,
      avg(ST_Y(ST_Centroid(geom))) AS centroid_latitude
    FROM nearest_features
    WHERE geom IS NOT NULL
  ) centroid
),
list_pairs AS (
  SELECT list_rows.list_row_id, ${labelSql} AS nearest_label,
    ST_Distance(
      ST_Transform(list_rows.geom, 'EPSG:4326', list_crs.meters_crs, always_xy := true),
      ST_Transform(nearest_features.geom, 'EPSG:4326', list_crs.meters_crs, always_xy := true)
    ) AS pair_distance
  FROM list_rows, nearest_features, list_crs
  WHERE nearest_features.geom IS NOT NULL
),
list_measured AS (
  SELECT list_row_id, min(pair_distance) AS distance_meters,
    arg_min(nearest_label, pair_distance) AS nearest_label
  FROM list_pairs
  GROUP BY list_row_id
)`;
}

function _buildFinalSelect(hasNearest: boolean): string {
  const columns = MAP_LAYER_FEATURE_LIST_SQL_COLUMNS;
  const distanceSql = hasNearest
    ? "list_measured.distance_meters"
    : "CAST(NULL AS DOUBLE)";
  const labelSql = hasNearest
    ? "list_measured.nearest_label"
    : "CAST(NULL AS VARCHAR)";
  const joinSql = hasNearest
    ? "\nLEFT JOIN list_measured USING (list_row_id)"
    : "";
  return `SELECT list_rows.properties AS ${quoteSqlIdentifier(columns.properties)},
  ST_X(ST_Centroid(list_rows.geom)) AS ${quoteSqlIdentifier(columns.longitude)},
  ST_Y(ST_Centroid(list_rows.geom)) AS ${quoteSqlIdentifier(columns.latitude)},
  ${distanceSql} AS ${quoteSqlIdentifier(columns.distanceMeters)},
  ${labelSql} AS ${quoteSqlIdentifier(columns.nearestLabel)}
FROM list_rows${joinSql}
ORDER BY list_rows.list_row_id`;
}

/**
 * SQL listing one layer's features: each feature's properties and centroid
 * and, when `nearest` is given, its distance in meters to the nearest of
 * those features and that feature's label. Distance is measured in the same
 * derived meters CRS a buffer uses, so a listed feature inside a buffer is
 * never measured farther than the buffer's distance. Use it to build a
 * feature list, for example "schools near exposure sites".
 */
export function compileMapLayerFeatureListSql(
  options: Readonly<{
    layerSource: MapLayerFeatureSource;
    nearest: MapLayerFeatureListNearestSource | undefined;
  }>,
): string {
  const nearestCtes = options.nearest
    ? `,\n${_buildNearestCtes(options.nearest)}`
    : "";
  return `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "list_features", source: options.layerSource })},
${_buildListRowsCte()}${nearestCtes}
${_buildFinalSelect(options.nearest !== undefined)}`;
}
```

- [ ] **Step 4: Run and see it pass.** Same command as Step 2. Expected: PASS (3 tests).

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureListSql
git commit -m "feat(gis): compile feature list SQL with nearest-site distance"
```

---

## Task 14: A listable layer as a filtered feature source

**Files:**
- Create: `src/clients/maps/MapLayerFeatureList/MapLayerFeatureList.fixtures.ts`
- Create: `src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureSource/compileMapLayerFeatureSource.ts`
- Test: `src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureSource/compileMapLayerFeatureSource.test.ts`

- [ ] **Step 1: Write the fixtures.** `MapLayerFeatureList.fixtures.ts`:

```ts
import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Layers and config of the sites, buffer, and schools feature list fixture. */
export type SitesAndSchoolsFixture = {
  config: AvaMapConfig.T;
  sites: MapLayer.T;
  buffer: MapLayer.T;
  schools: MapLayer.T;
};

function _makeDataset(name: string): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name,
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

function _makeQueryColumn(dataset: Dataset.T, name: string): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: dataset.id,
      workspaceId: dataset.workspaceId,
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx: 0,
    }),
  );
}

/** A latitude and longitude layer whose popup shows its name column. */
function _makePointLayer(name: string, nameColumn: string): MapLayer.T {
  const dataset = _makeDataset(name);
  const label = _makeQueryColumn(dataset, nameColumn);
  const latitude = _makeQueryColumn(dataset, "latitude");
  const longitude = _makeQueryColumn(dataset, "longitude");
  const layer = MapLayer.makeEmpty(name);
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: dataset,
      queryColumns: [label, latitude, longitude],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
    popup: { columnIds: [label.id], action: undefined },
  };
}

/**
 * Sites, a half-mile buffer of the sites labelled by `site_name`, and
 * schools filtered by that buffer, as one map config. Use it in feature list
 * tests that need a buffer-filtered layer.
 */
export function createSitesAndSchoolsFixture(
  schoolSensitivity: MapLayer.Sensitivity = { mode: "exact" },
): SitesAndSchoolsFixture {
  const sites = _makePointLayer("Sites", "site_name");
  const buffer: MapLayer.T = {
    ...MapLayer.createArea("Buffer of Sites"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: sites.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: sites.source.queryColumns[0]?.id,
      dissolve: false,
    },
  };
  const schools = MapLayer.withSensitivity(
    {
      ..._makePointLayer("Schools", "school_name"),
      spatialFilter: { layerId: buffer.id },
    },
    schoolSensitivity,
  );
  return {
    config: { ...AvaMapConfig.makeEmpty(), layers: [sites, buffer, schools] },
    sites,
    buffer,
    schools,
  };
}
```

- [ ] **Step 2: Write the failing test.** `compileMapLayerFeatureSource.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createSitesAndSchoolsFixture } from "../MapLayerFeatureList.fixtures";
import { compileMapLayerFeatureSource } from "./compileMapLayerFeatureSource";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

describe("compileMapLayerFeatureSource", () => {
  it("reads a latitude and longitude layer as rows inside its spatial filter", () => {
    const { config, schools } = createSitesAndSchoolsFixture();

    const source = compileMapLayerFeatureSource({
      config,
      layer: schools,
      propertyColumnIds: [],
      datasets: [],
      datasetColumns: [],
    });

    expect(source.type).toBe("rows");
    expect(source.sql).toContain("filter_geoms AS (");
    expect(source.sql).toContain("ST_Buffer(geom, 805)");
  });

  it("reads a spatial layer as an envelope carrying the requested columns", () => {
    const { config, sites } = createSitesAndSchoolsFixture();
    const [siteName, latitude] = sites.source.queryColumns;
    const wktSites: MapLayer.T = {
      ...sites,
      popup: { columnIds: [], action: undefined },
      geoBinding: {
        type: "geometryColumn",
        column: latitude!.id,
        encoding: "wkt",
        family: "point",
        simplification: undefined,
        sourceCrs: undefined,
      },
    };

    const source = compileMapLayerFeatureSource({
      config: { ...config, layers: [wktSites] },
      layer: wktSites,
      propertyColumnIds: [siteName!.id],
      datasets: [],
      datasetColumns: [],
    });

    expect(source.type).toBe("envelope");
    expect(source.sql).toContain(`'site_name', "site_name"`);
  });
});
```

- [ ] **Step 3: Run and see it fail.**

```bash
pnpm vitest run src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureSource
```

Expected: FAIL with `Failed to resolve import "./compileMapLayerFeatureSource"`.

- [ ] **Step 4: Implement.**

```ts
import { compileLatLngLayerSourceSql } from "@/clients/maps/MapLayerSpatialQuery/compileLatLngLayerSourceSql/compileLatLngLayerSourceSql";
import {
  compileSpatialFilteredQuery,
  compileSpatialFilterEnvelopeSql,
} from "@/clients/maps/MapLayerSpatialQuery/compileSpatialFilteredQuery/compileSpatialFilteredQuery";
import { getCompileMetadataFromMapLayer } from "@/clients/maps/MapLayerSpatialQuery/getCompileMetadataFromMapLayer/getCompileMetadataFromMapLayer";
import { FEATURE_LIST_ZOOM_BAND } from "../MapLayerFeatureList.constants";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { SpatialFilterCompileOptions } from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types";
import type { MapLayerFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";

type CompileFeatureSourceOptions = {
  config: AvaMapConfig.T;
  layer: MapLayer.T;
  propertyColumnIds: readonly QueryColumn.Id[];
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
};

/** Compile inputs for `layer`, carrying the requested property columns. */
function _makeCompileOptions(
  options: Readonly<CompileFeatureSourceOptions>,
): SpatialFilterCompileOptions {
  const { config } = options;
  return {
    layer: {
      ...options.layer,
      popup: { ...options.layer.popup, columnIds: options.propertyColumnIds },
    },
    stack: config.layers,
    overlay: { aoi: config.aoi, timeRange: config.timeRange },
    zoomBand: FEATURE_LIST_ZOOM_BAND,
    simplificationReferenceLatitude: config.view.center[1],
    resolveMetadata: (layer) => {
      return getCompileMetadataFromMapLayer({
        layer,
        stack: config.layers,
        datasets: options.datasets,
        datasetColumns: options.datasetColumns,
      });
    },
  };
}

/**
 * One layer's features as a source another query reads, with every map
 * filter applied (time, area, and spatial filter) and the requested columns
 * among each feature's properties. It compiles exactly what the map draws,
 * so a list built on it matches the map. Use it to list a layer's features
 * or to measure distances to them.
 * @throws When the layer's coordinate columns are incomplete or its spatial
 * filter is invalid.
 */
export function compileMapLayerFeatureSource(
  options: Readonly<CompileFeatureSourceOptions>,
): MapLayerFeatureSource {
  const compileOptions = _makeCompileOptions(options);
  if (compileOptions.layer.geoBinding?.type !== "latLngColumns") {
    return {
      type: "envelope",
      sql: compileSpatialFilteredQuery(compileOptions).rawSql,
    };
  }
  const rows = compileLatLngLayerSourceSql({
    layer: compileOptions.layer,
    overlay: compileOptions.overlay,
    spatialFilterEnvelopeSql: compileSpatialFilterEnvelopeSql(compileOptions),
  });
  if (!rows) {
    throw new Error("The layer's coordinate columns are incomplete");
  }
  return rows;
}
```

- [ ] **Step 5: Run and see it pass.** Same command as Step 3. Expected: PASS.

- [ ] **Step 6: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerFeatureList/MapLayerFeatureList.fixtures.ts src/clients/maps/MapLayerFeatureList/compileMapLayerFeatureSource
git commit -m "feat(gis): compile a listable layer as a filtered feature source"
```

---

## Task 15: `fetchMapLayerFeatureList` and `fetchMapLayerFeatureCount`

**Files:**
- Create: `src/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList.ts`
- Create: `src/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureCount/fetchMapLayerFeatureCount.ts`
- Test: `src/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList.test.ts`
- Test: `src/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureCount/fetchMapLayerFeatureCount.test.ts`

- [ ] **Step 1: Write the failing tests.** `fetchMapLayerFeatureList.test.ts`:

```ts
import { i18n } from "@lingui/core";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { createSitesAndSchoolsFixture } from "./MapLayerFeatureList.fixtures";
import { MAP_LAYER_FEATURE_LIST_ROW_KEYS } from "./MapLayerFeatureList.constants";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { FetchMapLayerFeatureListOptions } from "./MapLayerFeatureList.types";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { fetchMapLayerFeatureList } = await import("./fetchMapLayerFeatureList");

/** Two schools, the farther first, as the list SQL returns them. */
function _makeQueryResult(): QueryResult.T {
  const makeRow = (name: string, meters: number, site: string) => {
    return {
      __avandar_properties: JSON.stringify({ school_name: name }),
      __avandar_longitude: -73.99,
      __avandar_latitude: 40.73,
      __avandar_distance_meters: meters,
      __avandar_nearest_label: site,
    };
  };
  const data = [
    makeRow("Far school", 804.672, "Union Square"),
    makeRow("Near school", 160.9344, "Washington Square"),
  ];
  return { id: uuid<QueryResult.Id>(), columns: [], data, numRows: 2 };
}

function _makeOptions(
  overrides: Partial<FetchMapLayerFeatureListOptions> = {},
): FetchMapLayerFeatureListOptions {
  const { config, schools } = createSitesAndSchoolsFixture();
  return {
    config,
    layerId: schools.id,
    columnIds: "popup",
    sort: undefined,
    limit: undefined,
    workspaceId: uuid<Workspace.Id>(),
    datasets: [],
    datasetColumns: [],
    i18n,
    ...overrides,
  };
}

describe("fetchMapLayerFeatureList", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  beforeEach(() => {
    runQueryMock.mockReset();
    runQueryMock.mockResolvedValue(_makeQueryResult());
  });

  it("lists the popup columns, then distance and nearest site", async () => {
    const list = await fetchMapLayerFeatureList(_makeOptions());

    expect(list.columns).toEqual([
      { key: "school_name", label: "school_name", kind: "source" },
      {
        key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance,
        label: "Distance to nearest Sites",
        kind: "distance",
      },
      {
        key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.nearestLabel,
        label: "Nearest Sites",
        kind: "nearestLabel",
      },
    ]);
  });

  it("shows distances in the buffer's unit, nearest first", async () => {
    const list = await fetchMapLayerFeatureList(_makeOptions());

    expect(list.distanceUnit).toBe("mi");
    expect(list.rows[0]).toMatchObject({
      school_name: "Near school",
      [MAP_LAYER_FEATURE_LIST_ROW_KEYS.nearestLabel]: "Washington Square",
    });
    expect(
      list.rows[0]?.[MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance],
    ).toBeCloseTo(0.1, 6);
  });

  it("counts every row before the limit", async () => {
    const list = await fetchMapLayerFeatureList(_makeOptions({ limit: 1 }));

    expect(list.rows).toHaveLength(1);
    expect(list.totalCount).toBe(2);
  });

  it("queries the layer's rows inside its buffer and measures to the sites", async () => {
    await fetchMapLayerFeatureList(_makeOptions());

    const { rawSql } = runQueryMock.mock.calls[0]![0] as { rawSql: string };
    expect(rawSql).toContain("list_features_rows AS (");
    expect(rawSql).toContain("filter_geoms AS (");
    expect(rawSql).toContain("nearest_features_rows AS (");
    expect(rawSql).toContain("arg_min(nearest_label, pair_distance)");
  });

  it("refuses a layer with approximate locations", async () => {
    const { config, schools } = createSitesAndSchoolsFixture({
      mode: "jitter",
      radiusMeters: 500,
    });

    await expect(
      fetchMapLayerFeatureList(_makeOptions({ config, layerId: schools.id })),
    ).rejects.toThrow(
      "A feature list is only available for a layer with exact locations",
    );
  });
});
```

`fetchMapLayerFeatureCount.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { createSitesAndSchoolsFixture } from "../MapLayerFeatureList.fixtures";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { fetchMapLayerFeatureCount } = await import("./fetchMapLayerFeatureCount");

describe("fetchMapLayerFeatureCount", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
    runQueryMock.mockResolvedValue({
      id: uuid<QueryResult.Id>(),
      columns: [],
      data: [{ feature_count: 12n }],
      numRows: 1,
    });
  });

  it("counts a jittered layer's features inside its spatial filter", async () => {
    const { config, schools } = createSitesAndSchoolsFixture({
      mode: "jitter",
      radiusMeters: 500,
    });

    const count = await fetchMapLayerFeatureCount({
      config,
      layerId: schools.id,
      workspaceId: uuid<Workspace.Id>(),
      datasets: [],
      datasetColumns: [],
    });

    expect(count).toBe(12);
    const { rawSql } = runQueryMock.mock.calls[0]![0] as { rawSql: string };
    expect(rawSql).toContain("filter_geoms AS (");
  });

  it("refuses an aggregate-only layer", async () => {
    const { config, schools } = createSitesAndSchoolsFixture();
    const protectedSchools = MapLayer.withSensitivity(schools, {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "district",
    });

    await expect(
      fetchMapLayerFeatureCount({
        config: {
          ...config,
          layers: config.layers.map((layer) => {
            return layer.id === schools.id ? protectedSchools : layer;
          }),
        },
        layerId: schools.id,
        workspaceId: uuid<Workspace.Id>(),
        datasets: [],
        datasetColumns: [],
      }),
    ).rejects.toThrow("This layer has no feature count");
  });
});
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList.test.ts src/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureCount
```

Expected: FAIL with `Failed to resolve import "./fetchMapLayerFeatureList"` and `"./fetchMapLayerFeatureCount"`.

- [ ] **Step 3: Implement the list.** `fetchMapLayerFeatureList.ts`:

```ts
import { isDefined, isPlainObject, prop, propEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { compileMapLayerFeatureListSql } from "./compileMapLayerFeatureListSql/compileMapLayerFeatureListSql";
import { compileMapLayerFeatureSource } from "./compileMapLayerFeatureSource/compileMapLayerFeatureSource";
import { getFeatureListAccessFromMapLayer } from "./getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import {
  MAP_LAYER_FEATURE_LIST_ROW_KEYS,
  MAP_LAYER_FEATURE_LIST_SQL_COLUMNS,
} from "./MapLayerFeatureList.constants";
import { sortMapLayerFeatureListRows } from "./sortMapLayerFeatureListRows/sortMapLayerFeatureListRows";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { I18n } from "@lingui/core";
import type {
  FetchMapLayerFeatureListOptions,
  MapLayerFeatureList,
  MapLayerFeatureListColumn,
  MapLayerFeatureListSort,
} from "./MapLayerFeatureList.types";

/** The buffer a listed layer is filtered by, and the layer it buffers. */
type NearestBuffer = {
  binding: MapLayer.BufferOfLayerBinding;
  sourceLayer: MapLayer.T;
  labelColumn: QueryColumn.T | undefined;
};

function _getListLayer(
  config: AvaMapConfig.T,
  layerId: MapLayer.Id,
): MapLayer.T {
  const layer = config.layers.find(propEq("id", layerId));
  if (!layer) {
    throw new Error("The feature list layer is missing");
  }
  if (getFeatureListAccessFromMapLayer(layer) !== "rows") {
    throw new Error(
      "A feature list is only available for a layer with exact locations",
    );
  }
  return layer;
}

/** The query columns a list shows, the popup's by default. */
function _getListQueryColumns(
  layer: MapLayer.T,
  columnIds: FetchMapLayerFeatureListOptions["columnIds"],
): QueryColumn.T[] {
  const geometryColumnId =
    layer.geoBinding?.type === "geometryColumn"
      ? layer.geoBinding.column
      : undefined;
  const popupIds =
    layer.popup.columnIds === "all"
      ? layer.source.queryColumns.map(prop("id")).filter((columnId) => {
          return columnId !== geometryColumnId;
        })
      : layer.popup.columnIds;
  const requestedIds = columnIds === "popup" ? popupIds : columnIds;
  return requestedIds
    .map((columnId) => {
      return layer.source.queryColumns.find(propEq("id", columnId));
    })
    .filter(isDefined);
}

function _getNearestBuffer(
  config: AvaMapConfig.T,
  layer: MapLayer.T,
): NearestBuffer | undefined {
  const filterLayer = layer.spatialFilter
    ? config.layers.find(propEq("id", layer.spatialFilter.layerId))
    : undefined;
  const binding = filterLayer?.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    return undefined;
  }
  const sourceLayer = config.layers.find(propEq("id", binding.layerId));
  if (!sourceLayer) {
    return undefined;
  }
  const labelColumn = binding.labelColumn
    ? sourceLayer.source.queryColumns.find(propEq("id", binding.labelColumn))
    : undefined;
  return { binding, sourceLayer, labelColumn };
}

function _compileListSql(
  options: Readonly<{
    listOptions: FetchMapLayerFeatureListOptions;
    layer: MapLayer.T;
    queryColumns: readonly QueryColumn.T[];
    nearest: NearestBuffer | undefined;
  }>,
): string {
  const { listOptions, nearest } = options;
  const shared = {
    config: listOptions.config,
    datasets: listOptions.datasets,
    datasetColumns: listOptions.datasetColumns,
  };
  return compileMapLayerFeatureListSql({
    layerSource: compileMapLayerFeatureSource({
      ...shared,
      layer: options.layer,
      propertyColumnIds: options.queryColumns.map(prop("id")),
    }),
    nearest: nearest
      ? {
          source: compileMapLayerFeatureSource({
            ...shared,
            layer: nearest.sourceLayer,
            propertyColumnIds: nearest.labelColumn
              ? [nearest.labelColumn.id]
              : [],
          }),
          labelPropertyName: nearest.labelColumn
            ? QueryColumn.getDerivedColumnName(nearest.labelColumn)
            : undefined,
        }
      : undefined,
  });
}

function _makeListColumns(
  options: Readonly<{
    queryColumns: readonly QueryColumn.T[];
    nearest: NearestBuffer | undefined;
    i18n: I18n;
  }>,
): MapLayerFeatureListColumn[] {
  const sourceColumns = options.queryColumns.map((column) => {
    const name = QueryColumn.getDerivedColumnName(column);
    return { key: name, label: name, kind: "source" as const };
  });
  if (!options.nearest) {
    return sourceColumns;
  }
  const sourceName = options.nearest.sourceLayer.name;
  const distanceColumn = {
    key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance,
    label: options.i18n._(msg`Distance to nearest ${sourceName}`),
    kind: "distance" as const,
  };
  const labelColumns = options.nearest.labelColumn
    ? [
        {
          key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.nearestLabel,
          label: options.i18n._(msg`Nearest ${sourceName}`),
          kind: "nearestLabel" as const,
        },
      ]
    : [];
  return [...sourceColumns, distanceColumn, ...labelColumns];
}

/** A row's properties, which DuckDB returns as JSON text or an object. */
function _parseProperties(value: unknown): Readonly<Record<string, unknown>> {
  const parsed: unknown = typeof value === "string" ? JSON.parse(value) : value;
  return isPlainObject(parsed) ? parsed : {};
}

function _makeListRow(
  options: Readonly<{
    resultRow: UnknownRow;
    columns: readonly MapLayerFeatureListColumn[];
    distanceUnit: MapLayer.BufferDistanceUnit | undefined;
  }>,
): Readonly<Record<string, unknown>> {
  const { resultRow, distanceUnit } = options;
  const sqlColumns = MAP_LAYER_FEATURE_LIST_SQL_COLUMNS;
  const keys = MAP_LAYER_FEATURE_LIST_ROW_KEYS;
  const properties = _parseProperties(resultRow[sqlColumns.properties]);
  const distanceMeters = resultRow[sqlColumns.distanceMeters];
  const sourceEntries = options.columns
    .filter(propEq("kind", "source"))
    .map((column) => {
      return [column.key, properties[column.key]] as const;
    });
  return {
    ...Object.fromEntries(sourceEntries),
    [keys.distance]:
      typeof distanceMeters === "number" && distanceUnit
        ? MapLayer.getBufferDistanceFromMeters({
            distanceMeters,
            unit: distanceUnit,
          })
        : undefined,
    [keys.nearestLabel]: resultRow[sqlColumns.nearestLabel] ?? undefined,
    [keys.longitude]: resultRow[sqlColumns.longitude],
    [keys.latitude]: resultRow[sqlColumns.latitude],
  };
}

/**
 * The rows of one layer's feature list, after the map's AOI, time, and
 * spatial filters, with each row's distance to the nearest site when the
 * layer is filtered by a buffer. It runs the same compile the map draws, so
 * the list always matches the map. Use it for any list of a layer's
 * features, for example an on-screen drawer or a printed table. Rows are
 * sorted by distance ascending unless `sort` says otherwise; `totalCount` is
 * the count before `limit`.
 * @throws When the layer is missing or its sensitivity is not exact.
 */
export async function fetchMapLayerFeatureList(
  options: FetchMapLayerFeatureListOptions,
): Promise<MapLayerFeatureList> {
  const layer = _getListLayer(options.config, options.layerId);
  const queryColumns = _getListQueryColumns(layer, options.columnIds);
  const nearest = _getNearestBuffer(options.config, layer);
  const queryResult = await WorkspaceQuerySession.runQuery({
    rawSql: _compileListSql({ listOptions: options, layer, queryColumns, nearest }),
    workspaceId: options.workspaceId,
    signal: options.signal,
  });
  const columns = _makeListColumns({ queryColumns, nearest, i18n: options.i18n });
  const distanceUnit = nearest?.binding.distanceUnit;
  const rows = queryResult.data.map((resultRow) => {
    return _makeListRow({ resultRow, columns, distanceUnit });
  });
  const defaultSort: MapLayerFeatureListSort | undefined = nearest
    ? { key: MAP_LAYER_FEATURE_LIST_ROW_KEYS.distance, direction: "asc" }
    : undefined;
  const sort = options.sort ?? defaultSort;
  const sortedRows = sort ? sortMapLayerFeatureListRows({ rows, sort }) : rows;
  return {
    columns,
    rows:
      options.limit === undefined
        ? sortedRows
        : sortedRows.slice(0, options.limit),
    totalCount: rows.length,
    distanceUnit,
  };
}
```

- [ ] **Step 4: Implement the count.** `fetchMapLayerFeatureCount.ts`:

```ts
import { propEq } from "@avandar/utils";
import { makeFeaturesCteSqlFromFeatureSource } from "@/clients/maps/MapLayerSpatialQuery/FeatureSourceSqlHelpers/FeatureSourceSqlHelpers";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { compileMapLayerFeatureSource } from "../compileMapLayerFeatureSource/compileMapLayerFeatureSource";
import { getFeatureListAccessFromMapLayer } from "../getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import type { FetchMapLayerFeatureCountOptions } from "../MapLayerFeatureList.types";

/**
 * How many of one layer's features pass the map's AOI, time, and spatial
 * filters, without reading any row. Use it where rows may not be shown but a
 * count may, for example a feature list for a layer with approximate
 * locations.
 * @throws When the layer is missing or has no feature list at all.
 */
export async function fetchMapLayerFeatureCount(
  options: Readonly<FetchMapLayerFeatureCountOptions>,
): Promise<number> {
  const layer = options.config.layers.find(propEq("id", options.layerId));
  if (!layer || getFeatureListAccessFromMapLayer(layer) === "unavailable") {
    throw new Error("This layer has no feature count");
  }
  const featureSource = compileMapLayerFeatureSource({
    config: options.config,
    layer,
    propertyColumnIds: [],
    datasets: options.datasets,
    datasetColumns: options.datasetColumns,
  });
  const result = await WorkspaceQuerySession.runQuery<{
    feature_count: unknown;
  }>({
    rawSql: `WITH ${makeFeaturesCteSqlFromFeatureSource({ cteName: "list_features", source: featureSource })}
SELECT count(*) AS feature_count FROM list_features WHERE geom IS NOT NULL`,
    workspaceId: options.workspaceId,
    signal: options.signal,
  });
  return Number(result.data[0]?.feature_count ?? 0);
}
```

- [ ] **Step 5: Run and see them pass.** Same command as Step 2. Expected: PASS. Then `pnpm tsc -b --force`; if `isPlainObject(parsed) ? parsed : {}` does not narrow to `Record<string, unknown>`, type the return as `Readonly<UnknownObject>` imported from `@avandar/utils`.

- [ ] **Step 6: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/clients/maps/MapLayerFeatureList
git commit -m "feat(gis): fetch a map layer's feature list and feature count"
```

---
## Task 16: "Only show features inside..." in the inspector

Before this task, read `docs/design/app-view-layout.md`, the Named Rules in `DESIGN.md`, and `docs/design/gis/feature-home-inventory.md`. The control is a plain Mantine `Select` beside the existing `ApplyAoiFilterSwitch`, so no new surface and no `impeccable` skill.

**Files:**
- Create: `src/views/GisApp/layers/MapLayerUpdates/spatialFilterUpdates.ts`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Create: `src/views/GisApp/panels/LayerInspector/FilterSection/SpatialFilterSelect.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/FilterSection/FilterSection.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorSections.tsx:56-61`
- Test: `src/views/GisApp/layers/MapLayerUpdates/__tests__/MapLayerUpdates.spatialFilter.test.ts`
- Test: `src/views/GisApp/panels/LayerInspector/FilterSection/SpatialFilterSelect.test.tsx`

- [ ] **Step 1: Write the failing tests.** `MapLayerUpdates.spatialFilter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

describe("spatial filter updates", () => {
  it("filters a layer by the given area layer", () => {
    const buffer = MapLayer.createArea("Buffer of Sites");

    const updated = MapLayerUpdates.withSpatialFilter({
      layer: MapLayer.makeEmpty("Schools"),
      spatialFilterLayerId: buffer.id,
    });

    expect(updated.spatialFilter).toEqual({ layerId: buffer.id });
  });

  it("clears the spatial filter", () => {
    const buffer = MapLayer.createArea("Buffer of Sites");
    const layer = {
      ...MapLayer.makeEmpty("Schools"),
      spatialFilter: { layerId: buffer.id },
    };

    expect(
      MapLayerUpdates.withSpatialFilter({
        layer,
        spatialFilterLayerId: undefined,
      }).spatialFilter,
    ).toBeUndefined();
  });

  it("returns the same layer when the filter is unchanged", () => {
    const layer = MapLayer.makeEmpty("Schools");

    expect(
      MapLayerUpdates.withSpatialFilter({
        layer,
        spatialFilterLayerId: undefined,
      }),
    ).toBe(layer);
  });
});
```

`SpatialFilterSelect.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { SpatialFilterSelect } from "@/views/GisApp/panels/LayerInspector/FilterSection/SpatialFilterSelect";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

function _makePointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

describe("SpatialFilterSelect", () => {
  it("offers only other layers that output polygons", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");
    render(
      <SpatialFilterSelect
        layer={schools}
        layers={[sites, buffer, schools]}
        onLayerChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("combobox", { name: "Only show features inside" }),
    );

    expect(
      screen.getAllByRole("option", { hidden: true }).map((option) => {
        return option.textContent;
      }),
    ).toEqual(["Buffer of Sites"]);
  });

  it("filters the layer by the picked area layer", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(
      <SpatialFilterSelect
        layer={schools}
        layers={[sites, buffer, schools]}
        onLayerChange={onLayerChange}
      />,
    );

    pickMantineSelectOption("Only show features inside", "Buffer of Sites");

    const update = onLayerChange.mock.calls[0]![0];
    expect(update(schools).spatialFilter).toEqual({ layerId: buffer.id });
  });
});
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/views/GisApp/layers/MapLayerUpdates src/views/GisApp/panels/LayerInspector/FilterSection
```

Expected: FAIL with `MapLayerUpdates.withSpatialFilter is not a function` and `Failed to resolve import ".../SpatialFilterSelect"`.

- [ ] **Step 3: Implement the updater.** `spatialFilterUpdates.ts`:

```ts
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

function _withSpatialFilter(
  options: Readonly<{
    layer: MapLayer.T;
    spatialFilterLayerId: MapLayer.Id | undefined;
  }>,
): MapLayer.T {
  const { layer, spatialFilterLayerId } = options;
  if (layer.spatialFilter?.layerId === spatialFilterLayerId) {
    return layer;
  }
  return {
    ...layer,
    spatialFilter: spatialFilterLayerId
      ? { layerId: spatialFilterLayerId }
      : undefined,
  };
}

/** Spatial filter updates for a map layer. */
export const spatialFilterUpdates = {
  /**
   * Keeps only features inside the given layer's polygons, or clears the
   * filter when the id is `undefined`.
   */
  withSpatialFilter: _withSpatialFilter,
};
```

In `MapLayerUpdates.ts`, add `import { spatialFilterUpdates } from "./spatialFilterUpdates";` and `...spatialFilterUpdates,` to the object.

- [ ] **Step 4: Implement the select.** `SpatialFilterSelect.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { getSpatialFilterCandidatesFromLayers } from "$/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers/getSpatialFilterCandidatesFromLayers";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  layers: readonly MapLayer.T[];
  onLayerChange: LayerChangeHandler;
};

/**
 * Picks the area layer whose shapes this layer's features must fall inside,
 * such as a buffer around exposure sites. Rendered by `FilterSection` beside
 * the area filter switch; only layers that output polygons and do not depend
 * on this layer are offered.
 */
export function SpatialFilterSelect({
  layer,
  layers,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const candidates = getSpatialFilterCandidatesFromLayers({
    layers,
    layerId: layer.id,
  });
  return (
    <Select<MapLayer.Id>
      label={t`Only show features inside`}
      placeholder={t`Anywhere`}
      description={
        candidates.length === 0
          ? t`Add an area layer, such as a buffer, to filter by it.`
          : undefined
      }
      data={candidates.map((candidate) => {
        return { value: candidate.id, label: candidate.name };
      })}
      value={layer.spatialFilter?.layerId ?? null}
      disabled={candidates.length === 0}
      clearable
      onChange={(spatialFilterLayerId) => {
        onLayerChange((current) => {
          return MapLayerUpdates.withSpatialFilter({
            layer: current,
            spatialFilterLayerId: spatialFilterLayerId ?? undefined,
          });
        });
      }}
    />
  );
}
```

- [ ] **Step 5: Render it.** In `FilterSection.tsx`, add `layers?: readonly MapLayer.T[];` to `Props`, a module constant `const EMPTY_LAYERS: readonly MapLayer.T[] = [];`, `layers = EMPTY_LAYERS,` to the destructured props, import `SpatialFilterSelect`, and replace the switch block with:

```tsx
      {showSwitch ? (
        <>
          <ApplyAoiFilterSwitch layer={layer} onLayerChange={onLayerChange} />
          <SpatialFilterSelect
            layer={layer}
            layers={layers}
            onLayerChange={onLayerChange}
          />
        </>
      ) : null}
```

In `LayerInspectorSections.tsx`, add `layers={layers}` to the `<FilterSection ... />` element.

- [ ] **Step 6: Run and see them pass.** Same command as Step 2. Expected: PASS, including the existing `FilterSection.test.tsx`. If one of its queries now matches two comboboxes, narrow it with the `name` option; do not remove the new select.

- [ ] **Step 7: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/views/GisApp/layers/MapLayerUpdates src/views/GisApp/panels/LayerInspector/FilterSection src/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorSections.tsx
git commit -m "feat(gis): let a layer show only features inside another layer"
```

---

## Task 17: Buffer tool: units, ring labels, lat/lng sources, the filter step, and its wiring

**Files:**
- Create: `src/views/GisApp/layers/BufferDistanceUnit.constants.ts`
- Create: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types.ts`
- Create: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/getBufferFilterTargetsFromLayers/getBufferFilterTargetsFromLayers.ts`
- Create: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferFilterStep.tsx`
- Modify: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolForm.tsx` (whole file)
- Modify: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolPopover.tsx` (whole file)
- Modify: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.tsx` (whole file)
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.tsx` (whole file)
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx:20-32, 68-72`
- Test: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/getBufferFilterTargetsFromLayers/getBufferFilterTargetsFromLayers.test.ts`
- Test: `src/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.test.tsx`
- Test: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx`

The tool cluster's call site changes in this same task, so the new `onBufferConfirm` signature (it returns the new buffer's id) never leaves the tree uncompilable.

- [ ] **Step 1: Write the failing tests.** `getBufferFilterTargetsFromLayers.test.ts`:

```ts
import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getBufferFilterTargetsFromLayers } from "./getBufferFilterTargetsFromLayers";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

function _makePointLayer(name: string): MapLayer.T {
  return {
    ...MapLayer.makeEmpty(name),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

describe("getBufferFilterTargetsFromLayers", () => {
  it("offers point layers other than the buffer's own source", () => {
    const sites = _makePointLayer("Sites");
    const buffer = _makeBufferOf(sites);
    const schools = _makePointLayer("Schools");
    const zipCodes = MapLayer.createArea("ZIP codes");

    const targets = getBufferFilterTargetsFromLayers({
      layers: [sites, buffer, schools, zipCodes],
      bufferLayerId: buffer.id,
    });

    expect(targets.map(prop("name"))).toEqual(["Schools"]);
  });

  it("offers nothing until the buffer is on the map", () => {
    expect(
      getBufferFilterTargetsFromLayers({
        layers: [_makePointLayer("Schools")],
        bufferLayerId: uuid<MapLayer.Id>(),
      }),
    ).toEqual([]);
  });
});
```

In `BufferMapTool.test.tsx`:
  1. Delete the test "disables confirm when the selected layer is latitude and longitude columns".
  2. Change the expectation of "confirms a polygon layer at 1000 m without dissolve" to:

```ts
    expect(onBufferConfirm).toHaveBeenCalledWith({
      distanceMeters: 1000,
      distanceUnit: "m",
      dissolve: false,
      labelColumn: undefined,
    });
```

  3. Add imports `import { Model } from "@avandar/models";`, `import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";` (replace the type-only import), `import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";`, and types `Dataset`, `DatasetColumn`, `Workspace`; add these helpers below `_createPolygonLayer`:

```tsx
function _makeQueryColumn(name: string): QueryColumn.T {
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      createdAt: "2026-11-09T00:00:00.000Z",
      updatedAt: "2026-11-09T00:00:00.000Z",
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx: 0,
    }),
  );
}

function _createLatLngLayer(name: string): MapLayer.T {
  const siteName = _makeQueryColumn("site_name");
  const layer = MapLayer.makeEmpty(name);
  return {
    ...layer,
    source: { ...layer.source, queryColumns: [siteName] },
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

async function _openBufferForm(): Promise<void> {
  fireEvent.click(
    screen.getByRole("button", { name: "Buffer around a layer" }),
  );
  await screen.findByRole("button", { name: "Confirm" });
}
```

  4. Add these tests:

```tsx
  it("offers buffering a latitude and longitude layer", () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={_createLatLngLayer("Sites")}
        onBufferConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Buffer around a layer" }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("stores half a mile as 805 meters", async () => {
    spatialAvailability.value = "available";
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool
        selectedLayer={_createPolygonLayer()}
        onBufferConfirm={onBufferConfirm}
      />,
    );

    await _openBufferForm();
    fireEvent.change(screen.getByRole("textbox", { name: "Distance" }), {
      target: { value: "0.5" },
    });
    pickMantineSelectOption("Unit", "mi");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onBufferConfirm).toHaveBeenCalledWith({
      distanceMeters: 805,
      distanceUnit: "mi",
      dissolve: false,
      labelColumn: undefined,
    });
  });

  it("carries the chosen ring label column", async () => {
    spatialAvailability.value = "available";
    const sites = _createLatLngLayer("Sites");
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool selectedLayer={sites} onBufferConfirm={onBufferConfirm} />,
    );

    await _openBufferForm();
    pickMantineSelectOption("Label each ring with", "site_name");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onBufferConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        labelColumn: sites.source.queryColumns[0]!.id,
      }),
    );
  });

  it("offers to filter a point layer by the new buffer", async () => {
    spatialAvailability.value = "available";
    const sites = _createLatLngLayer("Sites");
    const schools = _createLatLngLayer("Schools");
    const buffer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Sites"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: sites.id,
        distanceMeters: 805,
        distanceUnit: "mi",
        labelColumn: undefined,
        dissolve: false,
      },
    };
    const onFilterByBuffer = vi.fn();
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, buffer, schools]}
        onBufferConfirm={() => {
          return buffer.id;
        }}
        onFilterByBuffer={onFilterByBuffer}
      />,
    );

    await _openBufferForm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    pickMantineSelectOption("Filter another layer by this buffer", "Schools");
    fireEvent.click(
      screen.getByRole("button", { name: "Filter and show list" }),
    );

    expect(onFilterByBuffer).toHaveBeenCalledWith({
      bufferLayerId: buffer.id,
      targetLayerId: schools.id,
    });
  });
```

Finally, for the call site: in `MapToolCluster.test.tsx`, add `import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";` and append inside the main `describe`:

```tsx
  it("filters the picked point layer by the new buffer and opens its list", async () => {
    spatialAvailability.value = "available";
    const makePointLayer = (name: string): MapLayer.T => {
      return {
        ...MapLayer.makeEmpty(name),
        geoBinding: {
          type: "latLngColumns",
          latitude: uuid<QueryColumn.Id>(),
          longitude: uuid<QueryColumn.Id>(),
        },
      };
    };
    const sites = makePointLayer("Sites");
    const schools = makePointLayer("Schools");
    let config = { ...AvaMapConfig.makeEmpty(), layers: [sites, schools] };
    const updateConfig = vi.fn(
      (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
        config = update(config);
      },
    );
    const onOpenFeatureList = vi.fn();
    const renderCluster = () => {
      return (
        <MapToolCluster
          mapToolMode={{ type: "pan" }}
          onMapToolModeChange={vi.fn()}
          selectedLayer={sites}
          updateConfig={updateConfig}
          layers={config.layers}
          onOpenFeatureList={onOpenFeatureList}
        />
      );
    };
    const { rerender } = render(renderCluster());

    fireEvent.click(
      screen.getByRole("button", { name: "Buffer around a layer" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    rerender(renderCluster());
    pickMantineSelectOption("Filter another layer by this buffer", "Schools");
    fireEvent.click(
      screen.getByRole("button", { name: "Filter and show list" }),
    );

    const buffer = config.layers.find((layer) => {
      return layer.geoBinding?.type === "bufferOfLayer";
    });
    const filteredSchools = config.layers.find((layer) => {
      return layer.id === schools.id;
    });
    expect(filteredSchools?.spatialFilter).toEqual({ layerId: buffer?.id });
    expect(onOpenFeatureList).toHaveBeenCalledWith(schools.id);
  });
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster
```

Expected: FAIL. The lat/lng layer is still refused, the form has no "Unit" or "Label each ring with" control, `getBufferFilterTargetsFromLayers` cannot be resolved, and the cluster test never sees "Filter another layer by this buffer" because the popover closes after Confirm.

- [ ] **Step 3: Add the unit labels and types.** `src/views/GisApp/layers/BufferDistanceUnit.constants.ts`:

```ts
import { msg } from "@lingui/core/macro";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MessageDescriptor } from "@lingui/core";

/**
 * Short labels for each buffer distance unit, for the buffer form's unit
 * picker and for distances shown in a feature list or its CSV.
 */
export const BUFFER_DISTANCE_UNIT_LABELS: Readonly<
  Record<MapLayer.BufferDistanceUnit, MessageDescriptor>
> = {
  m: msg`m`,
  km: msg`km`,
  ft: msg`ft`,
  mi: msg`mi`,
};
```

`BufferMapTool.types.ts`:

```ts
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/** What the buffer tool asks to insert when the author confirms. */
export type BufferConfirmOptions = {
  distanceMeters: number;
  distanceUnit: MapLayer.BufferDistanceUnit;
  dissolve: boolean;
  labelColumn: QueryColumn.Id | undefined;
};

/** The point layer the author chose to filter by the buffer just added. */
export type FilterByBufferOptions = {
  bufferLayerId: MapLayer.Id;
  targetLayerId: MapLayer.Id;
};

/** A source column offered as a ring label. */
export type BufferLabelColumnOption = { value: QueryColumn.Id; label: string };
```

- [ ] **Step 4: Implement the target list.** `getBufferFilterTargetsFromLayers.ts`:

```ts
import { propEq } from "@avandar/utils";
import { hasSpatialFilterCycle } from "$/models/AvaMap/AvaMapConfig/hasSpatialFilterCycle/hasSpatialFilterCycle";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Point layers a buffer just added can filter without a dependency loop.
 * Read by `BufferFilterStep` for its "Filter another layer by this buffer"
 * picker. The buffer's own source is never offered, since filtering it by
 * its own buffer is a loop; nothing is offered until the buffer is on the
 * map.
 */
export function getBufferFilterTargetsFromLayers(
  options: Readonly<{
    layers: readonly MapLayer.T[];
    bufferLayerId: MapLayer.Id;
  }>,
): MapLayer.T[] {
  const { layers, bufferLayerId } = options;
  if (!layers.some(propEq("id", bufferLayerId))) {
    return [];
  }
  return layers.filter((target) => {
    if (!MapLayer.isPointGeoBinding(target.geoBinding)) {
      return false;
    }
    const filteredLayers = layers.map((layer) => {
      return layer.id === target.id
        ? { ...layer, spatialFilter: { layerId: bufferLayerId } }
        : layer;
    });
    return !hasSpatialFilterCycle(filteredLayers, target.id);
  });
}
```

- [ ] **Step 5: Implement the filter step.** `BufferFilterStep.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { getBufferFilterTargetsFromLayers } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/getBufferFilterTargetsFromLayers/getBufferFilterTargetsFromLayers";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layers: readonly MapLayer.T[];
  bufferLayerId: MapLayer.Id;
  onFilter: (targetLayerId: MapLayer.Id) => void;
  onDone: () => void;
};

/**
 * The buffer tool's second step: offers to filter a point layer by the
 * buffer just added and open that layer's feature list. Rendered by
 * `BufferMapToolPopover` after a confirm.
 */
export function BufferFilterStep({
  layers,
  bufferLayerId,
  onFilter,
  onDone,
}: Props): ReactNode {
  const { t } = useLingui();
  const [targetLayerId, setTargetLayerId] = useState<MapLayer.Id>();
  const targets = getBufferFilterTargetsFromLayers({ layers, bufferLayerId });
  return (
    <Stack gap="xs" maw={280}>
      <Text size="sm">{t`Buffer added.`}</Text>
      <Select<MapLayer.Id>
        label={t`Filter another layer by this buffer`}
        placeholder={t`Pick a point layer`}
        data={targets.map((target) => {
          return { value: target.id, label: target.name };
        })}
        value={targetLayerId ?? null}
        onChange={(value) => {
          setTargetLayerId(value ?? undefined);
        }}
      />
      <Group gap="xs">
        <Button
          size="compact-sm"
          disabled={!targetLayerId}
          onClick={() => {
            if (targetLayerId) {
              onFilter(targetLayerId);
            }
          }}
        >
          {t`Filter and show list`}
        </Button>
        <Button size="compact-sm" variant="subtle" color="neutral" onClick={onDone}>
          {t`Done`}
        </Button>
      </Group>
    </Stack>
  );
}
```

- [ ] **Step 6: Rewrite the form.** `BufferMapToolForm.tsx`:

```tsx
import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import {
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
} from "@mantine/core";
import { BUFFER_DISTANCE_UNITS } from "$/models/AvaMap/MapLayer/MapLayer";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { BufferLabelColumnOption } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
import type { ReactNode } from "react";

type Props = {
  distance: number;
  distanceUnit: MapLayer.BufferDistanceUnit;
  dissolve: boolean;
  labelColumn: QueryColumn.Id | undefined;
  labelColumnOptions: readonly BufferLabelColumnOption[];
  onDistanceChange: (distance: number) => void;
  onDistanceUnitChange: (distanceUnit: MapLayer.BufferDistanceUnit) => void;
  onDissolveChange: (dissolve: boolean) => void;
  onLabelColumnChange: (labelColumn: QueryColumn.Id | undefined) => void;
  onConfirm: () => void;
};

/**
 * Distance, unit, dissolve, ring label, and confirm controls for inserting a
 * buffer layer. Rendered by `BufferMapToolPopover`.
 */
export function BufferMapToolForm({
  distance,
  distanceUnit,
  dissolve,
  labelColumn,
  labelColumnOptions,
  onDistanceChange,
  onDistanceUnitChange,
  onDissolveChange,
  onLabelColumnChange,
  onConfirm,
}: Props): ReactNode {
  const { i18n, t } = useLingui();
  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap" align="flex-end">
        <NumberInput
          label={t`Distance`}
          value={distance}
          min={0}
          allowNegative={false}
          decimalScale={3}
          onChange={(value) => {
            if (isNumber(value)) {
              onDistanceChange(value);
            }
          }}
        />
        <Select<MapLayer.BufferDistanceUnit>
          label={t`Unit`}
          w={88}
          allowDeselect={false}
          value={distanceUnit}
          data={BUFFER_DISTANCE_UNITS.map((unit) => {
            return { value: unit, label: i18n._(BUFFER_DISTANCE_UNIT_LABELS[unit]) };
          })}
          onChange={(unit) => {
            if (unit) {
              onDistanceUnitChange(unit);
            }
          }}
        />
      </Group>
      <Switch
        label={t`Dissolve`}
        checked={dissolve}
        onChange={(event) => {
          onDissolveChange(event.currentTarget.checked);
        }}
      />
      {labelColumnOptions.length > 0 ? (
        <Select<QueryColumn.Id>
          label={t`Label each ring with`}
          placeholder={t`No label`}
          clearable
          disabled={dissolve}
          data={[...labelColumnOptions]}
          value={labelColumn ?? null}
          onChange={(value) => {
            onLabelColumnChange(value ?? undefined);
          }}
        />
      ) : null}
      <Button size="compact-sm" onClick={onConfirm}>
        {t`Confirm`}
      </Button>
    </Stack>
  );
}
```

- [ ] **Step 7: Rewrite the popover.** `BufferMapToolPopover.tsx`:

```tsx
import { Popover } from "@mantine/core";
import { useState } from "react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { BufferFilterStep } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferFilterStep";
import { BufferMapToolForm } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolForm";
import { BufferMapToolTrigger } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolTrigger";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type {
  BufferConfirmOptions,
  BufferLabelColumnOption,
  FilterByBufferOptions,
} from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  label: string;
  icon: ReactNode;
  layers: readonly MapLayer.T[];
  labelColumnOptions: readonly BufferLabelColumnOption[];
  canFilterAnotherLayer: boolean;
  onBufferConfirm: (options: BufferConfirmOptions) => MapLayer.Id | undefined;
  onFilterByBuffer: (options: FilterByBufferOptions) => void;
};

/** Smallest buffer distance the tool inserts, in meters. */
const MIN_BUFFER_DISTANCE_METERS = 100;

/** Largest buffer distance the tool inserts, in meters. */
const MAX_BUFFER_DISTANCE_METERS = 1_000_000;

type BufferFormState = {
  distance: number;
  distanceUnit: MapLayer.BufferDistanceUnit;
  dissolve: boolean;
  labelColumn: QueryColumn.Id | undefined;
  setDistance: (distance: number) => void;
  setDistanceUnit: (distanceUnit: MapLayer.BufferDistanceUnit) => void;
  setDissolve: (dissolve: boolean) => void;
  setLabelColumn: (labelColumn: QueryColumn.Id | undefined) => void;
  reset: () => void;
};

/** The form's values, reset to 1000 m each time the popover opens. */
function useBufferFormState(): BufferFormState {
  const [distance, setDistance] = useState<number>(
    MapLayer.defaultBufferDistanceMeters,
  );
  const [distanceUnit, setDistanceUnit] =
    useState<MapLayer.BufferDistanceUnit>("m");
  const [dissolve, setDissolve] = useState(false);
  const [labelColumn, setLabelColumn] = useState<QueryColumn.Id>();
  const reset = (): void => {
    setDistance(MapLayer.defaultBufferDistanceMeters);
    setDistanceUnit("m");
    setDissolve(false);
    setLabelColumn(undefined);
  };
  return {
    distance,
    distanceUnit,
    dissolve,
    labelColumn,
    setDistance,
    setDistanceUnit,
    setDissolve,
    setLabelColumn,
    reset,
  };
}

function _makeConfirmOptions(form: BufferFormState): BufferConfirmOptions {
  const distanceMeters = MapLayer.getMetersFromBufferDistance({
    distance: form.distance,
    unit: form.distanceUnit,
  });
  return {
    distanceMeters: Math.min(
      MAX_BUFFER_DISTANCE_METERS,
      Math.max(MIN_BUFFER_DISTANCE_METERS, distanceMeters),
    ),
    distanceUnit: form.distanceUnit,
    dissolve: form.dissolve,
    labelColumn: form.dissolve ? undefined : form.labelColumn,
  };
}

function _makeFormProps(
  form: BufferFormState,
  labelColumnOptions: readonly BufferLabelColumnOption[],
  onConfirm: () => void,
): ComponentProps<typeof BufferMapToolForm> {
  return {
    distance: form.distance,
    distanceUnit: form.distanceUnit,
    dissolve: form.dissolve,
    labelColumn: form.labelColumn,
    labelColumnOptions,
    onDistanceChange: form.setDistance,
    onDistanceUnitChange: form.setDistanceUnit,
    onDissolveChange: form.setDissolve,
    onLabelColumnChange: form.setLabelColumn,
    onConfirm,
  };
}

/**
 * Popover that confirms a buffer's distance, unit, dissolve, and ring label,
 * then offers to filter a point layer by the new buffer.
 */
export function BufferMapToolPopover({
  label,
  icon,
  layers,
  labelColumnOptions,
  canFilterAnotherLayer,
  onBufferConfirm,
  onFilterByBuffer,
}: Props): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [createdBufferLayerId, setCreatedBufferLayerId] =
    useState<MapLayer.Id>();
  const form = useBufferFormState();
  const close = (): void => {
    setIsOpen(false);
    setCreatedBufferLayerId(undefined);
  };
  const onConfirm = (): void => {
    const bufferLayerId = onBufferConfirm(_makeConfirmOptions(form));
    if (bufferLayerId && canFilterAnotherLayer) {
      setCreatedBufferLayerId(bufferLayerId);
      return;
    }
    close();
  };
  return (
    <Popover
      opened={isOpen}
      onDismiss={close}
      position="top"
      withArrow
      shadow="md"
      withinPortal
      transitionProps={{ duration: 0 }}
    >
      <Popover.Target>
        <BufferMapToolTrigger
          label={label}
          icon={icon}
          isOpen={isOpen}
          onClick={() => {
            form.reset();
            setCreatedBufferLayerId(undefined);
            setIsOpen((current) => {
              return !current;
            });
          }}
        />
      </Popover.Target>
      <Popover.Dropdown p="sm">
        {createdBufferLayerId ? (
          <BufferFilterStep
            layers={layers}
            bufferLayerId={createdBufferLayerId}
            onFilter={(targetLayerId) => {
              onFilterByBuffer({
                bufferLayerId: createdBufferLayerId,
                targetLayerId,
              });
              close();
            }}
            onDone={close}
          />
        ) : (
          <BufferMapToolForm
            {..._makeFormProps(form, labelColumnOptions, onConfirm)}
          />
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
```

- [ ] **Step 8: Rewrite the tool.** `BufferMapTool.tsx`:

```tsx
import { noop } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconCircleDashed } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { BufferMapToolPopover } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolPopover";
import { UnavailableMapTool } from "@/views/GisApp/shell/MapToolCluster/UnavailableMapTool";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type {
  BufferConfirmOptions,
  BufferLabelColumnOption,
  FilterByBufferOptions,
} from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  selectedLayer: MapLayer.T | undefined;
  layers?: readonly MapLayer.T[];
  onBufferConfirm: (options: BufferConfirmOptions) => MapLayer.Id | undefined;
  onFilterByBuffer?: (options: FilterByBufferOptions) => void;
};

const EMPTY_LAYERS: readonly MapLayer.T[] = [];

function _subscribeSpatialAvailability(listener: () => void): () => void {
  return DuckDbClient.subscribeSpatialAvailability(listener);
}

function _getSpatialAvailability(): DuckDbSpatialAvailability {
  return DuckDbClient.getSpatialAvailability();
}

function _bufferUnavailableReason(
  i18n: I18n,
  availability: DuckDbSpatialAvailability,
  selectedLayer: MapLayer.T | undefined,
): string | undefined {
  if (availability === "loading") {
    return i18n._(
      msg`This tool turns on when geometry support finishes downloading.`,
    );
  }
  if (availability !== "available") {
    return i18n._(
      msg`This tool needs geometry support, which could not be loaded.`,
    );
  }
  if (!selectedLayer) {
    return i18n._(msg`Select a data layer to buffer.`);
  }
  if (!selectedLayer.geoBinding) {
    return i18n._(msg`Bind geometry on the selected layer to buffer it.`);
  }
  return undefined;
}

/** Source columns a ring can carry: only for layers drawn from rows. */
function _getLabelColumnOptions(
  layer: MapLayer.T | undefined,
): BufferLabelColumnOption[] {
  const bindingType = layer?.geoBinding?.type;
  if (bindingType !== "latLngColumns" && bindingType !== "geometryColumn") {
    return [];
  }
  return (layer?.source.queryColumns ?? []).map((column) => {
    return {
      value: column.id,
      label: QueryColumn.getDerivedColumnName(column),
    };
  });
}

/**
 * Buffer tool: inserts a buffer of the selected data layer, then offers to
 * filter a point layer by it.
 */
export function BufferMapTool({
  selectedLayer,
  layers = EMPTY_LAYERS,
  onBufferConfirm,
  onFilterByBuffer = noop,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const availability = useSyncExternalStore(
    _subscribeSpatialAvailability,
    _getSpatialAvailability,
    _getSpatialAvailability,
  );
  const label = i18n._(msg`Buffer around a layer`);
  const icon = <IconCircleDashed size={17} stroke={1.6} />;
  const reason = _bufferUnavailableReason(i18n, availability, selectedLayer);
  if (reason) {
    return <UnavailableMapTool icon={icon} label={label} reason={reason} />;
  }
  return (
    <BufferMapToolPopover
      label={label}
      icon={icon}
      layers={layers}
      labelColumnOptions={_getLabelColumnOptions(selectedLayer)}
      canFilterAnotherLayer={layers.some((layer) => {
        return (
          layer.id !== selectedLayer?.id &&
          MapLayer.isPointGeoBinding(layer.geoBinding)
        );
      })}
      onBufferConfirm={onBufferConfirm}
      onFilterByBuffer={onFilterByBuffer}
    />
  );
}
```

- [ ] **Step 9: Wire the tool cluster.** Replace `MapToolCluster.tsx` with:

```tsx
import { noop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { MapToolClusterToolbar } from "@/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar";
import { MeasureReadout } from "@/views/GisApp/shell/MapToolCluster/MeasureReadout";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type {
  BufferConfirmOptions,
  FilterByBufferOptions,
} from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
  selectedLayer?: MapLayer.T;
  updateConfig?: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  measureVertices?: ReadonlyArray<[number, number]>;
  layers?: readonly MapLayer.T[];
  featureCollections?: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  requestFitBounds?: (bounds: MapBounds) => void;

  /** Opens a layer's feature list, after the buffer tool filters it. */
  onOpenFeatureList?: (layerId: MapLayer.Id) => void;
};

const EMPTY_MEASURE_VERTICES: ReadonlyArray<[number, number]> = [];

/** Inserts the confirmed buffer under a fresh id and returns that id. */
function useBufferConfirmHandler(
  selectedLayer: MapLayer.T | undefined,
  updateConfig: Props["updateConfig"],
): (options: BufferConfirmOptions) => MapLayer.Id | undefined {
  const { t } = useLingui();
  return (options) => {
    if (!selectedLayer || !updateConfig) {
      return undefined;
    }
    const sourceName = selectedLayer.name;
    const name = t`Buffer of ${sourceName}`;
    const bufferLayerId = uuid<MapLayer.Id>();
    updateConfig((current) => {
      return AvaMapConfig.withBufferLayerInserted({
        config: current,
        sourceLayerId: selectedLayer.id,
        ...options,
        name,
        bufferLayerId,
      });
    });
    return bufferLayerId;
  };
}

/** Filters the chosen point layer by the new buffer and opens its list. */
function _filterLayerByBuffer(
  options: Readonly<
    FilterByBufferOptions & {
      updateConfig: Props["updateConfig"];
      onOpenFeatureList: (layerId: MapLayer.Id) => void;
    }
  >,
): void {
  options.updateConfig?.((current) => {
    return AvaMapConfig.withLayerReplaced({
      config: current,
      layerId: options.targetLayerId,
      update: (layer) => {
        return MapLayerUpdates.withSpatialFilter({
          layer,
          spatialFilterLayerId: options.bufferLayerId,
        });
      },
    });
  });
  options.onOpenFeatureList(options.targetLayerId);
}

/** Renders the stable toolbar layout and its available tool states. */
export function MapToolCluster({
  mapToolMode,
  onMapToolModeChange,
  selectedLayer,
  updateConfig,
  measureVertices = EMPTY_MEASURE_VERTICES,
  layers,
  featureCollections,
  requestFitBounds = noop,
  onOpenFeatureList = noop,
}: Readonly<Props>): ReactNode {
  const onBufferConfirm = useBufferConfirmHandler(selectedLayer, updateConfig);
  return (
    <>
      <MeasureReadout vertices={measureVertices} />
      <MapToolClusterToolbar
        mapToolMode={mapToolMode}
        onMapToolModeChange={onMapToolModeChange}
        selectedLayer={selectedLayer}
        onBufferConfirm={onBufferConfirm}
        onFilterByBuffer={(filter) => {
          _filterLayerByBuffer({ ...filter, updateConfig, onOpenFeatureList });
        }}
        layers={layers}
        featureCollections={featureCollections}
        requestFitBounds={requestFitBounds}
      />
    </>
  );
}
```

In `MapToolClusterToolbar.tsx`, import the two option types, replace the `onBufferConfirm` prop type with `onBufferConfirm: (options: BufferConfirmOptions) => MapLayer.Id | undefined;`, add `onFilterByBuffer: (options: FilterByBufferOptions) => void;`, destructure it, and render the tool as:

```tsx
      <BufferMapTool
        selectedLayer={selectedLayer}
        layers={layers}
        onBufferConfirm={onBufferConfirm}
        onFilterByBuffer={onFilterByBuffer}
      />
```

`MapToolCluster`'s `onOpenFeatureList` is optional and defaults to `noop`; Task 18 passes `app.openFeatureList` from `GisAppMapToolCluster`.

- [ ] **Step 10: Run and see them pass.**

```bash
pnpm vitest run src/views/GisApp/shell/MapToolCluster
```

Expected: PASS, including "inserts a named buffer layer" (updated in Task 1 to expect `distanceUnit: "m"`).

- [ ] **Step 11: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/views/GisApp/layers/BufferDistanceUnit.constants.ts src/views/GisApp/shell/MapToolCluster
git commit -m "feat(gis): buffer in friendly units, label rings, and offer to filter by a buffer"
```

---

## Task 18: Which layer's feature list is open, the layer menu item, and the buffer tool's link

**Files:**
- Create: `src/views/GisApp/useGisApp/useGisAppFeatureList.ts`
- Modify: `src/views/GisApp/useGisApp/useGisAppState.ts:160-240`
- Modify: `src/views/GisApp/useGisAppLayerActions.tsx:13-22, 190-210`
- Modify: `src/views/GisApp/GisAppMapToolCluster.tsx`
- Modify: `src/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionItems.tsx`
- Modify: `src/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu.tsx`
- Modify: `src/views/GisApp/panels/LayerPanel/LayerRow/LayerRow.tsx`
- Modify: `src/views/GisApp/panels/LayerPanel/LayerList/LayerRows.tsx`, `OrderedLayerRows.tsx`, `LayerList.tsx`
- Test: `src/views/GisApp/useGisApp/useGisAppFeatureList.test.ts`
- Test: `src/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu.test.tsx`
- Test: `src/views/GisApp/panels/LayerPanel/LayerRow/LayerRow.test.tsx`

- [ ] **Step 1: Write the failing tests.** `useGisAppFeatureList.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { act, renderHook } from "@/test-utils";
import { useGisAppFeatureList } from "@/views/GisApp/useGisApp/useGisAppFeatureList";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

describe("useGisAppFeatureList", () => {
  it("remembers the opened layer until the list closes", () => {
    const layerId = uuid<MapLayer.Id>();
    const { result } = renderHook(() => {
      return useGisAppFeatureList();
    });

    act(() => {
      result.current.openFeatureList(layerId);
    });
    expect(result.current.featureListLayerId).toBe(layerId);

    act(() => {
      result.current.closeFeatureList();
    });
    expect(result.current.featureListLayerId).toBeUndefined();
  });
});
```

Append to `LayerActionsMenu.test.tsx` inside its `describe`:

```tsx
  it("offers the feature list when the row allows one", async () => {
    const onOpenFeatureList = vi.fn();
    render(
      <LayerActionsMenu
        layerName={LAYER_NAME}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onZoomToLayer={vi.fn()}
        onDelete={vi.fn()}
        onOpenFeatureList={onOpenFeatureList}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "More actions for the layer Population",
      }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "Feature list",
        hidden: true,
      }),
    );

    expect(onOpenFeatureList).toHaveBeenCalledOnce();
  });
```

In `LayerRow.test.tsx`, replace the `LayerActionsMenu` mock with:

```tsx
vi.mock(
  "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu",
  () => {
    return {
      LayerActionsMenu: ({
        onOpenFeatureList,
      }: {
        onOpenFeatureList?: () => void;
      }) => {
        return onOpenFeatureList ? <span>Feature list offered</span> : null;
      },
    };
  },
);
```

add `import { uuid } from "$/lib/uuid";` and `import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";`, and append:

```tsx
  it.each([
    { mode: "exact" as const, isOffered: true },
    { mode: "aggregateOnly" as const, isOffered: false },
  ])(
    "offers a feature list for a $mode point layer: $isOffered",
    ({ mode, isOffered }) => {
      const pointLayer: MapLayer.T = {
        ...MapLayer.makeEmpty("Schools"),
        geoBinding: {
          type: "latLngColumns",
          latitude: uuid<QueryColumn.Id>(),
          longitude: uuid<QueryColumn.Id>(),
        },
      };
      const layer =
        mode === "exact"
          ? pointLayer
          : MapLayer.withSensitivity(pointLayer, {
              mode,
              minCellCount: 5,
              minGeoLevel: "district",
            });
      render(
        <DragDropProvider>
          <LayerRow
            layer={layer}
            viewState={VIEW_STATE}
            isSelected={false}
            rowIndex={0}
            onSelect={vi.fn()}
            onToggleVisible={vi.fn()}
            onMoveByOffset={vi.fn()}
            onRename={vi.fn()}
            onDuplicate={vi.fn()}
            onZoomToLayer={vi.fn()}
            onDelete={vi.fn()}
            onOpenFeatureList={vi.fn()}
          />
        </DragDropProvider>,
      );

      expect(screen.queryByText("Feature list offered") !== null).toBe(
        isOffered,
      );
    },
  );
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/views/GisApp/useGisApp/useGisAppFeatureList.test.ts src/views/GisApp/panels/LayerPanel
```

Expected: FAIL. The hook cannot be resolved, there is no "Feature list" menu item, and `LayerRow` does not pass `onOpenFeatureList`.

- [ ] **Step 3: Implement the state.** `useGisAppFeatureList.ts`:

```ts
import { useCallback, useState } from "react";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Which layer's feature list drawer is open, and how to open or close it. */
export type GisAppFeatureList = {
  featureListLayerId: MapLayer.Id | undefined;
  openFeatureList: (layerId: MapLayer.Id) => void;
  closeFeatureList: () => void;
};

/**
 * Holds which layer's feature list drawer is open for the GIS shell. The
 * layer menu and the buffer tool open it; the drawer's close button shuts
 * it.
 */
export function useGisAppFeatureList(): GisAppFeatureList {
  const [featureListLayerId, setFeatureListLayerId] = useState<MapLayer.Id>();
  const openFeatureList = useCallback((layerId: MapLayer.Id) => {
    setFeatureListLayerId(layerId);
  }, []);
  const closeFeatureList = useCallback(() => {
    setFeatureListLayerId(undefined);
  }, []);
  return { featureListLayerId, openFeatureList, closeFeatureList };
}
```

In `useGisAppState.ts`: import it; add `ReturnType<typeof useGisAppFeatureList> &` to the return type intersection; add `const featureList = useGisAppFeatureList();` after `const toolMode = useGisAppToolMode();`; add `...featureList,` to the returned object.

In `GisAppMapToolCluster.tsx`, add `onOpenFeatureList={app.openFeatureList}` to `<MapToolCluster ... />` (the prop exists since Task 17), so "Filter and show list" opens the drawer.

In `useGisAppLayerActions.tsx`: add `onOpenFeatureList: GisAppLayerAction;` to `GisAppLayerActions`, and `onOpenFeatureList: app.openFeatureList,` to the object `useGisAppLayerActions` returns.

- [ ] **Step 4: Implement the menu item.** In `LayerActionItems.tsx`, add `IconTable` to the `@tabler/icons-react` import, add to `Props`:

```ts
  /** Opens the layer's feature list; the item is hidden when unset. */
  onOpenFeatureList?: () => void;
```

destructure it, change the docstring to `/** Renders the rename, zoom, feature list, duplicate, and delete layer actions. */`, and insert after the "Zoom to layer" item:

```tsx
      {onOpenFeatureList ? (
        <Menu.Item
          leftSection={<IconTable size={14} stroke={1.5} />}
          onClick={onOpenFeatureList}
        >
          {t`Feature list`}
        </Menu.Item>
      ) : null}
```

In `LayerActionsMenu.tsx`, add `onOpenFeatureList?: () => void;` to `Props`, destructure it, and pass it: `{...{ onRename, onDuplicate, onZoomToLayer, onDelete, onOpenFeatureList }}`.

In `LayerRow.tsx`, add `import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";`, add `onOpenFeatureList?: () => void;` to `Props`, destructure it, and pass to `LayerActionsMenu`:

```tsx
          onOpenFeatureList={
            getFeatureListAccessFromMapLayer(layer) === "unavailable"
              ? undefined
              : onOpenFeatureList
          }
```

In `LayerRows.tsx`, add `onOpenFeatureList?: (id: MapLayer.Id) => void;` to `Props`; in `_renderLayerRow` pass `onOpenFeatureList={props.onOpenFeatureList ? bind(props.onOpenFeatureList) : undefined}`; add `onOpenFeatureList` to the destructured props and to `rowProps`. In `OrderedLayerRows.tsx` and `LayerList.tsx`, add `onOpenFeatureList?: (layerId: MapLayer.Id) => void;` to `Props`, destructure it, and pass `onOpenFeatureList={onOpenFeatureList}` to the child. `GisAppLayerPanel` already spreads `{...actions}` into `LayerPanel`, whose props are `LayerList`'s, so no change is needed there.

- [ ] **Step 5: Run and see them pass.** Same command as Step 2. Expected: PASS, including the existing "exposes the layer actions" test, which still counts 4 items because it passes no `onOpenFeatureList`.

- [ ] **Step 6: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/views/GisApp/useGisApp src/views/GisApp/useGisAppLayerActions.tsx src/views/GisApp/GisAppMapToolCluster.tsx src/views/GisApp/panels/LayerPanel
git commit -m "feat(gis): open a layer's feature list from its menu"
```

---

## Task 19: The feature list drawer

Before this task, read `docs/design/app-view-layout.md`, the Named Rules in `DESIGN.md`, and `docs/design/gis/feature-home-inventory.md` §1.5. The drawer reuses `CanvasDrawer` and `FeatureInspectorHeader`, the same in-flow bottom drawer the feature inspector uses, so it scrolls inside itself and the map area never scrolls. It is a new surface: load the `impeccable` skill for a critique pass of the finished drawer (Task 20 Step 6 takes the screenshot), but keep the component structure below.

**Files:**
- Create: `src/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery.ts`
- Create: `src/views/GisApp/panels/FeatureListDrawer/formatFeatureListCell/formatFeatureListCell.ts`
- Create: `src/views/GisApp/panels/FeatureListDrawer/makeCsvRowsFromFeatureList/makeCsvRowsFromFeatureList.ts`
- Create: `src/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css`
- Create: `src/views/GisApp/panels/FeatureListDrawer/FeatureListTableRow.tsx`
- Create: `src/views/GisApp/panels/FeatureListDrawer/FeatureListTable.tsx`
- Create: `src/views/GisApp/panels/FeatureListDrawer/FeatureListBody.tsx`
- Create: `src/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.tsx`
- Test: `src/views/GisApp/panels/FeatureListDrawer/formatFeatureListCell/formatFeatureListCell.test.ts`
- Test: `src/views/GisApp/panels/FeatureListDrawer/makeCsvRowsFromFeatureList/makeCsvRowsFromFeatureList.test.ts`
- Test: `src/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.test.tsx`

- [ ] **Step 1: Write the failing helper tests.** `formatFeatureListCell.test.ts`:

```ts
import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { formatFeatureListCell } from "./formatFeatureListCell";
import type { MapLayerFeatureListColumn } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

const DISTANCE_COLUMN: MapLayerFeatureListColumn = {
  key: "__avandar_distance",
  label: "Distance to nearest Sites",
  kind: "distance",
};

const NAME_COLUMN: MapLayerFeatureListColumn = {
  key: "loc_name",
  label: "loc_name",
  kind: "source",
};

describe("formatFeatureListCell", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  it("shows a distance to two decimals in the buffer's unit", () => {
    expect(
      formatFeatureListCell({
        value: 0.0935,
        column: DISTANCE_COLUMN,
        distanceUnit: "mi",
        i18n,
      }),
    ).toBe("0.09 mi");
  });

  it("shows a blank cell as empty text", () => {
    expect(
      formatFeatureListCell({
        value: undefined,
        column: NAME_COLUMN,
        distanceUnit: "mi",
        i18n,
      }),
    ).toBe("");
  });

  it("shows a source value as it is", () => {
    expect(
      formatFeatureListCell({
        value: "The Clinton School",
        column: NAME_COLUMN,
        distanceUnit: "mi",
        i18n,
      }),
    ).toBe("The Clinton School");
  });
});
```

`makeCsvRowsFromFeatureList.test.ts`:

```ts
import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { makeCsvRowsFromFeatureList } from "./makeCsvRowsFromFeatureList";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

const LIST: MapLayerFeatureList = {
  columns: [
    { key: "loc_name", label: "loc_name", kind: "source" },
    {
      key: "__avandar_distance",
      label: "Distance to nearest Sites",
      kind: "distance",
    },
    {
      key: "__avandar_nearest_label",
      label: "Nearest Sites",
      kind: "nearestLabel",
    },
  ],
  rows: [
    {
      loc_name: "The Clinton School",
      __avandar_distance: 0.0935,
      __avandar_nearest_label: "Union Square",
      __avandar_longitude: -73.99,
      __avandar_latitude: 40.73,
    },
  ],
  totalCount: 1,
  distanceUnit: "mi",
};

describe("makeCsvRowsFromFeatureList", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  it("keys each row by column label, with distance to two decimals in its unit", () => {
    expect(makeCsvRowsFromFeatureList({ list: LIST, i18n })).toEqual([
      {
        loc_name: "The Clinton School",
        "Distance to nearest Sites (mi)": 0.09,
        "Nearest Sites": "Union Square",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run and see them fail.**

```bash
pnpm vitest run src/views/GisApp/panels/FeatureListDrawer
```

Expected: FAIL with `Failed to resolve import "./formatFeatureListCell"` and `"./makeCsvRowsFromFeatureList"`.

- [ ] **Step 3: Implement the helpers.** `formatFeatureListCell.ts`:

```ts
import { msg } from "@lingui/core/macro";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListColumn,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { I18n } from "@lingui/core";

/**
 * One feature list cell as display text: distances to two decimals with
 * their unit ("0.09 mi"), blanks as empty text, and anything else as it
 * reads. Use it wherever a feature list is shown, for example the drawer's
 * table.
 */
export function formatFeatureListCell(
  options: Readonly<{
    value: unknown;
    column: MapLayerFeatureListColumn;
    distanceUnit: MapLayerFeatureList["distanceUnit"];
    i18n: I18n;
  }>,
): string {
  const { value, column, distanceUnit, i18n } = options;
  if (value === null || value === undefined) {
    return "";
  }
  if (column.kind === "distance" && typeof value === "number" && distanceUnit) {
    const distance = i18n.number(value, { maximumFractionDigits: 2 });
    const unit = i18n._(BUFFER_DISTANCE_UNIT_LABELS[distanceUnit]);
    return i18n._(msg`${distance} ${unit}`);
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
```

`makeCsvRowsFromFeatureList.ts`:

```ts
import { msg } from "@lingui/core/macro";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { I18n } from "@lingui/core";

/**
 * A feature list as CSV rows keyed by column label, with the distance
 * header naming its unit and distances rounded to two decimals. Hidden row
 * keys such as coordinates are left out. Use it with `downloadRowsAsCsv`.
 */
export function makeCsvRowsFromFeatureList(
  options: Readonly<{ list: MapLayerFeatureList; i18n: I18n }>,
): UnknownRow[] {
  const { list, i18n } = options;
  const unitLabel = list.distanceUnit
    ? i18n._(BUFFER_DISTANCE_UNIT_LABELS[list.distanceUnit])
    : undefined;
  const headedColumns = list.columns.map((column) => {
    const columnLabel = column.label;
    const header =
      column.kind === "distance" && unitLabel
        ? i18n._(msg`${columnLabel} (${unitLabel})`)
        : columnLabel;
    return { column, header };
  });
  return list.rows.map((row) => {
    return Object.fromEntries(
      headedColumns.map(({ column, header }) => {
        const value = row[column.key];
        return [
          header,
          column.kind === "distance" && typeof value === "number"
            ? Math.round(value * 100) / 100
            : value,
        ];
      }),
    );
  });
}
```

- [ ] **Step 4: Run the helper tests and see them pass.** Same command as Step 2, which still fails only on files that do not exist yet. Expected: the two helper test files PASS.

- [ ] **Step 5: Write the failing drawer test.** `FeatureListDrawer.test.tsx`:

```tsx
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen, within } from "@/test-utils";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { FeatureListQueryState } from "@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery";

const { useFeatureListQueryMock, downloadRowsAsCsvMock } = vi.hoisted(() => {
  return {
    useFeatureListQueryMock: vi.fn(),
    downloadRowsAsCsvMock: vi.fn(),
  };
});

vi.mock("@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery", () => {
  return { useFeatureListQuery: useFeatureListQueryMock };
});

vi.mock("@/views/DataExplorerApp/downloadRowsAsCsv", () => {
  return { downloadRowsAsCsv: downloadRowsAsCsvMock };
});

const { FeatureListDrawer } =
  await import("@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer");

const LIST: MapLayerFeatureList = {
  columns: [
    { key: "loc_name", label: "loc_name", kind: "source" },
    {
      key: "__avandar_distance",
      label: "Distance to nearest Sites",
      kind: "distance",
    },
  ],
  rows: [
    {
      loc_name: "Near school",
      __avandar_distance: 0.0935,
      __avandar_longitude: -73.99,
      __avandar_latitude: 40.73,
    },
    {
      loc_name: "A far school",
      __avandar_distance: 0.4,
      __avandar_longitude: -73.98,
      __avandar_latitude: 40.74,
    },
  ],
  totalCount: 2,
  distanceUnit: "mi",
};

function _mockState(state: Partial<FeatureListQueryState>): void {
  useFeatureListQueryMock.mockReturnValue({
    access: "rows",
    list: undefined,
    count: undefined,
    isLoading: false,
    error: undefined,
    ...state,
  });
}

function _renderDrawer(onRowClick = vi.fn()): void {
  render(
    <FeatureListDrawer
      layer={MapLayer.makeEmpty("Schools")}
      config={AvaMapConfig.makeEmpty()}
      workspaceId={uuid<Workspace.Id>()}
      canvasRef={createRef<HTMLDivElement>()}
      onClose={vi.fn()}
      onRowClick={onRowClick}
    />,
  );
}

function _getFirstRowText(): string {
  return screen.getAllByRole("row", { hidden: true })[1]?.textContent ?? "";
}

describe("FeatureListDrawer", () => {
  beforeEach(() => {
    useFeatureListQueryMock.mockReset();
    downloadRowsAsCsvMock.mockReset();
  });

  it("shows the count and the distance in the buffer's unit, nearest first", () => {
    _mockState({ list: LIST });
    _renderDrawer();

    expect(screen.getByText("2 features")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Distance to nearest Sites" }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(_getFirstRowText()).toContain("Near school");
    expect(_getFirstRowText()).toContain("0.09 mi");
  });

  it("sorts by a column when its header is pressed", () => {
    _mockState({ list: LIST });
    _renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "loc_name" }));

    expect(_getFirstRowText()).toContain("A far school");
  });

  it("explains why rows are hidden for approximate locations", () => {
    _mockState({ access: "countOnly", count: 12 });
    _renderDrawer();

    expect(screen.getByText("12 features")).toBeInTheDocument();
    expect(
      screen.getByText(/This layer shows approximate locations/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("downloads the listed rows as CSV", () => {
    _mockState({ list: LIST });
    _renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));

    expect(downloadRowsAsCsvMock).toHaveBeenCalledWith([
      { loc_name: "Near school", "Distance to nearest Sites (mi)": 0.09 },
      { loc_name: "A far school", "Distance to nearest Sites (mi)": 0.4 },
    ]);
  });

  it("shows a feature on the map when its row is pressed", () => {
    _mockState({ list: LIST });
    const onRowClick = vi.fn();
    _renderDrawer(onRowClick);

    fireEvent.click(
      within(screen.getAllByRole("row", { hidden: true })[1]!).getByRole(
        "button",
        { name: "Show Near school on the map" },
      ),
    );

    expect(onRowClick).toHaveBeenCalledWith(LIST.rows[0]);
  });
});
```


- [ ] **Step 6: Run and see it fail.** Same command as Step 2. Expected: FAIL with `Failed to resolve import "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer"`.

- [ ] **Step 7: Implement the query hook.** `useFeatureListQuery.ts`:

```ts
import { useQuery } from "@avandar/query-hooks";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { fetchMapLayerFeatureCount } from "@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureCount/fetchMapLayerFeatureCount";
import { fetchMapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList";
import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListAccess,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

/** What the feature list drawer shows for one layer. */
export type FeatureListQueryState = {
  access: MapLayerFeatureListAccess;
  list: MapLayerFeatureList | undefined;
  count: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

type WorkspaceColumnMetadata = {
  datasets: readonly Dataset.T[];
  datasetColumns: readonly DatasetColumn.T[];
};

/** The workspace's datasets and columns, once both have loaded. */
function useWorkspaceColumnMetadata(
  workspaceId: Workspace.Id,
): WorkspaceColumnMetadata | undefined {
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [datasetColumns] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  return datasets && datasetColumns ? { datasets, datasetColumns } : undefined;
}

/**
 * Loads what the feature list drawer may show for `layer`: every row for an
 * exact layer, or only a count for a jittered one. Read by
 * `FeatureListDrawer`; it refetches when the map's layers, area, or time
 * window change.
 */
export function useFeatureListQuery(
  options: Readonly<{
    config: AvaMapConfig.T;
    layer: MapLayer.T | undefined;
    workspaceId: Workspace.Id;
  }>,
): FeatureListQueryState {
  const { i18n } = useLingui();
  const { config, workspaceId } = options;
  const metadata = useWorkspaceColumnMetadata(workspaceId);
  const layerId = options.layer?.id;
  const access = options.layer
    ? getFeatureListAccessFromMapLayer(options.layer)
    : "unavailable";
  const keyParts = [workspaceId, layerId, config.layers, config.aoi, config.timeRange];
  const [list, isListLoading, listQuery] = useQuery({
    enabled: access === "rows" && metadata !== undefined,
    queryKey: ["mapLayerFeatureList", ...keyParts, i18n.locale],
    queryFn: async ({ signal }) => {
      if (!layerId || !metadata) {
        throw new Error("The feature list layer is not ready");
      }
      return await fetchMapLayerFeatureList({
        config,
        layerId,
        columnIds: "popup",
        sort: undefined,
        limit: undefined,
        workspaceId,
        datasets: metadata.datasets,
        datasetColumns: metadata.datasetColumns,
        i18n,
        signal,
      });
    },
  });
  const [count, isCountLoading, countQuery] = useQuery({
    enabled: access === "countOnly" && metadata !== undefined,
    queryKey: ["mapLayerFeatureCount", ...keyParts],
    queryFn: async ({ signal }) => {
      if (!layerId || !metadata) {
        throw new Error("The feature list layer is not ready");
      }
      return await fetchMapLayerFeatureCount({
        config,
        layerId,
        workspaceId,
        datasets: metadata.datasets,
        datasetColumns: metadata.datasetColumns,
        signal,
      });
    },
  });
  return {
    access,
    list,
    count,
    isLoading: isListLoading || isCountLoading,
    error: listQuery.error ?? countQuery.error ?? undefined,
  };
}
```

- [ ] **Step 8: Implement the components.** `FeatureListDrawer.module.css`:

```css
.featureListToolbar {
  padding: var(--mantine-spacing-xs) var(--mantine-spacing-sm);
}

.featureListScrollArea {
  overflow: auto;
}

.featureListRow {
  cursor: pointer;
}

.featureListMessage {
  padding: 0 var(--mantine-spacing-sm) var(--mantine-spacing-sm);
}
```

`FeatureListTableRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Table } from "@mantine/core";
import { formatFeatureListCell } from "@/views/GisApp/panels/FeatureListDrawer/formatFeatureListCell/formatFeatureListCell";
import css from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ReactNode } from "react";

type Props = {
  row: MapLayerFeatureList["rows"][number];
  list: MapLayerFeatureList;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/**
 * One row of `FeatureListTable`. Pressing the row, or its "Show" button for
 * keyboard users, shows the feature on the map.
 */
export function FeatureListTableRow({
  row,
  list,
  onRowClick,
}: Props): ReactNode {
  const { i18n, t } = useLingui();
  const cells = list.columns.map((column) => {
    return {
      key: column.key,
      text: formatFeatureListCell({
        value: row[column.key],
        column,
        distanceUnit: list.distanceUnit,
        i18n,
      }),
    };
  });
  const rowLabel = cells[0]?.text ?? "";
  const onActivate = (): void => {
    onRowClick(row);
  };
  return (
    <Table.Tr className={css.featureListRow} onClick={onActivate}>
      {cells.map((cell) => {
        return <Table.Td key={cell.key}>{cell.text}</Table.Td>;
      })}
      <Table.Td>
        <Button
          size="compact-xs"
          variant="subtle"
          color="neutral"
          aria-label={t`Show ${rowLabel} on the map`}
          onClick={(event) => {
            event.stopPropagation();
            onActivate();
          }}
        >
          {t`Show`}
        </Button>
      </Table.Td>
    </Table.Tr>
  );
}
```

`FeatureListTable.tsx`:

```tsx
import { propEq } from "@avandar/utils";
import { Table, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { sortMapLayerFeatureListRows } from "@/clients/maps/MapLayerFeatureList/sortMapLayerFeatureListRows/sortMapLayerFeatureListRows";
import css from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css";
import { FeatureListTableRow } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListTableRow";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListSort,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ReactNode } from "react";

type Props = {
  list: MapLayerFeatureList;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/** Nearest first when the list has a distance column. */
function _getDefaultSort(
  list: MapLayerFeatureList,
): MapLayerFeatureListSort | undefined {
  const distanceColumn = list.columns.find(propEq("kind", "distance"));
  return distanceColumn
    ? { key: distanceColumn.key, direction: "asc" }
    : undefined;
}

function _getNextSort(
  current: MapLayerFeatureListSort | undefined,
  key: string,
): MapLayerFeatureListSort {
  return current?.key === key && current.direction === "asc"
    ? { key, direction: "desc" }
    : { key, direction: "asc" };
}

function _getAriaSort(
  sort: MapLayerFeatureListSort | undefined,
  key: string,
): "ascending" | "descending" | "none" {
  if (sort?.key !== key) {
    return "none";
  }
  return sort.direction === "asc" ? "ascending" : "descending";
}

/**
 * The feature list drawer's table: one sortable header per column, and rows
 * that show their feature on the map when pressed. Rendered by
 * `FeatureListBody`.
 */
export function FeatureListTable({ list, onRowClick }: Props): ReactNode {
  const [sort, setSort] = useState(() => {
    return _getDefaultSort(list);
  });
  const rows = sort
    ? sortMapLayerFeatureListRows({ rows: list.rows, sort })
    : list.rows;
  return (
    <div className={css.featureListScrollArea}>
      <Table stickyHeader highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            {list.columns.map((column) => {
              return (
                <Table.Th
                  key={column.key}
                  aria-sort={_getAriaSort(sort, column.key)}
                >
                  <UnstyledButton
                    fz="sm"
                    fw={600}
                    onClick={() => {
                      setSort(_getNextSort(sort, column.key));
                    }}
                  >
                    {column.label}
                  </UnstyledButton>
                </Table.Th>
              );
            })}
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, rowIndex) => {
            return (
              <FeatureListTableRow
                key={rowIndex}
                row={row}
                list={list}
                onRowClick={onRowClick}
              />
            );
          })}
        </Table.Tbody>
      </Table>
    </div>
  );
}
```

`FeatureListBody.tsx`:

```tsx
import { Plural, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { downloadRowsAsCsv } from "@/views/DataExplorerApp/downloadRowsAsCsv";
import css from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css";
import { FeatureListTable } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListTable";
import { makeCsvRowsFromFeatureList } from "@/views/GisApp/panels/FeatureListDrawer/makeCsvRowsFromFeatureList/makeCsvRowsFromFeatureList";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { FeatureListQueryState } from "@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery";
import type { ReactNode } from "react";

type Props = {
  state: FeatureListQueryState;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/**
 * The feature list drawer's content: a count, then either the table with a
 * CSV download or, for approximate locations, why rows are hidden.
 * Rendered by `FeatureListDrawer`.
 */
export function FeatureListBody({ state, onRowClick }: Props): ReactNode {
  const { i18n, t } = useLingui();
  const featureCount = state.list?.totalCount ?? state.count;
  if (state.error) {
    return (
      <Text size="sm" c="danger" className={css.featureListMessage}>
        {t`The feature list could not load.`}
      </Text>
    );
  }
  if (featureCount === undefined) {
    return (
      <Text size="sm" c="dimmed" className={css.featureListMessage}>
        {t`Loading features...`}
      </Text>
    );
  }
  const countLabel = (
    <Plural value={featureCount} one="# feature" other="# features" />
  );
  const list = state.list;
  if (!list) {
    return (
      <Stack gap={4} className={css.featureListMessage}>
        <Text size="sm" fw={600}>
          {countLabel}
        </Text>
        <Text size="sm" c="dimmed">
          {t`This layer shows approximate locations, so its features are not listed one by one. Listing exact rows would undo that protection.`}
        </Text>
      </Stack>
    );
  }
  return (
    <>
      <Group className={css.featureListToolbar} justify="space-between">
        <Text size="sm" fw={600}>
          {countLabel}
        </Text>
        <Button
          size="compact-sm"
          variant="light"
          color="neutral"
          leftSection={<IconDownload size={14} />}
          disabled={list.rows.length === 0}
          onClick={() => {
            downloadRowsAsCsv(makeCsvRowsFromFeatureList({ list, i18n }));
          }}
        >
          {t`Download CSV`}
        </Button>
      </Group>
      <FeatureListTable list={list} onRowClick={onRowClick} />
    </>
  );
}
```

`FeatureListDrawer.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { CanvasDrawer } from "@/components/CanvasDrawer/CanvasDrawer";
import { FeatureInspectorHeader } from "@/views/GisApp/panels/FeatureInspector/FeatureInspectorHeader/FeatureInspectorHeader";
import { FeatureListBody } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListBody";
import { useFeatureListQuery } from "@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ReactNode, RefObject } from "react";

const FEATURE_LIST_REGION_ID = "gis-feature-list-region";
const FEATURE_LIST_TITLE_ID = "gis-feature-list-title";

type Props = {
  /** The layer whose list is open, or `undefined` when the drawer is shut. */
  layer: MapLayer.T | undefined;
  config: AvaMapConfig.T;
  workspaceId: Workspace.Id;
  canvasRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/**
 * The bottom drawer listing one layer's features after every map filter,
 * with a count, sortable columns, and a CSV download. A layer with
 * approximate locations shows only its count. Opened from a layer's menu
 * and from the buffer tool.
 */
export function FeatureListDrawer({
  layer,
  config,
  workspaceId,
  canvasRef,
  onClose,
  onRowClick,
}: Props): ReactNode {
  const { t } = useLingui();
  const state = useFeatureListQuery({ config, layer, workspaceId });
  const layerName = layer?.name ?? "";
  return (
    <CanvasDrawer opened={layer !== undefined} canvasRef={canvasRef}>
      <CanvasDrawer.ResizeHandle />
      <CanvasDrawer.Body regionId={FEATURE_LIST_REGION_ID}>
        <div role="region" aria-labelledby={FEATURE_LIST_TITLE_ID}>
          <FeatureInspectorHeader
            onClose={onClose}
            titleId={FEATURE_LIST_TITLE_ID}
            title={t`Feature list: ${layerName}`}
          />
          <FeatureListBody state={state} onRowClick={onRowClick} />
        </div>
      </CanvasDrawer.Body>
    </CanvasDrawer>
  );
}
```

- [ ] **Step 9: Run and see them pass.** Same command as Step 2. Expected: PASS (all three test files).

- [ ] **Step 10: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add src/views/GisApp/panels/FeatureListDrawer
git commit -m "feat(gis): add the feature list drawer"
```

---

## Task 20: Mount the drawer, driven by the end-to-end test

The red step is the e2e spec: before the shell renders the drawer, no "Feature list" region appears.

**Files:**
- Create: `tests/data/gis/nyc-exposure-sites.csv`
- Modify: `tests/data/gis/README.md`
- Modify: `tests/e2e/helpers/constants.ts` (after the `GIS_PCODE_POLYGON_ROW_COUNT` block, around line 192)
- Create: `tests/e2e/gis-feature-list.spec.ts`
- Create: `src/views/GisApp/GisAppFeatureListDrawer.tsx`
- Modify: `src/views/GisApp/GisAppMapShell.tsx:92-170`

Expected numbers come from the mirrored `a3nt-yts4` listing (1,992 schools, WKT `the_geom`, name `loc_name`), computed with DuckDB spatial in UTM 18N while writing this plan, using the same `ST_Buffer(geom, 805)` the buffer compiler emits: 30 schools intersect the two 805 m rings, and the nearest is The Clinton School, 150.4 m (0.09 mi) from Union Square. No school lies within 3.4 m of a ring edge, and `ST_AsGeoJSON` keeps full coordinate precision, so the GeoJSON round trip in the filter cannot change the count.

- [ ] **Step 1: Add the sites fixture.** `tests/data/gis/nyc-exposure-sites.csv`:

```csv
site_name,latitude,longitude
Union Square,40.7359,-73.9906
Washington Square,40.7308,-73.9973
```

Append to `tests/data/gis/README.md`:

```markdown
### `nyc-exposure-sites.csv`

Two exposure sites in lower Manhattan (Union Square and Washington Square)
with `site_name`, `latitude`, and `longitude`. Use for buffering a latitude
and longitude layer and filtering a NYC point layer by that buffer.
```

Add to `tests/e2e/helpers/constants.ts`:

```ts
/** Two lower-Manhattan exposure sites as latitude and longitude. */
export const GIS_NYC_EXPOSURE_SITES_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "nyc-exposure-sites.csv",
);

/** Parsed row count of {@link GIS_NYC_EXPOSURE_SITES_CSV_PATH}. */
export const GIS_NYC_EXPOSURE_SITES_ROW_COUNT = 2;
```

- [ ] **Step 2: Write the failing e2e spec.** `tests/e2e/gis-feature-list.spec.ts`:

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  GIS_NYC_EXPOSURE_SITES_CSV_PATH,
  GIS_NYC_EXPOSURE_SITES_ROW_COUNT,
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
import type { Locator, Page } from "@playwright/test";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

const MAP_NAME = "E2E GIS feature list";
const SITES_LAYER_NAME = "nyc-exposure-sites.csv";

/** The mirrored 2019-20 School Point Locations listing (Socrata a3nt-yts4). */
const SCHOOLS_LISTING_NAME = "2019 - 2020 School Point Locations";

/**
 * Schools whose point falls inside the two 805 m (0.5 mi) rings around the
 * sites fixture, and the nearest of them, computed from the mirrored listing.
 */
const EXPECTED_SCHOOL_COUNT = 30;
const NEAREST_SCHOOL_NAME = "The Clinton School";
const NEAREST_SCHOOL_DISTANCE = "0.09 mi";

async function _hasSchoolsListing(
  supabaseAdminClient: SupabaseAdminClient,
): Promise<boolean> {
  const { data } = await supabaseAdminClient
    .from("data_catalog_listings")
    .select("id")
    .eq("display_name", SCHOOLS_LISTING_NAME)
    .limit(1)
    .throwOnError();
  return (data?.length ?? 0) > 0;
}

/** Deletes the workspace datasets this spec added from the schools listing. */
async function _deleteSchoolsDatasets(
  supabaseAdminClient: SupabaseAdminClient,
  workspaceId: string,
): Promise<void> {
  const { data } = await supabaseAdminClient
    .from("datasets")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", SCHOOLS_LISTING_NAME)
    .throwOnError();
  for (const { id } of data ?? []) {
    await deleteDatasetAndShares({ supabaseAdminClient, datasetId: id });
  }
}

async function _pickOption(
  page: Page,
  scope: Locator,
  comboboxName: string,
  optionName: string,
): Promise<void> {
  await scope.getByRole("combobox", { name: comboboxName }).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

/** Adds the schools listing to the workspace from the open data catalog. */
async function _addSchoolsListing(
  page: Page,
  workspaceSlug: string,
): Promise<void> {
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Open data" }).click();
  await page
    .getByRole("textbox", { name: "Search open data" })
    .fill("School Point Locations", { timeout: LONG_WAIT });
  await page
    .getByRole("region", { name: "Results" })
    .getByRole("listbox", { name: "Open datasets" })
    .getByRole("option", { name: new RegExp(SCHOOLS_LISTING_NAME) })
    .click();
  await page.getByRole("button", { name: "Add dataset to workspace" }).click();
  await expect(page.getByText("Dataset added")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

async function _addLayer(page: Page, datasetName: string): Promise<Locator> {
  await page
    .getByRole("region", { name: new RegExp(MAP_NAME) })
    .getByRole("button", { name: "Add a layer" })
    .click();
  await page.getByPlaceholder("Search data sources").click();
  await page.getByRole("option", { name: datasetName }).click();
  return page.getByRole("region", { name: "Layer" });
}

async function _addSchoolsLayer(page: Page): Promise<void> {
  const inspector = await _addLayer(page, SCHOOLS_LISTING_NAME);
  await _pickOption(page, inspector, "Geometry", "Geometry column");
  await _pickOption(page, inspector, "Geometry column", "the_geom");
  await _pickOption(page, inspector, "Expected geometry", "Point");
  await expect(
    inspector.getByText(/1,?992 of 1,?992 rows mapped/),
  ).toBeVisible({ timeout: LONG_WAIT });
}

/** Buffers the selected sites by half a mile and filters schools by it. */
async function _bufferSitesAndFilterSchools(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Buffer around a layer", exact: true })
    .click();
  const bufferForm = page.getByRole("dialog");
  await bufferForm.getByRole("textbox", { name: "Distance" }).fill("0.5");
  await _pickOption(page, bufferForm, "Unit", "mi");
  await bufferForm.getByRole("button", { name: "Confirm" }).click();
  await _pickOption(
    page,
    bufferForm,
    "Filter another layer by this buffer",
    SCHOOLS_LISTING_NAME,
  );
  await bufferForm.getByRole("button", { name: "Filter and show list" }).click();
}

test(
  "lists the schools within half a mile of two sites, nearest first",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    test.setTimeout(45_000);
    const supabaseAdminClient = createSupabaseAdminClient();
    test.skip(
      !(await _hasSchoolsListing(supabaseAdminClient)),
      "Load the Workflow B catalog mirror with the mirror-catalog scripts first.",
    );
    const { primaryUser, workspaceSlug } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient,
      slug: workspaceSlug,
    });
    const datasetIds: string[] = [];
    let mapId = "";
    try {
      mapId = await seedAvaMap({
        admin: supabaseAdminClient,
        workspaceId,
        ownerEmail: primaryUser.email,
        name: MAP_NAME,
      });
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _addSchoolsListing(page, workspaceSlug);
      datasetIds.push(
        await importDatasetViaUi({
          page,
          workspaceSlug,
          filePath: GIS_NYC_EXPOSURE_SITES_CSV_PATH,
          expectedRowCount: GIS_NYC_EXPOSURE_SITES_ROW_COUNT,
        }),
      );
      await page.getByRole("link", { name: "Maps" }).click();
      await page
        .getByRole("link", { name: `Open the map ${MAP_NAME}` })
        .click();
      await _addSchoolsLayer(page);
      const sitesInspector = await _addLayer(page, SITES_LAYER_NAME);
      await expect(sitesInspector.getByText("2 of 2 rows mapped")).toBeVisible(
        { timeout: LONG_WAIT },
      );
      await _bufferSitesAndFilterSchools(page);

      const featureList = page.getByRole("region", {
        name: /^Feature list:/,
      });
      await expect(
        featureList.getByText(`${EXPECTED_SCHOOL_COUNT} features`),
      ).toBeVisible({ timeout: LONG_WAIT });
      const firstRow = featureList.getByRole("row").nth(1);
      await expect(firstRow).toContainText(NEAREST_SCHOOL_NAME);
      await expect(firstRow).toContainText(NEAREST_SCHOOL_DISTANCE);
      await page.screenshot({
        path: ".temp/feat-gis-filter-by-layer/feature-list.png",
      });
    } finally {
      await deleteMapsByIds({
        admin: supabaseAdminClient,
        mapIds: mapId ? [mapId] : [],
      });
      for (const datasetId of datasetIds) {
        await deleteDatasetAndShares({ supabaseAdminClient, datasetId });
      }
      await _deleteSchoolsDatasets(supabaseAdminClient, workspaceId);
    }
  },
);
```

The helper calls match `gis-buffer-layer.spec.ts`: `getWorkspaceIdBySlug({ supabaseAdminClient, slug })`, `seedAvaMap({ admin, ... })`, and `deleteMapsByIds({ admin, mapIds })`.

- [ ] **Step 3: Load the test data and run the spec, and see it fail.** With the local stack running, load the Workflow B listings with the mirror-catalog scripts (ask Pablo for the folder): `REPO=$PWD bash <mirror-catalog>/load-local.sh`. Then:

```bash
pnpm test:e2e gis-feature-list.spec.ts
```

Expected: FAIL at `featureList.getByText("30 features")`: the buffer tool sets the spatial filter and calls `openFeatureList`, but the shell does not render a drawer yet. If it instead reports SKIPPED, the listing is not loaded; load it and rerun.

- [ ] **Step 4: Implement the shell wiring.** `src/views/GisApp/GisAppFeatureListDrawer.tsx`:

```tsx
import { MAP_LAYER_FEATURE_LIST_ROW_KEYS } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.constants";
import { FeatureListDrawer } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode, RefObject } from "react";

type Props = {
  app: GisAppState;
  canvasRef: RefObject<HTMLElement | null>;
};

type FeatureListRow = MapLayerFeatureList["rows"][number];

/** Zoom a feature list row flies to, unless the map is already closer. */
const FEATURE_LIST_ROW_ZOOM = 16;

const HIDDEN_ROW_KEYS: ReadonlySet<string> = new Set(
  Object.values(MAP_LAYER_FEATURE_LIST_ROW_KEYS),
);

/** The row's own columns, without the keys a feature list adds. */
function _getRowProperties(row: FeatureListRow): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => {
      return !HIDDEN_ROW_KEYS.has(key);
    }),
  );
}

/** Flies to a listed feature and opens its popup in the feature drawer. */
function _showFeatureListRow(
  app: GisAppState,
  layer: MapLayer.T,
  row: FeatureListRow,
): void {
  const longitude = row[MAP_LAYER_FEATURE_LIST_ROW_KEYS.longitude];
  const latitude = row[MAP_LAYER_FEATURE_LIST_ROW_KEYS.latitude];
  if (typeof longitude !== "number" || typeof latitude !== "number") {
    return;
  }
  const map = app.mapInstance.mapRef.current;
  map?.flyTo({
    center: [longitude, latitude],
    zoom: Math.max(map.getZoom(), FEATURE_LIST_ROW_ZOOM),
  });
  app.setSelectedLayerId(layer.id);
  app.onFeatureClick({
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: _getRowProperties(row),
  });
}

/**
 * The GIS shell's feature list drawer, bound to the layer whose list is
 * open. Rendered by `GisAppMapShell` in the in-flow drawer slot under the
 * map.
 */
export function GisAppFeatureListDrawer({ app, canvasRef }: Props): ReactNode {
  const layer = app.mapConfig.layers.find((candidate) => {
    return candidate.id === app.featureListLayerId;
  });
  return (
    <FeatureListDrawer
      layer={layer}
      config={app.mapConfig}
      workspaceId={app.avaMap.workspaceId}
      canvasRef={canvasRef}
      onClose={app.closeFeatureList}
      onRowClick={(row) => {
        if (layer) {
          _showFeatureListRow(app, layer, row);
        }
      }}
    />
  );
}
```

In `GisAppMapShell.tsx`:
  1. Import `GisAppFeatureListDrawer`.
  2. After `const basemapAttribution = ...`, add:

```tsx
  // The open list takes over the bottom-center stack (status and time
  // slider) so the drawer and the floating chrome never overlap.
  const isFeatureListOpen = app.mapConfig.layers.some((layer) => {
    return layer.id === app.featureListLayerId;
  });
```

  3. Change `statusCard={<GisAppStatusCard app={app} />}` to `statusCard={isFeatureListOpen ? null : <GisAppStatusCard app={app} />}`.
  4. Wrap the `timeSlider` element: `timeSlider={isFeatureListOpen ? undefined : (<MapTimeSlider ... />)}` with the existing `MapTimeSlider` props unchanged.
  5. In the `featureDrawer` fragment, add `<GisAppFeatureListDrawer app={app} canvasRef={mapSurfaceRef} />` as its first child, above `<FeatureInspector ... />`.

- [ ] **Step 5: Run the e2e spec and see it pass.**

```bash
pnpm test:e2e gis-feature-list.spec.ts
```

Expected: PASS within the 45 s local timeout. If it times out in the catalog or import steps rather than on an assertion, profile those steps (they are fixture setup) instead of raising the timeout.

- [ ] **Step 6: Look at it.** Open `.temp/feat-gis-filter-by-layer/feature-list.png`. Check against `DESIGN.md`: neutral chrome with blue only on intent, hairline borders, no stock gray, header and toolbar padding consistent with the feature inspector. Run the `impeccable` critique on the screenshot and fix anything material in the Task 19 components (CSS module only; no inline styles).

- [ ] **Step 7: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add tests/data/gis/nyc-exposure-sites.csv tests/data/gis/README.md tests/e2e/helpers/constants.ts tests/e2e/gis-feature-list.spec.ts src/views/GisApp/GisAppFeatureListDrawer.tsx src/views/GisApp/GisAppMapShell.tsx src/views/GisApp/panels/FeatureListDrawer
git commit -m "feat(gis): show the feature list drawer under the map"
```

---

## Task 21: Verification

**Files:** none new (formatting, catalogs, and any fixes the checks require)

- [ ] **Step 1: Unit and executed tests.**

```bash
pnpm vitest run shared/models/AvaMap src/clients/maps src/views/GisApp
pnpm test:executed src/clients/maps
```

Expected: all pass.

- [ ] **Step 2: Types, lint, format.**

```bash
pnpm tsc -b --force
pnpm type-check:deno
pnpm lint
pnpm format
```

Expected: `tsc` and the Deno check exit 0, lint reports no new errors in the touched files, and `pnpm format` (oxfmt over changed files) leaves only formatting changes.

- [ ] **Step 3: Translations.**

```bash
pnpm i18n:extract
grep -n "Only show features inside\|Filter another layer by this buffer\|Distance to nearest\|Feature list" src/i18n/locales/en/messages.po
```

Expected: every new string appears with a `#:` reference to its file.

- [ ] **Step 4: Related e2e specs, one at a time.**

```bash
pnpm test:e2e gis-buffer-layer.spec.ts
pnpm test:e2e gis-aoi-filter.spec.ts
pnpm test:e2e gis-feature-list.spec.ts
```

Expected: each passes. `gis-buffer-layer.spec.ts` confirms the buffer form still confirms at the default 1000 m.

- [ ] **Step 5: Type-check, then commit.**

```bash
pnpm tsc -b --force
```

Expected: no errors (exit code 0). Do not commit until it is clean.

```bash
git add -A src shared tests
git commit -m "chore(gis): format and extract translations for filter by layer"
```

Run `git status` first and stage only this feature's files if anything unrelated shows up.

---

## Self-review

### Spec coverage (§5)

| Spec item | Task |
| --- | --- |
| §5.2 `MapLayerCommon.spatialFilter` | 1, 4 |
| §5.2 filtering layer can be a buffer, choropleth, polygon dataset, anything that outputs polygons | 2 (`isAreaGeoBinding`), 3, 8 |
| §5.2 composes with `applyAoiFilter` | 8 (AOI plus filter test), 9 |
| §5.2 rule: filtering layer must output polygons | 3 (candidates), 8 (compile refusal), 16 (select offers only those) |
| §5.2 rule: no cycles | 3, 4 (json boundary), 8 (compile refusal), 17 (buffer step targets) |
| §5.2 jitter layers filter on true positions | By construction: jitter is applied in `makeFeatureCollectionFromRows` after SQL, so every filter in Tasks 8 and 9 runs on true positions. 12 and 19 show only a count for jitter. |
| §5.3 every AOI compiler also applies the filter via `filter_geoms` and `EXISTS (... ST_Intersects ...)` | 6, 8 (geometry column, point aggregation, boundary join, grid bin; one wrapper over the dispatcher), 9 (`compileLatLngOverlaySql`) |
| §5.4 lat/lng layers can be buffered; refusal removed | 9, 10, 17 |
| §5.4 `BufferOfLayerBinding.labelColumn`, ring carries the value | 1, 4, 10, 17 |
| §5.4 m / km / ft / mi, stored in meters, "0.5 mi" stores 805 | 1, 2, 4, 17 |
| §5.4 confirmation offers "Filter another layer by this buffer" | 17, 18 |
| §5.5 drawer from the layer row menu and from the buffer confirmation | 17, 18, 20 |
| §5.5 rows after AOI, time, spatial filter | 14, 15 |
| §5.5 columns are the popup columns | 15 (`columnIds: "popup"`) |
| §5.5 "Distance to nearest {source layer}" via `ST_Distance` in `makeMetersCrsSql`, shown in the buffer's unit | 13, 15, 19 |
| §5.5 "Nearest {label}" when the buffer has a `labelColumn` | 13, 15 |
| §5.5 sort by any column, distance ascending by default | 12, 15, 19 |
| §5.5 count in the header | 19 |
| §5.5 "Download CSV" via `downloadRowsAsCsv` | 19 |
| §5.5 row click flies to the feature and opens its popup | 20 |
| §5.5 sensitivity: exact only; jitter count plus explanation; no menu item for aggregateOnly | 12, 15, 18, 19 |
| §5.5 layout: bottom of the map area, takes over the bottom-center stack, scrolls inside itself | 19, 20 |
| §5.6 unit tests: each compiler with and without a filter, filter plus AOI, cycle and non-polygon rejection, buffering lat/lng, distance accuracy within 1 m | 8, 9, 10, 13 |
| §5.6 component tests: columns, sort, sensitivity states, CSV contents | 19 |
| §5.6 e2e: points plus sites, buffer 0.5 mi, filter, list count and first distance | 20 |

### Decisions the spec left open

- **Filter wraps compiler output, not each compiler's internals.** §5.3 asks every AOI compiler to apply the filter. The plan applies it once, in `compileSpatialFilteredQuery`, around whatever any spatial compiler returns, so all five spatial bindings honor it identically and no compiler's CTE layout changes. Latitude/longitude rows get the same predicate inside `compileLatLngOverlaySql`.
- **Filtering layers compile at zoom band 24**, so which features pass never changes with the map's zoom (polygon simplification depends on zoom).
- **Deleting a filtering layer clears every `spatialFilter` that named it** (`withLayerRemoved`), matching F4's "if the layer is deleted, the field resets".
- **`BufferOfLayerBinding.distanceUnit`** is added in version 7 beside `labelColumn`. The brief's version table lists only `spatialFilter` and `labelColumn`, but §5.5 shows distance "in the buffer's unit", which needs the unit persisted.
- **Feature lists cover row layers only** (latitude/longitude and geometry column). Boundary joins, bins, and buffers produce derived features without popup columns, so the menu item is hidden for them as well as for aggregate-only layers.
- **The inspector's buffer distance field stays in meters.** Only the buffer tool's form gains units.

### Not verified in code

- **F1's code as merged.** Task 4 follows the F1 plan (`docs/measles-demo/workflow-b-f1-threshold-colors-plan.md`): `AvaMapConfigV6LayerSchema` built inline from `V5StandardLayerSchema` / `V5AggregateOnlyLayerSchema` with `V6SymbologySchema` / `V6FillSymbologySchema`, `_migrateVersion4` returning `ConfigV5`, and `_migrateVersion5` returning `AvaMapConfigRead`. If F1 lands differently, Task 0 Step 5 shows it before Task 4 edits anything.
- **Mantine `Popover.Dropdown` has role `dialog`** (used to scope the e2e buffer form). If not, scope with `page.locator(".mantine-Popover-dropdown")`.
- **The dataset name "Add to workspace" gives the schools listing** is assumed to be its display name "2019 - 2020 School Point Locations"; the e2e layer option, the filter target option, and cleanup depend on it. Check once in the Data Manager after Step 3 and adjust `SCHOOLS_LISTING_NAME` usage for the dataset if it differs.
- **"Expected geometry" and the WKT encoding** for `the_geom` are assumed to be auto-detected the way `gis-geometry-column.spec.ts` shows; the plan selects "Point" explicitly.
- **The e2e fits in 45 s.** Catalog add, CSV import, and two layer bindings run before the assertion; `gis-buffer-layer.spec.ts` does a similar amount of work. Not measured.
- **`to_json(<cte alias>)` and `arg_min`** were checked in the DuckDB CLI while writing this plan, not in DuckDB WASM; the executed tests (Node DuckDB) and the e2e (browser) cover both.
- **A buffer's own source does not honor that source's spatial filter.** `compileBufferOfLayerQuery` compiles its source without `resolveMetadata`, so "buffer of filtered schools" buffers every school. Out of scope for Workflow B; noted for a follow-up.
- **`pr-feature-log.md`.** Per the spec, log this feature after it merges into `demo/measles`; that entry is not part of this plan.
