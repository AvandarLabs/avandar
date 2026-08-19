# GIS map tool UX: draw, pan, text, and eraser

**Status:** Approved for implementation
**Date:** 2026-08-19
**Author:** pablo@avandarlabs.com
**Worktree:** `feat/gis-ux`
**Related:**

- `docs/superpowers/specs/2026-08-12-gis-shell-design.md`
- `docs/superpowers/specs/2026-08-17-gis-wave-d-design.md`
- `docs/superpowers/specs/2026-08-18-gis-wave-e-isochrones-design.md`

This document supersedes Wave D tool-cluster interaction where they disagree.
Isochrone remains unimplemented. This spec hides that slot unless a feature
flag is on. Annotation storage stays `AvaMapConfig.annotations`. No schema
version bump.

---

## 1. Goal

Map tools should feel like drawing tools. Selecting a tool changes the cursor
and makes every unmodified pointer gesture use that tool. Panning is either
the Select tool or Alt held down. Text appears on the first map click and is
editable in place. Pencil strokes can be erased in pieces; other annotations
erase as whole objects.

Complete only when:

- A first-time author can draw a rectangle, a lasso, a polygon, an arrow, a
  pencil stroke, and a text label without a double-click that "does nothing"
- Alt-drag pans while any drawing tool is active; Select pans with a normal
  drag
- Isochrone is absent from the toolbar unless `enable-gis-isochrone` is on
- Erasing a pencil removes only the touched parts; erasing text, arrow, or
  area removes the whole feature

---

## 2. Product decisions

1. Gesture-first on the existing MapLibre tools and GeoJSON annotations.
   No second annotation canvas.
2. Select/Pan is the only tool that pans on an unmodified drag.
3. **Alt/Option** (left or right) temporarily pans. **Shift+drag** lassos.
   Ctrl and Cmd are unused: Ctrl+click is right-click on macOS; Cmd fights
   the browser.
4. Area (AOI filter) and Annotate → area share one gesture set.
5. Click-drag is a rectangle (GIS default: QGIS, ArcGIS, Leaflet.Draw).
6. Shift+click-drag is a lasso, closed on pointer up.
7. Double-click starts a vertex polygon. Later single clicks add vertices.
   Clicking near the first vertex (snap) or Enter closes. Double-click does
   not finish a shape. Escape cancels the in-progress trail and stays on the
   tool.
8. Arrow is press-drag-release (tail to head). Pencil stays press-drag-release.
9. Text: one map click places the translated placeholder, focused and
   selected. Enter or click-away commits and returns to Select. Later
   single-click selects (move + resize). Double-click edits in place.
   Inspector text still works.
10. Only Text reverts to Select on completion. Other drawing tools stay
    selected for the next stroke.
11. Eraser is a new cluster button. Brush hits: clip freehand; delete other
    kinds whole.
12. Isochrone is hidden behind `enable-gis-isochrone`. When the flag is off
    the control is not rendered. When the flag is on, the existing
    later-release disabled slot is shown (Wave E still owns implementation).
13. Area and Buffer stay visible when they cannot run. They disable in place
    with the current accessible reason.
14. Measure gets pan/cursor rules and snap-to-start close. It does not get
    rectangle or lasso in this pass. Click still adds vertices; Enter still
    closes. Double-click no longer closes.
15. No `AvaMapConfig` version change. Placeholder text is a normal `text`
    string. Erasing a freehand may replace one LineString with zero or more
    LineString features.

---

## 3. Toolbar

Order, left to right:

1. Select/Pan (`IconPointer`)
2. separator
3. Area (AOI)
4. Measure
5. Buffer
6. Isochrone: omit unless `FeatureFlag.EnableGisIsochrone`
7. Annotate (expands text, arrow, freehand, area)
8. Eraser
9. separator
10. Go to

Eraser sits with the drawing tools, after Annotate, before the Go-to
separator.

---

## 4. Interaction model

### 4.1 Pan policy

| Mode | Unmodified pointer | Alt held |
| --- | --- | --- |
| Select (`pan`) | MapLibre drag-pan | drag-pan (same) |
| Any other tool | Tool gesture; `dragPan` disabled | `dragPan` enabled; tool ignores the pointer |

Alt is live: keydown enables pan even mid-tool; keyup restores the tool and
disables pan again. Ignore Alt while the event target is an input, textarea,
or contenteditable (text editing).

Double-click zoom is disabled for every non-Select tool, including Eraser.

Feature hit-testing for data layers stays Select-only (existing
`mapToolMode` gate). Annotation select/move/resize runs in Select. Eraser
does its own hit tests and does not use the data-layer click path.

### 4.2 Cursors

Set `canvas.style.cursor` from the active tool, overridden to `grab` /
`grabbing` while Alt-pan is active.

| Tool | Cursor |
| --- | --- |
| Select | `grab` at rest, `grabbing` while dragging |
| Area, annotate area, measure | `crosshair` |
| Arrow | `crosshair` |
| Pencil | `crosshair` |
| Text | `text` |
| Eraser | `cell` |

No custom PNG cursors in this pass. The CSS keyword is enough to show the
tool is armed.

### 4.3 Area and annotate-area gestures

Shared pointer machine. Movement threshold: 4 CSS pixels. Snap radius: 16
CSS pixels from the first vertex.

**Rectangle.** Pointer down (no Shift, no Alt, no active polygon trail),
move past the threshold, pointer up. The two corners become an axis-aligned
lng/lat rectangle (four corners plus close). Invalid or zero-area rings are
discarded with no toast.

**Lasso.** Shift+pointer down, track points, close on pointer up by
repeating the first vertex. Same validity check as today
(`isClosedRingValid`). Too few points: discard.

**Polygon trail.** `dblclick` (no Alt) starts the trail with that vertex.
Each later `click` appends a vertex. If the click is within the snap radius
of the first vertex and the ring would be valid, close instead of appending.
Enter closes with the current vertices. Escape clears vertices, stays on the
tool. While a trail is active, click-drag does not start a rectangle or
lasso.

Preview: live ring or lasso polyline on the existing chrome overlay.
Rectangle preview is the current rectangle. Polygon preview is the vertex
polyline, with a closing segment toward the cursor optional (not required).

AOI writes `AvaMapConfig.withAoi`. Annotate area writes
`makeAreaAnnotationFeature`.

### 4.4 Arrow

Pointer down starts the tail. Pointer move updates a two-point preview.
Pointer up commits `makeArrowAnnotationFeature(start, end)` if the screen
distance exceeds the 4px threshold; otherwise discard. Alt-pan is ignored
for the stroke (same as 4.1). Tool stays on arrow.

### 4.5 Pencil

Unchanged press-drag-release, except pan is no longer enabled between
strokes: `dragPan` stays disabled for the whole time the tool is selected,
and is only enabled while Alt is held. Pointer down still disables nothing
extra; pointer up does not re-enable pan.

### 4.6 Text

**Place.** Click (not a drag, not Alt) commits a text feature at that point
with `text` set to the translated placeholder (`Enter your text here`),
default `sizePx` and `color`. Then:

1. Select that feature (existing `lastCreatedAnnotationId` path).
2. Switch tool to Select.
3. Open an in-place editor overlay, focused, with the placeholder selected
   so the next keystroke replaces it.

**Commit editing.** Enter (without Shift) or blur. Clear the overlay. Stay
on Select. The feature remains selected. Empty string after trim is allowed
and keeps the feature.

**Re-edit.** In Select, double-click a text annotation: same overlay, caret
at end (do not re-select-all unless the value is still the placeholder).

**Inspector.** The inspector text field remains and writes the same `text`
property. It does not auto-focus on place (placeholder is non-empty).
Editing in the inspector updates the overlay if it is open, and the reverse.

**Select and move.** In Select, a single click on a text annotation selects
it. Pointer down on the selected text plus a drag past 4px moves the point.
Map pan does not run during that drag.

**Resize.** While a text annotation is selected and not being edited, show
four corner handles around its screen bounding box. Dragging a handle
updates `sizePx` by the scale of the drag relative to the text anchor,
clamped to 8..96. No rotation in this pass.

The MapLibre symbol stays the source of rendered text when the overlay is
closed. While the overlay is open, hide that one symbol (`text` layout
visibility or a filter on id) so the author does not see doubled glyphs.

### 4.7 Eraser

Pointer down + move paints a 12px-radius brush in screen space. Each move:

- Freehand: clip the LineString against the brush circle (screen space).
  Remaining runs of at least two vertices become new freehand features with
  the same paint. The original id is removed. Zero remaining runs deletes
  it. Multiple runs become multiple features.
- Text, arrow, area: if the brush circle hits the projected geometry (point
  within radius + half `sizePx` for text; any segment within radius for
  arrow; fill or stroke within radius for area), delete the whole feature.

Pointer up ends the stroke. Alt-drag pans. Tool stays on eraser.

---

## 5. Architecture

Pure geometry and policy live in small modules under
`src/views/GisApp/tools/` and
`src/views/GisApp/MapCanvas/useMapToolGestures/`. Gesture attachment stays
in `attachAnnotateGestures`, `attachRingGestures`, plus new
`attachEraseGestures` and `useMapPanPolicy`. The text overlay is a React
surface over the map canvas, not a MapLibre control.

```
MapToolClusterToolbar
  Pan | Area | Measure | Buffer | [Isochrone?] | Annotate | Eraser | GoTo

useMapToolGestures
  useMapPanPolicy          dragPan + cursor
  attachAoiGestures        rectangle / lasso / polygon
  attachMeasureGestures    vertex path, snap/Enter close
  attachAnnotateGestures   text / arrow / freehand / area
  attachEraseGestures      brush clip / delete

AnnotationTextOverlay     in-place editor + transform handles
```

Config writes go through existing `AvaMapConfig.withAnnotationFeature`,
`withoutAnnotationFeature`, and `withAoi`. Add
`withAnnotationFeatureReplaced` (one id -> zero or more features) for
eraser splits and for text/move/resize updates that already inline-map
today.

No new npm dependencies.

---

## 6. Data

`MapToolMode` gains `{ type: "erase" }`. Annotation feature shapes are
unchanged.

`FeatureFlag.EnableGisIsochrone = "enable-gis-isochrone"`. Document it in
`.env.example`.

Placeholder copy is translated at the gesture/overlay boundary with Lingui.
Do not hardcode English in `makeTextAnnotationFeature`; pass `text` in.

---

## 7. Error handling and edges

- Zero-area rectangle: no write.
- Lasso or polygon that fails `isClosedRingValid`: existing status message
  for AOI (`Close a valid ring that does not cross itself.`). Annotate area
  uses the same message. Measure still fails closed with no status if the
  ring is invalid.
- Eraser on empty map: no-op.
- Eraser while annotations are hidden: no-op (no hits).
- Text overlay unmounts on tool change away from Select, committing first.
- Escape during polygon/lasso/rectangle in progress: cancel vertices, stay
  on tool. Escape with no in-progress drawing: return to Select (existing).
- Pointer cancel: treat like pointer up without commit for rectangle/lasso/
  arrow; existing cancel for freehand.

---

## 8. Testing

Unit/integration (Vitest), TDD:

- Toolbar: Isochrone absent by default; present and disabled when the flag
  is on. Eraser visible. Order as in §3.
- Pan policy: non-Select disables `dragPan`; Alt keydown enables; keyup
  disables.
- Rectangle / lasso / polygon for AOI and annotate area.
- Arrow press-drag-release. Two clicks without a drag do not commit an
  arrow.
- Text place uses placeholder, switches to Select, overlay focused.
- `clipFreehandByEraser` / annotation hit tests as pure functions.
- Eraser deletes a text/arrow/area whole; splits a freehand.

E2E (`gis-annotations.spec.ts`):

- Place text by one canvas click; type replacement; persist.
- Draw annotation area with click-drag rectangle (not vertex+Enter).
- Do not require Isochrone in the toolbar.

Local Playwright timeout stays at 45 seconds.

---

## 9. Out of scope

- Implementing Isochrone (Wave E)
- Rectangle/lasso on Measure
- Pixel-perfect erase of arrows, text, or areas
- Rotation handles
- Custom image cursors
- Multi-touch
- Changing `AvaMapConfig` version
