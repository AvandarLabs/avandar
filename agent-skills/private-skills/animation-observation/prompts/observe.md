You are a senior motion designer reverse-engineering the video labelled REFERENCE so a different team can rebuild its motion language in Remotion at 30 fps on a 1920 x 1080 canvas.

The rebuild will use DIFFERENT content, words, product UI, and colors. Do not describe what the video says or sells. Describe only:

- **Motions**: how each element enters, behaves while on screen, and leaves.
- **Composition**: where things sit in the frame, how big they are, what layers exist, how depth is faked.
- **Transitions**: how one shot becomes the next.
- **Pacing and vibe**: rhythm, energy, holds, acceleration.

The implementer cannot see the video. Everything they need to reproduce a beat must be in your answer. Prefer measurements over adjectives.

## Measurement rules

- Times are 30 fps frame numbers from the start of the video (frame 0 = 00:00.000). Also give `mm:ss.f` once per shot so humans can check.
- Positions and sizes are percentages of the 1920 x 1080 frame: `x`, `y` of the element's top-left corner, `w`, `h`. Text size is cap height as % of frame height.
- Easing is a cubic-bezier `(x1, y1, x2, y2)` or `linear` or `steps(n)`. Say whether a motion overshoots and by how much (%).
- Directions are screen directions: `from-right` means the element starts off the right edge and travels left.
- For every motion name the property that changes (translateX, translateY, scale, rotateY, opacity, clip/mask, blur, width/height, stroke-dashoffset, text characters) with start and end values.
- Before writing a direction, check where motion blur trails sit: a blur trail lies BEHIND the moving element. Re-check every direction claim this way.
- A cut followed by an entrance is not a transition between shots. Report exactly what happens in the frames on either side of the boundary: a hard cut, a cut plus an incoming element animation, or one continuous move that carries both shots.
- Count repeated items (bars, columns, cards, lines). If you cannot count precisely, give a range and say so.
- If something happens within 1-2 frames you cannot resolve, say so in `confidence` rather than inventing precision.

## Output format

Return Markdown with exactly these sections, in this order.

### 1. Vibe

5 to 8 bullets: energy, pacing, visual style (flat or deep, texture, type treatment, color roles such as "one saturated accent on a dark field"), and what makes it distinctive. Describe color by ROLE, not hex, unless the hex helps identify the role.

### 2. Rhythm

Average shot length, shortest and longest shot, cut cadence, how pacing changes across the video (as a list of acts with frame ranges), and any recurring beat interval.

### 3. Composition templates

The recurring layouts. Give each an id `C1`, `C2`, ... and describe it as a layer list from back to front, each layer with its box (`x y w h` in %), alignment, and any constant transform (for example `perspective 1200px, rotateY -12deg, rotateX 4deg`, drop shadow). Include background treatment. Say which shots use each template.

### 4. Transition catalog

Every distinct transition. Give each an id `T1`, `T2`, ... with:

- `mechanism`: what physically moves (outgoing layer, incoming layer, overlay shapes, mask, camera).
- `frames`: total duration, and per-layer start/end offsets relative to the shot boundary (negative = before the cut).
- `properties`: per layer, property start -> end values.
- `easing` per layer, `motion_blur` yes/no and direction.
- `geometry`: count, size, and stagger of any shapes (for example "12 vertical columns, each 8.3% wide, stagger 1 frame left-to-right, each rises from translateY 100% to 0%").
- `occurrences`: list of boundary frames where it is used.

### 5. Motion catalog

Every distinct element animation. Give each an id `M1`, `M2`, ... with `applies_to` (generic element kind: headline line, word, logo bar, card, chart bar, counter, cursor, connector line, etc.), `property` changes with values, `frames`, `stagger` (frames and order), `easing`, `overshoot`, and `occurrences` (frames). Include in-shot "life" motion such as streaming text, ticking counters, pulses, and typing speed (characters per frame).

### 6. Camera

Every virtual camera move (push-in, pull-back, pan, drift, rotate, zoom-through): frames, start and end scale/translate/rotate, easing, which layers it affects. Say explicitly if the camera is locked for most of the video.

### 7. Storyboard script

A fenced ```yaml block that an implementer follows shot by shot. Every frame of the video must belong to exactly one shot. Use this shape:

```yaml
fps: 30
canvas: { width: 1920, height: 1080 }
total_frames: <int>
shots:
  - id: S1
    from: <frame>          # inclusive
    to: <frame>            # exclusive
    composition: C1
    background: <role, e.g. dark-field | accent-field | light-field>
    elements:
      - id: S1.logo
        kind: <generic element kind>
        box: { x: 0, y: 0, w: 0, h: 0 }   # % of frame, resting position
        content_shape: <what kind of content, e.g. "2-line headline, 4-6 words", "terminal window with streaming text", "8 vertical bars">
        motions:
          - motion: M1
            from: <frame>
            to: <frame>
            params: { }    # only values that differ from the catalog entry
    camera: <none | camera move with frames>
    transition_out: { transition: T1, from: <frame>, to: <frame> }   # omit on the last shot
```

### 8. Build priorities

The 6 to 10 motions, transitions, or compositions that most define this video's feel, ranked. One line each on why.

### 9. Confidence

What you are unsure of: exact easing, counts, sub-frame staggers, directions. Give the frames where an implementer should look closer.
