# Hardening log

One entry per evaluation iteration, newest last. Each entry records the
scores, the differences that drove a change, and which skill file changed.
Read this before a run so a known failure is not repeated.

## Baseline spike (before this skill existed)

A free-form "write a motion spec" prompt on a 78 s product launch video gave
a usable spec. A frame spot-check found these weaknesses, which shaped the
measurement rules in `prompts/observe.md`:

- A **direction error**: an entrance was called "from the right" when the
  blur trails showed it came from the left. The prompt now has Argon read
  blur trails, which lie behind the moving element.
- A **cut plus entrance reported as a whip pan**: the incoming shot was a cut
  followed by cards flipping in on the Y axis. The prompt now makes Argon say
  exactly what happens on each side of a shot boundary.
- A **doubted repeat count**: a coarse contact sheet suggested the stepped
  wipe had about 12 columns, not Argon's 8. A frame-by-frame check later
  confirmed 8: the coarse sheet was wrong, not Argon. The prompt still asks
  for counts or a stated range, and verification now uses `--step 1` sheets.
- Motions **hidden under transitions** were missed: the outgoing card slid
  away with blur under the wipe. The transition catalog now asks for every
  layer's motion.

## Run 1, Phase 1 (octet-copy, skill 0.1.0)

No film yet. These are the corrections the frame check needed on Argon's
spec, treated as prompt weaknesses before building.

- Spec accuracy: default reasoning needed 22 of 31 checked claims
  corrected, `xhigh` 18 of 33. `xhigh` is now the default.
- **10 fps sampling** caused every error under about 9 frames (wipe length
  and stagger, slide length, overshoot). The API caps video sampling at
  24 fps, so `observe.md` now tells Argon its sampling rate and flags short
  events `closeup: true`, and a new refine pass (`prompts/refine.md`,
  `scripts/boundary-clips.mjs`) re-checks every boundary from 24 fps
  close-ups. A test on one 8-frame wipe went from about 3-frame to about
  1-frame accuracy.
- **Wrong mechanisms** (8): a staged fade called a dissolve, a linear erase
  called a radial iris, cuts filed as wipes. `observe.md` now defines each
  mechanism and requires a `class` per boundary (`hard-cut`,
  `cut-then-entrance`, `exit-then-cut`, `overlap`) in a new boundary table.
- **Layers assumed to move together**: a headline said to slide with its
  window actually faded in place. Every boundary now lists each layer.
- **No hard-cut entry** and **catalog shot numbers disagreeing with the
  storyboard**: both are now explicit rules.
- **Raw output lost**: the draft and refined replies are now kept untouched
  (`motion-spec.draft.md`, `motion-spec.raw.md`).
- Reference gaps added to `argon-to-remotion.md`: per-shot background,
  placing a boundary by its class, brand marks with different geometry.

## Run 2, Phase 1 (octet-v2, skill 0.2.0)

- Spec accuracy: 22 of 50 checked claims corrected (44%, down from 55%).
  7 of run 1's 18 corrections now right first time, 9 partly.
- **Starts 2-3 frames early, and a constant -2 frame drift late in the
  video**: Argon mis-converted 24 fps samples to 30 fps frames. Clips are
  now re-encoded slowed (`-itsscale 1.25`) so every sample is one source
  frame and Argon only counts. A test on an 8-frame wipe landed within 1
  frame.
- **Held frames never re-measured**: refine copied the draft's layer boxes,
  muted-line colours, and tilt angles. Refine now gets one full-resolution
  STILL per shot and must re-measure composition from it.
- **Mask shape read from letters** (a linear erase called radial twice), a
  **dropped drift layer under a wipe**, **pure black filed as dark**, and a
  **`total_frames` 3 frames off**: new rules in `observe.md` (judge masks on
  solid areas, account for every layer, a background role list with
  `black-field`, use the probed frame count now stated in each VIDEO label).
- SKILL.md: the refine command used an unquoted `$CLIPS` that zsh does not
  split; `--clips-from <draft>` now plans clips inside `argon.mjs`.

## Run 1, Phase 3 build (octet-copy)

- Built: per-shot `theme`, `stepped-column-wipe`, `tilted-window`,
  `brand-lockup`, `bar-comparison`, typography reveal modes, graph packets,
  and four motion tokens. `argon-to-remotion.md` now lists what exists
  instead of a stale gap list.
- **Frame gate vs. hard cuts**: the gate fails luma jumps over 25, and the
  reference hard-cuts between fields 79 to 235 apart. The reference now
  says to copy the cuts anyway, evaluate the encoded `<plan.id>.mp4`, and
  leave the gate policy to the user. Never loosen the gate.
- Demo plans for plain scenes go in the Productions gallery, not continuity
  studies (their schema only hosts continuity shots).
- `npm test` already failed in this worktree (product bundle pre-step); the
  reference now asks for a baseline run, and to restore regenerated
  catalogs before committing.

## Run 3, Phase 1 (octet-v3, skill 0.3.0)

- Spec accuracy: 20 of 78 checked claims corrected (26%, down from 44%).
  10 of run 2's 21 corrections now right first time, 3 partly.
- **Refine request timed out** at Node `fetch`'s 300 s headers timeout; it
  took 562 s. `argon.mjs` now posts through `node:https` with a 30 minute
  limit.
- **Late boundaries after long holds** (5-6 frames): Argon miscounted in
  frame-exact clips. Refine now has to cite `CLIP <label>-<n> sample <k>`
  for every frame it sets, counting through still stretches.
- **Totals rebuilt from a formula** ("5 frames per column plus stagger")
  pushed wipe starts early. New rule: measure first and last changed frames,
  never derive.
- **Stills ignored** (line colour roles wrong three runs running, logo
  height, notch bars): refine must now fill a per-still measurement section
  first and make the composition section agree with it.
- **In-shot events never clipped** (a second push-in, a content swap): the
  clip planner now covers camera moves and every motion of 20 frames or
  less; camera is now structured in the storyboard script. Default clip pad
  is 15 frames to stay in the token budget.
- The raw spec quoted on-screen words and claimed every boundary exact;
  both are now explicit prompt rules.

## Run 1, Phase 4 film (octet-v3 spec, skill 0.4.0)

- Rendered 2357 frames, matching the reference. The gate failed only at
  planned boundaries (hard cuts, wipes, whip-out exits).
- **Spec ambiguity: where an `overlap` boundary sits.** The spec put it at
  full cover, the reference said the transition starts the incoming shot,
  so following both put wipes 9 frames late. `observe.md` now fixes the
  boundary at the transition's first frame, and says when an "exit" is
  really a hard cut into a delayed shot.
- Reference additions: exits must end at the cut (`atFrame = last frame -
  duration + 1`), inventory must match the spec it builds, trim the logo's
  transparent padding, colour-role mapping including pure black, the
  fictional-data label, reading previews still by still, gate policy for
  exit frames and in-shot luma, and flaky-test baselines.
