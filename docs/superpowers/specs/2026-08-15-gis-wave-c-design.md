# GIS Wave C: symbology, density, and CRS design

**Status:** Approved for implementation planning
**Date:** 2026-08-15
**Related:**

- `docs/superpowers/specs/2026-08-12-gis-avamap-design.md`
- `docs/superpowers/specs/2026-08-12-gis-shell-design.md`
- `docs/design/gis/feature-home-inventory.md`
- `docs/superpowers/specs/2026-08-14-gis-wave-b-design.md`
- `docs/superpowers/plans/2026-08-14-gis-wave-b-geometry-and-choropleth.md`

This document supersedes the parent GIS spec where they disagree. In
particular: Aggregate only may not use MapLibre cluster or heatmap; hex/grid
binning is a flat `GeoBinding` rather than a nested `binned` wrapper; and
cluster is decluttering, not a second density map.

## 1. Goal

Wave C finishes point styling and adds query-safe density. Authors can classify
and size points for print, declutter or heat a point layer, bin points into a
fixed-meter grid, diagnose dropped coordinates, and reproject a geometry column
into WGS 84.

Wave C is complete only when:

- Aggregate only still cannot put a point in GeoJSON or MapLibre
- A sized or classified point layer reloads with the same legend
- Hex and grid cells are stable polygons with the same suppression, no-data,
  and frozen breaks as Wave B choropleth

## 2. Product decisions

The following decisions resolve the open or contradictory parts of the parent
GIS specifications.

1. Cluster and heatmap are exact/jitter point styles. Aggregate only stays
   query-safe: Wave B area fills plus DuckDB hex/grid bins. MapLibre clustering
   and heatmaps need source points in the client, so they cannot satisfy
   Aggregate only.
2. Bins are a flat `GeoBinding` beside `aggregatePointsToBoundaries`: grid
   (hex or square), size in meters, a point source, and Wave B's five
   aggregations. Cell size does not change with zoom.
3. Cluster is decluttering: one color, size by count, a count badge, uncluster
   on zoom, click flies in. Unclustered points are circles in that color.
   Cluster does not color or sum by a data column. Counts are zoom-dependent,
   so cluster has no count legend.
4. Heatmap is unweighted density by default, with an optional numeric weight
   column, a pixel radius, and the existing sequential ramps. The legend is
   Low / High with no numbers. Heatmap is not clickable.
5. Point categorical and graduated color reuse the Wave B classification
   editor, including the three-named-categories-plus-Other cap.
6. Source CRS is an explicit override on `geometryColumn`. Target is always
   EPSG:4326. Lat/lng stays degrees. Missing `sourceCrs` means already 4326.
   The compiler does not guess CRS from WKT, GeoJSON, or a sidecar file.
7. "See why" opens the existing lat/lng drop report (the five `DropReason`
   values, counts, samples, and a swap-axes action). Wave C does not add a DMS
   parser. Wave B geometry and join diagnostics stay on their own surfaces.
8. Work lands as integrated vertical slices. A control becomes available only
   when its model, execution, diagnostics, rendering, and tests are complete.

## 3. Scope

### 3.1 Included

- Categorical and graduated color on `circle` and `proportionalSymbol`
- Sized-symbol min radius, max radius, and scale (`sqrt` default, `linear`)
- Nested-circle size legend with three frozen stops
- Cluster symbology (declutter, count badge, click/zoom split)
- Heatmap symbology (optional weight, Low/High legend)
- Hex and square grid binning as a `GeoBinding`
- Count, sum, average, minimum, and maximum on bins
- Query-level suppression, no-data, and frozen classification on bins
- Lat/lng coordinate validation report and swap action
- Source CRS override on geometry-column bindings
- `AvaMapConfig` version 3

### 3.2 Deferred

- DMS ingest or conversion
- CRS auto-detection
- Zoom-adaptive or stepped cell sizes
- Cluster color or sum/mean by column
- Heatmap as paint on already-binned cells
- Dataset-level sensitivity defaults
- Geometry editing
- AOI, time, measure, annotations (Wave D)
- Print/PDF, public embed, HDX, isochrones (Wave E)
- Supabase schema changes

## 4. Architecture

### 4.1 Config version

`AvaMapConfig` advances from version 2 to version 3. Its parser migrates every
valid version 2 map into the version 3 shape without changing Wave B behavior.
Version 3 remains strict at the JSON boundary, and serialization always emits
the current version.

The migration supplies only values that preserve old behavior. It does not
invent bins, cluster or heatmap paint, size-legend stops, or a source CRS.
Missing `sourceCrs` stays unset (already 4326). `MapLayer.version` stays 1.

### 4.2 Point binning binding

`GeoBinding` gains one member, parallel to `aggregatePointsToBoundaries`:

```ts
type GridBinBinding = {
  type: "binPointsToGrid";
  grid: "hex" | "square";
  sizeMeters: number;
  points: PointBinding;
  aggregation: AreaAggregation;
};
```

`PointBinding` is the Wave B union: latitude/longitude columns, or a point
geometry column. Other geometry families are rejected with a diagnostic.

`AreaAggregation` is unchanged: count, sum, average, minimum, or maximum, with
a stable output-value identifier. The executor always calculates
contributing-record count for suppression.

`AreaGeoBinding` includes `GridBinBinding`, so an Aggregate only layer may use
bins. Cluster and heatmap are not area bindings and are not constructible on
an Aggregate only layer.

Default cell size is 10,000 meters. The inspector clamps to a minimum of 100
meters and a maximum of 1,000,000 meters.

Cell size is meters on the ground and is fixed in the configuration. Zoom
changes may simplify cell outlines the same way Wave B simplifies polygons.
Zoom must not change which cell a point belongs to, or the aggregate in that
cell.

Binning always uses source coordinates. Jitter is a draw-time displacement of
point features and never feeds the grid.

### 4.3 Cluster and heatmap symbology

`LayerSymbology` gains two members, only on exact or jitter layers:

```ts
type ClusterSymbology = {
  type: "cluster";
  radiusPx: number;
  color: { type: "single"; color: string };
  stroke: StrokeSpec;
};

type HeatmapSymbology = {
  type: "heatmap";
  radiusPx: number;
  weight: QueryColumn.Id | undefined;
  ramp: readonly string[];
};
```

Cluster default `radiusPx` is 50. Heatmap default `radiusPx` is 30. Heatmap
`ramp` defaults to the five-class ochre sequential ramp from shell design
§6.2. An unset weight treats every point as 1. A null or non-numeric weight
contributes 0 (no heat) and does not drop the row from the source.

`ColorSpec` on `circle` and `proportionalSymbol` already exists. Wave C
enables the classification editor for those types. Cluster and heatmap do not
carry per-feature color.

`proportionalSymbol` already stores `minRadius`, `maxRadius`, and `scale`.
Wave C exposes all three in the inspector. Defaults stay 4 px, 24 px, and
`sqrt`.

### 4.4 Source CRS

`GeometryColumnBinding` gains:

```ts
sourceCrs: number | undefined;
```

The number is an EPSG code. `undefined` means the geometry is already
EPSG:4326. Lat/lng bindings have no CRS field.

The picker offers:

- 4326 WGS 84
- 3857 Web Mercator
- 4258 ETRS89
- UTM north zones 28 through 38 (EPSG:32628-32638)
- UTM south zones 33 through 37 (EPSG:32733-32737)

The author may also type any other positive EPSG integer. The compiler does
not validate the code against a local EPSG database beyond what DuckDB
`ST_Transform` accepts. An unknown or unsupported code is a layer error; the
configuration is kept.

When a point geometry column is the `points` side of `binPointsToGrid`, that
column's `sourceCrs` applies before binning.

### 4.5 Legend additions

`LegendConfig` gains frozen size stops:

```ts
type SizeLegendStop = {
  value: number;
  radiusPx: number;
  label: string;
};
```

`sizeStops` is an empty array unless the active symbology is
`proportionalSymbol`. Autosave writes three stops together with the layer:

1. Minimum finite sized value, at `minRadius`
2. The value that produces the midpoint radius under the active scale
3. Maximum finite sized value, at `maxRadius`

If every finite value is equal, one stop is stored. Labels use the same
number formatting as graduated legend entries.

Heatmap legends are not numeric. They persist through the symbology ramp plus
the legend title. The renderer draws a continuous bar labelled Low and High.
Cluster legends are a single-color swatch from `color`. Cluster count is not
a legend encoding.

When a sized layer is also classified, the color keys sit beside the size
graphic. Color entries follow Wave B order rules, including Other, no-data,
and suppressed when those states occur.

### 4.6 Sensitivity narrowing

The Wave B type split remains:

- Exact and jitter: any `GeoBinding`, any `LayerSymbology` including cluster
  and heatmap
- Aggregate only: `AreaGeoBinding` (now including `binPointsToGrid`) and
  `FillSymbology` only

`makeFeatureCollectionFromRows` continues to throw if it is asked to place
points for an Aggregate only layer. `makeLayerSpecFromMapLayer` continues to
refuse circle and symbol output for Aggregate only, and Wave C extends that
invariant to cluster and heatmap layers.

Point, Sized, Cluster, and Heat stay visible and `aria-disabled` on Aggregate
only layers, with the existing sensitivity copy and a route to the policy.

## 5. Spatial query boundary

### 5.1 Compiler responsibility

The GIS compiler remains the only module that emits spatial SQL. UI modules
do not assemble SQL fragments.

New compiler work in Wave C:

- Hex and square grids at `sizeMeters`
- `ST_Transform` from `sourceCrs` to EPSG:4326
- Suppression, no-data, and aggregation on bins, using the Wave B result
  envelope

Cluster, heatmap, lat/lng point placement, sized symbols, and point
classification add no spatial SQL.

### 5.2 Meters CRS for bins

`sizeMeters` cannot be applied in EPSG:4326. Web Mercator is not the analysis
CRS: meters there shrink toward the poles and would make polar cells smaller
than equatorial ones.

The compiler derives a UTM zone from the point set's centroid (UPS-equivalent
treatment only if the centroid is inside a polar zone). It transforms points
into that CRS, builds the grid at `sizeMeters`, aggregates, applies
suppression, and returns cell polygons in EPSG:4326.

The query cache key includes the source query, binding, grid, size,
aggregation, sensitivity policy, spatial capability, derived meters CRS, and
zoom band. The zoom band affects outline simplification only.

### 5.3 Query output for bins

Bins return the same kind of result Wave B area queries return:

- Stable feature identifier (the cell)
- Standardized GeoJSON polygon geometry
- Safe metric or category value
- Feature state: value, no-data, or suppressed
- Non-sensitive properties selected for popups

Aggregate-only source points, raw contributing rows, suppressed metric
values, and exact below-threshold counts do not cross this boundary.

Real zero, suppressed, and no-data stay distinct, with the same fill and
legend treatments as Wave B.

### 5.4 Cluster and heatmap data path

Exact and jitter point layers keep today's FeatureCollection path. MapLibre
owns clustering (`cluster`, `clusterRadius`, `clusterMaxZoom`) and heatmap
paint. The application never sends those layers through the spatial compiler
unless the point source is a geometry column that already needs parsing or
reprojection.

Geometry-column points used as cluster or heatmap still leave DuckDB as
points. That is allowed only because Aggregate only cannot select those
symbologies.

### 5.5 CRS transform

When `sourceCrs` is set, the compiler wraps the parsed geometry in
`ST_Transform(..., source, 'EPSG:4326', always_xy := true)` before family
checks, simplification, binning, or GeoJSON output. Failed transforms count
as unparseable geometry for that row. A source CRS that DuckDB rejects fails
the layer, keeps the configuration, and explains that the EPSG code could not
be used.

## 6. Diagnostics

### 6.1 Lat/lng validation report

The report lists only `DropReason` values that actually occurred:

| `DropReason` | Shown as |
| --- | --- |
| `suspectedLatLngSwap` | Latitude and longitude look swapped |
| `nullIsland` | Coordinate is 0, 0 |
| `outOfRange` | Coordinate is outside the valid range |
| `nullCoordinate` | Latitude or longitude is empty |
| `nonNumericCoordinate` | Latitude or longitude is not a number |

Each reason shows its count, the bounded `sampleRowIndexes` the drop report
already returns, and the explanation in shell design §5.3.

Actions:

- **Swapped.** A "Swap latitude and longitude" control exchanges the two
  column ids on the `latLngColumns` binding. The detector already reports a
  swap only when swapping would produce a valid pair, so the action is safe
  to offer.
- **Null island.** Explanation only. No automatic rewrite of zeros.

The panel closes with:

> Unmapped rows are still counted in this layer's totals. They are excluded
> from the map only.

The report is chrome over `GeometryDropReport`. It does not add drop reasons
and does not ingest DMS.

### 6.2 Binning and CRS diagnostics

The runtime reports at least these categories, with counts and bounded
non-sensitive samples:

- Non-point input for binning
- Mixed geometry families on the point source
- Spatial extension unavailable
- Source CRS rejected by DuckDB
- Transform failure on some or all rows
- Empty point set after drops (bins produce no cells, with an actionable
  empty state)

Wave B match reports, mixed-family geometry-column errors, and unmatched
boundary keys stay on their existing surfaces.

## 7. Inspector and map behavior

### 7.1 Data section

The binding selector gains "Bin into a grid." Controls: hex or square, cell
size in meters, point columns or point geometry column, aggregation method,
and measure field. Spatial options remain visible while unavailable. Loading
and unavailable copy matches Wave B.

The advanced disclosure adds source CRS on geometry-column bindings: the
short EPSG list plus a numeric code. Empty means already 4326. Lat/lng
bindings do not show the field.

The layer row shows bin and CRS health the same way it shows join and
geometry health. Warnings open the corresponding inspector section or
report.

### 7.2 Style section

Point layers keep the Point / Sized / Cluster / Heat segmented control.
Cluster and Heat become available when the layer is exact or jitter and the
binding produces points. Aggregate only keeps them locked with the existing
sensitivity reason.

Sized exposes min radius, max radius, and scale. The existing callout that
area, not radius, tracks the value stays when scale is `sqrt` and is hidden
when scale is `linear`.

Circle and Sized gain "Edit classification", using the Wave B editor. Fill
already has it. Cluster and heatmap have no classification editor.

Symbology switching still carries a single color and maps `circle.radius` to
`proportionalSymbol.maxRadius`. Categorical and graduated color carry among
`circle`, `proportionalSymbol`, `fill`, and `line`. They do not carry onto
cluster or heatmap. Last-used cluster and heatmap settings restore within the
session from inspector state; only the active type is persisted.

### 7.3 Classification

The editor, three-category cap, no-data row, degenerate inputs, Jenks
sampling, and frozen breaks are unchanged. On points the editor classifies
the feature value and may normalize only by another query column. On bins it
classifies the cell aggregate like a choropleth. Bins have no boundary
dataset; if the author normalizes, the denominator is a numeric query column
summed per cell.

Size and color are independent. A sized layer may color by a different
column than the size column.

### 7.4 Validation report

The partial-mapping status card's "See why" action opens in the same slot as
the classification editor and collapses the layer stack. Geometry-column and
bin layers do not use this card for their failures; they keep Wave B error
and match surfaces.

### 7.5 Legends and hit-testing

- **Sized.** Nested circles sharing a bottom edge, leader lines to the frozen
  stops. Never a color bar for size.
- **Heatmap.** Continuous bar, Low and High only.
- **Cluster.** Single swatch. No count legend.
- **Bins.** Same choropleth legend as Wave B, including suppressed and
  no-data when present.

Cluster click, or zooming past MapLibre's uncluster threshold, splits the
cluster. Unclustered points are circles in the layer color, using the
default circle radius, and are hit-testable. Heatmap is not hit-testable and
does not open the feature inspector. Bins hit-test like choropleth polygons.

First successful render still flies to bounds once. Later style edits do not
move the camera. Clicking a cluster to split it is a user-driven camera
move, not an automatic restyle fly-to.

### 7.6 Accessibility and localization

All displayable copy uses Lingui. Native controls and Mantine primitives are
preferred. The size legend and heatmap bar provide accessible names, visible
focus, sufficient contrast, and reduced-motion behavior (no animated cluster
transitions beyond MapLibre defaults). Unavailable symbology types stay
focusable (`aria-disabled`) with their reason in a hint, never a hover-only
tooltip.

## 8. Vertical slices

A control becomes available only when its model, execution, diagnostics,
rendering, and tests are complete.

### 8.1 Point color, sized legend, and See why

Config v3 parser that preserves v2 behavior. Classification editor on circle
and Sized. Min radius, max radius, and scale in the inspector. Nested size
legend with frozen stops. Status card opens the lat/lng drop report. Swap
rebinds the two axes.

### 8.2 Cluster and heatmap

MapLibre cluster and heatmap paint, inspector fields, Low/High heatmap
legend, cluster click/zoom split, Aggregate only locking, and the invariant
that those specs cannot be produced from an Aggregate only layer.

### 8.3 Hex and grid bins

`binPointsToGrid`, meters CRS derivation, five aggregations, fill
classification, no-data, suppression, outline simplification, inspector
binding form, and Aggregate only selection of this binding.

### 8.4 CRS override

`sourceCrs` on geometry-column bindings, picker and numeric entry,
`ST_Transform` to 4326, transform diagnostics, and reuse of that field when
the same column is the point side of a bin.

## 9. Verification

### 9.1 Model tests

- Version 2 to version 3 migration
- Strict version 3 parsing
- JSON round trips
- Aggregate only rejects point, cluster, and heatmap symbology
- `binPointsToGrid` rejects non-point sources at the type or parse boundary
- `sourceCrs` optional; unset means already 4326
- Size stops empty unless symbology is `proportionalSymbol`

### 9.2 Compiler and integration tests

- Hex and square grids at fixed meters
- Cell membership stable across zoom bands
- Outline simplification does not change aggregates
- Count, sum, average, minimum, and maximum on bins
- Null measures, invalid normalization denominators
- Aggregate only suppression on bins; protected values do not leave DuckDB
- Spatial capability loading and unavailable
- `ST_Transform` for picker EPSGs and a numeric code
- Rejected EPSG fails closed and keeps configuration
- Safe identifier quoting

### 9.3 Renderer tests

- Point categorical and graduated layer specs
- Sized sqrt and linear radius expressions
- Size-legend stops at min, mid-radius value, and max
- Cluster and heatmap MapLibre specs
- Heatmap legend has no numeric labels
- Bins reuse fill, no-data, and suppression treatments
- Invariant: Aggregate only cannot produce circle, symbol, cluster, or
  heatmap layers

### 9.4 Component tests

- Bin binding form and spatial unavailable copy
- CRS picker and numeric entry
- Validation report: occurred reasons only, samples, swap action
- Sized min/max/scale controls
- Cluster and heatmap fields
- Classification editor opening from circle and Sized
- Translated accessible copy

### 9.5 Focused end-to-end tests

Run each related Playwright file individually, never the full end-to-end
suite:

1. Classify a point layer, reload, and see the same color keys.
2. Open See why from partial mapping and swap latitude and longitude.
3. Cluster a point layer and split a cluster by zoom or click.
4. Render a heatmap that does not open a feature inspector on click.
5. Bin points into a grid, reload, and see a below-threshold cell suppressed
   without exposing its value.
6. Reproject a geometry-column layer from a non-4326 source CRS and reload.

## 10. Completion criteria

Wave C is complete when:

1. Every valid Wave B map opens with unchanged behavior.
2. Point categorical and graduated color persist and reload.
3. Sized min/max/scale and the nested size legend persist and reload.
4. See why reports only occurred lat/lng drop reasons, and swap rebinds the
   axes.
5. Cluster and heatmap work on exact/jitter points and stay locked under
   Aggregate only.
6. Hex and grid bins are stable meter cells with Wave B classification,
   no-data, and suppression.
7. Aggregate only still cannot put a point in the application result or
   MapLibre.
8. Geometry-column source CRS reprojects to 4326 or fails closed.
9. Type checking, lint, frontend tests, build, i18n validation, focused
   DuckDB spatial integration tests, and each related end-to-end file pass.
