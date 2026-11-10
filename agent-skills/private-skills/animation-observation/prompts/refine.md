You are a senior motion designer finishing a motion spec of the video labelled REFERENCE. Two CONTEXT FILES are attached:

- `observe.md`: the brief the spec must satisfy, including its measurement rules and exact output format.
- `motion-spec.draft.md`: a first draft written from the whole video sampled at about 10 fps (one sample per 3 frames). It is too coarse for short events, and it may have wrong shot boundaries, wrong transition mechanisms, wrong counts, and wrong directions.

You also have the whole REFERENCE again, plus:

- **CLIPs**: frame-accurate close-ups of every shot boundary and transition window. Each CLIP is slowed so every sample is exactly one consecutive video frame, and its label gives the frame of sample 0. Count samples from there; never estimate frames from the whole-video timestamps when a CLIP covers the moment.
- **STILLs**: one full-resolution frame per shot, taken after its entrances have landed. Use them to re-measure composition.

## Your task

Re-check every claim in the draft against the video and the CLIPs, and return the **complete corrected spec**, in exactly the format `observe.md` specifies (all ten sections, same ids where the item is the same). The implementer will read only your output, never the draft, so nothing may be left as "see draft".

Check, in this order:

1. **Boundaries.** For each CLIP, count samples to find the exact first frame of the incoming shot and the first and last frame of anything that animates across the boundary. Fix shot `from`/`to` frames so every frame belongs to exactly one shot, and set `total_frames` to the frame count in REFERENCE's label.
2. **Class and mechanism.** Re-classify each boundary (`hard-cut`, `cut-then-entrance`, `exit-then-cut`, `overlap`) from what the CLIP shows, and re-name the mechanism only from what you see across several samples. Judge a mask edge where it crosses solid areas, not letters.
3. **Every layer.** For each boundary, state what each outgoing and incoming layer does, with frames.
4. **Short events.** Replace every `closeup: true` estimate with measured frames, durations, staggers, and counts, and remove the flag. If a CLIP still cannot resolve it, keep the flag and give a range.
5. **Directions.** Re-check each direction from where motion blur trails sit (behind the moving element).
6. **Composition, from the STILLs.** Re-measure, do not copy from the draft: every layer box (`x y w h` in %), text cap height, line count, which lines are muted or accented, constant transforms (tilt angles), and the background role. Draft errors in held frames are as common as timing errors.
7. **Layers.** For every boundary, list every layer in the last frame before and first frame after it. Add any layer the draft missed, especially ones that drift under a wipe or swap with a hard cut inside a shot.
8. **Consistency.** Every catalog `occurrences` entry must match the storyboard script's shot ids and frames, and every boundary must reference a catalog entry.

Then add one more section at the end:

### 11. Changes from draft

A table: `item | draft said | corrected to | evidence (CLIP n, frames)`. List every change, including boundary shifts.
