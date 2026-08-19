# GIS Wave E: print and PDF design

**Status:** Approved for implementation planning
**Date:** 2026-08-18
**Related:**

- `docs/superpowers/specs/2026-08-12-gis-avamap-design.md`
- `docs/superpowers/specs/2026-08-12-gis-shell-design.md`
- `docs/design/gis/feature-home-inventory.md`
- `docs/superpowers/specs/2026-08-17-gis-wave-d-design.md`
- `docs/superpowers/plans/2026-08-17-gis-wave-d-analysis-and-time.md`

This document supersedes the parent GIS specifications where they disagree. In
particular: Export downloads a PDF only (no browser print dialog, no PNG); the
organisation mark is the workspace name (no logo); disputed-boundary treatment
is an explicit column bind, not auto-detection; public maps, Map PBlocks,
isochrones, offline basemaps, and HDX are out of this spec.

Sibling Wave E specs (isochrones, offline basemaps, Map PBlocks) are written
separately and implemented in separate worktrees. This spec is the only one
that advances `AvaMapConfig` from version 4 to version 5.

## 1. Goal

This spec makes the map a sitrep page. Authors download a PDF whose map frame
matches the on-screen camera, whose furniture is the shell layout, and whose
boundary lines that are disputed or undetermined cannot be read as settled.

It is complete only when:

- A saved `exportLayout` and disputed-status bind reload identically
- The PDF map frame contains data layers and visible annotations, and none of
  the authoring chrome (tool cluster, time slider, AOI outline, on-map legend,
  furniture strip)
- Aggregate only still cannot put a source point in GeoJSON or MapLibre,
  including in the export `MapSpec`

## 2. Product decisions

1. Export furniture persists on `AvaMapConfig.exportLayout`. Reopening Export
   shows the last sitrep. Frozen legend breaks already persist; furniture must
   too, or two exports of the same saved map can disagree.
2. The only file format is PDF download. No print dialog and no PNG. A second
   renderer is a second failure surface.
3. The PDF map frame is visible data layers plus visible annotations. Tool
   cluster, time slider, AOI dashed outline, on-map legend, and the bottom
   furniture strip are stripped. Page furniture is the sheet's job.
4. Active map filters are disclosed in furniture, not drawn on the map. If
   `timeRange` is set, the page shows that window in addition to the production
   date. If `aoi` is set, a short "Area of interest applied" line. No AOI
   geometry is drawn.
5. Disputed-boundary rendering is in this spec, on screen and in the PDF.
   Dashed grey casing, locked legend entry, explicit column bind, author-mapped
   values.
6. No organisation logo. The workspace name in the header identifies the org.
7. The authored basemap is not swapped for a light style. Dark or satellite
   basemaps stay as framed. The sheet warns they may photocopy poorly.
8. Production date is the instant of download, not a stored field. A forwarded
   sitrep must not look like it was produced on an earlier save.
9. Page layout follows shell design §7: A4 or US Letter, landscape or portrait,
   12 mm margins, light surfaces hardcoded (not theme tokens), 200 dpi
   minimum, one page unless the legend cannot fit (then legend on page 2).
10. The GIS compiler still owns spatial SQL. This spec adds feature properties
    and MapLibre paint. It does not emit new `ST_*`.
11. Work lands as integrated vertical slices. Export becomes available only
    when model, disputed rendering, sheet, pipeline, and tests are complete.

## 3. Scope

### 3.1 Included

- `AvaMapConfig` version 5 with `exportLayout`
- Per-layer `disputedStatusColumn` and `disputedStatusValues`
- Dashed disputed/undetermined casing on fill and line layers
- Locked "Disputed or undetermined boundary" legend row when any such segment
  is drawn
- Export sheet as the writer of `exportLayout`
- Offscreen MapLibre snapshot composed into `jsPDF`
- Filter readout, mandatory disclaimer/attribution/date, workspace name
- Visible annotations in the map frame

### 3.2 Deferred

- Browser print dialog and PNG
- Workspace or per-map logo
- Public map routes (`maps.is_public` / `maps.slug`); Map PBlock spec
- Isochrones; offline basemap caching; HDX / ABox sources
- Forcing a light basemap style on export
- Diverging-ramp opposite-hatch in greyscale (shell §6.6); categorical
  direct labels as a print-only extra
- Supabase schema changes

## 4. Architecture

### 4.1 Config version

`AvaMapConfig` advances from version 4 to version 5. Its parser migrates every
valid version 4 map into the version 5 shape without changing Wave D behavior.
Version 5 remains strict at the JSON boundary. Serialization always emits
version 5.

`MapLayer.version` stays 1.

Sibling Wave E worktrees must not also emit version 5. They rebase onto this
migration (or a later merged version) and bump from whatever is current.

The migration supplies only values that preserve old behavior:

- `exportLayout` defaults in §4.2
- every layer `disputedStatusColumn` unset
- every layer `disputedStatusValues` `{ disputed: [], undetermined: [] }`

### 4.2 Export layout

```ts
type ExportPaper = "a4" | "letter";
type ExportOrientation = "landscape" | "portrait";

type ExportLayout = {
  paper: ExportPaper;
  orientation: ExportOrientation;
  title: { isVisible: boolean; text: string };
  subtitle: { isVisible: boolean; text: string };
  northArrow: boolean;
  scaleBar: boolean;
  sourceLine: string;
  disclaimer: string | undefined;
};
```

Defaults:

| Field         | Migration / new map             |
| ------------- | ------------------------------- |
| `paper`       | `"a4"`                          |
| `orientation` | `"landscape"`                   |
| `title`       | `{ isVisible: true, text: "" }` |
| `subtitle`    | `{ isVisible: true, text: "" }` |
| `northArrow`  | `true`                          |
| `scaleBar`    | `true`                          |
| `sourceLine`  | `""`                            |
| `disclaimer`  | unset                           |

`title.isVisible` / `subtitle.isVisible` false omits that header line even
when `text` is set. Empty `title.text` (and visible) renders the map resource
name. Empty `subtitle.text` (and visible) renders the top visible data
layer's legend title, or nothing if there is no such layer. Empty `sourceLine` is composed at export time from visible layer
sources plus basemap attribution. Editing any of those three persists the
string; the fallback is not re-evaluated until the author clears the field
back to `""`.

`disclaimer` unset means the Lingui default at display time (the same string
the furniture strip already shows). The parser rejects `""`. Clearing the
field in the sheet stores unset, not blank. A custom disclaimer is stored
verbatim and is shown on the furniture strip and in the PDF, so screen and
page agree. Custom text does not follow locale; the default does.

Filter readout is not a stored field. It is derived from `timeRange` and
`aoi` at preview and download.

`scaleBar: true` still auto-suppresses below zoom 4. The page shows "Scale
varies across this map" instead of a bar. Printing a confidently wrong scale
is worse than printing none.

Production date is not on `ExportLayout`.

### 4.3 Layer disputed fields

Each data `MapLayer` gains:

```ts
disputedStatusColumn: QueryColumn.Id | undefined;
disputedStatusValues: {
  disputed: readonly string[];
  undetermined: readonly string[];
};
```

Unset `disputedStatusColumn` means every outline is settled. The inspector
states that. Annotations are not `MapLayer`s and do not carry these fields.

The two arrays must be disjoint. The parser and the updater reject a value
that appears in both. Null and unlisted values, including values not in the
source column, are settled.

### 4.4 Which layers may bind

The bind is offered only when all of the following hold:

- symbology is `fill` or `line`
- geo-binding is `geometryColumn`, `joinToBoundaries`, or
  `aggregatePointsToBoundaries`

Not offered on circle, cluster, heatmap, `bufferOfLayer`, or
`binPointsToGrid`. Buffer rings and grid cells are not administrative
boundaries.

For `joinToBoundaries` and `aggregatePointsToBoundaries`, the column is
chosen from the **boundary** dataset, not the point source.

The bound column must be text (`AvaDataType.isText`). The inspector rejects
numeric, boolean, geometry, and date/timestamp columns. Categorical paint
already uses text columns; there is no separate categorical data type.

### 4.5 Query and renderer contract

When `disputedStatusColumn` is set, the layer query includes that column in
the feature properties. The GIS compiler does not emit new spatial SQL for
this; it is a selected attribute, the same way classification columns already
are.

The renderer classifies each feature:

- property value in `disputedStatusValues.disputed` or `.undetermined` →
  disputed
- anything else, including null and missing property → settled

Disputed and undetermined share one visual treatment and one legend entry.

### 4.6 Casing paint

Disputed/undetermined outlines:

- dashed casing
- never the layer's stroke color
- never solid
- light canvas (app light theme, and every PDF): `#555555` (shell
  suppressed texture ink, light)
- dark canvas: `#b7b7b7` (shell suppressed texture ink, dark)
- dasharray `[3, 2]` in MapLibre pixels

Settled outlines keep the layer stroke. Fill color is unchanged. Disputed
casing is drawn even when the layer stroke is absent or transparent; settled
features without a stroke stay without an outline.

Whenever at least one disputed or undetermined segment is actually drawn
(visible layer, remaining after suppression / no-data / AOI / time), the
legend gains a locked row labelled with the Lingui string "Disputed or
undetermined boundary". It cannot be removed, hidden, or recolored, on
screen or in the PDF. If none are drawn, the row is absent.

A bound column whose mapping arrays are both empty draws every feature as
settled and does not add the legend row.

### 4.7 Export MapSpec

The export map is a second MapLibre instance, not a screenshot of the
interactive canvas.

It is built from the current config with:

- the on-screen camera (`view`); not editable in the sheet
- visible data layers, same queries as the screen (AOI and time already
  applied upstream)
- visible annotations when `annotations.isVisible` is true
- disputed casing as on screen

It must not include:

- AOI outline chrome
- measure overlay
- tool cluster, time slider, on-map legend, furniture strip
- hovered or selected feature-state

Aggregate only still cannot produce circle, symbol, cluster, or heatmap
layers in this spec.

### 4.8 PDF composition

Reuse `jsPDF` (already a dashboard dependency). Reuse `html-to-image` only
for furniture DOM, never for the WebGL map canvas.

Pipeline:

1. Build the export `MapSpec` (§4.7).
2. Mount an offscreen MapLibre map sized to the paper map-frame at 200 dpi
   minimum. `preserveDrawingBuffer: true`. Pixel ratio from millimetres to
   pixels at that dpi. `prefers-reduced-motion: reduce` jumps to `view`; no
   flight.
3. Wait until `idle`. Snapshot with `map.getCanvas()`. A blank canvas, lost
   context, or idle timeout is a failure, not a file.
4. Compose furniture in a hardcoded light layout (shell §7.1):
   - **Landscape:** legend in a 56 mm column to the right of the map frame;
     north arrow and scale bar at the foot of that column.
   - **Portrait:** legend below the map frame, horizontal columns; north
     arrow and scale bar to the right of that row.
   - Header: title, subtitle, workspace name, "Produced {date}".
   - Footer: source line, basemap attribution, disclaimer, filter readout.
   - Margins 12 mm.
5. Legend content follows shell §6 and frozen `LegendConfig.breaks`. Include
   the locked disputed row when §4.6 requires it. On export the legend never
   scrolls. It reflows into as many columns as the page allows; if it still
   cannot fit alongside or below the map, it moves to page 2 and the footer
   gains page numbers. The map frame never shrinks. The legend is never
   truncated to keep one page.
6. Place the canvas snapshot in the map frame. `jsPDF` at the chosen paper
   and orientation.
7. Filename: sanitized rendered title plus the production date
   (`{title}-{yyyy-mm-dd}.pdf`).

North arrow points up. Wave D maps are north-up; the arrow confirms that.

Scale, when shown, uses the same geodesic-at-center rule as the on-screen
scale bar.

## 5. Inspector, sheet, and map behavior

### 5.1 Data section: disputed bind

On eligible layers, below the geo-binding controls:

- optional "Disputed status column" select
- when a column is bound: two multi-selects assigning distinct source values
  to Disputed and Undetermined

The select's description states whether a column is bound. Unset: "No
disputed-status column. Outlines render as settled." Bound with empty
mapping: "Column bound. No values assigned; outlines render as settled."

### 5.2 Export control

The top-bar Export button loses `aria-disabled` only when this spec's slices
are complete. It opens a sheet, not a route. The sheet is the only writer of
`exportLayout`.

### 5.3 Export sheet

Controls: paper, orientation, title/subtitle visibility and text, north
arrow, scale bar, source line, disclaimer.

Source attribution, boundary disclaimer, and production date are shown
checked and disabled, labelled "Always included". They stay focusable
(`aria-disabled`) with that reason in the accessible name.

Empty title, subtitle, and source fields show their live fallbacks in the
inputs as placeholders; editing persists the string. Clearing disclaimer
restores the Lingui default and unsets the field.

If any visible layer is Aggregate only, the sheet states that the export
applies the same suppression as the screen. Not a checkbox. Shell §5.4 copy,
with the layer name and threshold filled from the layer.

Filter readout appears in the preview and on the page when `timeRange` or
`aoi` is set. Time uses the stored inclusive ISO-8601 range, formatted for
the locale. AOI is the line "Area of interest applied", not a geometry.

Dark or satellite basemap: a warning that the page may photocopy poorly.
Download stays enabled.

A scaled preview uses the same composition as the file (export `MapSpec` plus
furniture). Primary action: Download PDF, with a loading state while the
offscreen map is not idle or the file is being written.

Workspace name comes from the current workspace, not from `exportLayout`.

### 5.4 Furniture strip on screen

When `exportLayout.disclaimer` is set, the bottom furniture strip shows that
text. When unset, it shows the Lingui default. The strip remains
non-dismissible.

### 5.5 Accessibility and localization

All displayable copy uses Lingui. Mandatory "Always included" controls never
become hover-only. The preview has an accessible name. Disputed legend copy
is translated. Reduced motion covers the offscreen map camera.

Custom persisted disclaimer, title, subtitle, and source line are author
content and are not passed through Lingui.

## 6. Diagnostics and errors

Fail closed. Nothing is hover-only.

| Case                                           | Behavior                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Offscreen map not idle                         | Download disabled; sheet shows loading                                                                  |
| Idle timeout, blank canvas, lost WebGL context | No file. Status with retry. `exportLayout` kept                                                         |
| Furniture capture or `jsPDF` throws            | No file. Status with retry. Config kept                                                                 |
| Spatial loading or unavailable                 | Export stays available. Snapshot is whatever the screen already shows                                   |
| Empty layer stack                              | Export stays available (basemap plus furniture)                                                         |
| Dark or satellite basemap                      | Warning. Download enabled                                                                               |
| Disputed column not text                       | Inspector rejects the bind                                                                              |
| Disputed value in both arrays                  | Updater rejects. Config unchanged                                                                       |
| Bound disputed column missing from result      | Features without the property render settled. Layer error if the query itself failed (existing pattern) |
| AOI plus time yields zero features             | Existing empty-layer row. PDF still downloads                                                           |
| Aggregate only in export MapSpec               | Still no circle, symbol, cluster, or heatmap spec                                                       |
| `prefers-reduced-motion: reduce`               | Offscreen map jumps to `view`                                                                           |

A black or empty map frame in the PDF is a failed download, never a success.

## 7. Vertical slices

A control becomes available only when its model, execution, diagnostics,
rendering, and tests are complete. Export stays `aria-disabled` with the
later-release reason until slices 7.1 through 7.4 are done.

### 7.1 Config v5

Version 5 parser that preserves version 4 behavior. Default `exportLayout`.
Layer disputed fields. Furniture strip reads persisted disclaimer.

### 7.2 Disputed rendering

Inspector bind. Feature property. Dashed casing. Locked legend row iff any
disputed or undetermined segment is drawn.

### 7.3 Export sheet

Button opens the sheet. Controls write `exportLayout`. Preview shows
furniture layout; the map frame may be a placeholder until slice 7.4.
Mandatory controls `aria-disabled`. Aggregate-only statement. Filter
readout. Dark-basemap warning.

### 7.4 PDF pipeline

Offscreen map, `preserveDrawingBuffer`, 200 dpi, idle snapshot, furniture
compose, `jsPDF`, filename, fail closed on blank canvas. Export button
becomes available.

## 8. Verification

### 8.1 Model tests

- Version 4 to version 5 migration
- Strict version 5 parsing
- JSON round trips
- Default `exportLayout`; `disclaimer` unset
- `disclaimer: ""` rejected
- Disjoint `disputedStatusValues`; overlap rejected
- Unset `disputedStatusColumn`; empty mapping arrays allowed

### 8.2 Renderer tests

- Disputed/undetermined: grey dash, not layer stroke, not solid
- Settled: layer stroke unchanged
- Locked legend row present iff at least one such segment is drawn
- Empty mapping: all settled, no disputed legend row
- Export `MapSpec` has no AOI outline, on-map legend, cluster, slider, or
  furniture
- Visible annotations included when `annotations.isVisible`; omitted when
  not
- Invariant: Aggregate only cannot produce circle, symbol, cluster, or
  heatmap layers in the export spec

### 8.3 Component tests

- Export stays disabled until slice 7.4 (later-release reason)
- After 7.4: button opens the sheet
- Paper, orientation, title, disclaimer persist on `exportLayout`
- Attribution, disclaimer, and date cannot be unchecked
- Clearing disclaimer unsets the field
- Filter readout visible iff `timeRange` or `aoi` is set
- Aggregate-only statement when such a layer is visible
- Dark-basemap warning
- Translated accessible copy

### 8.4 Pipeline tests

Mock `getCanvas` and `jsPDF`:

- One page when the legend fits
- Legend on page 2 when it does not; map frame size unchanged
- Filename from rendered title and production date
- Filter readout in furniture iff overlay set
- Blank canvas / throw: no `save`, error status
- Light furniture surfaces regardless of app theme

### 8.5 Focused end-to-end tests

Run each related Playwright file individually, never the full end-to-end
suite. Local timeout stays at or under 45 seconds.

1. Bind a disputed-status column, assign a value, reload, see dashed casing
   and the locked legend row.
2. Open Export, edit title and disclaimer, reload, open Export, see the same
   furniture.
3. Download PDF: a file download occurs. Do not parse PDF bytes in e2e.

## 9. Completion criteria

This spec is complete when:

1. Every valid Wave D map opens with unchanged behavior.
2. `exportLayout` persists, reloads, and is the only writer of disclaimer
   text.
3. Disputed casing and the locked legend row match on screen and in the
   export spec.
4. Download produces a PDF or a visible failure, never a blank map page.
5. The PDF map frame has no authoring chrome.
6. Aggregate only still cannot put a source point in the application result
   or MapLibre, including during export.
7. Type checking, lint, frontend tests, build, i18n validation, and each
   related end-to-end file pass.
