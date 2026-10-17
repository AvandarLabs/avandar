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
| Registered composition | An entry Remotion can render | `demo`, `title-study`, `motion-lab`, `story-film`, and 20 `stock-<preset-id>` entries |

There are **eight reusable scenes and five visual components**, plus the exported
storyboard renderer and private assembly helpers. Six scenes and the caption
overlay are additions under `src/scenes/`; the starter cursor has been replaced with native macOS assets and smooth click feedback. `StockGraphic` renders 20 authored presets from `src/stock/`. There are
24 registered compositions: three original examples, the generic `story-film`,
and the 20 stock loops. Presets are fixed authored content with an accent option,
not 20 independent general-purpose data-layout engines.

## Upstream scenes and components

| Component | Source | Inputs | Provides | Limits |
| --- | --- | --- | --- | --- |
| `TitleCard` | [title-card.tsx](../src/title-card.tsx) | `{name,kicker,frame}` | Masked word entrances, following kicker, accent rule, whole-card fade; `TITLE_LEN = 66` | Fixed single-line 92 px headline; no general fitting. The storyboard's `title` shot must last 66 frames |
| `AppFrame` | [chrome.tsx](../src/chrome.tsx) | `{w,title,heading,sub}` | Static app title bar and header, including `Orb` | No children slot, navigation, body layout, or animation; not a captured Avandar screen |
| `Cursor` | [chrome.tsx](../src/chrome.tsx) | `{frame,path,clicks?,cursor?}` | Native macOS arrow/hand/I-beam/grab assets, subpixel travel, smooth press feedback and capped motion blur | Requires measured targets and externally supplied timing; does not operate a browser |
| `Orb` | [chrome.tsx](../src/chrome.tsx) | Optional `size`, default 28 | Circular placeholder mark using brand tokens | Not Avandar's logo or an animated graph node |

## Added reusable scenes and overlay

Import these components and their prop types from
[src/scenes/index.ts](../src/scenes/index.ts). All scenes accept explicit local
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
| `StockScene` | [StockScene.tsx](../src/scenes/StockScene.tsx) | `preset`, optional six-digit hex `accent`, shared frame/size/heading props | Wraps `StockGraphic` for storyboards, repeats its 180-frame cycle, preserves aspect ratio and optional heading space | Fixed illustrative labels/data; no automatic real-data substitution or transparent output |
| `StockGraphic` | [StockGraphic.tsx](../src/stock/StockGraphic.tsx) | `preset`, `frame`, optional `width`/`height` (960 × 600), optional `accent` and `background` | Pure SVG shared by live gallery and Remotion; 20 deterministic authored graphics | Standalone frame range 0–179; opaque customizable ground with authored secondary colors; preset content lives in source, not an editable data UI |

Graphs, flowcharts, and metrics are editorial explanations of supplied evidence,
not fabricated product UI. Synthetic inputs must keep their fictional label.
Media errors remain render failures rather than being replaced with a plausible
screen. Text fitting and layout checks do not replace rendered inspection.

## StoryFilm and registration contract

| Item | Source | Contract and behavior |
| --- | --- | --- |
| `StoryFilm` | [StoryFilm.tsx](../src/storyboard/StoryFilm.tsx) | Exported React component accepting `{plan: Storyboard}`. Chooses a shot by absolute film frame, passes local time and actual dimensions, and renders captions from the same narration cues |
| `storyboardSchema` | [schema.ts](../src/storyboard/schema.ts) | Version 1 strict discriminated schema. Scene IDs are `title`, `graph`, `flowchart`, `metric`, `typography`, `media`, `stock`, `avandar`; unknown fields/scenes fail |
| `timeline()` / `durationInFrames()` | [schema.ts](../src/storyboard/schema.ts) | Accumulate ordered shot durations. Transitions occur inside a shot's duration; they do not subtract overlapping time from the total |
| `absoluteCues()` | [schema.ts](../src/storyboard/schema.ts) | Resolves narration's shot-relative bounds into the absolute film coordinates used for captions and audio exports |
| `ShotView` | [StoryFilm.tsx](../src/storyboard/StoryFilm.tsx) | Private exhaustive scene switch; not a dynamic plugin registry |
| `SceneShell` / layout helpers | [SceneShell.tsx](../src/scenes/SceneShell.tsx), [layout.ts](../src/scenes/layout.ts) | Internal shared frame, heading, geometry, fitting, formatting, and validation code; not separately registered scenes |
| `Clip({body,name,kicker})` | [Root.tsx](../src/Root.tsx) | Original private wrapper for `demo` and `motion-lab`: TitleCard, then a body `Sequence` starting at frame 66 |
| `RemotionRoot` / entry point | [Root.tsx](../src/Root.tsx), [index.ts](../src/index.ts) | Registers 24 compositions and boots Remotion |

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
| `demo` / [Demo](../src/compositions/Demo.tsx) | Upstream original | 480 frames / 16 s: 66 title + 414 body | Fixed Acme Studio query/results/filter/publish example. Inline input, chart, chips, counters and toast are not exported scenes |
| `title-study` / [TitleStudy](../src/compositions/TitleStudy.tsx) | Earlier workspace addition | 252 frames / 8.4 s | Three fixed uses of the unchanged TitleCard, each in an 84-frame slot |
| `motion-lab` / [MotionLab](../src/compositions/MotionLab.tsx) | Earlier workspace addition | 360 frames / 12 s: 66 title + 294 body | Fixed list/typing/counting/button studies with a choreographed pointer; cards remain inline |
| `story-film` / [StoryFilm](../src/storyboard/StoryFilm.tsx) | Pipeline addition | Sum of supplied shot durations; default library plan 846 frames / 28.2 s | Reusable renderer with `{plan}` props; defaults to [storyboards/library.json](../storyboards/library.json), an editorial capability study using fictional data |
| `stock-<preset-id>` / `StockGraphic` | Motion Atlas addition | Each 180 frames / 6 s, 1280 × 800 at 30 fps | One composition per ID in the [complete 20-preset catalog](stock-motion-library.md); live gallery, scene integration, and gated MP4 downloads share the renderer |

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
| [chrome.tsx](../src/chrome.tsx) | `Box`, `abs`, `BAR = 40`, `HEAD = 68`, `BODY_Y = 108`, pointer tracking and click windows |
| [fonts.ts](../src/fonts.ts) | Loads Geist normal weights 400–700 with the Latin subset; exports `FACE` and `TYPE` |
| [theme.css](../src/theme.css) | Original generic surface, foreground, border, brand, ground and radius tokens |
| [adopt-theme.mjs](../scripts/adopt-theme.mjs) | Product token/easing adoption for faithful reconstructions; not a scene |
| [capture runner](../scripts/capture-avandar.mjs) | Produces real footage and capture evidence; see [capture pipeline](capture-pipeline.md) |
| [video CLI](../scripts/video.ts) | Validates plans/media, exports shot lists/transcripts, renders composed previews, gates picture, and assembles audio |

[Scene tests](../tests/scenes.test.ts) check geometry, content fitting, traversal,
formatting, asset paths and caption boundaries. [Storyboard tests](../tests/storyboard.test.ts)
check plan/timeline/cue consistency; [pipeline tests](../tests/pipeline.test.ts)
exercise preview fingerprints and a synthetic audio mix. None is a substitute
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
