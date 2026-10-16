# Motion vocabulary

This is the complete inventory of the motion vocabulary currently implemented in this workspace. Motion vocabulary describes **how things move**: curves, durations, entrances, state changes, typing, counting, and pointer choreography. The [shared scene library](shared-scene-library.md) describes **what gets assembled on screen**. The [architecture assessment](agent-architecture.md) distinguishes shipped capabilities from work still to build.

The code is the source of truth. The rules for using it live in the [product-demo skill](../.claude/skills/product-demo/SKILL.md) and its [motion](../.claude/skills/product-demo/references/motion.md), [title](../.claude/skills/product-demo/references/titles.md), and [rendering](../.claude/skills/product-demo/references/render.md) references. The original primitives in `src/motion.ts` remain unchanged; three periodic helpers were added for Motion Atlas. Scenes and stock graphics share this module, without a second easing vocabulary.

For visual reference, browse [Motion Atlas](../showcase/motion.html), served at **http://localhost:4173/motion.html**. Its [stock catalog](stock-motion-library.md) names 20 combinations of these primitives: graphs, node traversal, plexus fields, integrations, code highlighting, charts, and interface motion. A primitive is how something moves; a stock preset is a reusable authored graphic that demonstrates those movements.

## Time and coordinates

- The current timeline is **30 fps**. One frame is approximately 33.3 ms. Durations and beat positions are frame counts unless explicitly stated otherwise.
- Helpers are deterministic functions of a frame number. They do not schedule animations or depend on wall-clock time. The caller supplies the frame, normally from Remotion's `useCurrentFrame()`.
- Frames inside a Remotion `Sequence` are local to that sequence. The `Clip` wrapper starts its body at `TITLE_LEN = 66`; body frame 0 is therefore film frame 66. Do not manually add that offset to body click beats or pointer keys.
- FPS is separately defined in [Root.tsx](../src/Root.tsx), [motion.ts](../src/motion.ts), and the render/audio scripts. Changing the composition FPS alone does not retime typing, caret blinking, encoding, or sound scoring.
- The original canvas is 1600 × 1000, delivered at 1536 × 960. `story-film` derives canvas and delivery dimensions from its plan, with the same aspect ratio. Pointer coordinates belong to the composition canvas, not the scaled delivery file.
- `StoryFilm` passes each scene its local frame directly. Narration cues are shot-relative in the plan and converted to absolute film frames for captions/audio. Transitions occupy the beginning of an incoming shot without changing total duration.
- Browser capture is a separate timebase: native Playwright video is 25 fps and logged actions use monotonic milliseconds. Normalize or verify source timing before choosing 30 fps film trims; do not treat browser action timestamps as exact rendered-frame keys.

## Curves

All five curves are exported through `EASE` in [src/motion.ts](../src/motion.ts). The upstream comment says four; the implemented object contains five.

| Token | Definition | Intended use |
| --- | --- | --- |
| `EASE.out` | `bezier(0.16, 1, 0.3, 1)` | Default entrances, exits, and state responses |
| `EASE.outBack` | `bezier(0.34, 1.56, 0.64, 1)` | A restrained overshoot when something lands in its slot; use sparingly |
| `EASE.inOut` | `bezier(0.45, 0, 0.55, 1)` | Something already visible travelling between positions |
| `EASE.inOutCubic` | `4t³` for the first half; `1 - (-2t + 2)³ / 2` for the second | Pointer travel between targets |
| `EASE.word` | `bezier(0.22, 1, 0.36, 1)` | Headline words rising out of masks |

`bezier(x1, y1, x2, y2)` is also exported. It creates a CSS-style cubic-bezier easing function, returning 0 at inputs at or below 0 and 1 at inputs at or above 1. Curves such as `outBack` can overshoot between those endpoints. There is no ease-in entrance token in the current vocabulary.

## Duration scale

`DUR` and `STAGGER` are exported from [src/motion.ts](../src/motion.ts).

| Token | Frames | Time at 30 fps | Intended use |
| --- | ---: | ---: | --- |
| `DUR.press` | 4 | 133 ms | One half of the press response |
| `DUR.chip` | 6 | 200 ms | Chip/state changes and default exits |
| `DUR.panel` | 9 | 300 ms | Row, card, or panel entrance; default ramp duration |
| `DUR.sheet` | 13 | 433 ms | Sheet/column motion; default spring and counter duration |
| `DUR.hero` | 18 | 600 ms | The main visual beat of a phase |
| `DUR.word` | 15 | 500 ms | One title word's masked rise |
| `STAGGER` | 2 | 67 ms | Delay between list siblings |

The full `press()` envelope occupies **8 frames**, twice `DUR.press`. The title card has its own **3-frame word stagger**; it does not use the list's `STAGGER` constant. Longer reading holds and scene lengths are composition decisions, not additional exported duration tokens.

## Numeric and style helpers

These are all the exported functions in [src/motion.ts](../src/motion.ts), including the easing constructor described above.

| API | Returns / behavior | Defaults and limits |
| --- | --- | --- |
| `bezier(x1, y1, x2, y2)` | An easing function | CSS cubic-bezier control points; permits an overshooting curve |
| `ramp(frame, at, dur?, easing?)` | Progress through a timed interval | `dur = DUR.panel`, `easing = EASE.out`; clamps input progress to 0…1, but an overshooting easing can produce values outside that range |
| `mix(t, from, to)` | Numeric interpolation: `from + (to - from) * t` | Does not clamp `t`; combine with `ramp()` for timed style values |
| `mixToken(t, from, to)` | An OKLab CSS `color-mix()` string | Clamps `t` to 0…1 and rounds to whole percentages; pass token references such as `var(--border)` and `var(--brand)` |
| `enter(frame, at, opts?)` | `opacity` plus a translation and optional scale, ending at rest | Defaults: 9 frames, `x: 0`, `y: 12`, `scale: 1`, `EASE.out`. Options: `dur`, `x`, `y`, `scale`, `easing` |
| `enterAt(frame, at, index, opts?)` | The same entrance, delayed by `index * STAGGER` | Use for sibling rows/cards; options match `enter()` |
| `leave(frame, at, opts?)` | Opacity from 1 to 0, translating away from rest | Defaults: 6 frames, `x: 0`, `y: 12`, `EASE.out`. Although it accepts the shared options type, it does **not** apply `scale` |
| `pop(frame, at, config?, durationInFrames?)` | A spring value anchored at a frame, settling at 1 | Defaults: damping 14, stiffness 120, mass 0.8, duration 13 frames. Returns 0 before/start and 1 at/after the duration. Keep damping at least 14 under the skill's rules |
| `press(frame, at, depth?)` | A brief scale dip followed by a return to exactly 1 | Default depth 0.04, approximately a 4% dip; 8-frame envelope; returns 1 outside it |
| `countTo(frame, at, to, dur?)` | A rounded integer counting from zero to `to` | Default 13 frames, `EASE.out`. For a change between two nonzero values, use `Math.round(mix(ramp(...), from, to))` |
| `caretOn(frame)` | A blinking caret's visibility | On/off in alternating 15-frame intervals, a one-second full cycle |
| `typed(frame, at, text, cps?)` | A progressively longer slice of `text` | Default 28 characters per second; empty at/before `at`. This simulates typing, not speech or caption timing |

`span`, `oscillator`, and `settleTime` are private implementation helpers. `SpringConfig` and `EnterOpts` are internal types, not exported APIs. The module has no runtime imports; its React `CSSProperties` import is type-only.

`enter()` and `leave()` return complete `transform` strings. A later `transform` property in the same style object replaces them; explicitly combine transforms or use a suitable inner element when another motion must coexist.

## Pointer and click vocabulary

The pointer helpers live in [src/cursor-motion.ts](../src/cursor-motion.ts). `trackPos` and `downAt` are also re-exported from [src/chrome.tsx](../src/chrome.tsx), which renders the shared `Cursor`.

| API | Behavior |
| --- | --- |
| `trackPos(frame, keys)` | Interpolates `{at, x, y}` keys using `EASE.inOutCubic`, preserves subpixel coordinates, and holds the last position. Supply a nonempty array in chronological order |
| `downAt(frame, beats)` | Returns true from each click beat through the following six-frame window: `beat <= frame < beat + 6` |
| `Cursor({frame, path, clicks?, cursor?})` | Renders bundled macOS assets at 1.4× their native size, anchored to the measured hotspot. An eight-frame `press()` envelope compresses by at most 7%. Three trailing subframe samples add restrained motion blur (at most 4 px), disappearing at rest |
| `cursorOnTarget(frame, path, targets)` | Uses the target’s cursor shape only after the pointer reaches its measured location; uses the arrow during travel |
| `cursorScale(frame, clicks)` / `cursorShutter(frame, path)` | Deterministic press envelope and bounded subframe blur samples, independent of playback history |
| `press(frame, clickAt)` | Makes the clicked element respond on the same beat; this is separate from the pointer's own dip |

Cursor assets come from [`@remotion/mac-cursors`](https://www.remotion.dev/docs/mac-cursors/mac-os-cursor), pinned to the same version as the renderer. The shared wrapper keeps shape changes, click compression and shutter sampling deterministic under arbitrary frame seeks.

Measure targets from a rendered frame. Give each target an arrival key and another key at the **same coordinates through `CLICK + 8`**. A single key starts the next leg immediately, so the pointer can drift off the button before the click. `trackPos()` does not add holds automatically. Avandar typing targets include a hold through text entry. Supported shapes are `default`, `pointer`, `text`, `grab`, `grabbing`, and `zoom-in`; use grabbing only for an actual drag. The current map camera move is an authored zoom, not a drag. These helpers animate a drawn pointer; they do not click or record a real application.

## Title choreography

[TitleCard](../src/title-card.tsx) is the original reusable title scene built from this vocabulary. It accepts `{name, kicker, frame}` and spans `TITLE_LEN = 66` frames (2.2 seconds).

| Event | Local frame / duration | Motion |
| --- | --- | --- |
| Headline words | Start at `6 + wordIndex * 3`; 15 frames each | `translateY(110%)` to 0 through a separate hard mask per word, using `EASE.word`; no individual word opacity animation |
| Kicker | Start 22; 13 frames | Rise 10 px and fade to opacity 0.68 |
| Accent rule | Start 26; 13 frames | Center-origin `scaleX` from 0 to 1 on a 120 × 3 px rule |
| Entire card exits | Start 54; 12 frames | Fade onto the shared dark ground |

This original title uses a fixed single-line arrangement at 92 px; it has no automatic fitting or multiline layout. The new `TypographyScene` provides a separate multiline/fitting contract without changing `TitleCard`. `Clip` starts the app body at frame 66 using a `Sequence`; it does not automatically add an outro or make an arbitrary body loop cleanly.

## Composition patterns already demonstrated

These are combinations of the helpers above, not extra exported functions or reusable scenes.

| Pattern | Current implementation | Example |
| --- | --- | --- |
| Staggered rows and cards | `enterAt()` on each sibling | [Demo](../src/compositions/Demo.tsx), [MotionLab](../src/compositions/MotionLab.tsx) |
| Typed input and blinking caret | `typed()` plus `caretOn()` | Demo; MotionLab demonstrates typing |
| Counter and recount | `countTo()`, or rounded `mix()` driven by a `ramp()` | Demo, MotionLab |
| Bars/progress filling | Width driven by `ramp()` and numeric interpolation | Demo's result bars, MotionLab's progress bar |
| Filter/focus/selection changes | `mixToken()` for colors plus numeric ramps for related styles | Demo's field/chips, MotionLab's button |
| Press and confirmation | `press()` on the target; timed state change; `pop()` for the toast landing | Demo; MotionLab demonstrates the button response |
| Opening and closing a body | Local entrance/exit ramps against `var(--ground)` | Demo, MotionLab |
| Repeated title cards | Local frame reset for each title | [TitleStudy](../src/compositions/TitleStudy.tsx) |

The skill also specifies phase transitions: keep the outgoing phase visible while an **opaque incoming phase** fades over it. Give the incoming root its own background and keep the finished state mounted during its reading hold. `StoryFilm` now implements that rule for storyboard shots. There is still no separately exported `PhaseTransition` component for arbitrary nested phases.

## Added scene choreography

These are implemented combinations of the upstream vocabulary, not new exports
from `motion.ts`. Content and timing props are documented in the
[scene API](scene-api.md); reusable boundaries are in the
[scene inventory](shared-scene-library.md).

| Scene / renderer | Implemented motion | Timing and limits |
| --- | --- | --- |
| `GraphScene` | Cards use `enterAt()`; directed paths draw with SVG dash progress from `ramp()`; node borders/backgrounds use `mixToken()`; traversed edges remain highlighted | Default first card at frame 10, siblings use `STAGGER`; edges reveal after both endpoint cards enter with `DUR.sheet`; current-node transitions use `DUR.chip`. No graph camera or automatic routing |
| `FlowchartScene` | Uses graph entrances/connectors on a serpentine step layout | Default activations at `revealAtFrame + DUR.sheet + index * 60`; explicit increasing `stepAtFrames` or one fixed `activeStep` override. Straight explicit branches can cross |
| `MetricScene` | `mix(ramp(...), from, value)` animates finite values with fixed precision; short entrance translations and a later detail reveal | Defaults: count at frame 18 for 36 frames. The complete label, endpoints/unit, detail and spacing fit together before counting; sizes stay fixed across frames, with no numeric text scale |
| `TypographyScene` | Each word rises through its own mask using `EASE.word`; authored emphasis selects a token color | Defaults: first word at frame 6, 3-frame stagger, `DUR.word` duration. Lines wrap at a fitted, stable size. No masked-word opacity or per-letter animation |
| `MediaScene` | Static image/video framing, entrance fade, timed callout fades | Video is sampled from the explicit scene frame through Remotion `Freeze`; trim is additional. Crop is fixed for the shot. Callouts use `DUR.chip` or a shorter interval for short cues. No sustained camera zoom on captured UI |
| `CaptionOverlay` | Whole-cue text with a short entrance fade and opaque backing | Selects `startFrame <= frame < endFrame`; fade is at most `DUR.chip`. Text fitting stays fixed during the cue; no word-level speech highlighting |
| `StoryFilm` | Opaque incoming shot dissolves over the preceding shot held at its last frame | Uses `EASE.inOut` and each shot's `transitionInFrames` (schema default 18). First shot has no incoming dissolve. Loop plans additionally fade to ground over the final 18 frames |

Scene headings follow short `enter()` translations; app and media containers do
not receive a lasting scale. Graph card heights and fitted text sizes depend on
the complete content and available dimensions, never on the current frame.
Captioned storyboards reserve a stable band below the scene, sized from the
tallest cue with a 160 px minimum. Shared caption geometry includes the fitted
lines, padding, border, bottom inset and 8 px clearance. Plans must retain at
least 640 px of scene height; inspect layouts at that reduced height.
These transitions do not create reading holds;
the plan's duration must leave time after each final action or word reveal.

## Periodic stock motion

| API in `src/motion.ts` | Behavior | Limits |
| --- | --- | --- |
| `loopPhase(frame, period, offset = 0)` | Normalized 0 to less than 1 cycle, with positive modulo for negative frames/offsets | Finite inputs and positive period; the phase itself resets at the cycle boundary |
| `wave(frame, period, offset = 0)` | Smooth cosine pulse from 0 to 1 and back to 0 | Same input limits; useful for subtle halos and proximity emphasis |
| `loopEnvelope(frame, duration, fadeFrames = 12)` | Existing `EASE.inOut` ramps reveal a graphic and return to ground exactly at `duration - 1` | Duration must exceed twice the positive fade length; does not repeat by itself |

`StockGraphic` uses a 180-frame, 30 fps loop. Authored particles follow seeded
deterministic positions and periodic paths; edges reveal with SVG dash progress;
packets travel along explicit geometry. These are conceptual patterns, not force
simulation, geographic coordinates, or measured network traffic. The stock
renderer uses explicit local frames, never CSS animations or wall-clock time.
The browser gallery supplies frames from its playback clock; Remotion supplies
timeline frames to the same component. At both loop boundaries, the content
envelope reaches zero against the same opaque ground. `StockScene` repeats the
cycle for longer shots. The palette and sample content are scoped to the stock
library, preserving the starter theme and real product captures.

## Sound vocabulary

The optional [add-sfx.sh](../scripts/add-sfx.sh) pass scores a finished video. It synthesizes placeholder WAV files under ignored `out/sfx/` on first use; those files can be replaced while retaining the score. There are nine semantic sound categories plus the `whoosh_soft` variant.

| Sound name | Event it marks | Motion tier |
| --- | --- | --- |
| `key` | A character typed | Typing |
| `click` | A user press | `DUR.press` |
| `tick` | A state flip | `DUR.chip` |
| `pop` | An element arrival | `DUR.panel` |
| `swipe` | An element travelling | `DUR.sheet` |
| `whoosh` | A screen change | Phase transition |
| `whoosh_soft` | A softer screen-change cue | Variant of `whoosh` |
| `impact` | A weighted landing | `DUR.hero` |
| `riser` | Anticipation before an event | Lead-in |
| `fold` | Everything collapsing away | Exit |

Scores live in `scripts/beats/<id>.txt`; only [demo.txt](../scripts/beats/demo.txt) currently ships. Rows specify `frame sound volume pitch [note]`. Bare frame numbers use body coordinates with a default 66-frame title offset; `tN` means absolute film frame N. The directive `type <first> <count> <step> <vol>` expands a typing run into key events, with `first` and `step` measured in frames. Set `TITLE_OFFSET=0` for a composition without a separate opening title.

Score events, not every frame of continuous motion. Keep isolated events at pitch 1.00; small pitch variation belongs to repeated bursts. Reserve whooshes for screen changes. The three original showcase files are silent. The legacy sound pass writes a separate `out/<id>-sound.mp4` and copies its video stream; it is not a narration mixer and does not preserve an existing input audio track in its mix.

Storyboards have a separate narration-aware path. A narration cue supplies text,
shot-relative frame bounds, and optional audio; sound effects supply an asset,
absolute `atFrame`, and volume. The [video pipeline](video-pipeline.md) exports
transcript/SRT/VTT from those cues and mixes approved speech/effects after the
picture gate. It validates track length, delays tracks to the film timeline,
and checks that audio assembly preserves video packets. Local scratch speech
and supplied SRT alignment are available; automatic transcription, forced
alignment, and speech-driven word animation are not.

## Rules for extending the vocabulary

1. Add shared curves, timing tokens, and helpers to `src/motion.ts`, keeping it free of runtime dependencies. Update this inventory with the same change.
2. Derive animation from frames. CSS transitions, timers, and wall-clock animation do not define a reproducible Remotion timeline.
3. Use small element travel and sibling stagger. Springs are for landing; ramps are for travel. Spend the main visual beat once per phase.
4. Keep app chrome stationary and avoid sustained scaling of text. A brief press returns to exactly 1; a camera push on footage is a different operation.
5. Blend colors through design tokens. For real product work, read actual screen markup, copy, and tokens before rebuilding it. Preserve the original palette for the generic starter showcase.
6. Inspect preview contact sheets, including pointer targets, before rendering. Watch the finished clip for pacing. The mandatory frame gate detects certain tiling and luminance faults; it cannot certify the picture or the argument.

Graph paths, explicit connectors/traversal, multiline masked typography,
stationary footage wrappers/callouts, whole-cue captions, and authored narration
timing are now implemented through scenes and pipeline modules. Automatic graph
routing, animated cameras, karaoke captions, and automatic speech alignment
remain outside the current vocabulary. Read the [scene inventory](shared-scene-library.md)
and [architecture assessment](agent-architecture.md) before promising those behaviors.

## Product component choreography

The [Avandar component films](component-videos.md) apply the same pointer and
easing vocabulary to actual product controls. Frame-driven adapters type into
Avandar's inputs and CodeMirror editor, reveal query drawers, change filtered
rows, reveal real chart bars, and open record and dashboard views.
`src/avandar/cursor-targets.json` contains rendered measurements;
`scripts/measure-avandar.mjs` regenerates them from the review player.
Map movement uses the native map camera, with frame-controlled center and zoom.
Product text and application chrome remain at native scale.
