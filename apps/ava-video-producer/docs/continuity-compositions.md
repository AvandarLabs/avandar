# Continuity compositions

The Composition Atlas at `/compositions.html` contains ten long explainers and thirteen reusable studies. It is linked from the Motion Atlas and Productions. Every preview uses the live React composition. The MP4 button renders the selected film with the acknowledged palette, camera, blur, annotation and caption choices through the existing serial export and frame-gate pipeline. The gallery does not use prerecorded preview files. On macOS, the existing showcase supplies local scratch narration for timing review; it is not a finished voice performance.

## Editorial choices

Professional continuity gives the viewer a reason to follow an object, a direction, or a relationship. A cut is often sufficient. Use a dissolve for a gentle change of representation, a wipe for an occluded boundary, and a persistent object when its identity explains the relationship. Use a morph only when the source and destination correspond. A decorative transition cannot supply that correspondence.

| Relationship | Useful treatment | What to preserve | Avoid |
| --- | --- | --- | --- |
| Motion to motion | Cut, short dissolve, spatial continuation, aperture, shared-object handoff | Object identity, direction, reading order, color meaning | Dissolving several layers of text together; unrelated shapes morphing without a reason |
| Motion to product | Conceptual frame opens onto a measured product region | The question or model being demonstrated; readable native text | Scaling the entire UI, invented controls, beginning an action during the reveal |
| Product to motion | Hold the result, then reveal its data or relationship model | The result's meaning and source context | Implying that the diagram is actual backend telemetry |
| Product and motion | Full native product with anchored floating artwork, a source spotlight, and timed notation | The action, its observed consequence, and one focal point | A connector that asserts an unverified data flow; tiny complete diagrams squeezed into a rail |

The authored transitions generally take 18–30 frames at 30 fps. That is a vocabulary default, not a universal rule. Native product beats stay mounted; diagrams hold their resolved pose before their stock loop reset. Diagram details depart from a measured UI source, settle in free space, and return attention to their origin. Fast diagram camera moves use temporal shutter samples; readable holds remain sharp. Captions retain a separate 160-pixel band.

A graphic match cut depends on matching the actual source and destination images. The included **Aligned-layout dissolve** keeps the editorial layout stable, but does not claim object-level graphic matching. **Frame-to-interface morph** interpolates a persistent rectangular frame and reveals the UI. It is not arbitrary SVG path morphing.

## Film collection

| Film | Composition and product sequence |
| --- | --- |
| `qetl-motion` | QETL: motion to motion |
| `qetl-to-product` | QETL: motion to product, Explorer query |
| `product-to-qetl` | QETL: product to motion, Import |
| `qetl-composite` | QETL: composite, Dashboard result |
| `ontology-motion` | Customizability: motion to motion |
| `ontology-to-product` | Customizability: motion to product, Concept metadata |
| `product-to-ontology` | Customizability: product to motion, Case record |
| `ontology-composite` | Customizability: composite, Field mapping |
| `plugin-ecosystem` | Future plugins: motion to motion |
| `right-sized-data` | Small and medium workloads: motion to motion |

The ten films run approximately 51–66 seconds each. They use different stock presets and six distinct product sequences. QETL's composite traces a static dashboard result to its illustrative dependency and reuse path; it does not depict configuring or saving the dashboard. Ontology's composite shows a rule selection and manual-field configuration. The causal-signal study isolates the rule action and its explanatory consequence.

The scripts draw on the QETL, general modeling, future marketplace, and workload arguments in the Avandar business plan. Tracked examples contain sanitized fictional inputs rather than private business-plan text. A conventional batch pipeline is an example, not a claim about every ETL system. The plugin ecosystem is explicitly future vision. Local execution includes a separate remote planning step in the illustrated example. Workload proportions and resource allocation are illustrative, with no measured speed or cost claim.

Actual product leaves come from this worktree's source and CSS. Fixture controllers determine queries, form state, navigation and results. They do not prove live persistence or backend behavior. Manual-entry controls are source-backed but feature-flagged in the live product. The visible fictional-data and architectural-illustration labels remain part of the picture.

## Reusable vocabulary

| Family | Studies |
| --- | --- |
| Transitions | Shared-object handoff; frame-to-interface morph; aperture into detail; spatial continuation; occlusion wipe; aligned-layout dissolve |
| Compositing | Action, signal, consequence; bracket a field group; focus without a connector; restrained teaching underline |
| Composition recipes | Model to workspace; record to relationships; controls and their meaning |

Each study exposes guidance, real schema paths, and its source-film link. Inputs are authored as validated storyboards, not changed through a live form editor. The gallery search and family buttons select films or studies; the existing Motion Atlas input editor continues to own individual stock-preset inputs.

## Authoring contract

### Retrieval metadata

`src/continuity/vocabulary/studyCatalog.yaml` is the source of reusable composition
metadata. Each entry includes `title`, `description`, `goodFor`, `tags`,
`creativeDirection`, and `avoid`. Tags provide keyword phrases. Creative direction
describes the visual treatment, attention sequence, and intended feel of the
authored study. The Atlas searches these semantic fields and displays the guidance
and tags in the reuse guide.

Edit this YAML directly. The Atlas, CLI, translation collector, and renderer load
the same source and validate its structure. Sample-film metadata lives alongside
it in `src/continuity/films/filmCatalog.yaml`. There is no catalog export step or
generated JSON copy to synchronize. Normal showcase rebuilds consume YAML edits.
Future embedding jobs can read the same authored files; the shared composition
search helper produces normalized semantic text without source paths or playback
settings. Embeddings are not generated by the Atlas.

### Storyboards

`src/continuity/continuitySchema.ts` defines the `continuity` scene. Start from a plan in `storyboards/explainers/`. A scene has 2–12 beats. Each beat has its duration, incoming transition, title, subtitle, and one content kind: `stock`, `product`, `composite`, or `thesis`.

| Input | Meaning |
| --- | --- |
| `beats[].duration` | Total local beat length, including overlaps |
| `beats[].transition.kind` | `cut`, `dissolve`, `wipe`, `aperture`, `spatial`, `handoff`, or `morph` |
| `beats[].transition.frames` | Incoming overlap; cut is zero, animated transitions are 1–60 frames |
| `beats[].transition.origin` | Required aperture origin, in native 1600 × 840 stage coordinates |
| `beats[].token` | Shared label, authored/measured rectangle and label/outline appearance; handoff and morph require matching identity |
| `content.request` | Complete typed StockGraphic request; labels and data remain illustrative |
| `content.settleFrame` | Stock resolved pose, restricted to frames 120–165 before the loop reset |
| `content.segment` | Feature, mode, start/end product frames and a lead-in; the beat must reach its declared end state |
| `content.source` | Measured product region in native stage coordinates |
| `content.signalAt` | Earliest causal connector timing after the relevant source state becomes visible |
| `content.effect` | `signal` permits a causal connector; `bracket` and `focus` suppress it. Notation is independently authored below |
| `content.diagrams[].at` | Ordered diagram cue within a composite beat |
| `content.diagrams[].detail` | Optional detail rectangle in the 960 × 600 stock stage, enlarged only within the floating artwork |
| `content.diagrams[].overlay` | Required `at`, `until`, and settled native-stage `target` rectangle. Leave room for the label and product controls |
| `content.annotations[]` | `kind`, `at`, `until`, measured `target`, deterministic `seed`. Box, circle, bracket, underline or highlight |
| `content.camera[]` | Ordered `at`, `x`, `y`, `zoom`, `ease` keys in diagram coordinates. Duplicate poses create reading holds |
| `content.flight` | Optional diagram-only rectangle, start, duration and departure vector |
| `accent`, `background` | Editorial palette. Native product theme is preserved |
| `cameraMotion`, `motionBlur`, `annotations` | Preview and export appearance flags. They do not retime the authored argument |
| `annotationRoughness` | Independent notation roughness, 0–3. Default 1.5. Zero keeps annotations visible with smooth strokes |
| `boxRoughness` | Independent editorial box roughness, 0–3. Default 0 preserves the original rounded boxes |

The outer StoryFilm shot order remains additive. `getContinuityTimeline()` subtracts the incoming overlaps inside a continuity scene. The shot duration must equal the final nested end frame. Adjacent overlaps must leave a readable interval.

Narration uses `shotId`, optional `beatId`, and start/end frames. With `beatId`, cue frames are relative to that beat. `absoluteCues()` resolves the same overlap schedule used by the picture. Changing an earlier overlap therefore shifts downstream captions, speech and SRT/VTT together. Cue lengths still need review when shortening a beat. Manual SRT alignment explicitly replaces beat-relative timing with recording-aligned shot timing.

Product features include Import, Explorer, Dashboards, Cases, Map, Ontology, and Attribute Mapping. Existing native `avandar` scenes keep their original feature set; the two new adapters are exposed through continuity. Product scenes require a 1600 × 840 stage, typically a 1600 × 1000 film with single-line captions. The CLI detects product and map requirements inside continuity scenes and includes the product build in preview fingerprints.

Use `pnpm video validate <plan>` and `pnpm video preview <plan>` from the producer app. Preview frames include nested boundaries and resolved poses. Inspect the frames and playback after editing. `pnpm showcase` regenerates localized copy and watches source changes. A successful rebuild refreshes the gallery and live player while preserving the selected film and the player's saved state.

## Localized copy

`pnpm continuity:messages` generates extractable descriptors from the authored films, studies and gallery copy, then extracts and compiles the Lingui catalog. The existing stock-message lifecycle invokes it for tests, showcase startup and video commands. Add translations under `src/continuity/i18n/locales/`; regional locales fall back to their base language and then English. Existing providers keep their locale and product translator. Standalone continuity scenes receive an English provider when their caller has none.

## Remotion implementation

- [TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries) owns overlap timing. Custom presentations keep opaque grounds and apply clips, translation, or an incoming opacity ramp. See [transition presentations](https://www.remotion.dev/docs/transitions/).
- [Animation utilities](https://www.remotion.dev/docs/animation-utils/) supply `makeTransform`, `translateX`, and `interpolateStyles` for ordered transforms and shared-frame geometry. Existing producer easing remains authoritative.
- [Rough notation](https://www.remotion.dev/docs/rough-notation/api) supplies deterministic `Underline`, `Box`, `Bracket`, `Circle`, and `Highlight`. A fixed seed and frame-derived progress prevent jitter. Draw once and hold; reserve the hand-drawn treatment for teaching emphasis.
- [Camera motion blur](https://www.remotion.dev/docs/motion-blur/camera-motion-blur) samples diagram subframes only while the camera or an isolated object travels. Ten samples and a 180-degree shutter avoid a long echo trail. Native product components are never duplicated for blur.
- [Effects](https://www.remotion.dev/docs/effects/) can decorate scene boundaries, but are not automatically transitions or explanations. These films favor explicit continuity over flashes or light leaks. Existing narration and sound-effect tracks remain available for audio continuity without changing picture timing.

Dependencies are pinned to the producer's existing Remotion version, 4.0.516. Documentation may show newer APIs, so implementation uses the installed exports.

## Appearance and camera direction

The Composition Atlas reuses Motion Atlas swatches and color pickers. Camera motion, motion blur, annotations and captions can be toggled independently without seeking the playhead. Speed and loop are synchronized to the active player. Downloads use its acknowledged appearance snapshot. Palette changes affect editorial graphics; actual product components keep their native theme.

Camera paths establish a wide diagram, push into one relevant detail, travel quickly to the next, and reopen the context. Align the travel with the caption or spoken change of subject. Stock objects can depart independently through an authored mask. Use these moves to direct attention, and leave the explanation still long enough to read. The product stage stays at 1600 by 840; a dedicated stacking context keeps native application layers underneath explanatory overlays.


## Independent sketch controls

Annotation roughness and Box roughness each offer Smooth (0), Subtle (0.5),
Sketch (1.5), and Rough (3) in the Composition Atlas. Storyboard continuity
props and appearance/export options also accept intermediate numeric levels,
for example `{ "annotationRoughness": 0.5, "boxRoughness": 2 }`. Settings persist
between films and reloads. Exports receive the active player's acknowledged
values. The Annotations switch controls visibility independently of roughness.

Annotation roughness applies to UI marks and teaching underlines. Box roughness
applies to shared identity tokens, floating labels, common stock panels/pills,
and the boxed cards/tables in the explainer vocabulary. Product components keep
their native appearance. StockRect uses Rough.js 4.6.6, the same version used by
Remotion's rough-notation package, with a fixed seed. It draws sketch edges as
SVG paths and leaves text unchanged. Zero returns the original SVG rectangle.
The ground, clip masks, and fill-only diagram glyphs retain their geometry.
Roughness does not vary with the animation frame, so held outlines do not boil.

The dashboard adapter isolates its native Puck canvas from frame prop updates.
Its configuration's render functions are React component identities. They stay
mounted while the chart's fixture context advances the bar-reveal clipping.
This preserves native responsive chart geometry during long composite holds.

## Reusable motion controls

All camera and transition implementations now live in the public
[reusable motion library](reusable-motion.md). Stock content accepts
`cameraOptions`; departures accept `flight.motion`; composite overlays accept
`overlay.motion` plus entry/return/fade frame durations; boundaries accept
`transition.motion`. Each supports semantic presets or numeric speed and named
or custom cubic Bezier easing. Existing plans keep their authored timing.
Slowed camera travel preserves holds; transition speed changes overlap and
must be included when recalculating shot duration. Validation checks the
resolved times.
