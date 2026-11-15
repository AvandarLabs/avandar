# Motion Atlas expansion design

**Status:** Auto-approved design dated 2026-10-16, reconciled with accepted implementation on 2026-10-17. All 150 additions and 20 legacy parameterizations are implemented. Source and versioned media evidence are complete. Implementation and review are complete; final artifact QA is separate. The [final closure](../../motion-atlas/implementation-final-closure.md) records HEAD76f3/source9eaa and retained limits. Historical inspection and design decisions below retain their original dates and scope.

**Owner:** Codex coordinating for Pablo. **Date:** 2026-10-16. **Branch:** `feat/motion-catalog`.

## Outcome

Expand Motion Atlas from 20 to 170 distinct stock animations. The accepted addition now contains 150 items: 86 general/technology and 64 social-sector. The first 100 retain the original 40 + 60 milestone and stable order. The source review adds 50 distinct explanations and enriches 21 existing proposals plus 1 legacy entry without counting them again. Including the existing 20, the implemented atlas contains 106 general/technology and 64 social-sector presets. Every addition has a stable ID, title, description, creative direction, Good for examples, retrieval vocabulary, bounded serializable props, fictional defaults, a document-to-props example, and semantic limitations.

The implementation makes the catalog usable through React, JSON storyboards, live gallery controls, and matching MP4 downloads. The versioned renderer-free metadata export is implemented for a future retrieval consumer. Document ingestion, segmentation, embeddings computation, vector storage, ranking, transcript alignment, and autonomous film generation are excluded.

## Decisions from the brief

- The initial request contains conflicting counts: eight agents versus five plus five. Use eight initial proposal assignments of ten items each, four covering general explanation/information work and four covering social-sector processes. Follow with additional assignments of at most ten proposals until deduplication leaves exactly 40 + 60. Never use category labels in worker prompts that bias them away from general rhetorical ideas.
- The environment permits the coordinator plus three simultaneous workers. Dispatch the eight assignments in waves, without pretending eight workers ran concurrently.
- The user confirmed that this turn stops at catalog, spec, and plan. Animation implementation workers will use `reasoning_effort: "xhigh"`, `fork_turns: "none"`, and explicit scoped context in the subsequent execution.
- The subsequent request authorizes three xhigh source-review workers: business plan, values, and architecture. It removes no original items and imposes no second-round quota. Retain only distinct visual actions and fold covered themes into existing definitions. This source expansion is still planning work.
- The user selected recognizable world geography with fictional markers and schematic local maps for routing and service areas.
- Preserve the current visual language: restrained dark SVG studies, explicit frame timing, readable type, authored secondary colors, configurable accent/background, six-second loops.
- A new item must add an explanatory action. Changing a pipeline's labels to vaccine stages does not produce a distinct catalog item.

## Current system, inspected

Source inspection covered `src/stock/catalog.ts`, `StockGraphic.tsx`, `StockCompositions.tsx`, `graphics-common.tsx`, the existing stock families, `src/scenes/StockScene.tsx`, the gallery and preview dialog, storyboard stock schema, the motion CLI, and showcase download paths. The live gallery at `http://127.0.0.1:4173/motion.html` exposes all 20 entries. Its expanded Connected entities preview was inspected at frame 90. Screenshots accompany this design's Downloads copy.

| Existing contract | Consequence for the expansion |
| --- | --- |
| `StockEntry` contains name, description, tags, useWhen, prompt and loopFrames | Preserve these fields while adding explicit direction, input schema, semantic intent and retrieval metadata |
| `StockGraphic` selects a renderer from a 20-entry map | Retain the single browser/Remotion rendering path and introduce a typed registry |
| `GraphicProps` carries frame, accent, background and scoped SVG id | Add typed content per preset without leaking browser state into renderers |
| Fixed 960 x 600 viewBox, 180 frames, 30 fps | Keep defaults and fit supported content within this canvas |
| Content lives inside each renderer | Extract defaults and expose meaningful content controls |
| Storyboard stock props accept only preset, accent and heading | Extend the strict schema with preset-specific content and background |
| Gallery downloads carry accent/background only | Carry the identical validated content snapshot through preview, brief, job and export |
| Gallery has search, deep links, saved references and reduced-motion support | Extend these behaviors and derive counts from the catalog |
| Motion CLI fingerprints only top-level stock source files | Recursively include stock modules, local geography and canonical content in preview/export fingerprints |

Existing IDs remain stable. Existing briefs and storyboards that supply only `preset` keep their current illustrative defaults and timing. The original demo, product adapter films, application components, and palette are outside this change.

## Chosen architecture

| Approach | Strength | Limitation | Decision |
| --- | --- | --- | --- |
| Typed preset registry with shared geometry and primitives | Strong content contracts and distinct choreography | More contract and fixture work initially | Adopt |
| Universal diagram/layout engine | Broad generic configurability | Encourages repetitive visuals and expands routing scope | Do not build |
| Independent components with unrelated prop conventions | Fast first illustrations | Fragile retrieval, controls and exports | Do not adopt |

Keep five concerns separate: metadata, input contracts/defaults, deterministic rendering, gallery editing, and rendering orchestration. Shared primitives supply mechanisms such as person glyphs, bounded text, route geometry, proportional bands and world projection. They do not replace the animation's own visual argument.

### Preset definition

One definition per stable ID owns:

- `id`, `schemaVersion: 1`, `metadataVersion` (starting at 1, incremented for catalog revisions), and `collection`: `general` or `social-sector`. Collection is for accounting and filtering, not the renderer type.
- Existing display fields `name`, `description`, `category`, `tags`, `useWhen`, `prompt`, and `loopFrames`.
- `creativeDirection`, `goodFor`, `intent`, `domains`, `aliases`, `notFor`, `motionBeats`, and `distinction`.
- A strict Zod `inputSchema`, inferred TypeScript `Input`, a complete fictional `defaultInput`, form `controls`, binding examples, and fixture variants.
- Its React renderer accepting the shared frame/palette/id context plus that preset's resolved `input`.

The accepted catalog JSON is the design reference. During implementation, convert its declared input types and constraints into strict schemas, with defaults stored once beside the schema. Generate runtime-facing metadata exports from the definitions. Do not independently maintain a JSON Schema and a Zod schema.

Use a discriminated union keyed by `preset` at all external boundaries. Preserve the relationship between the chosen preset and its input type in the public React API. Internally, dispatch through definition closures so a generic wrapper does not erase the relationship by casting to `any`.

### Serializable content and counts

All inputs are JSON values: bounded strings, finite numbers, booleans, enums, arrays and plain objects. No JSX, functions, Date instances, runtime code, HTML, CSS strings, arbitrary URLs, or remote assets. Visible authored labels are configurable. The fixed illustrative-data notice and UI controls are translated display copy.

Collections own their counts. `nodes.length`, `edges.length`, `recipients.length` or `stages.length` determines what renders. A gallery count stepper edits the collection through Add/Remove operations; it does not create a second contradictory `nodeCount` field. Stable IDs distinguish items and validate references. Schemas reject duplicate IDs, missing edge endpoints, references to removed items, self-links where unsupported, and impossible numerical values. Cohort arrays and quantitative inputs must have documented units, denominators and conservation rules.

For input resolution, omission of the entire `input` uses the complete default example. A supplied `input` must satisfy its schema. Do not deep-merge arbitrary partial nested structures with fictional defaults. Fields explicitly optional in a preset's schema may have documented defaults. This avoids silently mixing a real scenario with invented people, quantities or edges.

Strings have preset-specific length limits and deterministic line wrapping. No silent truncation of meaningful labels and no shrinking type below the tested minimum to rescue excess content. Invalid gallery drafts stay in the editor with field-specific errors; the preview keeps its last valid state and exports are disabled until the draft is valid. CLI/storyboard errors fail with the preset ID and exact input path.

### Reuse and motion

Each new preset has its own component, contract and choreography. Prefer reuse of `Text`, `Panel`, `DrawPath`, `Arrive`, `Packet`, and the pure helpers in `src/motion.ts`. Add narrow primitives only when multiple accepted presets need them. Keep primitives independent of Remotion and DOM measurements.

Frames 0 and 179 return to the same opaque ground through the existing envelope. Typical choreography: establish at 12-35, explain the transformation at 36-119, hold the resolved relationship at 120-167, and exit through 168-179. Presets may choose different internal beats when needed, but complete their meaning before the reading hold. Arrays at their maximum supported size must still finish in time. Do not multiply reading speed with item count.

Every renderer is deterministic under seeks in any order. No timers, CSS animations, unseeded randomness, network calls, browser clocks or effects to advance the artwork. Scoped SVG defs prevent collisions when many copies share a page. Freeze illustration geometry and text size between frames unless movement is the semantic point.

### Geography and social-sector semantics

Use a local, licensed simplified land-outline asset for a recognizable globe. Record its source, version, checksum, transformation and license. Render an orthographic sphere with correct front/back clipping and project marker positions from longitude/latitude. Avoid political borders unless deliberately included and sourced. Fictional conflict markers are X-shaped location markers, never crosses through people. Their labels and event type are replaceable. They must not suggest current real conflicts.

Local maps use normalized authored coordinates and explicit schematic labels. Routing follows supplied paths and constraints. GIS intersections, catchments and allocation overlays use deliberately bounded polygons or cells. Do not imply a real travel-time solver, a real epidemiological model or an automated eligibility decision. Quantitative scenes draw supplied results and label illustrative defaults.

Human figures represent people with agency. Support receipt, consent, feedback and participation can be shown without portraying populations as passive anonymous targets. Do not assign danger, disease, poverty or conflict status to identity groups. Do not present a symbolic token as a measured person unless the legend explicitly defines the token scale.

No medical treatment recommendations, claimed intervention efficacy, real beneficiary locations or product capabilities are inferred. Carbon storage, emissions avoided and carbon removal remain distinct quantities with visible units and boundaries. Disease counts, exposure, suspected cases and confirmed cases remain distinct authored states.

### Search and future embeddings

Export one versioned record per preset containing its ID, title, descriptions, intent, Good for examples, domains, aliases, limitations, structured input schema, controls and binding examples. `buildStockSearchText` produces deterministic plain text from semantic fields in a documented order. Exclude palette hex values, random IDs, literal fixture counts and incidental fictional names from the semantic text.

`contentHash` covers canonical serialized metadata, schema and defaults. `searchTextHash` covers only semantic retrieval text. A future index can re-embed text only when `searchTextHash` changes while still invalidating schema/default caches through `contentHash`. Hashing happens in the guarded Node exporter, not inside animation code. Stable IDs are not hashes and do not change with revisions.

Examples record a source sentence and explicit field bindings. They demonstrate the future contract; they do not claim a parser exists. Export structural JSON Schema plus explicit semantic rules. Reference, arithmetic and bound rules run in the runtime validator; prose truthfulness and source interpretation require author review. A future matcher must return `{preset, schemaVersion, input}` and validate it before rendering. Ambiguous or insufficient source evidence requires author input, not invented facts. Keep `notFor` and neighboring-concept distinctions available for later reranking.

### Source-derived concepts and provenance

The [source expansion ledger](../../motion-atlas/source-expansion-ledger.md) records coverage, candidate decisions, source hashes and locators. The business-plan and values PDFs remain in the personal vault. Architecture inputs are read-only repository documents and narrowly scoped source inspections. Their wording may describe a current implementation, a proposal, a principle or an inferred metaphor. Source status never becomes proof that the product ships the depicted behavior.

Keep `sourceRefs`, `proposalSources`, `mergedFrom`, coordinator decisions, source paths, hashes and review notes in planning artifacts only. They are not renderer inputs, translated display copy, runtime catalog exports or embedding text. Use an explicit runtime metadata allowlist, never object spreading the design JSON into a runtime definition. A provenance-only edit must not change runtime `contentHash` or `searchTextHash`; semantic, schema or default edits do change the appropriate hash.

The schema-only remote-planning scene is one selectable architecture. It shows a question and structural metadata leaving, followed by a plan that executes locally. It does not claim that every AI workflow is data-free: prompts can contain sensitive terms, and other paths may deliberately share samples or excerpts. Local-model inference, selective disclosure and schema-only remote planning remain separate explanations with distinct boundaries.

New algorithmic scenes use small, auditable input domains. Examples include integer byte ranges, cache-column set unions, exact grouped-value rules, permission grant reduction, record-grain preservation, bounded document geometry and supplied spatial costs. Implement the specified arithmetic and selection rules as pure functions beside each preset. Do not introduce a general SQL engine, PDF parser, access-control engine, geocoder, routing service or live AI pipeline merely to animate the concept. New shared helpers require at least two concrete users and focused behavioral tests.

### Gallery and export behavior

Retain the current gallery layout and expanded player. Add a Content section to the reference rail with schema-backed controls: text, boolean, enum, number and bounded collection editing. For structured matrices and graph references, use purpose-built nested field editors rather than an opaque universal JSON textarea. Include Reset example and Copy configured props. Keep edited content per preset for the current visit; saved reference IDs keep their existing behavior. Do not persist arbitrary document-derived content in localStorage.

Search includes intent, aliases, Good for and domains. Provide collection and category filters with dynamic counts. All 170 entries remain deep-linkable; avoid mounting expensive offscreen SVGs until near the viewport. Preserve the single playback clock, reduced-motion pause, dialog focus trap, Escape close and focus restoration. Content changes at a paused frame remain visible without restarting the timeline.

Every selected value must propagate through `StockGraphic`, `StockScene`, `StockCompositions`, `FilmComposition`, `loadFilm`, copied briefs and MP4 jobs. Export a frozen validated snapshot even if the user edits afterward. Export keys and preview fingerprints include canonical input, palette, timing, renderer dependency bytes and local assets. Preview manifests are keyed by configuration and source hash so default and dense evidence coexist. Metadata/module changes nested below stock directories must invalidate stale previews. The running export server must also load fresh nested contracts: cache-busting only catalog.ts leaves its imported modules cached. Build a metadata/schema-only Node bundle keyed by the contract dependency hash and import that immutable generation for each request. Arbitrary colors retain current authored secondary-color limitations.

## Compatibility and implementation boundaries

- All implementation files stay under `apps/ava-video-producer/`. Product source is read-only. No database, Supabase, Vercel, production service or outbound email work.
- Preserve `remotion.env`, the shared license guard, existing CLI operations, on-demand downloads, ignored output directories and the unchanged frame gate.
- All rendering uses `--concurrency=1`. Do not parallelize Chromium rendering across workers.
- New visible frontend copy follows Lingui. Content supplied by an author is already localized content; do not translate it a second time. Static metadata uses plain serializable message descriptors, and contracts explicitly identify visible default-text paths. A guarded generator produces the shared compiled English catalog. Shared stock modules contain no Lingui macros and do not translate during import; a DOM-free resolver supplies localized defaults only when input is omitted. Gallery UI macros compile in its own build. Node, Remotion and gallery therefore consume the same resolved English defaults while author-supplied inputs remain untouched.
- Use current installed React, Remotion, Zod and esbuild dependencies. No vector database, embedding SDK, map service, hosted renderer, or general layout package is required.
- Keep legacy entries recognizable while extracting their existing content into props. Their existing IDs and default labels remain intact. Enrich their metadata and controls without counting them as new ideas.

## Acceptance criteria

1. Exactly 150 accepted additions: 86 general/technology and 64 social-sector. Exactly 170 registered runtime presets after implementation. Preserve the original 100 IDs and packet order. No duplicate IDs or semantic reskins counted as separate items.
2. Each new item has complete metadata, bounded configurable inputs, meaningful toggles, complete defaults, at least one valid binding example and a unique visual explanation.
3. Every configured input changes the claimed visible behavior. Runtime validation rejects unsupported values rather than rendering misleading or nonfinite artwork.
4. Legacy preset-only calls remain valid. Gallery preview, copied JSON, storyboard, CLI and download show the same content and palette.
5. Every preset passes deterministic SVG checks, input boundary tests, graph/reference checks where relevant, seek tests and scoped-ID checks. Behavioral assertions verify distinctive before/after states, not merely component existence.
6. All new presets receive contact-sheet review at 0, 18, 36, 90, 150 and 179 plus their decisive beat. Review defaults and a dense/long-label variant. Inspect continuous live playback for each default. Render and gate each default sequentially when execution is authorized; preserve evidence per preset.
7. Keyboard controls, screen-reader field names/errors, reduced motion, search, filters, deep links, reset, configured copying and matching downloads pass focused browser checks, including a narrow viewport.
8. Metadata export validates schemas/defaults/examples, contains 170 stable IDs, and yields stable hashes for unchanged canonical content. No embedding API calls occur.
9. Documentation reports implementation and actual verification separately. Do not describe planned coverage or a generated contact sheet as a visually approved animation.

## Inspiration, not borrowed assets or data

The social-sector collection uses intervention processes as creative prompts. The following primary sources were read on 2026-10-16; no source statistics, logos, footage or beneficiary data are incorporated into defaults.

- [WFP: Supply chain for cash transfers](https://www.wfp.org/supply-chain-for-cash-transfers) describes assistance choices, retail availability and local supply-chain support. These suggest market replenishment, voucher redemption and household-choice animations.
- [WHO: Catch-up vaccination](https://www.who.int/teams/immunization-vaccines-and-biologicals/essential-programme-on-immunization/implementation/catch-up-vaccination) includes catch-up vaccination materials and video lessons. These suggest missed-dose and return-to-service explanations, without prescribing schedules.
- [UNICEF: Climate action for children](https://www.unicef.org/take-action/campaigns/climate-action) connects climate exposure, services, education and participation. These suggest school continuity, resilient services and community action.

## Deliverables and status boundary

The accepted reference lives in `docs/motion-atlas/catalog-expansion.json` and its readable companion `catalog-expansion.md`. The proposal ledger preserves the initial rounds and the source expansion. Three source JSON inventories, coordinator decisions and the source coverage ledger record how source-derived concepts were accepted, merged, already covered or excluded. The execution plan lives beside this spec under `docs/superpowers/plans/2026-10-16-motion-atlas-expansion.md`.

These are planning artifacts. The live catalog stays at 20 until the implementation plan is executed. Downloads copies are conveniences; the worktree documents remain authoritative.

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
