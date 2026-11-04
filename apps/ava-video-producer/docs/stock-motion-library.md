# Motion Atlas: stock motion graphics

Motion Atlas is a visual reference library for briefing future videos. Open
**http://localhost:4173/motion.html** after running `pnpm showcase` from the
workspace root. The checked-in
[page](../showcase/motion.html) includes 170 live, silent motion studies with
search, category filters, large previews, playback controls, brief copying, and
individual on-demand MP4 downloads. Each reference has a stable fragment link such as
`motion.html#source-merge`.

These are authored conceptual graphics, not recordings of Avandar and not
evidence that the product supports the illustrated operation. Labels, code,
counts, and relationships are fictional authored content. Omitted inputs resolve
the complete original examples. Every renderer accepts a strict,
bounded complete input document through its named `src/stock/presets/` contract.
Collections own their counts. Partial input never mixes authored facts with
example content. The contracts publish nested editor controls, valid binding
examples, explicit example-copy paths and default/dense/changed fixtures. Keep
that distinction when using a reference in a script. The [Productions gallery](../showcase/productions.html)
contains the actual product films.

## Choose by what the graphic needs to explain

The registry contains **170 presets: 106 general and 64 social-sector**. The
150 additions comprise 86 general and 64 social-sector entries, alongside the
20 legacy general entries. The complete [addition catalog](motion-atlas/catalog-expansion.md)
documents the new explanatory actions, authored bounds and binding examples.
`STOCK_CATALOG`, `STOCK_IDS` and collection filters derive their membership from
the runtime registry. The following table is the original 20-preset subset.


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

`StockGraphic` is the same deterministic React/SVG renderer in the gallery and
Remotion. A preset selects one bounded content contract. It does not select a
general layout solver. All stock frames use a 960 x 600 viewBox and an opaque
ground. Collections determine their own counts.

| Request field | Contract |
| --- | --- |
| `preset` | One registered `StockPresetId`. IDs remain stable |
| `schemaVersion` | Optional literal `1`, default `1`. Other versions fail |
| `input` | Optional complete input for that preset. Only omission resolves a cloned, localized complete fictional default. Partial input and `null` fail rather than merging with defaults |
| `accent` | Optional six-digit hex color. Direct renderer/CLI default `#9fefca` |
| `background` | Optional six-digit hex color. Default `#0b1219`. Supported by React, storyboards, gallery downloads and CLI |
| `frame` | `StockGraphic` local frame. Direct values are clamped to 0..179 and nonfinite values become 0 |
| `width`, `height` | `StockGraphic` display size, default 960 x 600, with preserved SVG aspect ratio |

`StockRequest` is a preset-discriminated union and `StockInputByPreset[Id]`
comes from that preset's runtime Zod schema. Look up text, collection and numeric
bounds in its contract/control metadata. Bounds vary by field. An empty string
is valid for some upper-only fields and must remain distinct from `null` or a
missing value. Reference membership, ordering, arithmetic and conservation rules
are checked by the runtime schema. Structural JSON Schema does not replace them.

`parseStockInput(preset, rawInput?)` reports failures with the preset and
dot-separated input path. `stockRequestSchema` validates the strict envelope and
reports content failures under `input`. Unknown fields/presets, invalid version
or palette values and bad content are errors. Supplied authored copy is retained
exactly; the renderer does not infer, translate or complete missing facts.

### Configured React example

This example uses an implemented addition. Import paths below assume a module
at the producer app root. The data describes a fictional qualitative comparison,
not measured review speed or a product capability.

```tsx
import { StockGraphic } from "./src/stock/StockGraphic";
import type { StockRequest } from "./src/stock/contracts/StockContract";

const request = {
  preset: "paired-contrast",
  schemaVersion: 1,
  accent: "#9fefca",
  background: "#0b1219",
  input: {
    question: "How will the fictional exhibit be reviewed?",
    alternatives: [
      { id: "solo", label: "Solo review" },
      { id: "pair", label: "Pair review" },
    ],
    criteria: [
      { id: "reader", label: "Readers", leftText: "One author", rightText: "Two collaborators" },
      { id: "handoff", label: "Handoff", leftText: "A self-check", rightText: "A shared discussion" },
    ],
    focusCriterionId: "reader",
    comparisonLabel: "Fictional review approaches",
    showPairBrackets: true,
  },
} satisfies StockRequest;

export function ConfiguredComparison() {
  return <StockGraphic {...request} frame={90} width={1280} height={800} />;
}
```

### Complete configured storyboard

The [complete JSON file](motion-atlas/examples/paired-contrast-storyboard.json)
can be used by the normal video CLI. It carries the same complete input as the
React example:

```json
{
  "version": 1,
  "id": "configured-comparison",
  "title": "Compare fictional review approaches",
  "description": "A qualitative comparison of two authored fictional review approaches.",
  "sourceNotes": [
    "Fictional demonstration data. No measured productivity or product outcome is claimed."
  ],
  "purpose": "standalone",
  "fps": 30,
  "width": 1280,
  "height": 800,
  "delivery": {
    "width": 1280,
    "height": 800
  },
  "shots": [
    {
      "id": "comparison",
      "scene": "stock",
      "durationInFrames": 180,
      "transitionInFrames": 0,
      "props": {
        "preset": "paired-contrast",
        "schemaVersion": 1,
        "input": {
          "question": "How will the fictional exhibit be reviewed?",
          "alternatives": [
            {
              "id": "solo",
              "label": "Solo review"
            },
            {
              "id": "pair",
              "label": "Pair review"
            }
          ],
          "criteria": [
            {
              "id": "reader",
              "label": "Readers",
              "leftText": "One author",
              "rightText": "Two collaborators"
            },
            {
              "id": "handoff",
              "label": "Handoff",
              "leftText": "A self-check",
              "rightText": "A shared discussion"
            }
          ],
          "focusCriterionId": "reader",
          "comparisonLabel": "Fictional review approaches",
          "showPairBrackets": true
        },
        "accent": "#9fefca",
        "background": "#0b1219"
      },
      "note": "All people, text and relationships are authored fictional content."
    }
  ],
  "narration": [],
  "captions": false,
  "soundEffects": []
}
```

`StockScene` is exported from [src/scenes/StockScene.tsx](../src/scenes/StockScene.tsx). It adds the shared local
frame, dimensions (default 1600 x 1000), title and kicker around `StockRequest`.
A title or kicker reserves 200px above the SVG. Its frame repeats the 180-frame
cycle for longer shots. Each cycle reveals from and fades to the same opaque
ground. Longer duration repeats the editorial loop rather than continuing the
underlying process. The strict storyboard `stock` scene validates through the
same request schema, including `input`, version and background.

### Edit and transport configured content

Open a preset's expanded viewer to edit its nested fields and collections.
Each edit is validated. An invalid draft remains in the editor while the preview
retains the last valid content. The editor reports the failing fields and
disables configured JSON copying and download until the draft is valid. Reset
content restores a complete default while preserving the palette and saved IDs.
Editor-only collection row keys never become extra authored input fields.

**Copy configured JSON** copies `{preset,schemaVersion,input,accent,background}`
with the exact validated preview content. A gallery download carries that same
snapshot. Copy creative brief describes the reference and palette; it does not
serialize the configured input. Saved references persist preset IDs in browser
storage. To retain or share exact content, save the configured JSON separately.

Fixed metadata, control labels, default-copy paths and renderer `displayCopy`
use the local Lingui boundary. Only omitted default input is localized. Optional
`defaultSpanBindings` pairs a marked translation template with text and UTF-16
offset paths so translated default spans stay aligned. Marker decoding never
touches supplied input, even when it contains literal `<content>` characters.
There is no automatic translation service or shipped non-English stock locale.

### Content and geography limits

Defaults and demonstrations are fictional. An author supplying real quantities,
units, dates, outcomes or provenance is responsible for their accuracy and for
consistent explanatory prose. Runtime validation checks structured relationships,
not the natural-language meaning of labels or claims. A typed quantity is not
evidence that it was measured or that Avandar produced the illustrated result.

The globe uses locally vendored Natural Earth 1:110m physical land and d3
orthographic clipping. [Geometry provenance](../src/stock/geography/PROVENANCE.md)
records the public-domain source, pinned commit/checksums, exact transformation
and upstream 4.1.0/4.0.0 version-label mismatch. There are no administrative
boundaries or runtime asset fetches. Scenario markers remain fictional/authored.
Other local-map presets use schematic planes, cells or authored networks. They
do not supply real basemaps, surveyed areas, EPSG transformations, safe routes,
privacy guarantees or factual outcomes. Their precise limits remain preset-local.

Exact-match data can use amber underlined whitespace marks: space `·`, tab `⇥`,
line break `↵`, carriage return `␍` and fallback `␣`. Literal marker glyphs remain
ordinary text. Raw input, accessible text, data attributes and equality stay
unchanged. `LiteralDataText` remains fixed 12px single-line text. The cache-cell
wrapper alone may split <=16-character raw cells after eight whole graphemes
into two lines, preserving exact concatenated raw values and cell identities.

## Build, inspect, and export

```bash
pnpm install # from the Avandar workspace root
pnpm showcase

# From apps/ava-video-producer, explicit CLI workflows remain available:
npm run motion:build
npm run motion -- list
npm run motion -- preview all
# Inspect out/motion/preview/<id>/<configurationHash>/contact-sheet.jpg.
npm run motion -- render all

# A single preset uses the same workflow:
npm run motion -- preview plexus-field
npm run motion -- render plexus-field

# A complete configured request, not a storyboard or input-only fragment:
npm run motion -- preview paired-contrast --input docs/motion-atlas/examples/paired-contrast-request.json
npm run motion -- render paired-contrast --input docs/motion-atlas/examples/paired-contrast-request.json
```

The `--input` JSON document includes the selected preset, schemaVersion, complete
input and optional palette. Its preset must match the selected CLI ID. The flag
is rejected for `all` and `list`. The CLI validates before bundling.

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
0, 18, 36, 90, 150, and 179. Each complete request and bounded stock source
closure has its own configuration hash, preview directory and manifest.
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

1. Add a complete strict content contract and metadata under `src/stock/presets/`, then explicitly register it in `src/stock/registry/stockContracts.ts`.
2. Implement and register its typed renderer through `createStockRenderer`; `catalog.ts` derives display membership from those contracts.
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

## Retrieval catalog

Each of the 170 motion presets owns a canonical
`src/stock/presets/<Preset>/<Preset>.metadata.yaml` file. Edit descriptive copy
there: name, description, good uses, tags, creative direction, intent, domains,
aliases, exclusions, distinction, and motion beats. Translation descriptors keep
their stable IDs and source messages in YAML. The adjacent TypeScript module
loads and validates this data; renderers, executable input schemas, fixtures,
controls, and bindings remain TypeScript.

The Atlas, CLI, message generator, and Remotion build read YAML directly. Normal
showcase rebuilds consume YAML edits, with no catalog export or generated JSON
copy required. Future embedding jobs can read these same files. The Atlas does
not generate embeddings. For direct Node test invocations that import catalogs,
use `node --import ./scripts/yaml/registerYaml.mjs --import tsx --test <test>`
from this app; package scripts configure this automatically.

Search text uses this semantic order: name, description, intent, creative
direction, good uses, domains, aliases, tags, exclusions, distinction. Each value
has whitespace normalized; array order remains authored. Defaults, fixture
labels and counts, display-copy templates, and binding prose are excluded.
`src/stock/search/makeStockSearchTextFromMetadata` provides this projection for
consumers that need embedding input. Source provenance and computed hashes do
not belong in authored descriptive metadata.

`createStockJsonSchema` produces structural schemas using installed Zod's draft-2020-12 conversion with explicit
failure for unrepresentable constructs. Tuple-aware conversion preserves
positional types, fixed cardinality, optional tails, and typed rest items.
Editor collection item schemas carry the same fixed tuple bounds. Cross-field
references, conservation equations, denominators, and prose obligations remain
separately authored `semanticRules`; consumers must still validate proposed
complete input with the runtime contract before rendering. Controls are checked
recursively, including tuple positions, nullable branches, union variants,
primitive item paths, and root/item-scoped dynamic choices. A future retrieval
consumer may use this data, but ingestion, embeddings and automatic binding are
outside this exporter.

**2026-10-18 evidence update:** All 170 contracts/renderers are implemented. Completed historical 167-file MP4 and 166-poster evidence retains actual 498c/source 2ad identities. R67's isolated spatial-sampling correction is reported at e5aeb3e7c/source 38c12b84; changed-scene verification and R68 continuity are complete as recorded below; whole-branch review remains pending. See [implementation evidence](motion-atlas/implementation-validation.md).

## Accepted gallery whitespace correction

R65 source correction is accepted at `498c717d53240d15a29396830759a571a938f492`.
Every text descriptor now uses a visible native textarea. Ordinary fields start
at one row with wrapping off and support vertical resizing; explicitly multiline
fields retain their existing rows/soft wrapping. LF, TAB, leading/repeated/trailing
spaces, combining characters and joined emoji are protected by the reported
native clipboard/schema/live-label/outgoing-request regressions. Number/boolean
and other control variants, schemas, defaults and renderers remain unchanged.

Native Chromium clipboard paste changes CR and CRLF to LF: `A\rB\r\nC\nD\tE`
becomes `A\nB\nC\nD\tE` in the control and copied JSON. This is a native editing
limitation, not an application normalizer or a promise of arbitrary-byte original
line endings. Enter inserts LF, pasted TAB survives, and keyboard Tab navigates
focus. Direct supplied JSON and the renderer contract remain separate from this
native editing behavior; unchanged display wrapping may normalize visible spacing.

Source review has zero Critical, zero Important and two deferred Minor findings:
generic scalar CSS ownership/class naming, and inherited validation noise. CSS
lint remains nonzero at 42 inherited violations versus 43 at base; inherited
color-environment warnings also remain. Three focused E2Es passed separately,
both compilers and scoped TypeScript lint/format passed, and changed-only React
Doctor reported zero issues. These are retained implementer/reviewer outcomes,
not new checks by this documentation worker. Export transport was intercepted
with HTTP400 for payload comparison, so it is not real HTTP or MP4 acceptance.

At the R65 historical revision, the stock fingerprint was
`2ad047077f26a17ebb71df914e02e1819860328e7229befc57360b202e0b21ae` and all 17
configured input records remain byte-identical. Four of 41 supplemental gallery
records changed: editor source/CSS and generated gallery JS/CSS. The new manifest
is `fa18ca3352e0984260977b15d837ed060cbca8ee9f2dc0940a67450cf41ca2d0`.
The archived old settings/manifests and all 170 browser reports retain their real
HEAD `02d6` identities. The actual N1 retry and L3 delivery are recorded below; completed historical decoded-media evidence is now retained separately. R67 verification and R68 continuity are complete; final whole-branch review remains pending. The [durable editor record](motion-atlas/implementation-editor-whitespace-498c717d.json)
preserves the report/review, both Minors,
continuity comparison and pre-editor provenance archive.

## Current delivery evidence and request identities

The R65 gallery source correction is accepted at `498c717d53240d15a29396830759a571a938f492`.
Its actual N1 retry now preserves the complete LF/TAB fixture and palette, with
separately inspected sampled images. The earlier failed N1 run remains historical.
Configured native UI evidence covers 17 cases across 16 old02d6 cases and this
498c retry; no blanket new-head rerun is claimed. Native CR/CRLF clipboard paste
becomes LF, without an application normalizer. At the R65 historical revision, the stock fingerprint was
`2ad047077f26a17ebb71df914e02e1819860328e7229befc57360b202e0b21ae`;
the renewed supplemental-gallery manifest is
`fa18ca3352e0984260977b15d837ed060cbca8ee9f2dc0940a67450cf41ca2d0`.

L3 is a real native HTTP delivery whose native, server and gated-picture bytes,
probe and existing gate evidence match. R66 preserves the original strict
assessor and identifies its narrow native-attachment revision. Attachment GET
status/headers remain unobserved. Stock-request and showcase-film hashes differ
because their canonical envelopes differ, while source/content/palette semantics
match. Actual export preview JPEGs remain distinct from decoded-video evidence and no standalone L3 stock poster exists. The completed historical 167-file decoded evidence and 166 standalone posters are preserved separately, including five native L3 images. R67 changed-scene verification and R68 continuity are complete as recorded below. Final findings dispositions and whole-branch review remain pending. Existing 170 default observations retain their actual 02d6 identity,
all 10 findings and 553 observation strings. Six span cases are resolved-input witnesses,
not an actual locale switch; four readiness cases have 20 actual views with no
concrete sampled defects, without continuous-pixel acceptance.

See the [N1 record](motion-atlas/implementation-n1-editor-retry-498c717d.json) and [L3 delivery record](motion-atlas/implementation-http-l3-delivery-498c717d.json) for exact requests, hashes, original diagnostics and remaining limits.


## Historical delivered media and pending current-source verification: 2026-10-18

The [completed media record](motion-atlas/implementation-media-validation-498c717d.md) preserves 167 original decoded deliveries, 166 standalone posters, the separate HTTP preview, all retained findings and corrected custody/N6 prose at actual 498c/source 2ad identities. R67's isolated spatial-sampling correction is reported at e5aeb3e7c/source 38c12b84. R67 source/media verification and R68 complete unaffected-fixture continuity are now verified. Final whole-branch review remains pending; the dated final scoped record below supersedes earlier pending wording. No historical output is relabeled as latest. These documentation updates preserve prior approved contract wording, defaults, IDs, bindings and bounds.


## Final scoped source verification and evidence custody: 2026-10-18

R67 is closed at `e5aeb3e7cb83e23f12a9255df018e25a76cc8c0e`, stock source `38c12b84bbbe3ab14171946e12b702ceb0fe2e5805504015352b0f6bedf5fdb9`. Independent source review is spec compliant and quality approved with one deferred test-helper RO-RO Minor. The controller inspected 13 actual current images. Gallery playback covered 180 states, one wrap and zero errors. The fresh default MP4 passed the unchanged gate and independent silent H.264 1280x800/30fps/180-frame/six-second probe, completed 179 decoded callbacks and ended at six seconds with zero reported dropped frames. Dense current stills show 8/12/4; default holds show 2/5/3. No globally empty selection or schema widening was introduced.

R68 is satisfied: the strict three-file local diff and the complete 169-preset comparison retain 754 fixtures and 6,786 exact pre/post frame hashes. The full current 170-preset SVG harness passed. Unaffected outputs retain their actual historical source 2ad / HEAD 498c identities under this explicit versioned carry-forward. Only the changed preset's default MP4 is freshly rendered at source 38c. Finite screenshots and SVG equality do not establish uninterrupted pixels or fresh media for the other presets. All historical readability/transient concerns and the test-helper Minor remain for final whole-branch review, which is pending.

R69 keeps exact raw reports, callback/clock traces, session/capture material and full original-report envelopes ignored and in Downloads mirrors. Durable records retain compact per-preset/candidate outcomes, all findings/dispositions/narrative limits and source/configuration/media/report hashes with local evidence pointers. A fresh clone cannot inspect local pixels/session files directly. No original local evidence was deleted.

See [current scoped verification](motion-atlas/implementation-sampling-correction-controller-verification.json) and its linked compact continuity/delivery records.
