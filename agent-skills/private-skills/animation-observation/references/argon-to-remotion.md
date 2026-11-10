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
| Transition between shots (`T*`) | `StoryFilm` (`src/storyboard/StoryFilm/StoryFilm.tsx`) | **Only a dissolve exists** (`transitionInFrames`, `EASE.inOut`, over a frozen last frame of the outgoing shot; `0` = hard cut). Any other shot-boundary transition must be added here as a new, generic, schema-validated transition kind. |
| Transition inside one continuous shot | continuity beats: `src/continuity/continuitySchema.ts` `beats[].transition.kind`, rendered by `SceneTransition.tsx` in `src/motion-components` | Kinds: `cut`, `dissolve`, `wipe`, `aperture`, `spatial` (push with blur), `handoff`, `morph`. Continuity needs a 1600 x 840 stage. |
| Element motion (`M*`) on a graphic | a Motion Atlas stock preset (`src/stock/presets/<Name>/`) | Self-contained 960 x 600 SVG with a 180-frame loop. Good for logos, charts, diagrams, typing. |
| Element motion on text | `typography` scene (masked word rise, `wordStaggerFrames`, `revealAtFrame`), `title` scene (fixed 66 frames), stock `word-reveal`, `terminal-type` | No per-letter, line-fade, or wordmark-wipe mode. Add one as a prop on `TypographyScene` rather than a new scene. |
| Camera move | `DiagramCamera` / camera tracks in `src/motion-components` (SVG, zoom 1 to 3, keys `{at,x,y,zoom,ease}`) | Only inside stock graphics and continuity beats. Nothing moves a camera over a whole storyboard shot. |
| Composition template (`C*`) | a scene type, or a new scene/layout in `src/scenes/` registered in `shotSchema.ts` + `ShotView.tsx` | Document in `docs/shared-scene-library.md`. |
| Recurring composition + transition pairing | a continuity study: `storyboards/explainers/study-<x>.json` + `src/continuity/vocabulary/studyCatalog.yaml` entry, then `pnpm continuity:messages` | Studies need at least 3 distinct tags and a real `sourceFilm`. |

## Known platform gaps

These were true when this file was written. Check the code before assuming
they are still gaps.

- **No 3D.** No `perspective`, `rotateX/Y`, or `preserve-3d` anywhere. Tilted
  cards, card flips, and 3D extrusions need a new component.
  - The rule "never put a lasting transform on the container holding the
    whole UI" is about live product UI, where scaling resamples every glyph.
    A tilted card showing a **still image** (a product screenshot in `media`)
    is fine. A tilted card holding the live `avandar` scene is not.
- **No shot-level wipe, push, whip, or zoom-through.** Add generic transition
  kinds to `StoryFilm` (see "Adding a shot transition" below).
- **Motion blur** exists only in `DiagramCamera` (temporal, SVG), the
  `spatial` transition (CSS `blur()`), `AnchoredOverlay` (velocity blur), and
  the cursor. For a fast slide, a velocity-scaled directional blur
  (`filter: blur()` on the moving layer, or an SVG `feGaussianBlur` with an
  X-only `stdDeviation`) is the accepted approximation.
- **No low-res fast render.** `render` always draws at canvas size with
  `--concurrency=1`. Use `preview` contact sheets while iterating.

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
  and S2 means S2's first 10 frames are the transition.
- **Avandar content.** Curated product screenshots are in
  `public/avandar/screens/*.png`. A `.videos/<slug>/` plan only sees its own
  `public/`, so copy the ones you need into `.videos/<slug>/public/`. Write
  copy about real Avandar features (read `docs/using-avandar.md`). Editorial
  graphics (`stock`, `graph`, `flowchart`, `metric`) are illustrative and
  must not read as product claims.
- **Colors.** Use theme tokens (`plan.theme` keys and the app's CSS
  variables). Map the reference's color roles onto them: its dark field to
  `ground`/`background`, its accent field to `brand`, and so on.

## Commands

Run from `apps/ava-video-producer`. Every script runs the license guard.

```bash
pnpm video validate ../../.videos/<slug>/storyboard.json
pnpm video preview  ../../.videos/<slug>/storyboard.json   # .videos/<slug>/out/<plan.id>/preview/contact-sheet.jpg
pnpm video render   ../../.videos/<slug>/storyboard.json   # .videos/<slug>/out/<plan.id>/render/final.mp4
npm run typecheck                                          # also runs motion:build
npm test                                                   # also runs stock:messages and component build
node --import tsx --import ./scripts/yaml/registerYaml.mjs --test tests/storyboard.test.ts
```

- `render` requires a preview of the same plan to exist first.
- `prevideo`, `premotion`, and `pretest` run `stock:messages`, which can
  rewrite tracked `*.generated.ts` catalogs. Commit them only when a preset
  changed.
- The frame gate in `scripts/check-frames.mjs` must pass. Never loosen its
  thresholds. A legitimate fast transition that trips it needs a design fix.
