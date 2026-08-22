# GIS feature-to-home inventory

Every feature from the GIS design spec
(`docs/superpowers/specs/2026-08-12-gis-avamap-design.md`) §10, plus the
annotation layer §9 adds, mapped to the UI surface that owns it. "Wave" matches
the spec's landing order. A feature with no home is a design gap, and §5 lists
the ones that remain.

## How to read this

- **Primary home** is the single surface a feature is designed into. Section 4
  is the traceability table: every §10 row resolves to exactly one primary home.
- Some features legitimately touch a second surface (a control in one place, its
  readout in another). Those are recorded as **secondary surfaces** on the same
  row, never as a second entry.
- Rows marked **(model axis)** are not §10 features. They exist because the
  `MapLayer` model (spec §4) has that field and the UI has to edit it. They are
  listed so the surfaces are complete, and they are excluded from the §10
  traceability count.
- Rows marked **(built)** already exist in `src/views/GISApp` after Phase 1.

---

## 1. Chrome surfaces

### 1.1 Left panel: layer stack

The stack is the map's table of contents. It answers "what is on this map, in
what order" and nothing else. Editing lives in the inspector.

| Feature                                                            | Surface                                                     | Wave |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ---- |
| Multi-layer stack, reorder, visibility                             | Layer list, drag handle, eye toggle                         | A    |
| Add layer (model axis)                                             | Primary button at panel top, opens the add-layer flow       | A    |
| Layer rename, duplicate, delete (model axis)                       | Row overflow menu                                           | A    |
| Sensitivity badge                                                  | Inline badge on the layer row, readout only                 | B    |
| Boundary-join match report                                         | Warning affordance on the layer row, opens the match detail | B    |
| Annotation layer row                                               | A layer row of its own, pinned to the top of the stack      | D    |
| Layer status (loading, error, zero rows, partial map) (model axis) | Inline state on the layer row                               | A    |

### 1.2 Right panel: layer inspector

One panel, sectioned by the model's axes so the editing surface and the data
model stay one-to-one. Sections in order: Data, Style, Sensitivity, Filter,
Popup, Legend.

**Data** section, editing `MapLayer.source` and `MapLayer.geoBinding`:

| Feature                                        | Surface                                                                                   | Wave                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| ABox and HDX layer sources                     | Source picker, workspace sources and a library tab                                        | client half in 1, full in E |
| Geometry binding, lat/lng columns (model axis) | Binding type selector set to "Latitude and longitude columns"                             | A                           |
| Geometry columns: WKT, WKB, GeoJSON            | Same selector, "Geometry column" binding type, with an encoding control                   | B                           |
| Boundary join binding                          | Same selector, "Join to boundaries" binding type, with a boundary source and key controls | B                           |
| Spatial join, point-in-polygon aggregation     | Same selector, "Aggregate points into areas" binding type                                 | B                           |
| Hex and grid binning                           | Same selector, "Bin into a grid" binding type, with grid shape and cell size              | C                           |
| CRS reprojection                               | Advanced disclosure at the foot of the section                                            | C                           |
| Zoom-based simplification                      | Advanced disclosure at the foot of the section                                            | B                           |

Putting all six geo-binding types behind one selector is the design decision
that keeps `GeoBinding` and its editor isomorphic. Each type is one branch of
the union, so adding a wave's binding type adds one option and one sub-form,
never a new panel.

**Style** section, editing `MapLayer.symbology`:

| Feature                                             | Surface                                                        | Wave |
| --------------------------------------------------- | -------------------------------------------------------------- | ---- |
| Symbology type switch (model axis)                  | Segmented control at the top of the section                    | A    |
| Single color (model axis)                           | Color input                                                    | A    |
| Categorical palette                                 | Palette picker plus per-category overrides                     | B    |
| Graduated ramp                                      | Ramp picker, opens the classification editor                   | B    |
| Classification methods and normalization            | Classification editor, opens from the ramp row                 | B    |
| Explicit no-data rendering                          | Classification editor, a permanent row that cannot be removed  | B    |
| Proportional symbols, sqrt-scaled, with size legend | Size controls, value column plus min and max radius plus scale | C    |
| Clustering                                          | Cluster controls, shown when the symbology type is Cluster     | C    |
| Heatmap                                             | Heatmap controls, shown when the symbology type is Heatmap     | C    |
| Disputed-boundary styling and mandatory disclaimer  | Boundary styling row on fill and line layers                   | E    |

**Sensitivity** section, editing `MapLayer.sensitivity`:

| Feature                                         | Surface                                              | Wave                      |
| ----------------------------------------------- | ---------------------------------------------------- | ------------------------- |
| Sensitive-layer mode, minimum-count suppression | Mode selector plus the minimum-count threshold       | model in 1, enforced in B |
| Point jitter and centroid displacement          | Jitter radius control, shown when the mode is Jitter | B                         |

Sensitivity gets its own section rather than living inside Style because it
**constrains** Style. A control that disables other controls cannot sit inside
the thing it disables without reading as a style option.

**Filter**, **Popup**, and **Legend** sections:

| Feature                                              | Surface                                                             | Wave |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ---- |
| Layer filters (model axis)                           | Filter section, editing `MapLayer.source`'s filter clauses          | A    |
| Per-layer popup config, click through to case record | Popup section, column selection plus an optional record link action | A    |
| Legend title, units, position (model axis)           | Legend section, editing `MapLayer.legend`                           | A    |

### 1.3 Floating tool cluster

Transient, map-surface interactions. Everything here starts a gesture on the
map, which is what separates it from the inspector.

| Feature                                               | Surface                                                   | Wave |
| ----------------------------------------------------- | --------------------------------------------------------- | ---- |
| AOI draw-to-filter, wired to P8 filters               | "Area" tool                                               | D    |
| Measure distance and area, go to coordinate or P-code | "Measure" tool and the cluster's search field             | D    |
| Buffer and distance analysis                          | "Buffer" tool, which writes a new layer into the stack    | D    |
| Annotations, text, arrows, freehand, areas            | "Annotate" tool, expanding into an annotation sub-cluster | D    |

### 1.4 Top bar

Map-level identity and output. Nothing layer-specific belongs here.

| Feature                                              | Surface                                                 | Wave |
| ---------------------------------------------------- | ------------------------------------------------------- | ---- |
| Map name, rename (model axis)                        | Editable title                                          | A    |
| Persist map configuration                            | Save state indicator and save action in the title area  | A    |
| Permissions on maps                                  | Share button, reusing `ShareResourceModal`              | A    |
| Custom XYZ, WMS, WMTS sources, satellite, no-basemap | Basemap control                                         | A    |
| Style picker repaired, logs, error and empty states  | Basemap control (the picker half)                       | 1    |
| Offline basemap caching                              | Basemap control, per-basemap "Available offline" action | E    |
| Bookmarks and saved views                            | Views menu                                              | A    |
| Print and PDF export with full map furniture         | Export button, opens the export layout                  | E    |
| Map PBlock in a dashboard                            | "Add to dashboard" action in the export menu            | E    |

### 1.5 Bottom bar

Persistent map furniture. Thin, always present, never a control surface.

| Feature                                    | Surface                                                                | Wave |
| ------------------------------------------ | ---------------------------------------------------------------------- | ---- |
| Scale bar, coordinate readout, attribution | Coordinate readout at the left, scale bar and attribution at the right | A    |

The mandatory disclaimer sits beside the attribution and is not dismissible.
The offline and degraded-basemap status chip sits beside the coordinate
readout.

### 1.6 Over-map overlays

| Feature                                                    | Surface                                                   | Wave |
| ---------------------------------------------------------- | --------------------------------------------------------- | ---- |
| Legend (model axis)                                        | Positioned per `LegendConfig.position`                    | A    |
| Time slider with animation                                 | Bottom center, above the bottom bar                       | D    |
| Loading, empty, error, dropped-rows status (built)         | Status overlay, bottom center                             | A    |
| Coordinate validation panel, swap, range, null island, DMS | Opens from the dropped-rows status                        | C    |
| Feature inspector (built)                                  | Right drawer, taking over the inspector column while open | A    |

---

## 2. Features whose home spans two surfaces

Each of these is a single §10 row. The primary home is where the feature is
configured; the secondary surface is where its effect is read.

| Feature                                            | Primary home                                   | Secondary surface                                                                         | Why the split                                                                                                                                                                |
| -------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sensitive-layer mode, minimum-count suppression    | Inspector, Sensitivity section                 | Layer row badge, legend's suppressed-cell entry                                           | The policy is a layer field, so it is edited with the layer. The badge exists so a reader of someone else's map sees the constraint without opening the inspector.           |
| Boundary join with P-code match diagnostics        | Inspector, Data section, the join controls     | Layer row warning that opens the match report                                             | The join is configuration. The match report is a result of running it, so it belongs where the layer's health is shown.                                                      |
| Annotations                                        | Tool cluster, "Annotate"                       | Layer row for the annotation layer                                                        | Annotations are drawn on the map, so the tool is the home. The layer row exists because annotations are a layer in the model and need visibility and z-order like any other. |
| Disputed-boundary styling and mandatory disclaimer | Inspector, Style section, boundary styling row | Bottom bar and export furniture for the disclaimer text                                   | The styling is per layer. The disclaimer is per map and legally required on output, so it cannot depend on a layer being selected.                                           |
| Offline basemap caching                            | Basemap control, per-basemap action            | Bottom bar status chip                                                                    | Caching is an action taken once. Degraded state is a condition to be read at a glance.                                                                                       |
| Print and PDF export with full map furniture       | Export button and the export layout            | Legend, scale bar, attribution, disclaimer are composed from their on-screen counterparts | The export inherits map furniture rather than redefining it, which is what makes an exported sitrep match the screen.                                                        |
| Scale bar, coordinate readout, attribution         | Bottom bar                                     | Export layout                                                                             | Same reason as above.                                                                                                                                                        |
| Coordinate validation panel                        | Opens from the dropped-rows status overlay     | Layer row partial-map state                                                               | The overlay is where row loss is noticed. The layer row is how you find which layer lost rows when several are loaded.                                                       |
| Map PBlock in a dashboard                          | GIS export menu, "Add to dashboard"            | The dashboard's own block chrome                                                          | Authoring happens in GIS. Rendering is dashboard-owned and shows map, legend, and attribution only, with no panels.                                                          |

---

## 3. Design decisions this inventory makes

1. **The inspector is sectioned by model axis, not by task.** Data, Style,
   Sensitivity, Filter, Popup, Legend map one-to-one onto `MapLayer` fields
   (spec §4). Every wave adds fields to existing sections rather than new
   panels, which is the property that lets Tier 1 through Tier 5 land without
   reshaping the UI.
2. **All geo-binding types share one selector.** `latLngColumns`,
   `geometryColumn`, `joinToBoundaries`, point-in-polygon aggregation, and
   `binned` are branches of one union, so they are branches of one control.
3. **Sensitivity is its own inspector section.** It constrains Style, so it
   cannot be a Style option.
4. **The layer stack shows state, the inspector edits it.** Badges, warnings,
   and status live on the layer row. Nothing on the row is a settings control
   except visibility and z-order.
5. **The tool cluster is for map gestures only.** If a feature does not start
   with the user pointing at the map, it is not a tool.
6. **The bottom bar is furniture, not chrome.** Scale, coordinates,
   attribution, disclaimer, and degraded status. It is never a place to put a
   control, because it is the strip that survives into the print export.
7. **Analysis tools write layers.** Buffer produces a layer in the stack rather
   than a transient overlay, so its output is styleable, savable, and
   exportable like everything else.

---

## 4. Traceability: every §10 row has exactly one primary home

Thirty-three feature rows across spec §10's five tiers, plus the annotation
layer §9 adds. Every row appears exactly once below.

### Tier 1, map types and math

| §10 feature                                         | Primary home                                                | Wave |
| --------------------------------------------------- | ----------------------------------------------------------- | ---- |
| Spatial join, point-in-polygon aggregation          | Inspector, Data, binding type "Aggregate points into areas" | B    |
| Boundary join with P-code match diagnostics         | Inspector, Data, binding type "Join to boundaries"          | B    |
| Classification methods and normalization            | Classification editor                                       | B    |
| Explicit no-data rendering                          | Classification editor, permanent no-data row                | B    |
| Proportional symbols, sqrt-scaled, with size legend | Inspector, Style, size controls                             | C    |
| Clustering                                          | Inspector, Style, cluster controls                          | C    |
| Heatmap                                             | Inspector, Style, heatmap controls                          | C    |

### Tier 2, operational analysis

| §10 feature                                           | Primary home                                         | Wave       |
| ----------------------------------------------------- | ---------------------------------------------------- | ---------- |
| Buffer and distance analysis                          | Tool cluster, "Buffer"                               | D          |
| AOI draw-to-filter, wired to P8 filters               | Tool cluster, "Area"                                 | D          |
| Time slider with animation                            | Over-map, bottom center                              | D          |
| Hex and grid binning                                  | Inspector, Data, binding type "Bin into a grid"      | C          |
| Measure distance and area, go to coordinate or P-code | Tool cluster, "Measure" and the cluster search field | D          |
| Annotations, text, arrows, freehand, areas            | Tool cluster, "Annotate"                             | D          |
| Isochrone travel-time access                          | Unplaced, see §5                                     | E, stretch |

### Tier 3, do-no-harm

| §10 feature                                        | Primary home                           | Wave                      |
| -------------------------------------------------- | -------------------------------------- | ------------------------- |
| Sensitive-layer mode, minimum-count suppression    | Inspector, Sensitivity section         | model in 1, enforced in B |
| Point jitter and centroid displacement             | Inspector, Sensitivity, jitter radius  | B                         |
| Disputed-boundary styling and mandatory disclaimer | Inspector, Style, boundary styling row | E                         |

### Tier 4, geospatial data quality

| §10 feature                                                | Primary home                                    | Wave |
| ---------------------------------------------------------- | ----------------------------------------------- | ---- |
| Coordinate validation panel, swap, range, null island, DMS | Opens from the dropped-rows status overlay      | C    |
| Geometry columns, WKT, WKB, GeoJSON                        | Inspector, Data, binding type "Geometry column" | B    |
| CRS reprojection                                           | Inspector, Data, advanced disclosure            | C    |
| Zoom-based simplification                                  | Inspector, Data, advanced disclosure            | B    |

### Tier 5, output and field reality

| §10 feature                                          | Primary home                                     | Wave                        |
| ---------------------------------------------------- | ------------------------------------------------ | --------------------------- |
| Print and PDF export with full map furniture         | Top bar, Export                                  | E                           |
| Offline basemap caching                              | Top bar, Basemap control, per-basemap action     | E                           |
| Custom XYZ, WMS, WMTS sources, satellite, no-basemap | Top bar, Basemap control                         | A                           |
| Scale bar, coordinate readout, attribution           | Bottom bar                                       | A                           |
| Per-layer popup config, click through to case record | Inspector, Popup section                         | A                           |
| Bookmarks and saved views                            | Top bar, Views menu                              | A                           |
| Multi-layer stack with reorder and visibility        | Left panel, layer stack                          | A                           |
| Persist map configuration                            | Top bar, save state and save action              | A                           |
| Map PBlock in a dashboard                            | Top bar, Export menu, "Add to dashboard"         | E                           |
| ABox and HDX layer sources                           | Inspector, Data, source picker                   | client half in 1, full in E |
| Permissions on maps                                  | Top bar, Share                                   | 1                           |
| Style picker repaired, logs, error and empty states  | Top bar, Basemap control, and the status overlay | 1                           |

### From §9

| Feature                                      | Primary home                                                     | Wave |
| -------------------------------------------- | ---------------------------------------------------------------- | ---- |
| Annotation layer as a first-class layer type | Layer stack, pinned annotation row, edited from the tool cluster | D    |

**Count check.** Tier 1: 7. Tier 2: 7. Tier 3: 3. Tier 4: 4. Tier 5: 12. Total
33, matching §10. Plus one from §9.

---

## 5. Unplaced

Reconciled against the finished design on 2026-08-14. Every §10 feature except
the one below now has a home that **exists in the prototype**, not merely a home
named in a table. The two that were still only named at the end of Task 8, the
time slider and the Map PBlock's authoring entry point, were drawn during the
reconciliation: the time slider sits above the tool cluster in the same bottom
centre stack, and "Add to dashboard" sits in the export sheet's footer.

| Feature                      | Why unplaced                                                                                                                                                                                                                             | Decision needed                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isochrone travel-time access | It needs an external routing service, and the spec marks it a Wave E stretch item. It is shaped like a tool (draw a start point) but its output is a polygon layer that must be styleable and savable, so it is shaped like a layer too. | Whether an isochrone is a tool-cluster tool that writes a layer, matching Buffer, or a geo-binding type. The Buffer precedent in §3.7 argues for a tool, but Buffer's input is an existing layer while an isochrone's input is a point the user places, which no other tool does. Resolve before Wave D fixes the tool cluster's shape. |

Open questions that are not placement questions live in
`docs/superpowers/specs/2026-08-12-gis-shell-design.md` §11.

---

## 6. Current state

Captured from a local build of `feat/gis` after Phase 1's refactor landed, in
`docs/design/gis/current-state/`. The screenshots were produced by driving the
real app: sign in, import `small-california-covid-sample.csv`, open
`/{workspaceSlug}/map`, bind `Lat` and `Long_`, and click a plotted point.

Every claim below is anchored to the screenshot that shows it.

### 6.1 There is one control surface, and it is a 200px popover

`02-query-popover.png`. Data source, latitude column, longitude column, symbol
size, and symbol color are the entire product, and all five sit inside one
popover hanging off an icon button. Nothing about the layer is visible at rest
(`01-initial.png`): the map at rest shows two unlabelled circular icon buttons
and nothing else.

The popover has no room to grow. The inventory above places 33 features, and 27
of them would have to go inside this popover or nowhere.

The popover's trigger is also mislabelled. Its tooltip reads "Filter" and its
icon is a funnel, but its accessible name is "Query form" and it contains no
filter control at all (`02-query-popover.png`).

### 6.2 There is no layer concept in the UI

`01-initial.png`, `03-points-rendered.png`. The model already has
`AvaMap.layers` as an ordered array, and `GisApp` renders exactly one layer from
it. On screen there is no list, no z-order, no visibility toggle, and no name.
Multi-layer (P7.4, Wave A) has nowhere to land without inventing the left panel
this design proposes.

### 6.3 There is no map identity and no map furniture of our own

`01-initial.png`, `03-points-rendered.png`. No title, no save state, no share,
no legend, no bookmarks, no export. The scale bar, the zoom and compass buttons,
and the attribution are MapLibre's own controls in MapLibre's styling, sitting
directly on the map corners rather than in a product-owned bottom bar. An
exported sitrep composed from this has no furniture to inherit.

### 6.4 The map opens nowhere in particular

`01-initial.png`. The default camera sits over New York and New Jersey, which is
neither the workspace's data nor a neutral world view. A user who opens the map
before configuring anything sees a city they have no relationship to.

### 6.5 The basemap fights the data

`03-points-rendered.png`. The default style paints water in saturated blue and
landcover in saturated green, and the default symbol color is `#3b82f6`, a blue
in the same family as the water. Points over water are close to invisible, and
the basemap carries more visual weight than the data, which inverts the
hierarchy a thematic map needs.

### 6.6 Row loss is reported but leads nowhere

`03-points-rendered.png`. Phase 1's status overlay correctly says "Some rows
could not be mapped. 3 of 100 rows were skipped because their coordinates were
missing or out of range." That is a real improvement over the prototype's silent
filtering, and the drop reasons already exist in the model. But the sentence is
the end of the road: there is no way to see which rows, which reason, or which
column is at fault. The Tier 4 coordinate validation panel has an obvious
entry point here and no destination.

The overlay also sits bottom center, on top of the attribution.

### 6.7 The feature drawer is empty, not overfull

`04-feature-drawer.png`. Clicking a plotted point opens a right drawer titled
"Feature" whose body is completely blank.

This is structural, not a rendering bug. `MapLayerUpdates` only ever adds a
column to `MapLayer.source.queryColumns` when the user binds that column to an
axis, so the layer's query selects `Lat` and `Long_` and nothing else.
`makeFeatureCollectionFromRows` then omits exactly the two bound coordinate
columns when building `properties`, which leaves an empty object. A user cannot
learn anything about a point by clicking it.

That makes `PopupConfig` (`columnIds | "all"`, already in the model) a Wave A
requirement rather than a refinement: without a popup field selector there is no
way for the query to know which columns to fetch.

### 6.8 Chrome is hand-styled and will not survive dark mode

`04-feature-drawer.png`, `02-query-popover.png`. The feature drawer sets
`rgba(255, 255, 255, 0.8)`, a blur, and a hand-written border and shadow as
inline styles rather than using Mantine surfaces and tokens. The floating icon
buttons are similarly bespoke. None of it responds to the theme, and the design
spec's light and dark requirement cannot be met by restyling these in place.

### 6.9 The nav entry is gated by a feature flag, the route by a permission

`01-initial.png` shows no Maps entry in the workspace nav rail even though the
signed-in user can open `/map` directly. The route is guarded on
`gis__can_view_map` (`src/routes/_auth/$workspaceSlug/map.tsx`), but the nav
link is guarded on the `disable-geo-explorer` feature flag
(`src/config/NavbarLinks.tsx`), which is on in `.env.development`. Every other
app gates its nav link on the matching permission. This is worth resolving
before Wave A, because a shareable map resource that has no nav entry is not
findable.
