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
