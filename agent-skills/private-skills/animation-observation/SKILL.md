---
name: animation-observation
description: Watches a reference video with Gemini Argon 4, writes a motion, composition, and transition spec with a storyboard script, adds any missing Motion Atlas pieces, and rebuilds the film with Avandar content in apps/ava-video-producer. Optionally evaluates the copy with Argon and hardens this skill until the copy is acceptable. Only run when explicitly requested with a video URL or file path.
disable-model-invocation: true
argument-hint: <video-url-or-file-path> [evaluate | skip-evaluation]
metadata:
  author: jpsyx
  version: "0.3.0"
  tags: avandar, video, remotion, motion-atlas, gemini
---

# Animation observation

Turn someone else's video into an Avandar video that **moves the same way**:
same motion beats, transitions, composition, pacing, and vibe. Content, copy,
and colors are Avandar's own. Gemini Argon 4 (`gemini-4-argon`) is the eyes:
it watches the reference and writes the spec, and later judges the copy.
Claude is the hands: it maps the spec onto the Motion Atlas, builds what is
missing, and renders the film.

The goal of this skill is a **one-shot**: one run produces an acceptable copy.
Acceptable means the core motion, transition, and composition beats land and
the speed and vibe match. Stylistic tweaks may remain.

## Before anything else

1. **Require a source.** The invocation must name a video URL or a local file
   path. If it does not, ask for one and stop.
2. **Ask about evaluation** unless the invocation already said `evaluate` /
   `skip-evaluation` (or plainly asked to evaluate or skip it). There is no
   default. Ask in one question, with this one-sentence reminder:
   > The evaluation phase renders the copy, has Argon 4 compare it to the
   > original, and then hardens this skill and re-runs until the copy is
   > acceptable (costlier: several renders and Argon calls).
3. Read, in this order:
   - `apps/ava-video-producer/AGENTS.md`
   - `apps/ava-video-producer/.claude/skills/product-demo/SKILL.md`
   - [references/argon-to-remotion.md](references/argon-to-remotion.md)
   - [references/hardening-log.md](references/hardening-log.md) (what earlier
     runs learned; do not repeat their mistakes)

## Running in phases

A full run is long. When the harness has subagents, run each phase group in
a fresh subagent that reads this skill and the files the previous group
wrote: Observe + Inventory, then Build + Film, then Evaluate. Everything a
later phase needs must be in `.videos/<slug>/research/`, never only in a
conversation. The orchestrator owns Phase 6.

## Secrets

The Gemini key lives in `GEMINI_API_KEY` in the workspace root's
`.env.video-producer.local`. `scripts/argon.mjs` reads that one line itself.
Never open, print, cat, grep, or source that file, never echo the key, and
never write it anywhere. If the script says the key is missing, tell the user
to add `GEMINI_API_KEY=` to that file and stop.

## Paths

Run everything from the worktree root. `SKILL_DIR` is
`agent-skills/private-skills/animation-observation`. Name the project with a
short kebab-case slug, `<slug>`, and create it with
`pnpm --filter @avandar/ava-video-producer video:new <slug>`. All run
artifacts live in the ignored `.videos/<slug>/`:

| Path | Holds |
| --- | --- |
| `.videos/<slug>/research/source/reference.mp4` | the downloaded reference (untrusted media, its own directory) |
| `.videos/<slug>/research/motion-spec.draft.md` | Argon's first pass, untouched |
| `.videos/<slug>/research/motion-spec.raw.md` | Argon's refined pass, untouched |
| `.videos/<slug>/research/motion-spec.md` | the refined spec plus Claude's verification table and corrections: the build input |
| `.videos/<slug>/research/frames/` | contact sheets used to verify the spec |
| `.videos/<slug>/research/inventory.md` | reuse-or-build map from spec ids to atlas pieces |
| `.videos/<slug>/storyboard.json` | the film |
| `.videos/<slug>/research/eval/iteration-<n>.json` | Argon's comparison per iteration |

## Phase 1: Observe

1. Get the source into `.videos/<slug>/research/source/reference.mp4`:
   - A local file: copy it there.
   - A URL: `node $SKILL_DIR/scripts/fetch-video.mjs <url> .videos/<slug>/research/source/reference.mp4`.
     It uses the repo's Playwright to find the page's mp4. If it reports no
     downloadable mp4 (streaming-only sites), ask the user for a local copy
     of the video and stop until you have one. Do not reach for tools outside
     this repository on your own.
   - Probe it from `apps/ava-video-producer` with Remotion's bundled ffprobe:
     `pnpm exec remotion ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate -of compact <abs-path>`.
2. **Draft pass** (whole video, about 10 fps):
   ```bash
   node $SKILL_DIR/scripts/argon.mjs \
     --prompt $SKILL_DIR/prompts/observe.md \
     --video REFERENCE=.videos/<slug>/research/source/reference.mp4 \
     --out .videos/<slug>/research/motion-spec.draft.md
   ```
   About 3 minutes for a 78 s video. Argon's API samples video at 24 fps at
   most, and the whole video at 10 fps, so the draft cannot time events
   shorter than about 9 frames. The refine pass fixes that.
3. **Refine pass** (whole video, frame-accurate close-ups of every boundary,
   and one full-resolution still per shot):
   ```bash
   node $SKILL_DIR/scripts/argon.mjs \
     --clips-from .videos/<slug>/research/motion-spec.draft.md \
     --prompt $SKILL_DIR/prompts/refine.md \
     --video REFERENCE=.videos/<slug>/research/source/reference.mp4 \
     --context $SKILL_DIR/prompts/observe.md \
     --context .videos/<slug>/research/motion-spec.draft.md \
     --out .videos/<slug>/research/motion-spec.raw.md
   ```
   `--clips-from` reads the draft's storyboard script and sends each
   boundary as a slowed clip in which every sample is one source frame, so
   Argon counts frames instead of converting timestamps. Preview what it will
   send with `node $SKILL_DIR/scripts/boundary-clips.mjs <draft>`. About 4
   minutes for a 78 s video.
   Never edit `motion-spec.draft.md` or `motion-spec.raw.md`. The evaluation
   phase needs them to see what the prompts produced. Copy the raw file to
   `motion-spec.md` and edit only that copy.
4. **Verify the spec against frames before building on it.** For every
   boundary in section 3, every transition `T*`, every item in "Build
   priorities", and every direction claim, make a labelled contact sheet of
   the cited frame range and read it:
   ```bash
   node $SKILL_DIR/scripts/extract-frames.mjs \
     --video .videos/<slug>/research/source/reference.mp4 \
     --out .videos/<slug>/research/frames/<id>.jpg \
     --from <frame> --to <frame> --step 1 --width 320 --columns 8
   ```
   (`--frames a,b,c` picks exact frames; frame numbers are at 30 fps.) Use
   only this script for frames: it uses the repo's ffmpeg (`ffmpeg-static`,
   else Remotion's bundled one) and Playwright, and labels frames correctly.
   Use `--step 1` across transitions: they last only a few frames.
   Add a `## Verification` table at the top of `motion-spec.md`: claim,
   verdict (correct / corrected / unverified), correction. Fix every wrong
   value in the body too: the body is what gets built, and it wins over the
   table if they ever disagree. Count the corrections: in the evaluation phase each one is
   a prompt weakness to fix, and the count across runs shows whether the
   prompts are improving.

## Phase 2: Inventory

Read `docs/motion-vocabulary.md`, `docs/shared-scene-library.md`,
`docs/stock-motion-library.md`, `docs/scene-api.md`, and
`docs/continuity-compositions.md` in `apps/ava-video-producer`. Then write
`research/inventory.md`: one row per spec id (`C*`, `T*`, `M*`, camera
moves), with columns `spec id | what it is | existing match (file, preset id,
scene type, or token) | fit: exact / adapt / missing | plan`.

Rules:

- Reuse before building. "Adapt" means a new prop or option on an existing
  piece, not a copy of it.
- A piece is missing only when no existing piece can produce the beat with
  props. Do not build a near-duplicate.
- Missing curves or durations become new tokens in `src/motion.ts` (`EASE`,
  `DUR`), documented in `docs/motion-vocabulary.md`. Missing design values
  become tokens too. Never hardcode a one-off value in a scene.

## Phase 3: Build what is missing

Follow [references/argon-to-remotion.md](references/argon-to-remotion.md) for
where each kind of piece lives and every file that must change with it:
component, `*.metadata.yaml`, catalog registration, i18n, docs, tests, and
the Motion Atlas gallery. Then:

- Make each new piece generic and reusable: parameters for counts, durations,
  direction, and colors (from tokens). Name it for what it does
  (`stepped-column-wipe`), never for the reference video.
- Run the producer's typecheck and tests (see the reference) before moving on.
- Preview each new piece's contact sheet and read it.

## Phase 4: Build the film

1. Write `.videos/<slug>/storyboard.json` from the spec's storyboard script.
   Keep the spec's shot count, shot lengths (in frames), composition template
   per shot, transitions at the same boundaries, and camera moves.
2. Content is Avandar's: real product components or approved captures, and
   copy about Avandar features. Follow `product-demo` SKILL.md for what may
   be shown. Never copy the reference's words, logo, or product.
3. Colors come from Avandar tokens. Keep the reference's color ROLES (dark
   field vs. accent field vs. light field, one accent vs. many).
4. Validate, preview, and read the contact sheet. Fix what the sheet shows.
5. Render the mp4 (see the reference for the command). Read a few frames of
   the render.

If the user skipped evaluation, stop here and report.

## Phase 5: Evaluate

Argon cannot run a browser or a Remotion player: it only takes video files.
Render an mp4 at the reference's resolution and fps, then:

```bash
node $SKILL_DIR/scripts/argon.mjs --json \
  --prompt $SKILL_DIR/prompts/compare.md \
  --video REFERENCE=.videos/<slug>/research/source/reference.mp4 \
  --video CANDIDATE=<rendered.mp4> \
  --context .videos/<slug>/research/motion-spec.md \
  --out .videos/<slug>/research/eval/iteration-<n>.json
```

**Acceptable** = every score (`motion`, `transitions`, `composition`,
`pacing`, `vibe`) is 7 or more and there is no `critical` difference. The
JSON's `acceptable` field applies that rule; check it yourself too.

Spot-check two or three of Argon's claimed differences against frames of both
videos. Argon can be wrong about the copy as well as the original.

## Phase 6: Harden and repeat

When the copy is not acceptable, fix the cause, not the symptom, in this
priority order:

1. `blame: spec` differences and Phase 1 corrections: harden
   `prompts/observe.md` so any future spec states it. Add a **general** rule
   (a measurement rule, a required field, a check to perform), never a fact
   about this one video. Test: would the rule help on a different video?
2. `blame: platform`: build the missing capability (Phase 3), generically.
3. `blame: build`: fix the film, and if the mistake came from unclear
   guidance, add it to `references/argon-to-remotion.md`. This is the lowest
   priority. The spec should be clear enough for any implementer.
4. Compare-prompt problems (wrong alignment, a false claim): harden
   `prompts/compare.md`.

Append one entry per iteration to
[references/hardening-log.md](references/hardening-log.md): scores, top
differences, and which file changed and why. Bump `metadata.version`.

Then re-run from Phase 1 when the observe prompt changed (a fresh spec), or
from Phase 4 otherwise. Stop when the copy is acceptable, or after five
iterations; then report the best iteration, the remaining differences, and
what blocks acceptance.

## Report

End with the final scores table per iteration, paths to the spec, inventory,
storyboard, render, and eval JSON, the list of atlas pieces and tokens added,
and the skill files changed.
