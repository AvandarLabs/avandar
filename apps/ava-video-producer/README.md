# Ava Video Producer

Our starter boilerplate is [Alexwtlf/agentic-product-demo](https://github.com/Alexwtlf/agentic-product-demo).
It supplied the original Remotion demo, product-demo agent skill, motion helpers,
title card, window chrome, and preview/render pipeline with its frame gate.
The upstream [MIT license](LICENSE) and [original README](docs/UPSTREAM_README.md)
are preserved here.

The showcase website and local server, Productions gallery, Motion Atlas,
interactive color controls, and Avandar component films are additions built for
Avandar on top of that starter. They were not included in the upstream version
we imported. Claude Code or Codex remains the coding agent; this app supplies
the instructions, components, and local production tools.

Run commands from `apps/ava-video-producer`, or use
`pnpm --filter @avandar/ava-video-producer <command>` from the workspace root.
No nested clone or source-copy step is needed. The product checkout is the source
of truth; build outputs are ignored and every gallery watches its source inputs.

```bash
pnpm showcase
pnpm --filter @avandar/ava-video-producer component:review
pnpm --filter @avandar/ava-video-producer video:new launch
# From apps/ava-video-producer:
pnpm video preview ../../.videos/launch/storyboard.json
```

Private projects live in root `.videos/<project>/`, with `public/` assets and
`out/` exports beside their storyboard. Git ignores this directory. The showcase
serves its gallery pages, generated players, and approved sample assets through
local routes. See [workspace migration](docs/workspace-migration.md)
for the source, privacy, and validation boundaries.

## Start with the showcase

Configure your [license keys](#license-keys) before running producer commands.

```bash
pnpm install # from the Avandar workspace root
pnpm showcase
```

Open **http://localhost:4173**. Showcase, Productions, and Motion Atlas play live
React compositions rather than prerecorded MP4s. The server builds their browser
players, watches the current worktree's imported source and storyboards, and
refreshes previews after successful rebuilds. Use this local server rather than
opening the HTML directly from disk. It does not serve the repository root or
private video projects.

| Clip | Length | What it demonstrates | Origin |
| --- | --- | --- | --- |
| From query to comparison | 19.7 seconds | Native SQL editing, grouped results, and chart reveal | Actual Avandar components with fictional Harborfield data |
| Words in motion | 8.4 seconds | Three masked headline treatments | New arrangement of the unchanged `TitleCard` |
| The small details | 12 seconds | Stagger, typing, counting, and click response | New layout using the existing motion and chrome helpers |

All three are silent, 30 fps, and export at 1536 × 960. The gallery includes
chapter jumps, playback speed, looping, and source links. **Download MP4** starts
a local render only when clicked, reports progress, and downloads the completed
file. Exports use the current source and selected preview options. They remain
ignored under `apps/ava-video-producer/out/showcase/exports/<job-id>/`; no MP4s
are tracked. The first clip uses actual Avandar components with deterministic
fictional state. The two studies demonstrate the starter toolkit. The original
generic `demo` composition remains available as the upstream reference.

The [Productions gallery](showcase/productions.html), at
**http://localhost:4173/productions.html**, contains the scene-library study, a
connected Avandar walkthrough, and five focused feature cuts. Product films use
actual React components and CSS with frame-controlled Harborfield fixtures.
Each player offers a captions toggle, and its download preserves that choice.
Transcript and SRT downloads come from the current storyboard. On macOS, the
server generates and caches scratch narration from the current text cues; other
platforms show silent previews with captions. The homepage films remain silent.
See [component videos](docs/component-videos.md) and the
[historical render validation record](docs/component-video-validation.md).

## Browse the motion vocabulary

Open **http://localhost:4173/motion.html** for **Motion Atlas**, a catalog of 20
stock motion graphics. Browse networks, plexus fields, integration diagrams,
animated code, charts, and interface patterns. Search or filter, open a large
preview, pause or scrub it, and copy a reference or brief. **Download MP4** renders
the six-second loop with the selected brand and background colors. Every preset
has a stable link such as `motion.html#plexus-field`.

The live gallery and Remotion use the same deterministic React/SVG renderer. These are conceptual graphics with fixed illustrative content, separate from recorded product evidence. The [stock motion catalog](docs/stock-motion-library.md) lists every ID, usage boundary, and reuse command. `StockScene` also supports these presets in the storyboard pipeline.

```bash
npm run motion:build                 # Build the ignored browser bundle
npm run motion -- list
npm run motion -- preview all        # Inspect out/motion/preview/<id>/contact-sheet.jpg
npm run motion -- render all         # Matching previews, serial renders, unchanged frame gate
# Or substitute one preset ID for "all", such as source-merge.
```

The catalog, renderer, and curated posters are source-controlled. Browser
bundles and MP4s are generated locally and ignored. The running showcase watches
stock and gallery sources automatically. MP4 exports require the existing
Remotion/FFmpeg prerequisites; live stock playback does not render video files.
Stock CLI exports use a media-free entry point without product compositions or
network fonts. Reduced-motion preferences start the gallery paused; visible
cards alone animate.

## Make an Avandar product video

The additions turn a saved storyboard into a local, narrated film. Start with the [implementation plan](docs/implementation-plan.md), [video priorities](docs/video-priorities.md), and [agent user manual](docs/using-avandar.md). Use the [Linear review workflow](docs/linear-feature-review.md) and [product documentation workflow](docs/product-docs-review.md) to gather current evidence. Keep company-specific research in the ignored video project.

Prerequisites: Node 22+, pnpm, Python 3 for fixture generation/validation, `ffprobe` on PATH, the installed `ffmpeg-static` binary (or `FFMPEG_BIN` override), and Playwright's headless Chromium. Local scratch speech uses macOS `/usr/bin/say`; other platforms can import a recording with aligned SRT. No global npm package is required. Playwright installs its browser in the normal user cache:

```bash
pnpm install # from the Avandar workspace root
npx playwright install chromium --only-shell
npm run data:validate
```

The component films import source from the same Avandar worktree and need no running Avandar app or backend. Map rendering requires internet access for the product's public basemap tiles, sprites and fonts. Build the bridge, inspect its feature timelines, then preview the storyboard:

```bash
npm run component:build
npm run component:review  # http://localhost:4175; review API in docs/component-videos.md
# In another terminal:
npm run video -- validate storyboards/import.json
npm run video -- preview storyboards/import.json
# Inspect the contact sheet before continuing.
npm run video -- tts storyboards/import.json
npm run video -- preview out/avandar-import/scratch/storyboard.json
npm run video -- render out/avandar-import/scratch/storyboard.json
```

Substitute `explorer`, `dashboards`, `cases`, `map` or `avandar-overview` for the source plan name. The [component workflow](docs/component-videos.md) explains source reuse, fixture boundaries, measured cursor targets and rebuilding from the current Avandar worktree. The six plans contain text cues; generated speech is scratch narration and requires listening review.

Browser capture remains available to verify behavior in the authorized local app and backend. Run that app with `pnpm dev` from `~/src/avandar`, then follow the [capture guide](docs/capture-pipeline.md). Component animation does not execute an end-to-end import, query, save or publication operation.

The [pipeline guide](docs/video-pipeline.md) covers validation, media inputs, manual recording alignment, transcript/SRT/VTT exports, scratch speech, preview fingerprints, and audio assembly. [Scene API](docs/scene-api.md) documents the typed scene registry. Rendered examples and their exact verification status are listed in [pipeline validation](docs/pipeline-validation.md).

The [Harborfield dataset](demo-data/README.md) is entirely fictional and versioned here: 240 cases, 297 contacts, 12 facilities, six district boundaries, and 36 weekly reports. Its generator, checksums, validation, and rehearsal queries make the input bundle reproducible. Successful captures also depend on the local app state; reused dataset names are not a byte-for-byte audit of persisted data. Missing weekly reports remain missing, rather than being represented as zero.

## Edit and render

```bash
npm run studio             # Remotion timeline and composition preview
npm run typecheck          # TypeScript validation
npm run preview:showcase   # Homepage storyboard and study contact sheets
npm run render:showcase    # Legacy CLI previews, renders, frame gates, local outputs
npm run render             # Only the original demo, written to out/
```

The CLI workflows remain available for explicit preview and delivery work.
Inspect their contact sheets before a full render. Render scripts use one
Chromium worker, preserve the frame sequence if a check fails, and retain the
starter's frame-check thresholds. CLI MP4s, contact sheets, backups, and
intermediate outputs stay ignored. Live galleries never depend on those files.
`render:showcase` keeps outputs under `apps/ava-video-producer/out/`;
`component:deliver` writes `apps/ava-video-producer/out/component-deliveries/`;
stock CLI deliveries use `apps/ava-video-producer/out/motion/deliveries/`.
These commands do not copy MP4s into gallery assets or update page revisions.
On-demand downloads use the same serial rendering and frame checks, with their
own outputs under `apps/ava-video-producer/out/showcase/exports/`. Numerical
checks still require visual review and, for narrated films, listening review.

For one composition:

```bash
sh scripts/preview.sh motion-lab
sh scripts/render.sh motion-lab 300
```

The title study has no separate opening sequence: preview it with `TITLE_OFFSET=0 sh scripts/preview.sh title-study 8 30 90 114 174 198`.

The automated gate checks for suspected frame tiling and abrupt brightness changes. It does not verify layout, product fidelity, or pacing; those still require visual review.

## Architecture and reusable building blocks

| Document | What it covers |
| --- | --- |
| [Agent architecture: coverage and gaps](docs/agent-architecture.md) | Original gaps, implemented additions, and remaining capability boundaries |
| [Motion vocabulary](docs/motion-vocabulary.md) | All current easing curves, duration tokens, animation helpers, pointer/title choreography, and sound cues |
| [Shared scene library](docs/shared-scene-library.md) | Every reusable scene/component and example composition, with a clear distinction between exported building blocks, inline patterns, and proposed additions |
| [Avandar component videos](docs/component-videos.md) | Direct worktree source, frame-driven adapters, fixture boundaries, review commands and product limitations |
| [Stock motion library / Motion Atlas](docs/stock-motion-library.md) | Twenty visual references with stable preset IDs, recommended uses, live previews, and Remotion/storyboard reuse |

Motion vocabulary describes how elements move; scenes assemble content, layout, and timing. Read both inventories before extending the kit. [AGENTS.md](AGENTS.md) contains the working rules; `CLAUDE.md` is a relative symlink to that same file.

## License keys

Before running any producer command, create the ignored
`apps/ava-video-producer/.env.local` in this worktree with your own Remotion
Automators key pair:

```dotenv
REMOTION_PUBLIC_KEY=rm_pub_REPLACE_WITH_YOUR_PUBLIC_KEY
REMOTION_PRIVATE_KEY=REPLACE_WITH_YOUR_COMPLETE_PRIVATE_KEY
```

All package commands, direct runtime scripts, build/review servers, and the
Remotion CLI config require both keys. Missing or blank keys, the `free-license`
sentinel, and public keys without the `rm_pub_` prefix fail before the command
starts. Paste the complete private key as issued, without adding a prefix. Its
format is opaque to the producer. This checks local configuration, not subscription
validity or remaining allowance with Remotion. A person who
modifies this public source can remove the check; it is not remote access control.

The shared loader reads only the two license values. It never exports the whole
file to `process.env`, logs credentials, or includes the private key in browser
bundles. Remotion's CLI config relocates inherited private key variables and
key-file paths under a server-only prefix before its browser environment is
assembled, preserving them across Studio config reloads. Environment variables
take precedence over the file for CI. An explicit
file override is available without copying credentials between worktrees:

```bash
REMOTION_KEYS_FILE=/absolute/path/to/.env.local pnpm showcase
```

`pnpm studio` and `pnpm studio:licensed` use the same guarded configuration.
Only the public key is passed to Studio. Server-side `renderStill()` calls receive
the private key. The pinned Remotion 4 `renderFrames()` API does not support a
license-key option or automatically report video usage; maintain the appropriate
render allowance in your Remotion account separately.

**Keep `apps/ava-video-producer/remotion.env` empty.** It is the deliberately
empty dotenv input selected by `apps/ava-video-producer/remotion.config.ts`.
Remotion exposes CLI dotenv values to browser code, so pointing it at
`apps/ava-video-producer/.env.local` would expose private credentials. Our loader
reads that private file independently on the server. Never pass it to Remotion's
`--env-file`, source it into a shell, print it, or commit it.

## What this is

Claude Code or Codex remains the coding agent. This repository supplies research, operating instructions, deterministic fixtures, product component adapters, browser flows, a validated storyboard format, reusable scenes, and local production commands. It does not install a separate autonomous service. Product captures prove specific actions on the local build; component films render source-backed fixture states. Neither establishes public release status, arbitrary AI-query reliability, or production-scale performance.

## Provenance

Imported from upstream commit `907b7b7fa603caf23c43a9ee20a0f55d5ad0c92b` on 2026-10-14, with its Git history removed. The original MIT license is preserved in `LICENSE`; the original README is retained in `docs/UPSTREAM_README.md`. The Remotion dependencies have their own license, covered separately by the organization's Remotion subscription.

The original demo flow, typography, theme, title card, and window chrome are retained. The shared pointer now uses native macOS cursor assets, subpixel travel, smooth click feedback, restrained motion blur, and I-beam holds during typing. Additions include the original showcase and two component studies, the scene and storyboard library, Motion Atlas and its periodic motion helpers, local Avandar capture, actual Avandar component rendering from the same worktree, fictional test data, narration/caption processing, evidence documentation, and explicit environment-file handling.

## Troubleshooting

Use Node 22+ for the combined Avandar workflow. The first render downloads Chrome Headless Shell. The starter Geist font is bundled locally with its SIL Open Font License, so it does not require a font-CDN request. On npm 12, the package manifest allows the pinned `esbuild` and `ffmpeg-static` install scripts.

If npm 12 leaves the local FFmpeg binary missing despite `allowScripts`, run `node node_modules/ffmpeg-static/install.js` from this checkout, then retry the command. This installs the project dependency's binary without a global package.

If the FFmpeg binary download is unavailable and FFmpeg is already installed, use `FFMPEG_BIN="$(command -v ffmpeg)" pnpm test`. The starter scripts fall back to `ffmpeg` on PATH when their bundled binary is absent. Live stock graphics need no external assets. The product map still requires its public basemap services.
