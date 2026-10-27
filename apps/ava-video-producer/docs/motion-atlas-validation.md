# Motion Atlas validation

## Historical 20-preset edition

The following record describes the earlier 20-preset edition. Its checks,
tracked delivery paths and media conclusions do not certify the expanded source.


This edition delivers all 20 presets in the [stock catalog](stock-motion-library.md),
with a live gallery, storyboard integration, MP4s, posters, and per-export
provenance. The files under `showcase/assets/motion/` are intentional tracked
deliverables. No product capture, credentials, or customer records were used.

### Completed checks

| Check | Result |
| --- | --- |
| Source and tool TypeScript checks | Passed with `npm run typecheck` |
| Repository test suite | 51 passed, including eight new stock tests |
| Catalog/renderer coverage | All 20 stable IDs render; schema accepts only known presets and six-digit hex accent overrides |
| Deterministic seeking | Every preset tested at 11 out-of-order/boundary frame values; finite SVG output and repeatability verified |
| SVG isolation | 40 simultaneous instances tested for unique definitions and locally resolved mask/gradient references |
| Storyboard example | `storyboards/motion-reference.json` validates as three stock shots, 540 frames, 18 seconds |
| Composed previews | Six sampled frames per preset: 0, 18, 36, 90, 150, 179. Contact sheets inspected; revised chart transition rechecked |
| Picture render | All 20 passed the unchanged tiling/luminance/loop gate; one Chromium render worker |
| Delivered media | Each file has 180 frames, 30 fps, 1280 × 800, six seconds, silent H.264; 3,600 delivered frames total |
| Artifact integrity | All delivered video hashes match their records and all records match current stock preview fingerprints; poster hashes checked separately |
| Encoded-frame inspection | Frames 45 and 135 decoded from every delivered MP4 and inspected as five contact sheets, 40 actual delivery frames |
| HTTP delivery | All 20 MP4 URLs returned 200; a byte-range request returned 206 with the requested 1,024 bytes |
| Native playback | All 20 reached `ended` in Chromium at 8× for the compatibility check, with six-second duration, correct dimensions, and no media errors |
| Gallery build | `npm run motion:build` generates the checked-in bundle from the shared renderer; no external runtime assets or fonts |

The eight stock tests cover periodic helpers, loop boundaries, invalid timing,
catalog alignment, strict scene inputs, command selection, deterministic SVG,
and isolated SVG IDs. The automatic frame gate cannot establish meaning or
visual quality; sampled inspection and actual interaction checks provide
separate evidence. The accelerated playback check establishes decoder/browser
compatibility, not a full-speed editorial review of every frame.

### Gallery interaction review

Verified at 1440 × 1000 and 390 × 844 with no horizontal page or dialog overflow:

- Twenty actual animated SVG previews, category filtering, search, and the empty
  search state.
- Large previews, play/pause, restart to frame zero, frame scrubbing, and accent
  selection. Default MP4 palette remains mint and is labeled explicitly.
- Stable direct links, including `#source-merge` and `#plexus-field`.
- Individual creative-brief/link copying, saved references, combined brief
  copying, persistence across reload, and clearing the tested references.
- Escape closes the modal and restores focus. Tab and Shift+Tab wrap between
  the dialog's first and last controls.
- Reduced-motion startup pauses previews; a runtime preference change pauses
  an open preview. Manual play/pause works. Offscreen cards stop advancing.
- Mobile category navigation, readable card layout, and a scrollable dialog.

The gallery does not alter source files when changing a preview accent or saving
a reference. Saved selections live in browser storage. Its copyable IDs and
briefs are the portable way to communicate a selection to a future video agent.

### Changes made during review

The ranking chart initially overprinted labels during row crossings. Row labels
and values now fade out before movement and return after settling, while a fixed
color legend identifies all four series. Cohort Matrix now shows 100 discrete
examples with 64 selected; its counter follows the reveal. The scanner completes
one pass and holds before the loop fade. Catalog descriptions were reconciled
with the actual event bus and metric graphics. Gallery metadata was moved out
of the artwork, and the redundant modal overlay was removed.

The full application render entry stalled during browser setup. Stock exports
now use `src/stock-entry.tsx` and an empty public directory, avoiding unrelated
product assets and font-loading dependencies. The final isolated run completed
all 20 exports. The exact cause of the earlier setup stall was not established.
The original frame thresholds and one-worker render requirement remain intact.

### Evidence and limits

Each `showcase/assets/motion/<preset-id>.json` records the renderer fingerprint,
video/poster SHA-256 hashes, dimensions, duration, frame count, generation time,
and gate result. Current previews and render logs remain in ignored `out/motion/`;
decoded delivery samples are in `out/motion/delivery-review/`. These transient
review files are not required to browse the checked-in gallery.

All content is conceptual or fictional. Presets have fixed sample content, a
primary accent override, and a six-second fade-to-ground loop. They are not
general graph-layout solvers, editable chart builders, real product behavior,
transparent overlays, or sound effects. The existing parameterized scenes and
actual capture pipeline remain available for evidence-based product films.

## Expanded 170-preset source: 2026-10-17

All 150 additions and 20 legacy parameterizations are implemented, with 106 general
and 64 social-sector entries. Source review is accepted at
`02d6cfbb66577931dd7d7eb19f9c06ef5b1a431a`; the frozen stock source fingerprint is
`2ad047077f26a17ebb71df914e02e1819860328e7229befc57360b202e0b21ae`.
The [implementation record](motion-atlas/implementation-validation.md) describes
the accepted source checks and [per-preset ledger](motion-atlas/implementation-evidence.json).
The [full rulings](motion-atlas/implementation-rulings.md),
[canonical findings](motion-atlas/implementation-findings.json) and
[supplement](motion-atlas/implementation-findings-supplement.json) preserve decisions,
costs, process limitations and unresolved review work.

**Original media remains historical. Scoped current-source verification is complete; final whole-branch review is pending.** The [historical media record](motion-atlas/implementation-media-validation-498c717d.md) preserves 150 default and 16 configured CLI MP4s plus 1 real HTTP L3 download, all decoded playback/inspection reports,166 standalone posters and the separate HTTP preview. R67 changed-scene verification and R68 continuity are verified below; whole-branch review remains pending. Earlier mocked Blob and20-preset checks retain their own scope. Exact-byte R63 mappings may carry earlier sampled
observations only after a fresh source-bound preview and complete request/seven-JPEG
comparison; historical source identities and original reports remain intact.

## Expanded-source browser observations

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


## Final scoped source verification and evidence custody: 2026-10-18

R67 is closed at `e5aeb3e7cb83e23f12a9255df018e25a76cc8c0e`, stock source `38c12b84bbbe3ab14171946e12b702ceb0fe2e5805504015352b0f6bedf5fdb9`. Independent source review is spec compliant and quality approved with one deferred test-helper RO-RO Minor. The controller inspected 13 actual current images. Gallery playback covered 180 states, one wrap and zero errors. The fresh default MP4 passed the unchanged gate and independent silent H.264 1280x800/30fps/180-frame/six-second probe, completed 179 decoded callbacks and ended at six seconds with zero reported dropped frames. Dense current stills show 8/12/4; default holds show 2/5/3. No globally empty selection or schema widening was introduced.

R68 is satisfied: the strict three-file local diff and the complete 169-preset comparison retain 754 fixtures and 6,786 exact pre/post frame hashes. The full current 170-preset SVG harness passed. Unaffected outputs retain their actual historical source 2ad / HEAD 498c identities under this explicit versioned carry-forward. Only the changed preset's default MP4 is freshly rendered at source 38c. Finite screenshots and SVG equality do not establish uninterrupted pixels or fresh media for the other presets. All historical readability/transient concerns and the test-helper Minor remain for final whole-branch review, which is pending.

R69 keeps exact raw reports, callback/clock traces, session/capture material and full original-report envelopes ignored and in Downloads mirrors. Durable records retain compact per-preset/candidate outcomes, all findings/dispositions/narrative limits and source/configuration/media/report hashes with local evidence pointers. A fresh clone cannot inspect local pixels/session files directly. No original local evidence was deleted.

See [current scoped verification](motion-atlas/implementation-sampling-correction-controller-verification.json) and its linked compact continuity/delivery records.
