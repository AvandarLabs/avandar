# GIS shell (AvaMap) - design

**Status:** Complete. Sections 1 to 11. Direction C approved 2026-08-13; sections 4 to 8 approved through 2026-08-14.
**Author:** pablo@avandarlabs.com (designed with Claude, via `impeccable`)
**Date:** 2026-08-12
**Related:** `docs/superpowers/specs/2026-08-12-gis-avamap-design.md` (§9, §10),
`docs/design/gis/feature-home-inventory.md`,
`docs/design/gis/current-state/*.png`, `src/views/GISApp/`,
`src/config/Theme/Theme.ts`

---

## 1. Problem and brief

### 1.1 Who this is for

A humanitarian information management officer building a map for a situation
report. They work on a laptop, sometimes on a tablet in the field, frequently on
bad connectivity, and the output is often printed and photocopied. The map is
evidence in a coordination meeting, so it must be calm and precise, never busy,
and it must be reproducible: the same map exported twice has to say the same
thing.

Their state of mind is focused and time-pressured. They are not exploring; they
are assembling a specific artifact against a deadline, usually from data they
did not collect and do not fully trust.

### 1.2 What exists today

Phase 1 rebuilt the data layer on the `AvaMap` model and left the prototype's
chrome in place, which is what §9 of the GIS spec anticipated. The screenshots
in `docs/design/gis/current-state/` record what that chrome is, and
`docs/design/gis/feature-home-inventory.md` §6 lists the findings in full. The
five that set this design's constraints:

1. **The only control surface is a 200px popover behind an icon button**
   (`02-query-popover.png`). Data source, latitude, longitude, symbol size, and
   symbol color are the whole product, and all of them are hidden at rest. The
   feature inventory places 33 features. Twenty-seven of them would have to go
   inside that popover.
2. **There is no layer concept on screen at all** (`01-initial.png`). The model
   has an ordered `AvaMap.layers`; the UI renders one of them and shows no list,
   no order, no visibility, no name.
3. **There is no product-owned map furniture** (`03-points-rendered.png`). The
   scale bar, zoom buttons, and attribution are MapLibre's own controls in
   MapLibre's styling. There is no title, no legend, no save, no share, no
   export. An exported sitrep has nothing to inherit.
4. **Clicking a feature shows an empty drawer** (`04-feature-drawer.png`).
   The layer's query selects only the bound coordinate columns and the feature
   builder omits exactly those, so `properties` is empty by construction. This
   makes `PopupConfig` a Wave A requirement, not a refinement.
5. **Chrome is hand-styled translucent panels with inline styles**
   (`04-feature-drawer.png`). It does not respond to the Mantine theme and
   cannot meet the light and dark requirement by restyling in place.

### 1.3 The brief

Felt is the reference for structure: a quiet full-bleed map, a layer stack of
per-layer cards, a contextual inspector, a floating tool cluster, legible
legends, and a thin strip of map furniture. We are adopting its information
architecture and its restraint, not its visual identity. Avandar's own Mantine
theme supplies every token.

The design must satisfy three tests:

- **The map is the product.** Chrome is dismissible or collapsible so the map
  can fill the viewport, because that is the only way the user can judge the
  composition they are about to print.
- **Every Tier 1 to Tier 5 feature has a home before any of them is built.**
  The inventory is the gate, not the wireframe.
- **Do-no-harm is visible.** A sensitive layer explains on screen why point
  rendering is unavailable. A suppressed cell reads as neither zero nor
  no-data. Attribution and the disclaimer cannot be switched off.

### 1.4 What this design is not

- Not a new component library. Mantine primitives and the tokens in
  `src/config/Theme/` are the vocabulary. Anything with no Mantine primitive is
  flagged as custom with a cost.
- Not a phone layout. Section 8 states why.
- Not new features. The inventory covers exactly spec §10 plus the annotation
  layer §9 adds.

### 1.5 A note on the Felt reference

The plan asks for a review of Felt's own product pages. Felt's marketing site
and blog describe capabilities rather than interface structure, and the help
center is not machine-readable, so this design cites Felt only for the
information architecture the GIS spec §9 already names: full-bleed map, left
layer panel of per-layer cards, right inspector, floating tool cluster, elegant
legend, bottom bar with scale, coordinates, and attribution. No visual detail is
claimed from it.

---

## 2. Direction options

All three directions assume the same fixed context, which the current-state
screenshots establish:

- The workspace nav rail occupies the left edge at roughly 200px and is
  collapsible from the app shell's own toggle. The GIS app owns only the
  content area to its right.
- At a 1280px viewport that content area is roughly 1080px wide. At 1440px it
  is roughly 1240px. These are the widths the panel budget has to survive.
- The layer inspector has to hold, eventually, six sections: Data, Style,
  Sensitivity, Filter, Popup, Legend.
- The classification editor (histogram, method, class count, draggable break
  handles, ramp picker, normalize-by, permanent no-data row) is the densest
  surface in the product and does not fit in a 320px column.

Each direction is stated with the four answers the plan requires: where a
12-layer stack goes, where the classification editor opens, what happens at
tablet width, and what the print export inherits.

### 2.1 Direction A: persistent dual panels

The workbench reading. Left layer stack and right inspector are always present
and always take their width from the map.

```
+-------+-------------------------------------------------------------+
| nav   | [ Untitled map        ] Basemap  Views  Share  Export        |  top bar
| rail  +--------------+---------------------------+------------------+
|       | LAYERS    + |                           | INSPECTOR        |
| Home  | ---------- |                           | ---------------- |
| Data  | (o) Cases  |                           | Data             |
| Expl  | (o) Admin2 |          M A P            |  Source  [     ] |
| Dash  | (o) Routes |         480px at          |  Binding [     ] |
| Maps  | (o) Notes  |         1280 wide         | Style            |
|       |            |                           |  Type    [ooo]   |
|       |            |                           | Sensitivity      |
|       |            |                           | Filter           |
|       |            |                           | Popup            |
|       |            |                           | Legend           |
|       +--------------+---------------------------+------------------+
|       | 34.05, -118.24        [====] 100 km   (c) OpenStreetMap     |  bottom bar
+-------+-------------------------------------------------------------+
  200px      280px                                      320px
```

**Twelve-layer stack.** The left panel scrolls internally. At 40px rows, twelve
rows is 480px, which fits without scrolling on a 900px-tall viewport with the
Add layer control pinned to the panel header.

**Classification editor.** Opens as a 420px popover anchored to the Style
section's ramp row and spilling left, over the map. Widening the inspector
instead would reflow the map and move every feature the user is looking at.

**Tablet, 768 to 1024.** Both panels become overlay sheets, left from the left
edge and right from the right edge, one open at a time. The map keeps full width
beneath them.

**Print export inherits.** The legend overlay, the scale bar, the attribution,
and the disclaimer, composed into the export frame. The problem is that on
screen the map is a 480px-wide letterbox at 1280, so the user composes the map
in an aspect ratio that has no relationship to the A4 landscape frame they are
about to print. They will discover the framing is wrong in the export preview,
which is the wrong place to discover it.

**Accepted if chosen.** Maximum simultaneous information, minimum map.

### 2.2 Direction B: single contextual panel

The drill-in reading. One left panel swaps between the layer stack and the
selected layer's inspector.

```
+-------+-------------------------------------------------------------+
| nav   | [ Untitled map        ] Basemap  Views  Share  Export        |
| rail  +--------------+----------------------------------------------+
|       | < Cases      |                                              |
|       | ------------ |                                              |
|       | Data         |                                              |
|       |  Source [  ] |             M A P                            |
|       |  Binding[  ] |          760px at 1280 wide                  |
|       | Style        |                                              |
|       |  Type  [ooo] |                                              |
|       | Sensitivity  |                                              |
|       | Filter       |                                              |
|       | Popup        |                                              |
|       | Legend       |                                              |
|       +--------------+----------------------------------------------+
|       | 34.05, -118.24            [====] 100 km   (c) OpenStreetMap |
+-------+-------------------------------------------------------------+
  200px      320px
```

**Twelve-layer stack.** Identical list, in the stack view of the same panel. The
cost is that the stack is not visible while a layer is being edited, and styling
one layer against another (lighten the boundary fill so the points read) is a
frequent act that now requires a round trip per adjustment.

**Classification editor.** The panel is the only surface, so the editor is
either a third drill-in level, two steps from the stack, or a popover over the
map. It has to be the popover: three levels of drill-in in a 320px column is
where users lose their place.

**Tablet.** The simplest of the three. One panel becomes one left sheet.

**Print export inherits.** The same furniture. The map is roughly 70% of the
content area, so the on-screen composition is closer to truthful than in A.

**Accepted if chosen.** Maximum map for a single-panel cost, paid on every layer
switch, which is the most frequent navigation in a multi-layer map.

### 2.3 Direction C: overlay panels on a full-bleed canvas

The canvas reading. The map fills the entire content area and every panel floats
above it as an opaque surface with a gutter.

```
+-------+-------------------------------------------------------------+
| nav   |  [ Untitled map ]           Basemap  Views  Share  Export    |
| rail  |  ,------------.                            ,--------------. |
|       |  | LAYERS   + |                            | Cases        | |
|       |  | ---------- |                            | ------------ | |
|       |  | (o) Cases  |        M A P               | Data         | |
|       |  | (o) Admin2 |     full content area      | Style        | |
|       |  | (o) Routes |                            | Sensitivity  | |
|       |  | (o) Notes  |                            | Filter       | |
|       |  `------------'                            | Popup        | |
|       |                       ,-----------.        | Legend       | |
|       |  ,----------.         | o / # ~ T |        `--------------' |
|       |  | Cases    |         `-----------'                         |
|       |  | [] 0-10  |          tool cluster                         |
|       |  | [] 10-50 |                                               |
|       |  `----------'  legend                                       |
|       |  34.05, -118.24           [====] 100 km   (c) OpenStreetMap |
+-------+-------------------------------------------------------------+
```

**Twelve-layer stack.** The floating stack has a max height of 60vh and scrolls
internally. Collapsed, it becomes a single header pill reading "Layers, 4".

**Classification editor.** Opens as its own floating panel beside the inspector,
free to overlap the map, because the map is already the substrate every panel
sits on. No panel has to move to make room.

**Tablet.** Panels collapse to pills by default. Tapping a pill expands one
panel at a time. The tool cluster stays, at touch-target size.

**Print export inherits.** The closest match of the three, because the on-screen
map frame is the full content area and therefore has roughly the export frame's
proportions. What the user composes is what they print.

**Accepted if chosen.** A panel can cover data, and the user has to pan to see
beneath it.

---

## 3. Recommendation

**Direction C, with A's discipline about what is visible at rest.**

The concrete shape:

1. **The map is the substrate.** It always fills the content area. Nothing
   letterboxes it.
2. **Panels are opaque Mantine `Paper` surfaces**, never translucent, never
   blurred: `--ava-surface-overlay` for the fill, `--ava-border-default` for the
   hairline, `--mantine-shadow-md` for the lift, `--mantine-radius-md` (8px) for
   the corner. This is the explicit correction of today's
   `rgba(255, 255, 255, 0.8)` plus backdrop blur, which is both unreadable over
   a saturated basemap and invisible to the theme.
3. **Both the layer stack and the inspector are expanded by default at `lg` and
   above** (Mantine `lg` is 75em, 1200px). That is A's "everything visible"
   property without A's letterboxing, because the panels float rather than take
   width from the map.
4. **Every panel collapses to a header pill**, individually, by click or by
   keyboard. Below `lg` the inspector collapses first. Below `md` (62em, 992px)
   both start collapsed.
5. **`fitBounds` uses panel-aware padding.** The camera fits data to the region
   not covered by expanded panels, so "zoom to layer" never puts the data under
   the inspector. `MapCanvas` already owns `fitBounds`
   (`src/views/GISApp/MapCanvas/useFitMapBounds.ts`), so this is a padding
   argument, not new machinery.
6. **One shortcut hides all chrome** and reveals the bare map, for judging a
   composition before export.

### 3.1 Why not A

A's cost is not aesthetic, it is arithmetic. At the 1280px viewport this product
is actually used on, the nav rail plus a 280px stack plus a 320px inspector
leaves the map 480px wide. A humanitarian map at 480px is a thumbnail. The
direction that letterboxes the map hardest is the wrong direction for a product
whose thesis is that the map is the product, and it is the direction that lies
most about what the export will look like.

### 3.2 Why not B

B is the honest runner-up and it wins on tablet. It loses on the most frequent
action in the product. A multi-layer sitrep map is built by adjusting layers
against each other, and B makes the stack invisible exactly while a layer is
being adjusted. Every comparison becomes a round trip. C gets B's map area
anyway, because floating panels do not take width, so B's advantage evaporates
while its cost remains.

### 3.3 The trade-off this accepts

**A panel can cover data.** That is real and it is the price. Three things pay
it down, and all three are cheap:

- Collapse to pill, per panel, so the cover is always one click from gone.
- Panel-aware `fitBounds` padding, so automatic camera moves never hide data
  under chrome.
- A hide-all-chrome shortcut for composition and for the moment before export.

What it buys is the only layout in which the map on screen and the map on paper
are the same shape, which is what makes an exported sitrep predictable. For a
tool whose deliverable is frequently a printed page, that is the trade worth
making.

### 3.4 What this commits us to

- **Opaque panels are non-negotiable.** The moment a panel is translucent over a
  basemap, contrast becomes a function of what the map is showing, and no
  contrast minimum can be met. Section 9 records this as an accessibility
  requirement, not a style preference.
- **Basemaps must be quiet.** Direction C puts the data and the chrome on the
  same substrate, so a basemap that paints saturated blue water and saturated
  green landcover (today's default, `03-points-rendered.png`) competes with
  both. Section 6 specifies the basemap pairing.
- **Panel state is map state.** Which panels are expanded is a per-user
  preference, not part of the saved `AvaMap` config, because a shared map should
  open in the recipient's own working layout.

---

## 4. Flows

Three flows carry almost all of the product's difficulty: getting the first
layer onto the map, changing how a layer is drawn, and classifying a value into
colors. Each is reachable in the prototype through the state control in the
scaffolding bar, or by URL (`#state=add-source`).

### 4.1 Adding a layer

**The shape of it.** Pressing Add layer opens a source picker. Choosing a source
is what creates the layer. Everything after that is edited inline in the
inspector, which is already the layer editor. There is no wizard and no modal.

The reason the source is asked for up front, and nothing else is, is that the
source is the only field with no sensible default. Every other field has one.
Asking for exactly one thing is not a wizard.

**Step 1, pick a source.** A popover anchored to the Add layer button, with a
search field and the sources grouped the way `QueryDataSourceSelect` already
groups them: CSVs, Excel files, Google Sheets, Derived Dataset, Open Data, and
Profiles. Each option shows its row count. Dismissing the popover creates
nothing.

Datasets, derived datasets, and profiles are one list with one behavior. Nothing
downstream branches on which kind was chosen, because `runStructuredQuery` does
not branch either. Phase 1 removed the Dataset-only gate and the UI must not
reintroduce it by giving profile sources a separate path.

> **Implementation note.** The picker must be a `Popover` with `withinPortal`.
> The layers panel sets `overflow: hidden` so its list can scroll, and a popover
> rendered inside it is clipped. The prototype hit exactly this and renders the
> picker in flow beneath the panel as an approximation.

**Step 2, geometry binding.** Choosing a source creates the layer, puts its row
at the top of the stack, selects it, and opens the inspector at Data. The
binding type selector defaults to "Latitude and longitude columns" and the app
tries to infer the two columns:

- Latitude matches a column named `lat`, `latitude`, `y`, `lat_dd`, or
  `latitude_dd`. Longitude matches `lon`, `lng`, `long`, `longitude`, `x`,
  `lon_dd`, or `longitude_dd`.
- Matching is case-insensitive and on the whole normalized name, never a
  substring, so `lat_updated_at` cannot win.
- Both columns must be numeric, and **both** must match. One alone is not
  enough. This mirrors why `GeoBinding` makes each axis independently optional:
  half a binding plots every point on the line where latitude equals longitude,
  which looks like a real result and is not.

**Inference is never silent.** When it succeeds the layer renders immediately
and the Data section says so:

> Latitude and longitude were matched from the column names **lat** and **lon**.
> Change them above if that is wrong.

A silent correct guess and a silent wrong guess are indistinguishable to the
user, and the wrong one becomes a wrong map. The sentence is what makes the
guess checkable.

When inference fails, both column selects are empty with the latitude select
focused, and the section explains the stake rather than just prompting:

> Pick both a latitude and a longitude column. One on its own plots every point
> on a diagonal line, which looks like a result and is not.

**Step 3, the source has no coordinates at all.** When no numeric column in the
source could be a coordinate, the section says so and offers the alternatives.
It is never a bare disabled dropdown:

> No column in Cases by health zone, week 32 holds coordinates. Join it to
> boundaries by P-code or place name instead, or pick a different source.
>
> [Join to boundaries] [Pick a different source]

In Wave A, where `joinToBoundaries` does not exist yet, the second sentence
becomes "Boundary joins arrive in a later release." and only "Pick a different
source" is offered.

**Step 4, between picking and rendering.** Loading is shown on the layer row,
not as a spinner over the map, so the layers already on the map stay usable. The
map's status overlay names the loading layer only when it is the only layer.

On first successful render the camera flies to the layer's bounds once, with
panel-aware padding. **Subsequent edits never move the camera.** An automatic
camera move on every symbology tweak is disorienting, and the user has usually
framed the map deliberately by then.

**One inherited ceiling.** Profile (`EntityConfig`) sources can be bound and
rendered, but per spec risk 5 their querying stays limited until P2.2. The
Filter section's aggregate controls are unavailable on a profile source, with
the reason stated. GIS inherits that ceiling; it does not lower it.

### 4.2 Switching symbology

The Style section's segmented control writes `LayerSymbology.type`.

**What carries over.** The rule is that shared visual properties carry, and
anything naming a column or a scale does not.

| Property | Carries | Why |
| --- | --- | --- |
| `color` when it is `{ type: "single" }` | Always | The user picked that color for this layer, not for that symbology |
| `color` when categorical or graduated | Between types that support per-feature color (`circle`, `proportionalSymbol`, `fill`, `line`) | Cluster and heatmap have no per-feature color to carry it to |
| `stroke` | Wherever the target has one | |
| `radius` and `maxRadius` | Yes, mapped across: `circle.radius` becomes `proportionalSymbol.maxRadius` | Preserves the visual scale the user tuned |
| `proportionalSymbol.value`, `heatmap.weight`, `cluster.aggregate` | Restored within the session, not carried across types | They name a column that may not apply to the new type |
| Popup, filter, legend, sensitivity | Always | They are separate `MapLayer` fields, not symbology |

**Switching is not destructive within a session.** The inspector keeps the
last-used settings per symbology type in component state, so Point to Cluster
and back returns the exact circle the user had. Only the active type is written
to `MapLayer.symbology`, so the persisted config stays a clean discriminated
union. The naive alternative, building a fresh default on every switch, makes
exploration expensive, and users who pay for exploration stop exploring.

**Three reasons a type can be unavailable, and they must read differently.**

| Reason | Copy | Recoverable |
| --- | --- | --- |
| Not built yet | "Heat is unavailable: it arrives in a later release." | No |
| Needs the spatial extension, which did not load | "Binning needs the map's spatial tools, which could not be loaded. Check your connection and reload to try again." with a Reload action | Yes, by the user |
| Forbidden by the layer's sensitivity policy | "Point and Sized are unavailable while this layer is set to Aggregate only, because they would place an individual on the map." with a Change Sensitivity action | Yes, but deliberately |

Collapsing these into one "unavailable" treatment teaches users to ignore all
three. The third is the one that matters most: its affordance points at the
policy rather than offering to unlock the control, because relaxing a
sensitivity policy is a decision with consequences and not a UI obstacle.

**The reason is a hint under the control, never a hover tooltip.** A disabled
control's explanation has to be reachable without a pointer and has to survive a
screenshot. For the same reason, unavailable controls use `aria-disabled` rather
than the `disabled` attribute, so they stay focusable and a keyboard user can
reach the explanation.

> **Implementation note.** `hasSpatial()` does not exist yet. Phase 1 item 8
> called for it; today `DuckDbClient` loads `spatial` best-effort and swallows
> the failure (`DuckDbClient.ts:377`). The probe this flow needs cannot be a
> boolean, because a boolean cannot separate "still loading" from "failed". It
> must return `"loading" | "available" | "unavailable"`. While `"loading"`,
> spatial-dependent types are disabled with "Checking available map tools",
> not with the failure copy.

### 4.3 The classification editor

The densest surface in the product. It opens from the Style section's Edit
classes button as its own floating panel beside the inspector, 396px wide.

**Opening it collapses the layer stack.** Three expanded panels leave no map,
and while classifying, the map is the preview. This is the one place the design
collapses a panel on the user's behalf, and it is worth it because the
alternative is classifying against a sliver of map.

**Order of controls, top to bottom, and why:**

1. **Value**, then **Normalize**. These come above the histogram because
   normalizing changes the distribution the histogram is showing. Putting the
   method above the histogram would imply the method changes the data, which it
   does not.
2. **The histogram**, of the normalized values, with the panel stating which:
   "Classifying cases per 100,000 people." Classifying raw counts and then
   labelling the legend per-capita is precisely the error `normalizeBy` exists
   to prevent, and the sentence is what keeps the two honest.
3. **Method**, **Classes**, **Colors**.
4. **Breaks**, as a list with counts.

**Break handles.** Draggable, and keyboard operable: arrow keys move a handle by
one histogram bin, Shift and arrow by ten. Each has an accessible name of the
form "Break 2 of 3, currently 79".

Dragging a handle switches Method to Manual automatically and says so once,
inline: "Method changed to Manual." Leaving "Quantile" selected while the breaks
are no longer quantiles is a lie the interface must not tell. Each break's upper
bound is also a number input, because dragging cannot land on 100 exactly and
sitrep maps use round numbers.

**Counts per class are always shown.** A quantile classification with an empty
class is a broken map, and the count is the only way to see that before it is
printed.

**The no-data row is permanent.** It sits below the breaks with a rule above it,
so it reads as outside the scale rather than as the bottom class. Its color and
its label are editable; the row itself cannot be removed. `NoDataStyle` is
non-optional in the model (spec §4.2), and the editor makes that visible rather
than merely enforcing it in types.

**Degenerate inputs.** Each has a designed answer, and each corresponds to a
case in the spec's unit tests (§12).

| Input | What the editor shows |
| --- | --- |
| All values equal | One bar. Method and Classes are disabled. "Every area has the same value, 42. A graduated ramp cannot separate them. Use a single color instead." with a Use single color action. |
| One row | The same, with "Only one area has a value." |
| All values null | Empty histogram, no break rows at all rather than empty ones. "No area has a value for this column. Every area will render as Not reported." The no-data row stays. |
| Fewer distinct values than classes | Classes clamps and says why: "Reduced to 3 classes: the data has only 3 distinct values." |
| Jenks over a large domain | Runs on a sample and labels itself: "Natural breaks computed from a 5,000 value sample." |
| Normalize denominator zero or null | Those rows are no-data, never infinity. "6 areas have no population and are shown as Not reported." |

**Applying.** Changes apply to the map live as they are made. The map is the
preview, and a separate preview is a second thing to keep in sync. There is no
OK button; closing keeps the changes, and undo is the map's undo.

**Why the footnote matters.** The panel ends with:

> Breaks are saved with the map, so the legend stays the same when the data
> changes.

That sentence is the entire reason `LegendConfig.breaks` is frozen at save time
(spec §4.4), and this panel is the only place a user will ever encounter it.

---

## 5. States

Every state below is reachable in the prototype from the state control, or by
URL (`#state=error`). Copy in this section is final and becomes a Lingui
literal.

### 5.1 Where status lives

Two rules, applied everywhere:

1. **The layer row always carries its own state.** Loading, error, zero rows,
   and partial mapping each show on the row as a badge or an inline indicator.
   With four layers loaded, a single shared status area cannot say which layer
   is in trouble, and the row is the only place that scales.
2. **The status card is for the selected layer, and only when there is
   something to do.** It sits directly above the tool cluster, bottom center. It
   is never the only place a problem appears, so dismissing it never hides a
   problem.

This replaces the current behaviour, where a single overlay bottom center is the
only signal and it sits on top of the attribution
(`docs/design/gis/current-state/03-points-rendered.png`).

### 5.2 The ordinary states

**First run, no layers.** The map shows the basemap only, with a centered card:

> **This map has no layers yet**
> Add a layer to plot a dataset, a derived dataset, or a profile. You can add as
> many as you need and reorder them.
> [Add a layer]

The layers panel stays, showing "No layers yet." It is not replaced by the card,
because the panel is where the Add layer control lives in every other state and
moving it would teach the wrong location.

**Loading.** The layer row shows a spinner and "Loading". The status card says
"Loading Cholera cases, week 32" with "Running the layer's query." Layers that
have already rendered stay on the map and stay interactive. A full-map spinner
is never used, because it would hide work the user can still do.

**Query error.**

> **Could not load Cholera cases, week 32**
> The layer's query failed. This usually means the dataset has changed or is no
> longer available in this workspace.
> [Retry] [Show details]

Two decisions here. **Retry is required**: today's `MapErrorStatus` has no
recovery path at all, so a transient failure is indistinguishable from a
permanent one. And **Show details is available in every build**, not only in
development as `MapErrorStatus.tsx:13` currently gates it. A humanitarian IM
officer reporting a problem needs something to paste, and the raw engine message
behind a disclosure costs nothing.

**Zero rows.**

> **Cholera cases, week 32 returned no rows**
> One filter is active on this layer. It may be excluding everything.
> [Review filter]

The filter count is the whole point. "No rows" with no explanation is where
users conclude the product is broken; "one filter is active" is where they
conclude they filtered too hard. When no filter is active the second line reads
"The source has no rows." and there is no action.

**Partial mapping.**

> **3 of 100 rows could not be mapped**
> Two rows look like their latitude and longitude are swapped.
> [See why]

The second line names the largest single reason, so the most common case is
solved without opening anything.

### 5.3 The coordinate validation report

Opens from "See why", in the same slot as the classification editor, and
collapses the layer stack for the same reason.

It lists **only the reasons that actually occurred**, using exactly the five
`DropReason` values the code produces today
(`makeFeatureCollectionFromRows.ts:15`). Enum names never reach the screen:

| `DropReason` | Shown as |
| --- | --- |
| `suspectedLatLngSwap` | Latitude and longitude look swapped |
| `nullIsland` | Coordinate is 0, 0 |
| `outOfRange` | Coordinate is outside the valid range |
| `nullCoordinate` | Latitude or longitude is empty |
| `nonNumericCoordinate` | Latitude or longitude is not a number |

Each reason shows its count, the sample row numbers the code already returns in
`sampleRowIndexes`, and a sentence of explanation. For the two that a user can
act on:

- **Swapped.** "Rows 14 and 62. Latitude is outside the valid range but would be
  a valid longitude, and the reverse." with a **[Swap latitude and longitude]**
  action that rebinds the layer's two axes. This action is safe to offer because
  the detection is already conservative: `_classifyCoordinate` only reports a
  swap when swapping would actually produce a valid pair, so the button never
  sends the user chasing a fix that does not exist.
- **Null island.** "Row 71. This point falls in the Gulf of Guinea and is almost
  always a missing value written as a zero."

The panel closes with a line that answers the question the report always raises:

> Unmapped rows are still counted in this layer's totals. They are excluded from
> the map only.

Without it, a user cannot tell whether their 100-row dataset has become a 97-row
dataset.

### 5.4 Sensitive layers

The highest-stakes surface in the product, and the one no general BI tool
offers.

**How a layer is marked sensitive, and by whom.** Sensitivity is
`MapLayer.sensitivity`, a per-layer field, set in the inspector's Sensitivity
section by anyone who can edit the map (`gis__can_edit_map`). The control offers
the three modes the model defines: Show exact locations, Displace, and Aggregate
only. Choosing Aggregate only reveals the minimum-count threshold.

Relaxing a policy is a deliberate act with consequences, so moving from
Aggregate only back to Show exact locations asks for confirmation and names what
changes: "Individual locations will be drawn on the map, and suppressed areas
will show their real counts." Tightening a policy never asks.

> **Open question, flagged rather than drawn.** Whether a dataset should carry a
> default sensitivity that pre-sets new layers built from it. It would prevent
> the obvious mistake, but there is no dataset-level sensitivity field in the
> model today and adding one is a new feature, not a design decision. Raised
> here per the plan's no-feature-invention rule; it belongs in the Wave B
> discussion.

**The badge.** The layer row shows an "Aggregate only" badge with a shield icon.
Its tooltip: "Individual locations are never drawn for this layer. Areas with
fewer than 5 records are shown as suppressed." The badge is a readout only; it
opens nothing. Its job is to let someone reading another person's map see the
constraint without opening the inspector.

**Locked symbology.** Covered by §4.2. Point and Sized are visibly present and
unavailable, with the reason stated inline and a route to the policy, never
silently absent. A missing option teaches nothing; an unavailable option with a
reason teaches the rule.

**Suppressed cells must read as neither zero nor no-data.** Three distinct
treatments, and the legend carries all three whenever any of them is drawn:

| Meaning | Fill | Legend entry |
| --- | --- | --- |
| A real zero | The lowest step of the layer's ramp | "0 services" |
| Count suppressed, below the minimum | `#989898` under a 45 degree hatch | "Fewer than 5, suppressed" |
| Nothing was reported | `#d1d1d1` under a fine stipple | "Not reported" |

A fourth neutral, `#696969` flat, carries the "Other" bucket that categorical
layers fold their tail into (§6.4). It is a true neutral like the two absence
values but at a lightness neither occupies, and it carries no texture, which is
what separates it from both: texture means "no value shown", and Other is a
value.

Hatch, not a fourth flat color, because these maps are printed and photocopied.
A hatch survives greyscale reproduction; a fourth grey does not. This is
cartographic convention rather than decoration, which is why it earns a
repeating gradient.

**Exporting a map that contains a sensitive layer.** The export sheet states
what the reader will get, and does not gate:

> This map includes **GBV service points**, a layer set to Aggregate only. The
> export applies the same suppression as the screen: areas with fewer than 5
> records are shown as suppressed, never as zero.

Deliberately **not** a confirmation checkbox. Suppression is already enforced in
the query and in `buildLayerSpec`, so a checkbox would imply the user could turn
it off from the export dialog. A statement informs; a checkbox would misinform.

### 5.5 Disputed boundaries and the disclaimer

**The disclaimer is always present and never removable.** It sits in the bottom
furniture strip beside the attribution, and in the export it appears in the
footer. In the export sheet both "Source attribution" and "Boundary disclaimer"
are checked and disabled, labelled "Always included", so their status is visible
rather than merely enforced.

The default text is "The boundaries and names shown do not imply official
endorsement or acceptance." It is editable, because organisations have their own
required wording, but it cannot be blank: clearing the field restores the
default.

**Choosing a boundary source.** In the Data section's boundary picker. A source
that carries a disputed-status column is rendered accordingly; one that does not
is rendered as settled lines, and the picker says which, because a user cannot
otherwise tell whether the absence of dashed lines means agreement or missing
metadata.

**Rendering.** A disputed or undetermined line is drawn as a dashed casing in a
neutral grey, never in the layer's own outline color and never solid, so it
cannot be read as a settled administrative boundary. Whenever any such line is
drawn, the legend gains a "Disputed or undetermined boundary" entry that cannot
be switched off, on screen and in the export both.

---

## 6. Color and legends

Every value in this section was generated in OKLCH and checked with the
`dataviz` skill's validator. None was picked by eye. The swatch board at the
foot of the prototype renders all of it in light, dark, and simulated
greyscale.

### 6.1 What a map changes about the method

The `dataviz` method assumes a chart surface. A map differs in four ways that
change the answers, so they are stated before the values:

1. **The surface is a basemap, not a panel.** Contrast is measured against the
   basemap (`#eaeef2` light, `#1b3149` dark in the prototype), and every
   polygon carries a hairline stroke, which is a structural separator a chart
   does not have.
2. **Blue and green are already spent.** Blue is the app accent, the selection
   color, and the basemap's water. Green is the basemap's landcover. The method
   names blue as the default sequential hue; on a map that default is unusable,
   so the first sequential hue is ochre and the alternates are magenta and
   violet.
3. **Choropleths take the all-pairs test, not the adjacent one.** Any two areas
   can share a border, so the categorical check runs with `--pairs all`. This
   binds much harder than it does for a bar chart, and §6.3 gives the number.
4. **The output gets photocopied.** Greyscale survival is a requirement, not a
   nicety, and §6.6 records what greyscale breaks.

### 6.2 Sequential ramps, for graduated color

Ochre is the default. Magenta and violet are the alternates. Teal is offered
with a caveat: it sits close to vegetated basemaps and should be avoided over
one.

**Ochre** (default)

| Classes | Steps |
| --- | --- |
| 5 | `#ffd4af` `#daa475` `#b97c44` `#9b5802` `#7e3500` |
| 6 | `#ffd4af` `#e1ac7f` `#c68c57` `#ad6e2f` `#955100` `#7e3500` |
| 7 | `#ffd4af` `#e5b286` `#cf9664` `#b97c44` `#a56420` `#914c00` `#7e3500` |

**Magenta**

| Classes | Steps |
| --- | --- |
| 5 | `#ffcee0` `#dc98b1` `#bd6b8c` `#9f406a` `#810d4c` |
| 6 | `#ffcee0` `#e2a1ba` `#c97c9a` `#b15a7e` `#993764` `#810d4c` |
| 7 | `#ffcee0` `#e7a8bf` `#d188a4` `#bd6b8c` `#a94e75` `#953160` `#810d4c` |

**Violet**

| Classes | Steps |
| --- | --- |
| 5 | `#e3d6fe` `#b6a3dc` `#9379c0` `#7352a5` `#562c8b` |
| 6 | `#e3d6fe` `#beace2` `#a089cb` `#8569b5` `#6d4b9f` `#562c8b` |
| 7 | `#e3d6fe` `#c4b2e6` `#aa95d2` `#9379c0` `#7d5fad` `#69469c` `#562c8b` |

**Teal** (alternate, avoid over vegetated basemaps)

| Classes | Steps |
| --- | --- |
| 5 | `#b0ebea` `#71bebe` `#379a99` `#007879` `#00595b` |
| 6 | `#b0ebea` `#7dc6c5` `#4fa8a7` `#158c8c` `#007273` `#00595b` |
| 7 | `#b0ebea` `#84cccb` `#5fb1b1` `#379a99` `#008383` `#006d6e` `#00595b` |

**Measured, across all twelve ramps:** lightness is monotone in every one; the
worst adjacent lightness separation is ΔL 0.064 (teal at 7 classes), above the
0.06 floor, which is what makes class order survive greyscale; the lowest
chroma of any step is 0.056, which is what keeps the palest class from reading
as grey; white text on the darkest step clears 8.14:1 and ink on the lightest
clears 10.57:1, so a label can sit on any class.

### 6.3 Diverging, for above and below a baseline

**Violet to ochre**, with a neutral grey midpoint.

| Classes | Steps |
| --- | --- |
| 5 | `#562c8b` `#9c88c1` `#e8e8e5` `#ba8c65` `#7e3500` |
| 7 | `#562c8b` `#836aaf` `#b5a6d2` `#e8e8e5` `#cda98b` `#a66f3c` `#7e3500` |

Warm against cool, so the two arms read as opposite. The method's default pair
is blue against red; on a map blue is water, so the cool pole moves to violet.
Both arms are monotone in lightness from the midpoint outward, and the midpoint
carries chroma 0.004, which is the neutral the method requires so that "no
change" does not look like a value.

### 6.4 Categorical, and its hard cap

The eight slots are the `dataviz` reference order with slot 1 re-stepped to
Avandar's brand blue, which the validator accepts with no change to any other
result:

| Slot | Hue | Hex |
| --- | --- | --- |
| 1 | blue | `#1563fe` |
| 2 | orange | `#eb6834` |
| 3 | aqua | `#1baf7a` |
| 4 | yellow | `#eda100` |
| 5 | magenta | `#e87ba4` |
| 6 | green | `#008300` |
| 7 | violet | `#4a3aa7` |
| 8 | red | `#e34948` |

On the adjacent pairlist against the map's light surface this passes every
gate: worst CVD ΔE 9.1, worst normal-vision ΔE 19.6.

**The cap.** Under `--pairs all`, which is the correct test for a choropleth or
a categorical point layer, **only the first three slots pass.** Adding the
fourth puts yellow beside orange and fails the normal-vision floor at ΔE 13.7,
meaning full-color readers cannot reliably tell those two areas apart. No
re-ordering fixes it, because the all-pairs list does not depend on order.

So the design rule is: **a categorical map layer carries at most three named
categories plus "Other".** Beyond three, fold the tail into Other or split into
small multiples. The categorical legend in the prototype shows exactly this
shape. This is the kind of limit that would otherwise ship as a map nobody can
read, so the layer inspector enforces it rather than leaving it to judgement.

Four of the eight slots sit below 3:1 against a light basemap, which the
validator flags as requiring relief. The relief is direct labels on the map,
which §6.6 requires anyway.

### 6.5 Absence values: not reported, and suppressed

| Meaning | Light fill | Light texture ink | Dark fill | Dark texture ink |
| --- | --- | --- | --- | --- |
| Not reported | `#d1d1d1` | `#868686`, fine stipple | `#484848` | `#808080`, fine stipple |
| Suppressed | `#989898` | `#555555`, 45&deg; hatch | `#717171` | `#b7b7b7`, 45&deg; hatch |

Three properties, each doing one job:

- **Both are true neutrals, OKLCH chroma exactly 0.** The sequential ramps
  never go below chroma 0.056, so an absence value can never be mistaken for a
  low class. This ruled out Avandar's own `NEUTRAL_SHADES`: they are
  deliberately blue-tinted, and the mid steps carry chroma 0.05 to 0.057, which
  is as chromatic as a ramp's palest step. The UI chrome keeps the tinted
  neutrals; the map's data layer needs untinted ones.
- **Both carry a texture, always, not only in print.** No grey can be separated
  from a mid class by tone alone once a page is photocopied, so a flat grey
  no-data is not sufficient at any point in the pipeline. Making the texture
  permanent rather than print-only also means the screen and the export agree.
- **Suppressed is darker and hatched.** It carries more visual weight than
  "not reported" because it means the opposite thing: there *is* a value here,
  and it is being withheld. The two greys are separated by ΔL 0.181, so they
  also hold apart in greyscale.

### 6.6 What greyscale breaks

Two collapses are inherent, not fixable by choosing different hexes, and each
gets its own second channel:

1. **A diverging ramp cannot survive greyscale by tone.** Both arms are light
   at the midpoint and dark at the poles, so the two poles print as the same
   grey. In the export the arms take opposite hatch angles: 45&deg; below the
   baseline, 135&deg; above. The angle carries the sign; the tone carries the
   magnitude.
2. **A categorical map cannot survive greyscale by fill.** Distinct hues at
   similar lightness become one grey. Categorical layers therefore carry direct
   labels on the map. This is the same relief the contrast check demands for
   the four sub-3:1 slots, so one mechanism satisfies both.

### 6.7 Theme behavior

**Ramp hexes are identical in light and dark.** A ramp encodes magnitude, and
two people reading the same map in different themes must agree about what it
says. Inverting the data colors would make the same map read as different data.
What changes with the theme is the basemap pairing and the polygon hairline,
not the fill.

**Absence greys do flip.** Their job is to recede, and "recede" is defined
relative to the surface. A `#d1d1d1` no-data area on a dark basemap would be
the brightest thing on the map, which is the opposite of receding, and a reader
would take it for the highest class. Magnitude is absolute; absence is
relative. That is the whole distinction.

### 6.8 Legends, one per symbology

Every legend carries a title. Units appear only when the value has them. Entry
order is the persisted order, never a re-sort. A no-data entry appears whenever
any feature is unclassified and cannot be switched off, and a suppressed entry
appears whenever any cell is suppressed.

| Symbology | Legend form |
| --- | --- |
| `circle`, single color | Title, one key, one label. No units row: there is nothing to scale. |
| `circle` or `fill`, categorical | Title, one key per category in persisted order, "Other" last, then no-data. Capped at three named categories (§6.4). |
| `fill`, graduated | Title, units, the frozen break rows in order, then suppressed if present, then no-data. |
| `proportionalSymbol` | Title, units, and **nested circles sharing a bottom edge** with leader lines to three values (minimum, mid, maximum). Never a color bar: the encoding is area, so the legend must show area. |
| `heatmap` | Title and a continuous gradient bar labelled only **Low** and **High**. No numbers: a kernel density is not in the data's units, and printing a number invites a reader to quote it. |
| `line` | Title, one key per width or color class, drawn as a line segment rather than a square. |

**When the legend is taller than the map.** At more than 45% of the map's
height it reflows into two columns before it scrolls, because a scrolled legend
hides classes and a hidden class is a misread map. If two columns still exceed
45%, it scrolls, and a persistent count line reads "12 classes" so the reader
knows something is below the fold. Classes are never truncated silently.

**On export the legend never scrolls.** It reflows into as many columns as the
page allows, and if it still does not fit it moves out of the map frame into
its own block beside it. An export that clips a legend is an export that
misstates the map.

---

## 7. Print and export

For a humanitarian IM officer the export is frequently the actual deliverable.
The screen is where the map is composed; the page is where it is used.

### 7.1 One layout, two orientations

A4 landscape is 297 by 210mm and US Letter landscape is 279 by 216mm. The
difference is about 18mm of width and 6mm of height, which the map frame
absorbs, so **paper size is not a layout fork**. Orientation is, because it
moves the legend.

**Landscape.** Legend in a 56mm column to the right of the map frame, with the
north arrow and scale bar pinned to the foot of that column.

```
+--------------------------------------------------------------+
| Cholera response, North Kivu           Produced 14 Aug 2026   |
| Attack rate by health zone, week 32    DRC Response           |
+---------------------------------------------+----------------+
|                                             | Attack rate    |
|                                             | Cases per 100k |
|              M A P   F R A M E              | [] 0 to 24     |
|                                             | [] 25 to 79    |
|                                             | [] Not reported|
|                                             |                |
|                                             | N ^   [==] 50km|
+---------------------------------------------+----------------+
| Source: ...                    Basemap: MapLibre, OSM         |
| The boundaries and names shown do not imply endorsement.      |
+--------------------------------------------------------------+
```

**Portrait.** The legend moves below the map frame and runs horizontally in
columns, with the north arrow and scale bar pushed to the right of that row.

Margins are 12mm on every page.

### 7.2 What is mandatory and what is not

| Element | Status | Note |
| --- | --- | --- |
| Map frame | Mandatory | |
| Source attribution | **Mandatory, not switchable** | Shown checked and disabled in the export sheet, labelled "Always included" |
| Boundary disclaimer | **Mandatory, not switchable** | Same treatment |
| Production date | **Mandatory, not switchable** | See below |
| Legend | Mandatory whenever any visible layer uses categorical color, graduated color, or proportional symbols. Optional only when every visible layer is a single flat color | A choropleth without a legend is unreadable, so this is conditional rather than a preference |
| Title | Optional, on by default | |
| Subtitle | Optional, on by default | Defaults to the top layer's legend title |
| North arrow | Optional, on by default | |
| Scale bar | Optional, on by default, auto-suppressed below zoom 4 | See below |

**Production date is mandatory** rather than optional. A sitrep map is
time-sensitive and gets forwarded; an undated map circulating three weeks later
is read as current. Making the date a checkbox invites exactly the omission
that causes the harm.

**The scale bar suppresses itself below zoom 4.** A single scale bar on a Web
Mercator map spanning many degrees of latitude is wrong, because the scale
changes across the frame. Below zoom 4 the bar is replaced by the line "Scale
varies across this map". Printing a confidently wrong scale bar is worse than
printing none.

### 7.3 What the user can edit before exporting

Editable: title, subtitle, paper size, orientation, the optional furniture
above, the source line, and the disclaimer text. The disclaimer is editable
because organisations carry their own required wording, but it cannot be left
blank: clearing the field restores the default.

Not editable: **the camera**, because what was framed on screen is what prints,
which is the whole reason Direction C keeps the on-screen map frame the same
shape as the page; the **legend breaks**, which were frozen at save time
(§4.3); and the **suppression**, which is enforced upstream in the query.

### 7.4 The export renders in the light theme, always

Regardless of the app's theme. A dark map costs a full toner cartridge and
photocopies to a black rectangle, which is the reproduction path these maps
actually take. The export layout hardcodes its own light surfaces rather than
reading the theme tokens.

### 7.5 Resolution and paging

Export at 200 dpi minimum. MapLibre's canvas needs `preserveDrawingBuffer` and
a raised device pixel ratio for the export render; this is a known cost and
belongs in the Wave E plan rather than being discovered during it.

The export is one page. It becomes two only when the legend cannot fit
alongside or below the map at the chosen orientation, in which case the legend
takes page 2 and the footer gains page numbers. The map frame is never shrunk
to make a legend fit, and the legend is never truncated to keep one page.

---

## 8. Responsive and theme

### 8.1 Bands are measured on the content area, not the viewport

The workspace nav rail takes a fixed 200px off every viewport width, so the
panels respond to the canvas. Implemented with a container query on the canvas
element rather than a media query on the viewport.

| Canvas width | Roughly | Behavior |
| --- | --- | --- |
| Above 1000px | Viewport above `lg`, 1200px | Layer stack and inspector both expanded. The design as drawn. |
| 792 to 1000px | Viewport `md` to `lg` | Panels narrow (240px and 300px) and the **inspector starts collapsed**. |
| 520 to 792px | Tablet | Everything starts collapsed. Opening a panel gives a full-height edge sheet at 288px. Touch targets go to 44px. |
| Below 520px | Narrower than a tablet in portrait | Read-only. |

**The inspector yields first, not the stack.** The stack is how you navigate a
map; the inspector is how you edit one layer. Losing the way you navigate costs
more than losing the way you edit, and the inspector is one tap away.

### 8.2 Three rules the prototype forced

Each of these was a real defect found by building it, not a preference:

1. **A collapsed panel shrinks to its header.** Keeping its expanded width
   reserves space the map could use, and at tablet width two reserved 288px
   columns overflow the content area and push the top bar's Export button off
   the edge of the map.
2. **The top bar wraps rather than clips.** An action that runs off the edge of
   the map is an action the user cannot reach. At tablet the action labels drop
   to icons first, keeping their accessible names, and the bar wraps only if
   that is still not enough.
3. **The furniture strip wraps rather than truncates.** Truncating it would
   clip the attribution or the disclaimer, and neither may ever be clipped. At
   tablet the strip becomes two lines.

The legend also collapses to a pill at tablet, because it sits bottom left and
the tool cluster sits bottom centre, and below that width they collide. One
collapse rule for every floating surface beats a special case for the legend.

### 8.3 Below 520px the app is read-only, and that is a design decision

Not an omission. A product whose job is composing a map for print, with a layer
stack, a six-section inspector, and a classification editor, cannot be operated
at phone width. The failure mode of trying is that every surface becomes a
modal and the map is never visible, which defeats the thesis of the whole
design.

520px of content area is the threshold because a 288px panel over a 520px
canvas leaves less map than the panel covering it. That is the point at which
editing stops being possible rather than merely cramped.

Below it, the app shows the map, the title, Share, Export, the legend, and the
furniture strip, plus a notice:

> **Viewing only on this screen size.** Pan, zoom and tap a feature to read it.
> To edit layers, open this map on a tablet or a laptop.

The minimum usable editing width is a tablet in portrait, 768px viewport.

### 8.4 Theme

Every surface uses the tokens in `src/config/Theme/`: `--ava-surface-overlay`
for floating panels, `--ava-surface-panel-header` for panel headers,
`--ava-surface-raised` for controls, `--ava-border-default` for the hairline
that carries the elevation, and the `--mantine-shadow-*` steps for the lift.
The prototype declares light and dark tokens in one block each, so the
translation to `cssVariablesResolver` is a copy.

Two things about a map differ from ordinary UI, and both are easy to get
backwards.

**The basemap pairs with the UI theme, and pairing swaps the variant, not the
choice.** A light UI over a dark basemap makes the panels look like they are
floating on a photograph; a dark UI over a light basemap is blinding in the
conditions this app is used in. So switching the app theme switches the chosen
basemap's light or dark rendition, and never the user's basemap selection: a
user who picked Positron still has Positron. When a basemap has no dark variant
(satellite imagery, a custom XYZ source), the map stays as it is and the UI does
not attempt to compensate, because a scrim over someone's imagery is worse than
a mismatch.

**Data colors do not invert with the theme.** Covered in §6.7: a ramp encodes
magnitude, and two people reading the same map in different themes must agree
about what it says. The absence greys are the single exception, and §6.7 gives
the reason.

**One inherited inconsistency, flagged not fixed.** The nav rail is a fixed
`NEUTRAL[6]` in both themes (`theme.other.navbar`), so in dark mode it is
*lighter* than the app body. The map surfaces this more than other apps because
it is full-bleed right next to the rail. It is an app-wide issue rather than a
GIS one, so it is recorded here and not changed by this design.

---

## 9. Accessibility

Walked by keyboard through the published prototype. The numbers below are
measured, not estimated.

### 9.1 Tab order

Fifty-four stops at desktop width, in this order:

1. Workspace nav rail, 5 stops (not owned by this design).
2. **Skip links**, 2 stops.
3. The map surface, 1 stop.
4. Top bar: title, then Basemap, Views, Share, Export.
5. Layers panel: Add layer, collapse, then per row visibility, select, more.
6. Layer inspector: collapse, then each section toggle and its controls.
7. Legend: collapse.
8. Tool cluster.

DOM order is the tab order throughout. No `tabindex` above 0 anywhere.

**The map comes before the chrome deliberately.** It is one stop, and landing on
it first lets a keyboard user pan and zoom immediately with the arrow keys and
`+` / `-`, which is the most common thing they want.

### 9.2 Skip links, because the tool cluster is 49 stops in

Two skip links, visually hidden until focused, are stops 6 and 7, the first
things inside the canvas: **Skip to layer settings** and **Skip to map tools**.

Measured: the first inspector control is stop 28 and the first tool-cluster
control is stop 49, so the second link saves 42 presses. Landmarks solve this
for a screen reader and solve nothing for a sighted keyboard user.

### 9.3 Landmarks

| Landmark | Name |
| --- | --- |
| `nav` | Workspace |
| `role="application"` | "Map of {map name}. Use the layer panel to change what is shown." |
| `region` (the layers panel) | Layers |
| `region` (the inspector) | Layer |
| `region` (the legend) | Legend |
| `region` (classification editor) | Classify {column} |
| `region` (validation report) | Rows that could not be mapped |
| `role="toolbar"` | Map tools |

Each panel is a `<section>` with `aria-labelledby` pointing at its own heading,
which is what promotes it to a region.

### 9.4 Every control has an accessible name, and unavailable ones stay reachable

Measured: **zero unnamed controls** across the app frame. Names are specific
rather than generic: "Hide the layer Cholera cases, week 32", not "Hide".

**Unavailable controls use `aria-disabled`, never the `disabled` attribute.**
A `disabled` button is removed from the tab order, which means the explanation
attached to it becomes unreachable by keyboard. Since §4.2 requires every
unavailable control to state a reason, the control has to stay focusable for
that reason to be readable. The handler no-ops instead.

### 9.5 Selecting a layer is a button

This was the one real gap the keyboard walk found. The layer row was a `<div>`
with a click handler, so a keyboard user could toggle a layer's visibility and
open its menu but could never **select** it, which is the app's primary
navigation.

The row is now three controls: a visibility toggle, a **select button** wrapping
the swatch and the name that carries `aria-current="true"` when it is the
selected layer, and an overflow menu. Drag-to-reorder additionally needs a
keyboard path (see §10, where it is costed).

### 9.6 Focus rings draw inside full-bleed controls

The default ring is `2px solid var(--ava-border-focus)` at a `2px` offset. Panels
set `overflow: hidden` so their bodies can scroll and their corners can clip,
which cuts the ring off any control that spans the panel's full width.

So full-bleed controls use `outline-offset: -2px` and draw the ring inside
their own box: the inspector's section toggles, the layer select buttons, the
source-picker options, and the nav rail items.

**Panel header controls join them.** The header carries only 2px of vertical
padding (§10 sizes it at 29px against a 19px line box), which is less clearance
than an offset ring needs, so its Add layer and collapse buttons draw inside
too. This is the direct cost of a compact header, and it is worth naming because
tightening the header again without this rule silently clips those rings.

Verified while focused: every ring falls fully within its panel.

### 9.7 Reaching a feature's data without clicking the map

Clicking a point is a pointer gesture with no keyboard equivalent, and MapLibre
does not make features tabbable. The answer is a list, not a keyboard emulation
of a click:

The layer row's overflow menu carries **View data table**, which opens the
layer's rows in the Data Explorer's existing grid. Selecting a row highlights
the matching feature and moves the camera to it, and the feature inspector opens
with the same content it would show on click. This reuses a component that
already exists rather than inventing a map-specific one, and it is genuinely
better than clicking for finding a named place.

### 9.8 Contrast

Because panels are opaque (§3.4), **no chrome text sits over the basemap at
all**, which is what makes contrast computable rather than a function of what
the map happens to be showing. Measured against the actual surfaces:

| Pairing | Light | Dark |
| --- | --- | --- |
| Body text on a panel | 14.64:1 | 7.82:1 |
| Dimmed text on a panel | 6.08:1 | 5.27:1 |
| Dimmed text on a panel header | 4.64:1 | 5.27:1 |
| Badge text on the warning fill | 6.77:1 | 8.40:1 |
| Furniture strip text | 6.08:1 | 7.02:1 |
| Primary button label | 4.94:1 | 4.94:1 |

Every pairing clears WCAG AA for body text at 4.5:1, not merely the 3:1 large
text bar.

**The one exception is text drawn on the map**, which is the direct labels that
categorical layers require (§6.6). Those get a 1.5px halo in the map surface
color via MapLibre's `text-halo-color` and `text-halo-width`, which is the
standard cartographic answer to unknown backgrounds. The label color itself is
never sampled from the layer's palette.

### 9.9 Reduced motion

`prefers-reduced-motion: reduce` collapses every transition to 1ms, and the
theme already sets `respectReducedMotion: true`. Two map-specific behaviors need
it explicitly, because they are not CSS transitions:

- **Camera flights.** `fitBounds` and "zoom to layer" must pass
  `{ animate: false }` under reduced motion. A flown camera is the single most
  nauseating thing a map does.
- **The time slider's animation** (Wave D) must not auto-play. The play control
  stays, and stepping is manual.

---

## 10. Component inventory

The table the wave plans turn into files. "Model field" names the real field in
`shared/models/AvaMap/` that the component edits, so an implementer can go
straight from a row to a type.

### 10.1 Shell

| Component | Mantine primitive | Model field | Wave |
| --- | --- | --- | --- |
| `MapShell` (the chrome grid) | `Box` plus CSS grid | none | A |
| `MapChromePanel` (collapsible floating panel) | `Paper` + `Collapse` | none, panel state is per user | A |
| `MapFurnitureBar` | `Group` | none | A |
| `MapTopBar` | `Group` + `Paper` | `AvaMap.name` | A |
| `MapTitleInput` | `TextInput` (unstyled variant) | `AvaMap.name` | A |
| `SaveStateIndicator` | `Text` + icon | none | A |
| `BasemapControl` | `Menu` | `AvaMap.basemap` (`BasemapConfig`) | A |
| `ViewsMenu` (bookmarks) | `Menu` | new `AvaMap.bookmarks` field, see §10.4 | A |
| `ShareButton` | reuses `ShareResourceModal` | none | A |
| `ExportSheet` | `Modal` | none | E |
| `SkipLinks` | `Anchor` | none | A |

### 10.2 Layer stack

| Component | Mantine primitive | Model field | Wave |
| --- | --- | --- | --- |
| `LayerList` | `Stack` | `AvaMap.layers` (order is z-order) | A |
| `LayerRow` | `Group` | `MapLayer.name`, `MapLayer.isVisible` | A |
| `LayerVisibilityToggle` | `ActionIcon` | `MapLayer.isVisible` | A |
| `LayerSelectButton` | `UnstyledButton` | none, selection is view state | A |
| `LayerReorderHandle` | **custom**, `@dnd-kit` | `AvaMap.layers` order | A |
| `LayerActionsMenu` | `Menu` | `MapLayer.name`, list membership | A |
| `LayerStatusBadge` | `Badge` | derived from the layer's query state | A |
| `SensitivityBadge` | `Badge` + `Tooltip` | `MapLayer.sensitivity.mode` | B |
| `MatchReportBadge` | `Badge` | derived from the boundary join result | B |

### 10.3 Layer inspector

| Component | Mantine primitive | Model field | Wave |
| --- | --- | --- | --- |
| `InspectorSection` | `Accordion` | none | A |
| `LayerSourceSelect` | reuses `QueryDataSourceSelect` | `MapLayer.source.dataSource` | A |
| `GeoBindingTypeSelect` | `Select` | `MapLayer.geoBinding.type` | A |
| `LatLngColumnFields` | `Select` x2 | `geoBinding.latitude`, `geoBinding.longitude` | A |
| `GeometryColumnFields` | `Select` + `SegmentedControl` | `geoBinding.column`, `geoBinding.encoding` | B |
| `BoundaryJoinFields` | `Select` x3 | `geoBinding.boundary`, `.dataKey`, `.boundaryKey`, `.matching` | B |
| `BinningFields` | `SegmentedControl` + `NumberInput` | `geoBinding.grid`, `geoBinding.sizeMeters` | C |
| `CrsOverrideField` | `Select` | new field, see §10.4 | C |
| `SimplificationField` | `Slider` | new field, see §10.4 | B |
| `SymbologyTypeControl` | `SegmentedControl` | `MapLayer.symbology.type` | A |
| `SingleColorField` | `ColorInput` | `symbology.color` (`{ type: "single" }`) | A |
| `PalettePicker` | **custom** over `Combobox` | `symbology.color` categorical or graduated. Enforces the three-category cap from §6.4 by folding the tail into "Other" | B |
| `SymbolSizeFields` | `NumberInput` x2 + `SegmentedControl` | `symbology.minRadius`, `.maxRadius`, `.scale`, `.value` | C |
| `StrokeFields` | `ColorInput` + `NumberInput` | `symbology.stroke` | A |
| `LineFields` | `ColorInput` + `NumberInput` | `symbology.color`, `symbology.width` | B |
| `ClusterFields` | `NumberInput` + `Select` | `symbology.radiusPx`, `.aggregate` | C |
| `HeatmapFields` | `NumberInput` + ramp picker | `symbology.radiusPx`, `.weight`, `.ramp` | C |
| `SensitivityFields` | `Select` + `NumberInput` | `MapLayer.sensitivity` (all three modes) | B |
| `LayerFilterSection` | reuses the Data Explorer filter row | `MapLayer.source` filter clauses | A |
| `PopupFieldsSelect` | `MultiSelect` | `MapLayer.popup.columnIds` | A |
| `LegendFields` | `TextInput` x2 + `Select` + `Switch` | `MapLayer.legend.title`, `.units`, `.position`, `.showNoData` | A |

### 10.4 Classification editor

| Component | Mantine primitive | Model field | Wave |
| --- | --- | --- | --- |
| `ClassifyPanel` | `Paper` | `symbology.color` graduated | B |
| `ValueSelect` | `Select` | `color.column` | B |
| `NormalizeFields` | `Select` + `SegmentedControl` | `color.normalizeBy.column`, `.per` | B |
| `ClassificationHistogram` | **custom SVG** | reads the layer's values | B |
| `BreakHandles` | **custom**, pointer plus keyboard | `color.classification.breaks` | B |
| `MethodSelect` | `Select` | `color.classification.method` | B |
| `ClassCountStepper` | `NumberInput` | `color.classification.classes` | B |
| `BreakList` | `Stack` + `NumberInput` | `color.classification.breaks` | B |
| `NoDataRow` | `ColorInput` + `TextInput` | `color.noData` (`NoDataStyle`) | B |

### 10.5 Over-map

| Component | Mantine primitive | Model field | Wave |
| --- | --- | --- | --- |
| `MapLegend` | `Paper` | `MapLayer.legend` | A |
| `SizeLegend` (nested circles) | **custom SVG** | `symbology.minRadius`, `.maxRadius`, `.scale` | C |
| `MapStatusCard` | `Paper` + `Alert` | derived from query state and drops | A (built) |
| `ValidationReport` | `Paper` + `Table` | `DropReason` counts and `sampleRowIndexes` | C |
| `FeatureInspector` | `Drawer` | `MapLayer.popup` | A (built, empty until popup config lands) |
| `MapToolCluster` | `Paper` + `ActionIcon` | none | A shell, D tools |
| `TimeSlider` | `Slider` | new field, see below | D |

### 10.6 Model gaps this design depends on

Six things the design needs that the model does not have yet. Each is small,
and naming them now is cheaper than discovering them mid-wave.

| Gap | Needed for | Wave |
| --- | --- | --- |
| `LegendConfig.breaks` | §4.3 and spec §4.4 require breaks frozen at save time so the map, the embed and the PDF cannot disagree. `LegendConfig` currently has `title`, `units`, `showNoData`, `position` and no `breaks`. | B |
| `AvaMap.bookmarks` | The Views menu | A |
| `PopupConfig` action field | "Click through to case record" (§10 of the GIS spec) has no model field | A |
| CRS override on `GeoBinding` | Inspector Data, advanced | C |
| Simplification tolerance on `GeoBinding` | Inspector Data, advanced | B |
| Time field on `MapLayer` | Time slider | D |

And one capability gap outside the model: **`hasSpatial()` does not exist**
(§4.2). It must return `"loading" | "available" | "unavailable"`, not a boolean,
or spatial-dependent controls show the failure copy during normal startup.

---

## 11. Open questions

Five things this design deliberately did not decide. Each needs an answer before
the wave named against it, and none blocks Wave A.

**1. Where an isochrone lives.** Buffer's precedent (§3 of the inventory) says a
spatial analysis is a tool that writes a layer. But Buffer's input is an
existing layer, while an isochrone's input is a point the user places, which no
other tool does. Tool, or geo-binding type? Resolve before Wave D fixes the tool
cluster's shape.

**2. Whether a dataset carries a default sensitivity.** Raised in §5.4. A
dataset-level default would prevent the obvious mistake of forgetting to set
`aggregateOnly` on a protection layer, but there is no dataset-level sensitivity
field in the model and adding one is a feature decision, not a design one.
Wave B.

**3. Whether the export carries an organisation mark.** Sitrep maps almost
always carry a logo. The design puts the workspace name in the footer, which
needs no new field, and stops there. An actual logo means an upload, storage,
and a placement rule. Wave E.

**4. What "Add to dashboard" produces.** §10 places the authoring entry point in
the export sheet, and the rendered block is dashboard-owned chrome showing map,
legend, and attribution only. Whether that block is a live map or a rendered
image is a dashboard-side decision with real performance consequences, and it is
not this design's to make. Wave E.

**5. Keyboard reordering of layers.** §9.5 notes that drag-to-reorder needs a
keyboard path, and §10.2 costs the drag library. The specific interaction, most
likely `Alt` with the arrow keys on a focused layer row, is a small decision but
it must be made rather than inherited from the drag library, because drag
libraries do not provide one. Wave A.
