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
- A **wrong repeat count**: a stepped wipe called "8 columns" had about 12.
  The prompt now asks for counts or a stated range.
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
