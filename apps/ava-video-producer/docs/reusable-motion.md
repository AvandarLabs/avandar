# Reusable cameras and transitions

Import from `src/motion-components`. The existing explainers use these same components through continuity adapters. Props are frame-derived and seekable; there are no wall-clock animations. The diagrams use [Remotion CameraMotionBlur](https://www.remotion.dev/docs/motion-blur/camera-motion-blur), scene boundaries use [custom TransitionSeries presentations](https://www.remotion.dev/docs/transitions/presentations/custom), and shared rectangles use [interpolateStyles](https://www.remotion.dev/docs/animation-utils/interpolate-styles).

## Atlas camera control

Compositions and Sample films expose **Camera motion preset** beside the
camera checkbox. Choose Composition default to retain the storyboard's settings, or
Deliberate, Gentle, Balanced, Brisk, or Whip to override SVG camera travel,
easing, and blur. The selection persists across previews and is included in
MP4 and caption downloads. Turning camera motion off disables the selector.
Slower routes extend their scene when needed, preserving reading holds and
beat-relative narration. Whole-player Speed remains a separate control.

## Motion controls

`MotionOptions` is serializable in JSX and storyboard JSON. Explicit numeric values and `easing` override the selected preset. An authored 24-frame move at 30 fps demonstrates the range:

| Preset | Speed multiplier | Actual travel | Shutter angle | Easing | Typical purpose |
| --- | ---: | ---: | ---: | --- | --- |
| `deliberate` | 0.25 | 96 frames / 3.2 s | 45° | `ease-in-out` | Inspect unfamiliar detail or establish geography |
| `gentle` | 0.5 | 48 frames / 1.6 s | 90° | `ease-in-out` | Follow a teaching explanation |
| `balanced` | 0.75 | 32 frames / 1.07 s | 120° | `ease-in-out` | Connect related ideas with readable travel |
| `brisk` | 1 | 24 frames / 0.8 s | 180° | `ease-in-out-cubic` | Redirect attention between familiar landmarks |
| `whip` | 1.5 | 16 frames / 0.53 s | 240° | `ease-in-out-cubic` | One energetic departure or major subject change |

Travel frames resolve to `max(1, round(authoredFrames / speed))`; zero-length cuts stay zero. Speed is a multiplier of the authored duration, not pixels per second or whole-film playback rate. Distance and zoom magnitude also affect perceived speed. Omitting motion options preserves the existing authored curves, durations and 180° shutter. Explicitly selecting a preset also selects its easing. Numeric speed alone retains each camera key's authored easing.

| Option | Range / default | Meaning |
| --- | --- | --- |
| `preset` | Five names above; defaults to brisk speed/blur | Semantic starting point |
| `speed` | 0.1–4 | Travel rate. 0.5 takes twice as long; 2 takes half as long |
| `easing` | Named easing or `[x1, y1, x2, y2]` | Overrides preset/key easing |
| `shutterAngle` | 0–360° | Exposure length. Zero disables blur |
| `blurStrength` | 0–2, default 1 | Scales blur. Zero disables it |
| `samples` | Integer 2–16, default 10 | Temporal sample count for vector cameras only |

Named easing: `linear`, `ease-in`, `ease-out`, `ease-in-out`, `ease-in-out-cubic`. `ease-in` and `ease-out` use CSS cubic curves; `ease-in-out` uses the producer's smooth `(0.45, 0, 0.55, 1)` curve; `ease-in-out-cubic` uses the piecewise symmetric cubic. Custom Bézier values must all lie in `[0, 1]` to keep travel within its authored bounds. Use a separate landing spring for deliberate overshoot.

## Vector camera

```tsx
import { DiagramCamera, type CameraKeyframe } from "./motion-components";

const track: CameraKeyframe[] = [
  { at: 0, x: 480, y: 300, zoom: 1 },
  { at: 60, x: 480, y: 300, zoom: 1 }, // Establish the whole diagram.
  { at: 84, x: 650, y: 330, zoom: 2 },
  { at: 144, x: 650, y: 330, zoom: 2 }, // Read the detail.
  { at: 168, x: 480, y: 300, zoom: 1 },
];

<DiagramCamera
  track={track}
  preset="gentle"
  speed={0.6}
  easing={[0.22, 0.8, 0.35, 1]}
  shutterAngle={90}
  samples={10}
  render={(frame) => <DiagramArtwork frame={frame} />}
/>;
```

`DiagramArtwork` stands for SVG artwork rendered from the supplied frame. The camera accepts `width` and `height` (default 960 × 600), `enabled` and `motionBlur` booleans. Keyframes contain a center, zoom 1–3, and optional `ease`. Camera keys start at zero and their viewports must remain inside the canvas. Keys describe the original authored clock; pass the original track, not an already retimed track.

Duplicate poses create holds. At speed 0.5, the example's key times become **0, 60, 108, 168, 216**: both 60-frame holds survive, both 24-frame moves become 48. `retimeCameraTrack()` exposes the resulting schedule. `getCameraPose()` and `isCameraMoving()` sample it without depending on previous playback. Slower travel shifts later camera stops, but **does not retime the artwork, narration, captions, clicks or UI fixtures**. The render callback receives the real fractional Remotion frame for each shutter sample. Recheck the alignment of attention changes with speech and extend the beat deliberately if necessary. Storyboard validation rejects tracks that run past their beat.

Temporal blur activates only during travel. `blurActive` can include an independently moving SVG object; `blurOptions` can override its shutter angle, strength and sample count without changing the camera speed or easing. In continuity films, a departing object's explicit blur profile applies while the camera is stationary; camera settings own the shared shutter when both move together.

Keep live product components outside `DiagramCamera`: temporal samples duplicate the SVG subtree. Native charts, editors and maps must retain their own lifecycle. Vector labels can travel with the diagram's viewBox; separate headings and product chrome remain stable.

## Other extracted components

| Component | Main props | Use |
| --- | --- | --- |
| `SvgObjectDeparture` | `frame`, `flight: {at, duration, dx, dy, rect, motion?}`, `width`, `height` | Mask one SVG region and swipe it away while surroundings stay fixed. Use inside the camera and drive `blurActive` from `getObjectFlight(flight, frame).active` |
| `AnchoredOverlay` | `frame`, measured `source`, `cue: {at, until, target, entryFrames?, exitFrames?, fadeFrames?, motion?}`, `motionBlur`, children | Lift explanatory artwork from a UI region, hold over the product, return to source. Single-instance CSS blur tracks travel velocity |
| `SharedElement` | `source`, `target`, `frame`, `at`, `durationInFrames`, `motion`, children | Keep a single identity token mounted while its rectangle travels or changes size. Consumes speed/easing; blur belongs to its surrounding transition |
| `SceneTransition` | Remotion presentation props; passed `kind`, `anchor`, `origin`, stage size, appearance flags, `motion` | Cut/dissolve/wipe/aperture/spatial/handoff/morph presentation |
| `createSceneTransition` | `durationInFrames` plus scene props | Return matching `timing` and `presentation` for a `TransitionSeries.Transition`; use this factory so speed and easing affect both sides of the same boundary |

Overlay defaults are 36 entry frames, 30 return frames, and 20 fade frames. Speed changes entry/return travel inside a fixed `at`–`until` window; it does not change fades or the end cue. Increase `until` if a slower move crowds the reading hold. A window without room for travel and a hold is rejected.

```tsx
<TransitionSeries.Transition
  {...createSceneTransition({
    kind: "spatial",
    durationInFrames: 24,
    motion: { preset: "balanced", easing: "ease-out" },
    width: 1600,
    height: 840,
    motionBlur: true,
  })}
/>
```

For a cut, use adjacent sequences with no transition element. Dissolves keep the outgoing scene opaque and reveal an opaque incoming scene over it. Spatial boundaries translate native-size layers and use single-instance CSS blur, never temporal copies of stateful UI. `samples` applies only to vector camera blur. `cameraMotion={false}` substitutes a dissolve while retaining overlap timing. `motionBlur={false}` disables blur independently.

`handoff` and `morph` expose spatial reveals; combine them with a `SharedElement` to preserve a genuine shared identity. They do not automatically match arbitrary shapes, inspect product DOM, or morph unrelated data models. Continuity's token adapter handles the persistent shared object in the existing films.

## Storyboard equivalents

Existing JSON plans remain valid. Shared motion options are available at:

```json
{
  "content": {
    "cameraOptions": { "preset": "gentle", "easing": [0.42, 0, 0.58, 1] },
    "flight": { "motion": { "preset": "whip", "easing": "ease-in" } },
    "diagrams": [{ "overlay": { "motion": { "speed": 0.5 } } }]
  },
  "transition": { "motion": { "preset": "balanced" } }
}
```

This is a map of option locations, not a complete beat: `cameraOptions`/`flight` belong to stock content and `diagrams` belongs to composite content. Keep each beat's required content fields.

Camera and object speed leave the overall beat lengths untouched. Transition speed changes **overlap duration**, which changes downstream scene starts and total film length. Recompute the shot duration with `getContinuityTimeline()`. Beat-relative narration follows that same timeline; recheck any recording-aligned absolute cues. Adjacent overlaps must leave a reading interval. `pnpm video validate <plan>` checks the resolved schedule.

For directing choices and specific easing rationale, read the producer skill's [camera direction reference](../.claude/skills/product-demo/references/camera-direction.md).
