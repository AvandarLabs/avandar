# Composition Atlas validation

Original collection validated October 18, 2026. Direction revision verified October 19, 2026 in the `feat/motion-catalog` worktree. The collection contains ten live explainers, approximately 51–66 seconds each, and thirteen reusable studies. Open `/compositions.html` on the local showcase server. The development session uses `http://localhost:4176/compositions.html`.

## October 19 direction revision

The ten films and thirteen studies now share the Motion Atlas swatches and expose camera, blur, annotation and caption toggles. Diagram beats use authored detail stops, fast A-to-B moves and pullbacks. Isolated objects can depart independently. Both composites use one full native product stage, with source spotlights, anchored floating graphics and seeded rough notation above it. Study guidance includes camera tracks, object flights, measured marks and overlay intervals.

| Check | Current revision evidence |
| --- | --- |
| Producer tests | 2,298 passed, zero failures, skips or cancellations. Final overlay-only check also passed after compressing the reveal into departure travel |
| TypeScript | Source and tools projects passed after the final artwork timing edit |
| ESLint / Stylelint | Continuity, shared player, showcase build and loader scope passed. Generated message modules excluded from manual lint |
| Diagram motion | Headless live frames inspected for QETL close-ups, shutter blur, object departure, ontology, plugins and local execution. Normal-speed camera playback showed distinct travel samples and stable reading holds |
| Integrated UI | Dashboard source/reuse, mapping, case circle, import underline, ontology highlight and focus-without-connector frames inspected. Native application stacking corrected so overlays remain visible |
| Appearance parity | Amber / white, four disabled toggles, and captions-off reached the acknowledged player and intercepted export request unchanged. Playhead remained at 0:14. No export was started |
| Transport | 1.5x speed and loop survived film selection with matching player acknowledgment, then restored to 1x and no loop |
| Narrow gallery | 390 px viewport, 390 px document width, 354 px player. No horizontal page overflow |
| CLI still previews | QETL motion: 40 serial stills. Ontology composite: 31 serial stills. Both contact sheets inspected |
| Independent review | Three Important findings closed: transport synchronization, omitted appearance preservation, and effect-specific connectors. Required placement and safe artwork clipping also verified |

The browser reported the existing Remotion license notice, transient chart measurement warnings during mounting, and one missing favicon request. No composition runtime error was observed in the final checks. The license guard remains enabled. React Doctor's whole-branch diff scan scored 77/100 and covered substantial earlier Motion Atlas work; this is not a revision-only score. A separate 54-file continuity scan reported no errors and 23 warnings: supported strict Zod methods, the exhaustive transition presentation, an index within immutable annotation keys, and the trusted same-origin local player iframe. Scoped typechecks, strict-schema rejection tests and lint passed. No broad diagnostic cleanup or new sandbox policy was introduced.

A file-scoped design detector exception in root `.impeccable/config.json` preserves StockGraphic's existing Arial typography, as required by the producer's stock-example preservation rule. This is the sole revision edit outside producer/documentation/dependency scope.

Current review evidence is in `.temp/feat-motion-catalog/composition-revision/`. A convenient copy of the updated guide, validation, implementation plan and selected screenshots is in `~/Downloads/avandar_motion-catalog/composition-direction/`. The guide and validation in this repository remain authoritative.

The camera and compositing review samples important states and representative playback. It does not certify uninterrupted viewing/listening of every film, or an encoded MP4/frame-gate run. No MP4 was generated, and there was no push, merge, deployment or publication.

## Original collection evidence

## Delivered coverage

| Topic | Films | Product components |
| --- | --- | --- |
| QETL and a conventional batch ETL example | Four composition categories | Explorer query, source import, dashboard result |
| Configurable ontology and case management | Four composition categories | Concept metadata, case record, attribute mapping |
| Future plugin ecosystem | Motion to motion | Explicitly future vision |
| Small and medium workloads | Motion to motion | Illustrative execution placement and resource allocation |

The thirteen studies cover six transition treatments, four compositing treatments, and three composition recipes. Each includes reuse guidance, real input paths, and a link to its source film. The authoring reference is [Continuity compositions](continuity-compositions.md).

## Verification evidence

| Check | Result |
| --- | --- |
| Full producer test suite | 2,281 passed, zero failures, skips or cancellations |
| Source and tool TypeScript projects | Both pass |
| Narration preflight | All 23 current plans validate with their generated scratch-speech timing |
| Continuity, gallery, scripts and schema scoped ESLint | Pass |
| New composition CSS and whitespace checks | Pass |
| Standalone motion-only CLI preview | QETL film: 40 serially rendered stills, complete manifest and inspected contact sheet |
| Standalone product-backed CLI preview | Ontology composite: 31 serially rendered stills, complete manifest and inspected contact sheet |
| Ten long films | Sampled all beats and distinct product states in headless live previews |
| Thirteen vocabulary studies | All loaded without preview errors; transition or resolved frames inspected |
| Playback | Representative handoff, frame-to-interface, record-to-motion and causal-signal transitions played through at normal speed |
| Gallery interaction | Film/study selection, search, source-film link and selected-film URL verified |
| Caption option parity | Intercepted export request contained the selected film ID and `captions: false`; no export was started |
| Source refresh | Parent gallery refreshed after a source touch, retaining film selection and caption preference |
| Narrow screen | 390-pixel viewport had no horizontal page overflow |
| Independent review | Timing, adapter fidelity, caption alignment, annotation behavior, diagram legibility and pending-download refresh findings resolved |

The final translation regression verifies standalone English rendering and preservation of an existing non-English provider/product translator. A missing standalone provider and an unstaged local font were caught by CLI previews and corrected. A cursor dwell overlap found in the mapping sequence was corrected and covered by a regression test.

React Doctor's task-scoped scan reported nine existing warnings, chiefly CLI sequencing and older schema syntax; its Git-diff scan does not cover untracked files. New files were separately checked by tests, TypeScript, ESLint and source review. Product source under `src/`, `shared/` and `packages/` was not modified.

## Evidence locations and limits

Screenshots and command logs are under `.temp/feat-motion-catalog/`. Authoritative CLI contact sheets and manifests are under the producer's `out/qetl-motion/preview/` and `out/ontology-composite/preview/`. The review package in `~/Downloads/avandar_motion-catalog/explainer-compositions/` contains guide, plan, validation, review reports and selected visual evidence.

This review uses sampled frames and representative playback, not uninterrupted viewing and listening to every second of all twenty-three compositions. Live preview narration uses the existing local scratch voice. It is a timing aid, not a final voice performance. Product fixtures use actual React leaves and CSS but do not establish live persistence or backend execution. Future plugins and architecture diagrams retain their visible qualifiers.

MP4s were not generated. The approved delivery uses live Remotion previews and explicit on-demand downloads. The existing serial export/frame-gate path remains in place, but a full encoded export and its frame gate are not claimed as validated by still previews. No deployment, push, merge or pull request was performed.


## Independent roughness and dashboard continuity: 2026-10-19

The Composition Atlas now exposes independent Annotation roughness and Box
roughness selectors, backed by numeric properties from 0 through 3. Defaults
remain sketch annotations (1.5) and smooth boxes (0). The Annotations visibility
switch is separate. Values persist across reloads and travel through the live
player's acknowledged export options. Native product styling is unchanged.

The dashboard flicker was reproduced as 101 removals of the native chart over
a three-second playback sample. Puck configuration regeneration recreated its
React component identities. A memoized canvas now owns that configuration,
while fixture context still supplies the frame-controlled bar reveal. The
headless regression observed 120 animation frames with six visible bars,
zero chart replacements, and the original chart still connected.

Visual inspection covers smooth annotations with rough boxes, rough annotations
with smooth boxes, matched sketch treatment on cache cards, and the diagram
camera/shared token. Fixed seeds keep outlines consistent across frames. Older
animated emphasis borders now use the same box primitive as their panels.
Screenshot evidence is in `.temp/feat-motion-catalog/roughness-chart/` at the
workspace root, mirrored to `~/Downloads/avandar_motion-catalog/roughness-chart/`.

The export POST was intercepted before reaching the service and contained
annotationRoughness 0 and boxRoughness 3 after a reload. This establishes option
parity without generating an MP4. Existing fixture/product limitations apply.

Verification: source and tools TypeScript passed. Focused appearance/rendering
and export-loader tests passed. The initial full suite passed 2,300 of 2,301,
with the occupied-port startup test hitting its unchanged 30-second timeout
during concurrent builds. Its isolated rerun passed in 21.5 seconds. The final
full-suite rerun passed all 2,302 tests, including the additional animated-border
regression, with zero failures. Scoped
ESLint and Stylelint passed; the adapter's existing product alias imports need
the bundler resolver, so only its two import-resolution lint rules were disabled
for that file. The real product build and TypeScript resolved those imports.
React Doctor stayed at the prior whole-branch score of 77/100 and identified no
new diagnostic in the roughness primitive, controls, outline or dashboard canvas.
Independent scoped source review reported no actionable findings.
