# Motion Atlas Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task by task. Load using-wt before entering the worktree. Steps use checkbox syntax for tracking. The user requested xhigh implementation workers. This paragraph records the original planning delivery. Source execution and versioned media evidence are complete. Implementation and review are complete; final artifact QA is separate. See the [final closure](../../motion-atlas/implementation-final-closure.md) for HEAD76f3/source9eaa and retained limits.

**Goal:** Add 150 distinct parameterized stock animations and make all 170 Atlas entries configurable, searchable and ready for a future document-to-animation matcher.

**Architecture:** Keep the existing pure React/SVG rendering path. Add strict per-preset content contracts, a typed registry, shared drawing primitives, consistent content transport and metadata export. Each preset owns its choreography; shared primitives do not substitute for distinct ideas.

**Tech Stack:** Workspace React 19.2.5, TypeScript ~5.9.3, Zod ^4.1.13, Remotion 4.0.516, existing esbuild, Lingui and Node test tooling. No new runtime package is required unless the bounded geography asset preparation proves it necessary.

**Spec:** [Motion Atlas expansion design](../specs/2026-10-16-motion-atlas-expansion-design.md).

**Catalog:** [Accepted metadata](../../motion-atlas/catalog-expansion.json), [readable reference](../../motion-atlas/catalog-expansion.md), [proposal decisions](../../motion-atlas/proposal-ledger.md), and [source coverage](../../motion-atlas/source-expansion-ledger.md). The JSON contains every input type, default, bound and binding example. Read the assigned entries in full, not just their titles.

## Completed planning workflow

- [x] Inspect the existing 20 presets, renderer contracts, gallery and export pipeline, including a live paused preview.
- [x] Resolve the delivery boundary and map style with Pablo. Treat the design as auto-approved.
- [x] Dispatch eight initial assignments of ten proposals in available-slot waves, then merge overlapping ideas into stronger definitions.
- [x] Count 77 accepted entries after three merges: 38 general and 39 social. Supply that accepted inventory to the supplementary workers.
- [x] Receive batches of 2, 10, 10 and 1 proposals, reaching exactly 40 general and 60 social entries.
- [x] Consolidate 100 complete contracts and binding examples, with 631 editable props and one semantic acceptance criterion per item. Strictly type-check the declared defaults and examples.
- [x] Write the accepted catalog, merge ledger, auto-approved design and this execution plan. Keep animation implementation for the subsequent execution requested by Pablo.

- [x] Dispatch exactly three xhigh workers to extract generic concepts from the business plan, values and architecture sources.
- [x] Reconcile 261 source concept records and 50 candidate contracts with the existing 100 and legacy 20. Accept 50 additions, enrich 21 original entries plus 1 legacy entry, and record every decision in the source ledger.
- [x] Preserve IDs and packet membership for entries 001-100. Append source-derived contracts through entry 150, yielding 908 editable props, 150 complete binding examples and 30 implementation packets.

The [proposal ledger](../../motion-atlas/proposal-ledger.md) records the initial assignment domains and merges. The source ledger records the subsequent source-review decisions and source-status caveats. The unchecked historical checklist below describes the original required work; checkbox state alone is not current execution evidence. Source concepts and aspirational design notes are not runtime completion evidence.

## Global constraints

- All implementation files stay under `apps/ava-video-producer/`. Product source is read-only. No database, Supabase, Vercel, production service or outbound email work.
- All rendering uses `--concurrency=1`. Do not parallelize Chromium rendering across workers.
- Preserve the current visual language: restrained dark SVG studies, explicit frame timing, readable type, authored secondary colors, configurable accent/background, six-second loops.
- Use a 960 x 600 SVG viewBox, 180 frames at 30 fps, and current 1280 x 800 delivery dimensions. Keep the existing opaque envelope and unchanged frame-gate thresholds.
- Exactly 150 additions: 86 general/technology and 64 social-sector. Preserve the initial 40 + 60 subset; with the legacy 20 the final split is 106 + 64.
- Collections own counts. Supplied inputs are complete schema-valid documents; only omission of the entire input invokes the complete fictional default.
- All new authored frontend copy uses Lingui. Author-supplied content is passed through unchanged. Generated catalogs and bundles remain generated, not hand-edited.
- Preserve the license guard. Never print or copy `.env.local`; use the documented license-key consumer path when rendering. Never introduce a skip flag or send test keys to Remotion telemetry.
- Keep the original demo, product footage and adapter components unchanged. Do not implement embeddings, document ingestion, a vector index, transcript processing or autonomous film assembly.
- Work in `feat/motion-catalog`. No pushes, PRs, merges or publication are authorized. Scoped commits in the worktree are permitted.

## Execution order and ownership

The coordinator owns registry integration, gallery transport, build scripts, inventories and the final validation ledger. A worker owns only its assigned preset directory or explicitly assigned infrastructure files. No two concurrent workers edit the same file. Up to three workers run beside the coordinator. Rendering is a single serial coordinator lane, even when authoring runs concurrently.

Complete Tasks 1-4 before broad animation authoring. Task 5 starts with a small vertical slice. Then the implementation packets later in this plan can run independently against the stabilized contract. Task 6 can run alongside renderer packets after the registry shape is stable. Finish with Tasks 7-8 and the final per-preset acceptance ledger. Use one scoped commit per independently reviewed task or packet.

For each implementation dispatch:

```json
{
  "task_name": "atlas_packet_01",
  "fork_turns": "none",
  "reasoning_effort": "xhigh",
  "message": "Read the producer AGENTS.md, product-demo skill, motion/scene inventories, this spec and plan, and the exact assigned catalog entries. Own only the listed preset directories. Implement with red/green behavioral tests, report default/dense fixture behavior, and leave central registry integration to the coordinator. Do not render concurrently or change product source."
}
```

The coordinator supplies the exact paths and packet entries below, plus the current contract and primitive API files. Packets 01-20 retain the initial allocation; packets 21 onward append source-derived concepts. Use the latest accepted entry including its enrichments, rather than the original worker draft. After each packet, use fresh specification and code-quality reviewers as required by subagent-driven-development. Reviewers are read-only and use available slots after implementers finish. Reject superficial relabelings even if tests pass. Return concrete fixes to the owning worker.

## File responsibilities

All paths below are relative to `apps/ava-video-producer/` unless explicitly stated.

| Path | Responsibility |
| --- | --- |
| `src/stock/contracts/StockContract.ts` | Generic metadata, controls, fixture and input contract types |
| `src/stock/contracts/parseStockInput.ts` | Strict preset-specific default resolution and pathful errors |
| `src/stock/contracts/parseStockInput.test.ts` | Invalid-input, default and reference behavior |
| `src/stock/registry/stockContracts.ts` | Explicit ID-keyed contract registry without renderer imports |
| `src/stock/registry/stockRenderers.tsx` | Exhaustive React renderer dispatch tied to contracts |
| `src/stock/catalog.ts` | Backward-compatible catalog exports derived from contracts |
| `src/stock/presets/<Component>/<Component>.tsx` | One deterministic semantic animation |
| `src/stock/presets/<Component>/<Component>.schema.ts` | Strict schema, inferred input, complete defaults, reference rules |
| `src/stock/presets/<Component>/<Component>.metadata.ts` | Display descriptors, semantic search fields and control descriptions |
| `src/stock/presets/<Component>/<Component>.fixtures.ts` | Default, changed, minimum, dense and invalid scenario fixtures |
| `src/stock/presets/<Component>/<Component>.test.ts` | Render and quantitative behavior for that animation |
| `src/stock/primitives/` | Bounded text, people/objects, route and quantity primitives |
| `src/stock/geography/` | Local land geometry, projection, schematic map helpers and provenance |
| `src/stock/search/buildStockSearchText.ts` | Stable semantic text assembly |
| `src/stock/search/buildStockSearchText.test.ts` | Retrieval text content and stability |
| `src/gallery/MotionGallery/ContentControls/` | Validated editing, collection controls and input errors |
| `src/gallery/i18n.ts` | Gallery provider using the shared English catalog |
| `src/stock/i18n/resolveStockCopy.ts` | Resolve plain descriptors and explicitly listed default text paths |
| `src/stock/i18n/stockI18n.ts` | DOM-free Lingui setup shared by Node and browser |
| `scripts/stock/buildStockMessages.ts` | Generate the compiled English stock catalog from canonical copy |
| `scripts/export-stock-catalog.ts` | Guarded machine-readable schema/metadata/default export |
| `scripts/stock/stockFingerprint.ts` | Canonical configuration and recursive source dependency hashing |
| `docs/motion-atlas/implementation-validation.md` | Per-preset evidence, inspection status and limitations |

The coordinator modifies existing integration files only where named below. Preserve public catalog imports so callers do not need to know the new internal layout.

## Task 1: Establish an isolated baseline and the input contract

**Files:** Create `src/stock/contracts/StockContract.ts`, `parseStockInput.ts`, `parseStockInput.test.ts`, `src/stock/registry/stockContracts.ts`, and the DecisionFork schema, metadata and fixture files under `src/stock/presets/DecisionFork/`. Modify `src/stock/catalog.ts` when moving legacy metadata. Read root `docs/rules/typescript.md`, `docs/rules/testing.md`, producer `AGENTS.md`, and both motion/scene inventories.

Also create `tests/fixtures/legacyStockIds.ts` with the independent literal IDs below before changing registration.

**Consumes:** Existing `StockEntry`, stable IDs, `GraphicProps`, Zod and the accepted catalog. **Produces:** `StockPresetId`, `StockInputByPreset`, `StockRequest`, `StockContract<Input>`, and `parseStockInput(preset, rawInput)`.

- [ ] Enter the existing worktree through `wt` guidance. Inspect `git status --short`; preserve the planning artifacts and any user changes. Install with `pnpm install --frozen-lockfile` from the workspace root only if dependencies are missing. Do not run environment synchronization that copies `.env.local`.
- [ ] Run the focused baseline from the producer directory. The guard must be configured with the user's existing license consumer arrangement before invoking producer tools:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test tests/stock.test.ts tests/storyboard.test.ts scripts/showcase/loadFilm/loadFilm.test.ts
```

Expected: all focused tests pass before runtime changes. Record any pre-existing failure separately; do not claim it is caused or fixed by this work.

- [ ] Preserve all 20 legacy registrations while introducing contracts. Initially their input schema is a strict empty object matching their current fixed-content API; Task 3 replaces each with its extracted content schema. DecisionFork's schema, defaults and metadata are created in this task; its public renderer registration begins in Task 2. This lets the contract test and typecheck pass without requiring a missing renderer.
- [ ] Create the independent original-ID fixture:

```ts
/** Original Motion Atlas IDs retained by the expanded catalog. */
export const LEGACY_IDS = [
  "network-graph", "node-traversal", "radial-network", "plexus-field",
  "orbital-system", "source-merge", "data-pipeline", "schema-mapping",
  "packet-stream", "event-bus", "code-focus", "terminal-type",
  "scan-lines", "bar-race", "line-trace", "metric-counter",
  "dot-matrix", "stagger-cards", "word-reveal", "status-cycle",
] as const;
```

- [ ] Create the strict contract types. Use a schema-inferred input per preset. Controls are data: `kind`, field path, translated label/help, bounds/options and collection item schema; callbacks stay in the editor implementation.

```ts
export type StockRequest = {
  [Id in StockPresetId]: {
    preset: Id;
    schemaVersion?: 1;
    input?: StockInputByPreset[Id];
    accent?: string;
    background?: string;
  };
}[StockPresetId];

export type StockInputByPreset = {
  [Id in StockPresetId]: z.output<
    (typeof stockContracts)[Id]["inputSchema"]
  >;
};
```

- [ ] Write failing tests using `decision-fork`: missing input resolves its whole default; custom branches render without any default branch; an unknown selectedBranchId fails; duplicate branch IDs fail; a fifth branch fails; extra keys fail; nonfinite values and oversize strings fail in schemas that admit numbers/text.

```ts
const custom = {
  ...decisionForkDefaultInput,
  branches: [
    { id: "keep", condition: "Keep", outcome: "Continue" },
    { id: "stop", condition: "Stop", outcome: "Review" },
  ],
  selectedBranchId: "keep",
};
assert.equal(parseStockInput("decision-fork", custom).branches.length, 2);
assert.throws(() => parseStockInput("decision-fork", {
  ...custom, selectedBranchId: "missing",
}));
assert.throws(() => parseStockInput("decision-fork", {
  ...custom, unexpected: true,
}));
```

The branch records above match the accepted decision-fork contract. Other fields come from its complete default fixture. All other packet tests use their catalog entries' full input objects. The contract tests are the first vertical slice and start red before the schema is written.

- [ ] Implement schemas with strict objects, collection bounds and `superRefine` for ID/reference and quantity constraints. Include `preset`, issue path and message in boundary errors. Keep structural JSON Schema and runtime semantic rules distinct: Zod refinements are not fully representable in JSON Schema. Export documented `semanticRules` alongside JSON Schema and always run the runtime validator before rendering.
- [ ] Make default resolution explicit and immutable:

```ts
const candidate = rawInput === undefined
  ? contract.defaultInput
  : rawInput;
const parsed = contract.inputSchema.safeParse(candidate);
if (!parsed.success) {
  throw new Error(formatStockInputIssues(preset, parsed.error.issues));
}
return parsed.data;
```

`formatStockInputIssues` is a local helper in `parseStockInput.ts`; it joins issue paths such as `branches.1.id` with the preset ID. Never substitute a default on parse failure.

- [ ] Run `pnpm exec tsx --test src/stock/contracts/parseStockInput.test.ts`, observe green, then run TypeScript through the guarded existing `pnpm typecheck` command. Commit only this task's files with `feat(video): define typed stock content contracts`.

## Task 2: Wire one configurable animation through every render path

**Files:** Modify `src/stock/StockGraphic.tsx`, `StockCompositions.tsx`, `src/scenes/StockScene.tsx`, `src/storyboard/schema/shotSchema.ts`, `src/storyboard/StoryFilm/ShotView.tsx`, `src/showcase/showcase.types.ts`, `src/showcase/FilmComposition.tsx`, `scripts/showcase/loadFilm/loadFilm.ts`, its test, `tests/stock.test.ts`, and `showcase/download.js` types if needed. Create `src/stock/registry/stockRenderers.tsx` plus `DecisionFork.tsx` and `DecisionFork.test.ts` in the preset directory established by Task 1.

**Consumes:** `StockRequest` and `parseStockInput`. **Produces:** The same validated `{preset, schemaVersion, input, accent, background}` in gallery, storyboard, composition and export.

- [ ] Add a failing `loadFilm` test that submits a configured decision fork and expects the film object to retain the exact input, version and palette. Assert non-stock film IDs reject stock-specific options.
- [ ] Add a storyboard test that accepts the configured fork and rejects dangling references and extra input keys. Add an SVG test that shows the custom chosen outcome and does not show a default-only label.
- [ ] Run the three focused test files and observe the new assertions fail for the expected missing content behavior.
- [ ] Introduce typed renderer closures. A closure receives `GraphicProps` and unknown input, resolves its own schema once at the boundary, and passes typed content to its renderer. The outer public `StockGraphic` props remain the discriminated `StockRequest` plus frame/size. Avoid `any` or a broad `Record<string, unknown>` as the public authoring API.
- [ ] Pass input and background through `StockScene`. Preserve heading space and cycle modulo. Keep the existing frame clamp in standalone `StockGraphic`.
- [ ] Register each composition with its complete default request. Keep legacy preset-only calls valid. Do not deep-merge a supplied input with sample content in `calculateMetadata` or `defaultProps` resolution. Validate the final supplied request after Remotion combines top-level props.
- [ ] Extend the strict stock branch of the storyboard schema and the showcase options parser. Freeze validated content when creating an export job. Validate palette as six-digit hex just as the existing download boundary does.
- [ ] Re-run focused tests. Add a regression that custom content survives source changes and an export snapshot does not change after the in-memory editor draft is edited. Commit `feat(video): carry stock content through previews and exports`.

## Task 3: Extract legacy content and build narrow shared primitives

**Files:** Modify only the 20 current `src/stock/graphics-*` renderers as needed to accept extracted content. Add their contracts and metadata in `src/stock/presets/`. Create `src/stock/primitives/FitText.tsx`, `PersonGlyph.tsx`, `ObjectGlyph.tsx`, `QuantityBand.tsx`, `RoutePath.tsx` and matching single-module tests. Add `src/stock/geography/projectGlobePoint.ts`, its test, local simplified land data and `geography/PROVENANCE.md`. Modify `src/motion.ts` only for genuinely shared frame helpers.

**Consumes:** Current default renderer content and accepted family needs. **Produces:** Legacy inputs plus bounded reusable primitives for new components.

- [ ] Snapshot semantic default output for the 20 existing entries at frames 36, 90 and 150. Normalize only generated SVG IDs in comparisons, never remove labels or geometry from assertions.
- [ ] Apply the [legacy metadata enrichments](../../motion-atlas/source-expansion/legacy-enrichments.json) to their existing IDs while extracting content. Preserve baseline behavior and append source-derived acceptance criteria. Do not register these as new additions.
- [ ] Write failing tests for changed labels, changed collection lengths, chosen graph edges and chart values. Define exact legacy input types from the existing lists: graph nodes/edges, traversal path, hub/spokes, particle count/seed, orbital bodies, sources/destination, pipeline stages, source/target mappings, packet lanes, producers/subscribers, code lines/highlight, command/response, scanned fields, bar values, trend points, metric value/unit, cohort groups, cards, words and states.
- [ ] Extract existing defaults without changing IDs, durations or default examples. Expose controls relevant to each entry, including boolean display choices. Retain authored layout bounds rather than promising arbitrary graphs.
- [ ] Implement deterministic text wrapping with conservative width estimates, at most the declared lines, fixed supported sizes and explicit failure when content cannot fit. Write tests for maximum supported labels and unbreakable text.
- [ ] Implement glyphs as local SVG shapes with no external images, icons at remote URLs or render-time services. A person glyph accepts posture/role presentation only, never inferred demographic traits. QuantityBand accepts explicit finite nonnegative values and a denominator; it preserves fractions instead of rounding token counts into misleading percentages.
- [ ] Implement route travel along supplied polyline points. Reject paths with fewer than two points and nonfinite/out-of-bounds normalized coordinates. Test exact start/end positions and stable reverse seeks.
- [ ] Review the source-derived entries for narrow reusable primitives: aligned document fragments, bounded table cells, set membership markers, byte-offset rulers and invariant-preserving before/after strips. Create a helper only when at least two assigned presets need the same mechanism. Keep permissions, grouping, byte ranges and spatial-cost rules as pure bounded algorithms, not dependencies on the product implementation. Workers report missing shared APIs before parallel edits.
- [ ] Acquire a simplified world land outline from a verified redistributable source, recording its URL, license and hash. Use the Natural Earth 1:110m land outline linked in Planning references; its public-domain terms were verified during planning. Record the downloaded version and checksum when vendoring. Keep no runtime fetches. Use an orthographic projection and clip back-hemisphere markers and paths.

```ts
const longitudeDelta = longitudeRadians - centerLongitudeRadians;
const depth = Math.sin(centerLatitudeRadians) * Math.sin(latitudeRadians)
  + Math.cos(centerLatitudeRadians) * Math.cos(latitudeRadians)
  * Math.cos(longitudeDelta);
const x = radius * Math.cos(latitudeRadians) * Math.sin(longitudeDelta);
const y = -radius * (
  Math.cos(centerLatitudeRadians) * Math.sin(latitudeRadians)
  - Math.sin(centerLatitudeRadians) * Math.cos(latitudeRadians)
    * Math.cos(longitudeDelta)
);
return { x, y, visible: depth >= 0 };
```

`projectGlobePoint({longitude, latitude, centerLongitude, centerLatitude, radius})` accepts degrees externally and converts once. Test center, limb, rear hemisphere and equivalent longitude wraps. Land outlines need spherical clipping as well as marker clipping; do not hide an entire crossing polygon by its centroid.

- [ ] Re-run the legacy regression suite and primitive tests. Inspect legacy comparison contact sheets before accepting changed layout. Commit `feat(video): parameterize legacy stock graphics and shared primitives`.

## Task 4: Bind preview evidence and exports to complete current inputs

**Files:** Create `scripts/stock/stockFingerprint.ts`, `stockFingerprint.test.ts`, `scripts/stock/buildStockContracts.ts` and its test. Modify `scripts/motion.ts`, `scripts/showcase/server.ts`, `scripts/showcase/render.ts`, `scripts/showcase/loadFilm/loadFilm.ts` and `scripts/showcase/createExportJobs/createExportJobs.test.ts` only at their stock request/fingerprint integration points.

**Consumes:** Validated stock request and renderer source closure. **Produces:** Stable fingerprints and CLI `--input` support that refer to exact content.

- [ ] Add failing tests proving a nested preset file edit changes the fingerprint, object-key reordering does not, changing array order does, changing selected input changes it, and unrelated ignored exports do not. Retain tests for source changes while a render is in progress.
- [ ] Implement `canonicalizeStockValue(value)` as recursively sorted plain-object keys with array order preserved. Reject nonfinite numbers and unsupported values before serialization. Use SHA-256 in Node only.
- [ ] Hash the canonical resolved request, frame/sample parameters, local assets and sorted relative paths plus bytes of stock dependencies. Walk only bounded source/asset directories, ignore outputs, and reject symlinks escaping those roots. Include nested `.ts`, `.tsx`, local data and shared motion helpers. Use the esbuild dependency graph or recursive stock whitelist consistently for preview and export.
- [ ] Extend CLI syntax without breaking existing calls:

```sh
pnpm motion -- preview decision-fork --input out/motion/inputs/decision-fork.json
pnpm motion -- render decision-fork --input out/motion/inputs/decision-fork.json
pnpm motion -- preview all
```

The input file contains `{preset, schemaVersion, input, accent, background}`. Its preset must equal the CLI selection; `all --input` is rejected. Validate before bundling. Store each preview manifest under `out/motion/preview/<id>/<configuration-hash>/`, where the hash includes the resolved request and source fingerprint. The ID-level index may point to the latest preview for convenience, but cannot replace another configuration's evidence. A render selects only its exact matching manifest; a dense preview must not invalidate inspected default evidence. Add a regression that previews default, previews dense, then successfully locates the unchanged default manifest. Preserve `list`, `preview <id>`, `render <id>` and default six-frame samples.

- [ ] Add a regression that edits a nested preset default/schema module and calls `loadFilm` again without restarting the server. It must return the new default and enforce the new constraint. The current query-string import of catalog.ts alone is insufficient because child module imports remain cached. Bundle the renderer-free contract registry with esbuild into `out/showcase/contracts/<dependency-hash>.mjs`, import that immutable generation, and retain its validators/defaults for the frozen export request. Reuse the existing build notification path and remove superseded generations only when no active job uses them.
- [ ] Keep one render worker. Exports of different content must never reuse another request's running job. Existing identical-request coalescing stays valid. Freeze the resolved request and compare source hashes before accepting the completed file.
- [ ] Re-run fingerprint, motion CLI and export-job tests. Commit `fix(video): fingerprint stock content and nested render sources`.

## Task 5: Add bounded content controls and complete the first vertical slice

**Files:** Create `src/gallery/MotionGallery/ContentControls/ContentControls.tsx`, `ContentControls.module.css`, `contentDraft.ts`, `contentDraft.test.ts`, and focused editor components as needed for arrays/records. Create `src/gallery/i18n.ts`, `src/stock/i18n/resolveStockCopy.ts`, `stockI18n.ts`, `stockI18n.test.ts`, `scripts/stock/buildStockMessages.ts`, and generated `src/stock/i18n/messages.en.generated.ts`. Add gallery-local Lingui extraction configuration/catalog and guarded generation commands in producer `package.json`. Modify `src/gallery/MotionGallery.tsx`, `MotionCard.tsx`, `PreviewDialog.tsx`, `shared.ts`, `showcase/motion.html`, `showcase/motion.css`, `scripts/build-motion-gallery.mjs`, and `scripts/showcase/server.ts` at the generated-stylesheet route. Add focused `tests/e2e/motion-content.spec.ts` and producer-local headless Playwright config.

**Consumes:** Serializable control descriptions and strict input parser. **Produces:** Usable content editing with exact preview/copy/export parity.

- [ ] Read the impeccable skill before adding this new Content editor surface. Keep it within the existing reference rail. No unrelated gallery redesign.
- [ ] Add failing draft-state tests: invalid drafts retain last-valid input and disable export; Reset restores full default input; removing a referenced item either updates dependent selection explicitly or displays an error; changing a field does not mutate another preset's draft.
- [ ] Model state with `{draft, resolvedInput, issues, isValid}`. Parse on edits. Do not catch errors and substitute a default. Label errors by input path and connect them with `aria-describedby`.
- [ ] Implement text, enum, number, boolean, nested object and bounded collection controls from the catalog's descriptors. For arrays, Add supplies an editable blank item and a unique stable ID; Remove never silently transfers its label to another ID. Matrix cells and branch selectors have named controls. Numeric counts are collection lengths with Add/Remove, not extra unvalidated count props.
- [ ] Link the emitted `motion-gallery.css` from `showcase/motion.html`, allow only that expected generated file in the server asset route, and assert a stylesheet request succeeds with the CSS content type. Confirm Content controls receive their CSS Module classes in the browser.
- [ ] Keep `src/stock` contracts, schemas, metadata and renderers free of macro imports. Store canonical English defaults as ordinary schema-valid JSON and display metadata as plain serializable `{id, message}` descriptors. Add `defaultTextPaths: Array<Array<string | number>>` to each contract to identify only visible default strings, excluding stable IDs, enums and references. Never resolve translation during a contract module import.
- [ ] Implement `resolveStockCopy(contract, i18n)` to translate descriptors and explicitly listed default text paths into a cloned complete default input. Supplied custom input bypasses this translation. Use `setupI18n` in the DOM-free `stockI18n.ts`; the gallery provider, Node exporter and omission-of-input resolver use the same English catalog. The renderer receives already resolved content, without calling translation hooks.
- [ ] Generate `messages.en.generated.ts` from canonical descriptors and default paths using the installed `@lingui/message-utils/compileMessage`. Add the guarded generation command before gallery build, tests and export; generation never invokes rendering or reads `.env.local`. Preserve stable message IDs and fail on conflicting IDs. Do not hand-edit the generated file.
- [ ] Use Lingui macros only for actual gallery UI modules, transforming all `src/gallery` TS/TSX through Babel in `build-motion-gallery.mjs`, not merely the entry point. Extract and compile that UI copy with the workspace Lingui toolchain. Include both gallery UI and stock messages in the gallery provider. No additional macro transform is required in Remotion, direct `tsx` contract imports or live-player bundles because their shared stock imports are macro-free.
- [ ] Add parity tests for direct `tsx` contract imports and esbuild Node contracts, gallery, standalone stock-entry and live-player bundles. Assert stock modules never import a `/macro` path, omitted inputs preserve the same English defaults across paths, and supplied labels are untouched. This smoke test verifies bundling without rendering MP4s.
- [ ] Thread resolved input into preview, cards, configured copy and download options. The copied object is valid standalone JSON with version and preset. Keep content in memory for the current visit, separate from existing saved-reference IDs.
- [ ] Derive all displayed counts from registry data. Extend search fields and add collection filters. Render a lightweight pause/still placeholder for distant cards, mount live SVGs near the viewport and retain the existing shared clock. Switching filters must not reset saved references or palette.
- [ ] Run one focused headless browser spec covering two custom branches, selected outcome, invalid dangling selection, reset, copy JSON, download request snapshot, Escape/focus return and reduced-motion preference. Run it alone with a local timeout no greater than 45 seconds. Use a test intercept for download content transport; a later real gated render proves MP4 parity.
- [ ] Inspect desktop and narrow screenshots at a decisive frame; store them under root `.temp/feat-motion-catalog/`. Run the react-doctor skill's required checks for changed React sources. Commit `feat(video): edit and preview validated stock content`.

## Task 6: Export retrieval metadata and a future binding contract

**Files:** Create `src/stock/search/buildStockSearchText.ts`, its test, `scripts/export-stock-catalog.ts`, and `scripts/stock/exportStockCatalog.test.ts`. Modify producer `package.json` for `motion:catalog`. Update `docs/stock-motion-library.md` only after runtime integration exists.

**Consumes:** Contract registry, schemas, metadata and defaults. **Produces:** `out/motion/catalog/stock-catalog.json` and JSONL records with no renderer dependency or embedding calls.

- [ ] Write failing tests: equivalent metadata gives byte-identical output; semantic description changes affect searchTextHash; only changing fixture labels/counts affects contentHash but not searchTextHash; every example validates; every input control points to a real schema field; exactly 170 records exist after all packets are integrated.
- [ ] Build semantic text in explicit order: name, description, intent, creativeDirection, goodFor, domains, aliases, tags, notFor and distinction. Use normalized whitespace and deterministic array order. Do not include default values or examples' incidental names/numbers.

```ts
export function buildStockSearchText(entry: StockSearchMetadata): string {
  return [
    entry.name, entry.description, entry.intent, entry.creativeDirection,
    ...entry.goodFor, ...entry.domains, ...entry.aliases, ...entry.tags,
    ...entry.notFor, entry.distinction,
  ].map((text) => text.trim().replace(/\s+/g, " "))
    .filter(Boolean).join("\n");
}
```

`StockSearchMetadata` is the semantic subset of `StockContract` defined in Task 1. No fixture values or source-provenance fields belong in this type. Maintain an explicit allowlist for runtime export: sourceRefs, proposalSources, mergedFrom, source paths, document hashes and coordinator decisions stay in the planning bundle. Add a regression that changing only a source locator or source hash changes neither runtime contentHash nor searchTextHash and never appears in emitted JSON/JSONL.

- [ ] Use Zod's installed `z.toJSONSchema` for structural input export. Add separately authored `semanticRules` for references, conservation and denominators; reject unrepresentable schema constructs rather than silently turning them into permissive JSON. Include `schemaVersion`, `metadataVersion`, ID, controls, complete defaults and binding examples.
- [ ] Add the guarded CLI entry, call `requireLicense()` before work, validate all records before writing, and atomically replace output. `pnpm motion:catalog` writes only ignored output. Copying this data into a future retrieval system is outside this task.
- [ ] Run targeted search/export tests and compare two successive export hashes. Commit `feat(video): export versioned stock retrieval metadata`.

## Task 7: Integrate all packets and inspect every animation

**Files:** Modify `src/stock/registry/stockContracts.ts`, `stockRenderers.tsx`, `src/stock/catalog.ts`, `tests/stock.test.ts`, `package.json` test discovery, and create `docs/motion-atlas/implementation-validation.md`. Runtime code changes stay limited to integrating the reviewed packets and correcting observed defects.

**Consumes:** The 150 component outputs from 30 packets and 20 legacy contracts. **Produces:** All 170 runtime registrations plus per-preset evidence.

- [ ] Integrate one packet at a time into the explicit registries. Workers must never race to edit the registries. Update test discovery to include colocated preset/contract/primitives tests using a bounded file enumeration, not only the old `tests/*.test.ts` glob.
- [ ] Add assertions for final membership, preserved legacy IDs and collection counts. Keep the accepted IDs fixture separate from the runtime registry so a missing registration actually fails the test.

```ts
assert.deepEqual(new Set(STOCK_IDS), new Set([
  ...LEGACY_IDS, ...acceptedAdditions.map(({ id }) => id),
]));
assert.equal(STOCK_CATALOG.filter((entry) => entry.collection === "general").length, 106);
assert.equal(STOCK_CATALOG.filter((entry) => entry.collection === "social-sector").length, 64);
```

`LEGACY_IDS` is the independent literal 20-ID fixture created in Task 1 at `tests/fixtures/legacyStockIds.ts`; `acceptedAdditions` is read from the accepted design JSON. This checks implementation against the approved catalog, not a registry against itself.

- [ ] For each new preset, execute its semantic tests and a shared deterministic render harness over frames `[90, 0, 179, 18, 138, 45, 1, 167, 178]`. Verify finite SVG, stable seek output, opaque endpoints and unique defs for two copies on the same page. Changed-input fixtures must demonstrably alter the expected labels, geometry or final selection.
- [ ] Build the live gallery with `pnpm motion:build`. Preview each default with `pnpm motion -- preview <id>`. Inspect the six stock samples and a still at the preset's decisive beat. Preview a second dense or long-label input with the Task 4 `--input` path. Use `view_image` to inspect full-size problem frames; contact-sheet generation alone is insufficient.
- [ ] Watch each default in the live headless browser via Playwright MCP, including its entrance, decisive action, final hold and seam. Save meaningful screenshots at root `.temp/feat-motion-catalog/<id>/`. Inspect maps for marker occlusion, routes for endpoint continuity, cohorts for denominator preservation and text for overlap.
- [ ] Record status separately: schema tests, SVG tests, default preview, dense preview, playback review, default MP4 render and frame gate. Each record includes ID, source/config fingerprint, input fixture name, sampled frames, file locations, actual reviewer observations and remaining limits.
- [ ] When execution includes explicit render authorization, render all 150 new defaults sequentially through `pnpm motion -- render <id>`, using matching inspected previews. This request authorizes producing stock animations in the later execution, but the current turn is plan-only. Never create MP4s merely from browsing the gallery.
- [ ] Inspect each output's poster and playback; record actual frame-gate results without changing thresholds. For configured export parity, render at least one edited example from every shared renderer family and verify selected content/palette in extracted frames. Additional configured inputs require their own preview inspection before use in a real film.
- [ ] Run producer typecheck, the full producer unit suite once, and only the focused gallery E2E spec. Do not run the repository's full E2E suite. If fresh changes follow, rerun only affected checks unless the failure exposes wider risk.
- [ ] Commit reviewed integration and evidence with `feat(video): complete the expanded Motion Atlas catalog`. Do not commit MP4s, bundles, full frame sequences, raw browser logs or preview directories.

## Task 8: Update accurate local documentation and hand off

**Files:** Update `docs/stock-motion-library.md`, `docs/shared-scene-library.md`, `docs/motion-vocabulary.md`, `docs/scene-api.md`, `docs/agent-architecture.md`, `docs/motion-atlas-validation.md` with an explicit new dated section or linked new evidence record. Update the accepted design only if a concrete approved contract changes.

**Consumes:** Actual runtime APIs and verified per-preset ledger. **Produces:** Accurate usage reference, current architecture status and final worktree handoff.

- [ ] Replace fixed-content statements only after all relevant controls actually work. Describe default values, supported bounds, schemaVersion, error paths, content transport, configured copy, CLI input files, metadata export and collection counts.
- [ ] Add a complete configured storyboard example and a React example using an implemented preset. The examples must validate in the same focused tests used by the real registry.
- [ ] Document the source of recognizable world land, schematic-local-map limitations, author-supplied quantitative results and fictional defaults. Keep extraction/embedding/indexing explicitly unimplemented.
- [ ] Update motion vocabulary only for helpers actually added. Update scene counts using runtime registration rather than copying historical prose with stale counts.
- [ ] Run a fresh documentation link/ID check and verify every example against the runtime schema. Re-run relevant code checks only if documentation validation reveals a code change.
- [ ] Copy requested artifacts to `~/Downloads/feat-motion-catalog/motion-atlas/`, preserving repository-relative links or rewriting them in the convenience copy. Convert each delivered Markdown artifact with `markdown-to-pdf <file.md> --out <file.pdf>`. Inspect rendered PDF pages for clipping and tables. The worktree stays authoritative.
- [ ] Report exact implemented count, test results and any unverified items. State the worktree path. No merge, push, PR or publication occurs without a new explicit request. Do not remove the worktree or private video material.

## Worker packet contract

Each packet below owns at most five preset directories. Its entry table specifies exact component names, source paths, schema fields and distinct visual behavior; the catalog JSON supplies full types, defaults, bounds, tags, direction and binding examples. Implement both toggled and collection-size variants rather than assuming default data is sufficient.

Each directory has these exact files: `<Component>.tsx`, `<Component>.schema.ts`, `<Component>.metadata.ts`, `<Component>.fixtures.ts`, and `<Component>.test.ts`. Export the component by its name, `inputSchema`, `defaultInput`, `metadata` and `fixtures` from their respective modules. `Input` is inferred from `inputSchema`. The coordinator imports these into registries after review.

Within each packet, repeat this test-first cycle for each of its assigned entries:

1. Write its schema rejection fixtures, a changed-input fixture and the listed semantic before/after assertion. Run that one test file and observe the expected failure before implementing.
2. Convert the accepted inputs into a strict Zod schema. Encode every cross-reference, bounded collection, denominator and conservation constraint. Keep metadata content faithful to the catalog, while refining implementation wording only to match actual limits.
3. Implement the distinct geometry and choreography described in the entry. The shared frame contract is:

```tsx
export type Props = GraphicProps & { input: Input };

// In each named component, place the setup, transformation and resolved groups
// at the frames specified by that entry's creative direction. Reuse ramp/mix
// from motion.ts. The outer StockGraphic owns the seam envelope.
const transformation = ramp(frame, 36, 72, EASE.inOut);
const resolvedHold = ramp(frame, 108, 12);
```

The two expressions are the default timing contract, not permission to replace an entry with a generic card sequence. Entries with explicit alternate beats own those beats. Keep text at fixed readable size and tie geometry to actual input arrays.

4. Test default, minimum, dense and changed-input cases. Invalid inputs include extra keys and item references that do not exist; arithmetic examples include impossible totals. Render at start, decisive and hold frames, then seek backward and compare deterministic results.
5. Report files, test commands/results, new primitive needs, layout limits and source fingerprint. Do not run Chromium renders in the worker. The coordinator integrates and owns serial visual review. Address review findings before marking the packet accepted.

A packet is complete only when each component's semantic test passes. Schema-only data or a metadata entry routed to an unrelated existing renderer does not complete an animation.

## Planning references

The installed workspace versions remain the implementation authority. These primary references were checked while planning:

- [Remotion parameterized rendering](https://www.remotion.dev/docs/parameterized-rendering): top-level input props resolve with composition defaults; validation must happen on the resulting request.
- [Remotion input props](https://www.remotion.dev/docs/options/props): CLI input can be a JSON file. The Atlas CLI wrapper will validate and pass that content through its existing rendering path.
- [Zod JSON Schema](https://zod.dev/json-schema): use the installed v4 conversion API; separately document runtime relational refinements.
- [Natural Earth land outlines](https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/) and [terms](https://www.naturalearthdata.com/about/terms-of-use/): suitable public-domain land geometry, vendored locally with provenance rather than fetched during rendering.


## Implementation packets

Execute these after Tasks 1-4 stabilize the contracts. Each packet is a separate xhigh assignment with at most five owned component directories. Task 5 uses DecisionFork as the first slice; its later packet verifies and completes it rather than rebuilding it. Read each full catalog entry for exact typed inputs and defaults.

### Packet 01: Two approaches, one question, Capability by capability, Choose the replacement, Choose one branch, A choice has two sides

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/PairedContrast/`
- `src/stock/presets/CapabilityMatrix/`
- `src/stock/presets/RejectAndReplace/`
- `src/stock/presets/DecisionFork/`
- `src/stock/presets/TradeoffPivot/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### PairedContrast (`paired-contrast`)

- [ ] Add schema fields: `question`, `alternatives`, `criteria`, `focusCriterionId`, `comparisonLabel`, `showPairBrackets`. Use the exact types, defaults and limits from catalog entry 001.
- [ ] Write and run the failing behavioral test: Changing the focused criterion moves the comparison emphasis to that row while both alternatives and every other criterion remain visible.
- [ ] Implement this choreography: Within six seconds, two labeled halves slide apart to reveal a shared question in the center. Matching attribute pairs enter on the same horizontal baselines, their center brackets draw simultaneously, and the nominated contrast expands into a single readable comparison band. Both alternatives remain visible during the resolved hold before the shared exit envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PairedContrast/PairedContrast.test.ts
```

#### CapabilityMatrix (`capability-matrix`)

- [ ] Add schema fields: `options`, `capabilities`, `stateLabels`, `focus`, `showNotes`, `caption`. Use the exact types, defaults and limits from catalog entry 002.
- [ ] Write and run the failing behavioral test: Included, absent, conditional and unknown cells have four distinct marks. Unknown never appears as absent. Switching row or column focus changes only the designated emphasis, not capability values. Source-derived variant: Use independent states for local querying, remote invitation and optional synchronization; an offline flag must not convert every row into supported.
- [ ] Implement this choreography: A table skeleton and option headings settle first. A narrow horizontal rule advances through the capability rows, resolving all cells in each row together so the audience compares like with like. The final focus opens a bracket around one selected column or row while every other cell remains legible, followed by the common opaque exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CapabilityMatrix/CapabilityMatrix.test.ts
```

#### RejectAndReplace (`reject-and-replace`)

- [ ] Add schema fields: `criterion`, `rejected`, `replacement`, `decisionLabels`, `showCriterionLink`, `rejectionMark`. Use the exact types, defaults and limits from catalog entry 003.
- [ ] Write and run the failing behavioral test: At the hold, the replacement occupies the selection slot and the rejected option retains its rejection mark and rationale; changing the rejection style changes the mark.
- [ ] Implement this choreography: A proposed label settles into a central selection slot beneath a criterion. A small strike crosses its selection marker, then the option slides into a left-side rejected position as its reason appears. The replacement enters the vacated slot from the right, receives a selection bracket, and holds with its rationale and the original choice still readable before the shared fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/RejectAndReplace/RejectAndReplace.test.ts
```

#### DecisionFork (`decision-fork`)

- [ ] Add schema fields: `prompt`, `branches`, `selectedBranchId`, `scenarioLabel`, `selectionLabel`, `showUnchosenOutcomes`. Use the exact types, defaults and limits from catalog entry 004.
- [ ] Write and run the failing behavioral test: Only selectedBranchId receives the traveling marker and selected outcome emphasis; hiding unchosen outcomes removes those labels without changing the chosen branch.
- [ ] Implement this choreography: The decision prompt enters at the root and two to four equal branches draw outward with condition labels. A single marker pauses at the junction while the selected condition receives emphasis. The unused branch gates close gently, the marker travels down the chosen branch, and its outcome opens into a final hold while alternate outcomes remain subdued and labeled.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/DecisionFork/DecisionFork.test.ts
```

#### TradeoffPivot (`tradeoff-pivot`)

- [ ] Add schema fields: `approach`, `gains`, `concessions`, `sideLabels`, `priorityStatement`, `revealOrder`. Use the exact types, defaults and limits from catalog entry 005.
- [ ] Write and run the failing behavioral test: Gain and concession text both remain at the hold; reversing revealOrder reverses their entrance order without treating the hinge angle as a numerical score.
- [ ] Implement this choreography: A slim vertical hinge appears beneath the approach label. Its left leaf unfolds to show the gained qualities, then the hinge pivots just enough to reveal the right leaf with the concessions. Both settle open at equal readable size, and a short priority statement locks beneath the hinge as the final hold. The angle is fixed editorial motion rather than a numeric balance.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/TradeoffPivot/TradeoffPivot.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 01`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 02: The rule and its exception, From reasons to conclusion, Narrow the question, Both can be true, Find the common ground

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ExceptionDetour/`
- `src/stock/presets/ArgumentBridge/`
- `src/stock/presets/ScopeAperture/`
- `src/stock/presets/QualifyApparentConflict/`
- `src/stock/presets/SharedFoundation/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ExceptionDetour (`exception-detour`)

- [ ] Add schema fields: `rule`, `exception`, `caseLabel`, `pathLabels`, `showStandardReference`, `detourSide`. Use the exact types, defaults and limits from catalog entry 006.
- [ ] Write and run the failing behavioral test: The case follows the exception route while the standard route remains intact; switching detourSide mirrors the route without swapping the outcomes.
- [ ] Implement this choreography: The standard rule and straight destination appear first. A single labeled case approaches the gate, pauses as its exception condition opens a side latch, and follows a curved detour to the exception outcome. The standard path remains intact and visible throughout. The final hold brackets the case, condition, and special outcome before the shared exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ExceptionDetour/ExceptionDetour.test.ts
```

#### ArgumentBridge (`argument-bridge`)

- [ ] Add schema fields: `premises`, `conclusion`, `relationship`, `connectorText`, `premiseHeading`, `showIndividualSupports`. Use the exact types, defaults and limits from catalog entry 007.
- [ ] Write and run the failing behavioral test: The conclusion is supported by every supplied premise, and changing premise count changes the physical supports without introducing an unsupplied premise.
- [ ] Implement this choreography: Two or three premise strips arrive separately along the lower third. Their ends extend and join into a single bridge deck, with a central connector label appearing only once the premises are readable. The conclusion rises onto that deck and holds above all visible premises. Nothing is transported through the bridge; it is an explicit visual model of an argument's support.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ArgumentBridge/ArgumentBridge.test.ts
```

#### ScopeAperture (`scope-aperture`)

- [ ] Add schema fields: `broadTopic`, `topics`, `focusedQuestion`, `outsideLabel`, `insideLabel`, `showExcludedTopics`. Use the exact types, defaults and limits from catalog entry 008.
- [ ] Write and run the failing behavioral test: Only topics designated inside the focus lie within the final aperture; excluded topics remain outside or disappear according to the display toggle.
- [ ] Implement this choreography: A broad heading and a flat field of topic labels appear together. A rectangular aperture draws around the full field, then its edges contract and selected labels slide together within it while other labels remain outside. The narrowed question replaces the broad heading inside the frame. A final outside caption clarifies what is deferred before the common exit envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ScopeAperture/ScopeAperture.test.ts
```

#### QualifyApparentConflict (`qualify-apparent-conflict`)

- [ ] Add schema fields: `statements`, `openingLabel`, `qualifier`, `connectorLabel`, `contextPlacement`, `showCentralDivider`. Use the exact types, defaults and limits from catalog entry 009.
- [ ] Write and run the failing behavioral test: Both original claims survive unchanged under their respective context labels, and the qualifier appears after the context split.
- [ ] Implement this choreography: Two short claims enter on opposing horizontal tracks and stop at a central question mark. A context divider unfolds vertically, moving each claim to its own labeled region. The question mark resolves into a small joining brace with the authored qualifier below it. Both context-claim pairs hold together before the shared fade, without rewriting either claim.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/QualifyApparentConflict/QualifyApparentConflict.test.ts
```

#### SharedFoundation (`shared-foundation`)

- [ ] Add schema fields: `approaches`, `sharedPrinciple`, `foundationLabel`, `openingConnector`, `showDistinctTraits`, `foundationReveal`. Use the exact types, defaults and limits from catalog entry 010.
- [ ] Write and run the failing behavioral test: Distinct approach traits remain separate above one shared foundation; changing the shared principle changes the base without collapsing the approaches.
- [ ] Implement this choreography: Two labeled structures stand apart with their distinct traits underneath. Their lower edges rise in parallel, exposing matching fragments of a shared foundation phrase. The fragments join into one continuous base spanning both structures, then short supports reconnect each approach to it. The final hold reads as two approaches resting on the same principle before the shared exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SharedFoundation/SharedFoundation.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 02`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 03: Work Keeps Its Place, Receipts Close the Journal, A Model Inside the Device, Only the Chosen Fields Leave, The Contents Stay Covered

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/OfflineLedger/`
- `src/stock/presets/JournalReceipts/`
- `src/stock/presets/PocketInference/`
- `src/stock/presets/DisclosureAperture/`
- `src/stock/presets/SealedHandoff/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### OfflineLedger (`offline-ledger`)

- [ ] Add schema fields: `entries`, `surfaceLabel`, `copy`, `deviceShape`, `showStorageImpressions`, `showLabels`. Use the exact types, defaults and limits from catalog entry 011.
- [ ] Write and run the failing behavioral test: Every supplied entry gets a local impression after connectivity disappears; entries continue at the same cadence and remain present during the offline hold. Source-derived variant: Show one retained impression per supplied entry; use separate entries for source document and extracted table without depicting either as reconstructing the other.
- [ ] Implement this choreography: Within the six-second envelope, reveal a notebook held inside a device outline. At the first entry, the small connection arc gently collapses and the supplied offline caption appears; the writing strokes continue at the same cadence. Each entry presses a matching impression into a shallow local drawer directly beneath the page. Hold on the completed page and its retained impressions with the connection still unavailable, then fade both to the opaque ground without depicting data loss.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/OfflineLedger/OfflineLedger.test.ts
```

#### JournalReceipts (`journal-receipts`)

- [ ] Add schema fields: `entries`, `receipts`, `copy`, `foldDirection`, `showIdentifiers`, `showLabels`. Use the exact types, defaults and limits from catalog entry 012.
- [ ] Write and run the failing behavioral test: Only entries with matching receipt IDs flatten their pending tabs; a missing acknowledgement leaves its tab raised without deleting the entry.
- [ ] Implement this choreography: Reveal a compact accordion journal with one folded tab per pending entry. As the connection caption changes, unfold the journal just enough to expose each identifier. Authored receipt halves emerge from a separate acknowledgment pocket and register precisely against matching journal tabs; the paired tabs flatten into the page, leaving unpaired tabs raised. Hold on the visibly retained journal with only the supplied receipts closed, then fade to the shared opaque ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/JournalReceipts/JournalReceipts.test.ts
```

#### PocketInference (`pocket-inference`)

- [ ] Add schema fields: `model`, `input`, `response`, `copy`, `deviceShape`, `showCutaway`, `showLabels`. Use the exact types, defaults and limits from catalog entry 013.
- [ ] Write and run the failing behavioral test: Input, model cartridge and response stay inside the device boundary for all frames; custom response text appears with no outbound processing route. Source-derived variant: All inference remains within device after cartridge installation; use an authored query as response and label it illustrative, not executed model output.
- [ ] Implement this choreography: Open on a fixed device cutaway with an empty cartridge socket. Seat a compact labeled model cartridge in the socket, then let a narrow fold of input text enter the device's internal writing area. A single restrained ripple crosses the cartridge face and the supplied response unfurls beneath the input, entirely inside the casing. Hold the device, model, and result together with a supplied boundary caption; fade out through the six-second opaque envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PocketInference/PocketInference.test.ts
```

#### DisclosureAperture (`disclosure-aperture`)

- [ ] Add schema fields: `fields`, `copy`, `direction`, `showPolicyMarks`, `showValues`, `showLabels`. Use the exact types, defaults and limits from catalog entry 014.
- [ ] Write and run the failing behavioral test: Only fields marked for sharing have copies outside the boundary; retained fields never appear in the disclosure envelope and the complete original stays inside. Source-derived variant: Preserve all-retain as a valid configuration with zero outbound copies. Retained source fields remain visible; a shared excerpt must not be labeled schema-only if it contains raw values. Source-derived variant: Bind metadata fields to share and raw-content fields to retain; source remains intact and labels distinguish the two classes.
- [ ] Implement this choreography: Reveal one local document behind a tall boundary panel and an empty disclosure envelope outside it. Each authored share field briefly lifts as a duplicate while the original stays printed; a precisely sized aperture opens only opposite that field and lets its duplicate pass into the envelope. Retained fields never lift or leave. Close the aperture and hold the complete original beside the selected disclosure contents, then return to the opaque loop ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/DisclosureAperture/DisclosureAperture.test.ts
```

#### SealedHandoff (`sealed-handoff`)

- [ ] Add schema fields: `brief`, `address`, `copy`, `revealRule`, `showExteriorReference`, `showLabels`. Use the exact types, defaults and limits from catalog entry 015.
- [ ] Write and run the failing behavioral test: The brief is readable before closure in both modes and fully occluded throughout envelope transit. Recipient mode reopens only after arrival; remain-sealed never re-exposes the contents after closure.
- [ ] Implement this choreography: Begin with a short open brief resting over an unfolded envelope. Fold the lower and side flaps over the brief, then lower the final flap so the contents are fully occluded rather than faded. Move the closed envelope along one shallow hand-carried arc to a recipient tray. If the configured reveal rule is recipient, peel the flap open only after the envelope settles; otherwise hold it sealed. Resolve on the authored final state before the seam-safe fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SealedHandoff/SealedHandoff.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 03`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 04: Release After Acceptance, Wait for every required branch, Distinct Work, Shared Fabric, Borrowed Permission Returns, Assemble a dashboard

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/CustodyTransfer/`
- `src/stock/presets/ReadinessLatch/`
- `src/stock/presets/ContributionWeave/`
- `src/stock/presets/ExpiringLease/`
- `src/stock/presets/DashboardSlotAssembly/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### CustodyTransfer (`custody-transfer`)

- [ ] Add schema fields: `holders`, `object`, `outcome`, `copy`, `objectShape`, `showResponsibilityMarker`, `showLabels`. Use the exact types, defaults and limits from catalog entry 016.
- [ ] Write and run the failing behavioral test: The sender support remains until acknowledgement; a waiting outcome never moves the responsibility marker to the recipient.
- [ ] Implement this choreography: Reveal one labeled object held by the sender's bracket. The receiving bracket approaches from the opposite side and makes contact while the sender still supports the object. In the accepted outcome, the recipient's acknowledgment seal lands, the responsibility marker crosses the shared contact zone, and only then does the sender withdraw. In the waiting outcome, retain sender support and hold at the contact zone without an ownership change. Finish on an unambiguous owner state within the six-second envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CustodyTransfer/CustodyTransfer.test.ts
```

#### ReadinessLatch (`readiness-latch`)

- [ ] Add schema fields: `participants`, `sharedAction`, `copy`, `orientation`, `showParticipantStates`, `showLabels`, `showWorkValues`, `unitLabel`. Use the exact types, defaults and limits from catalog entry 017.
- [ ] Write and run the failing behavioral test: One unready participant keeps the latch closed after faster branches finish; with all ready, the result crosses only after the slowest work ribbon reaches the gate. Source-derived variant: Bind participants to dataset dependencies; one incomplete required participant keeps the common result latched even when all others are ready.
- [ ] Implement this choreography: Reveal two to five work ribbons ending at a shared latch. Their progress advances with authored relative work units during frames 24..112; ready participants withdraw their pins as they finish, while unready participants retain theirs. At frame 122, the latch opens only if every pin is withdrawn, releasing the labeled result by frame 146. Otherwise hold the blocked gate and identify the waiting branch. Preserve completed ribbons during the final reading hold, then fade to the common ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ReadinessLatch/ReadinessLatch.test.ts
```

#### ContributionWeave (`contribution-weave`)

- [ ] Add schema fields: `warp`, `weft`, `copy`, `weaveStart`, `showContributorEnds`, `showLabels`. Use the exact types, defaults and limits from catalog entry 018.
- [ ] Write and run the failing behavioral test: Every warp and weft contributor retains one identifiable end and crossings alternate correctly; changing weaveStart changes over-under order without losing contributors.
- [ ] Implement this choreography: Reveal a small loom frame with two or three vertical bands and the same bounded set of horizontal shuttles. Tension the vertical contributions first; sweep each horizontal shuttle once through an alternating over-under mask so the crossing pattern visibly locks together. Keep a short labeled end of every contributor's band outside the frame. Hold the finished fabric with all identities still traceable, then fade the complete textile within the six-second envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ContributionWeave/ContributionWeave.test.ts
```

#### ExpiringLease (`expiring-lease`)

- [ ] Add schema fields: `participants`, `holderId`, `permissionLabel`, `lifetime`, `copy`, `showLifetime`, `showLabels`. Use the exact types, defaults and limits from catalog entry 019.
- [ ] Write and run the failing behavioral test: Exactly one holder owns the token initially, no holder owns it after expiry, and the returned token is retained at the neutral dock.
- [ ] Implement this choreography: Reveal a neutral permission dock and a short arc of participant sockets. Seat the one token in the chosen holder's socket while all other sockets remain empty. A finite segmented collar around that socket drains in evenly spaced editorial beats; when it empties, the socket opens and the token retracts to the neutral dock. Hold the unassigned token and the prior holder's empty socket, making expiration different from a direct handoff, then fade to the opaque ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ExpiringLease/ExpiringLease.test.ts
```

#### DashboardSlotAssembly (`dashboard-slot-assembly`)

- [ ] Add schema fields: `boardTitle`, `widgets`, `featuredWidgetId`, `layout`, `scopeLabel`, `showGuides`. Use the exact types, defaults and limits from catalog entry 020.
- [ ] Write and run the failing behavioral test: Changing the featured widget changes its reserved slot and the remaining layout; every supplied widget docks once and no title is stretched with its panel. Source-derived variant: Preserve all supplied widget identities while docking; shared layout does not silently merge their data or denominators.
- [ ] Implement this choreography: Frames 12-40 establish supplied widgets as differently sized panels and an empty dashboard outline. During frames 40-64, the featured panel docks while supporting panels resize and stage clear of it. During frames 64-112, supporting panels dock in staggered order with fixed-size text; frame 88 witnesses this final-docking stage. Grid guides extend from the featured edges, a shared scope strip settles across the board, guides withdraw, and the completed composition holds through frame 166 before the opaque exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/DashboardSlotAssembly/DashboardSlotAssembly.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 04`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 05: Bind a shareable report, Clean values in place, Refine a chart for reading, Insert a processing step, Reveal the source behind a claim

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ReportPageBind/`
- `src/stock/presets/CellNormalization/`
- `src/stock/presets/ChartFocusEdit/`
- `src/stock/presets/PipelineStepSplice/`
- `src/stock/presets/ProvenancePeelback/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ReportPageBind (`report-page-bind`)

- [ ] Add schema fields: `reportTitle`, `sections`, `byline`, `destinationLabel`, `formatLabel`, `finalView`, `showPageNumbers`. Use the exact types, defaults and limits from catalog entry 021.
- [ ] Write and run the failing behavioral test: The page count equals sections.length and their order remains unchanged; stack versus spread changes the final arrangement while all pages and destination remain accounted for. Source-derived variant: Keep source order and page binding; use supplied sections for map view, legend and source note and retain them together in the report.
- [ ] Implement this choreography: Frames 12-38 present two or three source excerpts on a work surface. Between frames 38-104, paper margins extend around the excerpts, each excerpt takes its own page, and a title strip becomes the first page header. The pages slide into an offset bound stack beside a destination tray during frames 104-136. Hold the report and destination label through frame 166, then exit to the shared ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ReportPageBind/ReportPageBind.test.ts
```

#### CellNormalization (`cell-normalization`)

- [ ] Add schema fields: `title`, `rows`, `columnLabels`, `showWhitespace`, `comparison`, `showEditLabels`. Use the exact types, defaults and limits from catalog entry 022.
- [ ] Write and run the failing behavioral test: Only changed cells transition to supplied cleaned values; unchanged rows stay aligned, and the original-value rail preserves the actual before values. Source-derived variant: Use explicit before/after and editLabel values; a count-and-percent composite such as 12 (40) must not be portrayed as an inferred negative number.
- [ ] Implement this choreography: Frames 12-40 reveal the table with before values and optional visible whitespace marks. During frames 40-112, changed cells receive narrow edit brackets; extra-space marks contract and changed glyphs crossfade into their supplied replacements without moving the rows. A thin original-value rail unfolds alongside the cleaned column. Hold both states through frame 166, then fade to the opaque ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CellNormalization/CellNormalization.test.ts
```

#### ChartFocusEdit (`chart-focus-edit`)

- [ ] Add schema fields: `categories`, `axisMaximum`, `unitLabel`, `focusId`, `treatment`, `headings`, `showValueLabels`, `showBeforeGuide`. Use the exact types, defaults and limits from catalog entry 023.
- [ ] Write and run the failing behavioral test: Refinement changes label/grid treatment but never bar lengths or axis maximum; the selected focus changes emphasis without altering data.
- [ ] Implement this choreography: Frames 12-40 show the complete bars, labels, and a light plotting grid. Between frames 40-112, minor grid lines recede, label tabs move to direct reading positions when requested, and nonfocused marks soften without changing length. A small context heading settles beside the selected mark. Hold the cleaner chart through frame 166 before the standard exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ChartFocusEdit/ChartFocusEdit.test.ts
```

#### PipelineStepSplice (`pipeline-step-splice`)

- [ ] Add schema fields: `title`, `steps`, `editLabel`, `preview`, `showPreview`, `joinStyle`. Use the exact types, defaults and limits from catalog entry 024.
- [ ] Write and run the failing behavioral test: The inserted operation occupies the requested gap exactly once; downstream modules shift and the final connectors follow the new ordered sequence.
- [ ] Implement this choreography: Frames 12-38 establish the existing strip of operations with the new module parked above its future position. During frames 38-98, the strip separates at that position, later modules move aside, and the inserted module slides down into the open gap. End joints close across the new module. A small before/after preview opens below the insertion during frames 98-132 and holds with the recomposed strip until the exit envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PipelineStepSplice/PipelineStepSplice.test.ts
```

#### ProvenancePeelback (`provenance-peelback`)

- [ ] Add schema fields: `summary`, `sources`, `selectedSourceId`, `citationLabel`, `showLocators`, `sourceArrangement`. Use the exact types, defaults and limits from catalog entry 025.
- [ ] Write and run the failing behavioral test: The focal citation aligns with the selected source's exact excerpt and locator; other sources remain distinguishable and no citation is fabricated. Source-derived variant: A selected source locator can state page and region label; focal excerpt must match the supplied observation and remain visible.
- [ ] Implement this choreography: Frames 12-40 hold a summary strip resting over a short stack of source sheets. During frames 40-104, the summary lifts in place and the source sheets fan out with their text kept upright. The selected source rises, its excerpt receives a narrow underline, and a citation tab aligns with the summary edge. Hold the statement and source passage side by side through frame 166, then return to the opaque ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ProvenancePeelback/ProvenancePeelback.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 05`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 06: Join matching records, Reconcile conflicting values, Drill into a selected group, Review duplicate candidates, Relieve the bottleneck

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/KeyedRowZipper/`
- `src/stock/presets/FieldConflictChoice/`
- `src/stock/presets/NestedDrilldownWindow/`
- `src/stock/presets/DuplicateReviewStack/`
- `src/stock/presets/QueueRelief/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### KeyedRowZipper (`keyed-row-zipper`)

- [ ] Add schema fields: `leftRows`, `rightRows`, `joinType`, `labels`, `showKeys`, `showUnmatchedTray`. Use the exact types, defaults and limits from catalog entry 026.
- [ ] Write and run the failing behavioral test: Matched keys join once; inner joins retain unmatched rows in context only, and left joins retain unmatched left rows with explicit empty partners. Source-derived variant: Keep every unmatched left/right row according to the chosen join rule and display the unmatched tray in boundary-join bindings.
- [ ] Implement this choreography: Frames 12-42 establish two tables with key columns facing each other. Between frames 42-108, equal keys align vertically, their key cells meet at a shared seam, and each matched pair closes into one wider row. Rows without a partner move into a context tray for an inner join, or retain a labeled empty partner for a left join. Hold the derived result and any context tray through frame 166, then exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/KeyedRowZipper/KeyedRowZipper.test.ts
```

#### FieldConflictChoice (`field-conflict-choice`)

- [ ] Add schema fields: `recordTitle`, `sources`, `fields`, `labels`, `showRetainedAlternatives`, `decisionStyle`. Use the exact types, defaults and limits from catalog entry 027.
- [ ] Write and run the failing behavioral test: Resolved fields use only their selected source value; unresolved fields retain alternatives and do not acquire a fabricated result.
- [ ] Implement this choreography: Frames 12-42 show one record with parallel source columns. Between frames 42-112, authored choice rails move toward the selected source for each resolved field, lifting that value into the result column. An unresolved field keeps both alternatives separated by a review bracket. Rejected alternatives remain in a quieter side ledger when enabled. Hold resolved and unresolved fields together through frame 166 before exiting.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/FieldConflictChoice/FieldConflictChoice.test.ts
```

#### NestedDrilldownWindow (`nested-drilldown-window`)

- [ ] Add schema fields: `records`, `dimensions`, `selectionPath`, `labels`, `retainContext`, `selectionStyle`. Use the exact types, defaults and limits from catalog entry 028.
- [ ] Write and run the failing behavioral test: The visible detail records satisfy every selected dimension in selectionPath; the breadcrumb preserves the parent context and excluded records are not counted as details. A one-element path produces one selection and one breadcrumb level, with no invented subgroup.
- [ ] Implement this choreography: Frames 12-40 show record slips organized by the first supplied dimension. A window outlines the first selected group, and other groups recede into a parent strip. For a two-element selectionPath, frames 74-118 open second-dimension compartments and isolate the supplied subgroup. For a one-element path, omit that second selection and move the first group directly into the detail region. Retain exactly the supplied selections in the breadcrumb, hold through frame 166, then use the shared opaque exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/NestedDrilldownWindow/NestedDrilldownWindow.test.ts
```

#### DuplicateReviewStack (`duplicate-review-stack`)

- [ ] Add schema fields: `title`, `groups`, `comparisonFieldLabel`, `labels`, `finalView`, `showRecordIds`. Use the exact types, defaults and limits from catalog entry 029.
- [ ] Write and run the failing behavioral test: Only an explicitly chosen retained record closes its candidate group; unresolved groups remain open and candidate IDs are not silently discarded.
- [ ] Implement this choreography: Frames 12-42 show candidate slips separated within authored group brackets. During frames 42-100, each group aligns its comparison values along one shared ruler, making the repeated detail visible. Where a retained record is supplied, the other slips fold into an offset stack behind it while their ID tabs remain available; an unresolved group stays open. Hold the retained record and unresolved group through frame 166, then exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/DuplicateReviewStack/DuplicateReviewStack.test.ts
```

#### QueueRelief (`queue-relief`)

- [ ] Add schema fields: `items`, `serviceSlots`, `queueLabel`, `completionLabel`, `capacityChangeLabel`, `showItemLabels`. Use the exact types, defaults and limits from catalog entry 030.
- [ ] Write and run the failing behavioral test: Closed service slots accept no items before opening; queued items enter newly open slots in original order and every completed item remains accounted for. Reject an initial configuration with no waiting items; preserve the backlog until the expansion beat.
- [ ] Implement this choreography: Frames 0..12 reveal a queue corridor and named service slots. During 12..54, every supplied item arrives and only initially open slots accept work, making the waiting line visible. Keep initial service items occupied until the capacity expansion beat so a backlog remains visible. During 54..90, the additional slots unfold from closed outlines into usable bays. During 90..138, waiting items enter those bays without changing their original order and emerge into a completed tray. Hold the emptied queue and all completed items through frame 168, then fade to the opaque ground by 179. The hero action is the release of accumulated work after capacity changes.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/QueueRelief/QueueRelief.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 06`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 07: Wait longer before retrying, Reuse the stored result, Restore a saved version, Let the buffer absorb a delay, Collect, then release a batch

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/RetryBackoff/`
- `src/stock/presets/CacheReuse/`
- `src/stock/presets/RevisionRestore/`
- `src/stock/presets/ScheduleBuffer/`
- `src/stock/presets/BatchRelease/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### RetryBackoff (`retry-backoff`)

- [ ] Add schema fields: `attempts`, `operationLabel`, `outcomeLabels`, `delayUnit`, `showDelayValues`, `showAttemptLabels`. Use the exact types, defaults and limits from catalog entry 031.
- [ ] Write and run the failing behavioral test: Waiting brackets are proportional to supplied delays; the last attempt's declared outcome alone determines completion or stop, and no extra attempt appears. Reject fewer than three attempts and equal or decreasing nonfinal delays.
- [ ] Implement this choreography: Frames 12..36 introduce the operation token and its first attempt marker. The token makes a short out-and-back trip for each retry outcome, then traverses a visibly wider waiting bracket before the next attempt. Bracket widths are proportional to the authored delay values, while the full action is compressed into frames 36..140. At the final marker, the token either docks in a completed socket or rests against a stop cap. Hold the final outcome and the complete chain of attempts through frame 168, then fade to ground. The growing gaps, not repeated flashes, explain the backoff.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/RetryBackoff/RetryBackoff.test.ts
```

#### CacheReuse (`cache-reuse`)

- [ ] Add schema fields: `request`, `result`, `systemLabels`, `pathLabels`, `showStoredValue`, `showPathLabels`. Use the exact types, defaults and limits from catalog entry 032.
- [ ] Write and run the failing behavioral test: The first miss activates the origin and stores the result; the repeated matching request uses only the cache route and returns the same result. Source-derived variant: Keep the existing exact-key miss-to-hit contract. When captions describe a resident or persistent tier, label that tier explicitly and never imply a source fetch on the second hit.
- [ ] Implement this choreography: Reveal a requester, a small empty cache shelf, and a distant origin after frame 12. During 24..68, a key token probes the empty shelf, continues along the longer origin route, and returns carrying the supplied result. During 68..92, an identical result impression settles on the shelf while the requester receives its response. During 102..138, the same key token returns, matches the visible shelf key, and receives the stored result along the short local route without activating the origin. Hold both the keyed cache entry and returned response through 168, then exit. The second lookup visibly uses what the first lookup stored.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CacheReuse/CacheReuse.test.ts
```

#### RevisionRestore (`revision-restore`)

- [ ] Add schema fields: `revisions`, `restoreRevisionId`, `artifactLabel`, `statusLabels`, `showVersionLabels`, `showChangedLines`, `showStorageDrawer`, `surface`. Use the exact types, defaults and limits from catalog entry 033.
- [ ] Write and run the failing behavioral test: Current contents equal the selected earlier revision after restoration while all later historical snapshots still exist; changed-line marks clear after replacement.
- [ ] Implement this choreography: Reveal the current artifact and two to four labeled saved impressions. Select the authored earlier revision, lift its impression from the optional local drawer, and align it over the current document without moving historical snapshots. Between frames 78..126 replace changed lines in place and clear their change notches. Hold the restored document and complete history through frame 167, then fade to ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/RevisionRestore/RevisionRestore.test.ts
```

#### ScheduleBuffer (`schedule-buffer`)

- [ ] Add schema fields: `tasks`, `reserveUnits`, `interruption`, `scheduleLabels`, `unitLabel`, `showValues`, `resultLabel`. Use the exact types, defaults and limits from catalog entry 034.
- [ ] Write and run the failing behavioral test: The interruption reduces reserve by exactly its duration and leaves the deadline fixed; an interruption exceeding reserve fails instead of squeezing task widths.
- [ ] Implement this choreography: During 12..44, assemble one horizontal schedule from proportionally sized task blocks followed by a hatched reserve segment and a stationary deadline pin. During 44..74, reveal the supplied interruption block immediately after its named task. During 74..118, the remaining task blocks translate together by the interruption's width and the reserve shortens by exactly that width. A contour along the schedule keeps the total endpoint aligned with the unchanged deadline pin. Hold the inserted interruption, shifted tasks, and remaining reserve through 168, then exit to the opaque ground. The viewer sees precisely where the delay was absorbed.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ScheduleBuffer/ScheduleBuffer.test.ts
```

#### BatchRelease (`batch-release`)

- [ ] Add schema fields: `batches`, `intakeLabel`, `boundaryLabel`, `destinationLabel`, `releaseLabel`, `showItemLabels`. Use the exact types, defaults and limits from catalog entry 035.
- [ ] Write and run the failing behavioral test: A batch crosses dispatch only after every member arrives; its contents and membership remain unchanged and separate batches never silently combine.
- [ ] Implement this choreography: After the entrance, item tokens arrive separately at a shallow loading cradle during 18..62. A bracket grows around the supplied group but remains open while any member is missing. At 68, the final item docks, the bracket closes into an envelope, and the supplied release caption appears. During 82..112, the envelope crosses one dispatch line with its member tokens still visible inside. If a second batch is supplied, its shorter arrival and release sequence occupies 94..146 in a second cradle. Hold the released envelopes and their exact contents through 168, then fade to ground. The transformation is many arrivals becoming one handled bundle without combining their contents.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/BatchRelease/BatchRelease.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 07`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 08: Revise through feedback, Break the work into parts, Make room for urgent work, Show the range behind the estimate, Try a change, then return

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/FeedbackRefinement/`
- `src/stock/presets/WorkDecomposition/`
- `src/stock/presets/PriorityInsertion/`
- `src/stock/presets/UncertaintyUnfold/`
- `src/stock/presets/LinkedParameterRehearsal/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### FeedbackRefinement (`feedback-refinement`)

- [ ] Add schema fields: `artifactLabel`, `rounds`, `roleLabels`, `finalLabel`, `showReviewTrail`, `showRoundLabels`. Use the exact types, defaults and limits from catalog entry 036.
- [ ] Write and run the failing behavioral test: Each return trip carries the supplied feedback and replaces draft text with the corresponding revision; the next round starts from that revision.
- [ ] Implement this choreography: Frames 12..32 establish an author station, a reviewer station, and one readable draft between them. During 32..62, the draft crosses to the reviewer and an authored feedback tab attaches to its edge. During 62..94, it returns with that tab visibly tethered to the draft, and the draft text wipes into the supplied revised wording. During 94..132, the revised draft crosses back along the same route; the feedback tab detaches into a small review trail and the closing outcome settles beside the draft. For two supplied rounds, divide frames 32..144 evenly between their paired return trips. Hold the final draft through 168, then exit. The object changes between trips rather than merely retrying the same operation.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/FeedbackRefinement/FeedbackRefinement.test.ts
```

#### WorkDecomposition (`work-decomposition`)

- [ ] Add schema fields: `parentLabel`, `workItems`, `unitLabel`, `groupingLabel`, `showEffortValues`, `partitionLayout`. Use the exact types, defaults and limits from catalog entry 037.
- [ ] Write and run the failing behavioral test: Piece areas reflect supplied effort shares and sum to the original slab; changing partition orientation preserves all shares and parent membership.
- [ ] Implement this choreography: Reveal one continuous filled slab with the parent label during 12..38. A visually distinct enclosing bracket reserves gap space from setup while the original contour remains a fixed thin reference. During 38..86, ruled cut lines travel across the slab in the chosen partition layout, dividing its area according to supplied effort weights. During 86..124, the full-area pieces separate by a small equal gap into the reserved space and their individual labels settle. The parent label remains above the grouping without changing size. Hold the complete labeled partition through 168, then fade to ground. Piece areas are conserved; separated pieces are not required to fit inside the identical original filled outline.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/WorkDecomposition/WorkDecomposition.test.ts
```

#### PriorityInsertion (`priority-insertion`)

- [ ] Add schema fields: `queue`, `incomingItem`, `insertBeforeId`, `priorityLabel`, `serviceLabel`, `showOriginalPositions`. Use the exact types, defaults and limits from catalog entry 038.
- [ ] Write and run the failing behavioral test: The incoming item occupies the supplied insertion point while the relative order of all existing queue items remains unchanged.
- [ ] Implement this choreography: During 12..38, lay an existing queue into numbered track slots, with its service end visibly marked. During 38..64, the new item arrives on a small side spur carrying the authored priority caption. During 64..108, the chosen insertion slot opens and all items from that position onward shift exactly one slot away from service as a single movement. During 108..132, the new item travels along the spur into the opening. Hold the changed queue and optional faint original-position markers through 168, then exit to ground. The new item gains precedence without scrambling the order of existing work.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PriorityInsertion/PriorityInsertion.test.ts
```

#### UncertaintyUnfold (`uncertainty-unfold`)

- [ ] Add schema fields: `estimate`, `axis`, `interval`, `reference`, `interpretation`, `showValues`, `contextLabel`. Use the exact types, defaults and limits from catalog entry 039.
- [ ] Write and run the failing behavioral test: The interval endpoints and point stay on one fixed scale, the point remains inside the interval, and an optional reference never moves to create a desired conclusion; invalid bounds fail.
- [ ] Implement this choreography: At the entrance, a supplied estimate marker stands on a fixed ruler. Two folded sleeves extend from the marker to the supplied lower and upper endpoints, exposing a patterned interval and its explicit meaning. An optional reference blade then lowers across the ruler, with its position preserved even when it crosses the interval. Hold the estimate, both endpoints, interval label and authored interpretation together before fading to the opaque ground. All movement fits six seconds and reveals supplied values rather than simulating evidence or a time trend.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/UncertaintyUnfold/UncertaintyUnfold.test.ts
```

#### LinkedParameterRehearsal (`linked-parameter-rehearsal`)

- [ ] Add schema fields: `source`, `outputs`, `phaseLabels`, `showRules`, `showBaselineMarkers`, `contextLabel`. Use the exact types, defaults and limits from catalog entry 040.
- [ ] Write and run the failing behavioral test: Every dependent value equals multiplier times the current source plus offset at all sampled frames; zero-multiplier outputs stay fixed and returning to baseline restores exact initial values. Require both a dependent output and an independent output with multiplier zero.
- [ ] Implement this choreography: A source slider and two to four output rulers appear at their baseline positions. Visible mechanical couplings connect only outputs with nonzero multipliers. Over the middle two seconds the source slides to its trial setting and coupled pointers move simultaneously according to their supplied affine rules, with optional hollow baseline markers left behind. After a brief trial hold, the source slides back and every coupled pointer returns to its exact baseline. An uncoupled output stays still throughout. Hold the restored state with its authored caption, then fade to the same opaque ground within six seconds.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/LinkedParameterRehearsal/LinkedParameterRehearsal.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 08`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 09: Track monitored custody, Session dose balance, The same cohort returns, Reconnect after a missed visit, Shared place, overlapping time

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ColdChainCustody/`
- `src/stock/presets/VaccinationSessionBalance/`
- `src/stock/presets/DoseCohortReturnPaths/`
- `src/stock/presets/MissedVisitReconnect/`
- `src/stock/presets/ContactWindowOverlap/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ColdChainCustody (`cold-chain-custody`)

- [ ] Add schema fields: `stops`, `crates`, `sceneLabel`, `geographyMode`, `showMonitoring`, `showLedger`, `copy`, `showIdentityRibbon`. Use the exact types, defaults and limits from catalog entry 041.
- [ ] Write and run the failing behavioral test: Container IDs persist through every stop; missing acknowledgements, unknown seals and monitoring-review states remain separately visible after receipt and never become success markers implicitly.
- [ ] Implement this choreography: Establish one to five labeled containers and their persistent identity ribbons. Between frames 36..115 carry each container through three custody stops; attach a seal marker, monitoring tab and acknowledgement stub at each stop, keeping missing records visibly open. The same identifier stays attached through every handoff. Hold the received containers beside a checkpoint ledger at frames 116..167 before the common exit. A small globe is optional context; the local route is always schematic.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ColdChainCustody/ColdChainCustody.test.ts
```

#### VaccinationSessionBalance (`vaccination-session-balance`)

- [ ] Add schema fields: `units`, `recipients`, `sceneLabel`, `showPeopleTotal`, `showEquation`, `copy`. Use the exact types, defaults and limits from catalog entry 042.
- [ ] Write and run the failing behavioral test: Used, remaining and lost dose tokens sum exactly to starting units; people counts remain distinct from doses and no person appears for an unused dose. Reject administered units without a recipient ID and non-administered units with a recipient ID.
- [ ] Implement this choreography: Open a carrier containing the supplied discrete dose tokens. Move each token exactly once to the authored used, remaining or recorded-loss destination; only used tokens settle beside recipient silhouettes. Hold every destination simultaneously with a derived conservation equation and a separate people total, then fade to the unchanged ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/VaccinationSessionBalance/VaccinationSessionBalance.test.ts
```

#### DoseCohortReturnPaths (`dose-cohort-return-paths`)

- [ ] Add schema fields: `visits`, `participants`, `sceneLabel`, `emphasis`, `showFractions`, `copy`. Use the exact types, defaults and limits from catalog entry 043.
- [ ] Write and run the failing behavioral test: Every visit uses the same cohort denominator; recorded, missed, not-yet-due and unknown states remain distinct and changing one visit never creates a new person.
- [ ] Implement this choreography: Introduce the supplied cohort at the first visit arch. Slide later visit arches across the same identity lanes: a person enters an arch only when that visit is recorded, while missed, not-yet-due and unknown marks remain distinct. Hold the attendance fabric with separate visit numerators over one fixed cohort denominator before the opaque exit.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/DoseCohortReturnPaths/DoseCohortReturnPaths.test.ts
```

#### MissedVisitReconnect (`missed-visit-reconnect`)

- [ ] Add schema fields: `cases`, `places`, `sceneLabel`, `showAttemptCount`, `showOutcomeLedger`, `copy`. Use the exact types, defaults and limits from catalog entry 044.
- [ ] Write and run the failing behavioral test: Contact and booking do not move a person through the clinic door; only the authored attended outcome does, and all original cases retain a final state.
- [ ] Implement this choreography: Frames 12..38 show four silhouettes with empty appointment marks beside their homes. Frames 39..114 animate one worker making the authored phone or doorstep contacts; a booking tab folds onto a calendar for one person, while only a documented attendee walks back through the clinic door. Frames 115..167 hold everyone in a distinct final state with the original group total; fade to ground by frame 179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/MissedVisitReconnect/MissedVisitReconnect.test.ts
```

#### ContactWindowOverlap (`contact-window-overlap`)

- [ ] Add schema fields: `records`, `investigationWindow`, `axis`, `sceneLabel`, `showOverlapFractions`, `copy`. Use the exact types, defaults and limits from catalog entry 045.
- [ ] Write and run the failing behavioral test: Only actual interval intersections with the investigation window are highlighted; touching nonoverlapping intervals and unknown records do not become confirmed contacts.
- [ ] Implement this choreography: Reveal the shared place above the supplied person-specific time ribbons. Position the authored intervals on one axis and lower the investigation-window stencil over them; outline only actual interval intersections. Hold overlapping, nonoverlapping and unknown records alongside the same people, then fade. The intersection represents a review candidate, not a confirmed transmission.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ContactWindowOverlap/ContactWindowOverlap.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 09`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 10: One sample, several aliquots, Close the referral loop, Visits are not unique reach, Bring the service closer, A world of separate crises

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/SpecimenAliquotBalance/`
- `src/stock/presets/ReferralReturnAcknowledgement/`
- `src/stock/presets/OutreachHouseholdRevisits/`
- `src/stock/presets/MobileClinicRelocation/`
- `src/stock/presets/FictionalConflictGlobe/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### SpecimenAliquotBalance (`specimen-aliquot-balance`)

- [ ] Add schema fields: `parent`, `aliquots`, `unitLabel`, `sceneLabel`, `showLineage`, `showEquation`, `copy`. Use the exact types, defaults and limits from catalog entry 046.
- [ ] Write and run the failing behavioral test: Parent remainder plus child aliquot volumes equals original volume, and every child retains its parent reference; oversubscribed volume fails validation.
- [ ] Implement this choreography: Reveal the parent sample tube with its supplied volume. Move only the authored aliquot volumes into their child tubes while identity tethers retain the parent relationship; the parent level falls by the transferred amount. Hold the remaining parent volume plus all child volumes beside a derived equality and a separate specimen-family count, then fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SpecimenAliquotBalance/SpecimenAliquotBalance.test.ts
```

#### ReferralReturnAcknowledgement (`referral-return-acknowledgement`)

- [ ] Add schema fields: `referrals`, `services`, `sceneLabel`, `emphasis`, `showLedger`, `copy`. Use the exact types, defaults and limits from catalog entry 047.
- [ ] Write and run the failing behavioral test: Attendance alone does not close the loop; only the supplied return acknowledgement reaches the referring service, with waiting cases retained separately.
- [ ] Implement this choreography: Frames 12..40 reveal the referring clinic with three people and three matching referral slips. Frames 41..113 let only attended people cross to the receiving service, then send a returned acknowledgement slip back for only the supplied completed loop. Frames 114..167 hold one returned loop, one attended-but-unacknowledged case, and one waiting case in their physical locations; fade to ground by frame 179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ReferralReturnAcknowledgement/ReferralReturnAcknowledgement.test.ts
```

#### OutreachHouseholdRevisits (`outreach-household-revisits`)

- [ ] Add schema fields: `households`, `visits`, `sceneLabel`, `showVisitStamps`, `showUniqueLedger`, `copy`. Use the exact types, defaults and limits from catalog entry 048.
- [ ] Write and run the failing behavioral test: A repeat visit adds an event stamp but does not increase unique households reached; unsuccessful contacts remain distinct from successful household reach.
- [ ] Implement this choreography: Reveal the supplied homes on a schematic neighborhood map. Move a worker through the authored visit sequence and leave event stamps at each stop. On repeat visits, add an activity stamp without changing the household's unique-reach outline. Hold contacted, not-contacted and unvisited households beside distinct event and unique-contact totals before fading.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/OutreachHouseholdRevisits/OutreachHouseholdRevisits.test.ts
```

#### MobileClinicRelocation (`mobile-clinic-relocation`)

- [ ] Add schema fields: `sites`, `slots`, `people`, `sceneLabel`, `showSlotLedger`, `view`, `copy`. Use the exact types, defaults and limits from catalog entry 049.
- [ ] Write and run the failing behavioral test: The same clinic travels between sites; each supplied appointment slot is assigned at most once and unmatched people remain visible without invented bookings.
- [ ] Implement this choreography: Frames 12..40 show a mobile clinic parked at the first site, nearby people, and its finite appointment-slot strip. Frames 41..113 fold the clinic awning, drive the same vehicle along a schematic road, and reopen it at the second site; assigned people connect to distinct slot tabs while unmatched people remain in place. Frames 114..167 hold both the person-booking ledger and slot-capacity ledger together; fade to ground by frame 179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/MobileClinicRelocation/MobileClinicRelocation.test.ts
```

#### FictionalConflictGlobe (`fictional-conflict-globe`)

- [ ] Add schema fields: `incidents`, `longitudeSweep`, `markerMeaning`, `scenarioCaption`, `showLabels`, `showGraticule`. Use the exact types, defaults and limits from catalog entry 050.
- [ ] Write and run the failing behavioral test: Markers behind the sphere are hidden, markers on the front project to their supplied coordinates, and X counts change only with supplied incidents, not globe rotation.
- [ ] Implement this choreography: Over six seconds, reveal an orthographic globe with simplified but recognizable continental outlines. Rotate through the supplied longitude interval, revealing each X only while its surface location faces the viewer; leader lines connect it to a fixed outside label slot. Ease the rotation to a stop, hold the visible markers and their scenario labels, then fade all scene elements to the opaque ground using the shared entrance and exit envelope. Keep the fictional-scenario caption visible with the globe, and never animate explosions, spreading red territory, or a conflict disappearing.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/FictionalConflictGlobe/FictionalConflictGlobe.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 10`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 11: Keep the delivery moving, One load, several carriers, Choose and count the handover, Pool support, preserve its purpose, A household chooses its basket

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ConvoyRouteDetour/`
- `src/stock/presets/AidCargoModeHandoff/`
- `src/stock/presets/RecipientConfirmedHandover/`
- `src/stock/presets/PooledDonorAllocation/`
- `src/stock/presets/HouseholdMarketChoice/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ConvoyRouteDetour (`convoy-route-detour`)

- [ ] Add schema fields: `locations`, `routes`, `obstruction`, `vehicle`, `scenarioCaption`, `showRouteLabels`. Use the exact types, defaults and limits from catalog entry 051.
- [ ] Write and run the failing behavioral test: The vehicle stops before the blocked segment and uses the authored detour; the obstruction remains visible after arrival and the vehicle never traverses the closed edge.
- [ ] Implement this choreography: Reveal a depot, destination, and two roads within six seconds. The vehicle rolls toward the blocked segment, brakes before the barrier, then pivots at the preceding junction as the alternative route gains emphasis. The vehicle follows that authored detour to the destination, where the receiving team opens the gate; hold both the still-blocked road and the arrived vehicle before the shared opaque exit fade. Do not erase the obstruction or imply that a route was automatically verified.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ConvoyRouteDetour/ConvoyRouteDetour.test.ts
```

#### AidCargoModeHandoff (`aid-cargo-mode-handoff`)

- [ ] Add schema fields: `carriers`, `parcels`, `transferMethod`, `receivingLabel`, `showParcelLabels`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 052.
- [ ] Write and run the failing behavioral test: The exact parcel identities and counts survive every carrier transfer; a parcel occupies one carrier or transfer mechanism at a time without duplication.
- [ ] Implement this choreography: Within six seconds, reveal a boat or truck carrying the supplied parcels at the first transfer point. Animate one restrained unload-and-load motion per boundary: a dock hoist or handcart moves those exact parcels onto the next carrier, then the carrier advances into the next part of the cutaway landscape. End with the final carrier and its intact load at the named receiving point. Keep a persistent parcel identity mark through every handoff, hold the result, and use the shared entrance and opaque exit envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/AidCargoModeHandoff/AidCargoModeHandoff.test.ts
```

#### RecipientConfirmedHandover (`recipient-confirmed-handover`)

- [ ] Add schema fields: `contents`, `participantLabels`, `receiptLabels`, `acknowledgementMark`, `initialsText`, `showQuantityList`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 053.
- [ ] Write and run the failing behavioral test: The basket and receipt equal the recipient's selected quantities; unselected goods remain on the table and no acknowledgement changes quantities.
- [ ] Implement this choreography: Within six seconds, reveal offered goods on a delivery table and the household representative indicating their configured selections. They pull exactly the selected units across a counting mat into their basket, one visible object per unit; untouched quantities stay on the delivery side. The chosen-quantity rows on a receipt fill from those actual movements, then the recipient acknowledges that specific list and keeps one copy. Hold the counted basket, retained goods, and receipt together before the shared opaque exit fade. The physical choice and counting occupy most of the shot; acknowledgement is only the final beat.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/RecipientConfirmedHandover/RecipientConfirmedHandover.test.ts
```

#### PooledDonorAllocation (`pooled-donor-allocation`)

- [ ] Add schema fields: `requests`, `contributions`, `allocations`, `labels`, `showAllocationTotals`, `envelopeArrangement`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 054.
- [ ] Write and run the failing behavioral test: Every allocated token preserves donor attribution and obeys its earmark; allocations plus residual funds equal contributions and overspending fails.
- [ ] Implement this choreography: Over six seconds, contributors tip small stacks of individually marked demo-credit tokens into a transparent shared tray. Earmarked tokens retain their destination ribbon; flexible tokens retain a distinct flexible marker. A community coordinator slides the configured tokens into labeled funding-request envelopes, preserving donor marks and respecting every earmark, while any unallocated tokens stay in the tray. Set each funded envelope upright with contributor marks visible above its edge, and hold the allocation totals alongside the remaining pool without transforming money into goods before the shared opaque exit fade. No token changes value, duplicates, or loses attribution.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PooledDonorAllocation/PooledDonorAllocation.test.ts
```

#### HouseholdMarketChoice (`household-market-choice`)

- [ ] Add schema fields: `products`, `availableCredits`, `tender`, `labels`, `showRemainingBalance`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 055.
- [ ] Write and run the failing behavioral test: Only chosen products enter the household basket; their summed prices reduce the available credits exactly, and unaffordable selections fail.
- [ ] Implement this choreography: Reveal a shelf of configurable products and a shopper holding the chosen tender within six seconds. The shopper considers the shelf, reaches only for products marked chosen, and places those items into their own basket while the other options stay available. At the counter, move the cash or voucher to the retailer and show the exact selected-price sum, with any remaining demo credits retained by the shopper. Hold the chosen basket, then use the shared opaque exit fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/HouseholdMarketChoice/HouseholdMarketChoice.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 11`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 12: Keep the shelf supplied, Open the service someone chooses, Meet by mutual agreement, Rebalance a shared response, Account for captured carbon

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/RetailShelfReplenishment/`
- `src/stock/presets/ChosenServiceAccess/`
- `src/stock/presets/VoluntaryFamilyReunion/`
- `src/stock/presets/CommunityCoordinationTable/`
- `src/stock/presets/CarbonStorageAccounting/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### RetailShelfReplenishment (`retail-shelf-replenishment`)

- [ ] Add schema fields: `goods`, `labels`, `deliveryMode`, `showQuantityLabels`, `showOrderSlip`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 056.
- [ ] Write and run the failing behavioral test: Closing stock equals opening plus incoming minus purchases for every product; the shelf and basket display those exact quantities.
- [ ] Implement this choreography: Over six seconds, reveal the supplied opening stock as individual objects on a cutaway shelf. The retailer points to the empty spaces and places an order slip on the counter; a small delivery trolley arrives with exactly the incoming objects, which the retailer places into those spaces. A shopper then selects the authored purchase quantity while the remaining stock stays visible. Hold the final shelf and basket, with opening plus incoming minus selected quantities conserved, then fade to the opaque ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/RetailShelfReplenishment/RetailShelfReplenishment.test.ts
```

#### ChosenServiceAccess (`chosen-service-access`)

- [ ] Add schema fields: `services`, `chosenServiceId`, `accessChange`, `participantMobility`, `labels`, `showChoiceLabel`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 057.
- [ ] Write and run the failing behavioral test: Only the selected service's authored barrier changes; the participant follows the opened path and other available services retain their state.
- [ ] Implement this choreography: Within six seconds, reveal two or three modest service entrances and a participant considering their labels. The participant points to the configured choice. At that entrance, either unfold a ramp over the step or roll a physical obstruction clear, according to the supplied access change; the staff member holds the door while the participant moves under their own power through it. Keep the other service options visible, hold the selected doorway and cleared path, then apply the shared opaque exit fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ChosenServiceAccess/ChosenServiceAccess.test.ts
```

#### VoluntaryFamilyReunion (`voluntary-family-reunion`)

- [ ] Add schema fields: `groups`, `meetingLabel`, `invitationLabels`, `greeting`, `showMemberLabels`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 058.
- [ ] Write and run the failing behavioral test: Groups move only after both invitations are accepted, and every member remains a distinct silhouette through the meeting and final greeting.
- [ ] Implement this choreography: Over six seconds, reveal the two groups on opposite sides of a schematic local setting, each holding their own invitation. Each group actively marks its invitation accepted; only after both marks appear do the groups begin walking toward the chosen meeting place. They arrive, turn toward each other, and make the configured greeting gesture without merging their silhouettes. Hold the gathering and the two accepted invitations, then fade with the standard opaque envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/VoluntaryFamilyReunion/VoluntaryFamilyReunion.test.ts
```

#### CommunityCoordinationTable (`community-coordination-table`)

- [ ] Add schema fields: `places`, `teams`, `communityLabel`, `planLabels`, `showUnassignedRequests`, `markerStyle`, `scenarioCaption`. Use the exact types, defaults and limits from catalog entry 059.
- [ ] Write and run the failing behavioral test: Only supplied reassignments move team markers; all final teams reference valid places and unanswered community requests remain visible when requested.
- [ ] Implement this choreography: Within six seconds, reveal a tabletop map with authored community requests and team markers at their starting assignments. Where two team markers overlap, the community representative points to the requested destination; the reassigned team lifts its own marker and places it at that destination. Turn the relevant request tags face-up to show the configured final assignments, then hold the full plan with all remaining requests still visible. Use the shared opaque entrance and exit envelope, and avoid turning the whole map green.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CommunityCoordinationTable/CommunityCoordinationTable.test.ts
```

#### CarbonStorageAccounting (`carbon-storage-accounting`)

- [ ] Add schema fields: `capture`, `operatingEmissions`, `boundary`, `decision`, `showNetAccounting`, `view`, `copy`. Use the exact types, defaults and limits from catalog entry 060.
- [ ] Write and run the failing behavioral test: Retained carbon equals captured minus released carbon; net removal subtracts separately supplied operating emissions with compatible units, and negative net values remain negative rather than clipped.
- [ ] Implement this choreography: Reveal an air boundary, capture unit and underground vessel. At the operator cue, divide the supplied captured-carbon ribbon into retained and released portions while a separate operating-emissions ribbon enters the accounting bracket. Hold the explicit retained-minus-operating-emissions calculation, including a negative result when supplied, then fade to the shared opaque ground without emptying the store on screen.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CarbonStorageAccounting/CarbonStorageAccounting.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 12`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 13: Pack work, release capacity, Hold water, show the spill, Place shade where people wait, Keep sediment within the slope, Recover parts, account for residue

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ComputeCapacityConsolidation/`
- `src/stock/presets/StormwaterStorageSpill/`
- `src/stock/presets/StreetShadeInstallation/`
- `src/stock/presets/ContourSedimentRetention/`
- `src/stock/presets/ComponentMaterialReturn/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ComputeCapacityConsolidation (`compute-capacity-consolidation`)

- [ ] Add schema fields: `hosts`, `jobs`, `windowLabel`, `decision`, `emptyHostState`, `showCapacityGuides`, `copy`. Use the exact types, defaults and limits from catalog entry 061.
- [ ] Write and run the failing behavioral test: Every job preserves its work quantity and runs within host capacity; only truly empty hosts enter the chosen idle state and no energy/emissions savings are inferred from CPU-hours.
- [ ] Implement this choreography: Reveal host bays holding the supplied work blocks. After the scheduler cue, slide intact blocks into the authored available capacity on retained hosts; emptied hosts fold into the chosen idle-state outline. Hold unchanged total work beside occupied and empty host counts derived from the inputs, then fade to ground. Workload consolidation does not invent measured energy savings.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ComputeCapacityConsolidation/ComputeCapacityConsolidation.test.ts
```

#### StormwaterStorageSpill (`stormwater-storage-spill`)

- [ ] Add schema fields: `event`, `detentionCapacityM3`, `boundary`, `decision`, `overflowSide`, `showBalance`, `copy`. Use the exact types, defaults and limits from catalog entry 062.
- [ ] Write and run the failing behavioral test: Infiltration, controlled discharge, detention and overflow sum to inflow; detention never exceeds capacity and excess remains visible as overflow.
- [ ] Implement this choreography: Reveal a schematic street and basin with a marked storage lip. At the operator cue, the supplied inflow divides into infiltration, controlled outflow and detention compartments. Once detention reaches its capacity, the remaining water crosses a distinct overflow crest. Hold all destinations with an explicit conserved-volume equation before fading.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/StormwaterStorageSpill/StormwaterStorageSpill.test.ts
```

#### StreetShadeInstallation (`street-shade-installation`)

- [ ] Add schema fields: `zones`, `installations`, `referenceCondition`, `decision`, `showAreaBalance`, `copy`. Use the exact types, defaults and limits from catalog entry 063.
- [ ] Write and run the failing behavioral test: Added nonoverlapping shade plus existing shade never exceeds each zone area; the total shaded denominator remains the full supplied street area.
- [ ] Implement this choreography: Reveal the supplied street zones with their existing shade footprints. At the installation cue, extend awnings or open canopy footprints over the authored nonoverlapping additions. Hold total shaded area against the complete zone area at the supplied reference condition, retaining the unshaded ground, then fade without implying a measured temperature reduction.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/StreetShadeInstallation/StreetShadeInstallation.test.ts
```

#### ContourSedimentRetention (`contour-sediment-retention`)

- [ ] Add schema fields: `sediment`, `intervention`, `boundary`, `decision`, `showExportTray`, `copy`. Use the exact types, defaults and limits from catalog entry 064.
- [ ] Write and run the failing behavioral test: Retained sediment plus exported sediment equals the incoming mass; changing the intervention representation does not change supplied outcome quantities.
- [ ] Implement this choreography: Reveal a bare schematic slope and its outlet boundary. A land steward places the selected contour treatment, then the supplied sediment ribbon moves downslope and separates into retained material behind the strip and export beyond the boundary. Hold both destinations against their common incoming mass, then fade rather than reversing erosion.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ContourSedimentRetention/ContourSedimentRetention.test.ts
```

#### ComponentMaterialReturn (`component-material-return`)

- [ ] Add schema fields: `parts`, `replacementInputs`, `decision`, `assemblyShape`, `showMassEquation`, `copy`. Use the exact types, defaults and limits from catalog entry 065.
- [ ] Write and run the failing behavioral test: Original component mass plus replacement inputs equals assembled mass plus recycling plus residue; each component goes to exactly its declared destination.
- [ ] Implement this choreography: Reveal the returned assembly within its stated material boundary. An operator separates its labeled parts into their supplied reuse, repair, recycling and residue destinations. Separately labeled replacement inputs join the recovered parts in the new assembly. Hold the new assembly, recycling and residue with an input-output mass equation, then fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ComponentMaterialReturn/ComponentMaterialReturn.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 13`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 14: Store energy, deliver less, Keep gaps visible in the evidence, Budget the water below ground, Build a route between habitats, The same classroom, different days

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/BatteryDispatchBalance/`
- `src/stock/presets/EnvironmentalObservationGaps/`
- `src/stock/presets/AquiferAllocationBalance/`
- `src/stock/presets/HabitatCorridorReconnection/`
- `src/stock/presets/ClassroomDayPresence/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### BatteryDispatchBalance (`battery-dispatch-balance`)

- [ ] Add schema fields: `battery`, `cycle`, `windows`, `decision`, `showLossChannels`, `orientation`, `copy`. Use the exact types, defaults and limits from catalog entry 066.
- [ ] Write and run the failing behavioral test: Charge input equals delivered energy plus charge/discharge losses and storage change; capacity and efficiency bounds reject impossible cycles.
- [ ] Implement this choreography: Reveal the battery between authored charging and delivery windows. Charging input enters the boundary, a distinct loss channel peels away, and the remaining energy fills storage. At the dispatch cue, delivered energy reaches the later load while discharge losses enter their own channel. Hold input, delivery, losses and final storage together with a conserved-energy equation before fading.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/BatteryDispatchBalance/BatteryDispatchBalance.test.ts
```

#### EnvironmentalObservationGaps (`environmental-observation-gaps`)

- [ ] Add schema fields: `cells`, `metric`, `fieldChecks`, `decision`, `context`, `showCoverageTotals`, `copy`. Use the exact types, defaults and limits from catalog entry 067.
- [ ] Write and run the failing behavioral test: Unknown cells retain a missing-data hatch; adding a point field check does not silently fill the entire cell or count its whole area as observed.
- [ ] Implement this choreography: Reveal the globe as geographic context, then unfold a detached schematic observation tile. A cloud layer lifts to reveal supplied cell readings while missing cells retain their hatch. A field team places the supplied point checks without replacing any whole-cell missing value. Hold the distinction between point sampling and area coverage, then fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/EnvironmentalObservationGaps/EnvironmentalObservationGaps.test.ts
```

#### AquiferAllocationBalance (`aquifer-allocation-balance`)

- [ ] Add schema fields: `aquifer`, `flows`, `boundary`, `decision`, `showUnallocatedRequest`, `copy`. Use the exact types, defaults and limits from catalog entry 068.
- [ ] Write and run the failing behavioral test: Final storage equals initial storage plus recharge minus withdrawals and natural outflow; unmet request remains visible and withdrawals cannot exceed available water.
- [ ] Implement this choreography: Reveal a schematic aquifer at its supplied initial storage and the requested withdrawal beside it. A planner sets the authored approved withdrawal; show recharge entering while pumping and natural outflow leave through distinct paths. Hold the derived remaining storage and any unmet portion of the request, then fade without refilling the aquifer.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/AquiferAllocationBalance/AquiferAllocationBalance.test.ts
```

#### HabitatCorridorReconnection (`habitat-corridor-reconnection`)

- [ ] Add schema fields: `patches`, `corridor`, `landBoundaryHa`, `decision`, `showIllustrativeTraversal`, `showLandBalance`, `copy`. Use the exact types, defaults and limits from catalog entry 069.
- [ ] Write and run the failing behavioral test: Added corridor area transfers from other land within a fixed land boundary; illustrative traversal does not imply measured species use and all route gaps are actually connected.
- [ ] Implement this choreography: Reveal habitat patches separated by working land and a road. At the land-management cue, lay the authored corridor footprint across the gap and lift its crossing over the road. Transfer that footprint's area from other land to habitat within the fixed boundary. Optionally move an explicitly illustrative marker along the supplied connection, then hold the conserved land balance.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/HabitatCorridorReconnection/HabitatCorridorReconnection.test.ts
```

#### ClassroomDayPresence (`classroom-day-presence`)

- [ ] Add schema fields: `learners`, `days`, `labels`, `deskLayout`, `showDayImpressions`, `caption`. Use the exact types, defaults and limits from catalog entry 070.
- [ ] Write and run the failing behavioral test: Each day classifies the same learner roster into present, absent or unknown; totals equal roster size and an unknown day is never treated as absent.
- [ ] Implement this choreography: Reveal the supplied roster at named desks and a day label. Across the authored day changes, the same learner silhouettes occupy or vacate their own desks while absent seats keep empty outlines and unknown seats keep question markers. Preserve small day impressions beneath each desk instead of sending people through lanes. Hold the final room with present, absent, unknown and roster totals before fading.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ClassroomDayPresence/ClassroomDayPresence.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 14`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 15: Unpack the cost of attending, Return with earlier work intact, One fraction, several ways to show it, Make room for teacher learning, Bring the readers around the books

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/SchoolCostSatchel/`
- `src/stock/presets/ReturningLearnerWorktable/`
- `src/stock/presets/FractionMaterialTranslation/`
- `src/stock/presets/TeacherLearningCover/`
- `src/stock/presets/SharedReadingCircles/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### SchoolCostSatchel (`school-cost-satchel`)

- [ ] Add schema fields: `expenses`, `periodLabel`, `unitLabel`, `sceneLabels`, `showExpenseShares`, `unpackOrder`, `caption`. Use the exact types, defaults and limits from catalog entry 071.
- [ ] Write and run the failing behavioral test: The total equals every supplied expense in the same unit and period; shares use that total and no hidden recurring cost is multiplied without an authored frequency.
- [ ] Implement this choreography: Begin with a learner beside an open school doorway carrying a closed satchel. Open the bag and unfold exactly the object kinds supplied in the expense array, ordered by unpackOrder onto a small ground cloth. Each object reveals its authored amount; a bracket gathers their amounts into a clearly labeled total for the stated period. Hold the objects, period, and total together, then close the scene through the shared exit envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SchoolCostSatchel/SchoolCostSatchel.test.ts
```

#### ReturningLearnerWorktable (`returning-learner-worktable`)

- [ ] Add schema fields: `people`, `periodLabels`, `priorWork`, `returnActivities`, `activityLabels`, `showPortfolioTrail`, `caption`. Use the exact types, defaults and limits from catalog entry 072.
- [ ] Write and run the failing behavioral test: Previously supplied work survives the interruption and return; the added review/new activity does not overwrite that portfolio or imply measured attainment.
- [ ] Implement this choreography: Reveal one learner at a classroom desk with the supplied prior-work samples, preserving their authored forms and marks without grading them. Move the learner and the same portfolio to a side table while the interruption-period label appears. Bring the learner back to the desk, where the teacher places exactly the supplied return activities. Link each review activity to its referenced prior work and show each new activity without inventing a prior artifact. Hold the original work and supplied activities together, then fade out.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ReturningLearnerWorktable/ReturningLearnerWorktable.test.ts
```

#### FractionMaterialTranslation (`fraction-material-translation`)

- [ ] Add schema fields: `fraction`, `representations`, `lessonLabel`, `showFractionNotation`, `resolvedArrangement`, `caption`. Use the exact types, defaults and limits from catalog entry 073.
- [ ] Write and run the failing behavioral test: Every physical representation selects exactly the same numerator from the same denominator; changing a representation never changes the fraction.
- [ ] Implement this choreography: Reveal one learner and work surface per supplied representation facing a shared fraction prompt. Animate only the chosen materials: folded paper divides into equal parts, counters gather into equal units, and shaded-board cells select their authored fraction. Every representation selects the same numerator out of the same denominator. Briefly align corresponding selected parts without merging or ranking learners. Hold the supplied representations and common fraction, then use the shared fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/FractionMaterialTranslation/FractionMaterialTranslation.test.ts
```

#### TeacherLearningCover (`teacher-learning-cover`)

- [ ] Add schema fields: `staff`, `learners`, `session`, `roomLabels`, `phaseLabels`, `showClassroomResponsibility`, `caption`. Use the exact types, defaults and limits from catalog entry 074.
- [ ] Write and run the failing behavioral test: The covering colleague is in the classroom before the teacher leaves and remains until the teacher returns; learner count stays constant.
- [ ] Implement this choreography: Open on one teacher and a fixed group of learners in a classroom with a small adjacent planning alcove. A covering colleague arrives before the teacher moves to the mentor; the two adults rehearse a prompt with a small teaching board while the colleague stays with the class. Return the teacher before the colleague leaves. Hold the class and the retained prompt together, then fade out.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/TeacherLearningCover/TeacherLearningCover.test.ts
```

#### SharedReadingCircles (`shared-reading-circles`)

- [ ] Add schema fields: `learners`, `books`, `readingGroups`, `startingShelf`, `labels`, `showGroupCounts`, `caption`. Use the exact types, defaults and limits from catalog entry 075.
- [ ] Write and run the failing behavioral test: Each book is assigned once, each learner belongs to one supplied reading group, and the final shelf/table inventory equals the initial books.
- [ ] Implement this choreography: Reveal the supplied books on a shelf and the learners at separate seats. Carry each book to its assigned shared table as seats pivot into the authored reading circles, preserving every learner identity. Open the books and turn one page within each circle. Hold reader counts against the class roster with the book inventory unchanged, then fade.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SharedReadingCircles/SharedReadingCircles.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 15`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 16: What reaches the lunch table, Make space in the same classroom, Try the learned action in a new setting, Predict together, then observe, Count where the layers meet

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/SchoolLunchTrayComposition/`
- `src/stock/presets/ClassroomAccessRearrangement/`
- `src/stock/presets/PracticeToWorkSample/`
- `src/stock/presets/SharedExperimentPredictions/`
- `src/stock/presets/GisLayerIntersectionTally/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### SchoolLunchTrayComposition (`school-lunch-tray-composition`)

- [ ] Add schema fields: `learners`, `plannedComponents`, `trays`, `labels`, `showComponentNames`, `emphasizeMissingComponents`, `caption`. Use the exact types, defaults and limits from catalog entry 076.
- [ ] Write and run the failing behavioral test: Only supplied served components fill tray compartments; the complete-plan numerator counts trays with all planned components over all planned trays without assigning blame to learners.
- [ ] Implement this choreography: Reveal the supplied learners at a lunch table with their outlined planned trays. Serving utensils place only the authored components into the matching compartments; missing planned components retain their outlines. Bring trays to their places and hold the complete-plan numerator against every planned tray without marking a learner as deficient. Fade through the shared opaque ground.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SchoolLunchTrayComposition/SchoolLunchTrayComposition.test.ts
```

#### ClassroomAccessRearrangement (`classroom-access-rearrangement`)

- [ ] Add schema fields: `learners`, `adaptations`, `activity`, `resolvedLayout`, `showApproachTrace`, `phaseLabels`, `caption`. Use the exact types, defaults and limits from catalog entry 077.
- [ ] Write and run the failing behavioral test: The same learners join the common activity after furniture and surface adaptations; no person disappears or moves into a separate excluded zone.
- [ ] Implement this choreography: Reveal a crowded row arrangement with the same learners waiting at its edge. Pull desks apart to make a clear schematic approach, rotate the shared table toward the group, and reveal the selected teaching-surface adaptations. Move every learner into the common activity space; retain the selected access cues during the hold. Do not transform bodies or separate one learner into a distant special zone. Fade out.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ClassroomAccessRearrangement/ClassroomAccessRearrangement.test.ts
```

#### PracticeToWorkSample (`practice-to-work-sample`)

- [ ] Add schema fields: `learnerLabel`, `settingLabels`, `task`, `workpieces`, `showAlignmentGuides`, `showFirstArtifactAtHold`, `caption`. Use the exact types, defaults and limits from catalog entry 078.
- [ ] Write and run the failing behavioral test: The same supplied measurement appears in both practice and work artifacts; transferring the setting does not imply qualification or change the measured value.
- [ ] Implement this choreography: Show one learner using a ruler to place a labeled measurement on a practice sheet at a classroom desk. Slide the surrounding furniture into a simple workshop arrangement while retaining the learner and the first marked sheet at the side. Repeat the same ruler placement and marking gesture on the chosen work material, then hold the two measured artifacts together. Fade to the shared background.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PracticeToWorkSample/PracticeToWorkSample.test.ts
```

#### SharedExperimentPredictions (`shared-experiment-predictions`)

- [ ] Add schema fields: `learners`, `observationDistance`, `track`, `labels`, `showDistanceDifferences`, `showPredictionValues`, `caption`. Use the exact types, defaults and limits from catalog entry 079.
- [ ] Write and run the failing behavioral test: All predictions appear before the observation and remain afterward; the ball stops at the supplied observed position without moving a prediction to match it.
- [ ] Implement this choreography: Reveal a tabletop ramp and a labeled distance track with the supplied learners around it. Each learner places a distinct labeled prediction flag before a single ball is released. The ball travels to the supplied observation position and stops; retain every prediction without scoring or ranking learners. Hold the observed marker and predicted positions together, then fade out before resetting.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SharedExperimentPredictions/SharedExperimentPredictions.test.ts
```

#### GisLayerIntersectionTally (`gis-layer-intersection-tally`)

- [ ] Add schema fields: `layers`, `households`, `operation`, `measure`, `copy`, `showLayerOutlines`. Use the exact types, defaults and limits from catalog entry 080.
- [ ] Write and run the failing behavioral test: For the default geometry, intersection selects one household and three members out of four households and eight members. Difference selects Home A only. Changing the measure changes counts without changing selected identities.
- [ ] Implement this choreography: Begin with offset translucent map sheets and stationary household markers. Register the sheets, hatch the resulting geometry, then lift only qualifying markers into a counting bracket while retaining their map positions. Hold the selected quantity over the full supplied denominator.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/GisLayerIntersectionTally/GisLayerIntersectionTally.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 16`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 17: Coverage without counting twice, Locate the cluster in time, Choose sites across the whole frame, Leave room around the site, Put the denominator on the map

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/CatchmentUnionGaps/`
- `src/stock/presets/ClusterEpicurveLink/`
- `src/stock/presets/StratifiedSpatialSample/`
- `src/stock/presets/ParcelSetbackInset/`
- `src/stock/presets/PopulationNormalizedMap/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### CatchmentUnionGaps (`catchment-union-gaps`)

- [ ] Add schema fields: `catchments`, `households`, `measure`, `gapEmphasis`, `copy`, `showOriginalOutlines`. Use the exact types, defaults and limits from catalog entry 081.
- [ ] Write and run the failing behavioral test: The default union covers three of four homes and six of eight members, counting the overlapping home once. Removing a catchment recomputes the union and gaps without duplicating or deleting household records.
- [ ] Implement this choreography: Draw the separate catchment outlines around stationary homes. Where catchments overlap, peel away the second tint and fuse the outer boundary. Finish with covered homes enclosed and uncovered homes ringed, alongside one unique covered share.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CatchmentUnionGaps/CatchmentUnionGaps.test.ts
```

#### ClusterEpicurveLink (`cluster-epicurve-link`)

- [ ] Add schema fields: `cases`, `timeBins`, `investigationCaseIds`, `focusedBinId`, `copy`, `showIdentityGuides`. Use the exact types, defaults and limits from catalog entry 082.
- [ ] Write and run the failing behavioral test: The default investigation group contains three cases, including one unknown onset. Each case maps to exactly one histogram bin or the unknown compartment. Focusing a time bin highlights precisely its case IDs on the map.
- [ ] Implement this choreography: Begin with all case pins and a complete histogram. An authored group receives a map bracket; thin identity guides lift its highlighted tokens into the corresponding histogram segments. A chosen time bin then outlines its matching map pins. Hold both views with selected and total case counts.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ClusterEpicurveLink/ClusterEpicurveLink.test.ts
```

#### StratifiedSpatialSample (`stratified-spatial-sample`)

- [ ] Add schema fields: `strata`, `sites`, `selectedSiteIds`, `copy`, `showUnselectedLabels`. Use the exact types, defaults and limits from catalog entry 083.
- [ ] Write and run the failing behavioral test: Default selected/eligible fractions are one of three in the west and one of two in the east. An authored empty selection in one stratum leaves its denominator and unsampled markers visible. Reject sites outside their referenced stratum.
- [ ] Implement this choreography: Open on a complete field of eligible site markers. Thin boundaries divide the frame into supplied strata, then selected markers rise onto short sampling stems without leaving their coordinates. Hold each stratum's selected count over its eligible-site denominator.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/StratifiedSpatialSample/StratifiedSpatialSample.test.ts
```

#### ParcelSetbackInset (`parcel-setback-inset`)

- [ ] Add schema fields: `parcels`, `setback`, `structure`, `placement`, `copy`, `showDimensions`. Use the exact types, defaults and limits from catalog entry 084.
- [ ] Write and run the failing behavioral test: Inset every rectangular side by the supplied clearance. Default envelopes are 27 by 52 units. Reject a structure footprint extending beyond its chosen envelope; exhausted unchosen envelopes remain empty, never negative.
- [ ] Implement this choreography: Start with parcel edges and dimension ticks. Slide an inner edge inward equally on every side, leaving the setback as a hatched perimeter band. Lower the authored structure footprint into the remaining envelope and hold the original parcel, clearance band and occupied footprint together.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ParcelSetbackInset/ParcelSetbackInset.test.ts
```

#### PopulationNormalizedMap (`population-normalized-map`)

- [ ] Add schema fields: `zones`, `rateBase`, `colorDomains`, `periodLabel`, `copy`, `keepFractionsVisible`. Use the exact types, defaults and limits from catalog entry 085.
- [ ] Write and run the failing behavioral test: Default raw counts are four and three; per-100 values are ten and thirty. Preserve both denominators while changing the legend and fill domain. Reject a domain that would clip a derived value.
- [ ] Implement this choreography: Begin with count-colored polygons. Lift each polygon like a shallow lid to reveal a numerator-over-denominator fraction, then settle it with the recalculated population-normalized shade. Replace the legend explicitly and hold both raw fractions so the change remains accountable.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PopulationNormalizedMap/PopulationNormalizedMap.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 17`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 18: Change the boundary, keep the people, New reports can change earlier days, A pin can straddle a boundary, Capacity starts with usable floor area, Fit support around the person's week

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/BoundaryRegroupingEffect/`
- `src/stock/presets/SurveillanceReportingBackfill/`
- `src/stock/presets/LocationUncertaintyBoundary/`
- `src/stock/presets/ShelterUsableAreaCapacity/`
- `src/stock/presets/PersonLedSupportCalendar/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### BoundaryRegroupingEffect (`boundary-regrouping-effect`)

- [ ] Add schema fields: `cells`, `groupings`, `measure`, `rateBase`, `copy`, `showCellValues`. Use the exact types, defaults and limits from catalog entry 086.
- [ ] Write and run the failing behavioral test: Both default partitions retain six records and forty residents. West/east per-100 summaries are fifteen/fifteen; north/south are twenty/ten. Derive rates from summed counts and populations rather than averaging cell rates.
- [ ] Implement this choreography: Show the supplied fixed cells and the first grouping boundary. Lift only the outer grouping seams, redraw them in the second arrangement, and gather each zone's arithmetic along the new outline. Hold the unchanged underlying cell values and unchanged overall total beneath the new summaries.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/BoundaryRegroupingEffect/BoundaryRegroupingEffect.test.ts
```

#### SurveillanceReportingBackfill (`surveillance-reporting-backfill`)

- [ ] Add schema fields: `records`, `eventBins`, `snapshots`, `copy`, `showPriorOutline`. Use the exact types, defaults and limits from catalog entry 087.
- [ ] Write and run the failing behavioral test: Default first-snapshot bars are one, one, zero and revised bars are two, two, one. Each later record enters its event-date bin once. Revised minus initial total equals three newly received records.
- [ ] Implement this choreography: Begin with the histogram known at the first reporting snapshot. Advance the reporting-date tab while later receipts open above the chart; their tokens drop into the supplied earlier event bins. Hold the original bar outlines beneath the revised heights and retain both snapshot totals.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SurveillanceReportingBackfill/SurveillanceReportingBackfill.test.ts
```

#### LocationUncertaintyBoundary (`location-uncertainty-boundary`)

- [ ] Add schema fields: `districts`, `locations`, `focusedLocationId`, `copy`, `showOtherFootprints`. Use the exact types, defaults and limits from catalog entry 088.
- [ ] Write and run the failing behavioral test: Default assignments are two definite and one unresolved. Crossing or touching a district boundary never yields a definite assignment, including a zero-radius pin on the boundary. The display toggle cannot alter accounting.
- [ ] Implement this choreography: Begin with district outlines and nominal location pins. Expand the focused pin into a translucent circle, letting its edge visibly cross the boundary. Lift the two possible district labels beside that footprint and move its accounting marker into an unresolved bracket. Hold definite and unresolved counts over all supplied records.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/LocationUncertaintyBoundary/LocationUncertaintyBoundary.test.ts
```

#### ShelterUsableAreaCapacity (`shelter-usable-area-capacity`)

- [ ] Add schema fields: `floorTiles`, `areaPerTile`, `illustrativeAreaPerPlace`, `registeredPeople`, `copy`, `keepGrossOutline`. Use the exact types, defaults and limits from catalog entry 089.
- [ ] Write and run the failing behavioral test: Default gross area is 24, usable area is 12, place equivalents are six, and the demand shortfall is two. Excluded roles contribute zero sleeping area. Test zero usable tiles, spare equivalents and decimal divisors without double rounding.
- [ ] Implement this choreography: Begin with one gross floor outline. Raise the non-sleeping tiles into shallow labeled cutaways, revealing the smaller sleeping-area footprint beneath. Unroll only that usable area into a measured strip, divide it by the supplied illustration benchmark, and hold the resulting place equivalents beside registered people and any shortfall.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ShelterUsableAreaCapacity/ShelterUsableAreaCapacity.test.ts
```

#### PersonLedSupportCalendar (`person-led-support-calendar`)

- [ ] Add schema fields: `people`, `days`, `timeBands`, `commitments`, `copy`, `showOriginalAppointment`. Use the exact types, defaults and limits from catalog entry 090.
- [ ] Write and run the failing behavioral test: Keep every existing commitment fixed while moving only the support appointment to its authored agreed cell. Reject final overlaps and missing day/band references. The ghost appointment never counts as a second booking. Require an initial conflict and an actual move to a free cell.
- [ ] Implement this choreography: Open on a tabletop weekly planner between two people, with existing commitments already occupying time cells. The worker places a proposed support appointment across an occupied cell; the participant lifts it into the explicitly agreed free cell. The worker follows the participant's placement with an agreement mark. Hold the unchanged commitments, moved appointment and participant's goal together before the shared exit envelope.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PersonLedSupportCalendar/PersonLedSupportCalendar.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 18`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 19: Stop the next contact when consent changes, Make room for a private conversation, Count and correct a missing payment, Let the person test the remedy, Count residents' project ballots

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ReferralConsentWithdrawal/`
- `src/stock/presets/PrivateCaseConversation/`
- `src/stock/presets/BenefitShortfallCorrection/`
- `src/stock/presets/GrievanceRemedyRetest/`
- `src/stock/presets/ResidentBudgetBallots/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ReferralConsentWithdrawal (`referral-consent-withdrawal`)

- [ ] Add schema fields: `people`, `permissions`, `plannedContacts`, `priorRecords`, `labels`, `showPurpose`. Use the exact types, defaults and limits from catalog entry 091.
- [ ] Write and run the failing behavioral test: Stop every prepared contact tied to a withdrawn permission while leaving permitted contacts only ready. Earlier sharing records remain visible. Reject dangling permission IDs and do not imply completed contact. Require an affected prepared contact; omit prior-record and permitted-contact beats when those arrays have no such entries.
- [ ] Implement this choreography: Show the participant beside a worker's desk with the supplied destination-specific permission slips and prepared contact cards. The participant turns the withdrawn slips to their withdrawn faces. For each affected contact, the worker stops before reaching the phone and sets the card in a held tray. Any still-permitted contacts remain ready. Hold the changed permission scopes and, when supplied, dated prior-sharing receipts. Earlier records never reverse or disappear; omit the history region when none are supplied.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ReferralConsentWithdrawal/ReferralConsentWithdrawal.test.ts
```

#### PrivateCaseConversation (`private-case-conversation`)

- [ ] Add schema fields: `people`, `requestLabel`, `roomLabels`, `partition`, `showWaitingSupporter`, `copy`. Use the exact types, defaults and limits from catalog entry 092.
- [ ] Write and run the failing behavioral test: Keep participant and worker seated in the meeting while the supporter moves into a separate waiting space before the partition closes. Toggling the inset changes visibility only, not who remains in the meeting.
- [ ] Implement this choreography: Begin with three people seated around one small consultation table. The participant displays the authored privacy request; the supporter acknowledges, stands and walks to a separate waiting seat. A door or screen closes between the two spaces while the participant and worker remain at the original table. Hold the participant's empty adjacent chair and the supporter's waiting position, without portraying abandonment or a completed assessment.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PrivateCaseConversation/PrivateCaseConversation.test.ts
```

#### BenefitShortfallCorrection (`benefit-shortfall-correction`)

- [ ] Add schema fields: `people`, `payments`, `unitLabel`, `labels`, `showTotals`, `exampleLabel`. Use the exact types, defaults and limits from catalog entry 093.
- [ ] Write and run the failing behavioral test: Default statement of five units reconciles three original units plus one correction plus one remaining gap. Reject over-correction. Sum multiple payments without losing per-payment shortfalls or duplicating tokens.
- [ ] Implement this choreography: Open an assistance statement next to the participant's receiving tray. Outline tokens show the stated amount; actual received tokens settle into matching positions, leaving empty outlines. The participant points to the gap and the worker adds only the authored correction tokens from a separate correction envelope. Hold the original payment, correction and still-empty positions with distinct patterns so the accounting remains inspectable.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/BenefitShortfallCorrection/BenefitShortfallCorrection.test.ts
```

#### GrievanceRemedyRetest (`grievance-remedy-retest`)

- [ ] Add schema fields: `people`, `object`, `testResults`, `participantResponse`, `labels`, `showComplaintMarker`. Use the exact types, defaults and limits from catalog entry 094.
- [ ] Write and run the failing behavioral test: A repair alone never closes the complaint. Functioning and participant acceptance are separate supplied states; reject accepted with a nonfunctioning or untested result. An untested result skips the second operation.
- [ ] Implement this choreography: Show a participant trying a locker latch that will not close, then placing a complaint marker beside it. A worker replaces the latch while the participant stays present. The participant, rather than the worker, operates the latch again; it closes only in the supplied functioning outcome. Hold the tested object and the participant's separately supplied accepted, not-accepted or pending response. Keep a non-functioning or unaccepted remedy visibly open.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/GrievanceRemedyRetest/GrievanceRemedyRetest.test.ts
```

#### ResidentBudgetBallots (`resident-budget-ballots`)

- [ ] Add schema fields: `projects`, `ballots`, `labels`, `showTotals`, `tallyArrangement`, `closingNote`. Use the exact types, defaults and limits from catalog entry 095.
- [ ] Write and run the failing behavioral test: Default totals are two bench ballots, one books ballot and one abstention, preserving all four ballot identities. Reject missing project IDs and never convert vote totals into funding or an inferred winner.
- [ ] Implement this choreography: Begin with a small row of anonymous residents and a project display. Each resident marks one paper behind a short screen, then places it in the ballot box or keeps an abstention slip. The box opens and the same papers unfold into stacks under their chosen project symbols. Hold every cast ballot, the abstention slips and derived totals. Do not transform votes into money or automatically crown a winner.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ResidentBudgetBallots/ResidentBudgetBallots.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 19`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 20: Measure the work against the promise, Rehearse the new school routine, Agree who uses the shared machine when, Keep the participant at the center of interpretation, Save seed for the next planting

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/PublicWorksMeasurementCheck/`
- `src/stock/presets/SchoolTransitionRehearsal/`
- `src/stock/presets/SharedWorkshopBooking/`
- `src/stock/presets/InterpretedCaseDialogue/`
- `src/stock/presets/SavedSeedSeasonReturn/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### PublicWorksMeasurementCheck (`public-works-measurement-check`)

- [ ] Add schema fields: `structure`, `specification`, `observation`, `observers`, `showDifference`, `labels`. Use the exact types, defaults and limits from catalog entry 096.
- [ ] Write and run the failing behavioral test: Both lengths use a single spatial scale. Default observed-minus-promised difference is minus one, while a longer observation yields a positive difference. Measurement endpoints track the actual structure, not the promised outline.
- [ ] Implement this choreography: Show a published specification beside a simple built wall or handrail. Two community observers extend a measuring tape along the actual structure, keeping its endpoints attached. A lighter promised-length outline remains behind the measured object; the tape's end stops at the supplied observed value. Hold the signed difference, the measurement source label and the two lengths on one scale.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PublicWorksMeasurementCheck/PublicWorksMeasurementCheck.test.ts
```

#### SchoolTransitionRehearsal (`school-transition-rehearsal`)

- [ ] Add schema fields: `people`, `stops`, `finalStepSupport`, `showPracticeStrip`, `labels`, `showFootprints`. Use the exact types, defaults and limits from catalog entry 097.
- [ ] Write and run the failing behavioral test: Follow the authored locker and classroom routine in order. Alongside and stands-back alter the companion gesture while both remain labeled as practice. No attendance or enrollment result is introduced.
- [ ] Implement this choreography: Open on a learner and companion beside a simple interior containing a locker and a classroom doorway. The learner consults a two-step practice strip, opens the named locker, then approaches the named room. The companion either stays alongside or deliberately stands back for the final step, according to the supplied choice. Hold the learner at the final practice stop with the rehearsal label visible, without changing it to enrolled or attended.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SchoolTransitionRehearsal/SchoolTransitionRehearsal.test.ts
```

#### SharedWorkshopBooking (`shared-workshop-booking`)

- [ ] Add schema fields: `machine`, `timeSlots`, `requests`, `labels`, `showOriginalRequests`, `showUsageTurns`. Use the exact types, defaults and limits from catalog entry 098.
- [ ] Write and run the failing behavioral test: Resolve default overlapping requests into two distinct slots on one machine. A null agreed slot remains unresolved with no use gesture. Reject duplicate agreed slots and ensure ghost requests do not increase usage.
- [ ] Implement this choreography: Show one sewing machine beside a compact time ruler, with the supplied participant request strips overlapping above it. The participants slide only the authored changed strips into their agreed non-overlapping windows and place agreement tabs. A short physical turn at the same machine is shown for each booked participant in order, with the others' named strips remaining visible. Hold the one machine and the agreed schedule; unresolved requests stay above the ruler rather than masquerading as bookings.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SharedWorkshopBooking/SharedWorkshopBooking.test.ts
```

#### InterpretedCaseDialogue (`interpreted-case-dialogue`)

- [ ] Add schema fields: `people`, `languages`, `turns`, `labels`, `showSightlines`, `bubbleLayout`. Use the exact types, defaults and limits from catalog entry 099.
- [ ] Write and run the failing behavioral test: Render exactly the supplied participant then worker turns, retaining original-speaker attribution for both wordings. Paired/stacked layout and sightline toggles preserve that attribution and introduce no generated translation.
- [ ] Implement this choreography: Place the participant and worker across a small table, with the interpreter seated to one side. The first speaker's original bubble appears above them; the interpreter's corresponding supplied wording forms a smaller adjacent echo while the original speaker attribution stays anchored. Repeat once in the opposite direction, with a pause between turns. Hold both paired statements and direct participant-worker sightlines so the interpreter supports the conversation without replacing the participant's voice.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/InterpretedCaseDialogue/InterpretedCaseDialogue.test.ts
```

#### SavedSeedSeasonReturn (`saved-seed-season-return`)

- [ ] Add schema fields: `crop`, `cultivator`, `seasons`, `balanceLabels`, `evidenceLabel`, `showQuantities`. Use the exact types, defaults and limits from catalog entry 100.
- [ ] Write and run the failing behavioral test: Harvest portions remain conserved across immediate use, reserved seed, storage loss and planting; only reserved usable seed returns to the same plot, and the scene stops before germination or an inferred yield.
- [ ] Implement this choreography: Frames 0-11 reveal a schematic plot, harvested crop on a mat, and its named cultivator. Frames 12-48 show the cultivator sliding a chosen portion into a seed jar while the current-use portion stays on the mat. Frames 49-100 close the jar and turn a seasonal backdrop from harvested stubble to fallow ground. Only a nonzero recorded storage loss triggers a temporary opening so that loss can leave into its separate visible tray; close smoothly after the complete loss portion clears and before the planting reopening at frame 101. With zero loss, retain the closed storage state without that opening pulse. Frames 101-144 reopen the same jar as the cultivator draws a furrow in the same plot and sows the supplied amount. Frames 145-167 hold the sown furrow, remaining seed, current-use portion, and loss tray together. No sprouts or next harvest appear. Frames 168-179 fade to the common opaque ground for the six-second seam.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SavedSeedSeasonReturn/SavedSeedSeasonReturn.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 20`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 21: Add a field without inventing the past, Fit one new tool to existing data, Match the reference before comparing a charge, Make room without replacing the work, The same count can hold different amounts

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/SchemaColumnEvolution/`
- `src/stock/presets/PluginCapabilityInstall/`
- `src/stock/presets/ChargeReferenceAlignment/`
- `src/stock/presets/WorkspaceCapacityExtension/`
- `src/stock/presets/EqualCountUnequalVolume/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### SchemaColumnEvolution (`schema-column-evolution`)

- [ ] Add schema fields: `earlierRecords`, `fields`, `laterRecord`, `phaseLabels`, `showVersionLabels`, `evidenceLabel`. Use the exact types, defaults and limits from catalog entry 101.
- [ ] Write and run the failing behavioral test: Each earlier record retains its ID and existing value, its added-field value stays not collected, and exactly one supplied later record enters. A null later value remains visibly missing.
- [ ] Implement this choreography: On a 960x600 React/SVG canvas, frames 0-11 reveal a compact table of earlier records. Frames 12-48 slide the existing columns left and unfold one new column from the header seam. Frames 49-92 place an explicit not-collected mark in that column for each earlier record without changing any original value. Frames 93-132 seat one later record in the same table, with its authored new-field value or missing mark. Frames 133-167 hold both generations under the new header and optional version captions. Frames 168-179 fade to the shared opaque palette ground, giving a deterministic six-second loop at 30fps.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SchemaColumnEvolution/SchemaColumnEvolution.test.ts
```

#### PluginCapabilityInstall (`plugin-capability-install`)

- [ ] Add schema fields: `records`, `categories`, `utility`, `installation`, `copy`, `showRecordIds`. Use the exact types, defaults and limits from catalog entry 102.
- [ ] Write and run the failing behavioral test: The install choice seats exactly one utility and produces category totals from retained record IDs. Defer leaves the socket empty and produces no tally. Changing category membership changes only derived counts.
- [ ] Implement this choreography: Frames 0-11 reveal a work surface, a bounded record strip, and an empty tool socket on the 960x600 canvas. Frames 12-55 bring the named utility beside the socket and display the supplied decision. For install, frames 56-90 seat the utility and align its counting stencil with the unchanged category field. Frames 91-132 draw one tally mark per retained record into its category, resolving compact bars on a common integer scale. For defer, the utility stays beside the empty socket and no tally appears. Hold the retained records, decision, and resulting capability through frame 167, then use the shared opaque exit through frame 179. All movement is frame-driven React/SVG at 30fps.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PluginCapabilityInstall/PluginCapabilityInstall.test.ts
```

#### ChargeReferenceAlignment (`charge-reference-alignment`)

- [ ] Add schema fields: `invoice`, `reference`, `money`, `copy`, `focus`, `showDifference`. Use the exact types, defaults and limits from catalog entry 103.
- [ ] Write and run the failing behavioral test: Require all four context keys and quantity to match before showing a difference. Confirm exact signed arithmetic and common scale for zero, equal, larger, and smaller billed totals. A mismatched payer must never display a computed discrepancy.
- [ ] Implement this choreography: Frames 0-11 reveal a short invoice strip and a separate reference sheet on a 960x600 canvas. Frames 12-70 slide their context windows into vertical registration, retaining a visible notch at each mismatched key. When every key and quantity agrees, frames 71-125 extend the two total-amount rulers from the same zero and open a signed difference bracket. Otherwise the amounts stay separate without a difference bracket. Frames 126-167 hold the matched or unresolved context, source labels, and review caption. Exit to the shared opaque ground at frames 168-179. The six-second React/SVG sequence is deterministic at 30fps.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ChargeReferenceAlignment/ChargeReferenceAlignment.test.ts
```

#### WorkspaceCapacityExtension (`workspace-capacity-extension`)

- [ ] Add schema fields: `existingResources`, `requestedResources`, `allowances`, `choice`, `copy`, `showResourceLabels`. Use the exact types, defaults and limits from catalog entry 104.
- [ ] Write and run the failing behavioral test: The same existing resource IDs remain inside the same tray. Expand reveals exactly the supplied extra capacity and seats every requested resource; keep changes no allowance and leaves every request pending.
- [ ] Implement this choreography: Frames 0-11 reveal the current workspace as a shallow tray with its exact slot allowance on the 960x600 canvas. Frames 12-50 bring requested resource tabs alongside the filled tray while the existing tabs stay fixed. Frames 51-80 show the supplied choice. For expand, frames 81-125 extend the same tray along a hinged side, reveal the additional slots, and seat all requested tabs. For keep, retain the original boundary and pending tabs. Frames 126-167 hold the selected allowance, existing identities, and any pending requests. Fade to the common opaque ground at frames 168-179. Use deterministic frame-driven React/SVG at 30fps.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/WorkspaceCapacityExtension/WorkspaceCapacityExtension.test.ts
```

#### EqualCountUnequalVolume (`equal-count-unequal-volume`)

- [ ] Add schema fields: `groups`, `itemKind`, `measure`, `copy`, `showItemSizes`, `showCountGuides`. Use the exact types, defaults and limits from catalog entry 105.
- [ ] Write and run the failing behavioral test: Equal collection lengths remain fixed as each strip unfolds to bytes divided by scaleMaximumBytes. Verify exact byte totals, zero-byte items retained in counts, identical scale across groups, and the same measurement basis.
- [ ] Implement this choreography: Frames 0-11 reveal two labeled shelves containing the same number of authored items. Frames 12-48 align their count marks one for one. Frames 49-110 unfold each item horizontally into an adjacent byte-length strip while retaining its small identity tab; both shelves share one fixed zero and scale. Frames 111-145 show the derived collection totals beneath the unchanged count marks. Hold through frame 167 with the supplied measurement basis and proxy note, then fade to the shared opaque ground through frame 179. Use the same palette, 960x600 React/SVG canvas, deterministic 180-frame timing, and 30fps.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/EqualCountUnequalVolume/EqualCountUnequalVolume.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 21`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 22: Separate accounts preserve separate attribution, When a temporary share ends, Lift a description into a model draft, Compare the observed result with its expectation, Keep protected time inside a finite schedule

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ActorAttributionSplit/`
- `src/stock/presets/TermLimitedRevenueShare/`
- `src/stock/presets/UtteranceToModelDraft/`
- `src/stock/presets/ExpectationOverlayCheck/`
- `src/stock/presets/ProtectedWorkBoundary/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ActorAttributionSplit (`actor-attribution-split`)

- [ ] Add schema fields: `collaborators`, `accounts`, `sharedAccountId`, `events`, `copy`, `showActionGuides`. Use the exact types, defaults and limits from catalog entry 106.
- [ ] Write and run the failing behavioral test: Shared-phase events retain sharedAccountId at every later frame. Individual-phase events derive only the assigned collaborator account. All event IDs persist and no historical account label changes after the account separation.
- [ ] Implement this choreography: Frames 0-11 reveal two collaborators, one shared stamp, and an empty event ledger. Frames 12-60 let each collaborator stamp one authored historical event with that same account mark. Frames 61-95 move the shared stamp aside and place the supplied distinct account stamps beside the collaborators. Frames 96-140 stamp the later events with their assigned accounts. Frames 141-167 hold the older shared-account entries above the individually attributed later entries, retaining the limitation caption. Fade to the common opaque ground at frames 168-179. Use deterministic React/SVG on 960x600 at 30fps; no credential entry or real authentication occurs.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ActorAttributionSplit/ActorAttributionSplit.test.ts
```

#### TermLimitedRevenueShare (`term-limited-revenue-share`)

- [ ] Add schema fields: `periods`, `arrangement`, `money`, `copy`, `showAmounts`, `arrangementLayout`. Use the exact types, defaults and limits from catalog entry 107.
- [ ] Write and run the failing behavioral test: Verify exact integer reconciliation in both periods, zero distribution after the term boundary, and a retained-flow difference equal to the first distribution. Swapping presentation layout cannot change amounts or scale.
- [ ] Implement this choreography: Frames 0-11 reveal two equal-sized period trays and one common monetary ruler on the 960x600 canvas. Frames 12-65 partition the first receipt strip into operating outflow, temporary distribution, and retained cash. Frames 66-95 turn the authored term marker between the trays and close only the temporary-distribution outlet. Frames 96-140 lay the second identical receipt strip into the second tray: operating outflow stays the same and the formerly distributed portion remains in retained cash. Frames 141-167 hold both periods and their exact reconciliation side by side. Exit to shared opaque ground at frames 168-179. Use frame-driven React/SVG at 30fps and no stochastic timing.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/TermLimitedRevenueShare/TermLimitedRevenueShare.test.ts
```

#### UtteranceToModelDraft (`utterance-to-model-draft`)

- [ ] Add schema fields: `sentenceParts`, `draft`, `review`, `copy`, `showSourceGuides`, `modelLayout`. Use the exact types, defaults and limits from catalog entry 108.
- [ ] Write and run the failing behavioral test: Every draft item references the exact supplied source part, all entity references resolve, the original sentence remains unchanged, and pending review never receives an acceptance marker. Layout changes preserve relation direction.
- [ ] Implement this choreography: Frames 0-11 reveal a short sentence on a 960x600 canvas. Frames 12-48 underline the supplied entity and relation tokens while all connector words remain in place. Frames 49-105 lift duplicate phrase slips from those exact spans into two entity sockets and one relationship hinge; an optional attribute slip docks to its declared entity. Frames 106-135 place the supplied review note and, only for accept, a human acceptance marker. Frames 136-167 hold the unchanged source sentence beside the complete proposed model. Fade to the common opaque palette ground at frames 168-179. All React/SVG motion is deterministic at 30fps and no language-model request is executed.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/UtteranceToModelDraft/UtteranceToModelDraft.test.ts
```

#### ExpectationOverlayCheck (`expectation-overlay-check`)

- [ ] Add schema fields: `tests`, `labels`, `sheetMotion`, `showInputs`, `showStateGlyphs`, `exampleLabel`. Use the exact types, defaults and limits from catalog entry 109.
- [ ] Write and run the failing behavioral test: Changing an observation from the expected string to a different string changes only that case to mismatch. Setting it to null produces an unobserved slot with no pass or fail.
- [ ] Implement this choreography: Frames 12..42 reveal up to three test stations with short input captions. Frames 43..108 register the expected translucent strip over each observed strip, matching their fixed left edges. For lower, translate it vertically into place. For hinge, rotate it around its fixed upper edge and settle it flat before judging equality. Equal strings register into a double outline. Unequal strings separate vertically and retain both complete values with a mismatch bracket. A null observation retains an empty lower slot and never receives a verdict. Frames 109..167 hold all tests, expected results, observations and derived states together. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ExpectationOverlayCheck/ExpectationOverlayCheck.test.ts
```

#### ProtectedWorkBoundary (`protected-work-boundary`)

- [ ] Add schema fields: `slots`, `request`, `workerLabel`, `labels`, `showSlotLabels`, `protectedPattern`. Use the exact types, defaults and limits from catalog entry 110.
- [ ] Write and run the failing behavioral test: All existing slots retain their kind and commitment. Defer preserves a visibly outstanding request. Reschedule is rejected unless its target is an empty work slot.
- [ ] Implement this choreography: Frames 12..38 reveal one fixed strip of equal time blocks containing existing commitments and protected rest, learning or community time. Frames 39..76 bring a new request toward its named protected block. The worker lifts the request away before it covers that block. Frames 77..130 place it in the deferred tray or the supplied empty work slot. Frames 131..167 hold the unchanged protected blocks, retained commitments and visible request disposition. Never stretch the strip or accelerate existing work to create room. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ProtectedWorkBoundary/ProtectedWorkBoundary.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 22`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 23: Let expertise change who teaches, Recognize the person behind a specific contribution, Ask for help without losing ownership, Fix the source after containing the leak, Deliver with the remaining repair obligations visible

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ExpertiseRoleExchange/`
- `src/stock/presets/PeerContributionRecognition/`
- `src/stock/presets/SupportRequestResponse/`
- `src/stock/presets/RecurringLeakPrevention/`
- `src/stock/presets/ReleaseRepairObligations/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ExpertiseRoleExchange (`expertise-role-exchange`)

- [ ] Add schema fields: `people`, `topics`, `labels`, `showJobRoles`, `tableArrangement`, `closingLabel`. Use the exact types, defaults and limits from catalog entry 111.
- [ ] Write and run the failing behavioral test: Swapping the expert IDs reverses the demonstration roles for the two topics while names and job-role labels remain attached to the same people.
- [ ] Implement this choreography: Frames 12..34 reveal two people beside one shared worktable with unchanged role labels. Frames 35..82 show the first topic expert aligning a guide on the table while the other observes. The topic strip then turns to the second topic. Frames 83..130 pass the demonstration tool to the other person, who demonstrates their supplied topic while the first takes the observing position. Frames 131..167 hold both topic-expert attributions and both unchanged job roles. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ExpertiseRoleExchange/ExpertiseRoleExchange.test.ts
```

#### PeerContributionRecognition (`peer-contribution-recognition`)

- [ ] Add schema fields: `people`, `contributions`, `focusedContributionId`, `acknowledgment`, `showAuthorshipTab`, `exampleLabel`. Use the exact types, defaults and limits from catalog entry 112.
- [ ] Write and run the failing behavioral test: Changing the focus directs both the pointing gesture and acknowledgment toward that object while all authorship remains with the contributor. Hiding the tab retains a named byline at hold.
- [ ] Implement this choreography: Frames 12..44 establish the contributor beside one or two authored work objects. Frames 45..88 let the colleague point to the focused object and trace its existing authorship tab back toward the contributor. Frames 89..128 turn the colleague toward the person and deliver the acknowledgment as a speech bubble or note. Frames 129..167 hold the contribution, authorship and acknowledgment together. If the authorship tab is hidden, keep the contributor's supplied name as a fixed byline beside the focused object instead. The colleague does not take the object or the credit. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PeerContributionRecognition/PeerContributionRecognition.test.ts
```

#### SupportRequestResponse (`support-request-response`)

- [ ] Add schema fields: `people`, `task`, `requestText`, `response`, `labels`, `showRequestAtHold`. Use the exact types, defaults and limits from catalog entry 113.
- [ ] Write and run the failing behavioral test: Only joins adds a second chair at the shared task. Later and declines leave the task open, keep its owner unchanged and show their supplied wording.
- [ ] Implement this choreography: Frames 12..42 show the requester with one unfinished work object and a short help request. Frames 43..88 let the colleague turn toward the requester, pause to acknowledge them and display the supplied response. Frames 89..130 bring a second chair to the same worktable only for joins. For later or declines, the colleague remains at their position and the task stays visibly open. Frames 131..167 hold the requester, unchanged work object and explicit response. Do not replace the request with a completed or emotionally resolved state. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SupportRequestResponse/SupportRequestResponse.test.ts
```

#### RecurringLeakPrevention (`recurring-leak-prevention`)

- [ ] Add schema fields: `fixtureLabel`, `workerLabel`, `repair`, `retest`, `labels`, `showPhaseCaptions`. Use the exact types, defaults and limits from catalog entry 114.
- [ ] Write and run the failing behavioral test: A stopped-leak retest retains normal outlet flow. still-leaking retains the leak after repair. not-tested never displays a success state.
- [ ] Implement this choreography: Frames 12..38 reveal a schematic pipe joint leaking beside its normal outlet. Frames 39..62 place a catch tray under the leak while flow continues through the joint. Frames 63..106 pause the flow and let the worker apply the authored joint repair. Frames 107..140 restore the normal outlet flow only when a retest exists, showing either no side leak or a continued side leak according to the supplied result. For not-tested, retain the paused flow and an untested tag. Frames 141..167 hold the catch tray, repaired joint and explicit observation. The normal outlet must still run for a stopped-leak result so closing the supply cannot masquerade as prevention. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/RecurringLeakPrevention/RecurringLeakPrevention.test.ts
```

#### ReleaseRepairObligations (`release-repair-obligations`)

- [ ] Add schema fields: `artifact`, `issues`, `recipientLabel`, `labels`, `showResolvedIssues`, `issueMarks`. Use the exact types, defaults and limits from catalog entry 115.
- [ ] Write and run the failing behavioral test: Any open blocking issue holds the artifact. Resolving the last blocker permits delivery while every open follow-up retains its attached limitation and matching owner/due entry.
- [ ] Implement this choreography: Frames 12..40 reveal an artifact with its authored issue tabs and an empty repair register. Frames 41..90 unfold each open follow-up tab into a matching register entry with its owner and due label, leaving the original limitation attached to the artifact. Resolved issues keep a resolved mark. Frames 91..130 move the artifact to the recipient only if every blocking issue is resolved. Otherwise keep it behind a held bracket. Frames 131..167 hold the actual artifact location and all unresolved obligations. A due label is a commitment, never a completed repair. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ReleaseRepairObligations/ReleaseRepairObligations.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 23`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 24: Prepare one guide that the whole team can reuse, Take the work to another tool, Change one part through a designed seam, Send the structure, run the question locally, Widen the cache without losing rows

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/SharedJigPreparation/`
- `src/stock/presets/PortableWorkTransfer/`
- `src/stock/presets/ServiceablePanelSwap/`
- `src/stock/presets/SchemaPlanLocalExecution/`
- `src/stock/presets/QueryColumnCacheGrowth/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### SharedJigPreparation (`shared-jig-preparation`)

- [ ] Add schema fields: `makerLabel`, `guide`, `collaborators`, `labels`, `workpieceMaterial`, `showAlignmentGuides`. Use the exact types, defaults and limits from catalog entry 116.
- [ ] Write and run the failing behavioral test: Each collaborator receives exactly one application of the selected pattern on their existing workpiece. Only one guide exists and it is retained after the final application.
- [ ] Implement this choreography: Frames 12..48 show a maker forming the authored guide by opening two marking holes or a corner notch. Frames 49..130 carry that same guide to each collaborator in input order. At each station the collaborator aligns the guide with their existing blank workpiece and makes the matching marks, then releases the unchanged guide for the next person. Frames 131..167 hold all separate marked workpieces and the retained guide together. Do not turn the guide into copies of itself or show a numeric acceleration. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SharedJigPreparation/SharedJigPreparation.test.ts
```

#### PortableWorkTransfer (`portable-work-transfer`)

- [ ] Add schema fields: `ownerLabel`, `tools`, `artifacts`, `transferState`, `labels`, `showIdentityTabs`. Use the exact types, defaults and limits from catalog entry 117.
- [ ] Write and run the failing behavioral test: Every artifact retains one source original and one same-ID transfer copy. Awaiting-open never displays successful destination use.
- [ ] Implement this choreography: Frames 12..42 reveal the owner with a bounded collection at the source tool. Frames 43..92 lift one labeled copy of each artifact into a single portable folio while originals stay anchored in place. Frames 93..130 let the owner carry the folio to the destination. For accepted, open it and place each same-ID copy on the destination surface. For awaiting-open, retain the closed folio without a success mark. Frames 131..167 hold both tool labels, the owner and the actual transfer state. Do not animate format conversion or infer compatibility. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PortableWorkTransfer/PortableWorkTransfer.test.ts
```

#### ServiceablePanelSwap (`serviceable-panel-swap`)

- [ ] Add schema fields: `modules`, `replacement`, `workerLabel`, `enclosure`, `labels`, `showConnectorGuide`. Use the exact types, defaults and limits from catalog entry 118.
- [ ] Write and run the failing behavioral test: Changing targetModuleId moves the entire service action to that slot. Every unaffected module retains its exact position and ID, and the removed original remains visible.
- [ ] Implement this choreography: Frames 12..42 reveal a single enclosure with a bounded row of modules. Frames 43..78 open a service latch around the targeted module and expose its existing connector. Frames 79..116 withdraw that module into a retained-parts tray, seat the supplied replacement on the same connector and close the latch. Frames 117..167 hold the changed module, unchanged neighbors and removed original together. Never dissolve or rebuild the enclosure to suggest local maintainability. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ServiceablePanelSwap/ServiceablePanelSwap.test.ts
```

#### SchemaPlanLocalExecution (`schema-plan-local-execution`)

- [ ] Add schema fields: `columns`, `rows`, `request`, `boundaryLabels`, `showRows`, `copy`. Use the exact types, defaults and limits from catalog entry 119.
- [ ] Write and run the failing behavioral test: Default result equals 5 from rows a and c. Alter South to North and result becomes 10. No raw row records or numeric cell payloads are automatically serialized outbound. Only the authored question/schema copy travels outbound and the plan returns. The question can contain an explicitly supplied category such as North; neither schema nor question is represented as anonymous.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 lift a copy of the header strip and the authored question card from the device and send both across a clearly labeled boundary to the remote planner, while every row record stays inside the device. Frames 56-100 unfold the returned operation strip inside the device. Frames 101-139 apply its explicit predicate and sum to the local rows; the result stays beside the table. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SchemaPlanLocalExecution/SchemaPlanLocalExecution.test.ts
```

#### QueryColumnCacheGrowth (`query-column-cache-growth`)

- [ ] Add schema fields: `columns`, `cachedColumnIds`, `requests`, `keyColumnId`, `showSetNotation`, `copy`. Use the exact types, defaults and limits from catalog entry 120.
- [ ] Write and run the failing behavioral test: First request hits; second misses and final columns are key,name,value. Row count stays 3, including both B rows. No parallel partial entries or deduplication. Reject unequal column lengths.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-60 align the first request with the cached columns and pass it. Frames 61-105 show the next request exposing the missing column set. Frames 106-139 widen the single cached table to the union of old and required columns, preserving each row strip. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/QueryColumnCacheGrowth/QueryColumnCacheGrowth.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 24`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 25: Take shared resources in one order, Keep partial data out of the next read, Keep one record per entity, Say how repeated observations become one value, Refresh facts while keeping human work

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/OrderedLockAcquisition/`
- `src/stock/presets/InvalidTableQuarantine/`
- `src/stock/presets/EntitySpineAssembly/`
- `src/stock/presets/GroupedValuePicker/`
- `src/stock/presets/StatePreservingSourceRefresh/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### OrderedLockAcquisition (`ordered-lock-acquisition`)

- [ ] Add schema fields: `resources`, `operations`, `firstOperationId`, `showOriginalOrder`, `copy`. Use the exact types, defaults and limits from catalog entry 121.
- [ ] Write and run the failing behavioral test: Reverse firstOperationId and grant order swaps, while canonical resource order stays fixed. Second operation holds neither key while waiting. Every acquired key is released before reuse.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-52 show each operation reaching for its first requested key and a potential crossed dependency. Before any lock is granted, frames 53-90 sort both request strips identically. Frames 91-139 let the first operation hold and release both keys, then admit the second. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/OrderedLockAcquisition/OrderedLockAcquisition.test.ts
```

#### InvalidTableQuarantine (`invalid-table-quarantine`)

- [ ] Add schema fields: `originalRows`, `attempt`, `reload`, `labels`, `showAttempt`. Use the exact types, defaults and limits from catalog entry 122.
- [ ] Write and run the failing behavioral test: With reload.performed=false, the final shutter stays closed regardless of attempt outcome. With reload, all displayed rows equal reload.rows before any read opens.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-45 close a visible read shutter before altering one row. Frames 46-95 show the authored mutation outcome with an invalid band still covering the table. Frames 96-139 either insert a full replacement sheet and reopen the shutter, or retain the closed shutter. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/InvalidTableQuarantine/InvalidTableQuarantine.test.ts
```

#### EntitySpineAssembly (`entity-spine-assembly`)

- [ ] Add schema fields: `entities`, `observations`, `field`, `showSourceRows`, `copy`. Use the exact types, defaults and limits from catalog entry 123.
- [ ] Write and run the failing behavioral test: Default output contains exactly 3 entities with values 5,4,null. Adding another A observation changes A value only and never adds an entity row. Zero observation value renders 0, distinct from missing.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-48 align a unique key spine down the center. Frames 49-105 stack repeated observations beside their key and collapse their numeric values by sum. Frames 106-139 attach the derived value to each spine row, leaving a labeled missing field where no observations match. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/EntitySpineAssembly/EntitySpineAssembly.test.ts
```

#### GroupedValuePicker (`grouped-value-picker`)

- [ ] Add schema fields: `observations`, `rule`, `nullPolicy`, `labels`, `showCalculation`. Use the exact types, defaults and limits from catalog entry 124.
- [ ] Write and run the failing behavioral test: Defaults yield mode=4, first=2, sum=10, mean=10/3, min=2, max=4,count=3. Test tied values and null mode under both policies; zero must remain distinct from null. Mean default displays approximately 3.33 using exact 10/3 internally. Count must display labels.countUnit rather than the measure unit.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 place observations on an ordered rail. Frames 56-105 reveal the selected rule: first highlights the first tile; most-frequent stacks equal values; numeric rules fold values onto one calculation line. Frames 106-139 attach the derived result without erasing the rail. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/GroupedValuePicker/GroupedValuePicker.test.ts
```

#### StatePreservingSourceRefresh (`state-preserving-source-refresh`)

- [ ] Add schema fields: `records`, `sourceRows`, `labels`, `showWriteCount`, `copy`. Use the exact types, defaults and limits from catalog entry 125.
- [ ] Write and run the failing behavioral test: Default changes only A label, leaves B entirely unchanged and flags C. Every id/status/assignee stays identical. With identical sourceRows, derived write count is 0.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 pin identity and human fields to the record edge. Frames 51-104 compare the old and fresh source strips. Frames 105-139 replace only changed derived labels, mark absent keys as missing and leave every human field untouched. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/StatePreservingSourceRefresh/StatePreservingSourceRefresh.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 25`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 26: Combine the grants that actually apply, Save the change and its delivery obligation together, Continue after the acknowledged byte, Recover cells from page geometry, Review a number near two labels

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/EffectivePermissionGrants/`
- `src/stock/presets/AtomicOutboxCommit/`
- `src/stock/presets/ResumableByteTransfer/`
- `src/stock/presets/PdfGridReconstruction/`
- `src/stock/presets/PdfNearestLabelReview/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### EffectivePermissionGrants (`effective-permission-grants`)

- [ ] Add schema fields: `grants`, `restricted`, `requiredRole`, `labels`, `showExcludedGrants`. Use the exact types, defaults and limits from catalog entry 126.
- [ ] Write and run the failing behavioral test: Default effective role is viewer and edit denied. Unrestrict gives editor and allows edit. Enabling direct admin gives admin. Reordering grant array never changes result; no eligible candidates produces none.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-52 place each candidate on the none/view/edit/admin ladder. Frames 53-100 close gates for disabled conditions and for the app default when restriction applies. Frames 101-139 raise a result marker to the maximum eligible rank or leave it at none, then compare that marker visibly against a separate required-role notch to resolve allowed or denied. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/EffectivePermissionGrants/EffectivePermissionGrants.test.ts
```

#### AtomicOutboxCommit (`atomic-outbox-commit`)

- [ ] Add schema fields: `change`, `outcome`, `labels`, `showIdentifier`, `copy`. Use the exact types, defaults and limits from catalog entry 127.
- [ ] Write and run the failing behavioral test: Commit updates local after and creates exactly one matching pending ticket. Abort preserves before and creates zero durable tickets. There is no sampled frame with only one half committed.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 write a local change and matching journal ticket on two halves of one sheet. Frames 56-110 close one shared commit latch. Frames 111-139 stamp both halves when committed, or withdraw both provisional halves when aborted. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/AtomicOutboxCommit/AtomicOutboxCommit.test.ts
```

#### ResumableByteTransfer (`resumable-byte-transfer`)

- [ ] Add schema fields: `file`, `acknowledgedBytes`, `finalOutcome`, `labels`, `showOffsets`. Use the exact types, defaults and limits from catalog entry 128.
- [ ] Write and run the failing behavioral test: Default sends 400-byte confirmed prefix once, resumes at 400 and ends at 1200. For size 1100, final chunk is 300. No confirmed byte counted twice; confirmed+remaining=size.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 transfer chunks to the acknowledged boundary. Frames 56-90 interrupt one unacknowledged segment without adding it to confirmed progress. Frames 91-139 restart at the confirmed offset and append the remaining chunks. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ResumableByteTransfer/ResumableByteTransfer.test.ts
```

#### PdfGridReconstruction (`pdf-grid-reconstruction`)

- [ ] Add schema fields: `grid`, `signal`, `evidenceLabel`, `showSourceLinks`, `copy`. Use the exact types, defaults and limits from catalog entry 129.
- [ ] Write and run the failing behavioral test: Every supplied data cell appears exactly once at its original row and column. Switching evidence signal changes the evidence choreography without changing values. Whitespace mode shows inference qualifier.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 draw the selected evidence: tagged-cell outlines, ruling lines or whitespace corridors. Frames 56-105 register the supplied text items inside their cells. Frames 106-139 unfold an equal-sized grid beside the page with every cell still linked to its source position. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PdfGridReconstruction/PdfGridReconstruction.test.ts
```

#### PdfNearestLabelReview (`pdf-nearest-label-review`)

- [ ] Add schema fields: `figure`, `labels`, `ambiguityThreshold`, `reviewedLabelId`, `showDistanceValues`, `copy`. Use the exact types, defaults and limits from catalog entry 130.
- [ ] Write and run the failing behavioral test: Default ratio is above 0.8 and must flag ambiguity. Null reviewedLabelId leaves unresolved. An accepted farther label follows human choice, with the original two distances retained.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 reveal one numeric token and two nearby label boxes. Frames 51-95 extend distance guides from the token to both boxes. Frames 96-139 show either the reviewer choosing one label or an unresolved bracket retaining both candidates; the extracted row carries the same source position. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PdfNearestLabelReview/PdfNearestLabelReview.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 26`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 27: Carry the unit and qualifier with the number, Read the same fields across repeated sections, Turn each measurement into a row, Check that the saved region still points to the same content, Freeze the selected data for a published view

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/ProseMeasurementLedger/`
- `src/stock/presets/RepeatingBlocksToTable/`
- `src/stock/presets/WideTableToObservations/`
- `src/stock/presets/DocumentRegionDriftCheck/`
- `src/stock/presets/PublicationSnapshotSlice/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### ProseMeasurementLedger (`prose-measurement-ledger`)

- [ ] Add schema fields: `fragments`, `showSourceSpans`, `method`, `reviewState`, `copy`. Use the exact types, defaults and limits from catalog entry 131.
- [ ] Write and run the failing behavioral test: Derive subject West site, metric received, value 12, unit crates, period week 2 and qualifier about from the exact spans. Changing a span changes only that field. Switching extraction method does not alter review state, source text or extracted values. No output field can be independently supplied.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 underline the supplied sentence fragments with distinct patterns. Frames 56-110 move copies of those exact fragments into labeled observation slots. Frames 111-139 hold the original sentence above the structured row and keep the qualifier visible. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ProseMeasurementLedger/ProseMeasurementLedger.test.ts
```

#### RepeatingBlocksToTable (`repeating-blocks-to-table`)

- [ ] Add schema fields: `fields`, `blocks`, `missingLabel`, `showBlockNumbers`, `copy`. Use the exact types, defaults and limits from catalog entry 132.
- [ ] Write and run the failing behavioral test: Default yields two rows and two fields; East Need remains Not stated. Reorder fields and output columns follow without moving values to a different semantic field.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 reveal repeated heading blocks with their field labels. Frames 56-105 line up equal labels vertically and rotate the block organization into a compact row-based table. Frames 106-139 hold each block beside its row with an explicit missing cell. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/RepeatingBlocksToTable/RepeatingBlocksToTable.test.ts
```

#### WideTableToObservations (`wide-table-to-observations`)

- [ ] Add schema fields: `measures`, `subjects`, `missingPolicy`, `showSourceGuides`, `copy`. Use the exact types, defaults and limits from catalog entry 133.
- [ ] Write and run the failing behavioral test: Defaults yield four output rows including one missing value. Omit-with-ledger yields three rows plus one omitted missing cell. Every output key pair is unique and traces to one source cell.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 reveal a two-measure wide table. Frames 51-110 peel the measure columns into vertical strips, carrying a subject-key copy with each cell. Frames 111-139 stack the strips as a long observation ledger with explicit measure and unit columns. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/WideTableToObservations/WideTableToObservations.test.ts
```

#### DocumentRegionDriftCheck (`document-region-drift-check`)

- [ ] Add schema fields: `saved`, `current`, `labels`, `showDetectorOrdinal`, `copy`. Use the exact types, defaults and limits from catalog entry 134.
- [ ] Write and run the failing behavioral test: Default FP-A versus FP-B holds replacement. Change current fingerprint to FP-A and keep header equal to pass. Changing detectorOrdinal alone never changes the selected geometry or outcome.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 align saved and current page outlines at the same region coordinates. Frames 51-100 compare the header and fingerprint tags independently. Frames 101-139 either register a match or close a review latch when either tag differs. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/DocumentRegionDriftCheck/DocumentRegionDriftCheck.test.ts
```

#### PublicationSnapshotSlice (`publication-snapshot-slice`)

- [ ] Add schema fields: `table`, `selection`, `liveEdit`, `publication`, `showExcludedCells`, `copy`. Use the exact types, defaults and limits from catalog entry 135.
- [ ] Write and run the failing behavioral test: Default snapshot contains Site/Items for both rows, never Internal note. Live West items becomes 15 while published remains 12 and Revision 1. Snapshot cell count equals selected rows times selected columns.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 outline selected cells in the live table. Frames 56-95 copy them into a separate snapshot frame with a revision label. Frames 96-139 alter only the authored live cell, preserving the frozen publication and its revision. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PublicationSnapshotSlice/PublicationSnapshotSlice.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 27`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 28: One filter changes only the subscribed views, Apply the row condition before transfer, The breaks change the map, Make symbol area match the value, A cluster is the same points grouped

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/FilterSubscriptionScope/`
- `src/stock/presets/PredicatePushdownBoundary/`
- `src/stock/presets/ChoroplethClassBreaks/`
- `src/stock/presets/ProportionalSymbolArea/`
- `src/stock/presets/MapClusterUnfold/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### FilterSubscriptionScope (`filter-subscription-scope`)

- [ ] Add schema fields: `records`, `views`, `selectedCategory`, `metric`, `showExcludedRecords`, `copy`. Use the exact types, defaults and limits from catalog entry 136.
- [ ] Write and run the failing behavioral test: Default subscribed views show count 2 and sum 5; unsubscribed shows count 3 and sum 10. Changing selectedCategory to East yields 1 and 5 only in subscribed views. Both sum and count retain their distinct units in all views.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 reveal three compact tables with subscription connectors. Frames 51-90 place one category filter into its source socket. Frames 91-139 mask only nonmatching records in subscribed views, recompute their sums and retain all records in the unsubscribed view. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/FilterSubscriptionScope/FilterSubscriptionScope.test.ts
```

#### PredicatePushdownBoundary (`predicate-pushdown-boundary`)

- [ ] Add schema fields: `rows`, `predicate`, `metric`, `labels`, `showTotals`, `copy`. Use the exact types, defaults and limits from catalog entry 137.
- [ ] Write and run the failing behavioral test: Defaults transfer b and d only. transferred+excluded=4. Source retains all four originals. Threshold outside all values produces empty or complete transfer without fabricating rows. Threshold shows items and subset totals show records. Destination displays exact matching rows without inventing a second computation.
- [ ] Implement this choreography: 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 show a query predicate arriving at the source. Frames 51-95 close source gates for nonmatching rows. Frames 96-139 move only matching row copies across the boundary while the full source remains intact. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/PredicatePushdownBoundary/PredicatePushdownBoundary.test.ts
```

#### ChoroplethClassBreaks (`choropleth-class-breaks`)

- [ ] Add schema fields: `zones`, `schemes`, `unitLabel`, `noDataLabel`, `showValueRuler`, `copy`. Use the exact types, defaults and limits from catalog entry 138.
- [ ] Write and run the failing behavioral test: A=2 stays low; B=4 changes low to high; C=9 stays high; D remains no-data. Values never change. Test exact break equality and maximum inclusion.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 align four zone tiles with one common value ruler and initial break markers. Frames 51-110 slide markers to the second scheme and recolor each zone only as its fixed value crosses a threshold. Frames 111-139 hold both labeled legends and unchanged zone numbers. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ChoroplethClassBreaks/ChoroplethClassBreaks.test.ts
```

#### ProportionalSymbolArea (`proportional-symbol-area`)

- [ ] Add schema fields: `sites`, `areaPerUnit`, `unitLabel`, `showRadiusComparison`, `copy`. Use the exact types, defaults and limits from catalog entry 139.
- [ ] Write and run the failing behavioral test: Default circle B area is exactly 4 times A and its radius exactly 2 times A. Legend uses the same areaPerUnit. Reposition sites without changing size. Changing values to 2 and 8 keeps 4x/2x; changing to 2 and 2 yields 1x/1x. Invalid plot fit or separation rejects configuration.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 reveal source values as equal-area tile counts. Frames 51-110 reshape each tile bundle into a circle of matching total area. Frames 111-139 overlay a reference-radius ruler and keep the area/value legend visible. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/ProportionalSymbolArea/ProportionalSymbolArea.test.ts
```

#### MapClusterUnfold (`map-cluster-unfold`)

- [ ] Add schema fields: `points`, `clusters`, `labels`, `showMemberIds`, `copy`. Use the exact types, defaults and limits from catalog entry 140.
- [ ] Write and run the failing behavioral test: Default clusters each contain 2 points and total remains 4 at every stable state. Changing one point clusterId changes both counts without duplicating the point.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-52 draw all points on a schematic map. Frames 53-82 contract members into their supplied cluster centers with derived count labels. Keep exact grouped coordinates and counts visible through frame 99. Stationary coincident locations retain intelligible derived count badges throughout transition. Frames 99-139 expand the same identities back to their original points while a total ledger stays fixed. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/MapClusterUnfold/MapClusterUnfold.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 28`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 29: Count each point in one grid cell, Keep small-cell counts undisclosed, Account for the rows that cannot be mapped, Transform coordinates before combining layers, Remove detail without moving the kept vertices

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/SpatialGridBinning/`
- `src/stock/presets/MinimumCountMapSuppression/`
- `src/stock/presets/CoordinateQualityTriage/`
- `src/stock/presets/CoordinateFrameRegistration/`
- `src/stock/presets/GeometryDetailBudget/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### SpatialGridBinning (`spatial-grid-binning`)

- [ ] Add schema fields: `points`, `grid`, `labels`, `showPointGhosts`, `copy`. Use the exact types, defaults and limits from catalog entry 141.
- [ ] Write and run the failing behavioral test: Defaults produce top-left=2, top-right=1,bottom-left=0,bottom-right=1. Cell total equals points.length. Boundary convention prevents double count.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 draw the grid over stationary points. Frames 51-110 slide one count token from each point into its cell ledger. Frames 111-139 shade cells by derived count while retaining faint original positions. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/SpatialGridBinning/SpatialGridBinning.test.ts
```

#### MinimumCountMapSuppression (`minimum-count-map-suppression`)

- [ ] Add schema fields: `cells`, `minimum`, `labels`, `showLocalCounts`, `copy`. Use the exact types, defaults and limits from catalog entry 142.
- [ ] Write and run the failing behavioral test: Default public A is suppressed without 2, B shows 6,C reported zero,D no-data. Raising threshold above 6 suppresses B too. No total of unreleased counts appears on public side.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 show only the aggregate-count sheet inside a local analysis boundary, with no individual points. Frames 51-105 apply the threshold at an adjacent outgoing release gate cell by cell. When showLocalCounts is true, local analytical values remain readable, including below-threshold counts. Frames 106-139 copy only permitted count labels to a public map and use distinct symbols for suppressed, zero and missing states. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/MinimumCountMapSuppression/MinimumCountMapSuppression.test.ts
```

#### CoordinateQualityTriage (`coordinate-quality-triage`)

- [ ] Add schema fields: `rows`, `labels`, `showValues`, `copy`. Use the exact types, defaults and limits from catalog entry 143.
- [ ] Write and run the failing behavioral test: Defaults yield one plotted, one missing,one out-of-range,one nonnumeric. Their sum is 4. At exact ±90/±180 boundary, valid; null never maps to 0.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 line up coordinate rows beside latitude and longitude rulers. Frames 51-105 evaluate each row; valid pairs plot on a schematic graticule while failed rows move into labeled missing/type/range trays. Frames 106-139 hold plotted and rejected counts that reconcile to input. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CoordinateQualityTriage/CoordinateQualityTriage.test.ts
```

#### CoordinateFrameRegistration (`coordinate-frame-registration`)

- [ ] Add schema fields: `landmarks`, `transform`, `frames`, `showCoordinatePairs`, `copy`. Use the exact types, defaults and limits from catalog entry 144.
- [ ] Write and run the failing behavioral test: Each final coordinate equals x*scaleX+offsetX,y*scaleY+offsetY. Default A transforms to (30,20). IDs remain unchanged; invalid transforms that leave canvas rejected.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-52 show two labeled coordinate grids with corresponding landmarks offset. Frames 53-110 transform every source point using the same affine coefficients while axes remain labeled. Frames 111-139 align matched IDs and show their target coordinates. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/CoordinateFrameRegistration/CoordinateFrameRegistration.test.ts
```

#### GeometryDetailBudget (`geometry-detail-budget`)

- [ ] Add schema fields: `vertices`, `tolerance`, `labels`, `showDeviationGuides`, `copy`. Use the exact types, defaults and limits from catalog entry 145.
- [ ] Write and run the failing behavioral test: Endpoints always retained. Zero tolerance retains every noncollinear vertex. For each removed vertex, distance to its associated kept segment <=tolerance. Repeated render yields identical ties and output.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 reveal a jagged source line and its vertices. Frames 51-110 run recursive farthest-deviation splits, retaining a vertex only when its deviation exceeds the tolerance. Frames 111-139 draw the simplified line over the ghost original and count retained/removed vertices. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/GeometryDetailBudget/GeometryDetailBudget.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 29`. The coordinator runs serial previews and retains the per-preset evidence.

### Packet 30: Travel time follows the network, Show displacement as an approximation, A smooth surface depends on its radius, A buffer is a distance rule, Keep the late value that changes the column

**Files:** The worker owns these 5 preset directories and the five files per directory defined in Worker packet contract.

- `src/stock/presets/TravelTimeNetworkFrontier/`
- `src/stock/presets/BoundedLocationDisplacement/`
- `src/stock/presets/KernelDensitySpread/`
- `src/stock/presets/DistanceBufferEnvelope/`
- `src/stock/presets/LateTypeEvidence/`

**Interfaces:** Consume `GraphicProps`, the registry contract, shared motion primitives and the full inputs below. Produce each named React component, strict input schema, metadata, defaults and fixture suite. Registry edits belong to the coordinator.

#### TravelTimeNetworkFrontier (`travel-time-network-frontier`)

- [ ] Add schema fields: `nodes`, `roads`, `originId`, `budgetMinutes`, `modeLabel`, `showCosts`. Use the exact types, defaults and limits from catalog entry 146.
- [ ] Write and run the failing behavioral test: Default A=3,B=6,C=10; budget 7 reaches A and B but not C. Moving C visually nearer does not change cost. Raising budget to 10 includes C exactly; deterministic shortest path ties.
- [ ] Implement this choreography: React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-45 reveal schematic roads and their minute costs. Frames 46-110 propagate a frontier along minimum cumulative travel time, filling reachable nodes and holding beyond-budget nodes outside. Frames 111-139 hold each destination cost beside the stated budget. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/TravelTimeNetworkFrontier/TravelTimeNetworkFrontier.test.ts
```

#### BoundedLocationDisplacement (`bounded-location-displacement`)

- [ ] Add schema fields: `locations`, `radiusUnits`, `labels`, `showLocalOriginal`, `copy`. Use the exact types, defaults and limits from catalog entry 147.
- [ ] Write and run the failing behavioral test: Every displacement length<=radiusUnits. Public copy never labels original x/y. Zero offset is allowed but still labeled approximate policy; invalid bound rejects configuration. Before disclosure the public display is empty. For every location, the first and every subsequent public position equals only (x+offsetX,y+offsetY). No trail connects the display marker to its source coordinate.
- [ ] Implement this choreography: React/SVG 960x600, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal a local analysis inset with all supplied source locations and a completely empty display-copy map. Frames 13-70 compute each authored offset inside the local inset and show its distance against the bound. Frames 71-139 emit only the displaced coordinates onto the display-copy map, labeling every point approximate. Never place a source coordinate on the display map, even transiently. Hold all displaced points and separated local inset at 140-165, then fade both to the same opaque ground at 166-179.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/BoundedLocationDisplacement/BoundedLocationDisplacement.test.ts
```

#### KernelDensitySpread (`kernel-density-spread`)

- [ ] Add schema fields: `points`, `radii`, `gridSize`, `legendMaximum`, `labels`, `showKernels`. Use the exact types, defaults and limits from catalog entry 148.
- [ ] Write and run the failing behavioral test: Every sampled cell equals sum(weight*max(0,1-distance/radius)). Radius change preserves point count and legend scale. A cell beyond all radii has zero modeled intensity, explicitly not observed zero population.
- [ ] Implement this choreography: 960x600 React/SVG with shared palette, deterministic 180 frames at 30fps. Reveal at frames 0-12. Frames 13-55 raise a small cone over each point. Frames 56-105 add cone heights into a sampled grid intensity. Frames 106-139 widen or narrow every cone to the second radius and recompute the grid while point markers stay fixed. Hold the resolved state at 140-165; fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/KernelDensitySpread/KernelDensitySpread.test.ts
```

#### DistanceBufferEnvelope (`distance-buffer-envelope`)

- [ ] Add schema fields: `origin`, `locations`, `radiusUnits`, `labels`, `showDistances`, `copy`. Use the exact types, defaults and limits from catalog entry 149.
- [ ] Write and run the failing behavioral test: Default distances A=10,B=sqrt(800),C=40; radius30 includes A and B. A location exactly on boundary is included once. Radius change never moves origin or locations.
- [ ] Implement this choreography: 960x600 React/SVG with shared palette, deterministic 180 frames at 30fps. Reveal at frames 0-12. Frames 13-50 anchor the center and radius ruler. Frames 51-105 sweep a compass arm to draw the distance circle. Frames 106-139 compare each location distance with the radius and collect only qualifying IDs in a separate ledger. Hold the resolved state at 140-165; fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/DistanceBufferEnvelope/DistanceBufferEnvelope.test.ts
```

#### LateTypeEvidence (`late-type-evidence`)

- [ ] Add schema fields: `values`, `policy`, `labels`, `showOriginalStrings`, `copy`. Use the exact types, defaults and limits from catalog entry 150.
- [ ] Write and run the failing behavioral test: Default output retains 12,8,4,Pending in original order. Widen yields text type; hold yields no completed import. Both retain four rows and cannot replace Pending with null.
- [ ] Implement this choreography: 960x600 React/SVG with shared palette, deterministic 180 frames at 30fps. Reveal at frames 0-12. Frames 13-55 reveal the initial numeric-looking rows under a provisional numeric type label. Frames 56-100 append the authored text row and open a type-review bracket. Frames 101-139 widen the column type to text or hold the import for review according to policy, preserving all input values. Hold the resolved state at 140-165; fade to the same opaque ground at 166-179. Reset is editorial.
- [ ] Run the focused test before and after implementation, then report both outcomes:

```sh
node scripts/require-license.mjs
pnpm exec tsx --test src/stock/presets/LateTypeEvidence/LateTypeEvidence.test.ts
```

- [ ] Submit the completed owned directories for fresh specification and code-quality review. Address findings in the same owned paths.
- [ ] After review, stage only this packet's paths and commit `feat(video): add Motion Atlas packet 30`. The coordinator runs serial previews and retains the per-preset evidence.

## Source execution status: 2026-10-17

Tasks 1..6 and the source-integration/generation/correction portions of Task 7
have accepted implementation evidence. All 30 packets have accepted source
reviews. Final Task 7 browser/media validation is still pending in this draft;
Task 8 example/link validation and delivered artifacts are also pending. Do not
mark the historical per-preset behavioral RED checklist retrospectively complete:
Packet 07 and Packet 19 process limitations remain explicit in the durable record.
The original full suite failed 2,213 pass/6 fail, followed by 71/71 affected
correction checks. Final acceptance is based on actual later evidence, not a
rewritten historical test sequence.

Source is frozen at `02d6cfbb66577931dd7d7eb19f9c06ef5b1a431a` /
`2ad047077f26a17ebb71df914e02e1819860328e7229befc57360b202e0b21ae`.
The [durable implementation record](../../motion-atlas/implementation-validation.md)
and per-preset evidence preserve the actual history after temporary SDD cleanup.

## Accepted implementation clarifications: 2026-10-17

These source-reviewed clarifications reconcile the accepted catalog with the
implemented contracts. They preserve IDs, supplied data, defaults and bounds
except the explicitly supplied missing maxima. The complete [rulings with costs](../../motion-atlas/implementation-rulings.md)
remain authoritative for chronology and superseded decisions.

| Contract | Reviewed interpretation |
| --- | --- |
| SealedHandoff | Both modes show readable setup before closure. Remain-sealed never re-exposes contents after closure; both fully occlude throughout transit and recipient mode reopens only after arrival |
| ReadinessLatch | Relative workUnits determines completion order in 24..112, equal work may complete together. Array order is spatial ribbon order. All pins must withdraw before release 122/result 146 |
| WorkDecomposition | Conserved full-area pieces separate into reserved space within a distinct bracket. The original contour stays a fixed thin reference, not an unchanged filled outline that must contain the separated pieces |
| Packet 06 exact data | LiteralDataText names exact raw key/value, candidate-value, grouping/selection and duplicate comparison/ID fields in the catalog. Styled whitespace marks do not change raw values, aria/data, equality or bounds |
| SchoolCostSatchel | Expense IDs denote distinct authored costs summed once. Equal labels/kinds/amounts under distinct IDs are valid. Detecting one real-world cost supplied under multiple IDs remains the author's responsibility |
| ChargeReferenceAlignment | copy.invoice/reference are 1..32-character source-role captions; five context keys 1..16; matched/unmatched/difference 1..32; review/example 1..52 |
| UtteranceToModelDraft | R45 defines finite punctuation/article/lowercase substring matching for validation only. Original text is retained. No NLP or meaning inference |
| Bounded IDs | R46 gives exactly 13 listed ID paths a maximum of 12, with no new minimum/normalization. R47 includes PublicationSnapshotSlice column/row IDs in its existing 18-character text maximum; references inherit exact target bounds |
| QueryColumnCacheGrowth | Exact <=16-character cells may wrap after eight whole graphemes into at most two fixed 12px lines; complete raw grouping and equality remain exact |
| Localized defaults | Optional defaultSpanBindings computes translated UTF-16 spans from one marked template only for omitted defaults. Supplied input is never marker-decoded. Fixed displayCopy is separate |
| Structural export | createStockJsonSchema preserves positional tuple types/cardinality for runtime-aligned structural and control item schemas. Semantic relationships remain separately enforced |
| MapClusterUnfold | Contraction finishes 82; exact grouped counts/coordinates hold through 99; expansion 99..139. Coincident positions retain intelligible counts throughout transition |
| MinimumCountMapSuppression | showLocalCounts=true keeps local analytical values readable, including small counts. Outgoing/public release remains sanitized and suppressed values stay concealed there |
| DashboardSlotAssembly | 40..64 docks the featured panel while supports resize/stage; 64..112 docks supports in staggered order. Frame 88 remains the final-docking witness |
| Seed storage and authored prose | Nonzero recorded loss alone permits a smooth temporary storage opening, closed before planting reopening at 101. Zero loss has no pulse. Choice/evidence prose consistency remains an author obligation, not natural-language validation |

R46 applies exactly to EntitySpineAssembly `observations[].id`,
RepeatingBlocksToTable `blocks[].id`, WideTableToObservations `subjects[].id`,
FilterSubscriptionScope `records[].id` and `views[].id`, MapClusterUnfold
`points[].id` and `clusters[].id`, SpatialGridBinning `points[].id`,
MinimumCountMapSuppression `cells[].id`, CoordinateFrameRegistration
`landmarks[].id`, TravelTimeNetworkFrontier `nodes[].id` and `roads[].id`, and
BoundedLocationDisplacement `locations[].id`. Their maximum is 12 characters,
with no new minimum or normalization. Exact references inherit the target bound,
and empty IDs/matching empty references remain valid under existing uniqueness
and membership rules. R47 separately applies the existing 18-character text
maximum to PublicationSnapshotSlice `table.columns[].id` and `table.rows[].id`;
selection/liveEdit references inherit it through membership.

The [catalog](../../motion-atlas/catalog-expansion.md) names the actual field paths
and limits. The [implementation evidence](../../motion-atlas/implementation-validation.md)
separates accepted source, historical process deviations, deferred findings and
pending final media. This is documentation reconciliation, not an extra source
change or a claim that every action frame remains continuously readable.

## Rulings 65/66 and current validation

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

The [exact rulings and costs](../../motion-atlas/implementation-rulings.md) and [durable record](../../motion-atlas/implementation-validation.md) retain the original failure, source reviews and assessor history. No new props, schema narrowing, publication or retrospective TDD completion is introduced.


## Historical delivered media and pending current-source verification: 2026-10-18

The [completed media record](../../motion-atlas/implementation-media-validation-498c717d.md) preserves 167 original decoded deliveries, 166 standalone posters, the separate HTTP preview, all retained findings and corrected custody/N6 prose at actual 498c/source 2ad identities. R67's isolated spatial-sampling correction is reported at e5aeb3e7c/source 38c12b84. R67 source/media verification and R68 complete unaffected-fixture continuity are now verified. Final whole-branch review remains pending; the dated final scoped record below supersedes earlier pending wording. No historical output is relabeled as latest. These documentation updates preserve prior approved contract wording, defaults, IDs, bindings and bounds.


## Final scoped source verification and evidence custody: 2026-10-18

R67 is closed at `e5aeb3e7cb83e23f12a9255df018e25a76cc8c0e`, stock source `38c12b84bbbe3ab14171946e12b702ceb0fe2e5805504015352b0f6bedf5fdb9`. Independent source review is spec compliant and quality approved with one deferred test-helper RO-RO Minor. The controller inspected 13 actual current images. Gallery playback covered 180 states, one wrap and zero errors. The fresh default MP4 passed the unchanged gate and independent silent H.264 1280x800/30fps/180-frame/six-second probe, completed 179 decoded callbacks and ended at six seconds with zero reported dropped frames. Dense current stills show 8/12/4; default holds show 2/5/3. No globally empty selection or schema widening was introduced.

R68 is satisfied: the strict three-file local diff and the complete 169-preset comparison retain 754 fixtures and 6,786 exact pre/post frame hashes. The full current 170-preset SVG harness passed. Unaffected outputs retain their actual historical source 2ad / HEAD 498c identities under this explicit versioned carry-forward. Only the changed preset's default MP4 is freshly rendered at source 38c. Finite screenshots and SVG equality do not establish uninterrupted pixels or fresh media for the other presets. All historical readability/transient concerns and the test-helper Minor remain for final whole-branch review, which is pending.

R69 keeps exact raw reports, callback/clock traces, session/capture material and full original-report envelopes ignored and in Downloads mirrors. Durable records retain compact per-preset/candidate outcomes, all findings/dispositions/narrative limits and source/configuration/media/report hashes with local evidence pointers. A fresh clone cannot inspect local pixels/session files directly. No original local evidence was deleted.

See [current scoped verification](../../motion-atlas/implementation-sampling-correction-controller-verification.json) and its linked compact continuity/delivery records.
