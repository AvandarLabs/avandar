# Agentic Product Demo

A Remotion project that renders product demo videos, plus the skill that
governs how they are shot. Compositions are React; output is mp4. The local
pipeline adds real Avandar capture, validated storyboards, reusable scenes,
narration/captions, and reproducible fictional demo data.

## Read the skill first

**`.claude/skills/product-demo/SKILL.md` before writing or editing any
composition.** It governs what gets asked, what gets
read instead of asked, and what may not be invented. Skipping it produces a
clip that looks fine and argues nothing.

Not on Claude Code? The file is plain markdown; read it directly.

## Read and maintain the inventories

- Read [docs/motion-vocabulary.md](docs/motion-vocabulary.md) before adding or changing animation behavior. Reuse the shared curves, durations, and helpers; update the inventory when their APIs or behavior change.
- Read [docs/shared-scene-library.md](docs/shared-scene-library.md) before adding or changing a scene or visual component. Reuse existing components and update the inventory when their interfaces or availability change.
- Use [docs/stock-motion-library.md](docs/stock-motion-library.md) and `showcase/motion.html` when choosing graphic references. Refer to stable preset IDs in briefs. Keep the gallery and Remotion on the same `StockGraphic` renderer; rebuild the browser bundle after edits. Stock labels, relationships, code, and values are illustrative, not product evidence. Add new presets to the typed catalog, renderer, documentation, and inspected preview/render outputs together.
- Keep motion helpers, reusable scenes, fixed example compositions, and proposed work clearly distinguished. Inline JSX in a demo is not an exported scene library component.
- Consult [docs/agent-architecture.md](docs/agent-architecture.md) when implementing capture, storyboards, new scene families, narration, captions, or pipeline stages. Update the coverage assessment when a gap is actually implemented; do not describe plans as shipped functionality.
- Read [docs/scene-api.md](docs/scene-api.md) and [docs/video-pipeline.md](docs/video-pipeline.md) before authoring a storyboard. Reuse `StoryFilm` and its strict scene registry; keep one plan as the source for shot order, captions, and audio timing.
- Read [docs/component-videos.md](docs/component-videos.md) before changing Avandar adapters or component films. Reuse actual product components and source CSS, keep fixture controllers separate, and rebuild the generated bridge after source or adapter edits.
- Before rehearsing Avandar, read [docs/using-avandar.md](docs/using-avandar.md), [docs/product-docs-review.md](docs/product-docs-review.md), [docs/linear-feature-review.md](docs/linear-feature-review.md), and [docs/video-priorities.md](docs/video-priorities.md). Distinguish marketed claims, source-inferred behavior, completed tickets, and actual browser evidence. Do not treat a completed issue as a verified product flow.
- Follow [docs/capture-pipeline.md](docs/capture-pipeline.md) for recording and [demo-data/README.md](demo-data/README.md) for fictional input data. Check the manifest and validator before reusing fixture counts or relationships.
- Keep `CLAUDE.md` as a relative symlink to `AGENTS.md`, so both agents read the same rules.

## Commands

```bash
pnpm install (from the Avandar workspace root)
npm run adopt ../src/app/globals.css    # take the product's tokens first
npm run studio                          # preview at localhost:3000, scrub the timeline
sh scripts/preview.sh <id>              # stills on every beat + a contact sheet
sh scripts/render.sh <id> [poster-frame] # render → deliver → gate
bash scripts/add-sfx.sh <id>            # sound pass over the finished mp4
node scripts/check-frames.mjs <file>    # the gate on its own
npm run typecheck                      # source and tool/test types
npm test                               # schema, scene, capture, and pipeline checks
npm run data:validate                  # verify fictional fixtures independently
npm run component:build                # compile components from this Avandar worktree
npm run component:review               # inspect component timelines at localhost:4175
npm run capture -- --list              # list local Avandar UI flows
npm run capture -- --flows import,explorer
npm run video -- validate storyboards/library.json
npm run video -- plan storyboards/library.json
npm run video -- preview storyboards/library.json
npm run video -- render storyboards/library.json
npm run motion:build                  # build the live Motion Atlas gallery
npm run motion -- preview all          # inspect each preset's contact sheet
npm run motion -- render all           # matching previews, serial render and loop gate
```

`STANDALONE=1` on a clip that plays once skips the loop-seam check, which
only means something for a clip that repeats in a page.
`DELIVER=1536:864` for 16:9; set it together with the canvas in `Root.tsx`,
never on its own for a fixed composition. Storyboards define both canvas and
delivery dimensions together; the CLI checks matching aspect ratios.

## Things that will not be obvious from the code

- **`--concurrency=1` on every render.** Parallel Chromium returns occasional
  frames whose page texture is wrapped. It reads as flicker, it is random, and
  `--gl=swangle` does not fix it. `render.sh` already passes it; do not remove
  it to speed up a render.
- **A phase root needs its own `background`.** Without it the phase is a sheet
  with holes, the previous one shows through, and the frame it unmounts on
  drops every panel at once, causing a luminance jump the gate fails on.
- **Never put a lasting `transform` on the container holding the whole UI.**
  Scaling the app frame resamples every glyph in it. Move what is inside.
- **`src/motion.ts` has no runtime imports.** Its React `CSSProperties` import
  is type-only. Keep the helpers independent of the renderer so they remain portable.
- **The gate is not optional.** `render.sh` exits non-zero on its failure. Do
  not loosen the thresholds in `check-frames.mjs` to make a render pass. It
  keeps the frame sequence on a failure so the flagged JPEG can be opened.
- **Nothing on screen may be invented.** Not a row, a card, a label, a count
  or a colour. Lists live in a constants module, not in the page; grep a
  visible string back to its definition and use the whole list in its order.
  Light or dark is a property of the screen, not the product, and `--primary`
  is usually not the accent the surface you are drawing actually uses. Arrangement
  and density live in the markup and its classes; read them, do not ask for a
  screenshot.
  Skipping this produces this kit's template with the product's name on it,
  and it renders clean and passes the gate. SKILL.md §1, "read the screen you
  are about to rebuild".
- **Intake is one block of three questions, not an interview**: scope, where
  the clip lives, whether they already know the flow, each with your own
  inference pre-marked as the recommendation. Use `AskUserQuestion` if the
  harness has it. **Length is never one of them**: asked, it is answered
  "short", and the demo rushes the steps it exists to show.
- **The gate cannot see the picture.** It measures half-against-half
  similarity and average luminance, and nothing else. A pointer pressing the
  wrong element, a phase drawn empty, a panel over the header: all pass.
  Run `scripts/preview.sh` for fixed clips, or `npm run video -- preview <plan>`
  for storyboards, and read the contact sheet/full-size frames before a full
  render. A matching preview fingerprint proves input consistency, not approval
  or visual correctness. Watch and listen to the finished film.
- **Pointer targets come from a rendered frame, never from the CSS**, and
  every target needs two keys: arrive, then hold to `CLICK + 8`. With one
  key `trackPos` starts easing toward the next target the frame it arrives,
  and the click fires 20 frames into that move. Both halves of this have
  shipped as a cursor visibly missing the button it pressed.

## Layout

`src/motion.ts` vocabulary · `src/title-card.tsx` cold open ·
`src/chrome.tsx` window, cursor, click beats · `src/compositions/` clips ·
`src/scenes/` reusable scenes · `src/storyboard/` schema and film renderer ·
`storyboards/` reviewed film inputs · `capture-flows/` real UI actions ·
`avandar-adapter/` frame-controlled product adapters · the enclosing Avandar `src/`, `shared/`, and `packages/` supply product source ·
`src/avandar/` generated bridge and measured pointer choreography ·
`demo-data/` fictional inputs and validators · `scripts/video.ts` assembly ·
`scripts/beats/<id>.txt` legacy sound scores · `.claude/skills/product-demo/` the skill.

## Clips shot against a real product

This workspace app may track approved, shareable fictional Avandar
screenshots, posters, storyboards, and sanitized provenance needed to review or
reproduce its demos. MP4s, normalized clips, and finished films are generated
locally and must remain ignored. Inspect selected artifacts for
credentials, customer information, signed URLs, and unrelated private content
before including them. Curated assets must be available to any tracked plan
that references them; do not register a composition that requires missing local
files. Keep the generic Demo story and palette intact. Its shared cursor is intentionally upgraded to native macOS assets; keep showcase provenance accurate when replacing exports.

Raw browser recordings, whole frame sequences, capture/session logs, traces,
auth state, and transient exports remain in ignored locations such as `out/`.
Never commit cookies, tokens, storage-state files, credentials, or raw request
dumps. Third-party company assets still remain local unless their inclusion is
explicitly authorized. Artifact eligibility does not change Git authorization
rules for committing, pushing, merging, or publication.

## Avandar workspace additions

- Never open, print, commit, or copy `.env.local`. It contains credentials. If a key is needed, extract only that key in a shell command and pass it directly to the consumer without showing it.
- Keep `Config.setDotEnvLocation("remotion.env")`. Never pass `.env.local` to Remotion: environment-file values are exposed to browser code.
- Every executable producer entry point must call the shared license guard before doing work. `scripts/lib/readLicense.mjs` reads only the public/private pair without populating `process.env`. Keep raw Remotion CLI configuration guarded too. Never add a skip-license environment variable. Tests use inert keys in temporary files and must never submit render telemetry with them.
- The starter showcase is intentionally generic. Preserve the original demo and palette when demonstrating upstream behavior; label new studies as additions.
- `pnpm showcase` serves the gallery, generated browser players, approved plan
  media, and completed downloads through bounded local routes. Never serve the
  repository root or private `.videos/` projects.
- Every showcase preview must play the live composition. Do not use an MP4 as a
  preview source. Watch imported product, adapter, composition, storyboard, and
  gallery sources and refresh only after successful rebuilds. Each gallery page
  shares one source-watch connection across its embedded players.
- Generate MP4s only after an explicit download or CLI render request. Gallery
  downloads use current source and selected options and stay under ignored
  `out/showcase/exports/`. Keep all MP4s, browser bundles, full frame sequences,
  and previews ignored. Curated poster images may remain tracked.
- Preserve the existing CLI workflows. `render:showcase` leaves outputs under
  `out/`, `component:deliver` writes `out/component-deliveries/`, and stock CLI
  deliveries use `out/motion/deliveries/`. Do not copy generated MP4s into gallery
  assets or rewrite page revision strings.
- Production player caption choices must match their exports. Motion Atlas
  downloads must preserve the selected accent and background. Do not imply that
  product films offer arbitrary brand or background controls.
- `TitleStudy`, `MotionLab`, and the library storyboard are examples of the kit itself, not claims about Avandar's UI or features. Label editorial diagrams and synthetic data clearly.
- Harborfield fixtures are deliberately fictional, authorized demo inputs. Keep **Fictional demonstration data** visible in product footage and exported examples. Preserve blank/missing values and dataset grain; do not turn fixture fields into claims about unimplemented product workflows.
- Component films render the actual worktree source closure with deterministic fixture state. Do not describe adapter typing, query results, save responses or navigation as a new live product test. Keep source hashes, fixture provenance and remaining product limitations explicit.
- Prefer prop-controlled product components to duplicated JSX. Any necessary controller shim must be narrow, documented and aliased explicitly. Import product source directly from the enclosing worktree. Keep video-only controllers in the adapters; never copy product components into this app.
- Use the shared `Cursor` with macOS assets, frame-driven click feedback and bounded motion blur. Hold on text fields throughout typing, use the I-beam for text entry and the hand for clickable targets, and preserve measured hotspots when changing shape or scale. Reserve grab/grabbing shapes for real drag choreography.
- Keep each feature in one continuous `avandar` shot so native grids, editors and MapLibre retain their lifecycle. Use the validated 1600 × 1000 canvas with the 1600 × 840 product stage and short single-line captions. Measure `data-video-target` bounds in rendered frames after layout changes; do not guess pointer coordinates.
- Map films showing geographic context must load the real product basemap and retain provider attribution. Wait for loaded tiles and rendered basemap features before capture; fail on tile errors instead of substituting `No basemap`. The frame gate alone cannot detect missing geography.
- Capture only the authorized local app and local backend. Use unrecorded login, in-memory auth transfer, and the guarded capture runner. Keep the product source read-only during video work and leave unrelated datasets/resources intact.
- A capture flow's code is not proof it succeeded. Retain failing feature status and inspect actual results before using footage to support a claim. Case Manager and Maps previews require explicit product limitations where applicable.
- Native Playwright recording is 25 fps; storyboard output is 30 fps. Record provenance, normalize or verify footage timing, and derive trims/callout coordinates from real frames. Capture action timestamps are approximate and must not be advertised as frame-exact.
- Narration cues drive transcript/SRT/VTT exports. Supplied SRT timing is manual alignment, not automatic speech recognition. Label system-generated voice as scratch narration, check duration/sync, and preserve speech when mixing effects after the picture gate.
- Generate and cache production scratch narration from current cues on macOS.
  Other platforms use silent playback with captions. Keep the homepage silent.
  Transcript and caption downloads must use the current authored plan.
- Final validation records describe completed captures and inspected renders, not planned runs. Unit tests, fixture checks, preview generation, frame gating, visual review, and listening review each establish different evidence.

## Workspace and private video projects

- This app is `@avandar/ava-video-producer` under `apps/ava-video-producer`. Use the
  root pnpm workspace lockfile and catalog singleton dependencies.
- `component:review` watches the same worktree's product components and adapters,
  rebuilding and reloading the browser. `video preview` and `video render` rebuild
  product components automatically. Compiled product bundles remain ignored.
- Company projects belong under root `.videos/<project>/`: `storyboard.json`,
  `public/` assets, and `out/` generated evidence. Use `pnpm video:new <name>`.
  Never add private footage, customer data, internal audits, or credentials to the
  tracked sample gallery. Neither local server serves `.videos/` or the repo root.
- Preserve private project directories before removing a worktree. They are not
  included in a Git merge. This includes `.videos/migration-archive/`.
