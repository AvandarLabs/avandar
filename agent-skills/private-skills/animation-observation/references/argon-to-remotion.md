# Argon spec to Remotion

How to turn a `motion-spec.md` into pieces of `apps/ava-video-producer`.
Paths are relative to that app unless they start with `.videos/` (the
worktree root's private projects). The code is the source of truth: when this
file and the code disagree, trust the code and fix this file.

## Where each kind of spec item lives

| Spec item | Home | Notes |
| --- | --- | --- |
| Curve, duration, stagger (`EASE`, `DUR`, `STAGGER`) | `src/motion.ts` | No runtime imports in that file. Document new tokens in `docs/motion-vocabulary.md`. |
| Shot (one `S*` in the storyboard script) | a storyboard shot: `src/storyboard/schema/shotSchema.ts` registry, rendered by `src/storyboard/StoryFilm/ShotView.tsx` | Scene types: `title`, `typography`, `graph`, `flowchart`, `metric`, `media`, `stock`, `avandar`, `continuity`. |
| Transition between shots (`T*`, class `overlap`) | `StoryFilm` (`src/storyboard/StoryFilm/StoryFilm.tsx`), shot `transition: {kind, ...}` with `transitionInFrames` as its length | Kinds: `dissolve` (default) and `stepped-column-wipe`. `transitionInFrames: 0` is a hard cut. Add other kinds here as generic, schema-validated options. |
| Transition inside one continuous shot | continuity beats: `src/continuity/continuitySchema.ts` `beats[].transition.kind`, rendered by `SceneTransition.tsx` in `src/motion-components` | Kinds: `cut`, `dissolve`, `wipe`, `aperture`, `spatial` (push with blur), `handoff`, `morph`. Continuity needs a 1600 x 840 stage. |
| Element motion (`M*`) on a graphic | a Motion Atlas stock preset (`src/stock/presets/<Name>/`) | Self-contained 960 x 600 SVG with a 180-frame loop. Good for logos, charts, diagrams, typing. |
| Element motion on text | `typography` scene (masked word rise, `wordStaggerFrames`, `revealAtFrame`), `title` scene (fixed 66 frames), stock `word-reveal`, `terminal-type` | No per-letter, line-fade, or wordmark-wipe mode. Add one as a prop on `TypographyScene` rather than a new scene. |
| Camera move | `DiagramCamera` / camera tracks in `src/motion-components` (SVG, zoom 1 to 3, keys `{at,x,y,zoom,ease}`) | Only inside stock graphics and continuity beats. Nothing moves a camera over a whole storyboard shot. |
| Composition template (`C*`) | a scene type, or a new scene/layout in `src/scenes/` registered in `shotSchema.ts` + `ShotView.tsx` | Document in `docs/shared-scene-library.md`. |
| Demo of a new scene or shot transition | a Productions plan: `storyboards/<name>.json`, listed in `scripts/showcase/ShowcaseFilms` `PLANS` and as a card in `showcase/productions.html` (see `storyboards/shot-vocabulary.json`) | Continuity studies (`studyCatalog.yaml`) only host 1600 x 840 continuity shots with a real `sourceFilm`, so they cannot demo plain scenes. |
| Recurring continuity composition + transition | a continuity study: `storyboards/explainers/study-<x>.json` + `src/continuity/vocabulary/studyCatalog.yaml` entry, then `pnpm continuity:messages` | At least 3 distinct tags and a real `sourceFilm`. |

## What exists for copying motion

Built for earlier runs; read `docs/shared-scene-library.md`,
`docs/scene-api.md`, and `storyboards/shot-vocabulary.json` for every prop.

- Per-shot `theme` override on any shot (for example
  `{"ground": "var(--brand)"}` for an accent field).
- `stepped-column-wipe` shot transition (columns, fractional stagger, rise
  direction, column order, frozen or playing outgoing shot with drift and
  blur).
- `tilted-window` scene: perspective-tilted window over stills or footage,
  with headline lines, whip, flip-split, and pull-back entrances, a
  `whip-left` exit, a window-only camera, a carousel of windows, a racing
  pair with counters, and a secondary window.
- `brand-lockup` scene: the real logo built from N column masks, a
  wordmark, a call-to-action stack, and a `fly-through` exit.
- `bar-comparison` scene: one or two hero metrics over bar rows, with an
  `erase` exit.
- `typography` `revealMode` (`word-mask`, `line-fade`, `wipe`, `cut`), an
  icon, a staged exit, and a `caption` size.
- `graph` node items and tick frames, parallel edges, and travelling
  packets on edges.
- Tokens: `EASE.in`, `EASE.surge`, `DUR.whip`, `STAGGER_COLUMN`, plus the
  window tilt tokens in `windowTilt.ts`; directional blur via
  `HorizontalBlurFilter`.

Still missing when last checked (check the code first):

- **Motion blur** is a velocity-scaled directional blur approximation, not
  shutter blur.
- **No camera over a whole storyboard shot**; cameras exist in stock
  graphics, continuity beats, and the `tilted-window` window layer.
- **No low-res fast render.** `render` always draws at canvas size with
  `--concurrency=1`. Use `preview` contact sheets while iterating.
- `docs/shared-scene-library.md` may omit some scene ids; `shotSchema.ts` is
  the registry.

## The frame gate and hard cuts

`scripts/check-frames.mjs` fails any frame whose mean luma moves more than
25 (0-255) from the frame before. It exists to catch flicker. Never loosen
its thresholds (the producer's AGENTS.md forbids it).

A reference that hard-cuts between distant fields trips it on purpose. With
Avandar tokens, dark to brand blue is about 79, brand blue to light about
156, and dark to light about 235. An 8-column wipe at 0.5-frame stagger only
survives a jump of about 100. So:

1. In Phase 2, compute the field change at every boundary and mark which
   ones the gate will fail. Do the same for in-shot motions whenever
   Avandar's content is much lighter or darker than the reference's (a
   bright screenshot pulled back onto a dark field can dim the frame by 45
   in one frame where the reference's dark footage did not). Fix those
   generically, for example with a gentler ease of the same length.
2. **Build the film to match the reference anyway.** Do not soften a hard
   cut or stretch a transition just to pass the gate: that breaks the copy.
3. When the only gate failures are luma jumps at intentional shot
   boundaries, the encoded picture still exists at
   `.videos/<slug>/out/<plan.id>/render/<plan.id>.mp4` (only `final.mp4` is
   skipped). Use it for evaluation, list the failing frames and their
   boundaries in the report, and say the film is not deliverable until the
   user decides how the gate should treat intentional cuts. Frames of an
   `exit-then-cut` exit and of an `overlap` transition count as "at the
   boundary". Any other failure is a real defect: fix it.

## Placing a boundary by its class

The spec's section 3 classifies every shot boundary. Build each class at the
level that owns it:

| Class | Build it as |
| --- | --- |
| `hard-cut` | `transitionInFrames: 0` |
| `cut-then-entrance` | a hard cut plus entrance motions in the incoming shot's scene |
| `exit-then-cut` | an exit option on the outgoing shot's scene (only the layers the spec says move), then a hard cut |
| `overlap` | a shot transition in `StoryFilm` (both shots on screen at once) |

Do not build an `exit-then-cut` as a `StoryFilm` transition: that moves the
whole outgoing frame, including layers the spec says stay or fade in place.

## Brand marks with different geometry

A reference's signature beats often animate its own logo's geometry (bars
that grow, a mark that splits and flies through). Avandar's mark is a single
raster image (`public/logo.png` in the workspace), so:

- Rebuild such beats as motion of the real mark: N column (or row) masks
  over the image that animate like the reference's parts, with N a prop.
- Drop details that exist only in the other brand's mark (notches, its
  letterforms). Keep the timing, order, easing, and scale of the beat.
- Never redraw or approximate Avandar's mark as vector shapes.
- Trim the image's transparent padding first (an alpha bounding-box crop,
  not a redraw): `public/logo.png` is 560 x 560 with the mark in about
  380 x 281, so sizing by image height draws the mark at half size.

## Adding a shot transition

1. Add an optional `transition` object to the shot schema
   (`src/storyboard/schema/shotSchema.ts`), with `kind` as a discriminated
   union. Keep `transitionInFrames` as its duration so existing plans still
   validate unchanged.
2. Render it in `StoryFilm.tsx` during the overlap, with access to both the
   outgoing shot (frozen or still playing) and the incoming shot. A
   transition whose outgoing layer moves (a whip pan) needs the outgoing shot
   rendered as a moving layer, not just faded.
3. Put each kind in its own file under `src/storyboard/StoryFilm/` with a
   pure style function of `(progress, options)`, so it can be unit tested
   like `getSceneTransitionStyle`.
4. Parameterize geometry (column count, stagger, direction, colors from
   theme tokens) instead of hardcoding the reference's values.
5. Test it in `tests/storyboard.test.ts`, and document it in
   `docs/scene-api.md` and `docs/video-pipeline.md`.

## Adding a Motion Atlas stock preset

Copy the newest preset's folder shape (`src/stock/presets/LateTypeEvidence/`):

- `<Name>.tsx`: SVG renderer `(GraphicProps & { input })`. User-visible text
  comes from `input`, never hardcoded JSX.
- `<Name>.schema.ts`: strict zod `inputSchema` (no defaults), `Input`,
  `SEMANTIC_RULES`.
- `<Name>.fixtures.ts`: `DEFAULT_INPUT`, `CHANGED_INPUT`, `fixtures`,
  `invalidInputs`.
- `<Name>.metadata.yaml`: Lingui descriptors `{id: motionAtlas.<id>.<field>,
  message}` for name, description, category, useWhen, prompt,
  creativeDirection, intent, distinction, tags[], goodFor[], domains[],
  aliases[], notFor[], plus `motionBeats[{startFrame,endFrame,description}]`.
- `<Name>.metadata.ts`: `METADATA = parseStockMetadata(yaml)`,
  `DEFAULT_TEXT_PATHS`, `bindingExamples`.
- `<Name>.controls.ts`: `StockControl[]` (or `makeStockControlsFromSchema`).
- `<Name>.contract.ts`: the `StockContract<Input>` (`loopFrames: 180`,
  `collection: "general"` unless it is social-sector).
- `__tests__/<Name>.contract.test.ts` using
  `tests/helpers/registerStockPresetAssertions`,
  `registerStockLocalizationAssertions`, and
  `registerStockTextLayoutAssertions`.

Then edit:

1. `src/stock/registry/stockContracts.ts`: import and register the contract.
2. `src/stock/registry/stockRenderers/generalStockRenderers.ts`: register
   with `makeStockRendererFromComponent({ preset, Renderer })` (the docs say
   `createStockRenderer`; that name does not exist).
3. `docs/motion-atlas/catalog-expansion.json`: add the entry
   (`tests/stock.test.ts` checks the id list against it, and
   `src/stock/integratedContracts.test.ts` checks the defaults).
4. `tests/stock.test.ts`: update the hardcoded general / social-sector counts.
5. `docs/stock-motion-library.md` and `docs/motion-atlas/catalog-expansion.md`:
   update counts and add the preset.
6. Run `pnpm stock:messages` (regenerates `src/stock/i18n/messages.en.generated.ts`;
   never edit it by hand), then `npm run motion:build`.
7. `npm run motion -- preview <id>` and read
   `out/motion/preview/<id>/<hash>/contact-sheet.jpg`.

A stock preset is a 180-frame loop. For a one-shot beat inside a longer shot,
design the 180 frames so the beat completes early and holds, or build the
beat as a scene option instead.

## Building the film

- **Canvas.** The plan's `fps` is fixed at 30. Width and height must be even
  and match the delivery aspect ratio. For a 16:9 reference use 1920 x 1080
  (delivery 1920 x 1080) unless the film uses `avandar` or `continuity`
  shots, which need a 1600-wide canvas with an 840 stage. Prefer `media`
  shots with screenshots over `avandar` shots when matching a 16:9 reference.
- **Shot timing.** Copy each spec shot's `to - from` into
  `durationInFrames`. A transition occupies the start of the incoming shot
  and does not change total duration, so a 10-frame transition between S1
  and S2 means S2's first 10 frames are the transition. The spec puts an
  `overlap` boundary at the transition's first frame for this reason; if an
  older spec puts it at full cover instead, start the incoming shot at the
  transition's first frame so every event lands on the spec's frame.
- **Exits end at the cut.** An exit option runs for its duration from
  `exit.atFrame`, so set `atFrame = last exit frame - duration + 1`, not the
  spec's first exit frame, and check the outgoing layer is gone by the cut
  when the spec shows an empty field before it.
- **Inventory per spec.** Phase 4 builds from the inventory written against
  the same spec file. If the spec was re-run, redo the inventory rows that
  changed first.
- **Avandar content.** Curated product screenshots are in
  `public/avandar/screens/*.png`. A `.videos/<slug>/` plan only sees its own
  `public/`, so copy the ones you need into `.videos/<slug>/public/`. Write
  copy about real Avandar features (read `docs/using-avandar.md`). Editorial
  graphics (`stock`, `graph`, `flowchart`, `metric`) are illustrative and
  must not read as product claims.
- **Colors.** Use theme tokens (`plan.theme` keys and the app's CSS
  variables). Map the reference's color roles onto them: `dark-field` to the
  darkest Avandar neutral (`NEUTRAL_SHADES[9]`, a navy), `accent-field` to
  `brand`, `light-field` to the light background, and `black-field` to
  `#000000` (Avandar has no black token; `shot-vocabulary.json` does the
  same).
- **Fictional data label.** Product footage and screenshots must keep
  **Fictional demonstration data** visible (producer AGENTS.md), even when
  the reference's composition has no slot for it. `tilted-window` has a
  `footnote` for this.
- **Reading previews.** The preview contact sheet of a long film is too tall
  to read in one image. Read the individual `still-NNN.jpg` files around
  each boundary instead, and use `scripts/extract-frames.mjs` on the
  rendered mp4.

## Commands

Run from `apps/ava-video-producer`. Every script runs the license guard.

Before changing code, run `npm test` once and save its failure list as a
baseline: some tests may already fail in a worktree (for example the
product-bundle pre-step), and some are flaky under load (license and
showcase-server tests). A regression is a failure that is not in the
baseline and still fails when its file is run alone.

```bash
pnpm video validate ../../.videos/<slug>/storyboard.json
pnpm video preview  ../../.videos/<slug>/storyboard.json   # .videos/<slug>/out/<plan.id>/preview/contact-sheet.jpg
pnpm video render   ../../.videos/<slug>/storyboard.json   # .videos/<slug>/out/<plan.id>/render/final.mp4
npm run typecheck                                          # also runs motion:build
npm test                                                   # also runs stock:messages and component build
node --import tsx --import ./scripts/yaml/registerYaml.mjs --test tests/storyboard.test.ts
```

- `render` requires a preview of the same plan to exist first.
- `prevideo`, `premotion`, and `pretest` regenerate tracked catalogs
  (`src/stock/i18n/*.generated.ts`, `src/continuity/i18n/*.generated.ts`,
  `locales/en/messages.ts`, `src/gallery/locales/en/messages.ts`) even when
  nothing changed. Commit them only when their source changed; otherwise
  restore them with `git checkout -- <paths>` before committing.
- The frame gate in `scripts/check-frames.mjs` must pass. Never loosen its
  thresholds. A legitimate fast transition that trips it needs a design fix.
