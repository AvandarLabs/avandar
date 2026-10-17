# Agent architecture: implementation and evidence

This assessment retains the five parts of the original architecture
recommendation and maps each former gap to its current implementation. The
foundation now includes a reusable scene library, real-app capture runner,
structured storyboard renderer, actual product component adapters, narration/caption tooling, and local assembly.
Implementation is distinct from verification: a source file, passing unit test,
successful app action, and reviewed finished film establish different facts.

The first seven films are delivered in the local Productions gallery.
The separate [Motion Atlas](stock-motion-library.md) adds 20 stock graphic
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
| Shared scene library: graphs, flowcharts, counters, kinetic typography | Parameterized graph/flowchart/metric scenes, broader typography, consistent inputs | [src/scenes](../src/scenes/index.ts) adds graph, flowchart, metric, multiline typography, image/video and captions; [scene API](scene-api.md) defines explicit content/frame contracts | Geometry/formatting/timing tests exist. Contact sheets must still establish layout and readability for each actual plan. No automatic graph routing, generic chart system, or speech-driven word highlighting |
| Real product capture: Playwright drives Avandar and records screenshots/clips | Browser dependency, repeatable demo state, auth handling, capture manifest, media wrapper, real Avandar flows | [capture runner](../scripts/capture-avandar.mjs), [capture helpers](../scripts/capture-lib.mjs), [flows](../capture-flows/avandar.mjs), [Case Manager/map flows](../capture-flows/cases-map.mjs), [fictional fixtures](../demo-data/README.md), and `MediaScene`; [capture curation](../scripts/curate-capture.mjs) verifies passed screenshot checkpoints and installs their evidence under `public/avandar/` | Runner lifecycle/guard tests use a fake browser. Product flows require successful local execution, asserted results, inspected screenshots and a finalized video; source availability alone is not browser verification. Native recording is 25 fps and action times are approximate |
| Plan first, then build | Stored storyboard tying shot order, scene props, duration, assets and narration together; validation and generic assembly | [strict schema and timeline](../src/storyboard/schema.ts), [StoryFilm](../src/storyboard/StoryFilm.tsx), [plan/export helpers](../scripts/lib/plan.ts), and `video validate/plan/preview/render` | Schema and timeline tests exercise invalid inputs and cue conversion. Preview fingerprints bind actual plan/asset/renderer bytes, not human approval. The agent still researches, proposes, and reviews the story |
| Narration drives transcript and SRT | Structured text, recording import, alignment, transcript/SRT/VTT, captions, narration/SFX mixing, optional scratch TTS | Storyboard narration cues; [caption export and SRT import](../scripts/lib/plan.ts); `CaptionOverlay`; [audio validation/mix](../scripts/lib/media.ts); `video tts` and `video align` in the [CLI](../scripts/video.ts) | Synthetic integration checks cover media timing and retained picture/audio. `align` imports supplied exact-text SRT; it is not speech recognition or forced alignment. macOS `say` produces labeled scratch speech. Listen to each finished film and check captions against its recording |
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
