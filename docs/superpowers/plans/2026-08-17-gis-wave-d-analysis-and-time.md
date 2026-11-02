# GIS Wave D: analysis and time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AOI draw-to-filter, a map time range, buffer-as-layer, ephemeral
measure, go-to coordinate/P-code, and persisted annotations on the Wave C map,
with Isochrone present but disabled.

**Architecture:** `AvaMapConfig` version 4 stores one AOI polygon, one time
range, annotations, and `annotationsZIndex`. Each `MapLayer` gains `timeColumn`
and `applyAoiFilter`. The GIS compiler is the only owner of time `BETWEEN`,
`ST_Intersects`, and `ST_Buffer`. Buffer is a `bufferOfLayer` geo-binding.
Measure and the AOI outline are canvas chrome, not `MapSpec` layers.

**Tech Stack:** TypeScript, React 19, DuckDB-WASM Spatial, MapLibre GL JS,
TanStack Query, Mantine, Lingui, Zod, Vitest, Testing Library, Playwright. No
new npm geospatial library. No Supabase schema or production database changes.

**Approved design:**
`docs/superpowers/specs/2026-08-17-gis-wave-d-design.md`

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
- All user-visible copy uses Lingui. Run extraction and compilation after UI
  tasks.
- Use CSS Modules and Mantine tokens. Inline style is limited to runtime
  values such as an annotation swatch or AOI dashed stroke color.
- Do not add turf, geographiclib, maplibre-gl-draw, or any other geospatial
  npm dependency. Spherical haversine and spherical-excess area live in
  `src/views/GisApp/tools/geodesy/`. DuckDB owns `ST_Intersects`, `ST_Buffer`,
  and `ST_Union_Agg`, using only functions listed in
  `supabase/functions/queries/DuckDbSpatialExtensionDocumentation.ts`.
- Do not add a Supabase migration, schema file, database type change, RPC, or
  production database write.
- Do not extend `DashboardFilterRecord` or add a Map PBlock.
- Latitude/longitude layers with no AOI stay operational while DuckDB Spatial
  is loading or unavailable. Time-only lat/lng uses `BETWEEN` and no `ST_*`.
- Spatial failure must preserve configuration. Never fall back to JavaScript
  point-in-polygon, client-side buffering, or client-side suppression.
- Aggregate only must never produce GeoJSON points or MapLibre `circle`,
  `symbol`, `cluster`, or `heatmap` layers, including under AOI, time, and
  buffer.
- A control may become usable only when its model, execution, diagnostics,
  rendering, and focused tests are present. Isochrone stays `aria-disabled`.
- Run Playwright specs one file at a time. Keep local timeouts at 45 seconds
  or less. Every database mutation in a spec must be cleaned up in `finally`.
- The commit commands in this plan are review checkpoint suggestions. Do not
  run them unless the user separately authorizes commits.

---

## File structure

Create these files. Existing files listed under each task are modified in
place. Do not introduce barrels.

| File                                                                                                     | Responsibility                                    |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/clients/maps/MapLayerSpatialQuery/applyTimePredicateToSourceSql/applyTimePredicateToSourceSql.ts`   | Wrap source SQL with time `BETWEEN`               |
| `src/clients/maps/MapLayerSpatialQuery/applyAoiPredicateToGeometrySql/applyAoiPredicateToGeometrySql.ts` | `ST_Intersects` fragments and GeoJSON AOI literal |
| `src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql.ts`               | Filtered row SQL for lat/lng + time and/or AOI    |
| `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.ts`           | `ST_Buffer` of a source layer plan                |
| `shared/models/AvaMap/AvaMapConfig/hasBufferCycle/hasBufferCycle.ts`                                     | Walk `bufferOfLayer` chains                       |
| `src/clients/maps/MapLayerSpatialQuery/makeMetersCrsSql/makeMetersCrsSql.ts`                             | Shared UTM/UPS CRS SQL (extracted from bins)      |
| `src/views/GisApp/tools/geodesy/getSphericalDistanceMeters.ts`                                           | Haversine length                                  |
| `src/views/GisApp/tools/geodesy/getSphericalPolygonAreaSquareMeters.ts`                                  | Spherical-excess area                             |
| `src/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery.ts`                                          | Coordinate vs P-code vs invalid                   |
| `src/views/GisApp/tools/isClosedRingValid/isClosedRingValid.ts`                                          | Close + self-intersection check                   |
| `src/views/GisApp/tools/MapToolMode.ts`                                                                  | Discriminated tool mode                           |
| `src/views/GisApp/tools/formatMapMeasureReadout/formatMapMeasureReadout.ts`                              | m/km and m²/km² copy data                         |
| `src/views/GisApp/shell/MapToolCluster/IsochroneMapTool.tsx`                                             | Disabled from-a-point slot                        |
| `src/views/GisApp/shell/MapTimeSlider/MapTimeSlider.tsx`                                                 | Range slider + play                               |
| `src/views/GisApp/shell/ClearAoiButton/ClearAoiButton.tsx`                                               | Map-level clear AOI                               |
| `src/views/GisApp/shell/MapToolCluster/GoToMapTool.tsx`                                                  | Search field                                      |
| `src/views/GisApp/shell/MapToolCluster/BufferMapTool.tsx`                                                | Distance popover                                  |
| `src/views/GisApp/shell/MapToolCluster/AnnotateMapTool.tsx`                                              | Sub-cluster                                       |
| `src/views/GisApp/MapCanvas/useMapChromeOverlays/useMapChromeOverlays.ts`                                | AOI outline + measure sources                     |
| `src/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures.ts`                                    | Draw clicks when not Pan                          |
| `src/views/GisApp/layers/makeAnnotationMapSpec/makeAnnotationMapSpec.ts`                                 | Annotation GeoJSON MapSpec                        |
| `src/views/GisApp/panels/LayerPanel/AnnotationLayerRow/AnnotationLayerRow.tsx`                           | Pinned annotation row                             |
| `src/views/GisApp/panels/LayerInspector/DataSection/TimeColumnSelect.tsx`                                | Time column bind                                  |
| `src/views/GisApp/panels/LayerInspector/DataSection/BufferOfLayerFields.tsx`                             | Distance + dissolve                               |
| `tests/data/gis-wave-d/`                                                                                 | Point dates, polygon, P-code CSV                  |
| `tests/e2e/gis-time-range.spec.ts`                                                                       | Slice 8.2                                         |
| `tests/e2e/gis-aoi-filter.spec.ts`                                                                       | Slice 8.3                                         |
| `tests/e2e/gis-buffer-layer.spec.ts`                                                                     | Slice 8.4                                         |
| `tests/e2e/gis-measure.spec.ts`                                                                          | Slice 8.5 measure                                 |
| `tests/e2e/gis-goto.spec.ts`                                                                             | Slice 8.5 go-to                                   |
| `tests/e2e/gis-annotations.spec.ts`                                                                      | Slice 8.6                                         |

## Defaults (use these exact values)

Put numeric defaults on `MapLayerModule` / `AvaMapConfigModule`. Do not add a
second constants file.

```ts
export const GisWaveDDefaults = {
  bufferDistanceMeters: 1_000,
  minBufferDistanceMeters: 100,
  maxBufferDistanceMeters: 1_000_000,
  annotationTextSizePx: 14,
  annotationColor: "#3b82f6",
  annotationStrokeWidthPx: 2,
  annotationAreaOpacity: 0.35,
  earthRadiusMeters: 6_371_008.8,
  collapsedTimeStepMs: 86_400_000,
};
```

`MapLayer.defaultBufferDistanceMeters` = 1_000.
`AvaMapConfig.defaultAnnotationTextSizePx` = 14.
`AvaMapConfig.emptyAnnotations` = `{ isVisible: true, features: [] }`.

## Reserved MapLibre ids (chrome, never data-layer ids)

```ts
export const MapChromeOverlayIds = {
  aoiSource: "ava-map-aoi-outline",
  aoiLineLayer: "ava-map-aoi-outline-line",
  measureSource: "ava-map-measure",
  measureLineLayer: "ava-map-measure-line",
  measureFillLayer: "ava-map-measure-fill",
  annotationSource: "ava-map-annotations",
  annotationFillLayer: "ava-map-annotations-fill",
  annotationLineLayer: "ava-map-annotations-line",
  annotationSymbolLayer: "ava-map-annotations-symbol",
};
```

`syncMap` must not own the AOI or measure ids. Annotations go through
`MapSpec` so z-order can interleave with data layers.

## Reference behavior

DuckDB Spatial (already in the shipped set):

- `ST_Intersects(geom, geom)`, `ST_Point(longitude, latitude)`
- `ST_GeomFromGeoJSON`, `ST_AsGeoJSON`
- `ST_Buffer(geom, distance)`, `ST_Union_Agg(geom)`
- `ST_Transform(..., always_xy := true)` as Wave C bins already use
- Docs: `supabase/functions/queries/DuckDbSpatialExtensionDocumentation.ts`

Time SQL:

```sql
TRY_CAST (time_column AS TIMESTAMP) BETWEEN TRY_CAST (start AS TIMESTAMP) AND TRY_CAST  (end AS TIMESTAMP)
```

Null and unparseable values fail `BETWEEN` and drop out of the window.

---

## Stage 1: persisted contracts

### Task 1: Layer overlay fields and buffer binding

**Files:**

- Modify: `shared/models/AvaMap/MapLayer/GeoBinding.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts`
- Test: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.test.ts`

**Interfaces:**

- Produces: `MapLayer.BufferOfLayerBinding` (`type: "bufferOfLayer"`),
  `timeColumn: QueryColumn.Id | undefined`, `applyAoiFilter: boolean`,
  `MapLayer.defaultBufferDistanceMeters`, `_isAreaGeoBinding` treats
  `bufferOfLayer` as area-producing

- [ ] **Step 1: Write failing constructor tests**

```ts
it("starts overlay fields unset and applying AOI", () => {
  const layer = MapLayer.makeEmpty("Cases");
  expect(layer.timeColumn).toBeUndefined();
  expect(layer.applyAoiFilter).toBe(true);
});

it("keeps a buffer binding when switching to aggregate only", () => {
  const sourceId = uuid<MapLayer.Id>();
  const layer = MapLayer.withSensitivity(
    _makeBufferLayer(sourceId, { mode: "exact" }),
    { mode: "aggregateOnly", minCellCount: 5, minGeoLevel: "district" },
  );
  expect(layer.geoBinding?.type).toBe("bufferOfLayer");
  expect(layer.symbology.type).toBe("fill");
});
```

`_makeBufferLayer` is a test helper: fill symbology, `bufferOfLayer` with
`distanceMeters: 1000`, `dissolve: false`, and the given sensitivity.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend MapLayerModule.test.ts
```

Expected: failure because `timeColumn`, `applyAoiFilter`, and
`bufferOfLayer` do not exist.

- [ ] **Step 3: Add the contracts**

`GeoBinding.types.ts` (keep existing members):

```ts
export type BufferOfLayerBinding = {
  type: "bufferOfLayer";
  layerId: MapLayerId;
  distanceMeters: number;
  dissolve: boolean;
};
```

Import `MapLayerId` from `MapLayer.types.ts` only inside this folder.
`GeoBinding` and `AreaGeoBinding` include `BufferOfLayerBinding`.

`MapLayer.types.ts` `MapLayerCommon` gains:

```ts
timeColumn: QueryColumn.Id | undefined;
applyAoiFilter: boolean;
```

`makeEmpty` and `createArea` set `timeColumn: undefined`,
`applyAoiFilter: true`. `_isAreaGeoBinding` adds
`binding?.type === "bufferOfLayer"`. Export `BufferOfLayerBinding` on the
`MapLayer` namespace. `defaultBufferDistanceMeters` is 1000.

`withSensitivity` must copy `timeColumn` and `applyAoiFilter`. When the new
mode is aggregate only and the binding is `bufferOfLayer`, keep the binding
and switch paint to default fill (same as bins).

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend MapLayerModule.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap/MapLayer
git commit -m "feat(gis): add wave d layer overlay and buffer binding"
```

### Task 2: Annotation types and AvaMapConfig v4 body

**Files:**

- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`

**Interfaces:**

- Consumes: Task 1 layer fields
- Produces: `AvaMapConfigRead` version 4 with `aoi`, `timeRange`,
  `annotations`, `annotationsZIndex`; `AvaMapConfig.AoiPolygon`,
  `AvaMapConfig.TimeRange`, `AvaMapConfig.AnnotationLayer`,
  `AvaMapConfig.AnnotationFeature`, `AvaMapConfig.AnnotationFeatureId`;
  `AvaMapConfig.withAoi`, `withTimeRange`, `withAnnotationFeature`,
  `withoutAnnotationFeature`, `withAnnotationsZIndex`,
  `withBufferLayerInserted`

- [ ] **Step 1: Write failing updater tests**

```ts
it("starts version 4 maps with no overlay and annotations on top", () => {
  const config = AvaMapConfig.makeEmpty();
  expect(config.version).toBe(4);
  expect(config.aoi).toBeUndefined();
  expect(config.timeRange).toBeUndefined();
  expect(config.annotations).toEqual({ isVisible: true, features: [] });
  expect(config.annotationsZIndex).toBe(0);
});

it("rejects a reversed time range", () => {
  expect(() =>
    AvaMapConfig.withTimeRange({
      config: AvaMapConfig.makeEmpty(),
      timeRange: {
        start: "2026-02-01T00:00:00.000Z",
        end: "2026-01-01T00:00:00.000Z",
      },
    }),
  ).toThrow();
});

it("clamps annotationsZIndex to 0..=layers.length", () => {
  const config = AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer: MapLayer.makeEmpty("A"),
  });
  expect(
    AvaMapConfig.withAnnotationsZIndex({ config, annotationsZIndex: 9 })
      .annotationsZIndex,
  ).toBe(1);
});

it("inserts a buffer layer above the source and copies sensitivity", () => {
  const source = _makePolygonLayer();
  const withSource = AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer: source,
  });
  const next = AvaMapConfig.withBufferLayerInserted({
    config: withSource,
    sourceLayerId: source.id,
    distanceMeters: 1000,
    dissolve: false,
    name: "Buffer of Cases",
  });
  const buffer = next.layers[next.layers.indexOf(source) + 1];
  expect(buffer?.geoBinding).toEqual({
    type: "bufferOfLayer",
    layerId: source.id,
    distanceMeters: 1000,
    dissolve: false,
  });
  expect(buffer?.sensitivity.mode).toBe(source.sensitivity.mode);
});

it("rejects a buffer when the source layer is missing or unbound", () => {
  expect(() =>
    AvaMapConfig.withBufferLayerInserted({
      config: AvaMapConfig.makeEmpty(),
      sourceLayerId: uuid<MapLayer.Id>(),
      distanceMeters: 1000,
      dissolve: false,
      name: "Buffer of Missing",
    }),
  ).toThrow();
});
```

`withBufferLayerInserted` throws when the source layer is missing or the
source has no `geoBinding`. A new layer id cannot appear in an existing
`bufferOfLayer` chain, so insert cannot create a cycle. Cycles are rejected
at parse (Task 3) and compile (Task 11). Sensitivity is copied from the
source, so insert cannot mismatch.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend AvaMapConfigModule.test.ts
```

- [ ] **Step 3: Implement types and updaters**

`AvaMapConfig.types.ts`: change `AvaMapConfigRead` version generic to `4`.
Add the spec §4.2 and §4.5 types. `AnnotationFeatureId` is
`UUID<"AnnotationFeature">`.

`makeEmpty` emits `version: 4`, unset `aoi`/`timeRange`, empty annotations,
`annotationsZIndex: 0`. `withLayerAdded` does not change
`annotationsZIndex` (a new layer at the top of the data stack leaves
annotations where they were relative to existing layers). `withStackOrder`
does not move `annotationsZIndex`.

`withTimeRange`: if `timeRange` is defined and `end < start`, throw
`new Error("Time range end must not precede start")`. Unset is allowed.

`withAnnotationsZIndex`:
`Math.min(config.layers.length, Math.max(0, annotationsZIndex))`.

`withBufferLayerInserted` builds `MapLayer.createArea(name)` then sets
`geoBinding` and copies `sensitivity`. Place the new layer immediately after
the source in `layers` (above it in MapLibre order). If
`annotationsZIndex` is greater than the source index, increment it so
annotations stay above the same data layers.

`withAnnotationFeature` / `withoutAnnotationFeature`: append or filter by
id. Removing the last feature leaves `{ isVisible: true, features: [] }`.

Export the new types from the `AvaMapConfig` namespace.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend AvaMapConfigModule.test.ts MapLayerModule.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap
git commit -m "feat(gis): add wave d map overlay updaters"
```

### Task 3: Version 4 schema and migration

**Files:**

- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigV4Schema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/migrateAvaMapConfig.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test.ts`

**Interfaces:**

- Consumes: Task 1 and Task 2 types
- Produces: `AvaMapConfigSchema.fromJson` migrates 1, 2, and 3;
  `toJson` emits 4; reversed `timeRange` rejected; buffer cycle and
  sensitivity mismatch rejected at the JSON boundary

- [ ] **Step 1: Write failing migration tests**

```ts
it("migrates a version 3 config to version 4 without changing wave c layers", () => {
  const parsed = AvaMapConfigSchema.fromJson(createVersion3Json());
  expect(parsed.version).toBe(4);
  expect(parsed.aoi).toBeUndefined();
  expect(parsed.timeRange).toBeUndefined();
  expect(parsed.annotations.features).toEqual([]);
  expect(parsed.annotationsZIndex).toBe(parsed.layers.length);
  expect(parsed.layers[0]?.applyAoiFilter).toBe(true);
  expect(parsed.layers[0]?.timeColumn).toBeUndefined();
  expect(parsed.layers[0]?.symbology).toEqual(waveCLayer.symbology);
});

it("rejects a reversed time range at the json boundary", () => {
  expect(() =>
    AvaMapConfigSchema.fromJson(createVersion4ReversedTimeJson()),
  ).toThrow();
});

it("rejects a buffer cycle at the json boundary", () => {
  expect(() =>
    AvaMapConfigSchema.fromJson(createVersion4CyclicBufferJson()),
  ).toThrow();
});

it("rejects aggregate-only buffer of an exact source", () => {
  expect(() =>
    AvaMapConfigSchema.fromJson(createMismatchedBufferJson()),
  ).toThrow();
});

it("round-trips annotations and an AOI polygon", () => {
  const config = AvaMapConfig.withAoi({
    config: AvaMapConfig.withAnnotationFeature({
      config: AvaMapConfig.makeEmpty(),
      feature: textAnnotation,
    }),
    aoi: unitSquare,
  });
  expect(
    AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
  ).toEqual(config);
});
```

Keep existing v1 and v2 tests. They must still pass: v1 migrates through v2
and v3 into v4.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend AvaMapConfigSchema.test.ts
```

- [ ] **Step 3: Implement v4 schema and migration**

Keep `AvaMapConfigV3Schema` as the v3 parser. Add `AvaMapConfigV4Schema`:

- Layer common gains `timeColumn: uuidType<"QueryColumn">().optional()` and
  `applyAoiFilter: z.boolean()`
- `BufferOfLayerBindingSchema`: `distanceMeters` min 100 max 1_000_000
- `V4GeoBindingSchema` / `V4AreaGeoBindingSchema` include buffer
- `AoiPolygonSchema`: `type: "Polygon"` plus coordinates
- `TimeRangeSchema` with `.refine((range) => range.end >= range.start)`
- Annotation discriminated union on `kind`
- Config: `version: 4`, `aoi` optional, `timeRange` optional,
  `annotations`, `annotationsZIndex: z.number().int().min(0)`

`fromJson`:

- 1 → existing v1 then v2 then v3 then v4
- 2 → existing v2 then v3 then v4
- 3 → `_migrateVersion3`: set `version: 4`, `aoi`/`timeRange` undefined,
  empty annotations, `annotationsZIndex: layers.length`, each layer
  `timeColumn: undefined`, `applyAoiFilter: true`
- 4 → parse, then `_assertBufferInvariants(layers)`

`_assertBufferInvariants`: for every `bufferOfLayer`, source exists, no
cycle (`hasBufferCycle`), and `layer.sensitivity.mode ===
source.sensitivity.mode`. Throw on failure.

Put `hasBufferCycle` in
`shared/models/AvaMap/AvaMapConfig/hasBufferCycle/hasBufferCycle.ts`.
The schema and the compiler both import
`$/models/AvaMap/AvaMapConfig/hasBufferCycle/hasBufferCycle.ts`. Do not put
a second copy under `src/`.

```ts
export function hasBufferCycle(
  layers: readonly MapLayer.T[],
  startLayerId: MapLayer.Id,
): boolean {
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const seen = new Set<MapLayer.Id>();
  let currentId: MapLayer.Id | undefined = startLayerId;
  while (currentId) {
    if (seen.has(currentId)) {
      return true;
    }
    seen.add(currentId);
    const current = byId.get(currentId);
    currentId =
      current?.geoBinding?.type === "bufferOfLayer" ?
        current.geoBinding.layerId
      : undefined;
  }
  return false;
}
```

`toJson` parses through `AvaMapConfigV4Schema`. `schema` on
`AvaMapConfigSchema` becomes the v4 schema.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend AvaMapConfigSchema.test.ts AvaMapConfigModule.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap
git commit -m "feat(gis): persist avamap config version 4"
```

### Task 4: Isochrone slot in the tool cluster

**Files:**

- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/IsochroneMapTool.tsx`
- Test: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx`

**Interfaces:**

- Produces: cluster order Pan | Area, Measure, Buffer, Isochrone, Annotate |
  Go-to. Isochrone `aria-disabled` with later-release reason. Other Wave D
  tools stay unavailable with the existing "not available" reason until
  their slices land.

- [ ] **Step 1: Write the failing cluster test**

```ts
it("keeps pan pressed and disables isochrone as a later release", () => {
  render(<MapToolCluster />);
  expect(
    screen.getByRole("button", { name: "Pan and select" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByRole("button", {
      name: "Isochrone from a point. This tool arrives in a later release.",
    }),
  ).toHaveAttribute("aria-disabled", "true");
});
```

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend MapToolCluster.test.ts
```

- [ ] **Step 3: Insert Isochrone between Buffer and Annotate**

Use `IconRoute` from Tabler. Copy: `t\`Isochrone from a point\``and`t\`This tool arrives in a later release.\``. Keep Area, Measure, Buffer,
Annotate, and Go-to on `UnavailableMapTool`with`t\`This tool is not available.\`` until later tasks replace them.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend MapToolCluster.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/shell/MapToolCluster
git commit -m "feat(gis): reserve the isochrone tool slot"
```

---

## Stage 2: time

### Task 5: Time SQL wrap, overlay options, query keys

**Files:**

- Create: `src/clients/maps/MapLayerSpatialQuery/applyTimePredicateToSourceSql/applyTimePredicateToSourceSql.ts`
- Create: `src/clients/maps/MapLayerSpatialQuery/applyTimePredicateToSourceSql/applyTimePredicateToSourceSql.test.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.types.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/__tests__/compileMapLayerSpatialQuery.pointAggregation.test.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.test.ts`
- Create: `src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql.ts`
- Create: `src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql.test.ts`

**Interfaces:**

- Consumes: `AvaMapConfig.TimeRange`, `MapLayer.timeColumn`
- Produces: `applyTimePredicateToSourceSql`, `compileLatLngOverlaySql`,
  `CompileOptions.overlay` and `CompileOptions.stack`, query keys that
  include `timeRange` and `timeColumn`

```ts
export type MapOverlay = {
  aoi: AvaMapConfig.AoiPolygon | undefined;
  timeRange: AvaMapConfig.TimeRange | undefined;
};

export type CompileOptions = {
  layer: MapLayer.T;
  metadata: ResolvedMapLayerMetadata;
  zoomBand: number;
  simplificationReferenceLatitude: number;
  overlay: MapOverlay;
  stack: readonly MapLayer.T[];
};
```

- [ ] **Step 1: Write failing SQL tests**

```ts
it("wraps source sql with an inclusive timestamp between", () => {
  const sql = applyTimePredicateToSourceSql({
    sourceSql: "SELECT * FROM cases",
    timeColumnName: "observed_at",
    timeRange: {
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-31T23:59:59.000Z",
    },
  });
  expect(sql).toContain("TRY_CAST");
  expect(sql).toContain("BETWEEN");
  expect(sql).toContain("observed_at");
  expect(sql).not.toContain("ST_");
});

it("returns source sql unchanged without a time range", () => {
  expect(
    applyTimePredicateToSourceSql({
      sourceSql: "SELECT 1",
      timeColumnName: "observed_at",
      timeRange: undefined,
    }),
  ).toBe("SELECT 1");
});

it("compiles lat/lng time-only sql without spatial functions", () => {
  const sql = compileLatLngOverlaySql({
    sourceSql: "SELECT * FROM cases",
    layer: latLngLayerWithTime,
    overlay: { aoi: undefined, timeRange: january },
    latitudeColumnName: "latitude",
    longitudeColumnName: "longitude",
    timeColumnName: "observed_at",
  });
  expect(sql).toContain("BETWEEN");
  expect(sql).not.toContain("ST_");
});
```

Add a point-aggregation compiler test: when `overlay.timeRange` is set and
the layer has `timeColumn`, the compiled SQL contains `BETWEEN` before
`parsed_points`.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend applyTimePredicateToSourceSql.test.ts compileLatLngOverlaySql.test.ts compileMapLayerSpatialQuery.pointAggregation.test.ts
```

- [ ] **Step 3: Implement wrap and thread overlay**

```ts
export function applyTimePredicateToSourceSql(options: {
  sourceSql: string;
  timeColumnName: string | undefined;
  timeRange: AvaMapConfig.TimeRange | undefined;
}): string {
  const { sourceSql, timeColumnName, timeRange } = options;
  if (!timeColumnName || !timeRange) {
    return sourceSql;
  }
  const column = quoteSqlIdentifier(timeColumnName);
  const start = quoteSqlLiteral(timeRange.start);
  const end = quoteSqlLiteral(timeRange.end);
  return `SELECT * FROM (${sourceSql}) AS overlay_source WHERE TRY_CAST(${column} AS TIMESTAMP) BETWEEN TRY_CAST(${start} AS TIMESTAMP) AND TRY_CAST(${end} AS TIMESTAMP)`;
}
```

In `compileMapLayerSpatialQuery`, after `structuredQueryToSql`, resolve the
time column name from `metadata.sourceColumnNames.get(layer.timeColumn)`
when `layer.timeColumn` is set, then wrap. Pass `overlay: { aoi:
undefined, timeRange: undefined }` and `stack: [layer]` in existing compiler
tests so they keep compiling.

`compileLatLngOverlaySql` in this task implements the time-only wrap (no
`ST_*`). If `overlay.aoi` is set, return the time-only SQL still (AOI is
ignored here). Task 8 replaces the AOI branch with `ST_Point` /
`ST_Intersects` in this same function.

`MapLayerData.getQueryKeyFromMapLayer` gains an overlay argument:

```ts
getQueryKeyFromMapLayer: (
  layer: MapLayer.T,
  spatialContext?: { ... },
  overlay?: MapOverlay,
): unknown[] => {
  return [
    "mapLayerData",
    layer.id,
    layer.source,
    layer.geoBinding,
    layer.sensitivity,
    layer.timeColumn,
    layer.applyAoiFilter,
    overlay?.timeRange,
    overlay?.aoi,
    ...(spatialContext ? [spatialContext] : []),
  ];
}
```

`useMapLayersData` takes `overlay: MapOverlay`. For `latLngColumns`, if
`compileLatLngOverlaySql` returns SQL, call `runStructuredQuery` with that
`rawSql`. Time-only does not wait on spatial.

Update every `compileMapLayerSpatialQuery(...)` call site to pass `overlay`
and `stack`.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend applyTimePredicateToSourceSql.test.ts compileLatLngOverlaySql.test.ts compileMapLayerSpatialQuery.pointAggregation.test.ts useMapLayersData.test.ts MapLayerData
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/maps/MapLayerSpatialQuery src/views/GisApp/layers/useMapLayersData
git commit -m "feat(gis): filter map layers by time in the compiler"
```

### Task 6: Time column inspector

**Files:**

- Create: `src/views/GisApp/panels/LayerInspector/DataSection/TimeColumnSelect.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/DataSection/TimeColumnSelect.test.tsx`
- Create: `src/views/GisApp/layers/MapLayerUpdates/timeColumnUpdates.ts`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.tsx`
- Modify: `src/views/GisApp/layers/isMapTimeColumn/isMapTimeColumn.ts` (create)

**Interfaces:**

- Consumes: `MapLayer.timeColumn`
- Produces: `isMapTimeColumn(column)` true for `date`, `timestamp`, and
  `varchar`; false for `time`, `bigint`, `double`, `boolean`.
  `MapLayerUpdates.withTimeColumn`

- [ ] **Step 1: Write failing tests**

```ts
it("accepts date, timestamp, and text columns", () => {
  expect(isMapTimeColumn(_column("date"))).toBe(true);
  expect(isMapTimeColumn(_column("timestamp"))).toBe(true);
  expect(isMapTimeColumn(_column("varchar"))).toBe(true);
});

it("rejects time-of-day and numeric columns", () => {
  expect(isMapTimeColumn(_column("time"))).toBe(false);
  expect(isMapTimeColumn(_column("bigint"))).toBe(false);
});

it("does not bind a numeric column from the inspector", () => {
  render(<TimeColumnSelect ... numericOnlyColumns ... />);
  expect(screen.queryByRole("option", { name: "count" })).toBeNull();
});
```

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend isMapTimeColumn TimeColumnSelect.test.tsx
```

- [ ] **Step 3: Implement**

```ts
export function isMapTimeColumn(column: QueryColumn.T): boolean {
  const dataType = column.baseColumn.dataType;
  return (
    dataType === "date" || dataType === "timestamp" || dataType === "varchar"
  );
}
```

`withTimeColumn` no-ops (returns same reference) when the column is not
`isMapTimeColumn` or is not in `layer.source.queryColumns`. Clearing the
select writes `undefined`. Label: `t\`Time column\``. Data section renders
it below the binding controls. Buffer layers still show it (buffer output
has no source time; hide the select when `geoBinding?.type ===
"bufferOfLayer"`).

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend isMapTimeColumn TimeColumnSelect.test.tsx DataSection
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/panels/LayerInspector/DataSection src/views/GisApp/layers
git commit -m "feat(gis): bind a layer time column"
```

### Task 7: Time slider, extent, play, reduced motion

**Files:**

- Create: `src/views/GisApp/shell/MapTimeSlider/MapTimeSlider.tsx`
- Create: `src/views/GisApp/shell/MapTimeSlider/MapTimeSlider.module.css`
- Create: `src/views/GisApp/shell/MapTimeSlider/MapTimeSlider.test.tsx`
- Create: `src/views/GisApp/shell/MapTimeSlider/shiftTimeRange/shiftTimeRange.ts`
- Create: `src/views/GisApp/shell/MapTimeSlider/shiftTimeRange/shiftTimeRange.test.ts`
- Create: `src/views/GisApp/shell/MapTimeSlider/clampTimeRangeToExtent/clampTimeRangeToExtent.ts`
- Create: `src/clients/maps/MapLayerTimeExtent/getMapTimeExtentSql/getMapTimeExtentSql.ts`
- Create: `src/clients/maps/MapLayerTimeExtent/getMapTimeExtentSql/getMapTimeExtentSql.test.ts`
- Create: `src/views/GisApp/shell/MapTimeSlider/useMapTimeExtent.ts`
- Modify: `src/views/GisApp/shell/MapShell/MapShell.tsx` (slot above cluster)
- Modify: `src/views/GisApp/GisAppMapShell.tsx`
- Modify: `src/views/GisApp/useGisApp.ts` to pass overlay into `useMapLayersData`

**Interfaces:**

- Consumes: Task 5 overlay, Task 6 `timeColumn`
- Produces: `shiftTimeRange`, `clampTimeRangeToExtent`,
  `getMapTimeExtentSql`, slider visible only when some layer has
  `timeColumn`

```ts
export function shiftTimeRange(options: {
  timeRange: AvaMapConfig.TimeRange;
  extent: AvaMapConfig.TimeRange;
  collapsedStepMs: number;
}): AvaMapConfig.TimeRange;
```

Play translates `[start, end]` by `end - start` milliseconds, or by
`collapsedStepMs` (86_400_000) when start === end, then clamps to `extent`.
If the shifted window would start after `extent.end`, return the current
range (play stops).

```ts
export function clampTimeRangeToExtent(options: {
  timeRange: AvaMapConfig.TimeRange | undefined;
  extent: AvaMapConfig.TimeRange | undefined;
}): AvaMapConfig.TimeRange | undefined;
```

If `timeRange` is unset, return unset. If `extent` is unset, return
`timeRange`. Otherwise intersect. Empty intersection returns `undefined`.

`getMapTimeExtentSql` unions `MIN(TRY_CAST(col AS TIMESTAMP))` and `MAX`
across participating layers' source SQL, aliased `extent_start` /
`extent_end`. No `ST_*`.

- [ ] **Step 1: Write failing tests** for `shiftTimeRange`,
      `clampTimeRangeToExtent`, `getMapTimeExtentSql`, and MapTimeSlider:
      hidden with no `timeColumn`; play button present; `useReducedMotion` true
      hides play (`queryByRole("button", { name: "Play" })` null) and keeps
      the slider.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend shiftTimeRange.test.ts clampTimeRangeToExtent.test.ts getMapTimeExtentSql.test.ts MapTimeSlider.test.tsx
```

- [ ] **Step 3: Implement slider and wire overlay**

Mantine `RangeSlider` is pixel-based. Map instants to 0..1000 using
`Date.parse`. `aria-label`: `t\`Time range\``. Play:
`t\`Play\``. Changing the slider calls
`AvaMapConfig.withTimeRange`. Unset `timeRange` while extent exists shows
handles at 0 and 1000 without writing a range until the user moves a
handle.

Place the slider in `MapShellChrome` above the tool cluster, bottom center,
only when `hasTimeColumn`. CSS: do not cover the cluster; use the prototype
gap tokens already on the cluster.

`useGisApp` passes `{ aoi: mapConfig.aoi, timeRange: mapConfig.timeRange }`
into `useMapLayersData`. When extent loads, if `mapConfig.timeRange` is set,
write `clampTimeRangeToExtent` back through `updateConfig` only when the
clamped value is not equal (avoid loops).

Mock `useReducedMotion` the same way `FitMapBounds.test.ts` does.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend shiftTimeRange clampTimeRangeToExtent getMapTimeExtentSql MapTimeSlider.test.tsx
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/shell/MapTimeSlider src/clients/maps/MapLayerTimeExtent src/views/GisApp
git commit -m "feat(gis): add the map time slider"
```

---

## Stage 3: AOI

### Task 8: AOI compiler predicates and lat/lng wrap

**Files:**

- Create: `src/clients/maps/MapLayerSpatialQuery/applyAoiPredicateToGeometrySql/applyAoiPredicateToGeometrySql.ts`
- Create: `src/clients/maps/MapLayerSpatialQuery/applyAoiPredicateToGeometrySql/applyAoiPredicateToGeometrySql.test.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileLatLngOverlaySql/compileLatLngOverlaySql.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileGeometryColumnQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compilePointAggregationQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileGridBinQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileBoundaryJoinQuery.ts`
- Modify: matching compiler tests
- Modify: `src/views/GisApp/layers/useMapLayersData/useMapLayersData.ts` so AOI
  on lat/lng requires spatial

**Interfaces:**

- Consumes: `AvaMapConfig.AoiPolygon`, `MapLayer.applyAoiFilter`
- Produces: `makeAoiGeometrySql`, `makeSourceAoiPredicateSql`,
  `makeOutputAoiPredicateSql`; lat/lng + AOI SQL contains `ST_Point` and
  `ST_Intersects`

```ts
export function makeAoiGeometrySql(aoi: AvaMapConfig.AoiPolygon): string {
  return `ST_GeomFromGeoJSON(${quoteSqlLiteral(JSON.stringify(aoi))})`;
}
```

`makeSourceAoiPredicateSql(geometrySql, aoi)` =>
`ST_Intersects(${geometrySql}, ${makeAoiGeometrySql(aoi)})`.

Apply source predicate after parsed geometry / parsed points exist, before
aggregate or bin. Apply output predicate on the final feature geometry
before `ST_AsGeoJSON`. `joinToBoundaries` skips source intersect and only
filters output boundary polygons. If `!layer.applyAoiFilter` or `!aoi`,
skip both.

Lat/lng AOI SQL (with optional time wrap inside):

```sql
SELECT
  *
FROM
  (source) AS overlay_source
WHERE
  ST_Intersects (
    ST_Point (longitude, latitude),
    ST_GeomFromGeoJSON ('...')
  )
  AND < time predicate if present >
```

`useMapLayersData`: lat/lng needs spatial when `overlay.aoi` is set and
`layer.applyAoiFilter`. While spatial is unavailable, use the existing
spatial-unavailable error. No JS fallback.

- [ ] **Step 1: Write failing tests** for GeoJSON quoting, source vs output
      predicates, join-to-boundaries SQL containing one `ST_Intersects` on the
      boundary geometry and none on source rows, point-aggregation SQL
      intersecting `point_geometry` before the aggregate CTE, lat/lng SQL
      containing `ST_Point` and `ST_Intersects`, and a query-key test that
      changing `aoi` changes the key.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend applyAoiPredicateToGeometrySql.test.ts compileLatLngOverlaySql.test.ts compileMapLayerSpatialQuery
```

- [ ] **Step 3: Implement predicates in each compiler.** Keep functions
      under 45 lines; extract CTE WHERE snippets.

- [ ] **Step 4: Run GREEN** including
      `makeLayerSpecFromMapLayer` aggregate-only invariant tests if they exist;
      add one: aggregate-only + AOI compile still has no circle layer spec.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/maps/MapLayerSpatialQuery src/views/GisApp/layers/useMapLayersData
git commit -m "feat(gis): filter map layers by AOI in the compiler"
```

### Task 9: Area tool, validity, clear, spatial gating

**Files:**

- Create: `src/views/GisApp/tools/MapToolMode.ts`
- Create: `src/views/GisApp/tools/isClosedRingValid/isClosedRingValid.ts`
- Create: `src/views/GisApp/tools/isClosedRingValid/isClosedRingValid.test.ts`
- Create: `src/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures.ts`
- Create: `src/views/GisApp/MapCanvas/useMapChromeOverlays/useMapChromeOverlays.ts`
- Modify: `src/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers.ts`
- Modify: `src/views/GisApp/MapCanvas/useLatestMapValues.ts`
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.tsx`
- Modify: `src/views/GisApp/GisAppMapShell.tsx`
- Create: `src/views/GisApp/shell/ClearAoiButton/ClearAoiButton.tsx`
- Create: `src/views/GisApp/shell/ClearAoiButton/ClearAoiButton.test.tsx`

**Interfaces:**

- Produces: `MapToolMode`, `isClosedRingValid`, Area tool available when
  spatial is `available`, invalid ring not committed, clear unsets `aoi`

```ts
export type MapToolMode =
  | { type: "pan" }
  | { type: "aoi" }
  | { type: "measure" }
  | { type: "buffer" }
  | { type: "annotate"; kind: "text" | "arrow" | "freehand" | "area" }
  | { type: "goto" };
```

`isClosedRingValid(ring: readonly [number, number][])`: at least 4
positions, first equals last, no consecutive duplicate vertices, no
self-intersecting segments (standard two-segment intersection, ignoring
shared endpoints of adjacent edges).

- [ ] **Step 1: Write failing tests** for valid unit square, unclosed
      triangle, bowtie self-intersection, Area button enabled only when spatial
      is available (mock `DuckDbClient.getSpatialAvailability`), clicking Area
      sets `aria-pressed`, Escape returns to Pan without writing `aoi`,
      committing a valid ring writes `mapConfig.aoi`, `ClearAoiButton` shows
      `t\`Clear area filter\``when`aoi` is set and clicking it unsets.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend isClosedRingValid.test.ts MapToolCluster.test.ts ClearAoiButton.test.tsx
```

- [ ] **Step 3: Implement**

Hold `mapToolMode` in `useGisApp`. Pass it to `MapToolCluster` and canvas.
When mode is not `pan`, `_createMapClickHandler` returns without inspecting
features. `useMapToolGestures` registers click / dblclick / keydown:
Area clicks append vertices; double-click or Enter closes; if invalid, do
not call `withAoi` and set a chrome status string
`t\`Close a valid ring that does not cross itself.\``; if valid, close the
ring (repeat first coordinate) and `AvaMapConfig.withAoi`.

`useMapChromeOverlays` upserts `MapChromeOverlayIds.aoiSource` as a line
FeatureCollection of the committed polygon plus in-progress vertices.
Paint: dashed line, not a fill. Re-add on `style.load`. `syncMap` must
ignore these ids (never put them in `MapSpec`).

Clear control: when `mapConfig.aoi` is set, render a button above the tool
cluster labelled `t\`Clear area filter\``that calls`withAoi({ aoi: undefined })`. Do not put it on `MapStatusCard` (that card
is per selected layer; AOI is map-level).

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend isClosedRingValid.test.ts MapToolCluster.test.ts ClearAoiButton.test.tsx
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/tools src/views/GisApp/MapCanvas src/views/GisApp/shell/MapToolCluster src/views/GisApp/shell/ClearAoiButton
git commit -m "feat(gis): draw and clear an area of interest"
```

### Task 10: Apply-area-filter switch

**Files:**

- Modify: `src/views/GisApp/panels/LayerInspector/FilterSection/FilterSection.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/FilterSection/FilterSection.test.tsx`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
  (add `withApplyAoiFilter` in `layerMetaUpdates.ts`)

**Interfaces:**

- Produces: `MapLayerUpdates.withApplyAoiFilter`; switch default on; does
  not write into `QueryFiltersField`

- [ ] **Step 1: Write failing test** that the Filter section has a switch
      named `Apply area filter`, default checked, and toggling it sets
      `applyAoiFilter` false without adding a query filter rule.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend FilterSection.test.tsx
```

- [ ] **Step 3: Implement** a Mantine `Switch` above `QueryFiltersField`.
      Hide it on the annotation row (that row is not a `MapLayer`).

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend FilterSection.test.tsx
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/panels/LayerInspector/FilterSection src/views/GisApp/layers/MapLayerUpdates
git commit -m "feat(gis): let a layer opt out of the area filter"
```

---

## Stage 4: buffer

### Task 11: Buffer compiler

**Files:**

- Create: `src/clients/maps/MapLayerSpatialQuery/makeMetersCrsSql/makeMetersCrsSql.ts`
  (move the CASE from `compileGridBinQuery.ts`, keep behavior identical)
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileGridBinQuery.ts`
  to import it
- Create: `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.ts`
- Create: `src/clients/maps/MapLayerSpatialQuery/compileBufferOfLayerQuery/compileBufferOfLayerQuery.test.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts`
  (`isQueryable` true for `bufferOfLayer` when the source id exists on the
  stack)

**Interfaces:**

- Consumes: `hasBufferCycle`, `CompileOptions.stack`, Wave C meters CRS
- Produces: `compileBufferOfLayerQuery`; SQL contains `ST_Buffer` and
  `ST_Transform`; dissolve uses `ST_Union_Agg`; aggregate-only source SQL
  does not select source points

- [ ] **Step 1: Write failing tests**

```ts
it("buffers source output in a meters crs", () => {
  const { rawSql } = compileMapLayerSpatialQuery({
    layer: bufferLayer,
    metadata: sourceMetadata,
    overlay: emptyOverlay,
    stack: [polygonSource, bufferLayer],
    zoomBand: 0,
    simplificationReferenceLatitude: 0,
  });
  expect(rawSql).toContain("ST_Buffer");
  expect(rawSql).toContain("ST_Transform");
  expect(rawSql).toContain("concat('EPSG:'");
});

it("dissolves with ST_Union_Agg", () => {
  expect(dissolvedPlan.rawSql).toContain("ST_Union_Agg");
});

it("throws on a cycle", () => {
  expect(() => compileMapLayerSpatialQuery(cyclicOptions)).toThrow();
});

it("throws on a sensitivity mismatch", () => {
  expect(() => compileMapLayerSpatialQuery(mismatchOptions)).toThrow();
});

it("does not mention source point columns for an aggregate-only source", () => {
  expect(aggregateBufferPlan.rawSql).not.toContain("latitude");
});
```

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend compileBufferOfLayerQuery.test.ts compileMapLayerSpatialQuery.gridBin.test.ts
```

- [ ] **Step 3: Implement**

`compileMapLayerSpatialQuery` `.with({ type: "bufferOfLayer" }, ...)`.
Compile the source layer with the overlay the **source** participates in
(`source.applyAoiFilter`, `source.timeColumn`, same map `aoi` /
`timeRange`). Do not invent a JS buffer.

Wrap the existing spatial envelope. The envelope column is
`MapLayerSpatialQueryColumns.featureCollection`:

```sql
WITH source_envelope AS (
  <sourcePlan.rawSql>
),
source_features AS (
  SELECT ST_GeomFromGeoJSON(
    json_extract_string(feature.value, '$.geometry')
  ) AS geom
  FROM source_envelope,
    json_each(
      json_extract(
        source_envelope.${featureCollectionColumn},
        '$.features'
      )
    ) AS feature
),
projected AS (
  SELECT ST_Transform(
    geom, 'EPSG:4326', meters_crs, always_xy := true
  ) AS geom, meters_crs
  FROM source_features, buffer_crs
)
```

`buffer_crs` uses `makeMetersCrsSql` from the centroid of `source_features`.
`ST_Buffer(geom, distanceMeters)` then `ST_Transform` back to 4326.
Dissolve: `SELECT ST_Union_Agg(geom) AS geom FROM buffered`. Rebuild the
standard one-row feature-collection envelope from those polygons. Family is
`"polygon"`.

`MapLayerData.getQueryKeyFromMapLayer` for a buffer layer must include the
source layer's query key (id, source, geoBinding, sensitivity, timeColumn,
applyAoiFilter) so a source overlay change refetches the buffer.

- [ ] **Step 4: Run GREEN** including existing grid-bin tests (extraction
      must not change bin SQL meaning).

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/clients/maps/MapLayerSpatialQuery src/views/GisApp/layers/useMapLayersData
git commit -m "feat(gis): compile buffer-of-layer in duckdb"
```

### Task 12: Buffer tool and inspector

**Files:**

- Create: `src/views/GisApp/shell/MapToolCluster/BufferMapTool.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/BufferMapTool.test.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/DataSection/BufferOfLayerFields.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/DataSection/BufferOfLayerFields.test.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/DataSectionBindingControls.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/GeometryBindingTypeSelect.tsx`
  (do **not** add `bufferOfLayer` to the type select)
- Modify: `src/views/GisApp/shell/MapToolCluster/MapToolCluster.tsx`
- Modify: `src/views/GisApp/layers/MapLayerUpdates` for distance/dissolve

**Interfaces:**

- Consumes: `AvaMapConfig.withBufferLayerInserted`
- Produces: Buffer tool enabled when spatial is `available`, a data layer
  (not annotation) is selected, and that layer has `geoBinding`; confirm
  inserts a named layer; inspector can edit distance and dissolve only

- [ ] **Step 1: Write failing tests**

Popover labelled `Buffer around a layer`. Confirm disabled without
selection, without geometry, or when spatial is unavailable. Confirm with a
polygon layer calls `onBufferConfirm({ distanceMeters: 1000, dissolve:
false })`. Inspector on a buffer layer shows a read-only source name,
`NumberInput` distance clamped 100–1_000_000, and dissolve `Switch`.
`GeometryBindingTypeSelect` still has no `bufferOfLayer` option.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend BufferMapTool.test.tsx BufferOfLayerFields.test.tsx GeometryBindingTypeSelect
```

- [ ] **Step 3: Implement.** Name via Lingui `t\`Buffer of ${sourceName}\``.
`DataSection`when`geoBinding.type === "bufferOfLayer"`hides the binding
type select and source picker (source is the other layer), shows`BufferOfLayerFields`.

- [ ] **Step 4: Run GREEN**

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/shell/MapToolCluster src/views/GisApp/panels/LayerInspector
git commit -m "feat(gis): insert a buffer layer from the tool cluster"
```

---

## Stage 5: measure and go-to

### Task 13: Measure overlay

**Files:**

- Create: `src/views/GisApp/tools/geodesy/getSphericalDistanceMeters.ts`
- Create: `src/views/GisApp/tools/geodesy/getSphericalDistanceMeters.test.ts`
- Create: `src/views/GisApp/tools/geodesy/getSphericalPolygonAreaSquareMeters.ts`
- Create: `src/views/GisApp/tools/geodesy/getSphericalPolygonAreaSquareMeters.test.ts`
- Create: `src/views/GisApp/tools/formatMapMeasureReadout/formatMapMeasureReadout.ts`
- Create: `src/views/GisApp/tools/formatMapMeasureReadout/formatMapMeasureReadout.test.ts`
- Modify: `useMapToolGestures`, `useMapChromeOverlays`, `MapToolCluster`
- Create: `src/views/GisApp/shell/MapToolCluster/MeasureReadout.tsx`

**Interfaces:**

- Produces: haversine with `GisWaveDDefaults.earthRadiusMeters`; area via
  spherical excess on a closed ring; readout uses meters if `< 1000`, else
  kilometers (same for m² / km² with 1_000_000); Pan or Escape clears
  vertices; nothing written to `AvaMapConfig`

`formatMapMeasureReadout` returns `{ kind: "length"; meters: number } |
{ kind: "lengthAndArea"; meters: number; squareMeters: number }` — no
translated strings. The component translates.

- [ ] **Step 1: Write failing tests** for equator 1° ≈ 111_195 m (allow
      1% ), zero for empty path, area of a small square, unit thresholds 999.9 m
      vs 1000 m, Measure button available without spatial, overlay gone after
      Pan (`queryByText` length readout null).

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend getSphericalDistanceMeters.test.ts getSphericalPolygonAreaSquareMeters.test.ts formatMapMeasureReadout.test.ts MapToolCluster.test.ts
```

- [ ] **Step 3: Implement.** Do not add vertices to annotations. Chrome
      line layer uses a solid stroke distinct from the AOI dash.

- [ ] **Step 4: Run GREEN**

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/tools src/views/GisApp/shell/MapToolCluster src/views/GisApp/MapCanvas
git commit -m "feat(gis): add ephemeral geodesic measure"
```

### Task 14: Go-to coordinate and P-code

**Files:**

- Create: `src/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery.ts`
- Create: `src/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery.test.ts`
- Create: `src/views/GisApp/shell/MapToolCluster/GoToMapTool.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/GoToMapTool.test.tsx`
- Create: `src/views/GisApp/tools/findBoundaryFeatureByPcode/findBoundaryFeatureByPcode.ts`
- Modify: `MapToolCluster.tsx`, `useGisApp.ts` (`fitBoundsRequest`)

**Interfaces:**

```ts
export type MapGoToQuery =
  | { type: "coordinate"; longitude: number; latitude: number }
  | { type: "pcode"; code: string }
  | { type: "invalid"; reason: "unparsed" | "outOfRange" };

export function parseMapGoToQuery(value: string): MapGoToQuery;
```

Split on comma or whitespace into two numbers when possible. If one
absolute value is `> 90`, that number is longitude. Otherwise latitude,
longitude. Finite; lat in [-90, 90]; lng in [-180, 180]. Otherwise if the
trimmed string is non-empty, `{ type: "pcode", code: trimmed }`. Empty is
`unparsed`.

P-code: look at `mapConfig.layers` bindings `joinToBoundaries` and
`aggregatePointsToBoundaries`, collect `boundary.datasetId` + key column.
`findBoundaryFeatureByPcode` matches exact string on the key in the already
loaded spatial FeatureCollection properties for that layer (do not add a
new DuckDB query if the layer's view state already has features). If no
boundary layer exists, the UI error is
`t\`No boundary layer on this map to look up a P-code.\``If none match:`t\`No matching P-code.\``Coordinate fly:`FitBoundsRequest`around a
tiny pad,`animate: false`when`useReducedMotion()`.

- [ ] **Step 1: Write failing parse tests** (`10, 20` → lat 10 lng 20;
      `120, 10` → lng 120 lat 10; `91, 10` invalid outOfRange; `COD-NK` pcode)
      and GoTo field tests for those errors.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend parseMapGoToQuery.test.ts GoToMapTool.test.tsx
```

- [ ] **Step 3: Implement search in the cluster.** Available without
      spatial. Submit on Enter.

- [ ] **Step 4: Run GREEN**

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/tools/parseMapGoToQuery src/views/GisApp/shell/MapToolCluster src/views/GisApp/tools/findBoundaryFeatureByPcode
git commit -m "feat(gis): go to a coordinate or p-code"
```

---

## Stage 6: annotations

### Task 15: Annotation MapSpec and z-index

**Files:**

- Create: `src/views/GisApp/layers/makeAnnotationMapSpec/makeAnnotationMapSpec.ts`
- Create: `src/views/GisApp/layers/makeAnnotationMapSpec/makeAnnotationMapSpec.test.ts`
- Modify: `src/views/GisApp/layers/useAvaMapRender/useAvaMapRender.ts`
- Modify: `src/views/GisApp/layers/MapLayerIds.ts` or use
  `MapChromeOverlayIds` for annotation ids (they ARE in MapSpec)

**Interfaces:**

```ts
export function makeAnnotationMapSpec(options: {
  annotations: AvaMapConfig.AnnotationLayer;
}): MapSpec;
```

Empty features or `isVisible: false` still returns a spec with an empty
FeatureCollection and `layout.visibility: none` when hidden, so z-order
stays stable.

`useAvaMapRender` splits `renderedLayers` at `annotationsZIndex`, merges
`[...belowSpecs, annotationSpec, ...aboveSpecs]`. Include
`mapConfig.annotations` and `annotationsZIndex` in the `useMemo` deps.

Interactive ids include the annotation fill/line/symbol ids when visible so
select/delete can hit them.

- [ ] **Step 1: Write failing tests** for four feature kinds in one
      FeatureCollection, hidden visibility, z-index 0 putting annotations
      below a data layer in `spec.layers` order.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend makeAnnotationMapSpec.test.ts useAvaMapRender
```

- [ ] **Step 3: Implement.** Text uses a `symbol` layer `text-field` from
      `['get', 'text']`. Arrow and freehand are `line`. Area is `fill` plus
      line. Properties carry `kind` and `id`.

- [ ] **Step 4: Run GREEN** plus aggregate-only renderer invariant (still
      no circle from aggregate-only even with annotations present).

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/layers
git commit -m "feat(gis): render persisted annotations in map spec"
```

### Task 16: Annotate tools, pinned row, persist

**Files:**

- Create: `src/views/GisApp/shell/MapToolCluster/AnnotateMapTool.tsx`
- Create: `src/views/GisApp/shell/MapToolCluster/AnnotateMapTool.test.tsx`
- Create: `src/views/GisApp/panels/LayerPanel/AnnotationLayerRow/AnnotationLayerRow.tsx`
- Create: `src/views/GisApp/panels/LayerPanel/AnnotationLayerRow/AnnotationLayerRow.test.tsx`
- Modify: `LayerList.tsx` / `GisAppLayerPanel` to splice the pinned row at
  `annotationsZIndex` (panel order is top-first: convert z-index to row
  index as `layers.length - annotationsZIndex`)
- Modify: `useMapToolGestures` for text/arrow/freehand/area
- Create: a compact `AnnotationFeatureInspector` (color, text, delete)
- Modify: `MapLayerUpdates` is not used; use `AvaMapConfig.withAnnotationFeature`

**Interfaces:**

- First feature creates the pinned row. Last feature deleted removes the
  row (`features.length === 0` → no row). Row toggle writes
  `annotations.isVisible`. Alt+Arrow on the annotation row calls
  `withAnnotationsZIndex`. Cannot Add-layer an annotation. Keyboard delete
  removes the selected feature.

- [ ] **Step 1: Write failing tests** for sub-cluster four buttons, adding
      a text feature shows a row named `t\`Annotations\``, deleting the last
feature removes the row, AOI/time do not change annotation coordinates
(unit test: `makeAnnotationMapSpec` ignores overlay), freehand with one
      vertex discarded.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend AnnotateMapTool.test.tsx AnnotationLayerRow.test.tsx
```

- [ ] **Step 3: Implement gestures.** Text: click → feature with empty
      text → focus an input. Arrow: two clicks. Freehand: pointermove while
      down. Area: reuse `isClosedRingValid` but write an annotation, not `aoi`.
      Default paint from `GisWaveDDefaults`.

- [ ] **Step 4: Run GREEN** and `pnpm translations extract` / compile for
      new copy.

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp
git commit -m "feat(gis): annotate the map and pin the annotation row"
```

---

## Stage 7: verification

### Task 17: Focused end-to-end tests

**Files:**

- Create: `tests/data/gis-wave-d/gis-wave-d-points.csv`
  (`site_id,observed_at,cases,longitude,latitude` with ISO dates spanning
  two weeks, ~8 rows near 10,10 plus one outlier at 11,10)
- Create: `tests/data/gis-wave-d/gis-wave-d-boundaries.csv`
  (P-code, name, WKT polygon covering 10,10)
- Create: the six spec files listed in File structure
- Modify: `tests/e2e/helpers/constants.ts` with paths and row counts

Reuse `seedAvaMap`, `importDatasetViaUi`, `deleteMapsByIds`,
`deleteDatasetAndShares`. Drive AOI/time/buffer/measure/annotate/go-to
through the UI. `finally` cleanup. Timeout ≤ 45s.

1. `gis-time-range.spec.ts` — bind time column, drag range, reload, outlier
   week gone.
2. `gis-aoi-filter.spec.ts` — tagged `@online`; draw a
   ring around 10,10; outlier gone; opt a second layer out.
3. `gis-buffer-layer.spec.ts` — spatial; buffer the boundary layer; reload
   still shows a polygon source named Buffer of …; Aggregate only path does
   not expose point features (`queryRenderedFeatures` has no Point).
4. `gis-measure.spec.ts` — two clicks, readout visible, Pan, readout gone.
5. `gis-goto.spec.ts` — type `10, 10` and a seeded P-code; camera moves
   (`window.__avandarE2EMap.getCenter()`).
6. `gis-annotations.spec.ts` — text + area; reload; hide annotation row;
   features not rendered.

- [ ] **Step 1: Write the specs**
- [ ] **Step 2: Run each file one at a time**

```bash
pnpm test:e2e tests/e2e/gis-time-range.spec.ts
pnpm test:e2e tests/e2e/gis-aoi-filter.spec.ts
pnpm test:e2e tests/e2e/gis-buffer-layer.spec.ts
pnpm test:e2e tests/e2e/gis-measure.spec.ts
pnpm test:e2e tests/e2e/gis-goto.spec.ts
pnpm test:e2e tests/e2e/gis-annotations.spec.ts
```

- [ ] **Step 3: Optional commit** `test(gis): cover wave d analysis and time`

### Task 18: Regression and quality gate

- [ ] **Step 1: Focused unit groups**

```bash
pnpm test:frontend AvaMapConfig
pnpm test:frontend MapLayer
pnpm test:frontend MapLayerSpatialQuery
pnpm test:frontend applyTimePredicateToSourceSql
pnpm test:frontend applyAoiPredicateToGeometrySql
pnpm test:frontend compileLatLngOverlaySql
pnpm test:frontend compileBufferOfLayerQuery
pnpm test:frontend hasBufferCycle
pnpm test:frontend parseMapGoToQuery
pnpm test:frontend isClosedRingValid
pnpm test:frontend getSphericalDistanceMeters
pnpm test:frontend makeAnnotationMapSpec
pnpm test:frontend MapToolCluster
pnpm test:frontend MapTimeSlider
```

- [ ] **Step 2: Type check, lint, i18n, build**

```bash
pnpm type-check
pnpm lint
pnpm translations extract
pnpm translations compile
pnpm build
```

- [ ] **Step 3: Confirm completion criteria** in
      `docs/superpowers/specs/2026-08-17-gis-wave-d-design.md` §10.

---

## Notes for implementers

- `useMapLayersData` currently treats every non-`latLngColumns` binding as
  spatial. `bufferOfLayer` is spatial. Lat/lng becomes spatial-gated only
  when AOI applies; time-only lat/lng must not set `isSpatial`.
- Compiler tests must pass the new `overlay` and `stack` fields; fix call
  sites in `compileMapLayerSpatialQuery.*.test.ts` and
  `compileMapLayerSpatialQuery.fixtures.ts` in Task 5, not later.
- Do not put AOI or measure into `makeMapSpecFromLayerSpecs`. Style swaps
  must re-attach chrome overlays.
- Do not implement `MapEmitFilter`. Comment in `AvaMapConfig.types.ts` may
  cite spec §4.6; do not add dashboard types.
- Directory on disk for GIS is `src/views/GISApp/` on case-sensitive
  systems; imports stay `@/views/GisApp/`. Match existing files.
