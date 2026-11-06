# Agent architecture: implementation and evidence

This assessment retains the five parts of the original architecture
recommendation and maps each former gap to its current implementation. The
foundation now includes a reusable scene library, real-app capture runner,
structured storyboard renderer, actual product component adapters, narration/caption tooling, and local assembly.
Implementation is distinct from verification: a source file, passing unit test,
successful app action, and reviewed finished film establish different facts.

The first seven films are delivered in the local Productions gallery.
The separate [Motion Atlas](stock-motion-library.md) contains 170 parameterized stock graphic
references, live previews, reusable scene integration, and individual MP4 loops.
[Pipeline validation](pipeline-validation.md) records the earlier capture-based films.
[Component validation](component-video-validation.md) records the rebuilt
React product films and their source, visual, render and audio boundaries.

**Claude Code or Codex remains the orchestrator.** This repository supplies
instructions and local commands, not a separate autonomous agent service,
request queue, model, or publishing system.

## Original gaps and current coverage

| Recommended part | Original missing work | Implemented sources and behavior | Verification boundary and remaining work |
| --- | --- | --- | --- |
| Shared scene library: graphs, flowcharts, counters, kinetic typography | Parameterized graph/flowchart/metric scenes, broader typography, consistent inputs | [src/scenes](../src/index.ts) adds graph, flowchart, metric, multiline typography, image/video and captions; [scene API](scene-api.md) defines explicit content/frame contracts | Geometry/formatting/timing tests exist. Contact sheets must still establish layout and readability for each actual plan. No automatic graph routing, generic chart system, or speech-driven word highlighting |
| Real product capture: Playwright drives Avandar and records screenshots/clips | Browser dependency, repeatable demo state, auth handling, capture manifest, media wrapper, real Avandar flows | [capture runner](../scripts/capture-avandar/capture-avandar.mjs), [capture helpers](../scripts/capture-lib.mjs), [flows](../capture-flows/avandar.mjs), [Case Manager/map flows](../capture-flows/cases-map.mjs), [fictional fixtures](../demo-data/README.md), and `MediaScene`; [capture curation](../scripts/curate-capture.mjs) verifies passed screenshot checkpoints and installs their evidence under `public/avandar/` | Runner lifecycle/guard tests use a fake browser. Product flows require successful local execution, asserted results, inspected screenshots and a finalized video; source availability alone is not browser verification. Native recording is 25 fps and action times are approximate |
| Plan first, then build | Stored storyboard tying shot order, scene props, duration, assets and narration together; validation and generic assembly | [strict schema and timeline](../src/storyboard/schema/schema.ts), [StoryFilm](../src/storyboard/StoryFilm/StoryFilm.tsx), [plan/export helpers](../scripts/lib/planHelpers.ts), and `video validate/plan/preview/render` | Schema and timeline tests exercise invalid inputs and cue conversion. Preview fingerprints bind actual plan/asset/renderer bytes, not human approval. The agent still researches, proposes, and reviews the story |
| Narration drives transcript and SRT | Structured text, recording import, alignment, transcript/SRT/VTT, captions, narration/SFX mixing, optional scratch TTS | Storyboard narration cues; [caption export and SRT import](../scripts/lib/planHelpers.ts); `CaptionOverlay`; [audio validation/mix](../scripts/lib/mediaHelpers.ts); `video tts` and `video align` in the [CLI](../scripts/video.ts) | Synthetic integration checks cover media timing and retained picture/audio. `align` imports supplied exact-text SRT; it is not speech recognition or forced alignment. macOS `say` produces labeled scratch speech. Listen to each finished film and check captions against its recording |
| Local Chromium and FFmpeg rendering | Connect capture/storyboard/audio stages and add output checks | [video CLI](../scripts/video.ts) orchestrates composed previews, existing [render.sh](../scripts/render.sh), unchanged [frame gate](../scripts/check-frames.mjs), and post-gate audio assembly | Single-worker rendering, matching-preview checks, duration/audio-signal/video-packet checks are implemented. The [library validation record](library-validation.md) documents a completed render and sampled inspection. Every delivery still needs its own matching evidence, visual inspection, listening review and recorded limitations |

The former gaps are no longer accurately described as entirely unimplemented.
The remaining distinction is between available tooling, a successful specific
capture, and a reviewed delivery. Keep run-level conclusions in the relevant
capture/render evidence and final validation record, rather than turning this
inventory into a blanket claim that every Avandar feature works.

## Upstream and workspace additions

| Origin | Contents |
| --- | --- |
| `agentic-product-demo` starter | Product-demo skill/references; pure motion helpers; TitleCard/chrome/pointer components; generic Demo; original theme/fonts; token adoption; still previews; JPEG/FFmpeg renderer; frame checks; synthesized SFX score path |
| Earlier Avandar workspace additions | TitleStudy and MotionLab; three-video local showcase and serving/render helpers; safe Remotion environment configuration; initial architecture/motion/scene inventories |
| Current pipeline additions | Five reusable scenes plus CaptionOverlay; strict storyboard schema; StoryFilm registration; plan/transcript/SRT/VTT exports; composed preview fingerprints; recorded narration import; local scratch TTS; validated narration/SFX mix; guarded Playwright capture and evidence manifests; hash-checked screenshot curation with replacement backups; Avandar flow scripts; deterministic Harborfield fixtures; product manual and evidence research |
| Still outside the implemented system | Autonomous hosted orchestration, publication, ASR/forced alignment, word-level caption highlighting, general graph/branch routing, inferred product claims, automatic proof of visual correctness, and automatic production-state cleanup |

The original palette and fixed starter examples remain separate from the new
capability study and product footage. Provenance is recorded in the
[README](../README.md#provenance). The [scene inventory](shared-scene-library.md)
lists all registered compositions and every reusable visual export.

## Local workflow and artifacts

| Stage | Inputs and implementation | Reviewable result |
| ---: | --- | --- |
| 1. Research and brief | [Agent manual](using-avandar.md), [Linear review](linear-feature-review.md), [product docs review](product-docs-review.md), [video priorities](video-priorities.md), product-demo skill | An evidence-based flow and shot list; distinguish marketed, source-inferred, runtime-observed, and unsupported behavior |
| 2. Prepare fictional data | [Generator](../demo-data/generate.py), [validator](../demo-data/validate.py), [manifest](../demo-data/manifest.json) | Five reproducible CSVs with provenance, stable relationships and hashes. Fixture validation does not establish successful product import |
| 3. Capture the real app | `npm run capture -- --flows ...`; unrecorded login and one authenticated recording page | Unique `out/captures/<run>/` with hashed fixtures, actions, feature status, checkpoints, video and sanitized failures |
| 4. Curate verified screenshots | `npm run capture:curate -- out/captures/<passed-run>`; inspect the actual images first | Verified screenshots and sanitized capture evidence under `public/avandar/`; an explicit `--replace` preserves the previous set in an output backup |
| 5. Author and validate a plan | `npm run video -- validate <plan.json>` and `plan`; media probing under `public/` | Parsed storyboard, props, readable shot list, transcript, SRT and VTT |
| 6. Prepare narration | `tts` for labeled macOS scratch speech, or `align --audio ... --srt ...` for a supplied recording | A derived plan with measured audio references and provenance; the source plan remains unchanged |
| 7. Preview the whole film | `preview` renders meaningful absolute frames, including transitions, captions and footage | Stills, contact sheet, labeled HTML index, and fingerprints for the plan, assets and renderer. Inspect them before rendering |
| 8. Render and assemble | `render` requires a matching preview, renders with concurrency 1, runs the original gate, then mixes audio | Checked silent picture, final MP4, poster and metadata. Successful audio assembly preserves encoded picture packets |
| 9. Review and select delivery files | Watch the actual film, listen to narration, verify claims/results and read captions | A delivery-specific validation record and intentionally selected evidence. Curated Avandar outputs may be tracked as approved shareable samples in this app; raw/session data remains ignored |

See [capture-pipeline.md](capture-pipeline.md) and
[video-pipeline.md](video-pipeline.md) for exact options, outputs, and failure
semantics. Screenshot curation does not edit or normalize capture video. The CLI does not
choose source trim points or automatically turn a capture manifest into a
product story. An agent selects verified shots,
normalizes/crops footage as needed, and records references in the plan.

## Boundaries that remain important

- **Captures and reconstructions are different evidence.** MediaScene can show
  actual images/video; a faithful React rebuild still requires reading the
  product's real markup, copy and tokens. Editorial graphs and synthetic records
  must never be presented as preexisting product UI or real observations.
- **Capture is local and preserves auth only in memory.** The runner blocks
  external Supabase, non-loopback mutations and external navigation/WebSockets,
  while allowing readonly asset requests. Service workers are disabled for
  interception. Trusted flow code must still use the supplied page; this is not
  a sandbox for arbitrary Node requests or a guarantee about local server proxies.
- **Capture time is not the film timebase.** Playwright's native source is 25 fps;
  storyboards and motion remain 30 fps. Capture action timestamps are useful
  search points, not frame-exact alignment. Verify normalized footage and trims.
- **Narration text is not speech verification.** Exports share the plan's exact
  text and cue timing. Manual SRT import checks text/cue consistency, and probes
  check audio duration. Neither proves the spoken words, performance or sync.
- **Picture and audio have distinct stages.** Legacy `render.sh` still creates
  silent picture. The storyboard pipeline adds narration and effects afterwards.
  Source media audio is muted unless deliberately supplied as an explicit track.
  Legacy `add-sfx.sh` remains a separate SFX-only path and is not the new mixer.
- **Quality checks have narrow claims.** The frame gate detects certain tiling
  and luminance/seam faults. Preview fingerprints prove input consistency;
  media checks prove streams/durations; the mix checks picture preservation and
  signal. Product fidelity, chart meaning, pointer placement, readability and
  speech intelligibility require actual inspection.
- **Local execution can still require downloads.** Dependencies, browser
  binaries, fonts and basemap assets may require network access. Rendering does
  not require a hosted rendering service; scratch TTS currently depends on macOS.

## Completion criteria retained from the original plan

| Original milestone | Implementation now available | Evidence still needed for a specific delivery |
| ---: | --- | --- |
| 1. Structured video brief/storyboard | Strict versioned schema, one timeline, shot-list exports | Review the intended flow and evidence notes before accepting its story |
| 2. Real capture plus media scene | Local runner, fixtures, product flows, verified screenshot curation, image/video/callout scene | Passing capture manifest, verified app results, inspected screenshots and usable finalized footage |
| 3. Extract shared scenes | Graph, flowchart, metric, typography, media, caption exports | Full-size previews at the actual film dimensions, including the caption band |
| 4. Recording and captions | Manual alignment/import, scratch voice, transcripts/subtitles, audio mix | A supplied or labeled scratch recording that fits, retained narration, listened-to output and checked cue sync |
| 5. End-to-end film | Local command path with mandatory existing gate and retained failure evidence | Completed library and product renders plus visual/audio review; finalize the validation document only after these runs |

A separate service, queue, or hosted UI is a later product decision if unattended
requests or multi-user concurrency become requirements. It is not necessary for
the implemented local workflow.

## Product component rendering

The six Avandar product plans now use the `avandar` scene. The source bridge
imports actual Avandar components and styles directly from the enclosing worktree, records
source hashes, and bundles it separately from the generic starter. Five
frame-driven adapters supply fictional fixture state, cursor targets measured
from rendered elements, typing, controlled chart updates, and native map
camera movement. [Component videos](component-videos.md) records the source
revision and service boundaries. Browser capture remains available for product
verification and workflows that need live backend behavior. Component films
do not themselves prove that a save or query executed against the product.

## Motion Atlas implementation: 2026-10-17

The runtime registry contains 170 strict content contracts and matching typed
renderers: 20 legacy entries plus 150 additions, split into 106 general and
64 social-sector entries. React, the storyboard `stock` scene, the gallery and
the motion CLI share one complete request schema. Omitted input resolves a cloned
localized fictional default. Supplied input is complete, exact and validated;
collection lengths, structured quantities and references drive the picture.
The gallery exposes nested controls, retains invalid drafts separately from the
last valid preview, and passes the identical validated content/palette to configured
JSON and download jobs. A creative brief or saved preset ID is not that payload.

Contracts, descriptors, schemas, controls and retrieval text remain renderer-free.
Motion descriptions and continuity catalogs are authored directly in YAML and
validated when loaded. Browser, CLI and renderer builds consume the same files,
without a separate catalog export. Optional marked default-span bindings keep localized text
and UTF-16 offsets aligned only for omitted input. Fixed renderer prose is distinct
from authored content. These interfaces do not implement document ingestion,
segmentation, extraction, embeddings, a vector index, ranking, automatic binding,
transcript processing or autonomous film generation.

The source is accepted and frozen at `02d6cfbb66577931dd7d7eb19f9c06ef5b1a431a`,
with stock source fingerprint
`2ad047077f26a17ebb71df914e02e1819860328e7229befc57360b202e0b21ae`.
Source acceptance is separate from final media acceptance, which remains pending
in this draft. The [durable implementation record](motion-atlas/implementation-validation.md)
preserves packet/review history, decisions, process deviations, deferred findings
and exact evidence boundaries. Product captures remain a separate kind of proof.

## Gallery content preservation follow-up

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

See the [durable implementation record](motion-atlas/implementation-validation.md) for full source history, findings and evidence limits.


## Historical delivered media and pending current-source verification: 2026-10-18

The [completed media record](motion-atlas/implementation-media-validation-498c717d.md) preserves 167 original decoded deliveries, 166 standalone posters, the separate HTTP preview, all retained findings and corrected custody/N6 prose at actual 498c/source 2ad identities. R67's isolated spatial-sampling correction is reported at e5aeb3e7c/source 38c12b84. R67 source/media verification and R68 complete unaffected-fixture continuity are now verified. Final whole-branch review remains pending; the dated final scoped record below supersedes earlier pending wording. No historical output is relabeled as latest. These documentation updates preserve prior approved contract wording, defaults, IDs, bindings and bounds.


## Final scoped source verification and evidence custody: 2026-10-18

R67 is closed at `e5aeb3e7cb83e23f12a9255df018e25a76cc8c0e`, stock source `38c12b84bbbe3ab14171946e12b702ceb0fe2e5805504015352b0f6bedf5fdb9`. Independent source review is spec compliant and quality approved with one deferred test-helper RO-RO Minor. The controller inspected 13 actual current images. Gallery playback covered 180 states, one wrap and zero errors. The fresh default MP4 passed the unchanged gate and independent silent H.264 1280x800/30fps/180-frame/six-second probe, completed 179 decoded callbacks and ended at six seconds with zero reported dropped frames. Dense current stills show 8/12/4; default holds show 2/5/3. No globally empty selection or schema widening was introduced.

R68 is satisfied: the strict three-file local diff and the complete 169-preset comparison retain 754 fixtures and 6,786 exact pre/post frame hashes. The full current 170-preset SVG harness passed. Unaffected outputs retain their actual historical source 2ad / HEAD 498c identities under this explicit versioned carry-forward. Only the changed preset's default MP4 is freshly rendered at source 38c. Finite screenshots and SVG equality do not establish uninterrupted pixels or fresh media for the other presets. All historical readability/transient concerns and the test-helper Minor remain for final whole-branch review, which is pending.

R69 keeps exact raw reports, callback/clock traces, session/capture material and full original-report envelopes ignored and in Downloads mirrors. Durable records retain compact per-preset/candidate outcomes, all findings/dispositions/narrative limits and source/configuration/media/report hashes with local evidence pointers. A fresh clone cannot inspect local pixels/session files directly. No original local evidence was deleted.

See [current scoped verification](motion-atlas/implementation-sampling-correction-controller-verification.json) and its linked compact continuity/delivery records.


## Continuity compositions

Continuity is implemented as a strict StoryFilm scene and a linked Composition Atlas. The schema, overlap timing, nested product build/fingerprint detection, beat-relative cue resolution, source-backed adapters, and live catalog entries share the existing preview/export pipeline. Verification distinguishes authored live compositions from generated exports. See [continuity compositions](continuity-compositions.md) for the API, film matrix, editorial guidance and evidence limits.
