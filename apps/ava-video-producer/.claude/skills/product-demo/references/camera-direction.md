# Directing camera movement and transitions

Read this when choosing a camera move, motion preset, blur treatment or easing curve. Use the public `src/motion-components` exports, already used by the explainer films. The [API reference](../../../../docs/reusable-motion.md) gives exact props, preset values and copyable examples. Paths in this reference are relative to the producer app unless linked.

## Choose movement for the sentence

| What the viewer needs to understand | Direction | Reason |
| --- | --- | --- |
| Where an idea lives in a larger system | Establish a wide view, push toward one meaningful detail, hold, reopen | Context makes magnification intelligible |
| How A connects to B | Pan along the actual relationship, retaining a landmark | Spatial continuity explains the connection |
| Which detail matters now | Zoom the SVG world into that detail | A purposeful change of scale makes hierarchy visible |
| What was discarded or replaced | Depart only that SVG object, with an accelerating exit | The surrounding system stays legible |
| How an abstract idea appears in the product | Match an identified token to a measured UI region, then reveal native UI | The identity carries the explanation through the boundary |
| How UI action produces a result | Keep the product mounted and overlay a tethered diagram/annotation after the action | Timing and measured attachment communicate causality |
| A new subject with no useful shared geometry | Cut or short dissolve | A fabricated pan would imply a relationship that is not present |

Describe the purpose before authoring the path: “follow the selected columns into the cache,” for example. Prefer one attention change at a time. Do not add a zoom solely because a scene has been still for a few seconds. Avoid repeated in/out pumping, zigzag paths and moving a camera while labels are first becoming legible. Teach new content at rest, then travel. Keep destination holds long enough for the actual narration and labels, rather than treating the preset as a reading-time budget.

## Pick a preset, then adjust

| Preset | Rate | Shutter | Curve | Editorial fit |
| --- | ---: | ---: | --- | --- |
| `deliberate` | 0.25 | 45° | ease-in-out | Inspect an unfamiliar system or a dense diagram |
| `gentle` | 0.5 | 90° | ease-in-out | Tutorial pacing and a gradual focus change |
| `balanced` | 0.75 | 120° | ease-in-out | Default starting point for new explanatory travel |
| `brisk` | 1 | 180° | ease-in-out-cubic | Familiar landmarks and confident explainer pacing |
| `whip` | 1.5 | 240° | ease-in-out-cubic | Brief, occasional energy at a subject change or discarded object |

The existing fast vocabulary retains its timing when no options are passed. Explicit presets also select a curve. These rates multiply the authored move: a 24-frame travel becomes 96/48/32/24/16 frames respectively. A long-distance move at `balanced` can still feel fast. Judge the actual screen-space journey and playback, not the name alone. Numeric `speed` overrides a preset when a spoken phrase needs a particular arrival time; `shutterAngle` and `blurStrength` tune its clarity independently. Do not compensate for poor timing by adding more blur.

For an introduction with three unfamiliar labels, establish the full diagram, use `deliberate` or `gentle` for a single focus change, and let the labels be read at rest. For a repeat demo between familiar regions, `balanced` or `brisk` is usually enough. Reserve `whip` for a short move with a clearly established destination. Do not make every boundary a whip because the examples use it effectively.

## Choose easing for the physical meaning

| Easing | Where it helps | Where it hurts |
| --- | --- | --- |
| `ease-in-out` | Camera starts at rest, travels, settles at another landmark | Too many tiny moves can feel hesitant |
| `ease-in-out-cubic` | More emphatic start/stop with a quick middle crossing | Fast central motion can hide unfamiliar relationships |
| `ease-out` | An incoming object catches the eye promptly and settles | A camera leaving a held pose starts abruptly; choose deliberately |
| `ease-in` | An object accelerates away and does not need to land in view | Slow initial response makes entrances or click feedback feel late |
| `linear` | Constant-speed transport, a continuous drift, or motion crossing a cut | A stopped camera jumps into/out of motion without settling |
| `[x1, y1, x2, y2]` | Tune acceleration to a particular narrated or spatial handoff | Arbitrary curves cannot repair a weak reason for moving |

Use bounded custom cubic Béziers, for example `[0.22, 0.8, 0.35, 1]` for an early approach with a longer settlement. All four values are 0–1; camera travel must not overshoot its safe viewport. A landing spring belongs on the individual object when appropriate, not on the entire camera or UI. Easing controls the distribution of motion inside the resolved duration; it does not extend a reading hold.

An explicit global preset or easing overrides camera-key easing. For heterogeneous routes, leave those unset, put `ease` on each destination key and use numeric speed/blur overrides. Legacy `glide`, `push` and `whip` key curves remain accepted. `push` is an ease-out curve, not a speed preset.

## Keep the clocks and layers honest

- Use `DiagramCamera` for SVG diagram artwork. Duplicate keyframe poses specify reading holds. Speed changes only travel intervals and shifts subsequent camera stops. At half speed, keys `[0,60,84,144,168]` with 60-frame holds become `[0,60,108,168,216]`. Do not multiply the real content frame or wrap the film in a slowed sequence. Render artwork from the callback's supplied fractional frame so temporal samples work.
- A slower camera does not slow narration, captions, stock reveals or UI actions. Check arrival against the real content and caption clock. If the route no longer fits, extend/re-author the beat deliberately and validate. Never silently crop the final move or shrink every reading hold.
- Use `SvgObjectDeparture` inside the SVG camera for isolated swipes. Signal its active travel with `blurActive`; explicit `blurOptions` can carry a departing object's shutter settings. Continuity adapters do this automatically. When camera and object travel together, camera settings own the shared shutter.
- Use `AnchoredOverlay` for explanatory artwork attached to measured product regions. It keeps the UI native, moves only the overlay and uses bounded velocity-based CSS blur. Speed retimes entry/return inside the fixed cue window, so enlarge the window if it would consume the reading hold.
- Use `createSceneTransition` for boundaries. It couples transition speed/easing to the real `TransitionSeries` overlap. Changing overlap moves later beats and changes total shot duration. Recompute the timeline; beat-relative narration follows it, while absolute recording cues need review.
- Keep real Avandar charts, editors, map instances and app chrome out of `CameraMotionBlur` and `SvgObjectDeparture`. Their sampling/masks duplicate descendants. Use one mounted product instance and native-size spatial movement with CSS blur for a fast UI boundary. For UI focus, use measured crops/reveals, anchored artwork and rough notation. Diagram labels can move with the SVG world; fixed headings stay still.
- Motion blur describes travel; it should vanish at rest. Keep exposure short enough that the destination is immediately readable. Ten temporal samples are the default; increasing samples costs rendering time, while increasing the shutter length increases the smear. Disable blur when it harms small text or obscures a causal edge. Do not leave a blur filter on a reading hold.

## Inspect the result

Validate the plan and inspect departure, mid-travel, arrival, hold and a reverse seek. Check both blur enabled and disabled. Confirm held chart bars remain stable and the product's actions still happen at their authored frames. Check the destination against the caption that is actually showing. Look for cropped landmarks, ghosted duplicates, accumulating blur, overlay occlusion and a camera that arrives after its subject has changed. Use headless previews or serial stills; exporting a new MP4 requires the user's export request under the producer workflow.
