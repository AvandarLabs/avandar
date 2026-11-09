# Workflow B map features: design

Status: draft for review. Covers the five product features that
[measles-outbreak-response.md](measles-outbreak-response.md) Workflow B needs
and does not have. That plan's section 8 says Workflow B "needs no new
product features." A check of the code and the demo database on 2026-11-09
showed it does.

## 1. Problem

Workflow B asks: which NYC ZIP codes combine low MMR coverage with nearness to
a case or exposure site, and which schools and childcare centers near those
sites need outreach? The epidemiologist has to:

1. Shade ZIP codes by MMR coverage and make anything under 95% stand out.
2. Put the exposure sites on the map.
3. Draw a radius around each site and get the list of schools and childcare
   centers inside it.
4. Hand the map and that list to field staff as one PDF.
5. Keep the result on an internal dashboard the team checks weekly.

What the product does today, verified against the code:

| Step | Today | Gap |
| --- | --- | --- |
| 1. Shade below 95% | Manual breaks work (`classifyLayerValues.ts`). Only two ramps exist, blue and orange (`GraduatedControls.constants.ts`). | With one break, the two classes get `ramp[0]` and `ramp[1]`, the two *lightest* colors (`classifyLayerValues.ts:169` indexes the 5-color ramp without resampling). No per-class color, no custom legend label. |
| 2. Exposure sites | "Go to" only moves the camera (`parseMapGoToQuery.ts`). Annotations are drawings, not data. | No way to add a point that is not already in a dataset. No geocoding anywhere in `src/` or `shared/`. |
| 3. Radius and list | Buffer draws a ring around every feature of a layer (`compileBufferOfLayerQuery.ts`). | The ring has no attributes and filters nothing. No feature list, no CSV. Buffer refuses latitude/longitude layers (`BufferMapTool.tsx`). |
| 4. PDF | Header, map, legend, north arrow, scale bar, footer, disclaimer (`composeExportPdf.ts`). | No table. |
| 5. Dashboard | Dashboards have DataViz and Filter blocks only (`src/views/DashboardApp/AvaPage/pblocks/`). | No map block. The GIS inventory places one (`docs/design/gis/feature-home-inventory.md` §1.4, §2) but it was never built. |

## 2. The five features

| # | Feature | User-facing name | Unblocks | Depends on |
| --- | --- | --- | --- | --- |
| F1 | Threshold colors | "Class colors" in the Style section | Step 1 | None |
| F2 | Places | "Add a place" tool | Step 2 | None |
| F3 | Filter by layer, and the feature list | "Only show features inside..." and "Feature list" | Step 3 | None. Works best with F2. |
| F4 | Feature list in the PDF | "Include a feature list" in the export sheet | Step 4 | F3 |
| F5 | Map block in dashboards | "Add to dashboard" | Step 5 | None. F1 colors and F3 filters render in it for free. |

Recommended build order: F1, F3, F2, F4, F5. F1 is the smallest. F3 is the
core of the workflow and works with any point dataset, so it is useful before
F2 lands. F5 is the largest and touches dashboard publishing.

Each feature is its own branch and PR, built in its own worktree from
`demo/measles`, then logged in [pr-feature-log.md](pr-feature-log.md).

Implementation plans:

| Feature | Plan | Branch | Map config version |
| --- | --- | --- | --- |
| F1 | [workflow-b-f1-threshold-colors-plan.md](workflow-b-f1-threshold-colors-plan.md) | `feat/gis-threshold-colors` | 6 |
| F2 | [workflow-b-f2-places-plan.md](workflow-b-f2-places-plan.md) | `feat/gis-places` | none |
| F3 | [workflow-b-f3-filter-by-layer-plan.md](workflow-b-f3-filter-by-layer-plan.md) | `feat/gis-filter-by-layer` | 7, after F1 |
| F4 | [workflow-b-f4-pdf-feature-list-plan.md](workflow-b-f4-pdf-feature-list-plan.md) | `feat/gis-pdf-feature-list` | 8, after F3 |
| F5 | [workflow-b-f5-dashboard-map-block-plan.md](workflow-b-f5-dashboard-map-block-plan.md) | `feat/dashboard-map-block` | none |

---

## 3. F1: Threshold colors

### 3.1 Goal

A user sets one break at 95 and gets a red "Below 95%" class and a neutral
"95% or above" class, with those exact words in the legend and the PDF.

### 3.2 Model

`ColorSpec` `graduated` (`shared/models/AvaMap/MapLayer/LayerSymbology.types.ts`)
changes in two ways:

| Field | Today | New meaning |
| --- | --- | --- |
| `ramp` | A preset's colors, any length. Classes index into it. | Exactly one color per class, in class order. A preset is a UI action that rewrites this array. |
| `classLabels` | Not present | `readonly (string \| undefined)[]`, one per class. `undefined` keeps the generated label (`< 95`). |

Rules:

- Changing the class count (method, `classCount`, or adding or removing a
  manual break) resamples `ramp` from the preset it last came from, or
  from the current colors when the user edited them by hand. Resampling picks
  evenly spaced stops across the source colors, so two classes get the
  lightest and darkest, never the two lightest.
- Changing the class count resets `classLabels` to all `undefined`. A label
  written for "below 95" must not silently move to a different interval.
- `classifyLayerValues` uses `ramp[index]` directly and applies
  `classLabels[index] ?? generatedLabel` to the legend entry. The persisted
  `LegendConfig.entries` already carry the label, so the live map, the PDF,
  and a dashboard embed stay identical.
- A config migration resamples every existing graduated `ramp` to its class
  count. That keeps old maps looking the same except where they were showing
  the two-lightest bug.

### 3.3 Presets

Add to `GRADUATED_RAMPS`, all from ColorBrewer and safe for common color
vision deficiencies:

| Key | Kind | Use |
| --- | --- | --- |
| `blue`, `orange` | Sequential (existing) | General |
| `red` | Sequential | Risk, where darker is worse |
| `redBlue` | Diverging | Below and above a reference value |
| `threshold` | Two colors: `#d7301f` (below), `#d9d9d9` (at or above) | One-break flagging |

Every preset can be reversed with a "Reverse" action next to the select.

### 3.4 UI

In the Style section's ClassificationEditor:

- `GraduatedRampSelect` gets the new presets and a Reverse icon button.
- `ClassificationBreakList` shows a color swatch and an editable label for
  each class. The swatch opens Mantine's `ColorPicker` with the preset colors
  as swatches. The label is a text input with the generated label as its
  placeholder.
- A "Highlight values below" shortcut in the method controls: one number
  input that sets `classification` to `manual` with that single break, the
  `threshold` preset, and labels `Below {value}` and `{value} or above`.
  It is a shortcut that writes ordinary fields, not a new classification
  method.
- Fractions: the School Immunization Survey stores coverage as a fraction
  (`0.98`), not a percent. When every classified value is between 0 and 1,
  the shortcut's input is shown and typed as a percent (95) and stored as a
  fraction (0.95), and its labels read `Below 95%` and `95% or above`.

### 3.5 Tests

- Unit: resampling (2, 3, 5, 7 classes from a 5-color preset), label reset on
  class-count change, `classifyLayerValues` uses labels, migration of a
  5-color ramp with 2 manual classes.
- Component: editing a swatch and a label updates the layer and the legend.
- E2E: build a ZIP choropleth with "Highlight values below 95" and assert the
  legend reads "Below 95".

---

## 4. F2: Places

### 4.1 Goal

A user adds the real exposure sites (for example, a Hell's Kitchen
restaurant) to a map by clicking, typing coordinates, or searching an address.
The sites become ordinary data that buffers, filters, Data Explorer, and
dashboards can all use.

### 4.2 Decision: places are a dataset, not map state

| Option | Buffer and filter can use it | Data Explorer and chat can join it | Reusable across maps | New storage |
| --- | --- | --- | --- | --- |
| Annotation points in map config | No | No | No | None |
| Inline features on a new layer kind | Yes | No | No | None, but a new layer source type everywhere |
| **A virtual dataset holding the places as a `VALUES` query** | **Yes** | **Yes** | **Yes** | **None** |
| A new `places` table | Yes | Needs a new QETL relation | Yes | A table, RLS, model |

A virtual dataset (`supabase/schemas/20.datasets__virtual.sql`) is a stored
SQL query. A places dataset stores:

```sql
SELECT * FROM (VALUES
  ('Restaurant, W 46th St', '...address...', 40.7603, -73.9885, NULL, NULL, 'Exposure 10/02 6-10pm')
) AS places(name, address, latitude, longitude, starts_at, ends_at, notes)
```

Adding, moving, or deleting a place rewrites `raw_sql`. Every value goes
through `quoteSqlLiteral`, and latitude and longitude are validated numbers
before they are written. A places dataset holds at most 500 rows: it is for
hand-placed sites, not imports.

The dataset is marked as a places dataset so the app knows it may edit it.
Add `is_places` (boolean, default false) to `datasets__virtual`. Chat and
Data Explorer treat it like any other dataset.

Verify early in implementation: a virtual dataset with no source relations
loads through QETL and its `dataset_columns` are derived correctly. If not,
fall back to a CSV dataset that the app rewrites on each edit, with the same
UI.

### 4.3 Columns

| Column | Type | Required | Purpose |
| --- | --- | --- | --- |
| `name` | text | Yes | Label in popups, the feature list, and the PDF |
| `address` | text | No | Filled by address search, editable |
| `latitude`, `longitude` | double | Yes | Point geometry |
| `starts_at`, `ends_at` | timestamp | No | Exposure window. Works with the map's time slider. |
| `notes` | text | No | Free text |

### 4.4 Adding a place

A new tool-cluster tool, "Add a place" (`MapToolMode` gains
`{ type: "place" }`). This is the first tool whose input is a point the user
places, which the GIS inventory's isochrone note (§5) asks to settle first.
The answer here: a tool that writes rows into a dataset, then makes sure a
layer shows that dataset.

1. The first time, the tool asks which places dataset to add to, or creates
   one ("Exposure sites"), and adds a point layer for it with a
   `latLngColumns` binding.
2. The user then either:
   - clicks the map, or
   - types coordinates (reusing `parseMapGoToQuery`), or
   - searches an address (section 4.5).
3. A small form takes name, dates, and notes, then saves.
4. Clicking an existing place in that layer offers Edit, Move, and Delete.

"Go to" gains an "Add a place here" action on its result, so a coordinate
search can become a place in one step.

### 4.5 Address search

A new edge function route, `supabase/functions/geocode/`, that takes a query
string and an optional bias box (the map view), and returns up to five
candidates `{ label, latitude, longitude, confidence }`. The browser never
calls the provider directly, so the key stays on the server and the provider
can change without a client release.

Provider choice:

| Provider | Coverage | Storing results allowed | Key | Notes |
| --- | --- | --- | --- | --- |
| Nominatim (public OSM) | Global | Yes, ODbL attribution | No | 1 request per second, no autocomplete, usage policy forbids product traffic |
| Geoapify or LocationIQ | Global, OSM-based | Yes, ODbL attribution | Yes | Paid tiers, autocomplete |
| Mapbox, Google | Global | Not on standard terms | Yes | Storing geocodes needs a permanent-geocoding plan |
| NYC GeoSearch (Planning Labs) | NYC only | Yes, public data | No | Built on the city's own address database |

Decision: **Geoapify**, behind a provider interface. It is OSM-based, so
storing results is allowed with OpenStreetMap attribution, which places need.
It has a free tier and a bias-by-rectangle parameter for the map view. The
key is the edge secret `GEOAPIFY_API_KEY`. The place form shows
"© OpenStreetMap contributors" under address results.

Privacy: Workflow A contact home addresses are protected health information
and must not go to a third-party geocoder without a data processing
agreement. This feature is for public places. The search box says so in its
help text, and the route does not log query strings.

### 4.6 Tests

- Unit: `VALUES` SQL generation and quoting (names with quotes, unicode,
  empty notes), coordinate validation, the 500-row cap.
- Edge function: provider response mapping, error and empty results, no
  query logging.
- Component: the place form, edit and delete.
- E2E: add a place by clicking, then by coordinates. Address search runs
  against a stubbed provider.

---

## 5. F3: Filter by layer, and the feature list

### 5.1 Goal

"Show me the schools and childcare centers within half a mile of these
exposure sites, as a list I can sort and export, with each one's distance to
the nearest site."

### 5.2 Model

`MapLayerCommon` (`shared/models/AvaMap/MapLayer/MapLayer.types.ts`) gains:

```ts
/** Keeps only features that intersect another layer's output. */
spatialFilter: { layerId: MapLayerId } | undefined;
```

This is a "select by location" that reuses the layer stack: the filtering
layer can be a buffer layer, a choropleth, a polygon dataset, or anything
else that outputs polygons. It sits beside `applyAoiFilter` and composes with
it: both apply.

Rules, enforced by a check like `hasBufferCycle`:

- The filtering layer must output polygons.
- No cycles: a layer cannot filter by a layer that depends on it.
- A layer with `jitter` sensitivity filters on its *true* positions, so the
  feature list stays correct, but the list follows the sensitivity rules in
  section 5.5.

### 5.3 Query

Every compiler in `src/clients/maps/MapLayerSpatialQuery/` that already
applies the AOI (`compileLatLngOverlaySql`, `compileGeometryColumnQuery`,
`compilePointAggregationQuery`, `compileBoundaryJoinQuery`) also applies the
spatial filter: compile the filtering layer, read its features into a
`filter_geoms` CTE (the same `json_each` pattern `compileBufferOfLayerQuery`
uses for its source), and add
`EXISTS (SELECT 1 FROM filter_geoms WHERE ST_Intersects(row_geom, filter_geoms.geom))`.

### 5.4 Buffer changes

- **Latitude/longitude layers can be buffered.** `compileBufferOfLayerQuery`
  builds `source_features` from `ST_Point(longitude, latitude)` over the
  overlay SQL instead of reading a feature collection. Remove the refusal in
  `BufferMapTool.tsx`.
- **Buffers keep their source's identity.** `BufferOfLayerBinding` gains
  `labelColumn: QueryColumn.Id | undefined`. When set and `dissolve` is
  false, each ring carries that value (for example the place name), so a
  popup on the ring says which site it surrounds.
- **Distance in friendly units.** The form accepts meters, kilometers, feet,
  or miles and stores meters. "0.5 mi" stores 805.
- **One step for the common case.** After the buffer layer is created, the
  confirmation offers "Filter another layer by this buffer," which picks a
  point layer and sets its `spatialFilter`.

### 5.5 The feature list

A "Feature list" drawer opens from a layer row's menu and from the buffer
confirmation. It shows the selected layer's rows after every filter (AOI,
time, spatial filter):

- Columns: the layer's popup columns (`PopupConfig.columnIds`), so authors
  already control what is shown.
- When the layer has a `spatialFilter` whose layer is a buffer, an extra
  "Distance to nearest {source layer}" column, computed in meters with
  `ST_Distance` in the same meters CRS the buffer uses (`makeMetersCrsSql`),
  shown in the buffer's unit, plus "Nearest {label}" when the buffer has a
  `labelColumn`.
- Sorting by any column, with distance ascending as the default when present.
- A count in the header: "42 features."
- "Download CSV", reusing `downloadRowsAsCsv`.
- Clicking a row flies to the feature and opens its popup.

Sensitivity rules: the list and its CSV exist only for `exact` layers. For
`jitter` layers the drawer shows the count and explains why rows are hidden.
For `aggregateOnly` layers the menu item does not appear. A list of exact
rows from a protected layer would undo the protection the layer exists for.

Layout: the drawer sits at the bottom of the map area, above the bottom bar,
and takes over the bottom-center stack (time slider, status) while open. It
scrolls inside itself, so the map area never scrolls.

### 5.6 Tests

- Unit: each compiler with and without a spatial filter, the
  filter-plus-AOI combination, cycle and non-polygon rejection, buffering a
  latitude/longitude layer, distance accuracy against a known pair of points
  (0.5 mi apart within 1 m).
- Component: the drawer's columns, sort, sensitivity states, CSV contents.
- E2E: points layer plus a places layer, buffer 0.5 mi, filter, open the
  list, check the count and the first row's distance.

---

## 6. F4: Feature list in the PDF

### 6.1 Goal

The PDF a field team gets has the map on page 1 and the candidate list after
it, so the two can never be out of sync.

### 6.2 Model

`ExportLayout` (`shared/models/AvaMap/AvaMapConfig/ExportLayout.types.ts`)
gains:

```ts
/** A feature list printed after the map, or unset for none. */
featureList:
  | {
      layerId: MapLayerId;
      columnIds: readonly QueryColumn.Id[];
      sort: { columnId: QueryColumn.Id; direction: "asc" | "desc" } | undefined;
      maxRows: number;
    }
  | undefined;
```

It is persisted like the rest of the export furniture, so reopening Export
shows the last setup. If the layer is deleted, the field resets to unset.

### 6.3 Rendering

- The export sheet gets an "Include a feature list" section: layer select
  (exact-sensitivity layers only, per section 5.5), column checkboxes
  defaulting to the drawer's columns, sort, and a row cap (default 200,
  maximum 1,000).
- `composeExportPdf` adds table pages after the map page and any legend
  overflow page. A new `drawExportFeatureTable` sits beside
  `drawExportLegend`, using jsPDF directly like the rest of the composer, so
  no new dependency. It repeats the header row on every page, wraps long
  cells, runs every string through `toPdfSafeText`, and paginates.
- Above the table: "{count} {layer name} within {distance} of {source}" when
  the layer is filtered by a buffer, otherwise "{count} {layer name}."
- When rows exceed the cap: "Showing {maxRows} of {count}. Download the full
  list as CSV from the map."
- Page numbers become "Page n of N" across all pages. Every page keeps the
  footer with the source line and disclaimer, since a field team may print
  only the list.
- The rows come from the same query the feature list drawer runs, at the
  moment of export, with the on-screen filters.

### 6.4 Tests

- Unit: table pagination (0, 1, exactly one page, many pages), header repeat,
  truncation note, long cell wrapping, page numbering across map, legend
  overflow, and table pages.
- Snapshot of the jsPDF draw calls for a small table, matching the existing
  `composeExportPdf.test.ts` approach.
- E2E: export with a list and assert the download has more than one page.

---

## 7. F5: Map block in dashboards

### 7.1 Goal

The "coverage risk" dashboard shows the live map beside its charts. The same
dashboard, published publicly for Workflow C, shows the map without exposing
any row the map was not already showing.

### 7.2 Authoring

As placed in the GIS inventory (§1.4, §2): "Add to dashboard" sits in the
export sheet footer. It picks an existing dashboard or creates one, appends a
map block, and links to it. In the dashboard editor, the block also appears
in the Puck block list as "Map," with a map picker.

### 7.3 The block

New `MapPBlock` in `src/views/DashboardApp/AvaPage/pblocks/MapPBlock/`:

| Prop | Type | Purpose |
| --- | --- | --- |
| `mapId` | `AvaMap.Id` | The map to show |
| `view` | `{ type: "saved" } \| { type: "bookmark"; bookmarkId }` | Which camera to open on |
| `heightPx` | number | Block height |
| `showLegend` | boolean | Legend on or off |
| `isInteractive` | boolean | Pan, zoom, and popups, or a fixed picture |

It renders a new `MapViewer` component extracted from the GIS app: the
`MapCanvas`, legend, and attribution, with no panels, tools, or editing, per
the inventory's "map, legend, and attribution only." `MapViewer` reuses
`useGisAppRendering` and `MapSourceHydration`, so the dashboard and the GIS
app cannot draw the same map differently.

The disclaimer from the map's export layout is shown under the block when
any layer has disputed boundaries, matching the bottom-bar rule in the GIS
app.

### 7.4 Workspace dashboards

The block renders the map live. Edits to the map show up on the next load.

- A viewer needs access to the map and its datasets. Without it, the block
  shows "You don't have access to this map" instead of an error or an empty
  canvas.
- The dashboard share modal warns when the dashboard embeds a map the
  recipient cannot see, the same way gadget embeds warn
  ([gadgets.md](gadgets.md)).
- Dashboard filters do not apply to the map in this version. The editor says
  so on the block. Wiring filters to layer columns is a follow-up.

### 7.5 Public dashboards

Maps have no public visibility, and a map layer reads raw datasets. Publishing
those datasets for the map would expose exact coordinates on `jitter` layers
and raw rows on `aggregateOnly` layers, since protection is applied when the
map renders, not in the data.

Decision: a public dashboard publishes the map's **rendered output**, not its
sources.

- At publish, `dashboardPublishSnapshots` compiles each visible layer exactly
  as the viewer would, with the map's saved AOI, time range, spatial filters,
  and sensitivity applied, and writes one GeoJSON feature collection per
  layer, the map config, and the legend into the dashboard's publish
  snapshot.
- Feature properties are cut to the layer's popup columns, matching the
  slice builder's "publish only what is queried" default.
- The public viewer renders those files with `MapViewer` in a snapshot mode
  that needs no DuckDB and no spatial extension.
- Republishing refreshes the snapshot, the same as the dashboard's datasets
  today. The map is never live on a public page.
- The publish preview lists each map layer and its feature count next to the
  datasets, so the author sees what goes public.

### 7.6 Tests

- Unit: block props parsing, the publish compiler producing protected output
  (a `jitter` layer's published coordinates differ from the source, an
  `aggregateOnly` layer publishes only areas), property cutting.
- Component: `MapViewer` in live and snapshot modes, the no-access state.
- pgTAP: none expected unless the snapshot needs a new storage path policy.
- E2E: add a map to a dashboard from the export sheet, view it as a workspace
  member, publish, and load the public page signed out.

---

## 8. Related gaps that are not features

These block a clean Workflow B demo but are data or configuration work, not
product features. Track them separately.

| Gap | Fix |
| --- | --- |
| No ZIP-level childhood MMR coverage in the catalog. It lives on DOHMH's GitHub, not Socrata. | Upload the CSV, or add a GitHub source to a pipeline. Replace `10_nyc_district_child_mmr_2018_19_ALL_MONTHS_SIMULATED.csv` in the "NYC Doh" workspace, since Workflow B uses real data only. |
| `btkd-y8bp` reports NYC public schools by district, and no school-district polygons are loadable. It does carry 1,647 NYC schools (mostly private and charter) as individual rows with a WKT `location` point and their own coverage. | Use those school points for step 3 and for a points-to-ZIP choropleth (`aggregatePointsToBoundaries` onto MODZCTA). Find school-district polygons for the public-school district rows. |
| School Point Locations (`jfju-ynrr`) is a ZIP shapefile and not loadable. | Use `a3nt-yts4` (1,992 schools, WKT points, cached on demo since 2026-11-09). Shapefile support: [shapefile-import-design.md](shapefile-import-design.md). |
| Plan's childcare dataset `dsg6-ifza` has no coordinates. | Use `gy3q-4tzp` (Active Child Care Programs) or `kiyv-ks3f` (UPK sites). |
| The catalog casts latitude and longitude to `VARCHAR` on `gy3q-4tzp`, `wg9x-4ke6`, and `kiyv-ks3f`. | Check that a `latLngColumns` binding accepts them, or fix the catalog cast. |
| Childcare points: the cached childcare dataset `dsg6-ifza` has no coordinates. | Cache `gy3q-4tzp` on demo, or geocode `dsg6-ifza` addresses in a pipeline. |
| Spatial SQL in Data Explorer may only work after the GIS app has loaded the extension in the same session. | Test it. Load `spatial` on first use of an `ST_` function if not. |

## 9. Open questions

1. Geocoding provider: decided, Geoapify (section 4.5).
2. Whether F5's public snapshot should also cover workspace dashboards as an
   opt-in "freeze this map" setting. Recommendation: no, until someone asks.
3. Whether a places dataset should support import from the address column of
   another dataset (batch geocoding). Recommendation: not in this version,
   because it is the path that would send protected addresses to the
   geocoder.
