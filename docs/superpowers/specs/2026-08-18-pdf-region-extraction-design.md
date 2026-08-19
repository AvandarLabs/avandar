# PDF import: region extraction from situation reports

**Status:** phases B1 and B2 implemented; B3 outstanding
**Date:** 2026-08-18
**Branch:** `feat/pdf-import`
**Linear:** extends AVA-317; still defers AVA-316
**Supersedes:** the "Manual region selection", "Qualitative extraction" and
"LLM-driven extraction" entries under Future phases in
`2026-08-17-pdf-import-design.md`

> **The merge gate passes.** `src/workers/pdfSniff/gateDocuments.test.ts`
> asserts against both named situation reports: 16 of 16 state figures from the
> OCHA choropleth with exact values and zero silently wrong, the KPI tiles with
> their units, the six funding bars at their printed magnitude, the six
> response pillars, the document identity, and the IMC prose including the
> spelled-out `one death` / `West Darfur` construction. The weekly trend chart
> is asserted absent, so deferring chart-geometry reading stays a decision.
>
> Three behaviours came out differently from what this spec anticipated, and
> are asserted as they actually behave rather than as hoped. Each carries a
> `KNOWN GAP` or `KNOWN DEFECT` comment at its assertion:
>
> 1. **Pillar 6 needs its own region.** A full-page box interleaves the two
>    magazine columns, so the pillars are read as three column regions, and
>    pillar 6 straddles a page-3 gutter. A region needs reading order across
>    fragments to fix this.
> 2. **A capital-city annotation fuses into its state label** on the
>    choropleth (`NORTH KORDOFAN Khartoum`). The value is correct. Requiring
>    matching fonts to merge was implemented and measured, and it made things
>    worse: it frees `Khartoum` to win the 408 figure from `KHARTOUM` on
>    distance, unflagged. The real fix is for association to distinguish a
>    point annotation from an area label.
> 3. **`doc_org` comes from the PDF `Author` field**, which is a person's name
>    in the IMC document and null in the OCHA one. It must not be relied on as
>    a join key.

## Summary

Let a user draw a box or select text on a rendered PDF page and extract
whatever structured data is inside it. Four extraction shapes are supported:
grid tables, labelled graphics (maps, charts and KPI tiles whose values are
text at coordinates), repeating labelled blocks, and measurements embedded in
prose. A classifier picks the shape and explains why; the user can override it.
Extracted rows land in a review grid where every row traces back to its
position on the page, and uncertain rows arrive pre-flagged.

The organising idea generalises the one in the original spec. That spec's
insight was that a detected PDF table is the same kind of thing as an Excel
sheet. That remains true, and is now the special case of a broader rule: **the
unit of extraction is a region, and an auto-detected table is simply a region
we found for you.** A user-drawn box and a detected table produce the same
object and travel the same path.

## Why this exists

Two documents were named as the merge gate for v0:

- International Medical Corps, *Sudan Cholera Response Situation Report #1*,
  24 June 2025 (via ReliefWeb), 2 pages.
- UN OCHA, *Sudan Cholera Operational Update*, 3 July 2025, 3 pages.

Both were read during design. The finding that motivates this spec:

> **Neither document contains a single table.** Not one ruled table, not one
> whitespace-grid table. The detector specified in
> `2026-08-17-pdf-import-phase-b-table-extraction.md` would return zero
> candidates on both files.

Both are born-digital with clean text layers, so neither needs OCR. Everything
of value in them falls into four other shapes.

## The four shapes

### Shape 1: numbers embedded in prose

The dominant shape in the IMC report and in OCHA's highlights, response and
funding sections. One sentence commonly carries several observations:

> "In June, 21,563 cases and 388 deaths have been reported, including 13
> suspected cases (five confirmed) and one death in West Darfur, and 166 cases
> and 13 deaths in South Darfur."

Six observations, with subjects arriving in trailing clauses and one value
spelled out as a word. IMC page 1 holds roughly fifteen of these; OCHA page 2
holds around twenty (573 health facilities, 28 implementing partners, 3 million
OCV doses, 1.3 million people vaccinated, 2.5 million reached with clean water,
600 metric tons of supplies).

This is where rule-based extraction is weakest and a language model is
genuinely better. See [Model assistance](#model-assistance).

### Shape 2: labelled graphics

Maps, charts and KPI tiles whose values are **real text items at real
coordinates**, not rasterised pixels. Verified against both files:

- The OCHA choropleth carries 16 state-level death counts plus a five-bin
  case-count legend.
- The three KPI tiles read `83,000 cases since July 2024`, `2,100 deaths`,
  `2.6% CFR`.
- The page 3 funding bars carry their own data labels (`WASH 3M (15%)`,
  `Health 2M (13%)`, and so on), so they need no geometry reading at all.
- The donut chart's `16%` and `84%` are likewise text.

The catch is that the association between a value and its label exists **only
in the coordinates**. Running the OCHA map through a conventional text
extractor tears `29` away from `NORTHERN` and strands them lines apart:
reading order actively destroys the data. Recovering it is the job of
`pairByProximity`, and its reliability was measured rather than assumed.

### Shape 3: repeating labelled blocks

OCHA page 2 is six numbered pillars, each with `Responses:`, `Challenges:` and
`Priorities:` run-in labels. That is a 6 by 4 table wearing a magazine layout.

This is the easiest real win and the most generalisable of the four: numbered
heading plus bold run-in labels is standard house style across OCHA, WHO and
UNHCR reporting, so a rule for it pays off across a corpus rather than one
file.

### Shape 4: unlabelled chart geometry (deferred)

The OCHA weekly cholera trend chart has axis ticks as text (`0` through
`10,000`, `Week 1` through `26`) but no data labels. Its 26 values exist only
as vertices of a vector polyline, so extracting them means calibrating path
geometry against the axis scale, and every result is an estimate.

**Deferred out of v0.** It is the only one of the four that cannot produce an
exact number, and the least common shape. The v0 test suite asserts it is
*absent*, so the omission is explicit rather than accidental.

## The proximity experiment

Shape 2 rests on one assumption: that position alone can recover which value
belongs to which label. That assumption was tested during design rather than
asserted. Real coordinates were extracted from OCHA page 1 and nearest-label
association run against the 16 state figures.

| Outcome | Count |
|---|---|
| Correct and unambiguous | 10 |
| Correct but flagged as uncertain | 4 |
| Wrong but flagged as uncertain | 1 |
| **Silently wrong** | **1** |

Four conclusions, each of which changes the design:

1. **The primitive works, but never unsupervised.** Fourteen of sixteen is a
   good first pass and an unacceptable silent import. Review is not a nicety;
   it is the feature.
2. **The distance ratio between best and runner-up match is a usable
   uncertainty signal.** It caught one of the two errors. Regions above roughly
   0.8 are flagged for review.
3. **Both failures were in the same crowded cluster** (Darfur and Kordofan),
   where labels sit closer to each other than to their own values. No tuning
   fixes that; only review does.
4. **Two earlier runs failed for boring, instructive reasons.** The first
   swallowed the choropleth legend and read bin boundaries (`10`, `500`,
   `1,000`) as state data. The second fused `KHARTOUM` with `KASSALA`, then
   over-correcting split `RED SEA` in half.

The legend failure is a direct argument **for** user-drawn regions: a
human-drawn box excludes the legend for free, where whole-page auto-detection
must be taught to recognise and reject it.

The label failure dictates that `assembleLabels` is its own primitive with two
distinct rules that must not be conflated:

- **Same-line merging** uses the horizontal **edge gap** between words, not the
  distance between their centres. Centre distance never merges long words.
- **Stacked-line merging** requires tight x-centre alignment plus a vertical
  gap of about one line. Mere proximity is not enough, because on a dense map
  neighbouring place names are close together.

## Decisions

| Decision | Choice |
|---|---|
| Model assistance | Rules first; model opt-in behind the existing consent gate |
| Shape selection | Auto-classify with visible evidence, user can override |
| Document to dataset mapping | One import, one dataset; several regions combine |
| Sequencing | Foundation, then selection extraction, then auto table detection |
| Extraction engine structure | Four extractors over a shared primitive layer |
| Chart geometry reading | Deferred; asserted absent in tests |
| Merge gate | Executable: fixture tests over both named documents |

## Architecture

```
PDF ──→ extractPageGeometry ──→ words[] · paths[] · structTree?   [shared]
        detectTextLayer ─────→ scanned guard, runs first          [shared]
                     │
        ┌────────────┴─────────────┐
        │                          │
   user draws box            auto-detect
   or selects text           lattice / tagged / stream
        │                          │
        └────────────┬─────────────┘
                     ▼
               PdfRegion { page, bbox, shape, mode }
                     ▼
          clipToRegion ─→ RegionGeometry
                     ▼
          classifyRegion ─→ { shape, confidence, evidence[] }
                     ▼
     extractGridTable │ extractLabelledGraphic
     extractRepeatingBlocks │ extractProseMeasures
                     ▼
       ExtractedTable { rows, cell provenance, flags[] }
                     ▼
       normalizeCellValue → DuckDB sniff → typed columns          [shared]
                     ▼
               review grid → import
```

### Module layout

Extends the structure already established in the Phase B plan rather than
introducing a parallel one. All of it lives under `src/workers/pdfSniff/`.

| File | Responsibility | Phase |
|---|---|---|
| `assembleWords.ts` | Glyph runs to words, via x-gap and font metrics | B1 |
| `groupLines.ts` | Line clustering by y-overlap | B1 |
| `clipToRegion.ts` | Page geometry to region geometry | B2 |
| `assembleLabels.ts` | Same-line and stacked-line label merging | B2 |
| `assembleQuantities.ts` | A numeral plus its suffix, read as one figure | B2 |
| `pairByProximity.ts` | Value to label association, plus ambiguity ratio | B2 |
| `parseRunInLabels.ts` | Run-in label blocks (`Responses:` and friends) | B2 |
| `extractMeasurements.ts` | Number, unit and subject from sentences | B2 |
| `classifyRegion.ts` | Choose a shape, report the evidence | B2 |
| `extractors/extractGridTable.ts` | Shape: grid table | B2 |
| `extractors/extractLabelledGraphic.ts` | Shape: labelled graphic | B2 |
| `extractors/extractRepeatingBlocks.ts` | Shape: repeating blocks | B2 |
| `extractors/extractProseMeasures.ts` | Shape: prose measurements | B2 |
| `llm/buildRegionPrompt.ts` | Region text to prompt | B2 |
| `llm/parseRegionResponse.ts` | Model response to `ExtractedTable` | B2 |

`assembleWords` and `groupLines` are pulled **forward** out of the current
stream-detection task, because all four shapes need them rather than tables
alone.

Every unit except `extractPageGeometry` takes normalised geometry and returns
plain data, preserving the property the original plan built for: the entire
engine unit-tests against fixture JSON with no PDF in the loop.

### Why four extractors rather than one configurable engine

Proximity pairing, run-in label parsing and sentence parsing are genuinely
different algorithms. Collapsing them into one parameterised engine would be a
false abstraction that gets harder to reason about with each shape added. The
reuse that a general engine would have provided lives instead in the shared
primitive layer, where it can be tested directly.

Two interface notes:

- **`classifyRegion` returns evidence, not just a verdict.** The UI shows why a
  shape was chosen ("16 numbers, 17 short capitalised labels, no ruling
  lines"). A classifier that cannot explain itself makes the override control
  feel arbitrary.
- **The model path sits behind the same `ExtractedTable` interface** as the
  rule-based extractors, so the review grid, type inference and import never
  know which produced the rows.

## Data model

### `regions` is restructured

The existing column holds page fragments of a single logical table, with
`detection_mode`, `grid_x`, `grid_y`, `header_rows` and `fill_merged_cells`
beside it as table-wide settings. Those are all per-region concepts once a
dataset can hold a map and a KPI row, so they move inside:

```jsonc
regions: [{
  id: "r1",
  label: "Deaths by state",        // user-editable; prefixes columns
  shape: "labelled_graphic",       // new enum; classifier or override
  detectionMode: "manual",         // existing enum, now per region
  fragments: [{ page: 0, bbox: [330, 175, 590, 465] }],
  options: { valuePattern: "integer", ambiguityThreshold: 0.8 }
}]
```

Two new enum types, both following the existing convention of one file per enum
under `supabase/schemas/`:

- `public.datasets__pdf_region_shape`:
  `'grid_table' | 'labelled_graphic' | 'repeating_blocks' | 'prose_measures'`.
  Used as the `shape` value inside `regions[]`, not as a column type.
- `public.datasets__pdf_output_mode`: `'natural' | 'observations'`.

New columns on `datasets__pdf_file`:

- `output_mode public.datasets__pdf_output_mode not null default 'natural'`.
- `llm_model text` (nullable; null means the rows were produced by rules
  alone).

Dropped from `datasets__pdf_file`, having moved into `regions[]`:
`detection_mode`, `grid_x`, `grid_y`, `header_rows`, `fill_merged_cells`.

**This is re-work on completed Phase A code**: one migration plus the model,
parsers, creation RPC and their tests. It is worth doing because nothing has
shipped and the alternative is two sources of truth for the same settings, but
it is a real cost and is called out here deliberately.

`llm_model` is a first-class column rather than an inference: the workspace
already keeps a privacy log, so "did a model see this document" should be
answerable from the dataset row.

### How several regions combine

> Regions whose resolved headers match union into one natural table. Regions
> whose headers differ combine as observations.

This unifies a mechanism the original plan solved separately. A table
continuing across pages 4 to 7 is four regions with identical headers, so it
unions, which is exactly what `mergePageSpans` did. Multi-page merging now
falls out of the general rule instead of being its own code path.

### The observations schema

Document metadata is denormalised onto every row, because that is what makes
successive reports union cleanly.

| Column | Example |
|---|---|
| `subject` | `Khartoum`, `WASH` |
| `subject_kind` | `admin1`, `sector`, `national` |
| `metric` | `deaths`, `cases`, `funding_received` |
| `value` | `408`, `3000000` |
| `unit` | `n`, `usd`, `percent` |
| `period` | `2025-06`, `since 2024-07` |
| `qualifier` | `suspected`, `confirmed`, `cumulative` |
| `page`, `region_label` | provenance |
| `confidence` | `high`, `review` |
| `extracted_by` | `rules`, `model` |
| `source_text` | the sentence or label it came from |

`confidence` and `extracted_by` are deliberately separate columns. Confidence
is about whether the value is right; `extracted_by` is about what produced it.
A model-extracted row can be perfectly confident, and a rule-extracted row can
need review, so collapsing the two would lose information a reviewer needs.

**Natural mode carries no provenance columns**, because they would pollute a
schema whose whole point is to mirror the source (a two-column map table should
import as two columns). The consequence is that flags cannot survive into a
natural-mode dataset, so **natural mode requires every flagged row to be
resolved or explicitly accepted in the review grid before import is enabled**.
Observations mode carries provenance instead, and may be imported with flags
intact, because cross-document analysis is exactly where knowing a value was
uncertain matters later.
| `doc_title`, `doc_org`, `doc_date`, `doc_report_no` | the cross-report join key |

`value` is numeric after `normalizeCellValue`, with `unit` absorbing the `$`,
`%` or `M` suffix.

Non-numeric content has no place in this schema, which settles an otherwise
ambiguous case. Selecting the OCHA pillars **in observations mode** contributes
their embedded figures (`573`, subject `Surveillance, early detection and case
management`) and drops the prose. Selecting them **in natural mode** keeps the
full text as a 6 by 4 table. Same region, two honest outputs.

### Document metadata is a first-class extraction

Title, organisation, report number and publication date are extracted from the
document (info dictionary first, then page-1 heading geometry) and are what
allow SitRep #1 and #2 to stack. Importing a series of reports is the actual
reason anyone imports these documents at all.

### A constraint worth stating

The codebase has no append-rows mutation and dataset schemas are fixed at
import. A series of reports therefore stacks through the existing
`VirtualDataset` union rather than through new append semantics, which stays
out of scope here.

## User flow

`PdfPagePreview`, already planned as the canvas for table overlays, becomes the
working surface:

- **Drag** to draw a box, clipped by rectangle.
- **Select text** for a prose span, clipped by text-item run. The distinction
  matters when a sentence wraps across a column boundary.

A region list sits beside the page, each entry showing its label, inferred
shape and the classifier's evidence line, with a dropdown to override and
re-extract. Below it is the review grid: extracted rows with uncertain ones
flagged, cells editable, and clicking a row highlights its source box on the
page.

That last link is what makes the feature trustworthy. Every row can answer
"where did this come from", which the proximity experiment showed is not
optional.

### Pipeline wiring

Mostly the known integration points: `accept` and `_fileMimeTypeToSourceType`
in `ManualUploadView`, a `pdf_file` branch in `useLoadManualUploadFile` and in
`useSaveDataset`'s match, region controls in `DatasetParseControls`, and
re-parse through the existing "Process data again" path.

One structural difference matters. **CSV and XLSX have rows the moment they are
sniffed; a PDF has none until a region exists.** The PDF sniff therefore
returns page count, page dimensions and a render handle in a `needs-selection`
state, and `DatasetImportForm` must tolerate an empty preview with a "select a
region to see data" affordance rather than treating it as a parse failure.

## Model assistance

`extractProseMeasures` runs rules first, always. When a prose region yields
little relative to the density of numerals present, the UI offers "extract with
the assistant" as an explicit action.

That action routes through the existing privacy machinery rather than around
it: `decideIfDataCanCrossBoundary` with its PII and bias detectors, the consent
modal, the HMAC ack token, and server-side verification in the chat edge
function. Only the selected region's text is sent, never the whole document.

If the user is offline or declines, rule results stand and the UI states what
was skipped rather than failing. Rows the model produced carry
`extracted_by = 'model'`, and the model id is recorded in `llm_model` on the
dataset row.

This preserves the offline guarantee in the form that matters: offline
extraction remains fully functional, merely less capable on shape 1, and
nothing leaves the device without an explicit, logged consent.

## Error handling

On top of the conditions already handled in the original spec (scanned,
encrypted, broken ToUnicode map, extraction-disallowed flag, fingerprint
drift, page-count cap):

| Condition | Behaviour |
|---|---|
| Region drawn over an image with no text | Report that the region has no text layer, kept distinct from "found nothing" |
| Classifier below confidence threshold | Do not guess: ask for the shape, showing evidence for each candidate |
| Ambiguous proximity pairs | Import allowed, flagged rows visibly marked, `confidence` preserved into the dataset |
| Observations mode over a region with no numeric content | Explain that nothing measurable was found and suggest natural mode |
| Text selection crossing a column boundary | Clip by text run and show what was captured before extracting |
| Region produces zero rows | Report which extractor ran and what it looked for |

## Testing

The strategy from the original spec carries over: unit tests per primitive
against normalised-geometry fixture JSON with no PDF in the loop, plus
integration tests against real PDFs.

Two additions.

### The merge gate is executable

"Can we process these two PDFs" should be a CI check, not a judgment call at
review time. Both documents become fixtures with expected-output JSON, and the
suite asserts concrete values:

- **OCHA map**: 16 rows; `Khartoum 408`, `White Nile 432`, `Aj Jazirah 238`
  exact; at most 6 rows flagged for review; **zero silently wrong**.
- **OCHA KPI tiles**: 3 rows. **Funding bars**: 6 rows. **Pillars**: 6 rows by
  4 columns.
- **IMC prose**: the full measurement set, including `one death` /
  `West Darfur`, which combines a spelled-out number with a trailing-clause
  subject.
- **OCHA weekly trend chart**: asserted **absent**, so deferring shape 4 is
  explicit.

### Regression cases from the experiment

`pairByProximity` and `assembleLabels` take the specific failures found during
design as regression tests: the crowded Darfur and Kordofan cluster, the
legend-inside-the-region case, `KHARTOUM` next to `KASSALA`, and `RED SEA`
needing same-line merging.

### Fixture licensing, unresolved

The three existing fixtures are CC BY with attribution in the
`public/test-data/pdf/` README. The OCHA publication is normally reusable with
attribution. **The International Medical Corps report carries no licence we
have confirmed**, and ReliefWeb only hosts it.

Two acceptable resolutions: confirm the licence and commit with attribution,
or keep that PDF out of the repository and have the fixture fetch it by URL
with a checksum while offline tests run against committed geometry JSON. This
must be settled before the fixture lands. See
[Open questions](#open-questions).

## Phase restructure

The existing Phase B plan is split in three. Roughly half its tasks are shared
foundation that region extraction needs just as much as table detection does,
so building them once and first avoids duplicated work.

| Phase | Contents | Status |
|---|---|---|
| **B1 Foundation** | pdfjs-dist in a worker, shared geometry types, `normalizeCellValue`, `extractPageGeometry`, scanned-PDF guard, `assembleWords`, `groupLines`, sniff worker and driver, DuckDB typing, drift fingerprint, page preview canvas, import wiring | Existing Phase B tasks 1 to 5, 12, 14 to 16, 18 |
| **B2 Selection extraction** | `clipToRegion`, `assembleLabels`, `pairByProximity`, `parseRunInLabels`, `extractMeasurements`, `classifyRegion`, the four extractors, the model path, the region picker and review grid, the `regions` restructure | New, plus existing task 17 rewritten. **This is the merge gate.** |
| **B3 Auto table detection** | Lattice, tagged and stream detection, cross-signal dedup, page-span merge, confidence scoring | Existing Phase B tasks 6 to 11, 13, and the table-specific parts of 19 |

Two notes on the mapping. Existing task 17 ("The table picker") is **rewritten
rather than moved**: it becomes the region picker, which hosts detected tables
as one region source among several. And `assembleWords` and `groupLines` are
lifted out of task 8 (stream detection) into B1, because all four shapes depend
on them.

B3 still ships in this branch. It simply stops sitting on the critical path to
a merge it cannot unblock, since it extracts nothing from either gate document.

## Edge cases

Beyond those catalogued in the original spec:

**Association.** Values equidistant between two labels. A label with no value
and a value with no label, both of which must survive as flagged rows rather
than being silently dropped. Legends, scales and attribution lines inside a
drawn region. Multi-line place names on dense maps.

**Prose.** Numbers written as words (`one death`). Subjects in trailing
clauses. Ranges (`10 to 500`). Values whose subject is the document itself
rather than a named place. Percentages that are shares of a stated base
(`16 per cent` of `$50 million`). Dates expressed as periods
(`since July 2024`) rather than instants.

**Blocks.** A pillar missing one of its labels. Labels that continue across a
column break. Numbering that restarts on a later page.

**Combination.** Regions whose headers nearly match, differing only by case or
whitespace, which should union rather than fall back to observations. A single
region selected in observations mode, which is legal and produces a long table.

## Open questions

1. **Fixture licensing for the IMC report.** Blocking only the fixture commit,
   not the design. Resolutions listed under
   [Fixture licensing](#fixture-licensing-unresolved).
2. **Whether `subject_kind` should be validated against a gazetteer.** A Sudan
   admin-1 list would improve labelling but introduces reference data we would
   have to maintain and scope geographically. Deferred; the column accepts free
   text for now.
