# Composition direction revision

> **For agentic workers:** Use subagent-driven-development for the controls task and final review. The user's four requested revisions authorize implementation in the existing worktree.

**Goal:** Give the ten explainers and thirteen studies richer spatial choreography, integrated UI overlays and the Motion Atlas's color/playback controls.

**Architecture:** Keep the authored continuity beat schedule and native product leaves. Add validated per-stock camera keyframes and scene presentation options. Composite scenes become full-stage product surfaces with anchored annotation and diagram layers. Gallery options flow through the same film snapshot used for preview and export.

**Tech Stack:** React, Remotion 4.0.516, matching motion-blur and rough-notation packages, Lingui, Zod.

**Spec:** User revision of October 19: shared swatches/toggles, creative zooms and motion blur, rough UI annotations, and genuine overlays rather than split panels.

## Constraints and direction

- Work only in producer, its documentation and workspace dependency lock. Keep product source unchanged.
- Preserve story arguments, caption timing and fictional/future qualifiers.
- Camera travels through SVG diagram geometry, with settled reading holds. Product text retains native scale.
- Use motion-blur samples only during fast diagram/object motion; never clone mounted product components.
- Full-stage product composites: anchored paths, focus masks, floating explanatory cutouts. No permanent two-column layout.
- Preview and export must share selected palette, camera, blur and annotation options. Existing unrelated product/stock films keep their contracts.
- Keep all renders serial. Live previews only; no automatic MP4 generation.
- Add deterministic tests for keyframe interpolation, option parity and overlay geometry; use headless Playwright for visual verification.

## Task 1: shared preview controls

**Files:** continuity/gallery, showcase LivePlayer/options/types/download declarations, ShowcaseFilms loading and tests, a dedicated continuity appearance helper. Root owns continuitySchema and rendering.

**Interfaces:** ContinuityPlan has background:string, cameraMotion:boolean, motionBlur:boolean, annotations:boolean with defaults. Existing accent remains. FilmOptions gains optional cameraMotion/motionBlur/annotations booleans. A pure helper applies validated options to continuity shots without modifying product leaves or the input object.

- [x] Red test: loading a continuity film with palette and false motion/annotation flags changes only continuity props and preserves the plan's duration/narration. Non-continuity product films continue rejecting palette overrides.
- [x] Reuse PaletteControls and its swatches/styles. Add play/pause/replay, speed and loop using existing player controls, plus camera motion/motion blur/annotation checkboxes.
- [x] Send validated appearance changes to the same-origin active iframe, retain playback and caption state, acknowledge full options before download, persist user preferences. Do not remount the product for every color edit.
- [x] Keep export parity and loading/error states. Regenerate translations through scripts, not manual catalog edits. Run focused tests and both producer typechecks.

## Task 2: camera and object choreography

**Files:** continuity camera helpers/components, continuitySchema, ContinuityContent/BeatView/Presentation, storyboards/explainers, package.json/lockfile.

- [x] Red tests: camera holds exactly, bounded target interpolation, no blur at holds, reduced movement option returns wide pose, invalid ordering/out-of-bounds cues rejected.
- [x] Add keyframes {at,x,y,zoom,ease}, with 960x600 diagram coordinates and bounded zoom. Render a viewBox camera inside the diagram viewport; use Remotion CameraMotionBlur only during movement, with time read inside the sampled child.
- [x] Author varied push, pullback and fast A-to-B paths across all films and relevant studies, retaining readable holds. Add directional object exits and restrained fast spatial-boundary blur.
- [x] Keep captions/headings outside camera transforms. Preserve all plan lengths and narration windows.

## Task 3: integrated composites and UI notation

**Files:** ContinuityComposite, annotation/diagram helpers and modules, continuitySchema, relevant film and study plans.

- [x] Red tests: native source rectangles map identically to full-stage UI; overlays remain inside safe stage bounds and clear their source; annotation visibility follows authored intervals.
- [x] Render the product once at native scale across the stage. Use focus masks and anchored floating diagrams with enter/exit travel and blur, not a static rail.
- [x] Add seeded rough boxes, circles, underlines/highlights and brackets to measured UI regions, timed after the relevant action. Overlay visibility toggles do not change product frame time.
- [x] Update extracted studies and guidance to teach the revised camera and overlay vocabulary.

## Task 4: validate and deliver

- [x] Run full producer suite, both typechecks, scoped lint/style checks, independent review.
- [x] Inspect grouped camera keyframes, transition velocity peaks and overlay source/result frames; play representative sequences at normal speed. Test palette and toggle/export parity, light/dark colors and mobile gallery.
- [x] Update authoring/validation docs with exact coverage. Copy plan, report and selected screenshots to Downloads and convert Markdown artifacts to PDFs.
