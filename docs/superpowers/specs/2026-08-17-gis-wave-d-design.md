# GIS Wave D: analysis and time design

**Status:** Approved for implementation planning
**Date:** 2026-08-17
**Related:**

- `docs/superpowers/specs/2026-08-12-gis-avamap-design.md`
- `docs/superpowers/specs/2026-08-12-gis-shell-design.md`
- `docs/design/gis/feature-home-inventory.md`
- `docs/superpowers/specs/2026-08-15-gis-wave-c-design.md`
- `docs/superpowers/plans/2026-08-15-gis-wave-c-symbology-density-crs.md`

This document supersedes the parent GIS spec where they disagree. In
particular: AOI is a map-level spatial filter, not an annotation and not a
dashboard P8 filter type; Buffer is a `bufferOfLayer` geo-binding that writes
a stack layer; Measure does not persist; Isochrone stays a disabled
from-a-point tool.

## 1. Goal

Wave D adds operational analysis and time on the Wave C map. Authors draw an
area of interest, scrub a time range, buffer a layer, measure geodesic
distance and area, fly to a coordinate or P-code, and annotate with text,
arrows, freehand, and areas.

Wave D is complete only when:

- Aggregate only still cannot put a source point in GeoJSON or MapLibre,
  including under AOI, time, and buffer
- A saved AOI, time range, buffer layer, and annotations reload identically
- Measure is gone after returning to Pan

## 2. Product decisions

The following decisions resolve the open or contradictory parts of the parent
GIS specifications.

1. Wave D is one spec covering the parent inventory (AOI, time, buffer,
   measure, go-to, annotations). Isochrone implementation stays Wave E. Wave D
   only locks the tool-cluster slot.
2. The Area tool produces a map-level spatial filter. It does not create a
   layer row. Annotate is a separate persisted overlay.
3. Wave D does not extend dashboard P8 filter types. The map stores a
   GIS-native AOI polygon and time range whose shape Wave E can emit from a
   Map PBlock. GIS does not replace P8.
4. AOI applies to every data layer by default. The author can opt a layer
   out. Annotations and the basemap never filter.
5. There is one map clock. Layers with a time column participate; others
   ignore the clock. The slider is a range. A collapsed range is one instant.
   Filter is query-level, not a client hide/show of already-fetched features.
6. Buffer is the only distance analysis in Wave D: selected layer, one
   distance in meters, optional dissolve, new polygon layer. No multi-ring
   buffers, near tables, or two-layer distance.
7. Annotations include text, arrow, freehand, and area, stored on
   `AvaMapConfig.annotations`. They are not a dataset and are not filtered by
   AOI or time.
8. Isochrone is a tool that writes a layer, like Buffer, except the input is
   a point the user places. No geo-binding. The control is `aria-disabled`
   with the later-release reason.
9. Measure is an ephemeral geodesic overlay. Go-to flies the camera. Neither
   writes a layer or an annotation.
10. Config overlay plus compiler predicates. The GIS compiler is the only
    module that emits `ST_Intersects`, time `BETWEEN`, and `ST_Buffer`.
    Measure and annotation editing chrome are client overlays only.
11. Work lands as integrated vertical slices. A control becomes available
    only when its model, execution, diagnostics, rendering, and tests are
    complete.

## 3. Scope

### 3.1 Included

- One map-level AOI polygon filter, with per-layer opt-out
- One map-level time range, with per-layer time column
- Time slider with play that never auto-starts
- `bufferOfLayer` geo-binding, distance, dissolve
- Measure distance and area (ephemeral, geodesic)
- Go-to coordinate and P-code
- Annotation text, arrow, freehand, and area
- Disabled Isochrone slot in the tool cluster
- `AvaMapConfig` version 4

### 3.2 Deferred

- Isochrone routing and implementation (Wave E)
- Dashboard P8 spatial or time filter types (Wave E, with Map PBlock)
- Rectangle or circle as separate draw tools
- Multi-ring buffers, nearest-neighbor tables, two-layer distance
- DMS ingest
- Annotations as a dataset or queryable `MapLayer`
- Print/PDF composition of annotations (Wave E export)
- Geometry editing of dataset rows
- Supabase schema changes

## 4. Architecture

### 4.1 Config version

`AvaMapConfig` advances from version 3 to version 4. Its parser migrates
every valid version 3 map into the version 4 shape without changing Wave C
behavior. Version 4 remains strict at the JSON boundary, and serialization
always emits the current version.

The migration supplies only values that preserve old behavior:

- `aoi` unset
- `timeRange` unset
- `annotations` `{ isVisible: true, features: [] }`
- `annotationsZIndex` equal to the migrated `layers.length` (on top)
- every layer `timeColumn` unset
- every layer `applyAoiFilter` true

`MapLayer.version` stays 1.

### 4.2 Map-level overlay

```ts
type AoiPolygon = {
  type: "Polygon";
  coordinates: readonly (readonly (readonly [number, number])[])[];
};

type TimeRange = {
  start: string;
  end: string;
};

type AvaMapConfigV4Body = {
  basemap: BasemapConfig;
  view: MapViewState;
  bookmarks: readonly MapBookmark[];
  layers: readonly MapLayer.T[];
  aoi: AoiPolygon | undefined;
  timeRange: TimeRange | undefined;
  annotations: AnnotationLayer;
  annotationsZIndex: number;
};
```

`aoi` is one WGS 84 GeoJSON Polygon, or unset (no spatial filter). A new
ring replaces the previous polygon. Clear removes `aoi`.

`timeRange.start` and `timeRange.end` are inclusive ISO-8601 instants.
Unset means no time filter (show all times). `end` must be greater than or
equal to `start`. The parser rejects a reversed range.

### 4.3 Layer overlay fields

Each data `MapLayer` gains:

```ts
timeColumn: QueryColumn.Id | undefined;
applyAoiFilter: boolean; // default true
```

Unset `timeColumn` means the layer ignores the map clock. `applyAoiFilter`
false skips AOI for that layer. Annotations are not `MapLayer`s and do not
carry these fields.

### 4.4 Buffer binding

`GeoBinding` and `AreaGeoBinding` gain:

```ts
type BufferOfLayerBinding = {
  type: "bufferOfLayer";
  layerId: MapLayer.Id;
  distanceMeters: number;
  dissolve: boolean;
};
```

Output is always polygons. `distanceMeters` is meters on the ground, default
1,000, clamped 100 to 1,000,000 (the same band as bin cell size). `dissolve`
true unions overlapping rings into one feature.

The buffer layer is a normal stack row: name, visibility, fill symbology,
legend, popup. The tool inserts it above the source, named with the Lingui
pattern `Buffer of {layerName}`.

Sensitivity is copied from the source layer at insert time:

- Aggregate only source: aggregate only fill on buffered cells. The compiler
  buffers those cells, never source points.
- Exact or jitter source: exact fill on buffer rings.

Parser and compiler reject a sensitivity mismatch with the source: an
aggregate-only buffer of an exact or jitter source, or an exact buffer of an
aggregate-only source.

A `layerId` chain that returns to the buffer layer itself is a cycle and is
rejected at the updater and again in the compiler. Buffering a different
layer's buffer is allowed.

`bufferOfLayer` requires spatial. The Data section shows source name,
distance, and dissolve. Distance and dissolve are editable and recompile.
The source layer cannot be retargeted; the author deletes and buffers again.
The binding is not offered on Add layer or in the geo-binding type select.

### 4.5 Annotation overlay

```ts
type AnnotationLayer = {
  isVisible: boolean;
  features: readonly AnnotationFeature[];
};

type AnnotationFeature =
  | {
      id: AnnotationFeatureId;
      kind: "text";
      geometry: { type: "Point"; coordinates: [number, number] };
      text: string;
      sizePx: number;
      color: string;
    }
  | {
      id: AnnotationFeatureId;
      kind: "arrow";
      geometry: {
        type: "LineString";
        coordinates: readonly [[number, number], [number, number]];
      };
      color: string;
      strokeWidthPx: number;
    }
  | {
      id: AnnotationFeatureId;
      kind: "freehand";
      geometry: {
        type: "LineString";
        coordinates: readonly [number, number][];
      };
      color: string;
      strokeWidthPx: number;
    }
  | {
      id: AnnotationFeatureId;
      kind: "area";
      geometry: AoiPolygon;
      color: string;
      opacity: number;
      stroke: { color: string; widthPx: number };
    };
```

Coordinates are WGS 84, MapLibre order `[longitude, latitude]`. Features are
not queryable. They do not participate in AOI or time. They are not a
`MapLayer` and have no `StructuredQuery`.

The first annotation creates a pinned row in the layer stack. The row
controls `annotations.isVisible` and the overlay's z-order among data
layers. It cannot be created from Add layer. Deleting the last feature
removes the row. The row is not a `layers[]` member; z-order relative to
data layers is `annotationsZIndex`, an integer in `0..=layers.length`
meaning "above this many data layers from the bottom." Migration sets it to
`layers.length` (on top). Reorder uses the same keyboard path as data rows
(`Alt+ArrowUp` / `Alt+ArrowDown`).

### 4.6 P8 emit shape (not implemented)

Wave D does not change `DashboardFilterRecord`. Wave E's Map PBlock may emit:

```ts
type MapEmitFilter =
  | { type: "aoi"; polygon: AoiPolygon }
  | { type: "timeRange"; start: string; end: string };
```

Until that block exists, the map applies these values only to its own
layers.

## 5. Spatial query boundary

### 5.1 Compiler responsibility

The GIS compiler remains the only module that emits spatial SQL and the only
module that emits map-overlay SQL (time `BETWEEN` included). UI modules do
not assemble SQL fragments.

`latLngColumns` with no AOI and no participating time column stays on
`runStructuredQuery` plus `makeFeatureCollectionFromRows` (zero `ST_*`).

When the layer participates in time, or `applyAoiFilter` is true and `aoi`
is set, that layer goes through the compiler, including `latLngColumns`.

Time-only (no AOI) is non-spatial SQL: a wrap of the source query with
`CAST(time_column AS TIMESTAMP) BETWEEN start AND end`. It runs when spatial
is unavailable.

AOI requires spatial: `ST_Intersects` on source geometry, or
`ST_Point(longitude, latitude)` for `latLngColumns`. Area and Buffer are
`aria-disabled` while spatial is not `available`. A persisted `aoi` or
buffer layer whose query needs spatial uses the existing
spatial-unavailable layer state. There is no JavaScript point-in-polygon
fallback.

### 5.2 Predicate order

For a layer that applies the overlay:

1. Time filters **source rows** before join, aggregate, or bin. Null or
   unparseable time values do not match `BETWEEN`; those rows drop out of
   the window. They remain in unfiltered totals the way other drops do.
2. AOI intersects **source geometry** before aggregate or bin (points for
   `aggregatePointsToBoundaries` and `binPointsToGrid`; parsed geometry for
   `geometryColumn`). This is what makes an Aleppo AOI count Aleppo points,
   not the whole governorate.
3. Output features that do not intersect the AOI are dropped, so context
   polygons outside the ring leave the map.
4. Existing suppression, no-data, and classification run on what remains.

`joinToBoundaries` has no source points. It skips step 2 and applies step 3
to boundary polygons. Tabular source rows still take step 1 if the layer has
a `timeColumn`.

Layers with `applyAoiFilter: false` skip steps 2 and 3. Layers with no
`timeColumn` skip step 1. Unset map `aoi` or `timeRange` skip the matching
steps.

Jitter remains a draw-time displacement. AOI and time always use source
coordinates, never jittered positions.

### 5.3 Buffer compilation

The compiler compiles the source layer with that source's own overlay
participation, then buffers the **output** geometries:

1. Transform to the same derived meters CRS bins use (UTM from centroid,
   UPS-equivalent in polar zones). Web Mercator is not the analysis CRS.
2. `ST_Buffer(geometry, distanceMeters)`.
3. If `dissolve`, `ST_Union` the rings.
4. Transform back to EPSG:4326.

A missing source layer, a source with no compiled geometry, or a cycle is a
layer error. The configuration is kept. Aggregate-only source points never
appear in the buffer query: the input is the source's area FeatureCollection
SQL, which already suppressed below-threshold cells.

### 5.4 Query keys

The TanStack query key for a data layer includes the Wave C key plus:

- serialized `aoi` (or absent)
- `timeRange` (or absent)
- `applyAoiFilter`
- `timeColumn`
- for buffers: source layer id, distance, dissolve, and the source's own
  overlay key

The time slider's extent is a separate min/max query over participating
layers' `timeColumn` values, not the filtered layer query. Changing AOI does
not change the clock's extent.

## 6. Diagnostics and errors

Fail closed. Layer-row badges and the status card stay the Wave A/B/C
pattern. Nothing is hover-only.

| Case                                          | Behavior                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Spatial loading or unavailable                | Area and Buffer `aria-disabled` with the spatial reason. Time, measure, go-to, and annotate stay available. |
| AOI ring unclosed or self-intersecting        | Do not commit `aoi`. Keep drawing. Status says the ring is invalid.                                         |
| Time column not castable to timestamp         | Inspector rejects the bind. The layer stays off the clock.                                                  |
| Buffer cycle or source has no geometry        | Confirm disabled. Compiler throws if it still receives one.                                                 |
| Persisted AOI or buffer while spatial is down | Spatial-unavailable layer state. No JS fallback.                                                            |
| Go-to parse failure or no P-code match        | Inline error on the search field.                                                                           |
| AOI plus time yields zero features            | Existing empty-layer row. Not a blank-map crash.                                                            |
| Aggregate only plus AOI, time, or buffer      | Still no circle, symbol, cluster, or heatmap spec.                                                          |

Time-column bind accepts date, timestamp, and ISO-8601 text columns. Numeric
epoch or week-number columns are rejected in Wave D.

## 7. Inspector, cluster, and map behavior

### 7.1 Tool cluster

Current layout, with Isochrone inserted as a sibling of Buffer:

Pan | Area, Measure, Buffer, Isochrone, Annotate | Go-to

Pan stays the default and the only tool that is available before its slice
lands. Isochrone is always `aria-disabled` in Wave D, reason: this tool
arrives in a later release. Each other control becomes available only when
its slice is complete.

Activating a tool sets the map interaction mode. Escape or Pan cancels an
in-progress gesture and returns to Pan. Measure state is dropped on that
return. AOI and annotations already committed stay.

### 7.2 Area

Click vertices. Double-click or Enter closes the ring. The live outline is
chrome, not a layer and not an annotation. Style is a dashed stroke so it
does not read as an annotation area.

One polygon. A new closed ring replaces `aoi`. A clear action on the status
card unsets `aoi`. Rectangle is not a separate tool.

### 7.3 Time slider and inspector

The slider renders bottom center, above the cluster, only when at least one
layer has `timeColumn`. Two handles. Extent is the union of min and max
across participating columns. Unset `timeRange` places both handles on that
extent (no filter). Dragging writes `timeRange` and refetches.

Play translates the current window by its duration, clamped to the extent.
A collapsed instant uses a one-day grain. Play never auto-starts. Under
`prefers-reduced-motion: reduce`, play is disabled and stepping is manual
(same rule as camera flights in shell design §9.9).

Inspector Data: a time-column select. Inspector Filter: an "Apply area
filter" switch, default on, plus the existing `QueryFiltersField`. Map AOI
and time are not copied into that field.

When participating layers' extent changes on refetch, the saved range is
clamped to the new extent. If the clamped range would be empty, `timeRange`
is unset.

### 7.4 Buffer

Uses the selected data layer. A popover: distance in meters, dissolve
switch, confirm. Confirm inserts the buffer layer. Disabled when spatial is
not `available`, when there is no selection, when the selection is the
annotation row, or when the selection has no geometry yet.

### 7.5 Measure

Click to add vertices. The readout shows geodesic length. Closing the ring
also shows geodesic area. Units: meters below 1,000 m, otherwise kilometers;
square meters / square kilometers for area. Pan or Escape clears the overlay.
Nothing is written to config.

### 7.6 Go-to

Search field in the cluster. Coordinate parse:

- If one number has absolute value greater than 90, that number is
  longitude and the other is latitude.
- Otherwise the pair is latitude, longitude.

Both must be finite. Latitude must be in `[-90, 90]`, longitude in
`[-180, 180]`. A match flies the camera to that point.

P-code lookup uses boundary datasets already referenced by this map
(`joinToBoundaries` and `aggregatePointsToBoundaries`). An exact key match
flies to that feature's bounds. If the map has no boundary dataset, only
coordinate parse is offered; a P-code-shaped query reports that no boundary
layer is on this map. No new layer is created.

`fitBounds` / `flyTo` pass `{ animate: false }` under reduced motion.

### 7.7 Annotate

The Annotate control expands a sub-cluster: text, arrow, freehand, area.

- **Text:** click to place, type in place. Default size 14 px.
- **Arrow:** click start, click end.
- **Freehand:** pointer down, draw, pointer up. A stroke with fewer than two
  vertices is discarded.
- **Area:** same vertex close as the Area tool, but the polygon is an
  annotation feature, not `aoi`.

Select and delete on the map. A compact inspector while a feature is
selected edits color, opacity, stroke, and text. Hidden when
`annotations.isVisible` is false. Returning to Pan keeps the features.

### 7.8 Accessibility and localization

All displayable copy uses Lingui. Unavailable tools stay focusable
(`aria-disabled`) with the reason in the accessible name, never a hover-only
tooltip. The time slider, measure readout, and annotation text inputs have
visible focus and names. Reduced motion covers play and camera flights.

## 8. Vertical slices

A control becomes available only when its model, execution, diagnostics,
rendering, and tests are complete.

### 8.1 Config v4 and overlay fields

Version 4 parser that preserves version 3 behavior. Empty annotations.
Layer `timeColumn` and `applyAoiFilter`. Isochrone slot disabled in the
cluster.

### 8.2 Time

Compiler `BETWEEN` on source rows. Inspector time-column bind. Slider,
extent query, play, reduced-motion. Lat/lng time-only path without spatial.

### 8.3 AOI

Draw, replace, clear. Compiler `ST_Intersects` with the predicate order in
§5.2. Opt-out switch. Lat/lng spatial wrap. Spatial gating. Aggregate-only
source-point invariant.

### 8.4 Buffer

`bufferOfLayer`, popover, insert above source, cycle rejection, meters CRS,
dissolve, aggregate-only cells only.

### 8.5 Measure and go-to

Ephemeral geodesic overlay. Coordinate parse. P-code against this map's
boundary datasets.

### 8.6 Annotations

Sub-cluster, pinned row, persist and reload, z-order, outside AOI and time.

## 9. Verification

### 9.1 Model tests

- Version 3 to version 4 migration
- Strict version 4 parsing
- JSON round trips
- Default `applyAoiFilter` true, `timeColumn` unset, `aoi` unset
- Reversed `timeRange` rejected
- `bufferOfLayer` cycle rejected
- Aggregate only cannot construct a buffer of source points
- Buffer sensitivity must match the source layer
- Annotation feature shapes; empty features allowed
- `annotationsZIndex` clamped to `0..=layers.length`

### 9.2 Compiler and integration tests

- Time filters source rows before aggregate and bin
- AOI filters source geometry before aggregate and bin, then drops
  non-intersecting output
- `joinToBoundaries` is output-intersect only
- Lat/lng with AOI uses `ST_Point` plus `ST_Intersects`
- Lat/lng time-only uses `BETWEEN` and no `ST_*`
- Null times drop out of the window
- Buffer meters CRS, distance, dissolve
- Buffer of aggregate-only source never selects source points
- Suppression still applies after AOI and time
- Spatial unavailable: time still runs; AOI and buffer fail closed
- Query key changes when `aoi` or `timeRange` changes
- Safe identifier quoting

### 9.3 Renderer tests

- AOI outline is chrome, not a `MapSpec` layer
- Measure overlay is not in `MapSpec`
- Annotation GeoJSON source follows `annotationsZIndex` and `isVisible`
- Buffer fill spec is a polygon layer
- Time slider absent when no layer has `timeColumn`
- Invariant: Aggregate only cannot produce circle, symbol, cluster, or
  heatmap layers under AOI, time, or buffer

### 9.4 Component tests

- Cluster: Pan pressed; Isochrone disabled with later-release reason
- Area: invalid ring not committed; clear unsets `aoi`
- Filter section AOI switch
- Time-column select rejects non-date-like columns
- Buffer popover confirm disabled without geometry or spatial
- Measure readout units; overlay gone after Pan
- Go-to parse and no-match errors
- Annotate sub-cluster; last-feature-deleted removes the pinned row
- Reduced-motion disables time play
- Translated accessible copy

### 9.5 Focused end-to-end tests

Run each related Playwright file individually, never the full end-to-end
suite. Local timeout stays at or under 45 seconds. Seeded fixtures: points
with dates, a polygon layer, a P-code boundary.

1. Bind a time column, drag the range, reload, see the same filtered points.
2. Draw an AOI, reload, see only intersecting features; opt a layer out.
3. Buffer a polygon layer, reload, see the ring; Aggregate only buffer does
   not expose source points.
4. Measure a path, switch to Pan, see the overlay gone.
5. Go-to a coordinate and a P-code that exists on a boundary layer.
6. Draw text, arrow, freehand, and area, reload, see them; hide the
   annotation row.

## 10. Completion criteria

Wave D is complete when:

1. Every valid Wave C map opens with unchanged behavior.
2. AOI persists, reloads, opts out per layer, and never uses a JS fallback.
3. Time range persists, reloads, and does not auto-play.
4. Buffer persists as `bufferOfLayer` and reloads with the same ring.
5. Measure does not survive Pan or reload.
6. Go-to flies to a parsed coordinate and to a bound P-code.
7. All four annotation kinds persist and reload, outside AOI and time.
8. Isochrone is present, disabled, and does not change cluster layout.
9. Aggregate only still cannot put a source point in the application result
   or MapLibre.
10. Type checking, lint, frontend tests, build, i18n validation, focused
    DuckDB spatial integration tests, and each related end-to-end file pass.
