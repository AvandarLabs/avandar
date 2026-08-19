# gis

Small, deterministic CSV fixtures for GIS map import, spatial query, and
rendering behavior. All coordinates sit in simple degree-space near the origin
or near 10°E / 10°N so map bounds, clustering, and grid bins are predictable.

## What it's for

Use these when exercising the GIS app end-to-end: dataset import, geometry
column detection, lat/lng binding, boundary joins, choropleth aggregation,
symbology, density layers, AOI filtering, buffer layers, map time sliders, and
go-to lookups. They are sized for fast e2e runs rather than realistic volume.

### `geometry-formats.csv`

Point, line, and polygon rows in WKT, WKB hex, prefixed WKB, and GeoJSON
columns, plus one invalid geometry row. Use for geometry-column binding,
format detection, and invalid-geometry handling.

### `boundary-polygons.csv`

Four adjacent square polygons with `code`, `name`, `population`, and WKT
`geometry`. Includes a diacritic name (`Á`) for join-key normalization. Use for
boundary layers, point-to-boundary aggregation, and choropleth suppression.

### `lat-lng-points.csv`

Eight lat/lng points with a numeric `value` column; two rows omit `value`. Use
for coordinate binding, point aggregation to boundaries, and missing-value
handling in choropleths.

### `boundary-summary.csv`

Pre-aggregated rows keyed by `boundary_key` with duplicate keys, whitespace,
diacritics, an unknown key, and a blank key. Use for join-to-boundaries layers
and summary-value matching edge cases.

### `cluster-points.csv`

Eight points in two tight clusters a degree apart, with `cases` and `population`
columns. Use for graduated point classification, per-capita normalization,
clustering, and heatmaps.

### `swapped-lat-lng-points.csv`

Two valid coordinate rows plus two rows whose latitude values only fit as
longitudes. Use for coordinate validation and swapped-axis detection.

### `grid-bin-points.csv`

Four points sharing one coordinate and one point a degree away. Use for
grid-bin layers and count suppression when a fixed-meter cell size yields
exactly two bins.

### `web-mercator-points.csv`

Point WKT in EPSG:3857 whose WGS 84 equivalents sit near 10°E / 10°N. Use for
geometry CRS reprojection on import and map render.

### `dated-points.csv`

Nine dated points clustered near 10°E / 10°N, plus one later-week outlier at
11°E / 10°N. Use for map time sliders, temporal filtering, and AOI overlays on
time-varying point layers.

### `pcode-polygon.csv`

One polygon with a `pcode` covering 10°E / 10°N. Use for buffer-of-layer
creation, go-to pcode lookup, and polygon-backed spatial tools.
