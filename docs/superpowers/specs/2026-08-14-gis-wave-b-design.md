# GIS Wave B: geometry and choropleth design

**Status:** Approved for implementation planning
**Date:** 2026-08-14
**Related:**

- `docs/superpowers/specs/2026-08-12-gis-avamap-design.md`
- `docs/superpowers/specs/2026-08-12-gis-shell-design.md`
- `docs/design/gis/feature-home-inventory.md`
- `docs/superpowers/plans/2026-08-14-gis-wave-a-layers-and-persistence.md`

## 1. Goal

Wave B turns the persisted Wave A map shell into an area-mapping tool. Authors
can render geometry columns, join data to workspace boundary datasets, aggregate
points into boundaries, classify polygon values, diagnose failed matches, and
protect sensitive source records with query-level suppression.

Wave B is complete only when the entire choropleth path is safe and diagnosable.
A blank map caused by failed P-code matching is not an acceptable partial
result, and a client-side attempt to hide sensitive points is not suppression.

## 2. Product decisions

The following decisions resolve the open or contradictory parts of the parent
GIS specifications.

1. Sensitivity remains a per-map-layer setting. Datasets do not gain a default
   or enforced sensitivity field in Wave B.
2. Boundary geometry comes from datasets already present in the workspace.
   Bundled catalogs, direct HDX access, and boundary onboarding remain later
   work.
3. Point-in-polygon aggregation supports count, sum, average, minimum, and
   maximum. Every aggregation also calculates contributing-record count for
   suppression.
4. Wave B includes categorical polygon choropleths, capped at three named
   categories plus Other. Point categorical styling remains Wave C.
5. Work lands as integrated vertical slices. A control becomes available only
   when its model, execution, diagnostics, rendering, and tests are complete.
6. Choropleth controls remain unavailable until boundary diagnostics and
   explicit no-data behavior exist.

## 3. Scope

### 3.1 Included

- WKT, WKB, and GeoJSON geometry columns
- Point, line, polygon, and corresponding multi-geometries
- Workspace datasets as boundary sources
- Exact and normalized-name boundary-key joins
- Duplicate, ambiguous, and unmatched-key diagnostics
- Point-in-polygon aggregation
- Count, sum, average, minimum, and maximum measures
- Graduated polygon choropleths
- Categorical polygon choropleths
- Quantile, equal interval, Jenks, standard deviation, and manual classification
- Per-unit normalization using a numeric denominator
- Explicit real-value, no-data, and suppressed states
- Persisted classification breaks and legend entries
- Zoom-based, topology-preserving geometry simplification
- Tri-state DuckDB spatial capability detection
- End-to-end aggregate-only enforcement

### 3.2 Deferred

- Dataset-level sensitivity defaults or enforcement
- Bundled boundary catalogs and direct HDX sources
- CRS reprojection controls
- The coordinate validation report
- Grid and hex binning
- Proportional-symbol completion, clustering, and heatmaps
- Point categorical styling
- Geometry editing
- Supabase schema changes

## 4. Architecture

### 4.1 Config version

`AvaMapConfig` advances from version 1 to version 2. Its parser migrates every
valid version 1 map into the version 2 shape without changing its Wave A
behavior. Version 2 remains strict at the JSON boundary, and serialization
always emits the current version.

The migration supplies only values that preserve old behavior. It does not
guess boundary sources, geometry encodings, classification settings, or
sensitivity changes.

### 4.2 Geometry bindings

`MapLayer.GeoBinding` gains three area-capable branches alongside
`latLngColumns`.

#### Geometry column

A geometry-column binding stores:

- The source query-column identifier
- Encoding: WKT, WKB, or GeoJSON
- Expected geometry family: point, line, or polygon
- Simplification settings where the geometry family supports them

WKB accepts binary values and hexadecimal text, with an optional `0x` prefix.
The executor standardizes every successful geometry as GeoJSON before returning
it to the application.

A layer has one geometry family. The corresponding single and multi-geometry
types belong to the same family. Mixed families do not render partially; they
produce a diagnostic that asks the author to filter or split the source.

#### Join to boundaries

A boundary-key binding stores:

- The data key query-column identifier
- A boundary-source reference
- Matching mode: exact or normalized name
- An area-aggregation definition

Each source row is assigned to a boundary through its key, then aggregated per
boundary. This works for already summarized data and for repeated case rows.

#### Aggregate points to boundaries

A spatial aggregation binding stores:

- A point binding, either latitude/longitude columns or a point geometry column
- A boundary-source reference
- An area-aggregation definition

The executor assigns each point to a polygon through spatial containment. A
geometry-column source must contain point or multipoint geometry for this
binding. Other families are rejected with a diagnostic.

### 4.3 Boundary-source reference

A persisted boundary-source reference contains:

- Workspace dataset identifier
- Boundary geometry-column identifier
- Geometry encoding
- Boundary-key column identifier
- Optional display-name column identifier
- Simplification settings

The reference uses stable model identifiers. The runtime resolves identifiers
to current column names immediately before compilation. Renaming a column does
not invalidate a saved map. Deleting a dataset or referenced column leaves the
configuration intact and produces a rebind-required layer error.

### 4.4 Area aggregation

An area aggregation contains:

- Operation: count, sum, average, minimum, or maximum
- A numeric source measure column for every operation except count
- A stable output value identifier used by classification and legends

The executor always calculates contributing-record count independently of the
selected operation. Null measure values are excluded from sum, average,
minimum, and maximum, but their rows still contribute to the suppression count.
If every measure value is null and the area is not suppressed, the area is
no-data.

### 4.5 Color and classification

`ColorSpec` expands from single color to categorical and graduated color.

A categorical color specification contains:

- Value column
- Up to three named category assignments
- Other color and label
- Required no-data style

A graduated color specification contains:

- Value column
- Sequential ramp
- Classification method and class count, or manual breaks
- Optional normalization
- Required no-data style

Normalization contains a denominator column and a multiplier of 1, 1,000, or
100,000. Boundary-key joins may select a denominator from prepared data or the
boundary dataset. Point-in-polygon aggregation selects its denominator from the
boundary dataset, preventing repeated point rows from multiplying the
denominator. A zero or null denominator is no-data, never infinity.

`LegendConfig` gains persisted breaks and ordered entries. Autosave writes the
active classification and the breaks derived from the same result set together.
The live map, a reopened map, and later export or embed consumers therefore use
the same saved boundaries.

### 4.6 Spatial capability

DuckDB exposes a tri-state capability:

- `loading`
- `available`
- `unavailable`

Latitude/longitude point layers continue to require no spatial SQL. Every Wave
B geometry-column, boundary, and simplification path checks the spatial
capability before execution. An unavailable extension preserves the layer's
configuration and produces an actionable error. It never triggers a weaker
fallback.

## 5. Spatial query boundary

### 5.1 Compiler responsibility

A dedicated GIS compiler sits above the existing structured-query compiler and
executor. It is the only module that emits spatial SQL. It accepts the layer,
resolved source metadata, boundary metadata, sensitivity policy, and current
zoom band, then produces a query and the metadata required to parse its result.

Identifiers pass through one quoting function. User-controlled scalar values
are bound or escaped through the same compiler boundary. UI modules do not
assemble SQL fragments.

### 5.2 Query output

The spatial query returns only what the renderer needs:

- Stable feature identifier
- Standardized GeoJSON geometry
- Safe metric or category value
- Boundary display name when configured
- Feature state: value, no-data, or suppressed
- Non-sensitive properties selected for popups

Aggregate-only source points, raw contributing rows, suppressed metric values,
and exact below-threshold counts do not cross this boundary.

### 5.3 Suppression

Suppression happens inside DuckDB before results reach application code. The
query computes contributing-record count, applies `minCellCount`, and emits a
suppressed state instead of the aggregate value when the threshold is not met.

The public result may reveal only that an area has fewer records than the
configured threshold. It may not reveal the exact count or a metric from which
the exact count can be reconstructed.

Real zero, suppressed, and no-data are distinct:

| State | Meaning | Rendering |
| --- | --- | --- |
| Value zero | A reported value equals zero | Lowest applicable class |
| Suppressed | Data exists below the permitted record threshold | Suppression hatch and neutral fill |
| No-data | Nothing usable was reported or the denominator is invalid | No-data stipple and neutral fill |

### 5.4 Zoom simplification

Polygon simplification is enabled by default with a persisted screen-space
tolerance of 0.75 pixels. A tolerance of zero disables simplification.

At runtime, the compiler converts screen-space tolerance into projected
distance using the current integer zoom band and map latitude. It simplifies
with topology preservation before GeoJSON leaves DuckDB. Querying is debounced
when the map enters a new integer zoom band, and the previous geometry remains
visible while the next band loads.

The query cache key includes the source query, binding, aggregation,
sensitivity policy, spatial capability, and zoom band. Superseded requests are
cancelled.

## 6. Matching and diagnostics

### 6.1 Exact matching

Exact matching compares the source and boundary keys without transformation.
Null keys do not match. Duplicate boundary keys are ambiguous and do not join.

### 6.2 Normalized-name matching

Normalized-name matching applies these operations in order:

1. Unicode decomposition
2. Diacritic removal
3. Lowercase conversion
4. Punctuation replacement with spaces
5. Whitespace collapse
6. Leading and trailing whitespace removal

This makes `Nord-Kivu`, `Nord Kivu`, and `NORD KIVU` comparable. When distinct
boundary keys collapse to one normalized key, the normalized key is ambiguous
and does not join automatically.

### 6.3 Diagnostic categories

The runtime reports at least these categories:

- Unparseable geometry
- Mixed geometry families
- Non-point input for point-in-polygon aggregation
- Missing boundary dataset or column
- Duplicate exact boundary key
- Ambiguous normalized boundary key
- Unmatched source key
- Point outside every boundary
- Null or zero normalization denominator
- Spatial extension unavailable

Diagnostics include counts and bounded, non-sensitive samples. A fully
unmatched join opens the match report instead of displaying an unexplained
blank choropleth.

## 7. Inspector and map behavior

### 7.1 Data section

The existing binding selector gains:

- Geometry column
- Join data to boundaries
- Aggregate points into areas

Geometry-column controls select the column, encoding, and expected geometry
family. Boundary workflows select the boundary dataset, geometry column and
encoding, key columns where applicable, optional display-name column,
aggregation method, and measure field.

Spatial options remain visible while unavailable. Loading and unavailable copy
explains why they cannot be selected.

The advanced disclosure contains simplification controls. The layer row shows
geometry, join, and suppression health; its warnings open the corresponding
inspector section or report.

### 7.2 Style and classification

Polygon layers gain Fill symbology. Categorical fill exposes category
assignments, Other, and no-data controls. It permits at most three named
categories.

Graduated fill opens the classification editor defined by the shell design:

- Value and optional normalization selectors
- Sequential ramp selector
- Histogram of normalized values
- Quantile, equal interval, Jenks, standard deviation, and manual methods
- Class count and counts per class
- Pointer and keyboard-operable break handles
- Editable numeric break list
- Permanent no-data row
- Live map updates

Moving a break switches the method to Manual and announces that change. Arrow
keys move a focused handle by one histogram bin; Shift plus an arrow moves it by
ten. Each handle has an accessible name containing its ordinal and current
value.

Jenks classification uses a deterministic sample of at most 5,000 values. The
editor states when sampling occurred.

### 7.3 Degenerate classifications

The editor follows the existing shell decisions:

- All-equal values offer single color instead of inventing classes.
- A single value cannot produce a graduated ramp.
- All-null values render every area as no-data and retain the no-data row.
- Class count clamps to the number of distinct values and explains why.
- Zero or null normalization denominators become no-data and report their
  count.

### 7.4 Sensitivity section

Aggregate-only requires an area-producing binding. An author may select the
policy before configuring the binding, but the layer remains blocked and links
to the Data section until the binding is safe.

Point and sized symbology stay visible but unavailable for aggregate-only
layers. Relaxing Aggregate only still requires the confirmation defined in
Wave A. Tightening sensitivity requires no confirmation.

The legend distinguishes suppressed, no-data, and real zero whenever those
states occur. Popups never expose protected measures or exact below-threshold
counts.

### 7.5 Accessibility and localization

All displayable copy uses Lingui. Native controls and Mantine primitives are
preferred. Custom histogram and break controls provide keyboard operation,
accessible names, visible focus, sufficient contrast, and reduced-motion
behavior.

## 8. Vertical slices

### 8.1 Spatial capability and geometry columns

This slice delivers the version 2 config parser, tri-state spatial capability,
WKT/WKB/GeoJSON conversion, geometry-family validation, single-color line and
fill rendering, inspector controls, and focused tests.

### 8.2 Boundary-key joins

This slice delivers workspace boundary selection, exact and normalized-name
matching, duplicate and ambiguous key handling, unmatched-key diagnostics,
area aggregation, and single-color area rendering.

### 8.3 Aggregation and choropleth

This slice delivers point-in-polygon aggregation, all five operations,
normalization, categorical and graduated fills, classification math, frozen
legend entries, and explicit no-data rendering.

### 8.4 Safety and scale hardening

This slice delivers aggregate-only structural constraints, query-level
minimum-count suppression, zoom-based simplification, complete unavailable-
spatial behavior, regression coverage, and the mismatched-key end-to-end flow.

## 9. Verification

### 9.1 Model tests

- Version 1 to version 2 migration
- Strict version 2 parsing
- JSON round trips
- Invalid binding and aggregation combinations
- Missing or deleted source references

### 9.2 Compiler and integration tests

- WKT, binary and hexadecimal WKB, and GeoJSON
- Point, line, polygon, and multi-geometries
- Mixed-family rejection
- Exact and normalized boundary joins
- Duplicate, ambiguous, and unmatched keys
- Points outside all boundaries
- Count, sum, average, minimum, and maximum
- Null measures
- Normalization and invalid denominators
- Aggregate-only suppression
- Proof that protected values do not leave DuckDB
- Spatial capability states
- Zoom-band simplification and topology preservation
- Safe identifier quoting

### 9.3 Pure classification tests

- Categorical bucketing and Other
- Quantile, equal interval, Jenks, standard deviation, and manual breaks
- Deterministic Jenks sampling
- All-equal, single-value, all-null, and low-distinct-count inputs
- Class counts and legend entry order

### 9.4 Renderer tests

- Fill and line layer specifications
- Categorical and graduated expressions
- Real-zero, no-data, and suppression treatments
- Selection, visibility, and layer ordering
- Persisted legend entries
- The invariant that aggregate-only inputs cannot produce point layers

### 9.5 Component tests

- Geometry and boundary binding forms
- Spatial loading and unavailable states
- Match reports
- Classification pointer and keyboard behavior
- Sensitivity locking and relaxation confirmation
- Translated accessible copy

### 9.6 Focused end-to-end tests

Run each related Playwright file individually, never the full end-to-end suite:

1. Render and reload a geometry-column map.
2. Surface a deliberately mismatched boundary-key report.
3. Build and reload a classified point-in-polygon choropleth.
4. Verify that a below-threshold area is suppressed without exposing its value.

## 10. Completion criteria

Wave B is complete when:

1. Every valid Wave A map opens with unchanged behavior.
2. WKT, WKB, and GeoJSON geometry layers render and survive reload.
3. Exact and normalized boundary joins diagnose failures without blank-map
   ambiguity.
4. Point-in-polygon aggregation supports all five approved operations.
5. Categorical and graduated polygon choropleths persist and reload.
6. Normalization, no-data, and suppression are distinct in the map and legend.
7. Aggregate-only raw points and below-threshold values cannot reach the
   application result or MapLibre.
8. Zoom changes fetch topology-preserving simplified geometry without clearing
   the current layer.
9. Spatial-unavailable environments retain configuration and explain the
   failure without weakening protection.
10. Type checking, lint, frontend tests, build, i18n validation, focused DuckDB
    spatial integration tests, and each related end-to-end file pass.
