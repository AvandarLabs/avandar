# Completing the video-agent foundation

The objective is a repeatable local path from a reviewed product story to real Avandar footage, reusable explanatory scenes, narration, captions, and a checked MP4. Claude Code or Codex remains the orchestrator. The existing starter demos and their palette stay intact.

## Evidence and video selection

Review the complete accessible Linear issue set, including archived completed work, against the product documentation and current source. Verify the chosen actions in the running local app before calling a feature demonstrated. A completed ticket, a design document, and an action that succeeds in the browser are different kinds of evidence.

The initial narrative follows a fictional response-coordination team: import a coherent dataset, investigate a question, organize dataset-backed records, communicate findings in a dashboard, and inspect geographic patterns. Public marketing follows Connect, Explore, Share. Case management and GIS need explicit capability boundaries because parts of their workflows or release status remain incomplete. Detailed evidence and priorities belong in [linear-feature-review.md](linear-feature-review.md), [product-docs-review.md](product-docs-review.md), and [video-priorities.md](video-priorities.md).

## Workstreams and acceptance criteria

| Order | Workstream | Deliverables | Verification |
| ---: | --- | --- | --- |
| 1 | Product research and reusable data | An agent user manual, evidence-backed video priorities, deterministic fictional CSV/geographic fixtures with provenance and a manifest | Inventory reviewed docs/issues, validate types/relationships/counts, import the fixtures through the app |
| 2 | Structured storyboards | A versioned schema for ordered shots, typed scene props, timing, evidence notes, narration cues, and audio assets; a readable shot-list export | Reject invalid timing, references, duplicate IDs, unsafe paths, and malformed scene inputs; derive a single timeline |
| 3 | Shared scenes | Graph, flowchart, metric, multiline typography, screenshot/video, callout, and caption components | Typecheck, meaningful layout/formatting tests, rendered contact sheets, explicit reusable API documentation |
| 4 | Real app capture | Headless Playwright flows for import, explorer, dataset-backed Case Manager, dashboards, and maps; screenshots/video plus capture manifest | Use the local test account, operate through the UI, assert visible results, retain asset hashes and action timestamps, exclude auth/session secrets |
| 5 | Narration and captions | Shared cue data exported to transcript, SRT, and VTT; recorded-audio import/alignment; local scratch speech; narration/SFX assembly | Validate cue bounds, probe audio length, preserve narration in the mix, check final duration and audio stream |
| 6 | Local assembly and review | Commands for validation, planning, previews, render, audio assembly, and output checks; sample films with reproducible inputs | Preserve single-worker rendering and existing frame thresholds, inspect contact sheets, watch representative sections, record limitations |

Independent research and scene implementation can proceed together. Product capture depends on validated fixture files and observed UI flows. The final product film depends on those captures, the storyboard, and the reusable scene renderer. Audio assembly follows a successful picture render so it cannot silently discard narration.

## Initial output scope

- A library study demonstrates the new scene interfaces without claiming to be Avandar UI.
- A product walkthrough uses actual captured screens and only browser-verified actions. Its final shot holds the completed result long enough to read.
- Separate feature storyboards cover the five requested areas so future videos can reuse the same assets and data.
- Scratch speech is explicitly labeled. Human narration can replace it using the same cue data; timing is measured or supplied, never presented as automatically aligned without evidence.

All generated test inputs live in `demo-data/` alongside their generator and provenance for versioning. Raw intermediate frames and transient capture logs remain ignored; authentication state stays in memory and is never written to disk. No global installation is planned; project dependencies and existing platform speech tools are documented in the README.

## Review boundaries

Preserve the generic starter compositions. Use captured product UI instead of inventing screens, labels, results, or feature availability. Synthetic records are deliberately fictional inputs, authorized for this demo, and must be labeled accordingly. Do not call AI-backed flows deterministic if they depend on a live provider. Do not depict unfinished assignment, comment, status, sync, or publishing behaviors as working without checking the actual route.

Implementation and validation results will be recorded in [pipeline-validation.md](pipeline-validation.md), with remaining product limitations distinguished from missing video-tooling work.
