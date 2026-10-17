# Ava Video Producer workspace integration

The producer is a pnpm app at `apps/ava-video-producer`, named
`@avandar/ava-video-producer`. The agent skill, Motion Atlas, showcase server,
scene library, capture tools, fixtures, and approved fictional sample plans live
here. It has no nested Git repository and no copied Avandar component tree.
The imported toolkit's MIT notice remains in this app's `LICENSE`; product
components are supplied by the enclosing repository under its own license.
`private: true` in `package.json` prevents accidental npm publication. It does not
require a private GitHub repository.

## Product source and iteration

Product aliases (`@/`, `$/`, package aliases, and `@product-assets/`) resolve to
this same worktree's `src/`, `shared/`, `packages/`, and `public/`. Adapters still
provide deterministic fictional state instead of authentication, network queries,
or persistence. Any product component can be imported through these aliases;
components needing app context still need suitable providers or fixture adapters.
Five authored feature timelines are available, not an automatically generated
film for every component in the repository.

- `pnpm component:review` builds the current source, watches imported product and
  adapter dependencies, and reloads the browser after a successful rebuild.
  Reloading resets the selected feature and playhead. No backend is needed.
- `pnpm component:watch` watches the compiled bridge used by Remotion Studio.
- `pnpm video preview <plan>` and `pnpm video render <plan>` rebuild product
  components automatically when the storyboard contains an `avandar` scene.
- `pnpm showcase` builds live players for Showcase, Productions, and Motion
  Atlas, then watches their imported product, adapter, composition, and gallery
  sources. Storyboard edits also refresh previews. These previews play React
  compositions without loading MP4s.
- `pnpm motion:build` reads current Avandar theme values for the Atlas palette.
  The running showcase watches those inputs and rebuilds the gallery.

The review server uses `out/component-review/product/`; rendering uses
`src/avandar/generated/`. Both contain ignored build outputs. The declaration
file remains source-controlled. Builds record revision and per-file hashes,
including uncommitted product changes. Source changes invalidate existing
preview evidence. The shared pnpm lockfile is included in render fingerprints.
Live gallery builds use ignored `apps/ava-video-producer/out/showcase/browser/`.

**Download MP4** renders only when requested, using the current composition and
selected options. Product films preserve the captions toggle; Atlas exports
preserve the selected accent and background. The local server reports progress,
serializes renders, and serves the file only after completion. These generated
exports remain in ignored
`apps/ava-video-producer/out/showcase/exports/<job-id>/`. No MP4 files are tracked.
Existing CLI preview, render, and delivery commands remain supported, with
their generated outputs ignored. `render:showcase` leaves film outputs under
`apps/ava-video-producer/out/`; `component:deliver` writes
`apps/ava-video-producer/out/component-deliveries/`; stock CLI deliveries use
`apps/ava-video-producer/out/motion/deliveries/`. These commands do not install
MP4s into gallery assets or rewrite page revision strings.

On macOS, production players generate and cache scratch narration from current
storyboard cues. Off macOS they use silent playback with captions. Homepage
films remain silent. Transcript and SRT downloads use current plans rather than
historical delivery files.

## Private projects

From the workspace root:

```bash
pnpm --filter @avandar/ava-video-producer video:new launch
```

This creates the ignored root `.videos/launch/` directory with a sample
`storyboard.json` and empty `public/` folder. From the producer app:

```bash
pnpm video plan ../../.videos/launch/storyboard.json
pnpm video preview ../../.videos/launch/storyboard.json
# Inspect the preview before rendering.
pnpm video render ../../.videos/launch/storyboard.json
```

All commands infer the project from its path. Private project assets resolve
inside `.videos/<project>/public/`; plans, captions, speech, frames, and finished
exports go under that project's `out/`. Derived narration plans retain the same
workspace. Symlink escapes are rejected. Only explicitly referenced media is
staged for the renderer. The showcase serves gallery files, generated player
bundles, approved plan media, and completed exports through bounded local
routes. Component review serves only its generated review files. Neither serves
`.videos/` or the repository root. Environment files are not bundled;
`remotion.env` stays empty.

The image-sequence step uses Remotion's renderer API because its CLI rejects
hidden parent directories as filename extensions. The pipeline still renders
JPEG frames serially (`concurrency: 1`), encodes with FFmpeg, and runs the unchanged
frame and loop gate. FFmpeg may be supplied by `ffmpeg-static`, `FFMPEG_BIN`, or
PATH; `ffprobe` is needed for media checks.

Private company footage, customer data, unpublished briefs, internal audits, and
credentials do not belong in the sample app. Historical internal planning notes
are preserved locally in `.videos/migration-archive/docs/`. This archive and any
private projects must be moved to the main checkout before removing a worktree:
Git merges do not transfer ignored files. Never force-add `.videos/`.

## Migration verification

The historical migration record is in
[workspace-validation.md](workspace-validation.md). Earlier render records
describe the exports and source revisions verified at that time, not fresh
tests of the current live compositions or product. MP4 files are generated
locally when needed and are no longer tracked sample inputs.
The imported frame DSL and fixture code retain scoped style exceptions in the
workspace ESLint configuration; behavioral checks remain enabled. Generated
bundles, render outputs, and private projects are excluded from linting.

The source repository is retained until the migration is reviewed and merged.
No merge, push, publication, or GitHub repository deletion is performed by any
producer command. Cleanup of the source repository is a separate authorized step
following the user's approval to merge this migration into `develop`.
