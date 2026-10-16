# Motion Atlas validation

This edition delivers all 20 presets in the [stock catalog](stock-motion-library.md),
with a live gallery, storyboard integration, MP4s, posters, and per-export
provenance. The files under `showcase/assets/motion/` are intentional tracked
deliverables. No product capture, credentials, or customer records were used.

## Completed checks

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

## Gallery interaction review

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

## Changes made during review

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

## Evidence and limits

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
