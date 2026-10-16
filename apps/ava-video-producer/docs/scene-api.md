# Reusable scene API

Import scenes and their TypeScript prop types from `src/scenes/index.ts`.
These are reusable editorial scenes. Graphs, flowcharts, and metrics describe
authored concepts and data; they do not recreate or make claims about Avandar's
interface. Existing `TitleCard`, `Demo`, `TitleStudy`, and `MotionLab` remain
separate and unchanged.

The added `StockScene` accepts a named preset rather than arbitrary data; see
the [stock catalog and API](stock-motion-library.md) for all 20 references.
Its props are `{preset, accent?, frame, width?, height?, title?, kicker?}`.
`preset` is a typed catalog ID, `accent` is a six-digit hex color, and its fixed
180-frame cycle repeats for longer shots. It uses its own opaque conceptual
palette, preserves the SVG aspect ratio, and reserves 200 px when a heading is
provided. Labels/data remain illustrative constants in the renderer.
The strict storyboard scene ID is `stock`; unknown presets fail validation.

Every scene takes `frame`, a scene-local frame number, and optional `width`
and `height` (defaults: 1600 × 1000). Pass actual composition dimensions for
1920 × 1080 films. All timing values are frame counts, with defaults designed
for the kit's 30 fps timeline. Every scene root paints `--ground` opaquely;
the stock SVG paints its own background inside that shell. Media uses a compact
inline heading and 24 px margins to keep captured UI readable.
The storyboard renderer owns shot duration and transitions; these components
keep their completed state visible for the caller's reading hold.

All six components use `TYPE`, the existing theme tokens, and the shared motion
helpers. Typography moves through masks or short translations, with no text
scaling. A font size is selected once from the complete content and dimensions,
then remains fixed throughout the animation.

## Shared scene props

| Prop | Type | Behavior |
| --- | --- | --- |
| `frame` | `number` | Required, finite, scene-local time. All motion is derived from this value |
| `width`, `height` | `number` | Canvas pixels. Layouts target 1600 × 1000 and 1920 × 1080; dimensions below 960 × 640 are rejected |
| `title` | `string?` | Heading above the content, fitted at a fixed 32–48 px size; MediaScene uses a compact 28–36 px title and 18–24 px kicker |
| `kicker` | `string?` | Supporting heading copy, revealed after the title |

Keep heading copy short. Font fitting is a conservative character-width estimate,
not a browser font-measurement service. Text that cannot fit at a readable size
throws with an instruction to shorten it or split it across scenes. Rendering
and contact-sheet inspection remain required, particularly for long labels,
non-Latin scripts, and dense graphs.

## GraphScene

```tsx
<GraphScene
  frame={frame}
  title="A directed relationship"
  nodes={[
    { id: "input", label: "Input", detail: "Authored source material", x: 0, y: 0.5 },
    { id: "result", label: "Result", detail: "The reviewed output", x: 1, y: 0.5 },
  ]}
  edges={[{ id: "input-result", from: "input", to: "result", label: "informs" }]}
  traversal={[{ nodeId: "input", atFrame: 24 }, { nodeId: "result", atFrame: 84 }]}
/>
```

| Prop | Type / default | Behavior |
| --- | --- | --- |
| `nodes` | `GraphNode[]`, required | 1–12 nodes with unique `id`, nonempty `label`, optional `detail`, and `x`,`y` in 0–1 |
| `edges` | `GraphEdge[]`, required | Unique `id`, existing `from` and `to` node IDs, optional `label`. Self-edges are rejected |
| `traversal` | `TraversalBeat[]`, `[]` | `{nodeId, atFrame}` events in strictly increasing frame order |
| `revealAtFrame` | `number`, `10` | First card entrance; cards stagger in source order using `STAGGER` |

Coordinates describe centers within an inset content area, so a node at 0 or 1
is still fully visible. Card height is fitted once from the complete copy,
with a 128 px minimum, then stays fixed throughout the shot. Connectors meet card
boundaries rather than crossing their text. Edges draw after both endpoint
cards enter. Traversal highlights the current node and draws each traversed
directed edge; visited edges remain highlighted. Selecting a later node does
not invent an edge when no matching connector exists.

Layout is authored, not automatic. There is no force-directed layout, edge
collision avoidance, parallel-edge separation, self-loop drawing, or graph
camera. Keep nodes apart and connector labels short, then inspect the preview.
The 12-node limit is a ceiling, not a promise that any 12 authored positions or
long descriptions will fit.

## FlowchartScene

| Prop | Type / default | Behavior |
| --- | --- | --- |
| `steps` | `FlowStep[]`, required | 1–6 `{id,label,detail?}` entries, in reading order |
| `connectors` | `FlowConnector[]`, required | Explicit `{from,to,label?}` directed links. Branching is supported by multiple links |
| `stepAtFrames` | `number[]?` | One increasing activation frame per step; defaults to `revealAtFrame + DUR.sheet + index * 60` |
| `activeStep` | `string?` | Explicit node ID to hold highlighted, overriding automatic progression |
| `revealAtFrame` | `number`, `10` | First step entrance |

Steps use a three-column serpentine grid: left to right across the first row,
right to left across the second. Connectors use straight directed paths and
share graph rendering and validation. Nonadjacent branches can cross other
paths or cards; there is no orthogonal routing or automatic branch solver.
Use explicit graph positions when the process needs a more complex layout.

## MetricScene

| Prop | Type / default | Behavior |
| --- | --- | --- |
| `label`, `value` | `string`, finite `number` | Required description and final number |
| `from` | `number`, `0` | Starting value, including negative or fractional values |
| `unit` | `string?` | Suffix beside the number, such as `%`, `ms`, or `items` |
| `precision` | integer `0`–`6`, `0` | Decimal digits; fixed `en-US` formatting adds thousands separators |
| `detail` | `string?` | Supporting copy that enters after the count completes |
| `countAtFrame` | `number`, `18` | Counter start |
| `countDurationInFrames` | positive integer, `36` | Counter duration |

The number interpolates with the existing `ramp()` and `mix()` helpers. Labels
and numeric formatting are caller data. Font sizing reserves both endpoints
before animation, avoiding size changes while digits update. The complete
label, number/unit, detail, padding and gaps are fitted together to the
available height; their sizes remain fixed for the entire shot. Compact
layouts reduce type and spacing within their minimums, and an unsupported
amount of content fails instead of overflowing. The scene does not infer
comparisons, significance, percentages, or source provenance.

## TypographyScene

| Prop | Type / default | Behavior |
| --- | --- | --- |
| `lines` | `string[]`, required | 1–6 nonempty authored lines. Long lines wrap at word boundaries |
| `emphasis` | `string[]`, `[]` | Exact case-sensitive word matches, including punctuation, use `--brand-strong` |
| `align` | `"left"` or `"center"`, `"center"` | Text alignment |
| `fontSize` | `number`, `92` | Requested maximum, 40–160 px; fitting may choose a smaller fixed size |
| `revealAtFrame` | `number`, `6` | First word begins rising through its own mask |
| `wordStaggerFrames` | integer ≥ 2, `3` | Frames between words across all lines |

Words use `DUR.word` and `EASE.word`. There is no per-letter animation or
opacity animation on masked words. Emphasis is authored, not timed to speech;
the library does not infer narration timing. The caller must allow enough
shot duration for all words to reveal and then hold.

## MediaScene

| Prop | Type / default | Behavior |
| --- | --- | --- |
| `kind` | `"image"` or `"video"` | Required media type |
| `src` | `string`, required | Public-relative asset path, for example `captures/review/screen.png` |
| `trimBefore` | nonnegative integer, `0` | Composition frames at `plan.fps`; `30` means one second at 30 fps |
| `fit` | `"contain"` or `"cover"`, `"contain"` | How the media fits its plane |
| `objectPosition` | `{x,y}`, `{x:0.5,y:0.5}` | Normalized alignment for contain/cover |
| `crop` | `{x,y,width,height}?` | Static normalized selection of the fitted media plane, all values within 0–1 |
| `callouts` | `MediaCallout[]`, `[]` | `{id,label,x,y,width,height,startFrame,endFrame}` with unique IDs |

`src` resolves with `staticFile()`. Absolute paths, external URLs, traversal,
encoded paths, query strings, and fragments are rejected. Image/video failures
keep Remotion's normal render-failure behavior; the scene does not silently
replace unavailable media. The pipeline must validate file existence and
source video duration before rendering. Images use Remotion's `Img` loader;
videos use `OffthreadVideo` inside `Freeze` so the explicit scene-local frame
determines the source time. Video is muted; the narration/audio assembly owns
the film's sound track.

Crop is relative to the fitted media plane, not intrinsic source pixels. The media is fitted once at the original plane dimensions, then the selected rectangle is translated and scaled into the viewport. Use equal crop width and height to preserve aspect ratio; unequal values stretch the selection independently on each axis. It is static and does not animate a camera over captured interface text. Callout
rectangles are relative to the **final visible media viewport**, including any
letterboxing. Derive those boxes from rendered captures and verify them after
changing fit or crop. They fade within their half-open `[startFrame,endFrame)`
intervals. Labels stay within the viewport, but overlapping callouts are not
automatically rearranged.

## CaptionOverlay

| Prop | Type / default | Behavior |
| --- | --- | --- |
| `frame` | `number`, required | Frame in the same coordinate system as the cues |
| `cues` | `CaptionCue[]`, required | `{id,startFrame,endFrame,text}` with unique IDs, ordered nonoverlapping intervals |
| `width`, `height` | `number`, `1600`,`1000` | Canvas dimensions |
| `bottom` | `number`, `48` | Bottom inset in pixels |
| `fontSize` | `number`, `38` | Requested size; fits down to 28 px if necessary |

The current cue is selected by `startFrame <= frame < endFrame`; gaps display
nothing and a boundary cannot show two cues. Captions wrap into an opaque
token-colored box within 84% of the canvas width. Text fitting uses up to 23%
of canvas height before adding padding and borders. `captionGeometry()` in
the shared layout helpers supplies both the overlay's exact box size and its
required bottom band: fitted text height, 36 px vertical padding, 2 px border,
the bottom inset and 8 px clearance. `StoryFilm` reserves the tallest cue's
band for every shot, with a 160 px minimum, so scene height never changes
between cues. Storyboard validation rejects plans that leave less than 640 px
for scene content. Standalone scene callers must reserve the same geometry
when adding their own overlay. Overlap and malformed
cue intervals fail explicitly. This is whole-cue captioning, with no karaoke
word highlights, speech transcription, or automatic audio alignment.

## Verification boundary

`tests/scenes.test.ts` covers graph bounds and connector geometry, traversal
under random frame seeks, flow layout order, numeric formatting, fixed text
fitting, media paths/crops, and exact caption boundaries. Run it with:

```sh
npx tsx --test tests/scenes.test.ts
npm run typecheck
```

These checks establish deterministic data/layout behavior. They do not replace
rendered preview inspection, audio alignment review, or the required frame gate.

## `avandar` storyboard scene

```json
{"id":"product","scene":"avandar","durationInFrames":660,
 "transitionInFrames":18,"props":{"feature":"import","fromFrame":0,"mode":"full"}}
```

Features are `import` (660 frames), `explorer` (800), `dashboards` (720),
`cases` (660), and `map` (720). `fromFrame` selects the start of the authored
workflow; the shot must fit within it. The stage must be 1600 × 840, normally
a 1600 × 1000 canvas with single-line captions in the reserved 160 px band.
Explorer also supports `filter`, `query`, and `chart` segments, capped at
300, 330, and 230 frames respectively. Other features require `full`.

Use the video CLI, which selects the isolated product entry automatically.
These scenes reuse actual product code and fixture state; they do not execute
backend writes or provide a browser automation interface. See
[component videos](component-videos.md).
