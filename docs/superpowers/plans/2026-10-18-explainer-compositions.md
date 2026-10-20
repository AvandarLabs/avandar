# Explainer compositions implementation plan

> **For agentic workers:** Use subagent-driven-development for isolated adapter work and task reviews. Execute continuously in the approved worktree. Steps use checkbox syntax for tracking.

**Goal:** Deliver ten live explanatory films and reusable transition, compositing, and composition studies in the showcase.

**Architecture:** Extend the existing StoryFilm scene registry with a typed continuity scene. A scene owns an overlapping beat schedule, uses existing stock renderers and actual product adapters, and exposes the same schedule to caption generation. Existing additive storyboards remain unchanged. Vocabulary studies use the same renderer and are browsable alongside the film collection.

**Tech Stack:** React, Remotion 4.0.516, matching transitions/animation-utils/rough-notation packages, Zod, Lingui, existing local showcase server.

**Spec:** `docs/design/explainer-compositions.md`, approved October 18, 2026.

## Global constraints

- Product source stays read-only. Do not access production services.
- Preserve the 1600 x 1000 film canvas and native-scale 1600 x 840 product stage.
- Fictional data and architectural/future illustrations remain explicit.
- No repeated product walkthroughs. Ten films cover the approved 4 + 4 + 1 + 1 matrix.
- Preserve existing stock loops, additive storyboards, licensing, live players, on-demand exports, captions, and scratch narration.
- Do not generate MP4s except on explicit CLI/download request. Validate live films and preview stills now.
- Translate new UI strings. Do not manually edit generated assets or catalogs.

## Task 1: deterministic continuity scenes

Files: `apps/ava-video-producer/src/continuity/`, existing `src/storyboard/schema/shotSchema.ts`, `src/storyboard/StoryFilm/ShotView.tsx`, producer package and workspace lockfile.

Interface: `continuitySchema` validates `{beats, handoffs, evidence}`. Each beat has a stable ID, duration, title, subtitle, and stock/product/composite content. `getContinuityTimeline` returns starts/ends accounting for overlaps. `sampleStockFrame` maps film time into a single authored reveal and reading hold, excluding reset frames. `ContinuityScene` renders the schema with the supplied `ProductSceneRenderer`.

- [x] Write timing tests asserting a 300-frame beat followed by a 240-frame beat with 24-frame overlap starts at 276 and ends at 516; reject overlapping transitions longer than an interior beat.
- [x] Write phase sampling tests showing the final film frame holds stock frame 150 instead of resetting to frame 179 or looping to zero.
- [x] Run the focused tests and confirm missing behavior fails.
- [x] Implement strict schemas, overlap timing, deterministic hold sampling, and frame-based handoff geometry. Add compatible Remotion dependencies at exactly 4.0.516.
- [x] Render matched-element, mask, wipe, spatial, and dissolve transitions using TransitionSeries and a persistent overlay. Add precise causal paths and rough annotations for composites.
- [x] Register the scene in StoryFilm and verify old storyboard tests remain green.

## Task 2: distinct ontology product sequences

Files: `avandar-adapter/OntologyScreen/`, `avandar-adapter/AttributeMappingScreen/`, `avandar-adapter/index.tsx`, narrow alias/shim files when necessary, generated bridge declaration, adapter notes.

Interface: add product feature keys `ontology` and `attribute-mapping`, each accepting `frame`, `width`, `height`. Both use actual product components and frame-controlled fixtures. New data-video-target markers identify meaningful target bounds for measurement. No network or writes.

- [x] Read existing ontology leaves and choose prop-controlled components for concept inspection and mapping configuration.
- [x] Test deterministic fixture stage transitions before implementation.
- [x] Implement separate product sequences with real components, translated copy and visible fixture provenance.
- [x] Build the product bridge, inspect rendered states, and record source boundaries. Do not change shared storyboard feature enums; the controller integrates the new keys into continuity scenes.

## Task 3: ten authored films and extracted studies

Files: `src/continuity/films/`, `src/continuity/vocabulary/`, `storyboards/explainers/`, producer inventory docs.

Interface: typed authored film data provides one continuity scene per plan, with narration cues derived from the exact beat schedule. Short vocabulary studies use the same schema and renderer.

- [x] Test that all ten plans validate, the category count is 4 motion/motion plus 2 each other category, product flows are unique, and captions fit the complete film.
- [x] Author the approved QETL, customizability, plugin, and workload arguments with complete preset inputs where default fixtures would disagree with the narration.
- [x] Build six distinct product sequences: SQL Explorer, Import, Dashboard result inspection, ontology inspection, case record detail, attribute mapping.
- [x] Extract reusable studies for shared-element handoff, aligned-layout dissolve, aperture, wipe, spatial continuation, focus handoff, causal signal, annotation, dependency lane, and composition recipes.
- [x] Validate inputs, timing and translated explanatory copy. Document stock phase semantics and adapter limits.

## Task 4: showcase delivery and visual validation

Files: `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`, `scripts/showcase/build.ts`, `showcase/compositions.html`, related gallery code/styles, `showcase/productions.html`, Motion Atlas navigation.

Interface: allowlisted showcase IDs load the same authored storyboard picture for live preview and on-demand download. The collection exposes ten films and the extracted studies, with category and evidence labels.

- [x] Test allowlisting and caption option parity for the new films.
- [x] Add a browsable collection using existing player/download routes and source-watch rebuilds.
- [x] Run relevant producer tests and both TypeScript checks.
- [x] Use headless Playwright MCP to inspect all films, transitions, native product text, captions and each vocabulary study. Store screenshots in `.temp/feat-motion-catalog/` and copy requested evidence to Downloads.
- [x] Review the full change for requirements and source fidelity. Fix concrete visual or behavioral defects and rerun affected checks.
- [x] Update the inventories and validation record. Copy the plan/report to `~/Downloads/avandar_motion-catalog/explainer-compositions/` and create PDF copies with `markdown-to-pdf`.

## Execution rulings

- User approval already authorizes execution. No additional design or execution-choice gate.
- A continuity scene uses explicit nested overlap internally; the outer StoryFilm keeps its additive schedule. This avoids silently retiming existing productions.
- Existing stock presets remain unchanged. Film phase sampling omits their editorial reset and holds the resolved frame.
- A dedicated Composition Atlas page is linked from Motion Atlas and Productions so product-backed studies do not pretend to be generic SVG stock presets.

## Completion evidence

Implemented ten films and thirteen studies. The final dashboard sequence traces a visible result rather than claiming to configure it. The aligned-layout dissolve does not claim object-level graphic matching. Frame-to-interface morphs preserve an explicit measured rectangle. Validation and its limits are recorded in `apps/ava-video-producer/docs/continuity-validation.md`.
