# GIS Wave C: symbology, density, and CRS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish print-ready point styling and add query-safe density: classified
and sized points, a lat/lng drop report, MapLibre cluster/heatmap for
exact/jitter layers, DuckDB hex/grid bins, and an explicit geometry-column CRS
override.

**Architecture:** `AvaMapConfig` version 3 stores `binPointsToGrid`,
`cluster`/`heatmap` symbology, `sourceCrs`, and frozen size-legend stops. The
GIS compiler remains the only spatial-SQL owner: bins and `ST_Transform` land
there. Cluster and heatmap are MapLibre source/layer options on the existing
point FeatureCollection path. Aggregate-only layers stay fill-only and may use
bins as an `AreaGeoBinding`.

**Tech Stack:** TypeScript, React 19, DuckDB-WASM Spatial, MapLibre GL JS,
TanStack Query, Mantine, Lingui, Zod, Vitest, Testing Library, Playwright. No
Supabase schema or production database changes.

**Approved design:**
`docs/superpowers/specs/2026-08-15-gis-wave-c-design.md`

---

## Global constraints

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
  values such as a legend swatch or heatmap gradient.
- Do not add a hex-bin or clustering npm dependency. MapLibre owns cluster and
  heatmap. DuckDB owns bins, using only functions listed in
  `supabase/functions/queries/DuckDbSpatialExtensionDocumentation.ts`.
- **Do not call `ST_HexagonGrid` or `ST_SquareGrid`.** Those functions are not
  in the shipped spatial set. Build cells from projected coordinates with
  `ST_MakeEnvelope` (squares) and `ST_MakePolygon` (hexes).
- Do not add a Supabase migration, schema file, database type change, RPC, or
  production database write.
- Latitude/longitude layers must remain operational while DuckDB Spatial is
  loading or unavailable.
- Spatial failure must preserve configuration. Never silently fall back to
  client-side binning, client-side suppression, or a weaker geometry path.
- Aggregate only must never produce GeoJSON points or MapLibre `circle`,
  `symbol`, `cluster`, or `heatmap` layers.
- A control may become usable only when its model, execution, diagnostics,
  rendering, and focused tests are present.
- Run Playwright specs one file at a time. Keep local timeouts at 45 seconds
  or less. Every database mutation in a spec must be cleaned up in `finally`.
- The commit commands in this plan are review checkpoint suggestions. Do not
  run them unless the user separately authorizes commits.

## File structure

Create these files. Existing files listed under each task are modified in
place. Do not introduce barrels.

| File                                                                                              | Responsibility                           |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `src/views/GisApp/layers/makeSizeLegendStops/makeSizeLegendStops.ts`                              | Frozen min / mid-radius / max size stops |
| `src/views/GisApp/layers/getUtmEpsgFromLongitudeLatitude/getUtmEpsgFromLongitudeLatitude.ts`      | UTM/UPS EPSG from a centroid             |
| `src/clients/maps/MapLayerSpatialQuery/buildGridCellExpressions/buildGridCellExpressions.ts`      | SQL fragments for square and hex cells   |
| `src/clients/maps/MapLayerSpatialQuery/buildSourceCrsTransform/buildSourceCrsTransform.ts`        | `ST_Transform` wrapper                   |
| `src/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend.tsx`                         | Nested-circle size legend                |
| `src/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend.tsx`                   | Low/High gradient bar                    |
| `src/views/GisApp/panels/MapStatusCard/CoordinateValidationReport/CoordinateValidationReport.tsx` | Lat/lng drop report                      |
| `src/views/GisApp/panels/LayerInspector/StyleSection/ClusterControls.tsx`                         | Cluster radius                           |
| `src/views/GisApp/panels/LayerInspector/StyleSection/HeatmapControls.tsx`                         | Heatmap radius, weight, ramp             |
| `src/views/GisApp/panels/LayerInspector/DataSection/GridBinControls.tsx`                          | Hex/square, size, aggregation            |
| `src/views/GisApp/panels/LayerInspector/DataSection/CrsOverrideField.tsx`                         | EPSG picker plus numeric entry           |
| `MapLayer.defaultHeatmapRamp` (on `MapLayerModule`)                                               | Ochre 5-class heatmap default            |
| `tests/data/gis-wave-c/`                                                                          | Focused CSVs for e2e                     |
| `tests/e2e/gis-point-classification.spec.ts`                                                      | Slice 8.1 reload                         |
| `tests/e2e/gis-coordinate-validation.spec.ts`                                                     | See why + swap                           |
| `tests/e2e/gis-cluster.spec.ts`                                                                   | Cluster split                            |
| `tests/e2e/gis-heatmap.spec.ts`                                                                   | Heatmap is not inspectable               |
| `tests/e2e/gis-grid-bin-suppression.spec.ts`                                                      | Bins + suppression                       |
| `tests/e2e/gis-geometry-crs.spec.ts`                                                              | Source CRS round trip                    |

## Reference behavior

DuckDB Spatial:

- `ST_Transform(geom, source, target, always_xy := true)` as Wave B already
  uses for simplification
- `ST_Point(longitude, latitude)`, `TRY(ST_GeomFromText|WKB|GeoJSON)`
- `ST_X` / `ST_Y`, `ST_MakeEnvelope`, `ST_MakePolygon`, `ST_MakeLine`
- `ST_AsGeoJSON`, `ST_SimplifyPreserveTopology`
- Docs:
  <https://duckdb.org/docs/stable/core_extensions/spatial/functions>

MapLibre GL JS:

- GeoJSON source `cluster`, `clusterRadius`, `clusterMaxZoom`
- Cluster layers filter `['has', 'point_count']`; unclustered filter
  `['!', ['has', 'point_count']]`
- `GeoJSONSource.getClusterExpansionZoom(clusterId)` then `map.easeTo`
- Heatmap paint: `heatmap-weight`, `heatmap-radius`, `heatmap-color` from
  `['heatmap-density']`
- Changing `cluster` on an existing source requires remove/re-add, not
  `setData`

## Defaults (use these exact values)

```ts
export const GisWaveCDefaults = {
  clusterRadiusPx: 50,
  clusterMaxZoom: 14,
  heatmapRadiusPx: 30,
  heatmapRamp: ["#ffd4af", "#daa475", "#b97c44", "#9b5802", "#7e3500"] as const,
  gridSizeMeters: 10_000,
  minGridSizeMeters: 100,
  maxGridSizeMeters: 1_000_000,
  minSymbolRadius: 4,
  maxSymbolRadius: 24,
  unclusteredCircleRadius: 6,
};
```

Put numeric defaults and `defaultHeatmapRamp` on `MapLayerModule` next to
the existing radius defaults. Renderer and heatmap legend import
`MapLayer.defaultHeatmapRamp`. Do not add a second ramp constant file.

## Reserved MapLibre ids

Extend `src/views/GisApp/layers/MapLayerIds.ts`:

```ts
export const MapLayerIds = {
  toSourceId: (layerId: string): string => `ava-map-source-${layerId}`,
  toLayerId: (layerId: string): string => `ava-map-layer-${layerId}`,
  toUnclusteredLayerId: (layerId: string): string =>
    `ava-map-layer-${layerId}-unclustered`,
  toClusterCountLayerId: (layerId: string): string =>
    `ava-map-layer-${layerId}-count`,
};
```

---

## Stage 1: persisted contracts

### Task 1: Add Wave C layer types and defaults

**Files:**

- Modify: `shared/models/AvaMap/MapLayer/GeoBinding.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/LayerSymbology.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/LegendConfig.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayer.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts`
- Test: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.test.ts`

**Interfaces:**

- Produces: `MapLayer.GridBinBinding` (`type: "binPointsToGrid"`),
  `MapLayer.ClusterSymbology`, `MapLayer.HeatmapSymbology`,
  `MapLayer.SizeLegendStop`, `sourceCrs: number | undefined` on
  `GeometryColumnBinding` and the point-geometry `PointBinding` branch,
  `legend.sizeStops`, `MapLayer.defaultClusterRadiusPx`,
  `MapLayer.defaultHeatmapRadiusPx`, `MapLayer.defaultGridSizeMeters`,
  `MapLayer.defaultHeatmapRamp`

- [ ] **Step 1: Write failing constructor tests**

```ts
it("keeps a grid-bin binding when switching to aggregate only", () => {
  const layer = MapLayer.withSensitivity(_makeGridBinLayer(), {
    mode: "aggregateOnly",
    minCellCount: 5,
    minGeoLevel: "hex",
  });
  expect(layer.geoBinding?.type).toBe("binPointsToGrid");
  expect(layer.symbology.type).toBe("fill");
});

it("clears cluster paint when switching to aggregate only", () => {
  const layer = MapLayer.withSensitivity(_makeClusterLayer(), {
    mode: "aggregateOnly",
    minCellCount: 5,
    minGeoLevel: "district",
  });
  expect(layer.symbology.type).toBe("fill");
  expect(layer.geoBinding).toBeUndefined();
});

it("starts legends with empty size stops", () => {
  expect(MapLayer.makeEmpty("Cases").legend.sizeStops).toEqual([]);
});
```

`_makeGridBinLayer` is a test helper: exact sensitivity, `binPointsToGrid`
with `grid: "hex"`, `sizeMeters: 10_000`, lat/lng `points`, count
aggregation, fill symbology.

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
pnpm test:frontend MapLayerModule.test.ts
```

Expected: failure because `binPointsToGrid`, cluster/heatmap types, and
`sizeStops` do not exist.

- [ ] **Step 3: Add the contracts**

`GeoBinding.types.ts` additions (keep existing members):

```ts
export type GeometryColumnBinding = {
  type: "geometryColumn";
  column: QueryColumn.Id;
  encoding: GeometryEncoding;
  family: GeometryFamily;
  simplification: GeometrySimplification | undefined;
  sourceCrs: number | undefined;
};

export type GridBinBinding = {
  type: "binPointsToGrid";
  grid: "hex" | "square";
  sizeMeters: number;
  points: PointBinding;
  aggregation: AreaAggregation;
};
```

Point-geometry `PointBinding` also carries `sourceCrs: number | undefined`.
`GeoBinding` and `AreaGeoBinding` include `GridBinBinding`.

`LayerSymbology.types.ts`:

```ts
export type ClusterSymbology = {
  type: "cluster";
  radiusPx: number;
  color: { type: "single"; color: string };
  stroke: StrokeSpec;
};

export type HeatmapSymbology = {
  type: "heatmap";
  radiusPx: number;
  weight: QueryColumn.Id | undefined;
  ramp: readonly string[];
};

export type LayerSymbology =
  | PointSymbology
  | LineSymbology
  | FillSymbology
  | ClusterSymbology
  | HeatmapSymbology;
```

`LegendConfig.types.ts`:

```ts
export type SizeLegendStop = {
  value: number;
  radiusPx: number;
  label: string;
};

export type LegendConfig = {
  title: string;
  units: string | undefined;
  showNoData: boolean;
  position: LegendPosition;
  breaks: readonly LegendBreak[];
  entries: readonly LegendEntry[];
  sizeStops: readonly SizeLegendStop[];
};
```

`MapLayer.types.ts` aggregate-only branch stays `FillSymbology` plus
`AreaGeoBinding` (now including bins). Exact/jitter may use the full
`LayerSymbology` union.

Update `_isAreaGeoBinding` to treat `binPointsToGrid` as area-producing.
`makeEmpty` and `createArea` set `sizeStops: []`. Export the new types from
the `MapLayer` namespace. Cluster/heatmap color has no `color` on heatmap;
cluster color is single only. Heatmap has no `stroke`.

- [ ] **Step 4: Run tests and confirm GREEN**

```bash
pnpm test:frontend MapLayerModule.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap/MapLayer
git commit -m "feat(gis): add wave c layer contracts"
```

### Task 2: Advance AvaMapConfig to version 3

**Files:**

- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.test.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`

**Interfaces:**

- Consumes: Task 1 types
- Produces: `AvaMapConfigRead` version 3, `AvaMapConfigSchema.fromJson`
  migrates 1 and 2, `toJson` emits 3

- [ ] **Step 1: Write failing migration tests**

```ts
it("migrates a version 2 config to version 3 without changing wave b layers", () => {
  const v2 = {
    ...createVersion2Json(),
    layers: [currentWaveBLayerWithoutSizeStops],
  };
  const parsed = AvaMapConfigSchema.fromJson(v2);
  expect(parsed.version).toBe(3);
  expect(parsed.layers[0]?.legend.sizeStops).toEqual([]);
  expect(parsed.layers[0]?.symbology).toEqual(currentWaveBLayer.symbology);
});

it("rejects aggregate-only cluster paint at the json boundary", () => {
  expect(() =>
    AvaMapConfigSchema.fromJson(createVersion3AggregateOnlyClusterJson()),
  ).toThrow();
});

it("round-trips a hex-bin layer", () => {
  const config = AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer: gridBinLayer,
  });
  expect(
    AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
  ).toEqual(config);
});
```

Keep the existing v1→v2 tests. They must still pass: v1 migrates through v2
into v3.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend AvaMapConfigSchema.test.ts
```

- [ ] **Step 3: Implement v3 schema and migration**

Change `AvaMapConfigRead` version to `3`. `makeEmpty` emits `version: 3`.

Keep `ConfigV2Schema` as the v2 parser. Add `ConfigV3Schema`:

- `LegendSchema` gains `sizeStops` (array of `{ value, radiusPx, label }`)
- `GeometryColumnBindingSchema` gains `sourceCrs: z.number().int().positive().optional()`
- `PointGeometryBindingSchema` gains the same `sourceCrs`
- `GridBinBindingSchema` as in the spec, `sizeMeters` min 100 max 1_000_000
- `SymbologySchema` gains cluster (single color only) and heatmap
- `AreaGeoBindingSchema` includes grid bins
- `AggregateOnlyLayerSchema` still requires `FillSymbologySchema`

`fromJson`:

- version 1 → existing `_migrateVersion1` into v2, then `_migrateVersion2`
- version 2 → `_migrateVersion2`: set `version: 3`, `sizeStops: []` on every
  legend, `sourceCrs: undefined` on geometry-column bindings (including nested
  point bindings)
- version 3 → `ConfigV3Schema.parse`

`toJson` parses through `ConfigV3Schema`.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend AvaMapConfigSchema.test.ts AvaMapConfigModule.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add shared/models/AvaMap/AvaMapConfig
git commit -m "feat(gis): persist avamap config v3"
```

---

## Stage 2: point color, sized legend, and See why

### Task 3: Sized inspector controls and lat/lng swap updater

**Files:**

- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Test: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.test.ts`
- Modify: `src/views/GisApp/panels/LayerInspector/StyleSection/ProportionalSymbolControls.tsx`
- Test: `src/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.test.tsx`

**Interfaces:**

- Produces: `MapLayerUpdates.withMinSymbolRadius`,
  `MapLayerUpdates.withSymbolScale`, `MapLayerUpdates.swapLatLngColumns`

- [ ] **Step 1: Write failing updater tests**

```ts
it("swaps latitude and longitude column ids", () => {
  const updated = MapLayerUpdates.swapLatLngColumns(layer);
  expect(updated.geoBinding).toMatchObject({
    type: "latLngColumns",
    latitude: longitudeId,
    longitude: latitudeId,
  });
});

it("sets linear scale on a sized layer", () => {
  const updated = MapLayerUpdates.withSymbolScale({
    layer: sizedLayer,
    scale: "linear",
  });
  expect(
    updated.symbology.type === "proportionalSymbol" && updated.symbology.scale,
  ).toBe("linear");
});
```

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend MapLayerUpdates.test.ts
```

- [ ] **Step 3: Implement updaters and inspector fields**

`swapLatLngColumns` no-ops unless `geoBinding.type === "latLngColumns"` and
both ids are defined. It returns the same reference when already swapped to
those ids.

`withMinSymbolRadius` / `withSymbolScale` no-op on non-sized layers.
`withSymbolSizeColumn` must preserve an already-chosen `minRadius` and
`scale` when changing only the column.

`ProportionalSymbolControls`: add min-radius `NumberInput` (2–80 px) and a
scale `Select` (`sqrt` / `linear`). Show the existing area-vs-radius callout
only when `scale === "sqrt"`.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend MapLayerUpdates.test.ts StyleSection.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/layers/MapLayerUpdates src/views/GisApp/panels/LayerInspector/StyleSection
git commit -m "feat(gis): expose sized min radius, scale, and lat lng swap"
```

### Task 4: Frozen size-legend stops

**Files:**

- Create: `src/views/GisApp/layers/makeSizeLegendStops/makeSizeLegendStops.ts`
- Test: `src/views/GisApp/layers/makeSizeLegendStops/makeSizeLegendStops.test.ts`
- Modify: `src/views/GisApp/layers/usePersistedLayerLegends/usePersistedLayerLegends.ts`
- Modify: `src/views/GisApp/layers/useAvaMapRender.ts`
- Test: `src/views/GisApp/layers/usePersistedLayerLegends/usePersistedLayerLegends.test.tsx`

**Interfaces:**

- Produces:

```ts
export function makeSizeLegendStops(
  options: Readonly<{
    values: readonly number[];
    minRadius: number;
    maxRadius: number;
    scale: "sqrt" | "linear";
    formatLabel: (value: number) => string;
  }>,
): readonly MapLayer.SizeLegendStop[];
```

Mid stop is the data value whose scaled radius equals
`(minRadius + maxRadius) / 2`. Invert the same scale used by
`_buildCircleRadius` in `makeLayerSpecFromMapLayer.ts`. All-equal finite
values yield one stop. Non-finite values are ignored. Empty input yields
`[]`.

- [ ] **Step 1: Write failing stop tests**

```ts
it("places the mid stop at a quarter of a sqrt span", () => {
  const stops = makeSizeLegendStops({
    values: [0, 100],
    minRadius: 4,
    maxRadius: 24,
    scale: "sqrt",
    formatLabel: String,
  });
  expect(stops).toEqual([
    { value: 0, radiusPx: 4, label: "0" },
    { value: 25, radiusPx: 14, label: "25" },
    { value: 100, radiusPx: 24, label: "100" },
  ]);
});
```

For sqrt, normalized `t = ((r - min) / (max - min))^2`, so mid radius 14 of
4–24 is `t = 0.25` → value `0 + 0.25 * 100 = 25`.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend makeSizeLegendStops.test.ts
```

- [ ] **Step 3: Implement stops and persist them**

Extend `LayerLegendUpdate` with `sizeStops`. `usePersistedLayerLegends`
writes `sizeStops` alongside `breaks` and `entries`. Clear `sizeStops` to
`[]` when symbology is not `proportionalSymbol`. Reuse the same number
formatting already used for graduated legend labels in `useAvaMapRender`
(if none exists, use `Intl.NumberFormat` with at most 2 fraction digits,
matching classification labels).

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend makeSizeLegendStops.test.ts usePersistedLayerLegends.test.tsx
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/layers/makeSizeLegendStops src/views/GisApp/layers/usePersistedLayerLegends src/views/GisApp/layers/useAvaMapRender.ts
git commit -m "feat(gis): persist sized legend stops"
```

### Task 5: Point classification editor

**Files:**

- Modify: `src/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.tsx`
- Test: `src/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.test.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/NormalizationControls.tsx`
- Test: `src/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.test.tsx`

- [ ] **Step 1: Write a failing StyleSection test**

Assert "Edit classification" appears for `circle` and `proportionalSymbol`
and is absent for a future-proof check: still present for `fill`. Click
calls `onOpenClassification`.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend StyleSection.test.ts
```

- [ ] **Step 3: Wire the editor**

Show the button when `symbology.type` is `fill`, `circle`, or
`proportionalSymbol` (and `onOpenClassification` is passed). Cluster and
heatmap never show it.

`_getDefaultValue` treats `binPointsToGrid` like the other aggregations
(`areaAggregation` + `outputValueId`).

`NormalizationControls` offers boundary columns only for
`joinToBoundaries` and `aggregatePointsToBoundaries`. Points and bins offer
query columns only.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend StyleSection.test.ts ClassificationEditor.test.tsx
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/panels/LayerInspector
git commit -m "feat(gis): classify circle and sized point layers"
```

### Task 6: Nested size legend and heatmap/cluster legend forms

**Files:**

- Create: `src/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend.tsx`
- Create: `src/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend.module.css`
- Test: `src/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend.test.tsx`
- Create: `src/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend.tsx`
- Create: `src/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend.module.css`
- Test: `src/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend.test.tsx`
- Modify: `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.tsx`
- Test: `src/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.test.tsx`

- [ ] **Step 1: Write failing legend tests**

Sized: three nested circles sharing a bottom edge, accessible name includes
the formatted values, no color bar for size. When `legend.entries` is
non-empty, color keys render beside the size graphic.

Heatmap: a gradient bar whose accessible name is the translated Low/High
pair, and the document contains no numeric stop labels from the ramp.

Cluster with single color and empty entries: one swatch, no count text.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend SizeLegend.test.tsx HeatmapLegend.test.tsx MapLegend.test.tsx
```

- [ ] **Step 3: Implement**

`SizeLegend`: SVG, circles aligned on the bottom, leader lines to labels.
`aria-label` like "Symbol sizes from 4 to 100". Radii from `sizeStops`.

`HeatmapLegend`: `linear-gradient` from `symbology.ramp` (CSS Module +
inline `backgroundImage` is allowed as a runtime value). Visible text: only
translated `Low` and `High`.

`MapLegendGroup` branches on `symbology.type`.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend MapLegend.test.tsx SizeLegend.test.tsx HeatmapLegend.test.tsx
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/panels/LegendPanel
git commit -m "feat(gis): render sized and heatmap legends"
```

### Task 7: Coordinate validation report

**Files:**

- Modify: `src/views/GisApp/layers/MapLayerViewState.types.ts`
- Modify: `src/views/GisApp/layers/useAvaMapRender.ts`
- Modify: `src/views/GisApp/panels/LayerInspector/LayerInspector.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody.tsx`
- Modify: `src/views/GisApp/GisAppLayerInspector.tsx`
- Modify: `src/views/GisApp/GisAppStatusCard.tsx`
- Modify: `src/views/GisApp/useGisApp.ts`
- Modify: `src/views/GisApp/panels/MapStatusCard/MapStatusCard.tsx`
- Modify: `src/views/GisApp/panels/MapStatusCard/MapStatusContent.tsx`
- Modify: `src/views/GisApp/panels/MapStatusCard/MapPartialMappingStatus.tsx`
- Create: `src/views/GisApp/panels/MapStatusCard/CoordinateValidationReport/CoordinateValidationReport.tsx`
- Test: `src/views/GisApp/panels/MapStatusCard/CoordinateValidationReport/CoordinateValidationReport.test.tsx`
- Test: `src/views/GisApp/panels/MapStatusCard/MapStatusCard.test.tsx`
- Test: `src/views/GisApp/panels/LayerInspector/LayerInspector.test.tsx`

**Interfaces:**

- `MapLayerViewState.drops: readonly GeometryDropReport[]`
- `LayerInspectorView` gains `{ type: "validationReport" }`
- Lift `inspectorView` to `useGisApp` so the status card and inspector share
  it (classification already lives in the inspector; status card cannot open
  it otherwise)

- [ ] **Step 1: Write failing tests**

Report lists only reasons present in `drops`, shows counts and sample row
indexes, offers Swap only for `suspectedLatLngSwap`, and includes the
totals-still-count footer. Status card "See why" appears when
`droppedRowCount > 0` and calls `onSeeWhy`.

Use the shell copy from spec §6.1 / shell §5.3. Translate with Lingui.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend CoordinateValidationReport.test.tsx MapStatusCard.test.tsx
```

- [ ] **Step 3: Implement**

Pass `geometry.drops` through `_makeLayerViewState`. Add `See why` on
`MapPartialMappingStatus`. Opening validation report or classification
collapses the layers panel via `expandPanel("inspector")` and
`togglePanel("layers")` only when layers are expanded (`panelState.layers === false`
means expanded in `ChromePanelState`: `true` is collapsed). Use
`expandPanel` if it exists; otherwise set layers to collapsed.

Swap calls `MapLayerUpdates.swapLatLngColumns` through `onLayerChange` and
leaves the report open so the next query can clear it.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend CoordinateValidationReport.test.tsx MapStatusCard.test.tsx LayerInspector.test.tsx useAvaMapRender.ts
```

Then:

```bash
pnpm i18n:extract && pnpm i18n:compile
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp src/i18n
git commit -m "feat(gis): open lat lng validation report from see why"
```

---

## Stage 3: cluster and heatmap

### Task 8: MapSpec cluster/heatmap shapes and syncMap source options

**Files:**

- Modify: `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types.ts`
- Modify: `src/views/GisApp/MapCanvas/syncMap/syncMap.ts`
- Test: `src/views/GisApp/MapCanvas/syncMap/syncMap.test.ts`

**Interfaces:**

```ts
export type MapSourceSpec = {
  type: "geojson";
  data: GeoJSON.FeatureCollection;
  cluster?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
};

export type MapLayerSpec = {
  id: string;
  source: string;
  paint: ...;
  layout?: ...;
  filter?: unknown;
} & (
  | { type: "circle" }
  | { type: "line" }
  | { type: "fill" }
  | { type: "heatmap" }
  | { type: "symbol" }
);
```

- [ ] **Step 1: Write a failing sync test**

When `cluster` flips from false/absent to true, the existing source is
removed and re-added with cluster options. `setData` is not used for that
transition. Heatmap layer specs call `addLayer` with `type: "heatmap"`.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend syncMap.test.ts
```

- [ ] **Step 3: Implement source re-add**

If `previousSpec.sources[id]` cluster flags differ from `nextSpec`, remove
dependent layers then the source, then `addSource` with cluster options.
Otherwise keep today's `setData` path.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend syncMap.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types.ts src/views/GisApp/MapCanvas/syncMap
git commit -m "feat(gis): sync clustered geojson sources"
```

### Task 9: Cluster and heatmap layer specs

**Files:**

- Modify: `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.ts`
- Modify: `src/views/GisApp/layers/MapLayerIds.ts`
- Modify: `src/views/GisApp/layers/useAvaMapRender.ts`
- Test: `src/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer.test.ts`

- [ ] **Step 1: Write failing renderer tests**

Cluster source has `cluster: true`, `clusterRadius` from symbology,
`clusterMaxZoom: 14`. Three layers: clustered circles (single color, radius
interpolates on `point_count`), count symbols (`text-field` from
`point_count_abbreviated`, `text-font: ["Noto Sans Regular"]`), unclustered
circles at `MapLayer.defaultSymbolRadius` in the same color. Filters as in
the MapLibre cluster example.

Heatmap: one `heatmap` layer, `heatmap-weight` is `1` when weight is unset
and `['to-number', ['get', weightName], 0]` when set. `heatmap-color`
interpolates `heatmap-density` across the ramp, with density 0 transparent.
No numeric legend in the spec itself.

```ts
it("refuses cluster paint for aggregate-only layers", () => {
  expect(() =>
    makeLayerSpecFromMapLayer({
      layer: aggregateOnlyClusterLayer,
      featureCollection,
      stats: { valueDomain: undefined },
    }),
  ).toThrow(SensitivityViolationError);
});
```

Widen the existing invariant: aggregate-only may only produce `fill` (and
its outline). Not circle, symbol, or heatmap.

- [ ] **Step 2: Run RED**

```bash
pnpm test:frontend makeLayerSpecFromMapLayer.test.ts
```

- [ ] **Step 3: Implement specs**

`interactiveLayerId` in `useAvaMapRender` becomes a list:

- heatmap: no interactive ids
- cluster: cluster circle id + unclustered id (not the count symbol)
- other: existing `toLayerId`

Flatten in `useAvaMapRender`'s return.

- [ ] **Step 4: Run GREEN**

```bash
pnpm test:frontend makeLayerSpecFromMapLayer.test.ts
```

- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git add src/views/GisApp/layers
git commit -m "feat(gis): render cluster and heatmap layer specs"
```

### Task 10: Cluster/heatmap inspector and availability

**Files:**

- Modify: `src/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants.ts`
- Modify: `src/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/StyleSection/useSymbologyTypeChange.ts`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Modify: `src/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl/SymbologyTypeControl.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/StyleSection/ClusterControls.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/StyleSection/HeatmapControls.tsx`
- Test: `src/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.test.tsx`
- Test: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.test.ts`

Replace the static `isAvailable: false` flags. Availability is computed:

- Cluster/Heat available when sensitivity is exact or jitter and the binding
  produces points (`latLngColumns` complete, or `geometryColumn` family
  point)
- Unavailable on aggregate-only with the existing sensitivity copy
- Do not use "arrives in a later release" once this task lands

`withSymbologyType` `nextType` includes `cluster` and `heatmap`. Carry
single color onto cluster. Do not carry categorical/graduated onto cluster
or heatmap (flatten to single using the first ramp/category color or
`defaultSymbolColor`). Session restore stays in `useSymbologyTypeChange`'s
ref.

Hint text: sensitivity reason, or nothing when both are available.

- [ ] **Step 1: Write failing availability tests** (StyleSection +
      MapLayerUpdates)
- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run GREEN + i18n extract/compile**
- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git commit -m "feat(gis): author cluster and heatmap styles"
```

### Task 11: Cluster click expands; heatmap is not hit-testable

**Files:**

- Modify: `src/views/GisApp/MapCanvas/MapInstanceHelpers.ts`
- Test: `src/views/GisApp/MapCanvas/MapInstanceHelpers.test.ts`

- [ ] **Step 1: Write failing click tests**

If the top feature has `point_count` / `cluster_id`, the handler calls
`getClusterExpansionZoom` and `easeTo`. It does not call `onFeatureClick`.
If the layer id is a heatmap id, it is not in `interactiveLayerIds` (covered
by Task 9); a click on empty heatmap paint does nothing.

- [ ] **Step 2: Run RED**
- [ ] **Step 3: Implement in `_createMapClickHandler`**
- [ ] **Step 4: Run GREEN**
- [ ] **Step 5: Optional authorized checkpoint commit**

```bash
git commit -m "feat(gis): expand clusters on click"
```

---

## Stage 4: hex and grid bins

### Task 12: UTM EPSG from centroid

**Files:**

- Create: `src/views/GisApp/layers/getUtmEpsgFromLongitudeLatitude/getUtmEpsgFromLongitudeLatitude.ts`
- Test: `src/views/GisApp/layers/getUtmEpsgFromLongitudeLatitude/getUtmEpsgFromLongitudeLatitude.test.ts`

```ts
export function getUtmEpsgFromLongitudeLatitude(
  longitude: number,
  latitude: number,
): number;
```

Rules: latitude ≥ 84 → 32661; latitude ≤ -80 → 32761; else zone =
`floor((longitude + 180) / 6) + 1` clamped 1–60; north `32600 + zone`, south
`32700 + zone`.

- [ ] **Step 1: Tests for Kinshasa (~15E, -4) → 32733, Oslo → 32632, north
      pole → 32661**
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement**
- [ ] **Step 4: GREEN**
- [ ] **Step 5: Optional commit** `feat(gis): derive utm epsg from centroid`

The compiler inlines the same CASE in SQL (Task 14). This function is the
oracle the CASE must match; put the CASE numbers in a shared constants
object in this module and import them from the compiler so they cannot
drift:

```ts
export const PolarEpsg = { north: 32661, south: 32761 } as const;
export const UtmEpsgBase = { north: 32600, south: 32700 } as const;
```

### Task 13: Grid cell SQL fragments

**Files:**

- Create: `src/clients/maps/MapLayerSpatialQuery/buildGridCellExpressions/buildGridCellExpressions.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/buildGridCellExpressions/buildGridCellExpressions.test.ts`

**Square:** `sizeMeters` is edge length. Cell origin is `(floor(x/size)*size, floor(y/size)*size)`. Geometry is `ST_MakeEnvelope(minx, miny, maxx, maxy)`.

**Hex:** pointy-top. `sizeMeters` is the distance between parallel sides
(flat-to-flat). Hex radius `sizeMeters / sqrt(3)`. Axial `(q, r)` via cube
rounding (Red Blob Games pointy-top). Reconstruct a hex ring with
`ST_MakePolygon(ST_MakeLine([...vertices, first]))`.

Do not emit user-controlled numbers with string concat without
`quoteSqlLiteral`. `sizeMeters` is a clamped number from the model; still
pass it through `quoteSqlLiteral`.

- [ ] **Step 1: Snapshot-style tests** that the square SQL contains
      `ST_MakeEnvelope` and `floor`, hex SQL contains `ST_MakePolygon`, and both
      quote the size literal. A second test: two JS helper functions
      `getSquareCellId` / `getPointyTopAxialCell` (exported for tests, used to
      document the formula) agree that points 1 m apart at the origin share a
      10 km cell and points 50 km apart do not.
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement**
- [ ] **Step 4: GREEN**
- [ ] **Step 5: Optional commit** `feat(gis): build hex and square cell sql`

### Task 14: Compile `binPointsToGrid`

**Files:**

- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.types.ts`
- Modify: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.test.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata.test.ts`
- Test: `src/views/GisApp/layers/useMapLayersData/MapLayerData.ts` tests if present

Query shape (one row envelope, same aliases as Wave B):

1. `source_rows` from structured SQL
2. `parsed_points` via existing `_buildPointExpression` (extend it to accept
   `binPointsToGrid` as well as `aggregatePointsToBoundaries`) plus optional
   source CRS transform (no-op until Task 16)
3. Centroid → meters CRS CASE using Task 12 constants
4. `ST_Transform` points 4326 → meters CRS `always_xy := true`
5. Cell id + cell polygon in meters CRS
6. Aggregate with Wave B operations; `count(*)` as contributor_count
7. Suppress when `contributor_count < minCellCount` for aggregate-only
   (`minCellCount` 0 otherwise)
8. Normalization: if graduated `queryColumn` denominator, `sum(denominator)`
   per cell. Reject `boundaryColumn` at metadata resolve
   (`unsupportedNormalizationDenominator`)
9. Transform cell polygons back to 4326; simplify outlines with existing
   `_buildSimplifiedGeometry` (zoom band must not appear in cell id
   expressions)
10. Diagnostics: non-point count, mixed family, invalid parse, empty after
    drops

`MapLayerData.isQueryable`: `binPointsToGrid` is queryable when the point
binding is complete (both lat/lng columns, or a point geometry column on the
query).

Cache key already includes `geoBinding` and zoom band. Do not add a
precomputed EPSG; SQL derives it.

- [ ] **Step 1: Compiler tests**

SQL for hex and square includes `ST_Transform` and cell expressions, quotes
hostile column names, uses `HAVING`/`CASE` suppression so a below-threshold
cell has `state = 'suppressed'` and no `value` / `contributorCount`
properties (mirror the Wave B aggregate-only assertion). Two zoom bands
produce different simplify tolerances but identical `floor(x / size)` (or
hex q/r) expressions.

Metadata: bins with a boundary denominator are `rebindRequired`.

- [ ] **Step 2: RED**
- [ ] **Step 3: Implement `_compileGridBin` and dispatch it from
      `compileMapLayerSpatialQuery`**
- [ ] **Step 4: GREEN**
- [ ] **Step 5: Optional commit** `feat(gis): compile point grid bins`

### Task 15: Bin inspector and aggregate-only selection

**Files:**

- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/GeometryBindingTypeSelect.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.tsx`
- Create: `src/views/GisApp/panels/LayerInspector/DataSection/GridBinControls.tsx`
- Test: `src/views/GisApp/panels/LayerInspector/DataSection/DataSection.test.tsx`
  (create or extend)
- Test: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.test.ts`

Add binding option `Bin into a grid`, disabled when spatial is not
`available`, with the same loading/unavailable copy pattern as geometry
columns. Selecting it:

- Sets fill symbology (createArea default) if current paint is a point style
- Copies current lat/lng or point geometry into `points`
- `grid: "hex"`, `sizeMeters: 10_000`, count aggregation, new
  `outputValueId`

`GridBinControls`: hex/square segmented control, meters `NumberInput`
clamped 100–1_000_000, reuse aggregation controls from
`PointAggregationControls` (extract a shared `AreaAggregationFields` if that
keeps both files ≤45-line functions; do not copy SQL).

Aggregate-only may select this binding. Point/Sized/Cluster/Heat stay locked
with existing copy.

- [ ] **Step 1: Failing tests for option + clamp + aggregate-only keep**
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement**
- [ ] **Step 4: GREEN + i18n**
- [ ] **Step 5: Optional commit** `feat(gis): author hex and square bins`

---

## Stage 5: CRS override

### Task 16: Geometry-column source CRS

**Files:**

- Create: `src/clients/maps/MapLayerSpatialQuery/buildSourceCrsTransform/buildSourceCrsTransform.ts`
- Test: `src/clients/maps/MapLayerSpatialQuery/buildSourceCrsTransform/buildSourceCrsTransform.test.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery.ts`
- Modify: `src/clients/maps/MapLayerSpatialQuery/buildGeometryExpression/buildGeometryExpression.ts`
  only if wrapping there is shorter; prefer a wrapper around the parser
  expression
- Create: `src/views/GisApp/panels/LayerInspector/DataSection/CrsOverrideField.tsx`
- Modify: `src/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls.tsx`
- Modify: `src/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates.ts`
- Test: `compileMapLayerSpatialQuery.test.ts`
- Test: `CrsOverrideField.test.tsx`

Picker values (code stored, label translated):

- 4326 WGS 84
- 3857 Web Mercator
- 4258 ETRS89
- 32628–32638 UTM north
- 32733–32737 UTM south
- plus a numeric input for any other positive integer

Empty / unset = already 4326 (no `ST_Transform`).

```ts
export function buildSourceCrsTransform(
  geometrySql: string,
  sourceCrs: number | undefined,
): string;
```

When set:
`TRY(ST_Transform(${geometrySql}, ${quoteSqlLiteral(`EPSG:${sourceCrs}`)}, 'EPSG:4326', always_xy := true))`.
Failed transforms become NULL and count as invalid geometry. If DuckDB
rejects the EPSG at query execution, `useMapLayersData` already surfaces the
engine error; keep the config.

Apply the wrapper in `_compileGeometryColumn` and on the point parser used
by bins and point-in-polygon when that point binding is a geometry column.

- [ ] **Step 1: Compiler test that 32633 appears quoted as `EPSG:32633` and
      unset CRS emits no `ST_Transform` on the parse path (simplification may
      still transform 4326↔3857)**
- [ ] **Step 2: RED**
- [ ] **Step 3: Implement field + compiler**
- [ ] **Step 4: GREEN + i18n**
- [ ] **Step 5: Optional commit** `feat(gis): reproject geometry columns to 4326`

---

## Stage 6: end-to-end and quality gate

### Task 17: Focused Playwright files

**Files:**

- Create: `tests/data/gis-wave-c/` CSVs as needed
- Modify: `tests/e2e/helpers/constants.ts`
- Create: the six spec files listed in File structure

Follow `docs/rules/e2e-testing.md` and `tests/e2e/gis-choropleth-suppression.spec.ts`:
UI-driven after `seedAvaMap` + dataset import, cleanup in `finally`, local
timeout ≤ 45s.

1. `gis-point-classification.spec.ts` — lat/lng layer, Edit classification,
   pick a numeric column, reload, legend still shows the same keys.
2. `gis-coordinate-validation.spec.ts` — dataset with two swapped rows;
   status card See why; Swap; those rows map.
3. `gis-cluster.spec.ts` — Cluster symbology; click a cluster; zoom
   increases (`window.__avandarE2EMap.getZoom()`).
4. `gis-heatmap.spec.ts` — Heat symbology; click the heat; feature inspector
   does not open.
5. `gis-grid-bin-suppression.spec.ts` — tagged `@online`;
   bin points, Aggregate only min count above some cells; suppressed legend
   key; popup/inspect on a suppressed cell does not show a raw count.
6. `gis-geometry-crs.spec.ts` — tagged `@online`;
   geometry column in EPSG:3857 web-mercator WKT; set source CRS 3857;
   features render; reload keeps CRS.

Reuse Wave B point CSV where possible. Add a tiny swapped-lat/lng CSV and a
tiny 3857 WKT CSV rather than mutating Wave B fixtures.

- [ ] **Step 1: Write the specs (they fail until UI exists; if earlier tasks
      landed, they should pass)**
- [ ] **Step 2: Run each file one at a time**

```bash
pnpm test:e2e tests/e2e/gis-point-classification.spec.ts
pnpm test:e2e tests/e2e/gis-coordinate-validation.spec.ts
pnpm test:e2e tests/e2e/gis-cluster.spec.ts
pnpm test:e2e tests/e2e/gis-heatmap.spec.ts
pnpm test:e2e tests/e2e/gis-grid-bin-suppression.spec.ts
pnpm test:e2e tests/e2e/gis-geometry-crs.spec.ts
```

- [ ] **Step 3: Optional commit** `test(gis): cover wave c symbology and density`

### Task 18: Regression and quality gate

- [ ] **Step 1: Focused unit groups**

```bash
pnpm test:frontend AvaMap
pnpm test:frontend MapLayer
pnpm test:frontend MapLayerSpatialQuery
pnpm test:frontend makeLayerSpecFromMapLayer
pnpm test:frontend makeSizeLegendStops
pnpm test:frontend getUtmEpsgFromLongitudeLatitude
```

- [ ] **Step 2: GIS Vitest**

```bash
pnpm test:frontend src/views/GisApp
```

- [ ] **Step 3: i18n, types, lint, build**

```bash
pnpm i18n:check
pnpm type-check
pnpm lint
pnpm build
```

- [ ] **Step 4: Existing GIS e2e plus Wave C files, one at a time**

```bash
pnpm test:e2e tests/e2e/gis-map-layers.spec.ts
pnpm test:e2e tests/e2e/gis-geometry-column.spec.ts
pnpm test:e2e tests/e2e/gis-boundary-join.spec.ts
pnpm test:e2e tests/e2e/gis-choropleth-suppression.spec.ts
```

Then the six Task 17 files.

- [ ] **Step 5: Scope audit**

```bash
git status --short
git diff --name-only | rg '(\.gen\.|/messages\.ts$)' || true
git diff --name-only | rg '^(supabase/|shared/types/database\.types\.ts$)' || true
```

Expected: no generated files, no Supabase/schema edits. Catalog updates from
`pnpm i18n:extract` are allowed.

---

## Spec coverage

| Spec section                                   | Tasks        |
| ---------------------------------------------- | ------------ |
| Config v3, migration                           | 2            |
| `binPointsToGrid`, AreaGeoBinding              | 1, 14, 15    |
| Cluster/heatmap types, aggregate-only lock     | 1, 9, 10     |
| Sized min/max/scale, size stops, nested legend | 3, 4, 6      |
| Point classification, 3+Other, bin normalize   | 5            |
| See why / swap / DropReasons                   | 7            |
| MapLibre cluster declutter, click split        | 8, 9, 11     |
| Heatmap unweighted, Low/High, not clickable    | 6, 9, 10, 11 |
| Fixed-meter bins, UTM, suppression             | 12–15        |
| Source CRS                                     | 16           |
| E2E 9.5 / completion 10                        | 17, 18       |
