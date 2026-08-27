# GIS Map Tool UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The user asked to implement in this session; do not stop for an execution-choice prompt. Do not commit unless the user asks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GIS map tools draw on first gesture, pan only on Select or Alt, place editable text on click, hide Isochrone behind a flag, and add an eraser.

**Architecture:** Keep GeoJSON annotations on `AvaMapConfig`. Add pure geometry helpers, a pan/cursor policy hook, rewritten area/arrow/text/erase gestures, and an HTML text overlay. No new dependencies.

**Tech Stack:** React 19, MapLibre, Vitest, Lingui, Mantine, Tabler icons, existing `AvaMapConfig` v4.

**Spec:** `docs/superpowers/specs/2026-08-19-gis-map-tool-ux-design.md`

## Global Constraints

- All user-facing copy goes through Lingui (`t` / `msg` / `<Trans>`).
- Functions stay at or under 45 lines.
- CSS Modules only; no Tailwind.
- TDD: failing test first for every behavior.
- Work only in `feat/gis-ux`.
- Do not commit unless asked.
- `AvaMapConfig` version stays 4.
- Local Playwright timeout max 45s; only run related e2e files.

## File map

Create:

- `src/config/FeatureFlagConfig.ts` (modify: add `EnableGisIsochrone`)
- `src/views/GisApp/tools/MapToolMode.types.ts` (modify: add `erase`)
- `src/views/GisApp/tools/mapToolCursor/mapToolCursor.ts`
- `src/views/GisApp/tools/mapToolCursor/mapToolCursor.test.ts`
- `src/views/GisApp/tools/makeRectangleRing/makeRectangleRing.ts`
- `src/views/GisApp/tools/makeRectangleRing/makeRectangleRing.test.ts`
- `src/views/GisApp/tools/isPointerNearVertex/isPointerNearVertex.ts`
- `src/views/GisApp/tools/isPointerNearVertex/isPointerNearVertex.test.ts`
- `src/views/GisApp/tools/clipFreehandByEraser/clipFreehandByEraser.ts`
- `src/views/GisApp/tools/clipFreehandByEraser/clipFreehandByEraser.test.ts`
- `src/views/GisApp/tools/hitTestAnnotation/hitTestAnnotation.ts`
- `src/views/GisApp/tools/hitTestAnnotation/hitTestAnnotation.test.ts`
- `src/views/GisApp/MapCanvas/useMapToolGestures/useMapPanPolicy.ts`
- `src/views/GisApp/MapCanvas/useMapToolGestures/useMapPanPolicy.test.ts`
- `src/views/GisApp/MapCanvas/useMapToolGestures/attachEraseGestures.ts`
- `src/views/GisApp/shell/MapToolCluster/EraseMapTool.tsx`
- `src/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay.tsx`
- `src/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay.module.css`
- `src/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay.test.tsx`

Modify:

- `src/views/GisApp/shell/MapToolCluster/MapToolClusterToolbar.tsx`
- `src/views/GisApp/shell/MapToolCluster/IsochroneMapTool.tsx` (gate render)
- `src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx`
- `src/views/GisApp/MapCanvas/useMapToolGestures/attachRingGestures.ts`
- `src/views/GisApp/MapCanvas/useMapToolGestures/attachAnnotateGestures.ts`
- `src/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures.ts`
- `src/views/GisApp/tools/makeAnnotationFeatureHelpers.ts`
- `src/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateMapTool.test.tsx`
- `src/views/GisApp/shell/MapToolCluster/AnnotateMapTool/annotateMapToolHarness.ts`
- `src/views/GisApp/shell/MapToolCluster/createFakeMap.ts`
- `src/views/GisApp/panels/LayerInspector/AnnotationFeatureInspector/AnnotationFeatureInspector.tsx`
- `src/views/GisApp/GisAppMapShell.tsx`
- `src/views/GisApp/layers/makeMapSpecFromAnnotations/makeMapSpecFromAnnotations.ts`
- `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts` (re-export updater)
- `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/overlayConfigUpdaters/overlayConfigUpdaters.ts`
- `.env.example`
- `tests/e2e/gis-annotations.spec.ts`

---

### Task 1: Hide Isochrone behind a flag; add Eraser slot

**Files:** FeatureFlagConfig, MapToolClusterToolbar, IsochroneMapTool, EraseMapTool, MapToolMode.types, MapToolCluster.test, .env.example

**Produces:** `FeatureFlag.EnableGisIsochrone = "enable-gis-isochrone"`; `MapToolMode` includes `{ type: "erase" }`; toolbar order Select, Area, Measure, Buffer, optional Isochrone, Annotate, Eraser, Go to.

- [ ] **Step 1:** Extend `MapToolCluster.test.tsx` so default labels do not include Isochrone and do include Eraser (`Erase annotations`). Keep Area/Buffer disabled reasons.

- [ ] **Step 2:** Run `pnpm exec vitest run src/views/GisApp/shell/MapToolCluster/MapToolCluster.test.tsx`. Expect FAIL (Isochrone still present, no Eraser).

- [ ] **Step 3:** Add the flag, `{ type: "erase" }`, `EraseMapTool` (pressed when `mapToolMode.type === "erase"`), omit `IsochroneMapTool` unless `isFlagEnabled(FeatureFlag.EnableGisIsochrone)`, document the flag in `.env.example`.

- [ ] **Step 4:** Re-run the test. Expect PASS. Add a second test that with the flag mocked on, Isochrone is present and `aria-disabled`.

---

### Task 2: Pure helpers (rectangle, snap, cursor, clip, hit-test)

**Produces:**

```ts
makeRectangleRing(a: Vertex, b: Vertex): Vertex[]
isPointerNearVertex(options: {
  pointer: { x: number; y: number };
  vertex: Vertex;
  project: (vertex: Vertex) => { x: number; y: number };
  radiusPx: number;
}): boolean
mapToolCursor(options: {
  mapToolMode: MapToolMode;
  isAltPanHeld: boolean;
  isPointerDown: boolean;
}): string
clipFreehandByEraser(options: {
  coordinates: ReadonlyArray<Vertex>;
  eraser: { x: number; y: number };
  radiusPx: number;
  project: (vertex: Vertex) => { x: number; y: number };
}): Vertex[][]
hitTestAnnotation(options: {
  feature: AvaMapConfig.AnnotationFeature;
  eraser: { x: number; y: number };
  radiusPx: number;
  project: (vertex: Vertex) => { x: number; y: number };
}): boolean
```

`Vertex` is `[number, number]` as `[lng, lat]`.

Clip rule: drop any vertex whose projected point is inside the brush; split the line at gaps; keep pieces with length >= 2. Also drop a segment if both endpoints are outside but the closest point on the segment is inside (split at the two circle-line intersections when a segment crosses the brush). Prefer the segment-crossing split so a single eraser dab can cut a stroke.

Constants (export from the helper that uses them first, then share if needed):

- `MAP_TOOL_DRAG_THRESHOLD_PX = 4`
- `MAP_TOOL_SNAP_RADIUS_PX = 16`
- `MAP_TOOL_ERASER_RADIUS_PX = 12`

- [ ] **Step 1:** Write tests for a non-zero rectangle ring, a zero-area discard helper (empty array or caller checks width), snap true/false, cursor table from the spec, clip that splits one stroke into two, hit-test true for a point on a line.

- [ ] **Step 2:** Run the new test files. Expect FAIL (modules missing).

- [ ] **Step 3:** Implement the helpers. Keep each file's main export <= 45 lines by extracting private helpers in the same folder.

- [ ] **Step 4:** Re-run. Expect PASS.

---

### Task 3: Pan policy and canvas cursor

**Files:** `useMapPanPolicy.ts`, tests, wire from `useMapToolGestures.ts`

**Produces:** `useMapPanPolicy({ mapRef, mapToolMode })` enables `dragPan` iff mode is `pan` or Alt is held (and the event target is not a typing field). Sets canvas cursor via `mapToolCursor`. Disables `doubleClickZoom` when mode is not `pan`.

- [ ] **Step 1:** Test with the annotate fake map: selecting Area calls `dragPan.disable`; Alt keydown calls `enable`; keyup calls `disable`; canvas cursor becomes `crosshair` then `grab`.

- [ ] **Step 2:** Run the test. Expect FAIL.

- [ ] **Step 3:** Implement and call from `useMapToolGestures`. Stop re-enabling pan on freehand pointerup except through this policy (freehand must not call `dragPan.enable()` on up).

- [ ] **Step 4:** Re-run annotate freehand tests and the new policy test. Expect PASS. Update freehand tests that asserted `dragPan.enable` on pointerup: they should assert pan stays disabled after a stroke while the tool is still freehand.

---

### Task 4: Area / AOI / annotate-area gestures

**Files:** `attachRingGestures.ts`, `attachAnnotateGestures.ts`, fake maps (add `emitDblClick`, `emitPointerDown/Move/Up` with `shiftKey`, `getCanvas`, `dragPan`, `project`/`unproject`), MapToolCluster and Annotate tests.

Rectangle: pointerdown + move > 4px + pointerup writes a four-corner ring.
Lasso: shift+pointer path, close on up.
Polygon: dblclick starts; clicks append; snap or Enter closes.
Escape with in-progress vertices clears and stays on the tool; Escape with none returns to pan.

- [ ] **Step 1:** Replace AOI "clicks then Enter" commit test with a rectangle drag commit. Add lasso and polygon-snap tests. Same for annotate area. Keep the self-intersecting polygon test using the trail + Enter.

- [ ] **Step 2:** Run those tests. Expect FAIL.

- [ ] **Step 3:** Implement the shared pointer machine. AOI callbacks still `withAoi`; annotate area still `makeAreaAnnotationFeature`. Preview vertices for rectangle are the ring; for lasso/trail the tracked points.

- [ ] **Step 4:** Re-run. Expect PASS.

---

### Task 5: Arrow press-drag-release

**Files:** `attachAnnotateGestures.ts`, `AnnotateMapTool.test.tsx`, harness pointer helpers.

- [ ] **Step 1:** Change the two-click arrow test to pointerdown (0,0) + move (1,1) + pointerup. Add a test that two clicks without movement do not create an arrow.

- [ ] **Step 2:** Run. Expect FAIL.

- [ ] **Step 3:** Replace click-click arrow with drag. Keep two-point preview on `annotationPreviewVertices`.

- [ ] **Step 4:** Re-run. Expect PASS.

---

### Task 6: Text place, overlay, revert to Select

**Files:** `makeAnnotationFeatureHelpers.ts` (`text` argument, no empty default), `attachAnnotateGestures.ts` (after commit, `onMapToolModeChange({ type: "pan" })`), `AnnotationTextOverlay`, `GisAppMapShell`, inspector `autoFocus` removed for text, AnnotateHarness tests.

Placeholder string is passed from `useMapToolGestures` via `useLingui()` `t\`Enter your text here\``.

Overlay: contenteditable or textarea, `aria-label` from Lingui (`Annotation text`), position with `map.project`. On mount, focus and select all. Enter (no Shift) or blur commits. While open, filter the MapLibre symbol for that id to `visibility: none` (or omit that feature from the annotation spec).

- [ ] **Step 1:** Change "places a text feature with empty text and focuses the input" to expect placeholder value, Select pressed, and an overlay textbox focused (not the inspector auto-focusing empty).

- [ ] **Step 2:** Run. Expect FAIL.

- [ ] **Step 3:** Implement place + overlay. Wire overlay in `GisAppMapShell` as a sibling of `MapCanvasSurface`, using `app.mapRef` / `app.mapInstance.mapRef` and selected text feature.

- [ ] **Step 4:** Re-run annotate tests and overlay unit tests. Expect PASS.

---

### Task 7: Text move and resize in Select

**Files:** overlay handles + Select-mode pointer handlers (new `attachSelectAnnotationGestures` or a branch in pan attachment).

- [ ] **Step 1:** Tests: pointerdown+drag on a selected text feature updates coordinates; corner handle drag changes `sizePx` inside 8..96.

- [ ] **Step 2:** Run. Expect FAIL.

- [ ] **Step 3:** Implement. Disable `dragPan` for the duration of a text move/resize even in Select.

- [ ] **Step 4:** Re-run. Expect PASS.

---

### Task 8: Eraser gestures

**Files:** `attachEraseGestures.ts`, `overlayConfigUpdaters.withAnnotationFeaturesReplaced`, toolbar already has EraseMapTool.

```ts
withAnnotationFeaturesReplaced(options: {
  config: AvaMapConfigRead;
  featureId: AnnotationFeatureId;
  nextFeatures: readonly AnnotationFeature[];
}): AvaMapConfigRead
```

- [ ] **Step 1:** Tests: eraser drag over a text feature deletes it; over a freehand mid-stroke yields two freehand features; Alt during eraser does not erase.

- [ ] **Step 2:** Run. Expect FAIL.

- [ ] **Step 3:** Implement attach + wire `{ type: "erase" }` in `_attachGesturesForMode`.

- [ ] **Step 4:** Re-run. Expect PASS.

---

### Task 9: Measure snap-close; e2e; chrome preview

**Files:** `attachRingGestures.ts` (measure), `gis-annotations.spec.ts`, optionally annotation preview fill for closed rings.

Measure: disable dblclick-to-close; close on snap-to-first or Enter. Pan policy already covers Measure.

E2E: one-click text place; rectangle drag for area; do not query Isochrone.

- [ ] **Step 1:** Update measure tests if any assert dblclick close. Update e2e helpers.

- [ ] **Step 2:** Run `pnpm exec vitest run src/views/GisApp/shell/MapToolCluster src/views/GisApp/MapCanvas/useMapToolGestures src/views/GisApp/tools src/views/GisApp/shell/AnnotationTextOverlay`. Expect PASS.

- [ ] **Step 3:** Run `pnpm test:e2e gis-annotations.spec.ts` only.

- [ ] **Step 4:** Fix until green.

---

## Spec coverage

| Spec section | Task |
| --- | --- |
| Hide Isochrone, Eraser slot | 1 |
| Rectangle / snap / clip / hit / cursor | 2 |
| Alt pan, cursors, dragPan | 3 |
| Area gestures | 4 |
| Arrow drag | 5 |
| Text place + overlay + revert | 6 |
| Text move + resize | 7 |
| Eraser | 8 |
| Measure snap, e2e | 9 |
