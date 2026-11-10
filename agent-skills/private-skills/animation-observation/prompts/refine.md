You are a senior motion designer finishing a motion spec of the video labelled REFERENCE. Two CONTEXT FILES are attached:

- `observe.md`: the brief the spec must satisfy, including its measurement rules and exact output format.
- `motion-spec.draft.md`: a first draft written from the whole video sampled at about 10 fps (one sample per 3 frames). It is too coarse for short events, and it may have wrong shot boundaries, wrong transition mechanisms, wrong counts, and wrong directions.

You also have the whole REFERENCE again, plus:

- **CLIPs**: frame-accurate close-ups of every shot boundary and transition window. Each CLIP is slowed so every sample is exactly one consecutive video frame, and its label gives the frame of sample 0. Count samples from there; never estimate frames from the whole-video timestamps when a CLIP covers the moment.
- **STILLs**: one full-resolution frame per shot, taken after its entrances have landed. Use them to re-measure composition.

## Your task

Re-check every claim in the draft against the video and the CLIPs, and return the **complete corrected spec**, in exactly the format `observe.md` specifies (all ten sections, same ids where the item is the same), followed by sections 11 and 12 below. The implementer will read only your output, never the draft, so nothing may be left as "see draft".

Check, in this order:

Evidence rule: every frame number you set from a CLIP must cite it as `CLIP <label>-<n> sample <k>` in section 11, where frame = the CLIP's sample-0 frame + k. Count samples one by one from the start of the CLIP, including through long still stretches where nothing moves: that is where counts slip.

1. **Boundaries.** For each CLIP, count samples to find the exact first frame of the incoming shot and the first and last frame of anything that animates across the boundary. Fix shot `from`/`to` frames so every frame belongs to exactly one shot, and set `total_frames` to the frame count in REFERENCE's label.
2. **Class and mechanism.** Re-classify each boundary (`hard-cut`, `cut-then-entrance`, `exit-then-cut`, `overlap`) from what the CLIP shows, and re-name the mechanism only from what you see across several samples. Judge a mask edge where it crosses solid areas, not letters.
3. **Every layer.** For each boundary, state what each outgoing and incoming layer does, with frames.
4. **Short events.** Replace every `closeup: true` estimate with measured frames, durations, staggers, and counts, and remove the flag. Measure first and last changed frames directly; never rebuild a total from per-item time times count. If a CLIP still cannot resolve it, keep the flag and give a range.
5. **Directions.** Re-check each direction from where motion blur trails sit (behind the moving element).
6. **Composition, from the STILLs.** First fill section 12 (below) from the STILLs alone, then make section 4 and the storyboard agree with it. Re-measure, do not copy from the draft: every layer box (`x y w h` in %), text cap height, line count, which lines are muted or accented, constant transforms (tilt angles), and the background role. Draft errors in held frames are as common as timing errors.
7. **Layers.** For every boundary, list every layer in the last frame before and first frame after it. Add any layer the draft missed, especially ones that drift under a wipe or swap with a hard cut inside a shot.
8. **Consistency.** Every catalog `occurrences` entry must match the storyboard script's shot ids and frames, and every boundary must reference a catalog entry.

Then add two more sections at the end:

### 11. Changes from draft

A table: `item | draft said | corrected to | evidence (CLIP <label>-<n> sample <k>, or STILL frame)`. List every change, including boundary shifts.

### 12. Still measurements

One block per STILL, measured only from that image: background role; every layer with its box (`x y w h` in %); for each text line its cap height (% of frame height) and color role (`primary`, `muted`, `accent`), judged line by line because lines in one headline often differ; any constant transform (tilt angles, perspective); the logo's height and any per-part detail (which bars are shorter, by how much).

Never quote the video's words anywhere in the spec.
