# Shared scene library

This inventory distinguishes motion helpers, visual components, reusable scenes,
film assembly, and fixed examples. The [motion vocabulary](motion-vocabulary.md)
describes behavior; the [scene API](scene-api.md) documents detailed props and
limits; the [architecture assessment](agent-architecture.md) maps implementation
to the original gaps. An implemented component is not evidence that a particular
product flow or finished film has passed review.

| Layer | Meaning | Current examples |
| --- | --- | --- |
| Motion vocabulary | How an element moves or changes | `enterAt()`, `countTo()`, `mixToken()` |
| Visual component | A reusable part of a scene | `AppFrame`, `Cursor`, `Orb`, `CaptionOverlay`, `StockGraphic` |
| Reusable scene | A visual unit accepting content and timing | `TitleCard`, `GraphScene`, `FlowchartScene`, `MetricScene`, `TypographyScene`, `MediaScene`, `StockScene`, `AvandarScene` |
| Film renderer | Assembles validated shots and captions | `StoryFilm({plan})` |
| Registered composition | An entry Remotion can render | `demo`, `title-study`, `motion-lab`, `story-film`, and 170 `stock-<preset-id>` entries |

There are **eight reusable scenes and five visual components**, plus the exported
storyboard renderer and private assembly helpers. Six scenes and the caption
overlay are additions under `src/scenes/`; the starter cursor uses native macOS
assets and smooth click feedback. `StockGraphic` renders 170 registered bounded
presets from `src/stock/`: 20 legacy entries and 150 additions, with 106 general
and 64 social-sector entries. `RemotionRoot` maps the catalog through
`StockCompositions` and adds four non-stock entries, giving 174 compositions.
Every stock preset accepts a strict complete content document and palette.
The preset owns its choreography and supported layout bounds.

## Upstream scenes and components

| Component | Source | Inputs | Provides | Limits |
| --- | --- | --- | --- | --- |
| `TitleCard` | [title-card.tsx](../src/title-card.tsx) | `{name,kicker,frame}` | Masked word entrances, following kicker, accent rule, whole-card fade; `TITLE_LEN = 66` | Fixed single-line 92 px headline; no general fitting. The storyboard's `title` shot must last 66 frames |
| `AppFrame` | [chrome.tsx](../src/chrome/chrome.tsx) | `{w,title,heading,sub}` | Static app title bar and header, including `Orb` | No children slot, navigation, body layout, or animation; not a captured Avandar screen |
| `Cursor` | [chrome.tsx](../src/chrome/chrome.tsx) | `{frame,path,clicks?,cursor?}` | Native macOS arrow/hand/I-beam/grab assets, subpixel travel, smooth press feedback and capped motion blur | Requires measured targets and externally supplied timing; does not operate a browser |
| `Orb` | [chrome.tsx](../src/chrome/chrome.tsx) | Optional `size`, default 28 | Circular placeholder mark using brand tokens | Not Avandar's logo or an animated graph node |

## Added reusable scenes and overlay

Import these components and their prop types from
[src/scenes/index.ts](../src/index.ts). All scenes accept explicit local
`frame`, optional `width`/`height` (1600 × 1000 by default), and optional
`title`/`kicker`. The original parameterized scenes use `TYPE`, theme tokens, and
shared motion helpers. Each paints an opaque ground and holds its completed state
until the caller ends the shot. `StockScene` instead repeats its six-second stock
cycle and uses a separate conceptual palette and system fonts. The
[full API](scene-api.md) records defaults and errors.

| Component | Source | Content/timing contract | Implemented behavior | Limits |
| --- | --- | --- | --- | --- |
| `GraphScene` | [GraphScene.tsx](../src/scenes/GraphScene.tsx) | 1–12 `{id,label,detail?,x,y}` nodes; explicit directed edges; optional `{nodeId,atFrame}` traversal | Normalized authored placement, fitted card height, boundary-clipped connectors, staggered cards, drawn edges, current-node and traversed-edge highlighting | No force layout, collision avoidance, self-loops, parallel-edge separation, or graph camera; preview dense arrangements |
| `FlowchartScene` | [FlowchartScene.tsx](../src/scenes/FlowchartScene.tsx) | 1–6 ordered steps, explicit connectors, optional `activeStep` or `stepAtFrames` | Three-column serpentine layout with graph rendering and deterministic traversal | Branches are explicit straight links; no automatic branch routing or crossing avoidance |
| `MetricScene` | [MetricScene.tsx](../src/scenes/MetricScene.tsx) | `label`, numeric `value`, optional `from`, `unit`, `precision`, `detail`, count timing | Counts between finite values, formats decimals/grouping, fits all content and spacing together at fixed sizes for the shot, reveals detail after completion | One metric; no inferred comparisons, statistical meaning, or source provenance |
| `TypographyScene` | [TypographyScene.tsx](../src/scenes/TypographyScene.tsx) | 1–6 `lines`, exact-word `emphasis`, alignment, size, reveal and stagger timing | Multiline word wrapping, stable fitted size, individual word masks, token emphasis | Conservative width estimates; no letter animation or speech-driven word highlighting; font size ≥ 40 and stagger ≥ 2 |
| `MediaScene` | [MediaScene.tsx](../src/scenes/MediaScene.tsx) | Image/video public-relative `src`, trim, fit, position, static crop, timed normalized callouts | Real image/video loading, explicit-frame video playback, fixed media framing, callout boxes/labels | Video is muted; no remote URLs, automatic capture, moving camera, or intrinsic-pixel crop model. Crop selects the fitted plane; callouts use the final viewport |
| `CaptionOverlay` | [CaptionOverlay.tsx](../src/scenes/CaptionOverlay.tsx) | Explicit frame and ordered `{id,startFrame,endFrame,text}` cues; optional size/bottom inset | Whole-cue captions, stable wrapping, opaque backing, half-open interval selection | No overlapping cues, transcription, forced alignment, or karaoke highlighting |
| `StockScene` | [StockScene.tsx](../src/scenes/StockScene.tsx) | `StockRequest`: preset, complete optional input, schemaVersion 1, optional six-digit hex accent/background, plus shared frame/size/heading props | Validated authored content, repeating 180-frame cycle, preserved aspect ratio and optional heading space | Only omission invokes a full fictional default. Opaque output; no automatic fact extraction or binding |
| `StockGraphic` | [StockGraphic.tsx](../src/stock/StockGraphic.tsx) | Preset-discriminated `StockRequest`, explicit frame, optional width/height (960 x 600) | Pure SVG shared by live gallery and Remotion; 170 deterministic bounded content graphics | Direct frame is clamped to 0..179; opaque ground and authored secondary colors; inputs must satisfy preset schema |

Graphs, flowcharts, and metrics are editorial explanations of supplied evidence,
not fabricated product UI. Synthetic inputs must keep their fictional label.
Media errors remain render failures rather than being replaced with a plausible
screen. Text fitting and layout checks do not replace rendered inspection.

## StoryFilm and registration contract

| Item | Source | Contract and behavior |
| --- | --- | --- |
| `StoryFilm` | [StoryFilm.tsx](../src/storyboard/StoryFilm/StoryFilm.tsx) | Exported React component accepting `{plan: Storyboard}`. Chooses a shot by absolute film frame, passes local time and actual dimensions, and renders captions from the same narration cues |
| `storyboardSchema` | [schema.ts](../src/storyboard/schema/schema.ts) | Version 1 strict discriminated schema. Scene IDs are `title`, `graph`, `flowchart`, `metric`, `typography`, `media`, `stock`, `avandar`; unknown fields/scenes fail |
| `timeline()` / `durationInFrames()` | [schema.ts](../src/storyboard/schema/schema.ts) | Accumulate ordered shot durations. Transitions occur inside a shot's duration; they do not subtract overlapping time from the total |
| `absoluteCues()` | [schema.ts](../src/storyboard/schema/schema.ts) | Resolves narration's shot-relative bounds into the absolute film coordinates used for captions and audio exports |
| `ShotView` | [StoryFilm.tsx](../src/storyboard/StoryFilm/StoryFilm.tsx) | Private exhaustive scene switch; not a dynamic plugin registry |
| `SceneShell` / layout helpers | [SceneShell.tsx](../src/scenes/SceneShell.tsx), [layout.ts](../src/scenes/layout/layout.ts) | Internal shared frame, heading, geometry, fitting, formatting, and validation code; not separately registered scenes |
| `Clip({body,name,kicker})` | [Root.tsx](../src/Root.tsx) | Original private wrapper for `demo` and `motion-lab`: TitleCard, then a body `Sequence` starting at frame 66 |
| `RemotionRoot` / entry point | [Root.tsx](../src/Root.tsx), [index.ts](../src/index.ts) | Registers 174 compositions and boots Remotion |

`story-film` derives metadata from the validated plan: total duration, width,
height, and FPS. The current schema fixes FPS at 30, requires even dimensions
and matching canvas/delivery aspect ratios, and supports per-plan theme token
overrides without rewriting the starter stylesheet. The CLI additionally checks
asset existence and media duration; schema parsing alone does not do that work.

An incoming shot dissolves over a frozen final frame of the preceding shot,
with an opaque incoming root. The first shot appears without an incoming
dissolve. Loop plans fade to ground over the final 18 frames; that behavior
still needs a seam check and does not guarantee an arbitrary story loops well.
Captioned plans with narration reserve a stable band sized from the tallest
cue, with a 160 px minimum. The caption overlay and reserved band share the
same fitted geometry, including padding, border, bottom inset and 8 px clearance.
Validation rejects plans with less than 640 px of scene height left. Layout
must be reviewed at the reduced scene height. Standalone reading holds
come from authored shot durations, not an automatic ending extension.

`StoryFilm` renders picture and optional captions. Narration and sound effects
are mixed after the checked picture render by the [video pipeline](video-pipeline.md).
Text cues without audio references produce a silent film with captions.

## All registered compositions

| Render ID / component | Origin | Duration at 30 fps | Content and reuse boundary |
| --- | --- | --- | --- |
| `demo` / [Demo](../src/compositions/Demo/Demo.tsx) | Upstream original | 480 frames / 16 s: 66 title + 414 body | Fixed Acme Studio query/results/filter/publish example. Inline input, chart, chips, counters and toast are not exported scenes |
| `title-study` / [TitleStudy](../src/compositions/TitleStudy.tsx) | Earlier workspace addition | 252 frames / 8.4 s | Three fixed uses of the unchanged TitleCard, each in an 84-frame slot |
| `motion-lab` / [MotionLab](../src/compositions/MotionLab.tsx) | Earlier workspace addition | 360 frames / 12 s: 66 title + 294 body | Fixed list/typing/counting/button studies with a choreographed pointer; cards remain inline |
| `story-film` / [StoryFilm](../src/storyboard/StoryFilm/StoryFilm.tsx) | Pipeline addition | Sum of supplied shot durations; default library plan 846 frames / 28.2 s | Reusable renderer with `{plan}` props; defaults to [storyboards/library.json](../storyboards/library.json), an editorial capability study using fictional data |
| `stock-<preset-id>` / `StockGraphic` | Motion Atlas addition | Each 180 frames / 6 s, 1280 × 800 at 30 fps | One composition per ID in the [complete 170-preset catalog](stock-motion-library.md); live gallery, scene integration, and gated MP4 downloads share the renderer |

The first three MP4s and posters are tracked in
[showcase/assets](../showcase/assets/) and show the kit rather than Avandar.
The library plan's existence or successful unit tests do not establish a
reviewed final MP4. Actual Avandar examples require matching capture and render
evidence; update delivery records after those artifacts have been inspected.

## Patterns still inline or deliberately limited

| Pattern | Current implementation | Remaining reuse boundary |
| --- | --- | --- |
| Query input, typing, focus, run action | `Demo`; typing in `MotionLab` | No exported parameterized input/action scene |
| Result rows and horizontal bars | `Demo` | No general chart scene with data/scale/update contracts |
| Filter chips and selection updates | `Demo` | No reusable filter-control scene |
| Confirmation toast | `Demo` | No exported toast component |
| Progress bar and status button | `MotionLab` | No reusable progress/action scene |
| Metric comparison | `MetricScene` exposes a single number | Multiple-metric comparison layouts remain unimplemented |
| Phase handover | `StoryFilm` dissolves whole shots | No separately exported `PhaseTransition` component or arbitrary nested phase API |

## Supporting modules and verification

| Module | Current role |
| --- | --- |
| [motion.ts](../src/motion.ts) | Original curves, durations and frame helpers, plus periodic phase/pulse/loop-envelope helpers; see [motion inventory](motion-vocabulary.md) |
| [chrome.tsx](../src/chrome/chrome.tsx) | `Box`, `abs`, `BAR = 40`, `HEAD = 68`, `BODY_Y = 108`, pointer tracking and click windows |
| [fonts.ts](../src/fonts.ts) | Loads Geist normal weights 400–700 with the Latin subset; exports `FACE` and `TYPE` |
| [theme.css](../src/theme.css) | Original generic surface, foreground, border, brand, ground and radius tokens |
| [adopt-theme.mjs](../scripts/adopt-theme.mjs) | Product token/easing adoption for faithful reconstructions; not a scene |
| [capture runner](../scripts/capture-avandar/capture-avandar.mjs) | Produces real footage and capture evidence; see [capture pipeline](capture-pipeline.md) |
| [video CLI](../scripts/video.ts) | Validates plans/media, exports shot lists/transcripts, renders composed previews, gates picture, and assembles audio |

[Scene tests](../tests/scenes.test.ts) check geometry, content fitting, traversal,
formatting, asset paths and caption boundaries. [Storyboard tests](../tests/storyboard.test.ts)
check plan/timeline/cue consistency; [fingerprint tests](../tests/plan-fingerprint.test.ts) and
[audio-mixing tests](../tests/media-mixing.test.ts) exercise those separate
pipeline boundaries. None is a substitute
for contact-sheet inspection, product result verification, or watching and
listening to the finished film.

## Actual Avandar component scenes

`AvandarScene` in [src/avandar/AvandarScene.tsx](../src/avandar/AvandarScene.tsx)
adds five authored product workflows: import, Explorer, dashboards, case records,
and map layers. It renders the real imported product components, styles, theme,
and local Figtree font, with committed fictional fixtures and frame-driven
controllers. It is a product-specific scene, not another stock illustration.

The video CLI selects [src/avandar-entry.tsx](../src/avandar-entry.tsx) for these
plans, keeping Avandar's global CSS out of the generic starter and Motion Atlas.
The stage is fixed at 1600 × 840 because cursor coordinates were measured from
that rendered layout. Arrival and hold keys reuse `trackPos`, `cursorOnTarget`, and
`Cursor`. See [component videos](component-videos.md) for the direct source
integration, adapter boundaries, build instructions, and review evidence.

## Bounded stock drawing primitives

These local SVG components use authored data and contain no product algorithms.
They live under `src/stock/primitives/<Name>/<Name>.tsx`, with co-located tests.

| API | Authored bounds and behavior |
| --- | --- |
| `FitText` / `wrapTextToLines` | Fixed sizes 12, 14, 16, 18, 20, 24, 28, 32. One to eight lines. Each caller retains its own explicit cap. Conservative deterministic wrapping throws on overflow or unbreakable text by default. Opt-in `breakLongWords` splits only oversized tokens at grapheme boundaries, summing conservative base advances without charging combining marks, joiners or emoji modifiers. Fixed font sizes and line caps remain. Opt-in `normalizeWhitespace` treats plain-label hard breaks and tabs as spaces for layout while preserving the original text in aria labels and content inputs. Strict paragraph/newline behavior remains the default. |
| `LiteralDataText` | Fixed 12px single-line SVG data. Inputs are `value`, `x`, `y`, optional `color`. Raw input and aria/data attributes stay exact. Whole-grapheme whitespace receives amber underlined marks (`·`, `⇥`, `↵`, `␍`, fallback `␣`), distinct from literal marker glyphs. No wrapping, normalization or shrinking. Callers budget the full accepted value width. Used by `keyed-row-zipper`, `field-conflict-choice`, `nested-drilldown-window`, and `duplicate-review-stack`. |
| `PersonGlyph` | Local standing, seated or walking geometry. Participant, facilitator or worker presentation. Size 8..160. No demographic inputs. |
| `ObjectGlyph` | Local document, box, resource, tool, building, device or token silhouette. Size 8..160. |
| `normalizeFiniteRange` / `interpolateFiniteRange` | Renderer-free numeric helpers under `stock/numeric/`. Normalization requires finite `min < max` and an in-range finite value. Interpolation requires finite endpoints and progress in 0..1. Both reject invalid domains instead of clamping, preserve exact endpoints, and keep a central zero finite for spans such as -1e308..1e308. UncertaintyUnfold uses fixed-range normalization. LinkedParameterRehearsal uses both helpers for reversible source and output rulers. |
| `QuantityBand` / `getQuantitySegmentsFromValues` | Finite nonnegative authored values and a positive denominator. Preserves fractional shares and rejects over-allocation. No rounded token percentages. |
| `RoutePath` / `getRoutePointFromProgress` | Two to thirty-two normalized 0..1 points. Progress 0..1 follows normalized polyline length independently of previous seeks. No automatic routing. |
| `DocumentFragment` | Stable authored anchor, width 100..800, height 64, 16px text and at most two lines. Shared by prose fragments and language-to-model studies. |
| `TableCell` | Same bounded text box with table borders and optional highlighting. Missing-value labels are authored, never inferred. |
| `MembershipMarker` | Explicit included, excluded or unknown presentation. Does not decide eligibility, permissions or set membership. |

`geography/projectGlobePoint/projectGlobePoint.ts` takes longitude, latitude,
center longitude/latitude in degrees and radius. Its depth test clips rear
markers. `geography/projectGlobeGeometry/projectGlobeGeometry.ts` exports
`projectGlobeGeometry({geometry, centerLongitude, centerLatitude, radius})` and
`getGlobeLandPath(view)`. They return an origin-centered SVG path or `undefined`
when fully clipped. D3 orthographic streaming clips crossing polygons and routes
at the hemisphere. Vendored Natural Earth physical land is public domain with
source hashes, winding and reproduction details in `geography/PROVENANCE.md`.

Document fragments are shared by `prose-measurement-ledger` and
`utterance-to-model-draft`. Table cells are shared by
`query-column-cache-growth`, `pdf-grid-reconstruction` and
`repeating-blocks-to-table`. Membership markers support
`query-column-cache-growth` and `effective-permission-grants`. These names
identify implemented registered consumers. Byte-offset rulers have
one current consumer and stay private. Identity-preserving before/after strips,
permissions, grouping and spatial-cost rules remain preset-owned bounded
algorithms.

## Shared stock contracts and geometry

| Entry | API and boundary |
| --- | --- |
| [StockContract](../src/stock/contracts/StockContract.ts) | Renderer-free schemaVersion 1 contracts, metadata descriptors, bounds, semantic rules, defaults/fixtures/bindings, controls, defaultTextPaths, optional defaultSpanBindings and displayCopy. `StockRequest` preserves the selected preset/input type relationship |
| [parseStockInput](../src/stock/contracts/parseStockInput/parseStockInput.ts) | `parseStockInput(preset, rawInput?)` returns a validated complete document. Only undefined resolves the localized full default; supplied content remains exact |
| [stockRequestSchema](../src/stock/contracts/stockRequestSchema/stockRequestSchema.ts) | Strict shared version/preset/content/palette transport for React, storyboard and export boundaries |
| [LabelSlots](../src/stock/primitives/LabelSlots/LabelSlots.tsx) | `LabelSlots({labels})` accepts a readonly array of `[text,x,y,width,fontSize,maxLines]` slots. FitText normalization and whole-grapheme token wrapping use fixed sizes and reject overflow. Its local tuple type is not an exported API |
| [planarPolygon](../src/stock/geography/planarPolygon/planarPolygon.ts) | `isSimplePolygon({polygon})`; `classifyPointInPolygon({point,polygon})` -> inside/outside/boundary; `doPolygonInteriorsOverlap({firstPolygon,secondPolygon})`; `classifyDiskInPolygon({center,radius,polygon})` -> inside/intersecting/outside. Open readonly coordinate pairs with no closing duplicate. Exact binary64/BigInt predicates use no epsilon. Callers validate finite simple rings and choose boundary policy. Boundary-only polygon contact is allowed; disk inside means strict full containment, and every touch or enclosing disk is intersecting |
| [orthogonalGrid](../src/stock/geometry/orthogonalGrid/orthogonalGrid.ts) | `OrthogonalGridCell`, `areOrthogonalCellsConnected(cells)` (shared-side; empty false), `buildOrthogonalGridOutline({cells,origin,cellWidth,cellHeight})` (exposed SVG edges, holes retained). Caller validates unique safe-integer coordinates, finite origin and positive finite dimensions |
| [createStockControls](../src/stock/contracts/createStockControls/createStockControls.ts) | `createStockControls({schema,messageNamespace,referenceSelects?})`: strict required objects, bounded text/object collections, string enums and booleans. Full-path reference overrides preserve relative paths and descriptor identities. Unsupported shapes, bounds and overrides fail. Five Packet 23 consumers; numbers, tuples and nullable/unions require explicit controls or a reviewed extension |
| [createStockJsonSchema](../src/stock/contracts/createStockJsonSchema/createStockJsonSchema.ts) | `createStockJsonSchema(schema)` retains Zod draft-2020-12 conversion and explicit unrepresentable failure, preserving positional tuple types and fixed/optional/rest cardinality in contract and editor item schemas. Runtime cross-field validation remains separate |
| [localization assertions](../tests/helpers/registerStockLocalizationAssertions/registerStockLocalizationAssertions.ts) | Test-only `registerStockLocalizationAssertions({contract,expectedTextPaths,suppliedInputs})`, with independently authored expected paths and exact extraction/default-clone/supplied-input checks |
| [SVG attribute reader](../tests/helpers/getSvgAttributeMatches/getSvgAttributeMatches.ts) | Test-only `getSvgAttributeMatches({markup,attribute})` -> ordered `{tags,values}`. Exact quoted opening-tag attributes and one entity decode; not a browser/XML validator |
| [text-bounds oracle](../tests/helpers/assertSvgTextCanvasBounds/assertSvgTextCanvasBounds.ts) | Text-only bounded SVG subset and paint-envelope approximation. Text-relevance traversal excludes geometry-only unsupported transforms/clips/masks while retaining strict relevant-subtree guards and markup balance. Uses production font metrics, so it is not independent font, clipping, browser or complete occlusion evidence |

The [usage reference](stock-motion-library.md) documents transport, localization
and configured examples. [Implementation evidence](motion-atlas/implementation-validation.md)
keeps source/test, sampled-pixel, playback and export evidence separate.

**2026-10-18 evidence update:** All 170 contracts/renderers are implemented. Completed historical 167-file MP4 and 166-poster evidence retains actual 498c/source 2ad identities. R67's isolated spatial-sampling correction is reported at e5aeb3e7c/source 38c12b84; changed-scene verification and R68 continuity are complete as recorded below; whole-branch review remains pending. See [implementation evidence](motion-atlas/implementation-validation.md).


## Historical delivered media and pending current-source verification: 2026-10-18

The [completed media record](motion-atlas/implementation-media-validation-498c717d.md) preserves 167 original decoded deliveries, 166 standalone posters, the separate HTTP preview, all retained findings and corrected custody/N6 prose at actual 498c/source 2ad identities. R67's isolated spatial-sampling correction is reported at e5aeb3e7c/source 38c12b84. R67 source/media verification and R68 complete unaffected-fixture continuity are now verified. Final whole-branch review remains pending; the dated final scoped record below supersedes earlier pending wording. No historical output is relabeled as latest. These documentation updates preserve prior approved contract wording, defaults, IDs, bindings and bounds.


## Final scoped source verification and evidence custody: 2026-10-18

R67 is closed at `e5aeb3e7cb83e23f12a9255df018e25a76cc8c0e`, stock source `38c12b84bbbe3ab14171946e12b702ceb0fe2e5805504015352b0f6bedf5fdb9`. Independent source review is spec compliant and quality approved with one deferred test-helper RO-RO Minor. The controller inspected 13 actual current images. Gallery playback covered 180 states, one wrap and zero errors. The fresh default MP4 passed the unchanged gate and independent silent H.264 1280x800/30fps/180-frame/six-second probe, completed 179 decoded callbacks and ended at six seconds with zero reported dropped frames. Dense current stills show 8/12/4; default holds show 2/5/3. No globally empty selection or schema widening was introduced.

R68 is satisfied: the strict three-file local diff and the complete 169-preset comparison retain 754 fixtures and 6,786 exact pre/post frame hashes. The full current 170-preset SVG harness passed. Unaffected outputs retain their actual historical source 2ad / HEAD 498c identities under this explicit versioned carry-forward. Only the changed preset's default MP4 is freshly rendered at source 38c. Finite screenshots and SVG equality do not establish uninterrupted pixels or fresh media for the other presets. All historical readability/transient concerns and the test-helper Minor remain for final whole-branch review, which is pending.

R69 keeps exact raw reports, callback/clock traces, session/capture material and full original-report envelopes ignored and in Downloads mirrors. Durable records retain compact per-preset/candidate outcomes, all findings/dispositions/narrative limits and source/configuration/media/report hashes with local evidence pointers. A fresh clone cannot inspect local pixels/session files directly. No original local evidence was deleted.

See [current scoped verification](motion-atlas/implementation-sampling-correction-controller-verification.json) and its linked compact continuity/delivery records.


## Continuity compositions

The `continuity` storyboard scene composes stock, native product, thesis and composite beats. `ContinuityComposite` keeps one full native product mounted beneath anchored floating SVG and seeded notation. `ContinuityCameraGraphic` samples diagram-only camera paths and isolated object flights. `StockGraphic` accepts `transparent` for ground-free compositing; its default remains opaque. These are reusable scene components; the ten films and thirteen atlas studies are examples. See [continuity compositions](continuity-compositions.md) for the API, film matrix, editorial guidance and evidence limits.


StockRect and StockBoxRoughnessContext supply seeded SVG box outlines to common panels and the explainer preset boxes. StockGraphic accepts optional boxRoughness, default 0. ContinuityBoxOutline applies the same independent treatment to editorial labels/tokens. See continuity-compositions.md for scope and defaults.

## Configurable cameras and continuity primitives

[Reusable motion components](reusable-motion.md) are exported from
`src/motion-components/index.ts`: vector camera, isolated SVG departure,
anchored product overlay, persistent shared element and Remotion scene
transition factory. These are the implementations used by the current films,
with five presets plus numeric speed, blur and easing controls. Temporal
sampling remains restricted to vector artwork. Native product boundaries use
single-instance CSS blur.
