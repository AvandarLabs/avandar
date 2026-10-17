# Avandar component videos

The seven Avandar storyboards render product React components and source styles with deterministic, frame-controlled Harborfield data. No screenshot, screen recording or prerecorded UI supplies these scenes. Product source is read directly from the enclosing worktree, and the renderer needs no authentication, application server or product backend.

This is a source-backed reconstruction of selected product screens. Navigation, typing, query results and save responses are fixture states. They demonstrate the selected UI sequence without establishing that a live product operation succeeded. Historical capture evidence, product limitations and the source revision remain in each plan's `sourceNotes`.

## Build and review

```bash
pnpm install # at the Avandar workspace root
npm run data:validate
npm run component:build
npm run component:review
```

If npm 12 omits the local FFmpeg binary despite the package's `allowScripts` entry, run `node node_modules/ffmpeg-static/install.js` before narration or rendering. No global npm package is required.

The review server binds to `127.0.0.1:4175` and serves only its three generated review files. It starts with Explorer and a 1600 × 840 Remotion Player. Use the browser console to select a feature and inspect a frame:

```js
window.review.setFeature('import'); // import, explorer, dashboards, cases, map
window.review.seek(280);
window.review.frame();             // current frame number
window.review.beats.import;        // adapter interaction markers
window.review.play();
window.review.pause();
```

Allow the grids, editors, fonts and native map to settle after seeking. Inspect the actual image and console, including typed names, row counts, charts, editor blocks, map layers, labels and the visible fictional-data disclosure. This isolated review page shows the product stage without the film's opening, captions or pointer. Storyboard previews verify the complete composition.

`npm run component:review -- --build-only` refreshes its ignored files under `out/component-review/` without starting a server. It builds directly from the current product sources. The normal server watches those sources and adapters, then rebuilds and reloads on changes. Review builds live in `out/component-review/product/`, separate from export builds.

## Live gallery and downloads

From the monorepo root, run
`pnpm --filter @avandar/ava-video-producer showcase`, then open
**http://localhost:4173/productions.html**. Each film plays through a live
Remotion Player using the same compositions as its export. The homepage at
**http://localhost:4173** also uses a live player and retains its chapter,
speed, replay, and loop controls. No preview loads a prerecorded MP4.

The server watches imported product components, adapters, film sources, and
storyboards. Successful rebuilds refresh the player. Browser bundles live in
ignored `apps/ava-video-producer/out/showcase/browser/`, separate from the CLI
render bridge. Product data and backend services remain outside this preview.

Use the captions toggle in a production player before clicking **Download MP4**.
That button captures the current film and caption choice, starts one local
render, and reports progress until the file is ready. Concurrent renders are
serialized; a busy or failed export can be retried. Generated outputs remain
under ignored `apps/ava-video-producer/out/showcase/exports/<job-id>/`. MP4s are
never committed. Transcript and SRT links derive their text and timing from the
current authored plan.

Production narration is temporary system speech. On macOS the server generates
it from current cues and reuses a matching local cache. Other platforms fall
back to silent films with captions. The homepage stays silent on every platform.
The captions toggle does not add brand or background controls to product films.

## Source and build boundary

| Location | Responsibility |
| --- | --- |
| Enclosing `src/`, `shared/`, `packages/`, `public/` | Live product source and assets from this Avandar worktree. There is no vendored copy. |
| `avandar-adapter/` | Frame-controlled props, fixture state, selected parent layout and feature interaction markers. |
| `avandar-adapter/*-aliases.json` | Explicit substitutions for the small controller surfaces that need fixture implementations. |
| `avandar-adapter/shims/` | Narrow local substitutes for routing or data/controller dependencies; no product backend. |
| `avandar-adapter/fixtures.json` | Checked-in adapter data derived from the fictional CSV bundle, preserving source strings and blank cells. |
| `src/avandar/generated/` | Ignored compiled product bridge, CSS and source hashes. Preview/render rebuild these automatically; do not hand-edit them. |
| `src/avandar/AvandarScene.tsx` | Storyboard integration and pointer choreography over the product stage. |
| `src/avandar/cursor-targets.json` | Pointer locations measured from rendered `data-video-target` elements. |

`scripts/build-avandar.mjs` resolves product aliases and workspace packages, compiles TypeScript and Lingui macros, processes source CSS modules and Mantine variables, and adds the required Tailwind utilities. Installed dependencies provide the original Mantine, AG Grid, CodeMirror, Puck and MapLibre runtimes. React and Remotion remain shared with the film renderer. The bridge installs the product theme and navigation components, local Figtree font, English Lingui message compiler and fixture router.

The build always reads the enclosing Avandar worktree. `component:build` compiles
its actual imported source files without copying them. `component:watch` watches
that dependency graph. `component:review` includes the watched build and browser
reload, while `video preview` and `video render` rebuild before using the bridge.
`src/avandar/generated/build.json` records the current revision and source hashes,
including uncommitted source changes. Stale source hashes invalidate preview
evidence. Environment files are never build inputs.

## Feature adapters

| Feature | Source components and layout | Fixture boundary |
| --- | --- | --- |
| Import | Product file dropzone, uploaded-file bar, import fields, parse-options bar, preview, actions, saved-source layout and grid. | Frame-driven file/name/description/save state. The source CSV parser controls are narrowed to their CSV branch. No file upload or persistence operation runs. |
| Explorer | Product query controls, filters, SQL editor, results table and visualization configuration/content. | The fixture filter and grouped count produce the documented local results. SQL typing and execution are scheduled by frame; no arbitrary query or AI request runs. |
| Dashboards | Product create-dashboard dialog, Puck block configuration, save/view buttons, preview banner and visualization container. | A narrow visualization fixture binds the saved chart. Unused filter-block configuration is excluded from the flow. The film does not save or publish a dashboard. |
| Cases | Product case-type home, concept navigation, attribute lists, empty-selection state and activity block. | Dataset-backed records and related visit fields are fixture-bound. No synchronization, activity saving, assignment or status change runs. This remains a local product preview. |
| Map | Product map controls, layer/feature UI and native MapLibre rendering with the built-in Avandar basemap, its source styling, and real OpenFreeMap tiles. | The two fictional point layers, selection and camera are frame-driven. Public tiles, sprites and fonts require internet access while rendering. No spatial query, boundary import or map publication runs. |

Adapters prefer actual prop-controlled leaves. Selected parent layouts are assembled where mounting the live parent would introduce authentication, navigation or backend controllers. Such assembly and any shims must remain explicit; source reuse is not a claim that the entire application is mounted unchanged. Feature notes and alias files identify the concrete boundaries.

The frame drives visible typing, selected controls, query results, chart reveal and camera position. Native component lifecycle is retained where required. Global incidental transitions and caret animations are disabled for repeatable frames; purposeful animation belongs to the frame timeline. Layout readiness is held before Remotion captures a frame, including native map readiness.

## Fictional data and claims

The canonical inputs remain [the Harborfield bundle](../demo-data/README.md): 240 cases, 297 visits/contacts, 12 facilities, six districts and 36 weekly reports. Run `npm run data:validate` before using them. `component:build` compiles the existing adapter fixture JSON; it does not regenerate the canonical data or silently refresh that JSON. If the CSV bundle changes, deliberately refresh and verify the adapter fixture snapshot as part of the same change.

Import previews the first 200 of the 240 rows and detects 13 columns. Explorer's district counts are Eastbank 56, North Quay 51, South Gardens 40, Lakeside 39, Ridge 29 and West Marsh 25, ordered by descending count. The same chart data feeds the dashboard. Missing values and the distinct case/visit grains remain intact. Source date formatting may depend on the browser timezone; the fixture date strings are unchanged.

Every product stage displays **Fictional demonstration data · Programmatic render of Avandar components**. The map's real basemap geography is separate from the fictional overlaid records. Its furniture bar retains the required OpenFreeMap, OpenMapTiles and OpenStreetMap attribution. Case Manager and Maps retain their local-preview limitations in the films and source notes. No sequence should imply that local fixture state repairs a product defect or verifies a release claim.

## Storyboard contract

```json
{
  "id": "flow",
  "scene": "avandar",
  "durationInFrames": 660,
  "transitionInFrames": 18,
  "props": {"feature": "import", "fromFrame": 0, "mode": "full"}
}
```

Use one continuous body shot for each feature. Remounting between artificial subshots can reset Puck, grids or the native map. The overview joins exactly three continuous bodies. `fromFrame` trims the beginning of an adapter timeline; Explorer alone also exposes `filter`, `query` and `chart` modes. The schema rejects a shot extending beyond its adapter horizon.

All six films use 30 fps, a 66-frame title, a 1600 × 1000 canvas and 1536 × 960 delivery. The product stage is fixed at 1600 × 840 because cursor locations are measured at that size. Short single-line captions leave the required stage area; the storyboard validator enforces it.

| Plan | Body frames | Total duration |
| --- | --- | --- |
| `storyboards/import.json` | 660 | 24.2 s |
| `storyboards/explorer.json` | 800 | 28.87 s |
| `storyboards/dashboards.json` | 720 | 26.2 s |
| `storyboards/cases.json` | 660 | 24.2 s |
| `storyboards/map.json` | 720 | 26.2 s |
| `storyboards/avandar-overview.json` | 660 + 800 + 720 | 74.87 s |

Adapter beat arrays describe intended actions. Pointer coordinates must come from the rendered target bounds, then be checked in the full film. The shared macOS cursor arrives before each action, holds through click release and text entry, and switches to a hand or I-beam at the measured target. It uses subpixel movement, shallow smooth click compression and a short motion-blur shutter; layout changes require remeasurement.

## Preview, narration and delivery

```bash
npm run video -- validate storyboards/import.json
npm run video -- preview storyboards/import.json
# Inspect the contact sheet and full-size action frames.
npm run video -- tts storyboards/import.json
npm run video -- preview out/avandar-import/scratch/storyboard.json
# Inspect that exact narrated plan, then render it.
npm run video -- render out/avandar-import/scratch/storyboard.json
```

Text cues are timed against adapter frames and last at least three seconds. The source plans do not contain a voice recording. The macOS speech command creates scratch narration, transcript and caption outputs; it does not establish a listening review. Check pronunciation, duration and synchronization, especially while text is being entered.

Keep the existing serial rendering and frame gate. A passing schema, successful build or unchanged input fingerprint does not establish visual quality. Review completed pictures and audio, preserve source and fixture provenance, and record only checks actually completed. Prior gallery files and earlier browser captures have their own validation records; rewriting a plan alone does not replace them.

## Review and delivery records

[Component validation](component-video-validation.md) records the source,
fixture and visual checks for the historical exported films. It is not evidence
that a newly edited live composition has been reviewed. The CLI preview,
narration, render, and `npm run component:deliver` workflows remain available
for explicit delivery work. Their generated MP4s stay ignored and do not supply
the gallery previews. `component:deliver` writes completed deliveries and their
metadata to `apps/ava-video-producer/out/component-deliveries/`, without changing
gallery pages or source assets.

To deliver one completed CLI film, use
`npm run component:deliver -- avandar-map` (or another Avandar film ID).
Historical validation records retain the source and artifacts they originally
verified. Record new visual and listening review separately.

Map frames wait for the actual basemap style and tiles, then require rendered
features from its vector source. Tile failures cancel the render. Selecting
`No basemap` is not a valid fallback for a film meant to demonstrate geographic
context. The provider's [integration and attribution instructions](https://openfreemap.org/)
apply to exported video as well as the live map.

Native map shots select Chromium's ANGLE backend in preview and rendering.
The default SwiftShader backend in the downloaded macOS Chrome Headless Shell
failed WebGL2 initialization; ANGLE was verified against the actual map.
The single-worker rule and unchanged frame gate still apply.

## Showcase homepage loop

`storyboards/home.json` supplies the homepage film, `avandar-home`. It keeps the
starter's masked title, native cursor choreography, and dark loop seam while
rendering the real Explorer components. Its 66-frame title precedes one continuous
524-frame shot, trimming the existing Explorer timeline to frames 276–799. The
film is silent, with optional captions and the fictional-data disclosure. It uses the
existing measured cursor targets at the unchanged 1600 × 840 product stage.

The completed chart is the homepage poster (film frame 490).
The live player reads the current plan and product source. **Download MP4**
renders that current composition on demand. `npm run render:showcase` remains
available to generate the loop and two toolkit studies through the CLI; those
MP4 outputs stay in ignored `apps/ava-video-producer/out/` locations for each
film. The script does not copy them into gallery assets or rewrite page
revisions. The original generic `demo` remains in source.
