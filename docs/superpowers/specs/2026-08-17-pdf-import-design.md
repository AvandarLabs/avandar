# PDF import: structured table extraction

**Status:** partly superseded; see below
**Date:** 2026-08-17
**Branch:** `feat/pdf-import`
**Linear:** depends on AVA-317; defers AVA-316

> **Partly superseded by
> [`2026-08-18-pdf-region-extraction-design.md`](./2026-08-18-pdf-region-extraction-design.md).**
>
> Reading the two situation reports named as the v0 merge gate showed that
> neither contains a single table, so the detector specified here would extract
> nothing from either. Three items this spec listed as future phases (manual
> region selection, qualitative extraction, and LLM-driven extraction) are now
> v0 scope and are designed in that document.
>
> What remains authoritative here: the choice of `pdfjs-dist`, the in-browser
> and in-worker architecture, the three detection signals, value normalisation
> and DuckDB typing, storage and retention, and the general error handling. The
> phase structure is restructured (see Phase restructure in the newer spec), and
> the `datasets__pdf_file` columns described under Data model are reorganised
> there.

## Summary

Add `pdf_file` as a manually uploadable dataset source type alongside
`csv_file` and `xlsx_file`. Phase 1 extracts structured tables from
born-digital PDFs entirely in the browser: detect candidate tables using three
independent signals, show them outlined over rendered page previews, and let
the user pick one to import as a dataset.

The organising insight is that **a detected PDF table is the same kind of thing
as an Excel sheet**: one uploaded file containing several logical tables, of
which the user selects one, and changing the selection re-parses. That lets
phase 1 reuse the entire existing manual-upload pipeline rather than inventing
a parallel one.

## Goals

- Import a table from a born-digital PDF with the same fidelity a user expects
  from CSV or Excel import.
- Detect tables automatically and honestly, with visible confidence, rather
  than silently guessing.
- Never lose the original document, so later extraction features remain
  possible on already-imported files.
- Preserve the offline-only guarantee for sensitive documents.

## Non-goals for phase 1

OCR and creating several datasets from one file. Both are recorded under
[Future phases](#future-phases).

**Changed since this was written.** Manual region selection, qualitative
extraction and LLM-driven extraction were non-goals here and are now v0 scope,
designed in
[`2026-08-18-pdf-region-extraction-design.md`](./2026-08-18-pdf-region-extraction-design.md).

## Decisions

| Decision | Choice |
|---|---|
| Library | `pdfjs-dist`, own the detection algorithm |
| Runtime | Fully in-browser, in a web worker |
| Detection signals | All three: tagged structure tree, ruling lines, whitespace clustering |
| Source pointer | Resolved geometry plus a content fingerprint |
| Multi-page tables | Auto-merge, shown as merged, user can split |
| Multi-row headers | Auto-detect count, flatten with a separator |
| Merged cells | Fill down, reported in the preview |
| Scanned PDFs | Detect early, block with a diagnosis |
| Type inference | Normalise PDF-specific noise, then reuse DuckDB's CSV sniffer |
| Page range | User-selectable, in phase 1 |
| Multi-table import | One dataset per import (sheet model); N datasets deferred to AVA-316 |

### Why pdfjs-dist

No JavaScript equivalent of Camelot or Tabula exists. The packages that claim
PDF table extraction (`pdf-tables-parser`, `pdf2table`, `pdf.js-extract`
helpers) are thin, naive y-clustering and largely unmaintained. `pdfexcavator`
is the one ambitious entrant but is new with low adoption.

`pdfjs-dist` is Mozilla-maintained, ships in every Firefox install, runs
natively in a web worker, and is the only candidate exposing all four
capabilities we need: text items with coordinates (`getTextContent`), vector
path operators (`getOperatorList`), the tagged structure tree
(`getStructTree`), and page rendering to canvas.

**LibPDF was evaluated and rejected.** It is a well-built library aimed at the
opposite problem: writing PDFs, incremental saves that preserve signatures,
PAdES signing, form filling. Its own launch post lists rendering to canvas or
image as out of scope, and it exposes neither vector path operators nor the
structure tree. It is worth revisiting if we ever need to *generate* signed
PDFs, where it would beat our current `jspdf` dependency.

### Why in-browser

It mirrors the existing `xlsxSniff.worker` pattern, keeps the document on the
user's device, and continues to work offline and in the desktop app. The cost
is that we own the detection algorithm and add roughly 400KB gzipped to a lazy
chunk. Both are acceptable; the algorithm is something we would want to tune
against real customer files regardless of where it runs.

## Detection

Three signals, in descending order of reliability.

### Signal A: tagged structure tree

`page.getStructTree()` returns the logical structure of a tagged PDF, including
`Table`, `TR`, `TH`, and `TD` nodes with header designation and spans. When
present this is ground truth, not a guess.

Coverage in the wild is only roughly 10 to 15%, and a 2026 German public-sector
study found 37% of documents untagged with only 9.5% fully compliant. But the
distribution favours us: Word and Google Docs exports, modern LaTeX, and
accessibility-mandated government reports are tagged, and those are a large
share of what users will drag in.

### Signal B: ruling lines from the content stream

`page.getOperatorList()` exposes `constructPath` with `rect`, `moveTo`, and
`lineTo`. We filter for near-horizontal and near-vertical segments plus thin
filled rectangles (how most generators draw rules), snap to a tolerance,
compute intersections, and build a cell grid.

This is Camelot's lattice mode without the raster step. Camelot rasterizes the
page and runs OpenCV morphology because its input forces that; we read the
source vector geometry directly, which is strictly more accurate and needs no
canvas and no WASM.

### Signal C: whitespace and alignment clustering

For borderless tables: group text items into rows by y-overlap, then derive
column boundaries from vertical whitespace corridors that persist across many
rows, plus clustering of left, right, and centre alignment edges. Least
reliable, and always surfaced as such, but borderless tables are common enough
that omitting it would gut the feature.

### Confidence

`tagged > lattice > stream`, modulated by grid regularity, cell fill ratio, and
ragged-row count. Tagged and lattice present as high confidence. Stream
presents as medium or low with a visible "guessed from text alignment" caveat.

## Architecture

New worker `src/workers/pdfSniff.worker.ts` plus a `sniffPdfFile` main-thread
driver, copying `xlsxSniff.ts` exactly: one worker per call, self-closing after
reply, `terminate()` as the error-path fallback.

```
pdfSniff.worker.ts          orchestrates, reports progress
  detectTextLayer.ts        scanned-PDF guard, runs first
  extractPageGeometry.ts    pdf.js -> normalised text items + path segments
  detectTaggedTables.ts     signal A
  detectLatticeTables.ts    signal B
  detectStreamTables.ts     signal C
  dedupeCandidates.ts       bbox-overlap dedup across signals
  mergePageSpans.ts         join fragments into multi-page tables
  scoreCandidate.ts         confidence scoring
  normalizeCellValue.ts     PDF-specific value cleanup
```

Every unit except `extractPageGeometry` takes normalised geometry and returns
plain data, so all of them are unit-testable against fixture JSON with no PDF
in the loop. `extractPageGeometry` is the single place that touches pdf.js and
the single place that handles page rotation and geometric re-sorting, so
nothing downstream ever sees content-stream order.

## Data model

### Enums

Add `'pdf_file'` to `public.datasets__source_type` in `10.datasets.sql`.

New `00.enum.datasets__pdf_detection_mode.sql`:
`'tagged' | 'lattice' | 'stream' | 'manual'`. The `manual` member exists from
day one so phase 2's drag-a-rectangle needs no migration.

### Table

New `supabase/schemas/20.datasets__pdf_file.sql`, mirroring
`datasets__xlsx_file` on the common columns (`id`, `dataset_id`,
`workspace_id`, `created_at`, `updated_at`, `is_in_cloud_storage`,
`size_in_bytes`) plus:

```sql
-- Where the table physically is. One entry per page fragment; a
-- multi-page table has several. Deliberately not an ordinal index.
regions jsonb not null,           -- [{ page: 4, bbox: [x0,y0,x1,y1] }, ...]
detection_mode public.datasets__pdf_detection_mode not null,
grid_x jsonb,                     -- snapped column boundaries; null for 'tagged'
grid_y jsonb,
page_range int4range,             -- what the user limited detection to
header_rows integer not null default 1,
fill_merged_cells boolean not null default true,
fingerprint jsonb not null,       -- { headers, shape: [rows, cols], hash }
has_original_file boolean not null default false
```

Same four RLS policies and `updated_at` trigger as the xlsx table, plus
`70.rpc_datasets__add_pdf_file_dataset.sql` and a generated SQLite mirror under
`apps/desktop/migrations/`.

### Why geometry rather than an ordinal index

An Excel sheet name is an identity Excel guarantees. "Table 3" is an *output of
our own detector*. If we ship a detection improvement, yesterday's table 3 can
become today's table 4, silently re-pointing a saved dataset at different data.
Storing resolved geometry makes re-parse reproducible independent of detector
version, and is the same data model phase 2's manual regions need.

The fingerprint (header names, row and column count, content hash) is compared
on re-parse. A mismatch warns the user rather than quietly importing something
else. Geometry prevents renumbering; the fingerprint is the only mechanism that
can actually *notice* drift.

### Types

`pdf_file` joins both `ManuallyUploadableDatasetSourceType` and
`CanBeOfflineOnlyDatasetSourceType`. A `PdfFileDatasetModel` under
`shared/models/datasets/PdfFileDataset/` and a `PdfFileDatasetClient`
registered in `SourceDatasetClient.ts`. This part is entirely conventional and
should be generated with the `ava-model-creation` skill.

## Extraction and typing

Cell assignment is grid-driven wherever a grid exists (tagged or lattice),
which is what makes wrapped cell text and rowspans tractable. Only the stream
path is heuristic.

Values then take a two-step path so we own only the part DuckDB cannot know:

```
cell text     "(1,234)"   "$45.3*"   "—"   "12%"   "−0.126"
   |  normalizeCellValue
   v            "-1234"     "45.3"     ""   "0.12"   "-0.126"
   |  serialise to CSV in memory
   v  DuckDB-WASM read_csv + sniff_csv
              BIGINT      DOUBLE    NULL  DOUBLE   DOUBLE
```

`normalizeCellValue` handles accounting-style parenthesised negatives, currency
symbols, thousands separators, percent signs, trailing footnote markers, en and
em dash null tokens, and Unicode minus (U+2212) as distinct from ASCII hyphen.
Everything after that is the same inference CSV import already uses, so a number
behaves identically whether it arrived by CSV or by PDF.

**Critical ambiguity:** parentheses do not always mean negative. Public health
tables routinely write `361 (84.7)` for count and percent. The normaliser must
only treat parentheses as a sign when they wrap the *entire* cell value, never
when they follow another number. Fixture
`plos-one-ncd-mobile-phone-surveys.pdf` exists specifically to hold this line.

Multi-row headers flatten to `"2024 Q1"`. Merged cells fill down, and the
preview reports how many cells were filled so the choice is visible.

## User flow

`ManualUploadView` gains `pdf_file` in `_fileMimeTypeToSourceType` and in
`accept`. `useLoadManualUploadFile` gains a `pdf_file` branch in the existing
`match`. Everything downstream (`DatasetImportForm`, `useSaveDataset`,
`onRequestDataReparse`) works unchanged, because changing the selected table is
the same operation as changing the selected Excel sheet.

The one new component is `PdfTablePicker`: a candidate list, a pdf.js-rendered
page thumbnail with the detected bounding box drawn over it, and controls for
split/merge, header row count, and page range. The overlay is not decorative.
Without it, "this PDF has 4 tables" is an unverifiable list, and a low-confidence
stream detection is a guess the user has no way to check. That same canvas is
the substrate every phase-2 feature needs.

## Storage and retention

This is AVA-317, and it **ships as part of phase 1**.

The governing rule: **can the original file be reconstructed from the parquet
blob plus the stored metadata?** For CSV and XLSX the answer is yes, which is
exactly why we do not store the original today and should continue not to. For
PDF the answer is no, because extraction is lossy.

Therefore, for `pdf_file`:

- **Cloud-synced** (`is_in_cloud_storage = true`): the original PDF is stored in
  the `workspaces` bucket under `<workspaceId>/datasets/`, alongside the parquet.
- **Offline-only**: the original PDF and the parquet are stored locally only and
  never uploaded.

This is not deferrable. Offline-only is a core guarantee rather than an
enhancement, and a PDF is far more likely than a CSV to be a contract, a patient
record, or an audited account. Separately, discarding the original would
foreclose every phase-2 extraction feature on files already imported.

Requires a new type-level classification alongside
`CanBeOfflineOnlyDatasetSourceType`, storage RLS coverage, cascade delete of
both objects, and a decision on whether retained originals count against the
workspace storage quota.

## Error handling

Each of these gets an explicit, named path rather than falling through to a
generic failure:

| Condition | Behaviour |
|---|---|
| No text layer (scanned) | Detected *before* any detection work. Explain that the file appears to be a scan, report the evidence, point at OCR as planned. Never report "no tables found". |
| Zero candidates found | Distinguish from the scanned case. Suggest widening the page range, and note that manual region selection is coming. |
| Encrypted / password-protected | Prompt for a password via pdf.js's callback. |
| Extraction-disallowed permission flag | Surface the restriction; do not silently override it. |
| Broken ToUnicode map | Detect a high ratio of unmapped or private-use glyphs and warn that text may be unreliable, rather than importing mojibake. |
| Fingerprint mismatch on re-parse | Warn and require confirmation before replacing the data. |
| Page count over the detection cap | Require an explicit page range rather than scanning indefinitely. |

## Testing

The real risk is a detector that passes our fixtures and fails on customer
files, so the strategy is corpus-first.

**Unit tests** per detection unit against normalised-geometry fixture JSON, with
no PDF in the loop.

**Integration tests** against real PDFs in `public/test-data/pdf/`, each with an
expected-output JSON. Three CC BY licensed fixtures are committed; see that
directory's README for attribution and for what each one covers. Between them
they exercise the tagged path, the untagged path, multi-page continuation,
side-by-side tables on one page, four-level spanning headers, Unicode minus,
`n (%)` values that must not be read as negatives, dashes as nulls, and a real
broken ToUnicode map.

**Gaps to fill with synthetic fixtures.** We have no licensed sample for three
important cases, and these should be generated rather than sourced: a scanned
image-only PDF (to test the no-text-layer guard), a heavily ruled statistical
table (the three real fixtures use horizontal rules only, per journal house
style, so the full-grid lattice path is under-tested), and a financial statement
where parentheses genuinely do mean negative, as the counterpart to the `n (%)`
case.

Note that synthetic fixtures are a poor substitute for real ones in general.
The most valuable properties of the committed fixtures (PLOS's private-use
decimal glyph, the Frontiers InDesign structure tree) are artifacts of specific
generators that a regenerated lookalike would not reproduce.

## Edge cases

Catalogued during design. Those not otherwise covered above:

**Identity and merging.** Two tables side by side on one page, which stream
detection will merge into one wide table. Templated reports with identical
column positions on every page, which invite false page-span merges. The same
table found by two signals, requiring bbox-overlap dedup. Column count
instability across pages when a column is empty on one page. Tables of contents
with dot leaders, which look extremely table-like and are essentially never
wanted.

**Structure.** Repeated headers on continuation pages, which must be dropped
rather than becoming data rows. Running headers, footers, page numbers,
footnotes, and watermarks being swallowed into edge rows. Text wrapping inside
a cell, which naive y-clustering reads as extra rows. Rotated and landscape
pages, where page-level rotation is handled and text rotated within an upright
page is not.

**Content.** Glyph-level text items with no spaces, requiring word
reconstruction from x-gaps and font metrics. Superscript footnote markers,
which sit at a different y and can fabricate phantom rows.

**Operational.** Very large documents, addressed by the page range control, a
detection cap, and streaming rather than holding every page in memory.

## Future phases

Recorded here so the phase-1 boundary is deliberate rather than accidental.

- **OCR for scanned documents.** Promoted to a first-class roadmap item:
  scanned documents are a confirmed part of the user corpus, and phase 1 can
  only diagnose them, not read them.
- ~~**Manual region selection.**~~ **Promoted to v0.** The `manual` detection
  mode and the geometry-based source pointer accommodated it as intended.
- **Page selection UI** beyond a simple range.
- ~~**Qualitative extraction.**~~ **Promoted to v0** as the repeating-blocks
  and prose-measurement shapes.
- ~~**LLM-driven extraction.**~~ **Promoted to v0**, as an opt-in assist behind
  the existing consent gate rather than the primary path.
- **Chart geometry reading.** Recovering values from an unlabelled plotted
  series by calibrating vector path vertices against the axis scale. Identified
  while reading the OCHA weekly trend chart and deliberately deferred, since
  every result is an estimate.
- **Multi-dataset creation** (AVA-316). One upload producing N datasets, which
  needs a new batched creation flow through `ManualUploadView`,
  `DatasetImportForm`, and `useSaveDataset`. Multi-sheet Excel workbooks get
  the same benefit, so it should be built generically.

## Open questions

None blocking. The storage quota treatment of retained originals is a product
decision that can be made during AVA-317 implementation.
