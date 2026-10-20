# Motion Atlas whole-branch review

**🟡 With fixes: 0 Critical, 0 Important, 3 Minor corrections recommended.**

Reviewed `5ae60463fc23971d9b1f2e882a22ad426bd41631..9550af213f9f65cfe776429d6ca4e5d7d65ede7e` in `/Users/juanpablosarmiento/src/worktrees/avandar/feat/motion-catalog`. This is the final whole-branch source review, not a fresh media or PDF inspection. No source, index, branch or tracked file was changed by this reviewer. The structured companion is [whole-branch-review-findings.json](whole-branch-review-findings.json).

## Verdicts

| Dimension | Verdict |
| --- | --- |
| Spec compliance | Substantially compliant; three Minor control-copy/public-metadata corrections recommended before final handoff. |
| Code quality | Approved with minor corrections and explicitly retained nonblocking style, diagnostic, coverage and visual debt. |
| Readiness | With fixes. Complete the bounded copy/metadata correction and one scoped rereview, preserving explicit source/evidence continuity. This is not authorization to merge or publish. |

## Strengths

- Complete supplied input is strictly parsed without a default merge. Only whole-input omission produces a cloned, localized fictional default. Gallery, React, CLI and storyboard boundaries retain the same request shape and authored palette/content.
- The 170 contracts and renderers are explicitly registered, with 150 unique additions split 86 general / 64 social-sector and 20 legacy general entries. Public retrieval exports are renderer-free, explicitly allowlisted and validate configured examples against their complete schemas. Provenance does not leak through those public metadata projections.
- Finite-range math avoids obvious extreme-number overflow, geometry uses exact binary64 predicates rather than tolerance-driven domain narrowing, tuple conversion preserves cardinality, and raw-data text remains separate from layout and translated default copy.
- Source/configuration/media identities, honest test failures, corrected historical prose, original finding IDs and actual evidence limits are unusually well preserved. The current documentation corrections and fresh direct command-output records close their scoped provenance gap.

## Recommended corrections

No Critical or Important issue was found within the inspected scope. These three Minor findings are concrete and suitable for one final bounded correction. They do not request a renderer redesign, schema restriction, altered authored input or broad style cleanup.

### WB-M1: Empty nested control labels expose message IDs, and outcome descriptors retain template IDs

**Severity: Minor.** Eleven nested descriptor occurrences across five presets contain an empty message. useContentField passes these descriptors to Lingui, whose installed implementation falls back to the message ID. The resulting visible labels and accessible names expose long implementation identifiers. Two InvalidTableQuarantine outcome options also use the non-preset PLACE namespace.

Correct before final handoff as bounded control-copy work. Keep descriptor paths, schema values, inputs and renderer behavior unchanged.

| Current source | Suggested correction |
| --- | --- |
| `apps/ava-video-producer/src/stock/presets/InvalidTableQuarantine/InvalidTableQuarantine.controls.ts:31`; also 122 | `Original row` / `Reloaded row` |
| `apps/ava-video-producer/src/stock/presets/InvalidTableQuarantine/InvalidTableQuarantine.controls.ts:80`; also 85 | `Failed` / `Completed` IDs: `motionAtlas.invalid-table-quarantine.controls.attempt.outcome.failed`, `motionAtlas.invalid-table-quarantine.controls.attempt.outcome.completed` |
| `apps/ava-video-producer/src/stock/presets/OrderedLockAcquisition/OrderedLockAcquisition.controls.ts:83` | `Requested resource` |
| `apps/ava-video-producer/src/stock/presets/DocumentRegionDriftCheck/DocumentRegionDriftCheck.controls.ts:71` | `Coordinate` Override the label for the empty-path tuple item; do not change its path or shared numeric bounds. |
| `apps/ava-video-producer/src/stock/presets/PublicationSnapshotSlice/PublicationSnapshotSlice.controls.ts:110`; also 129, 140 | `Cell value` / `Selected row` / `Selected column` |
| `apps/ava-video-producer/src/stock/presets/CoordinateQualityTriage/CoordinateQualityTriage.controls.ts:44`; also 61, 89, 106 | `Latitude value` / `Latitude value` / `Longitude value` / `Longitude value` IDs: `motionAtlas.coordinate-quality-triage.controls.latitude.value`, `motionAtlas.coordinate-quality-triage.controls.longitude.value` Split the shared empty ID by latitude/longitude purpose. Numeric and text variants may share the corresponding purposeful value label. |

There are eleven empty descriptor occurrences, eight distinct empty message IDs and five affected presets. The JSON companion records every exact ID. The two `PLACE` outcome IDs are additional to that count. The installed Lingui fallback was checked in isolation, and `useContentField.ts:35` / `ContentFieldBody.tsx:39` show the actual label and accessible-name sink. This was not a browser test.

Historical IDs: `packet-25/review/M4`.

Verification: Focused descriptor/Lingui checks and fresh affected gallery UI verification. Regenerate derived catalogs/extraction outputs through their normal producer commands if required. Explicitly version the changed content/control source and prove renderer/default continuity; do not silently relabel historical media.

### WB-M2: Three reference selectors describe domain items as coordinates

**Severity: Minor.** These are reference selectors for lunch components, investigation cases and selected sites. Their label and accessible name currently say Coordinate, misleading the author about what selection changes.

Replace only the three authored descriptor messages, retaining their existing preset-scoped IDs.

| Current source | Suggested correction |
| --- | --- |
| `apps/ava-video-producer/src/stock/presets/SchoolLunchTrayComposition/SchoolLunchTrayComposition.controls.ts:193` | `Component` |
| `apps/ava-video-producer/src/stock/presets/ClusterEpicurveLink/investigationCaseIdsControl.ts:21` | `Investigation case` |
| `apps/ava-video-producer/src/stock/presets/StratifiedSpatialSample/selectedSiteIdsControl.ts:21` | `Selected site` |

Historical IDs: `packet-16/review/M1`, `packet-17/review/M2`.

Verification: Fresh affected selector labels/accessibility checks, with explicit source/version continuity. No domain, geometry or numeric changes are indicated.

### WB-M3: JournalReceipts claims a complete hold before the fifth receipt and tab settle

**Severity: Minor.** The public sequence metadata promises that the completed authored state remains held from 108, but at the maximum five receipts the last transfer starts at 108, arrives at 128, and its tab closes through 136. Retrieval/authoring consumers therefore receive an inaccurate completed-state window.

Keep the existing choreography. Change the metadata action endFrame from 107 to 135 and the completed hold startFrame from 108 to 136; retain hold endFrame 167.

| Current source | Suggested correction |
| --- | --- |
| `apps/ava-video-producer/src/stock/presets/JournalReceipts/JournalReceipts.metadata.ts:94`; also 101, 105 | Action end `135`; completed hold `136..167`. |
| `apps/ava-video-producer/src/stock/presets/JournalReceipts/ReceiptHalf.tsx:29` | Timing evidence for the fifth receipt/tab, not an edit request. |
| `apps/ava-video-producer/src/stock/presets/JournalReceipts/JournalTab.tsx:68` | Timing evidence for the fifth receipt/tab, not an edit request. |

Historical IDs: `packet-03/review/M1`.

Verification: A bounded metadata-versus-dense-timing assertion can establish the exact 136 threshold without rendering. Version exported metadata and retain unchanged-renderer evidence separately.

## Scope and method

The complete branch range has 2,450 changed files. I used bounded diff/package structure scans and targeted reads across contracts, schema/control generation, 170 renderer/contract registration, gallery editing, copied requests, CLI and HTTP download paths, storyboard/React composition, public catalog export, localization, numeric/geographic helpers, metadata and the concrete historical risks. I did not read every line of every preset or metadata file. Structural scanning of all changed text is not equivalent to detailed review of all authored geometry.

The only changed file outside the producer app is `pnpm-lock.yaml`, for the producer d3-geo 3.1.1 / @types/d3-geo 3.1.0 dependency. No changed render.sh, frame-gate or license path was found. The original product source and excluded ingestion/embedding/index/assembly scope were not expanded.

Focused source reads covered `StockContract`, `stockRequestSchema`, `parseStockInput`, `createStockJsonSchema`, `createStockRenderer`, `StockGraphic`, the registry/catalog/search path, `createStockCatalog`, `validateStockControls`, `export-stock-catalog`, source fingerprints/build retention, `motion.ts`, `loadFilm`, HTTP server/export jobs, storyboard schema and StockScene/StockClip composition. Gallery reads covered draft validation, stable row identity, nullable/union/scalar/reference fields, copy/download snapshots and modal integration. Localization reads covered default-copy resolution and span markers. Math/paint reads covered FitText, LiteralDataText, finite normalization/interpolation, exact polygon/disk/interior predicates, orthogonal grids and selected corrected/current renderer paths.

Fresh bounded checks counted 150 unique catalog additions (86/64) and 170 renderer-free contracts (106/64, all 180 frames), recursively enumerated the empty control descriptors, exercised only the installed Lingui fallback on data, inspected source/gate scope, and checked original finding provenance. Of 98 original source-document hashes, 96 still match; progress.md and the draft rulings ledger legitimately continued growing after the index snapshot. Canonical original references resolve as 98 exact line spans, three exact text occurrences elsewhere, and seven integration summaries whose source paragraphs were independently read. No missing original was found.

No new unit/E2E suite, TypeScript compilation, static renderer, browser, screenshot, video, gate, probe, PDF or external-service operation was run. This review does not convert the prior 2,213/2,219 broad result into an all-green run.

## All 108 canonical dispositions

Every canonical ID is assigned exactly once below. The structured companion adds original source/line pointers, prior disposition, applicable closure overlay and specific notes. Resolved means the stated historical defect is closed, not that every related frame or future input has been proven. Retained debt remains visible and is not an automatic final fix request.

### resolved (27)

The original concern is closed by the identified scoped correction and current closure evidence. Source was independently inspected for central contract/control/text/semantic fixes and selected visual corrections; remaining narrow historical closures rely on their preserved independent reviews, not a new pixel inspection.

`task-3/rereview-1/minor-01`, `task-3/rereview-1/minor-02`, `packet-02/review/M1`, `packet-04/review/M1`, `packet-08/review/M3`, `packet-14/review/M1`, `packet-18/review/M2`, `packet-27/rereview-1/N1`, `packet-27/rereview-2/N2`, `packet-29/review/M1`, `packet-29/review/M2`, `packet-29/review/M3`, `packet-30/review/M1`, `integration/A21-22-P01`, `integration/CR-01`, `integration/PF-01`, `integration/PF-02`, `integration/R53-legacy-fixed-copy`, `integration/SR-01`, `integration/SR-02`, `integration/SR-03`, `integration/SR-04`, `integration/SR-U01`, `integration/decision-fork-grapheme`, `integration/early-upper-only-minima`, `integration/empty-reference-placeholder`, `integration/fixed-tuple-cardinality`.

### fix-copy-or-metadata (4)

Current source reproduces the inaccurate visible descriptor or public beat metadata. Mapped to the three bounded findings above; no schema or renderer redesign is requested.

`packet-03/review/M1`, `packet-16/review/M1`, `packet-17/review/M2`, `packet-25/review/M4`.

### historical-process (3)

Historical warning/TDD order cannot be retroactively repaired. Keep the original chronology and improve future execution; no source change or replay is justified.

`task-2/review/M1`, `packet-07/process/initial-red-history`, `packet-19/review/M2`.

### test-coverage (7)

The stated oracle or test-title weakness remains useful regression debt. It does not independently reproduce a current runtime failure, and later focused semantic/source/media evidence narrows the risk. Do not claim those tests prove more than their assertions. No broad testing or automatic fix is required for this handoff.

`packet-07/review/M1`, `packet-08/review/M1`, `packet-09/review/M1`, `packet-11/review/R3`, `packet-16/review/M2`, `packet-17/review/M1`, `packet-23/review/M1`.

### bounded-diagnostics (19)

Retain the warning exactly: bounded membership work, intentional serialization/static metadata, schema-protected lookups or stateless positional keys do not establish a correctness/performance defect in these finite scenes. This is not a warning-free scan and no new diagnostic rerun was performed.

`packet-03/review/M8`, `packet-11/review/R4`, `packet-12/review/M1`, `packet-13/review/M2`, `packet-14/review/diagnostic-context`, `packet-15/review/M1`, `packet-16/review/diagnostic-context`, `packet-17/review/diagnostic-context`, `packet-18/review/M1`, `packet-21/review/M3`, `packet-21/review/M4`, `packet-22/review/M1`, `packet-22/review/M2`, `packet-23/review/M2`, `packet-24/review/M3`, `packet-26/review/M1`, `packet-27/review/M1`, `packet-28/review/M2`, `packet-30/review/M2`.

### visual-or-editorial (12)

Preserve the concrete visual/editorial concern and its own configuration/frame boundary. It does not establish lasting wrong quantities or lost identity, and the retained later evidence supports a usable resolved state where stated. No new pixel inspection occurred in this review. These observations are accepted as nonblocking debt, not erased or universally described as hold-clear.

`packet-12/rereview-3/O1`, `packet-17/review/M3`, `packet-19/review/M1`, `packet-20/progress/returning-actor-overlap`, `packet-21/review/M1`, `packet-21/review/M2`, `packet-22/static-inspection/duplicate-account-history`, `packet-24/review/M4`, `packet-26/review/M2`, `packet-27/review/omission-transition-watch`, `packet-28/review/M1`, `packet-29/rereview-1/N1`.

### repository-conventions (36)

The original repository-style/size/organization finding remains valid where present, including files above mandatory split thresholds. This review records the debt explicitly rather than declaring the conventions satisfied. No functional defect was established, and a broad refactor is not recommended as part of the final bounded copy correction.

`task-3/progress/single-file-directories`, `task-4/review/M1`, `task-4/review/M2`, `task-5/review/M1`, `packet-01/rereview-2/M1`, `packet-02/review/M2`, `packet-02/review/M3`, `packet-02/review/M4`, `packet-02/review/M5`, `packet-03/review/M2`, `packet-03/review/M3`, `packet-03/review/M4`, `packet-03/review/M5`, `packet-03/review/M6`, `packet-03/review/M7`, `packet-05/review/M1`, `packet-05/review/M2`, `packet-06/review/3`, `packet-07/review/M2`, `packet-08/review/M2`, `packet-09/review/M2`, `packet-11/review/R5`, `packet-12/review/M2`, `packet-13/review/M1`, `packet-14/review/M2`, `packet-15/rereview-1/M2`, `packet-21/rereview-1/N1`, `packet-21/review/M5`, `packet-24/rereview-1/minor-01`, `packet-24/review/M1`, `packet-24/review/M2`, `packet-25/review/M1`, `packet-25/review/M2`, `packet-25/review/M3`, `packet-27/review/M2`, `packet-27/review/M3`.

Specific retained points: the full-suite failure history, test-title/oracle limitations and mandatory file-size debt remain real. Shared helper splitting closed its original >500-line defect, while its current entry remains 475 lines. Duplicate visible account labels can remain ambiguous despite distinct stored IDs. Tiny positive quantities may round to `0.00 KiB`. The linked-parameter connector/tick contact persists in default and N6 held observations. Neither this review nor a clear late hold erases transition occlusions.

## Later source, editor, sampling and documentation findings

| ID | Disposition | Reason |
| --- | --- | --- |
| `task-7-source/review/M1` | retained-nonblocking-diagnostic | SelectField positional option keys are diagnostic debt; exact private option tokens resolve value ambiguity independently. |
| `task-6/review/M1` | retained-minor-debt | Missing-license test observes the key-file temporary directory rather than the publication destination. Source inspection confirms license validation precedes generation/publication, so this is a test-observability gap, not a reproduced unauthorized write. |
| `task-6/review/M2` | retained-minor-debt | 405-line export test file crosses the split-attempt guideline. Preserve this maintainability debt without a final refactor. |
| `task-7-final-source/M1` | retained-process-limitation | Use one color environment policy in future commands. NO_COLOR/FORCE_COLOR warning alone does not justify rerunning E2E. |
| `editor-whitespace-M1` | retained-minor-debt | ScalarField imports its parent editor stylesheet for a generic text class. Ownership/naming debt, with no established behavior regression. |
| `editor-whitespace-M2` | retained-baseline-limitation | Retain CSS lint 42 inherited violations versus 43 baseline and color-environment warnings. Do not call this CSS lint clean or sweep unrelated formatting. |
| `sampling-summary-test-helper-roro` | retained-minor-debt | The two-positional-argument private helper at StratifiedSpatialSample.test.ts:45 misses RO-RO style. Current sampling math/held-summary correction is separate and accepted. |
| `task-8-finalization-review/M1` | resolved | Current validation prose accurately describes compact live outcomes/narratives and ignored full report envelopes. |
| `task-8-finalization-review/M2` | resolved | Current document openings distinguish completed source/versioned evidence from pending whole-branch/artifact work. |
| `task-8-finalization-review/M3` | resolved | Usage guide names the actual StockScene.tsx direct export. Fresh direct command/stdout/stderr/exit records close the separate final documentation validation provenance gap. |

## Browser and actual-media findings

The JSON companion explicitly dispositions all 20 primary MP4 findings, all 27 registry occurrences (including two with no original ID), all 16 poster findings, the poster editorial observation, all ten default-browser findings, three repeated sampled-browser concerns and all three configured-preview dispositions. These occurrence counts overlap and must not be summed as unique defects. Original explicit IDs remain unchanged; records lacking an ID retain null plus a clearly labeled locator. Related IDs are not silently merged.

| Finding or occurrence | Final disposition |
| --- | --- |
| `poster-reject-replace-incomplete-transition` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `decoded-argument-bridge-early-dim-conclusion` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `decoded-shared-foundation-early-join-gap` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `decoded-cell-normalization-early-crossfade-overprint` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `mp4-batch-release-entrance-heading-overlap` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `decoded-linked-parameter-source-tick-overlap` | retained-minor-observation. Connector/tick contact persists in the separately observed hold. Current RehearsalOutput.tsx:76 routes horizontal segments near source tick baseline 194; main values and relationships remain readable. N6 is a distinct extreme-value configuration. Earlier blanket hold-clear prose is superseded; no correction is required for this handoff. |
| `outreach-home-b-worker-numeral-crowding-poster90` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `retained-poster-cargo-parcel1-id-occlusion` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `decoded-stratified-unpopulated-summary-captions` | resolved-at-separate-source. The historical held omission remains real at source2ad. R67/source38c adds collection-derived totals, with separate fresh default media/live evidence and 169-unaffected continuity. Do not rewrite the original finding as if old pixels were fixed. |
| `resident-ballot-reading-tally-crowding-poster90` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `decoded-school-practice-caption-leader-crossing` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `actor-attribution-split-natural120-stamp-occlusion` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `expectation-overlay-default-overprint-current-natural-window` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `retained-poster-peer-dim-acknowledgment` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `filter-subscription-mask-before-count-settlement` | retained-transition-observation. The mask precedes counter settlement in the sampled action; later held 5/2 values resolve correctly. Preserve timing mismatch as an animation readability concern, not a lasting data/count error. |
| `proportional-symbol-area-mid-assembly-label-crowding-poster90` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `poster-grid-binning-count-marker-lag` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `poster-coordinate-triage-count-marker-lag` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `poster-geometry-detail-count-lag` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `configured-N6-source-tick-connector-overlap` | retained-minor-observation. Connector/tick contact persists in the separately observed hold. Current RehearsalOutput.tsx:76 routes horizontal segments near source tick baseline 194; main values and relationships remain readable. N6 is a distinct extreme-value configuration. Earlier blanket hold-clear prose is superseded; no correction is required for this handoff. |
| `poster-argument-bridge-dim-conclusion` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `poster-shared-foundation-gap-text-occlusion` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `cell-normalization-frame90-poster-residual-crossfade-overprint` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `poster-linked-parameter-source-tick-overlap` | retained-minor-observation. Connector/tick contact persists in the separately observed hold. Current RehearsalOutput.tsx:76 routes horizontal segments near source tick baseline 194; main values and relationships remain readable. N6 is a distinct extreme-value configuration. Earlier blanket hold-clear prose is superseded; no correction is required for this handoff. |
| `media/mp4FindingRegistry/12` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `media/mp4FindingRegistry/16` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `poster-peer-recognition-dim-acknowledgment` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `media/posterFindings/6` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `media/posterFindings/7` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `media/posterFindings/8` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `expectation-overlay-default-frame90-overprint` | retained-transition-observation. Retain the concrete sampled occlusion, dimness, crossing or counter lag. The later decoded/natural held evidence is separately readable where recorded; it does not erase the transition or establish continuous clearance. No persistent semantic failure is established, so no source fix is required for this handoff. |
| `returned-acknowledgements-midword-caption-wrap-poster90` | retained-editorial-observation. Midword acknowledgements wrapping retains every letter without clipping or wrong counts. Nonblocking caption-layout polish. |
| `network-label-connector-overlap` | retained-legacy-baseline. Legacy network/orbit strokes compete with readable held text. Preserve baseline concern as nonblocking readability debt; no lost content/relationship is established. |
| `radial-input-connector-overlap` | retained-legacy-baseline. Legacy network/orbit strokes compete with readable held text. Preserve baseline concern as nonblocking readability debt; no lost content/relationship is established. |
| `orbital-label-orbit-overlap` | retained-legacy-baseline. Legacy network/orbit strokes compete with readable held text. Preserve baseline concern as nonblocking readability debt; no lost content/relationship is established. |
| `browser/defaultFindings/3` | retained-legacy-baseline. Legacy series cross/overlap during action while the legend persists and final hold separates the series. Retain the crossing observation without claiming every action frame independently readable. |
| `dense-capability-reveal-line-text-overlap` | retained-transition-observation. The sampled action concern remains real; separately clear native/decoded holds do not erase it. No lasting wrong state is established and no final source fix is required. |
| `shared-foundation-action-text-mask` | retained-transition-observation. The sampled action concern remains real; separately clear native/decoded holds do not erase it. No lasting wrong state is established and no final source fix is required. |
| `cell-normalization-crossfade-text-overprint` | retained-transition-observation. The sampled action concern remains real; separately clear native/decoded holds do not erase it. No lasting wrong state is established and no final source fix is required. |
| `actor-attribution-moving-stamp-covers-prior-attribution` | retained-transition-observation. The sampled action concern remains real; separately clear native/decoded holds do not erase it. No lasting wrong state is established and no final source fix is required. |
| `browser/defaultFindings/9` | retained-transition-observation. The sampled action concern remains real; separately clear native/decoded holds do not erase it. No lasting wrong state is established and no final source fix is required. |
| `browser/newSampledConcerns/0` | alias-of-retained-default-observation. Same default-browser concern above, retained separately as its source record; no duplicate new defect count. |
| `browser/newSampledConcerns/1` | alias-of-retained-default-observation. Same default-browser concern above, retained separately as its source record; no duplicate new defect count. |
| `browser/newSampledConcerns/2` | alias-of-retained-default-observation. Same default-browser concern above, retained separately as its source record; no duplicate new defect count. |
| `browser/configuredPreviewDispositions/records/0` | qa-expectation-corrected. Authored secondary cyan is intentional semantic color. Selected accent still controls its documented roles. Correct the QA expectation, not the source or pinned configuration. |
| `browser/configuredPreviewDispositions/records/1` | qa-expectation-corrected. Authored secondary cyan is intentional semantic color. Selected accent still controls its documented roles. Correct the QA expectation, not the source or pinned configuration. |

For the repeated browser concerns, the cell normalization, actor attribution and grid records remain aliases of their preserved default observations, not newly counted defects. L4/N10 expectations were corrected because semantic secondary cyan is intentional. N6 remains independently configured and its earlier hold-clear prose is qualified by the later leading-minus/elbow contact. Public posters at frame 90 can depict an incomplete stage; this review accepts that limitation and does not claim each poster tells the complete resolved story.

## Special evidence decisions

| ID | Disposition |
| --- | --- |
| `configured-N1-native-editor-retry` | resolved-with-native-line-ending-limit. Original failed run retained. R65 native textarea plus new exact LF/TAB N1 retry closes that loss. CR/CRLF paste still normalizes to LF in Chromium. Direct supplied JSON remains unchanged. |
| `custodyProseCorrection` | evidence-correction. Earlier report saying Received at destination 2 is not verified pixel evidence. Current source shows arrival text plus data receipt for all three crates, not a rendered numeric arrival value. Preserve original and correction. |
| `reportedLeaseFrameDrop` | retained-telemetry-limit. Historical ExpiringLease reports 1 dropped frame out of 180. No zero-drop historical claim or speculative source bug is warranted. |
| `HTTP-L3-native-attachment-observation` | accepted-with-explicit-limit. POST, completed poll, exact saved native/server/gated bytes and actual decoded playback are separate evidence. Attachment GET status and headers remain unobserved. Do not invent a range/content-type/disposition assertion. |
| `resolved-span-witnesses` | accepted-with-explicit-limit. Six actual resolved inputs do not establish actual browser locale switching or omitted-default translation paths. |
| `Task8-direct-command-provenance` | resolved. Post-correction directly retained stdout/stderr/exit records replace the earlier provenance gap. Reconstructed historical outputs remain identified as reconstructed. |
| `artifact-PDF-convenience-glyphs` | controller-lane-closed-not-independently-inspected. Controller reports QA complete at HEAD9550 for 17 PDFs/517 pages. This source reviewer ran no PDF/browser/image operation and does not add a personal visual-approval claim. |

## Rulings R1 through R69

All 69 rulings and their recorded costs were considered. The JSON companion contains one disposition per R-number. Full group membership follows; superseded experimental rulings retain their chronology.

**workflow-and-evidence:** R1, R2, R3, R20, R44, R63, R66, R68, R69. Accepted with the recorded costs/limits. Preserve serial execution, historical test failures, actual version identities and raw-evidence custody. R66 does not establish unseen HTTP headers; R68 is exact unaffected-output continuity, not new pixels; R69 leaves fresh clones without ignored raw sessions.

**dependency-and-architecture:** R4, R5, R6, R7, R8, R9, R11, R14, R15, R17, R19, R21, R24, R25, R26, R27, R28, R32, R34, R35, R36, R37, R38, R39, R48, R50, R51, R52, R55, R57, R58. Accepted bounded shared abstractions with their stated consumers and costs. Current source supports strict requests, finite math/geography, data-only contracts and recursive controls. R26/27 historical estimator attempts remain superseded by R28. Shared test oracles remain approximations and do not prove pixel readability.

**authored-contract-interpretation:** R12, R13, R16, R18, R22, R23, R29, R30, R31, R33, R40, R41, R42, R43, R45, R46, R47, R49, R59. Accepted explicit interpretation of authored domain and presentation, with costs preserved. No normalization of supplied values, invented minimum, semantic NLP inference or public disclosure of suppressed local counts is introduced by these rulings.

**scoped-corrections:** R10, R53, R54, R56, R62, R64, R65, R67. Closed through the scoped corrected source and retained verification. Current central/source-risk reads corroborate the boundaries; R67 media is separately versioned. R65 retains the native CR/CRLF limit. No assertion of fresh pixels from this source review.

**retained-transition-decisions:** R60, R61. Accepted as calibrated nonblocking temporal/editorial decisions with every underlying observation retained above. A correct hold does not erase an obstructed action/poster, and no continuous-clearance claim is granted.

## Remaining risks and evidence limits

- No line-by-line claim for all 2,450 changed files or all metadata. Full diff/package was inspected through bounded structural passes, followed by deep source reads for named risks and canonical findings.
- No new unit suite, typecheck, browser, renderer, MP4, frame gate, probe or PDF operation in this review. Fresh work consists of read-only source/diff/provenance analysis and bounded renderer-free registry/Lingui data probes.
- The broad producer run remains 2,219 tests: 2,213 pass and 6 counted failures. Later 71 affected checks pass, but no full rerun exists. Historical TDD/lint/fixture-order limitations and inherited CSS warnings remain.
- Historical 167 actual decoded media belong to source2ad/HEAD498c: 150 defaults, 16 configured CLI files and one actual native HTTP L3 delivery. Their 835 natural captures, 368 image views and 166 standalone posters plus L3 preview are retained observations, not new inspection by this reviewer.
- R67 corrected sampling source38c/e5a has its own 13 actual image views, 180 live states/one wrap/zero errors and fresh default decoded media with 179 callbacks/six seconds/zero reported drops. The 169 other renderers have exact 754 fixture / 6,786 frame hash continuity; this is not a 170-preset fresh media rerun.
- HEAD9550 is docs-only after e5a with the stock source38c and 41 supplemental gallery files unchanged. Any recommended control/metadata change creates new source metadata and requires explicit continuity and affected UI verification before handoff.
- Native textarea paste normalizes CR/CRLF to LF. Exact LF/TAB/Unicode/spaces and direct JSON preservation have separate retained evidence.
- HTTP attachment GET status/headers were not observed. Six resolved span cases do not prove actual browser locale switching.
- Legacy connector/orbit overlaps, action/poster readability concerns, persistent default/N6 tick contact, and one reported ExpiringLease dropped frame remain nonblocking observations. No universal every-frame readability or zero-drop claim is made.
- Raw image/session evidence is ignored plus Downloads under R69. Tracked compact observations/hashes support traceability but do not let a fresh clone personally inspect all old pixels.
- Root reports PDF QA closed at 17 PDFs/517 pages. PDF/artifact production is outside this source-review lane; no source reviewer PDF approval is inferred.

## Next actions

| # | Owner | Next action |
| --- | --- | --- |
| 1 | Codex controller | Dispatch WB-M1 through WB-M3 as one bounded control-copy/metadata correction, then one scoped rereview. |
| 2 | Codex controller | Record the new source identities, regenerate applicable derived metadata, prove unchanged renderer/default continuity and verify the affected gallery labels. Do not relabel old media. |
| 3 | Codex controller | Preserve retained debt and limitations in final handoff; synchronize this new review artifact into the existing Downloads/PDF artifact lane. |
| 4 | Pablo | No input or permission is required for this review. |
