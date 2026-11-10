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
- **Know your sampling rate.** You see the whole video sampled at about 10 fps: one sample per 3 video frames. Any event shorter than about 9 frames (most transitions, slides, pops, staggers) cannot be timed from that alone. Give its frames as your best estimate and add `closeup: true` to it. A second pass with 24 fps close-ups of every shot boundary will correct those values, so never invent a mechanism to fill a gap you could not see.
- **Name only the mechanism you saw.** Distinguish: a *dissolve* (both shots visible at once, blended), a *dip* (one shot fades to a plain field, then the next fades in), *staged element fades* (layers fade one after another, then a cut), a *linear wipe or erase* (a straight edge travels in one direction), a *radial wipe or iris* (a curved edge grows from a point). Check the shape and travel of a mask edge across at least 3 samples before naming it.
- **Every layer, every boundary.** During a transition, say what EACH on-screen layer of the outgoing and incoming shot does (moves, fades in place, stays, is covered). Do not assume a headline moves with the window next to it.
- **Hard cuts are transitions too.** If any boundary is a plain cut, the transition catalog must contain a `hard-cut` entry, and every boundary must point at a catalog entry.
- **One shot numbering.** Catalog `occurrences` cite storyboard shot ids and frame ranges, and must agree with the storyboard script. Check every occurrence against section 8 before you finish.
- **Backgrounds belong to shots.** Give every shot its background role from this list: `black-field` (pure or near-pure black), `dark-field` (dark but not black, or tinted), `accent-field` (a saturated brand color), `light-field` (white or off-white), `image` (footage or a picture fills the frame), `gradient`. If the background changes between shots, that change is part of the boundary.
- **Judge mask shape on solid areas.** Read a wipe or erase edge where it crosses a flat background, a bar, or a window, never from how letters disappear: each letter's own outline makes any edge look curved.
- **Account for every layer.** For each boundary, list every layer visible in the last frame before it and the first frame after it, and say what happens to each, including layers that only drift or stay put underneath a wipe.
- **Start means first change.** A motion starts on the first frame that differs from the frame before it and ends on the first frame that no longer changes.
- **Measure, never derive.** Never compute a start, end, or duration from a formula (for example "5 frames per column plus a 1-frame stagger"). Find the first and last changed frame directly; give the stagger separately as what you measured.
- **No on-screen words.** Never quote text, labels, or names from the video. Say "2-line headline, 4 words" instead.
- **Use the stated length.** The label of each VIDEO states its exact frame count. `total_frames` must equal it.

## Output format

Return Markdown with exactly these sections, in this order.

### 1. Vibe

5 to 8 bullets: energy, pacing, visual style (flat or deep, texture, type treatment, color roles such as "one saturated accent on a dark field"), and what makes it distinctive. Describe color by ROLE, not hex, unless the hex helps identify the role.

### 2. Rhythm

Average shot length, shortest and longest shot, cut cadence, how pacing changes across the video (as a list of acts with frame ranges), and any recurring beat interval.

### 3. Shot boundaries

A table with one row per boundary between consecutive shots, in order:

| boundary frame | from shot | to shot | class | transition id | outgoing layers | incoming layers |

`class` is exactly one of:

- `hard-cut`: the last frame of one shot is followed by the first frame of the next, nothing animates across it.
- `cut-then-entrance`: a hard cut, then the incoming shot's elements animate in. The entrance is a motion (`M*`), not a transition.
- `exit-then-cut`: the outgoing shot's elements animate out (some layers may stay), then a hard cut.
- `overlap`: both shots are visible at the same time for some frames (dissolve, wipe, push, whip, morph, zoom-through).

Where the boundary frame sits: for `overlap`, it is the **first frame of the transition** (the first frame showing anything of the incoming shot), and the transition's frames belong to the incoming shot. For the other classes it is the first frame of the incoming shot. If every layer cuts at once to a new field that then holds before new content enters, that is a `hard-cut` into a shot whose content enters later, not an exit.

`outgoing layers` and `incoming layers` list each layer and what it does across the boundary, for example `window: slides left 110% with blur, f585-f594; headline: fades in place f586-f592; background: unchanged`.

### 4. Composition templates

The recurring layouts. Give each an id `C1`, `C2`, ... and describe it as a layer list from back to front, each layer with its box (`x y w h` in %), alignment, and any constant transform (for example `perspective 1200px, rotateY -12deg, rotateX 4deg`, drop shadow). Include background treatment. Say which shots use each template.

### 5. Transition catalog

Every distinct transition, including `hard-cut` if any boundary uses one. Give each an id `T1`, `T2`, ... with:

- `class`: as in section 3.

- `mechanism`: what physically moves (outgoing layer, incoming layer, overlay shapes, mask, camera).
- `frames`: total duration, and per-layer start/end offsets relative to the shot boundary (negative = before the cut).
- `properties`: per layer, property start -> end values.
- `easing` per layer, `motion_blur` yes/no and direction.
- `geometry`: count, size, and stagger of any shapes (for example "12 vertical columns, each 8.3% wide, stagger 1 frame left-to-right, each rises from translateY 100% to 0%").
- `occurrences`: list of `shot id -> shot id @ boundary frame` where it is used.

### 6. Motion catalog

Every distinct element animation. Give each an id `M1`, `M2`, ... with `applies_to` (generic element kind: headline line, word, logo bar, card, chart bar, counter, cursor, connector line, etc.), `property` changes with values, `frames`, `stagger` (frames and order), `easing`, `overshoot`, and `occurrences` (frames). Include in-shot "life" motion such as streaming text, ticking counters, pulses, and typing speed (characters per frame).

### 7. Camera

Every virtual camera move (push-in, pull-back, pan, drift, rotate, zoom-through): frames, start and end scale/translate/rotate, easing, which layers it affects. Say explicitly if the camera is locked for most of the video.

### 8. Storyboard script

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
    background: <black-field | dark-field | accent-field | light-field | image | gradient>   # per shot
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
            closeup: <true when shorter than ~9 frames>
    camera: none           # or a list: [{ move: CAM1, from: <frame>, to: <frame> }]
    transition_out: { transition: T1, class: overlap, from: <frame>, to: <frame> }   # omit on the last shot; for overlap, from = the next shot's from
```

### 9. Build priorities

The 6 to 10 motions, transitions, or compositions that most define this video's feel, ranked. One line each on why.

### 10. Confidence

What you are unsure of: exact easing, counts, sub-frame staggers, directions. Give the frames where an implementer should look closer. List every frame number you estimated rather than counted; never claim all values are exact.
