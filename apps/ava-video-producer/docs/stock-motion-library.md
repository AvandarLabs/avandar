# Motion Atlas: stock motion graphics

Motion Atlas is a visual reference library for briefing future videos. Open
**http://localhost:4173/motion.html** after running `pnpm showcase` from the
workspace root. The checked-in
[page](../showcase/motion.html) includes 20 live, silent motion studies with
search, category filters, large previews, playback controls, brief copying, and
individual on-demand MP4 downloads. Each reference has a stable fragment link such as
`motion.html#source-merge`.

These are authored conceptual graphics, not recordings of Avandar and not
evidence that the product supports the illustrated operation. Labels, code,
counts, and relationships are fixed sample content. Keep that distinction when
using a reference in a script. The [Productions gallery](../showcase/productions.html)
contains the actual product films.

## Choose by what the graphic needs to explain

| Preset ID | Name | Motion vocabulary | Useful for |
| --- | --- | --- | --- |
| `network-graph` | Connected entities | Node stagger, edge draw-on, connection emphasis | Introducing relationships among entities |
| `node-traversal` | Follow the connection | Sequential node activation, traveling signal | Following a path or chain of evidence |
| `radial-network` | Hub & spokes | Radial arrangement, signal travel | A shared service or workspace with connected sources |
| `plexus-field` | Plexus field | Deterministic drifting particles, proximity edges | Ambient connected-system imagery or a chapter opening |
| `orbital-system` | Orbital system | Elliptical paths, phased satellites | An ecosystem around a central idea |
| `source-merge` | Many sources, one view | Converging paths, packets, destination emphasis | Data integration or a source-to-view introduction |
| `data-pipeline` | Processing pipeline | Staged activation, connector travel | Explaining process order |
| `schema-mapping` | Field mapping | Row reveal, explicit field connections | Showing a source-to-destination mapping |
| `packet-stream` | Packet stream | Staggered traveling packets along lanes | Conceptual movement between systems |
| `event-bus` | Event bus | Shared channel, producer/subscriber signals | Explaining an event architecture |
| `code-focus` | Code spotlight | Syntax colors, active-line highlight | Directing attention to an illustrative code line |
| `terminal-type` | Terminal typing | Character reveal, blinking caret, response reveal | An illustrative command and response |
| `scan-lines` | Document scan | Scanning band, structured rows | Intake, parsing, or document inspection |
| `bar-race` | Ranking in motion | Shared-baseline bars, value interpolation, row travel | Comparing fictional values and ranks across two periods |
| `line-trace` | Trend trace | Stroke draw-on, leading point | Introducing a fictional trend |
| `metric-counter` | Metric landing | Number interpolation, supporting mini bars | Giving one sourced value emphasis |
| `dot-matrix` | Cohort matrix | Staggered dots, group distinction | Showing a count or proportion with a denominator |
| `stagger-cards` | Staggered collection | Short sibling-delayed entrances | A small collection of concepts or records |
| `word-reveal` | Masked statement | Words rising behind masks | A short opening or chapter statement |
| `status-cycle` | State progression | Timed state emphasis, progress, completion | Waiting, working, and completed states |

The [typed catalog](../src/stock/catalog.ts) is the source of names, IDs, search
tags, usage notes, and suggested prompts. Refer to the stable ID when choosing a
graphic. Never imply the charts contain measured Avandar outcomes.

## Use a reference in a brief

An effective request identifies the reference, its role, the content that should
replace the example, and the handoff into real footage. For example:

> Open with `source-merge` to explain that our fictional CSV sources belong in
> one workspace. Use the actual dataset names from the Harborfield fixtures.
> Then cut to the verified import recording. Use `node-traversal` later to
> explain the case-to-contact relationship, with explicit evidence-backed links.

The gallery's copy controls provide a reference or starting prompt. Its brand and background color pickers update all live previews, including
the expanded player, immediately. Accent swatches and Reset colors offer quick
starting points. Selections last for the current page visit and are included in
copied creative briefs. **Download MP4** renders the current preset with those
selected accent and background colors, reports progress, and downloads the
finished file. Merely browsing or changing colors does not render an MP4.
Text, secondary colors, and panel surfaces remain authored, so choosing a light
background does not switch the artwork to a light theme.

The expanded viewer fills nearly the entire desktop window. A large animation
stage and its playback controls sit beside a separately scrolling reference
rail containing palette controls, usage notes, creative direction, and the
existing copy, save, and download actions. At widths up to 760 pixels, the
viewer fills the screen and stacks the player above the reference details in
one scrolling view, with the title and close control kept at the top.

### Avandar preview palette

The gallery starts with Sky blue `#51a7ff` and the original dark
background `#0b1219`. Reset restores that pair. The stock renderer's default
mint and original dark ground remain the defaults for direct renderer and CLI
calls. Gallery downloads use the selected colors. Custom colors work in both the grid and expanded
player; swatch tooltips identify their names and tokens.

The [gallery palette](../src/gallery/palette.ts) selects tokens from the current
Avandar theme. `motion:build` reads `shared/config/Theme.ts`,
`src/config/Theme/Theme.ts`, and `src/config/Theme/ElevationTheme.ts` directly,
then bundles only their palette values. `showcase` builds and watches those
inputs while serving live previews. The same build generates
`showcase-theme.css` with primary and neutral CSS variables shared by Motion
Atlas, the starter showcase, and Productions. Showcase actions and selected
states use the product blue, while the existing warm paper surfaces and
editorial red accents remain part of the showcase's presentation.
There is no manually maintained color snapshot. The following hex values record
the initial theme; rebuilding after a theme edit updates the swatches.

| Accent swatch | Hex | Product token |
| --- | --- | --- |
| Avandar blue | `#1563fe` | `primary[6]`, official brand |
| Sky blue (default) | `#51a7ff` | `primary[4]` |
| Deep blue | `#103dbd` | `primary[8]` |
| Amber | `#de911d` | `secondary[6]` |
| Green | `#40cf5e` | `success[6]` |
| Yellow | `#f1c617` | `warning[6]` |
| Red | `#e53523` | `danger[6]` |
| Cyan | `#3bc9e1` | `info[6]` |
| Original mint | `#9fefca` | Stock palette, not a product token |

| Background swatch | Hex | Product token |
| --- | --- | --- |
| Original dark (default) | `#0b1219` | Stock palette, not a product token |
| Dark body | `#102a43` | `surfaces.dark.body`, `neutral[9]` |
| Dark raised | `#243b53` | `surfaces.dark.raised`, `neutral[8]` |
| Shell | `#486581` | `navbar.backgroundColor`, `neutral[6]` |
| Light body | `#f8fafc` | `surfaces.light.body`, `neutral[0]` |
| Light sunken | `#d9e0e7` | `surfaces.light.sunken`, `neutral[1]` |
| White | `#ffffff` | `surfaces.light.raised` |
| Blue wash | `#edf6ff` | `primary[0]`, chosen as a preview background | Pause and scrub to identify a useful beat rather than describing it as
"the animation with the dots." Prefer one explanatory hero motion per shot.

## Reuse in a film

`StockGraphic` is a deterministic React/SVG component used by both the browser
gallery and Remotion. There are no CSS animations, random values, or browser
time reads inside the renderer. The gallery supplies frames using its playback
clock; a video render supplies the Remotion frame.

```tsx
import { StockGraphic } from "./src/stock/StockGraphic";

<StockGraphic
  preset="source-merge"
  frame={90}
  width={1280}
  height={800}
  accent="#9fefca"
/>
```

| Input | Contract |
| --- | --- |
| `preset` | One of the 20 `StockPresetId` values |
| `frame` | Local frame within the six-second cycle, 0–179 at 30 fps |
| `width`, `height` | Output SVG dimensions; default 960 × 600, with a fixed 960 × 600 viewBox and preserved aspect ratio |
| `background` | Optional canvas color, default `#0b1219`; also colors ground masks in the graphic. Available on `StockGraphic`, not the storyboard `stock` scene |
| `accent` | Optional primary color; use a six-digit hex value for storyboard compatibility. Default mint; secondary colors remain authored |

For storyboards, use the `stock` scene. Its wrapper handles scene size, optional
title/kicker, and repeating the cycle for longer shots:

```json
{
  "id": "integration-intro",
  "scene": "stock",
  "durationInFrames": 180,
  "transitionInFrames": 0,
  "props": {
    "preset": "source-merge",
    "accent": "#9fefca"
  },
  "note": "Conceptual stock sample, not an Avandar feature claim."
}
```

[motion-reference.json](../storyboards/motion-reference.json) is a minimal
validated storyboard containing three stock shots. It can go through the same
`video validate`, `plan`, `preview`, and `render` pipeline as other films.

`StockScene` is exported from `src/scenes`; its dimensions default to 1600 × 1000
like the other scenes. An optional heading reserves 200 pixels above the SVG.
Each stock cycle reveals from and fades to the same opaque ground over 12 frames
at either end. It is a seam-safe editorial loop, not a continuous forever-moving
camera. For a longer continuous diagram, adapt the relevant renderer and inspect
its new timing. Neither the gallery nor the scene automatically replaces sample
labels or values. Use the existing parameterized `GraphScene`, `FlowchartScene`,
`MetricScene`, or `TypographyScene` when those content APIs fit the request.

## Build, inspect, and export

```bash
pnpm install # from the Avandar workspace root
pnpm showcase

# From apps/ava-video-producer, explicit CLI workflows remain available:
npm run motion:build
npm run motion -- list
npm run motion -- preview all
# Inspect each out/motion/preview/<id>/contact-sheet.jpg.
npm run motion -- render all

# A single preset uses the same workflow:
npm run motion -- preview plexus-field
npm run motion -- render plexus-field
```

The gallery bundle is generated locally with `esbuild`, a project dependency.
It contains React and the same stock sources used by Remotion. It uses no
external font, asset, or service at runtime. The running showcase watches stock
source, metadata, theme inputs, and gallery logic and refreshes after successful
rebuilds. `motion:build` remains available for an explicit local build. Browser
bundles are ignored. The existing development and render
prerequisites are listed in [README](../README.md); no new global installation
is required.

The stock registration exposes each preset as `stock-<preset-id>`. The motion
CLI uses [stock-entry.tsx](../src/stock-entry.tsx), an isolated entry containing
only those compositions and an empty public directory. It avoids loading
unrelated product footage or network fonts; the normal Studio also includes the
same stock registrations. The CLI previews frames
0, 18, 36, 90, 150, and 179, and fingerprints its relevant source/dependencies.
Rendering refuses stale or missing previews and delegates to the existing
single-worker JPEG/FFmpeg pipeline. The unchanged gate checks both frame
integrity and the loop seam. A preview manifest proves input consistency, not
visual approval. Inspect the stills and motion before delivery.

All exports are **1280 × 800, 30 fps, six seconds, silent H.264 MP4**, with an
opaque background. There is no alpha channel or sound pass. Posters come from
frame 90. Gallery download jobs write generated files under ignored
`apps/ava-video-producer/out/showcase/exports/<job-id>/`. CLI deliveries and hash
records go to `apps/ava-video-producer/out/motion/deliveries/`; previews, frames,
logs, and replaced-output backups remain under ignored
`apps/ava-video-producer/out/motion/`. No MP4 files are tracked or copied into the
gallery's asset directory. The historical exported edition is documented in
[motion-atlas-validation.md](motion-atlas-validation.md); that record does not
certify new source or palette choices.

## Extend without splitting the library

1. Add a stable ID and metadata in `src/stock/catalog.ts`.
2. Implement the graphic in `src/stock/` and route it through `StockGraphic`.
3. Reuse `src/motion.ts` helpers; put any new shared timing helper there.
4. Keep graphic content deterministic and generic, with scoped SVG definition
   IDs so multiple previews can share a page.
5. Update this catalog and the scene/motion inventories, build the gallery,
   inspect the new preview, and render its download through the gate.
6. Verify search, deep links, keyboard operation, reduced-motion behavior, and
   small-screen layout before committing source changes. Keep generated bundles
   and MP4s ignored.

Changing an existing ID breaks saved briefs and links. Add a new ID for a
different concept rather than silently repurposing one. Built-in examples are
references for art direction, never substitutes for verifying the actual product.
