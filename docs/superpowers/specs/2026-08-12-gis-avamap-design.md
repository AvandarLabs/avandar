# GIS tool (AvaMap) - design

**Status:** Draft for implementation
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-12
**Related:** `docs/production-plan-world-humanitarian-day.md` (P7), `docs/permissions-architecture.md`, `src/components/GISApp/`, `src/clients/qetl/WorkspaceQETLClient.ts`

---

## 1. Problem

The GIS app is a point-plotting prototype. It renders, but every axis of it is
fused into one 553-line effect (`src/components/GISApp/DataMap/useSelectedMapDataSource.ts`),
and that fusion is what blocks all nine P7 items.

### 1.1 The data path bypasses the query fabric

The map already calls `WorkspaceQETLClient.runQuery`
(`useSelectedMapDataSource.ts:178`), so "wire GIS to the QETL client" is
half-done in the least useful way: it hand-rolls SQL with `sqlTemplate` against
`FROM "$datasetId$"` instead of going through
`StructuredQuery` -> `toRawDuckDBQuery` -> QETL, which is the path Data Explorer
and dashboards use. Consequences:

- **Dataset-only.** `useSelectedMapDataSource.ts:60` hard-gates on
  `Model.isOfModelType(selectedDataSource, "Dataset")`, so virtual datasets and
  `EntityConfig` (ABox) sources are silently dropped even though
  `QueryDataSourceSelect` offers them.
- **No filters, joins, aggregations, limit, or offset.** The query is always
  `SELECT ST_AsGeoJSON(...) AS geometry, * FROM <dataset>` with no bound. Every
  row is materialized into JS objects and then into an in-memory GeoJSON blob.
- **No cache, no loading state, no error surface.** It is an imperative
  `useEffect` whose failure path is `console.error`
  (`useSelectedMapDataSource.ts:393`). A failed query and an empty result look
  identical on screen.
- **Silent row loss.** `WHERE lat IS NOT NULL AND lng IS NOT NULL` plus a
  `catch` that returns `null` per row discards data without telling anyone how
  much.

### 1.2 The rendering path is duplicated and leaks

- The circle paint spec is built three times in one file
  (lines 90-101, 306-317, 410-421): once for the in-place paint update, once on
  first add, once on style reload.
- `map.on("load", addSourceAndLayer)` (`useSelectedMapDataSource.ts:390`) is
  never removed, so each re-run adds another listener.
- Highlighting filters on `_featureId`, a string built from
  `JSON.stringify(coordinates)` (line 225), instead of MapLibre feature-state.
- `calculateBounds` (line 260) only understands `Point`; any other geometry
  yields `Infinity` bounds.
- Cleanup is keyed off two mutable refs compared against each other, which is
  why it needs a `try/catch` around the whole teardown.

### 1.3 The map lifecycle fights itself

`DataMap.tsx:102` makes the map-construction effect depend on `currentStyle`, so
a style change tears down and rebuilds the entire `maplibregl.Map`, while a
second effect (`DataMap.tsx:105`) also calls `setStyle` on the same change. That
double path is the most likely reason the style picker is hard-disabled behind
`HIDE_STYLE_PICKER = true` (`DataMap.tsx:21`).

### 1.4 Structural gaps

- GIS lives in `src/components/GISApp` while every other app lives under
  `src/views/` (`DashboardApp`, `DataExplorerApp`, `DataManagerApp`,
  `EntityDesignerApp`, `EntityManagerApp`).
- `AppType` (`shared/models/Permissions/Permissions.types.ts:4`) has no `gis`
  member and `resource_type` (`supabase/schemas/00.enum.resource_type.sql`) has
  no `map`, so `/map` is an ungated route and maps cannot be shared.
- Nothing is persisted. There is no map resource, so there is nothing to embed
  in a dashboard or share.
- Every basemap in `mapStyles.ts` is a hard runtime dependency on
  `tiles.openfreemap.org`, so the map is a grey rectangle offline.
- The only query path depends on the DuckDB `spatial` extension, which
  `DuckDbClient.ts:376` loads optionally over the network and swallows on
  failure. Point maps do not need spatial, yet today they break without it.

### 1.5 Sector gap

Even fully cleaned up, a single-layer point map is not a humanitarian GIS tool.
The features that decide credibility in this sector (aggregation to admin
boundaries with P-code join diagnostics, rate-normalized choropleth,
minimum-count suppression for protection data, print-quality sitrep export,
offline basemaps) are absent from both the code and the P7 list.

## 2. Goals and non-goals

**Goals**

- One layer model expressive enough to hold every feature in section 10 without
  reshaping, so P7.2 through P7.8 become additive.
- Route all map data through the same query executor as Data Explorer, so GIS
  inherits filters, joins, limits, caching, and the Dataset/ABox split instead
  of reimplementing them.
- Make the rendering path pure and testable, with a single owner for MapLibre
  imperative calls.
- Make protection-data safety a property of the model that the type system and
  unit tests enforce, not a UI convention.
- Make basic point maps work with no spatial extension and no network basemap.
- Make maps a first-class permissioned, persistable, shareable resource.
- Produce a UI shell (Phase 1D) that has a designed home for every feature
  before any of those features are built.

**Non-goals**

- Editing geometry or authoring datasets from the map. Drawing produces
  annotations and areas of interest, not new dataset rows.
- Server-side tile generation. Simplification happens in DuckDB and MapLibre.
- Full raster analysis (band math, NDVI). Rasters are basemap or overlay only.
- Cross-workspace map sharing, matching the v1 permissions architecture.
- Replacing the P8 dashboard filter system. GIS emits and consumes its filters.
- Onboarding specific datasets. Boundary and open-data sourcing is P6.

## 3. Decisions (resolved)

1. **Phase 1 rebuilds the data layer on a layer model** rather than cleaning the
   prototype in place, because P7.4 multi-layer would otherwise reopen the same
   files immediately.
2. **Full `gis` app_type in Phase 1**: Postgres enum, `PermissionRegistry`,
   role-group matrix UI, and route guard, not just a route guard.
3. **Resource is named `AvaMap`** (mirroring `AvaPage`), because `Map` shadows
   the JS built-in in files full of MapLibre `Map` instances. Table is `maps`;
   the `resource_type` enum value is `map`.
4. **Sensitivity is in v1 of the model**, not retrofitted, because it constrains
   which symbologies are constructible.
5. **Scope is all of Tier 1 through Tier 5** (section 10). Landing order is
   section 11, which carries an explicit cut line for the Aug 19 demo.
6. **A design phase (1D) runs in parallel with Phase 1**, driven by
   `/impeccable`, with Felt as the reference.

## 4. Architecture: three independent axes

The prototype fuses source, geometry, and symbology. Separating them is the
whole design, because each P7 feature lands on exactly one axis.

```
AvaMap (persisted resource; versioned jsonb config, same pattern as dashboards)
  |- basemap: BasemapConfig
  |- view:    MapViewState + bookmarks[]
  |- layers:  MapLayer[]        (array order is z-order, bottom to top)
  '- annotations: AnnotationLayer?

MapLayer
  |- source:      StructuredQuery.T    <- WHAT rows      (the query fabric)
  |- geoBinding:  GeoBinding           <- HOW they become geometry
  |- symbology:   LayerSymbology       <- HOW geometry is painted
  |- sensitivity: SensitivityPolicy    <- WHAT painting is permitted
  |- popup:       PopupConfig
  '- legend:      LegendConfig
```

### 4.1 `GeoBinding`

A discriminated union. Each member declares whether it needs the spatial
extension, which is how the UI disables what it cannot run (section 5.4).

```ts
type GeoBinding =
  // No spatial extension. Points built client-side from two numeric columns.
  | { type: "latLngColumns"; latitude: QueryColumnId; longitude: QueryColumnId }
  // P7.3. WKT / WKB / GeoJSON text in one column.
  | {
      type: "geometryColumn";
      column: QueryColumnId;
      encoding: "wkt" | "wkb" | "geojson";
    }
  // P7.2. Rows carry a key; geometry comes from a boundary layer.
  | {
      type: "joinToBoundaries";
      boundary: BoundarySourceRef;
      dataKey: QueryColumnId;
      boundaryKey: string;
      matching: "exact" | "normalizedName";
      // Unmatched keys are reported, never silently dropped.
    }
  // Tier 2. Density without exposing points.
  | {
      type: "binned";
      grid: "hex" | "square";
      sizeMeters: number;
      source: GeoBinding;
    };
```

`normalizedName` matching exists because P-code joins in this sector routinely
fail on `Nord-Kivu` versus `Nord Kivu` versus `NORD KIVU`. The match report is
part of the feature, not a debug aid: the layer panel shows matched and
unmatched counts and can list the unmatched keys.

### 4.2 `LayerSymbology`

```ts
type LayerSymbology =
  | { type: "circle"; radius: number; color: ColorSpec; stroke: StrokeSpec }
  | {
      type: "proportionalSymbol";
      value: QueryColumnId;
      maxRadius: number;
      scale: "sqrt" | "linear";
      color: ColorSpec;
    } // sqrt is the default
  | {
      type: "cluster";
      radiusPx: number;
      aggregate: ClusterAggregate;
      color: ColorSpec;
    }
  | { type: "heatmap"; weight?: QueryColumnId; radiusPx: number; ramp: RampId }
  | { type: "fill"; color: ColorSpec; outline: StrokeSpec } // choropleth
  | { type: "line"; color: ColorSpec; width: WidthSpec }
  | { type: "label"; column: QueryColumnId; textStyle: TextStyle };

type ColorSpec =
  | { type: "single"; color: string }
  | {
      type: "categorical";
      column: QueryColumnId;
      palette: PaletteId;
      assignments?: Record<string, string>;
      other: string;
      noData: NoDataStyle;
    }
  | {
      type: "graduated";
      column: QueryColumnId;
      ramp: RampId;
      classification: Classification;
      normalizeBy?: { column: QueryColumnId; per: 1 | 1_000 | 100_000 };
      noData: NoDataStyle;
    };

type Classification =
  | {
      method: "quantile" | "equalInterval" | "jenks" | "stdDev";
      classes: number;
    }
  | { method: "manual"; breaks: readonly number[] };

// "No data reported" is not "zero". This is required, not optional.
type NoDataStyle = { fill: string; pattern?: "hatch"; legendLabel: string };
```

Three deliberate constraints:

- `NoDataStyle` is **not optional** on categorical or graduated specs. In
  outbreak and displacement reporting, rendering unreported areas as the low end
  of a ramp is a known harm, so the model does not let a caller omit it.
- `normalizeBy` makes rate-versus-count a first-class choice. Absolute-count
  choropleths mislead, and sector reporting expects per-capita or per-100,000.
- `proportionalSymbol.scale` defaults to `sqrt` so symbol _area_ is proportional
  to value, replacing the prototype's linear `3 * (value + 1)`.

### 4.3 `SensitivityPolicy`

```ts
type SensitivityPolicy =
  | { mode: "exact" }
  | { mode: "jitter"; radiusMeters: number }
  | { mode: "aggregateOnly"; minCellCount: number; minGeoLevel: string };
```

Enforcement is structural, at three levels:

1. **Type level.** The layer type is
   `MapLayer<S extends SensitivityPolicy>` where `aggregateOnly` narrows
   `symbology` to `fill | heatmap | cluster` and narrows `geoBinding` to
   `joinToBoundaries | binned`. A point layer over protection data is not
   constructible.
2. **Query level.** `aggregateOnly` appends `HAVING count(*) >= minCellCount`
   to the compiled query, and cells below the threshold render with
   `NoDataStyle`, not as zero.
3. **Test level.** A unit test asserts that no input to `buildLayerSpec` with an
   `aggregateOnly` policy can produce a MapLibre `circle` or `symbol` layer.

This is a procurement question for our buyers, not a nice-to-have: protection
and GBV data cannot be mapped as points, and no consumer BI tool offers the
guarantee.

### 4.4 `LegendConfig` is persisted, not derived

```ts
type LegendConfig = {
  title: string;
  units?: string;
  breaks?: readonly { label: string; color: string }[]; // frozen at save time
  showNoData: boolean;
  position: "bottomLeft" | "bottomRight" | "topRight" | "hidden";
};
```

Deriving the legend at render time means the live map, the dashboard embed, and
the PDF export can each recompute breaks from a different row set and disagree.
Freezing breaks on save is what makes an exported sitrep map reproducible.

### 4.5 `BasemapConfig`

```ts
type BasemapConfig =
  | { type: "builtIn"; style: MapStyleKey }
  | {
      type: "custom";
      kind: "xyz" | "wms" | "wmts";
      url: string;
      attribution: string;
    }
  | { type: "none"; background: string }; // low-bandwidth and offline fallback
```

`type: "none"` exists so the map is usable when tile hosts are unreachable,
which is the normal field condition, and it is the fallback the offline mode
(P9) caches into.

## 5. Data flow

```
MapLayer.source (StructuredQuery)
   -> runStructuredQuery()            shared executor, TanStack-cached
   -> QueryResult<UnknownRow>
   -> makeFeatureCollectionFromRows(rows, geoBinding)    pure; returns drops with reasons
   -> getLayerStatsFromFeatureCollection(fc, symbology)         pure; breaks, domains, extents
   -> buildLayerSpec(layer, fc, stats)         pure; MapLibre sources + layers
   -> syncMap(map, prevSpec, nextSpec)         only place that touches MapLibre
```

### 5.1 Shared executor

`useDataQuery.tsx` currently holds the executor inline: raw-SQL-versus-structured
selection, the `Dataset` versus `EntityConfig` branch, and the QETL call. Extract
that into `src/clients/queries/runStructuredQuery/` and reduce both
`useDataQuery` and the new `useMapLayerData(layer)` to thin TanStack wrappers
over it. GIS gaining a second copy of that logic is the failure mode this
prevents, and the extraction is what makes ABox layers (P7.8) fall out for free
once P2 lands.

`useMapLayerData` keys its cache on the layer's source plus geo-binding, so
symbology edits repaint without refetching. That is the correct version of the
prototype's "if only the color changed, call `setPaintProperty`" special case
(`useSelectedMapDataSource.ts:79-114`), which today is 35 lines of duplicated
paint construction guarded by two refs.

### 5.2 Geometry conversion

```ts
function makeFeatureCollectionFromRows(
  rows: readonly UnknownRow[],
  binding: GeoBinding,
): {
  featureCollection: GeoJSON.FeatureCollection;
  drops: readonly {
    reason: DropReason;
    count: number;
    sampleRowIndexes: number[];
  }[];
};

type DropReason =
  | "nullCoordinate"
  | "nonNumericCoordinate"
  | "outOfRange"
  | "suspectedLatLngSwap"
  | "nullIsland"
  | "unparseableGeometry"
  | "unmatchedBoundaryKey";
```

Returning `drops` rather than silently filtering is what turns row loss into the
Tier 4 coordinate-validation panel later, and it is why the panel costs almost
nothing once Phase 1 is done. Features get real GeoJSON `id` values so
highlighting uses feature-state.

`getBoundsFromFeatureCollection(featureCollection)` handles every geometry type, replacing the
`Point`-only `calculateBounds`.

### 5.3 Pure spec, thin sync

`buildLayerSpec(layer, featureCollection, stats)` returns plain JSON:
`{ sources: Record<string, SourceSpec>, layers: readonly LayerSpec[] }`. It is
pure, so classification math, no-data handling, sqrt scaling, and every
sensitivity rule are unit-testable with no browser and no DOM.

`syncMap(map, prevSpec, nextSpec)` diffs the two specs and is the only code in
the app that calls `addSource`, `addLayer`, `removeLayer`, `setPaintProperty`,
`on`, or `off`. Listener lifetime and re-adding layers after `style.load` are
handled once. This deletes the three duplicated paint blocks and the leaked
`load` listener outright.

### 5.4 Spatial extension boundary

`DuckDbClient.ts:365-378` loads `spatial` over the network, gated by
`FeatureFlag.DisableDuckDbSpatial` and pthread availability, and swallows the
failure. Today that makes the map's only path fragile. So:

- `latLngColumns` compiles to **zero** spatial SQL. Points are built in JS.
  Basic maps then survive both offline use and a failed extension fetch.
- `joinToBoundaries`, `binned`, buffers, CRS reprojection, and simplification
  declare `requiresSpatial: true`.
- `DuckDbClient` exposes a `hasSpatial()` capability probe. Layer types that
  need it are disabled in the UI with an explanation, instead of failing at
  query time with `unknown function ST_Point`.

## 6. Permissions

- Add `gis` to `public.app_type` (`supabase/schemas/00.enum.app_type.sql`) and
  to `AppType` in `shared/models/Permissions/Permissions.types.ts`.
- Add `gis` keys to `PermissionRegistry`:
  `gis__can_view_map`, `gis__can_edit_map`, `gis__can_create_map`,
  `gis__can_manage_maps` across viewer, editor, admin.
- Extend the role-group matrix UI in workspace settings from four apps to five.
- **Backfill.** Existing `role_group_app_roles` rows have no `gis` entry, and
  `UserAppRolesMatrix` treats a missing row as "no access". The migration must
  seed a `gis` role for every existing role group (see
  `supabase/schemas/05.utils.seed-workspace-role-groups.sql`) or every current
  member loses the app on deploy. Mirror the existing app's role level rather
  than defaulting to viewer.
- Guard `/map` (and `/map/$mapId`) on `gis__can_view_map`.
- Add `map` to `public.resource_type`
  (`supabase/schemas/00.enum.resource_type.sql`) in Wave A, when a persisted map
  exists to share, and wire it into `16.utils.resource-permissions.sql` and
  `ShareResourceModal`.

All schema work goes through the declarative-schema workflow
(`supabase/schemas/*.sql`, generated migrations). No production writes.

## 7. Persistence (Wave A)

Table `public.maps`, modeled directly on `public.dashboards`
(`supabase/schemas/10.dashboards.sql`): `id`, `workspace_id`, `owner_id`,
`owner_profile_id`, `created_at`, `updated_at`, `name`, `description`,
`is_public`, `slug`, `config jsonb not null`, `is_restricted`. RLS in
`supabase/schemas/17.rls.maps.sql`, following `17.rls.dashboards.sql`.

`config` holds the versioned `AvaMap` config, so layer-model evolution is a
config version bump and a parser, not a migration. This is the same trade the
dashboards model already makes.

## 8. Module layout

```
src/views/GISApp/                        (moved from src/components/GISApp)
  GISApp.tsx
  MapCanvas/
    MapCanvas.tsx                        map construction, one lifecycle owner
    syncMap.ts                           the only imperative MapLibre caller
    useMapCapabilities.ts                spatial probe, offline state
  layers/
    useMapLayerData.ts
    buildLayerSpec/                      pure, one file per symbology kind
    getLayerStatsFromFeatureCollection/                   classification, domains, extents
    makeFeatureCollectionFromRows/
    getBoundsFromFeatureCollection/
  panels/
    LayerPanel/                          list, reorder, visibility, match report
    LayerInspector/                      geo-binding + symbology editors
    ClassificationEditor/                histogram + method + breaks
    LegendPanel/
    FeatureInspector/                    replaces GeometryDrawer
  basemap/
  export/                               print layout, PDF composition

shared/models/AvaMap/
  AvaMap.ts  AvaMap.types.ts  AvaMapParsers.ts
  MapLayer/  GeoBinding/  LayerSymbology/  SensitivityPolicy/  LegendConfig/

src/clients/queries/runStructuredQuery/  extracted from useDataQuery
src/clients/maps/AvaMapClient.ts         Wave A
```

Files stay small and single-purpose by construction: one symbology kind per
`buildLayerSpec` file, one panel per directory. The 553-line effect does not
reappear anywhere.

## 9. Phase 1D: design, driven by `/impeccable`

Runs in parallel with Phase 1, which is safe because Phase 1 is headless and
keeps the existing chrome.

Today's chrome is a translucent pill holding the entire query form behind a
filter icon (`DataMap.tsx:146-184`, `QueryFormContainer.tsx`). It has no room
for the features in section 10. The reference is Felt: a quiet full-bleed map, a
left layer panel of per-layer cards, a right inspector for symbology, a floating
tool cluster, an elegant legend, and a bottom bar with scale, coordinates, and
attribution.

**Deliverables**

1. A **feature-to-home inventory**: every Tier 1-5 feature mapped to a specific
   UI location before any of them is built. This is the deliverable that stops
   us shipping a toolbar that cannot grow.
2. Shell layout and panel behavior (collapse, resize, focus, keyboard).
3. Add-layer flow, from source picker through geo-binding to first render.
4. Symbology editing, including the classification editor with a histogram and
   live break handles.
5. Time slider, draw, measure, and annotation affordances.
6. The sensitivity badge and its locked-symbology states, so a protection layer
   visibly explains why point rendering is unavailable.
7. Empty, loading, error, no-data, and partial-match states.
8. Print and export layout: title, legend, scale bar, north arrow, source
   attribution, disclaimer.
9. Light and dark, plus field-tablet sizing.
10. Tokens: reuse the Mantine theme, and take ramps and legend specs from the
    `dataviz` skill so they are colorblind-safe and print-safe.

Run live against localhost through Playwright MCP.

Felt's inspiration adds one feature to the list: an **annotation layer** (text,
arrows, freehand, highlighted areas) as a first-class layer type. It is Felt's
signature, it doubles as the AOI drawing surface, and annotated maps are what
humanitarian teams actually print.

## 10. Feature inventory

P7 items are marked. `[spatial]` needs the DuckDB spatial extension; `[svc]`
needs an external service.

**Tier 1, the map types and math P7 implies**

| Feature                                                | Maps to              | Wave |
| ------------------------------------------------------ | -------------------- | ---- |
| Spatial join, point-in-polygon aggregation `[spatial]` | enables P7.2         | B    |
| Boundary join with P-code match diagnostics            | enables P7.2         | B    |
| Classification methods and normalization               | P7.5                 | B    |
| Explicit no-data rendering                             | P7.5                 | B    |
| Proportional symbols, sqrt-scaled, with size legend    | P7.5                 | C    |
| Clustering                                             | new                  | C    |
| Heatmap                                                | P7 current-state gap | C    |

**Tier 2, operational analysis**

| Feature                                               | Maps to        | Wave       |
| ----------------------------------------------------- | -------------- | ---------- |
| Buffer and distance analysis `[spatial]`              | new            | D          |
| AOI draw-to-filter, wired to P8 filters               | new            | D          |
| Time slider with animation                            | new            | D          |
| Hex and grid binning `[spatial]`                      | new            | C          |
| Measure distance and area; go-to coordinate or P-code | new            | D          |
| Annotations (text, arrows, freehand, areas)           | new, from Felt | D          |
| Isochrone travel-time access `[svc]`                  | new            | E, stretch |

**Tier 3, do-no-harm**

| Feature                                            | Maps to | Wave                      |
| -------------------------------------------------- | ------- | ------------------------- |
| Sensitive-layer mode, minimum-count suppression    | new     | model in 1, enforced in B |
| Point jitter and centroid displacement             | new     | B                         |
| Disputed-boundary styling and mandatory disclaimer | new     | E, with export            |

**Tier 4, geospatial data quality**

| Feature                                                     | Maps to | Wave |
| ----------------------------------------------------------- | ------- | ---- |
| Coordinate validation panel (swap, range, null island, DMS) | new     | C    |
| Geometry columns: WKT, WKB, GeoJSON                         | P7.3    | B    |
| CRS reprojection `[spatial]`                                | new     | C    |
| Zoom-based simplification `[spatial]`                       | new     | B    |

**Tier 5, output and field reality**

| Feature                                              | Maps to       | Wave                        |
| ---------------------------------------------------- | ------------- | --------------------------- |
| Print and PDF export with full map furniture         | new           | E                           |
| Offline basemap caching                              | new, with P9  | E                           |
| Custom XYZ, WMS, WMTS sources; satellite; no-basemap | P7.1 adjacent | A                           |
| Scale bar, coordinate readout, attribution           | new           | A                           |
| Per-layer popup config; click through to case record | new           | A                           |
| Bookmarks and saved views                            | new           | A                           |
| Multi-layer stack with reorder and visibility        | P7.4          | A                           |
| Persist map configuration                            | P7.6          | A                           |
| Map PBlock in a dashboard                            | P7.7          | E                           |
| ABox and HDX layer sources                           | P7.8          | client half in 1; full in E |
| Permissions on maps                                  | P7.9          | 1                           |
| Style picker repaired; logs, error and empty states  | P7.1          | 1                           |

## 11. Phases and landing order

### Phase 1: production refactor (headless)

1. Move `src/components/GISApp` to `src/views/GISApp`.
2. `shared/models/AvaMap/` v1 config and parsers, in memory only, in the shape
   Wave A will persist.
3. Extract `runStructuredQuery`; add `useMapLayerData`. Removes the
   Dataset-only gate.
4. `makeFeatureCollectionFromRows` with drop reporting; `getBoundsFromFeatureCollection` for all geometry
   types.
5. `buildLayerSpec` and `syncMap`. Feature-state highlighting.
6. Fix the map lifecycle: construct once, `setStyle` without remount, re-add
   specs centrally on `style.load`. Re-enable the style picker (P7.1).
7. Remove all `console.*`; real loading, empty, and error states.
8. Remove spatial from the lat/lng path; add `hasSpatial()` and UI gating.
9. `gis` app_type end to end, including the role backfill, plus the `/map`
   route guard (P7.9).
10. Tests per section 12.

### Phase 1D: design

Section 9, in parallel.

### Phase 2 waves

- **Wave A, layers made real.** Multi-layer runtime with reorder and visibility
  (P7.4); persistence as `public.maps` plus `resource_type: map` and sharing
  (P7.6); persisted legend; basemap switching and custom tile sources;
  per-layer popup config; bookmarks; scale bar, coordinate readout,
  attribution.
- **Wave B, geometry and choropleth.** Geometry columns (P7.3); boundary joins
  with P-code diagnostics; spatial join and point-in-polygon aggregation;
  choropleth (P7.2); classification, normalization, no-data (P7.5);
  zoom-based simplification; sensitivity enforcement end to end.
- **Wave C, symbology and scale.** Proportional symbols; clustering; heatmap;
  hex and grid binning; categorical and graduated palettes complete; coordinate
  validation panel; CRS reprojection.
- **Wave D, analysis and time.** AOI draw-to-filter into the P8 filter system;
  time slider with animation; buffer and distance analysis; measure tools;
  annotations.
- **Wave E, outputs and field.** Print and PDF export with disputed-boundary
  styling and disclaimer; offline basemaps (with P9); Map PBlock (P7.7); HDX
  layers (P7.8, with P6); isochrones as a stretch item.

### Cut line for Aug 19

The demo is 7 days out and §12.3 of the production plan puts GIS at priority 5
with "drop choropleth/multi-layer for the demo". Against that baseline:

- **Achievable:** Phase 1 plus Wave A. That is a clean, multi-layer,
  permissioned, persistable, shareable point map with real error states, which
  already exceeds §12.3's ask.
- **Stretch:** Wave B, and it is all-or-nothing. A choropleth without the
  P-code match report will show empty polygons on stage, which is worse than
  not demoing choropleth.
- **After the date:** Waves C, D, E.

Phase 1D's inventory should be complete before Wave A UI work starts, since
Wave A is where the layer panel and legend become real.

## 12. Testing

Following `docs/superpowers/specs/2026-05-14-testing-strategy.md`.

**Unit (the bulk, and the point of the pure split)**

- `buildLayerSpec` per symbology kind: snapshot the MapLibre JSON.
- `getLayerStatsFromFeatureCollection`: quantile, equal interval, Jenks, stdDev, manual breaks,
  including degenerate inputs (all-equal values, single row, all nulls).
- `makeFeatureCollectionFromRows`: every `DropReason`, plus lat/lng swap and null-island
  detection.
- `getBoundsFromFeatureCollection`: point, line, polygon, multi-geometry, empty, single feature.
- Normalization: per-capita and per-100,000 math, and division by zero or null.
- **Sensitivity invariant:** no `aggregateOnly` input produces a `circle` or
  `symbol` layer, and `minCellCount` suppression renders as no-data rather than
  zero.
- Boundary-key matching: exact and normalized-name, with an unmatched report.

**SQL**

- Snapshot the compiled DuckDB SQL per `GeoBinding` and sensitivity combination.
- Assert the `latLngColumns` path contains no `ST_` call.

**Integration**

- `useMapLayerData` against a seeded DuckDB: Dataset source, virtual source,
  and (once P2 lands) ABox source.
- `syncMap`: add, reorder, remove, style reload, and no listener growth across
  repeated syncs.

**Database**

- pgTAP on `gis` app_type role resolution and the backfill, and on `maps` RLS
  once Wave A lands, mirroring `17.rls.dashboards.sql` coverage.

**End to end (Playwright)**

- Add a point layer, see it render, click a feature, see the inspector.
- Switch basemap style without losing layers (the bug that disabled the picker).
- Permission gate: a member without a `gis` role cannot reach `/map`.
- Wave B onward: choropleth with a deliberately mismatched key surfaces the
  unmatched-key report rather than a blank map.

## 13. Risks

1. **Timeline.** Full Tier 1-5 GIS is several engineering-weeks against a
   7-day demo. Mitigation is the section 11 cut line, not a scope change.
2. **Spatial extension in the browser.** Wave B depends on it, it is fetched
   over the network on every fresh DuckDB init, and it is feature-flagged off in
   some configurations. Mitigation: the capability probe, the spatial-free point
   path, and honest UI gating. Pre-bundling spatial into the WASM bundle is the
   real fix and belongs with P0/P9.
3. **Polygon payload size.** National admin boundaries as raw GeoJSON will lock
   the browser. Mitigation: zoom-based simplification in Wave B, sized before
   choropleth is demoed.
4. **Permission backfill.** A missed `role_group_app_roles` backfill silently
   removes app access for existing members. Mitigation: pgTAP on the migration,
   and mirroring the existing app role rather than defaulting to viewer.
5. **P2 dependency for ABox layers.** Phase 1 removes the Dataset-only gate,
   but ABox querying stays as limited as `useDataQuery`'s current
   `EntityConfig` branch (no group-by, aggregation, or sorting) until P2.2. GIS
   inherits that ceiling; it does not lower it.
6. **Config-versus-schema drift.** Layers live in `config jsonb`, so a config
   version bump needs a parser and a test, the same discipline the dashboards
   model already requires.
