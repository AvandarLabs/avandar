# PDF Import Phase B2: Selection Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user draw a box or select text on a rendered PDF page and extract whatever structured data is inside it, with every extracted row traceable back to its position on the page and uncertain rows pre-flagged.

**Architecture:** A region clips Phase B1's page geometry. A classifier reads the clipped geometry and picks one of four shapes, reporting its evidence. One extractor per shape turns geometry into an `ExtractedTable`. Regions whose headers match union into a natural table; regions whose headers differ combine into tidy observations. A review grid sits between extraction and import.

**Tech Stack:** TypeScript, pdfjs-dist, Web Workers, DuckDB-WASM, React, Mantine, Supabase, Zod, Vitest.

---

## This phase is the merge gate

**The branch does not merge until this plan's Task 20 passes.** Two documents
define done:

- International Medical Corps, _Sudan Cholera Response Situation Report #1_,
  24 June 2025.
- UN OCHA, _Sudan Cholera Operational Update_, 3 July 2025.

Neither contains a single table, which is why Phase B3's detector cannot
unblock this merge and why this phase exists. Task 20 turns "we can process
these two PDFs" into a CI assertion rather than a judgment call.

## Prerequisites

**Phase B1 must be complete.** This plan consumes `PageGeometry`, `TextLine`,
`groupLines`, `assembleWords`, `normalizeCellValue`, `pdfTableToCsv`, the
geometry worker, `PdfPagePreview`, and the `needs-selection` import state. See
`2026-08-18-pdf-import-phase-b1-extraction-foundation.md`.

Read `docs/superpowers/specs/2026-08-18-pdf-region-extraction-design.md` in
full first. This plan implements it directly, and several tasks below only make
sense against the evidence recorded there.

## Corrections to the UI tasks, found during execution

Two things in Tasks 15 to 17 were wrong as written. Both are fixed in the
shipped code; this records them so a re-read does not reintroduce them.

**1. `@testing-library/user-event` is not installed in this repo.** Only
`dom`, `jest-dom` and `react` are. Every UI test below used `userEvent`, so as
written they would not even transform. Drive interactions with `fireEvent` from
`@/test-utils` (the repo's `MantineProvider`-wrapped render, which these
components require), and drive a Mantine `Select` with the existing
`pickMantineSelectOption` helper.

`fireEvent` is also the more accurate tool here: these components are fully
controlled by props that a `vi.fn()` parent never updates, so a
character-by-character `userEvent.type` would accumulate garbage, while
`fireEvent.change` fires one `onChange` carrying the whole new value.

**2. The picker's page-height calculation was wrong, and would have misplaced
every drawn region.** Task 16's snippet did
`setPageHeight(PREVIEW_WIDTH / nextScale)`, but `PREVIEW_WIDTH / scale` is the
page **width** in points, not its height. Feeding that to `PdfRegionOverlay` as
`pageHeight` puts every y-flip out by the difference between the two, which on
A4 is 247 points: regions land far from where they were drawn, plausibly enough
that it might not look like a bug.

Scale alone cannot yield the page height, so `PdfPagePreview` gained an
optional `onPageSizeChange?: ({ widthPt, heightPt })` reported from the
unscaled viewport after render. `onScaleChange` is unchanged.

## Closed: the observations `unit` column, and the funding bars with it

Found while implementing Task 12, deferred at the time, fixed afterwards. Both
halves are now asserted by the Task 20 gate.

The gap was that every extractor calls `normalizeCellValue` on the way in, so
the suffix was already gone by the time `combineRegions` saw the cell and it
emitted `unit: "n"` for everything: the OCHA KPI tile `2.6%` became value `2.6`
with unit `n`, indistinguishable from a count. A percentage and a count sharing
a unit compare as equal across stacked reports, which is the entire reason
observations mode exists.

The same missing notion of a unit was also a pairing failure. Each funding bar
prints its amount as three text items (`"3"`, `"M"`, `"(15%)"`), and with only
"numeral or not" to go on, `M (15%)` assembled into a label 13 points from the
figure while the pillar name it belongs to sat 172 points away. Every bar
paired with its own unit, unflagged, and all six pillars came back empty.

The fix is in two parts:

- `assembleQuantities` decides what is a figure before anything is classified
  as a label, merging a numeral with a magnitude suffix, a percent sign, a
  currency or a parenthesised share beside it. Adjacency reuses
  `assembleLabels`' own same-line test rather than a second set of thresholds.
  A quantity is anchored on its numeral for pairing, because a suffix extends
  the run rightwards without moving the figure.
- `ExtractedTable.rowUnits` carries the unit parallel to the cells, the way
  `rowProvenance` already does, so natural mode is untouched (a map table stays
  `[label, value]`) and `combineRegions` reads the real unit. A region whose
  own schema has a `unit` column, as `extractProseMeasures` does, still wins.

The bars now read `WASH 3000000`, `Health 2000000`, `RCCE 1000000`,
`Log and Supply 1000000`, `Coordination 1000000`, `Others 0`. Five of the six
are flagged as near-ties, which is honest: the pillar names are a long way
left of the amounts and the rows are 23 points apart.

## Two defects inherited from Phase B1, to fix in this phase

Both were found while implementing B1 Task 13 and confirmed against the code.
Neither blocks B1, and both bite here.

**1. Retention silently fails for PDFs over 200MB.** `_maybeCacheSourceBytes`
in `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.ts:102` returns
`undefined` when `file.size > SOURCE_CACHE_PER_FILE_MAX_BYTES` (200MB), while
`_putParsingDataset` sets `isSourcePinned` from the source type regardless. A
large PDF therefore lands as a pinned row with **no bytes**, and
`startOriginalFileUploadIfNeeded` then throws "no original file is cached
locally" at save time.

That ceiling is correct for CSV and XLSX, where the cached bytes are a
convenience for resuming a parse. It is wrong for PDF, where the original is
the only copy of data extraction is lossy against, and large PDFs are common in
this corpus. Fix in Task 19 by exempting sources that require retention from
the ceiling, or by refusing the upload up front with an explicit message.
Silently pinning a row with no bytes is the one option that must not survive.

**2. A mid-selection refresh drops the user back to the upload step.**
`resumeImport` correctly returns `undefined` for a `pdf` row, since there is no
transcode to redrive, so the bytes survive a refresh but the form state does
not. Restoring the picker from `sourceBytes` plus the stored `pageRange` is
this phase's job, because this phase is the first where a user has selection
work worth losing.

## Background an engineer new to this problem needs

**The four shapes, and why a table detector does not cover them.**

| Shape              | What it looks like                                | Where in the gate documents             |
| ------------------ | ------------------------------------------------- | --------------------------------------- |
| `grid_table`       | Ruled or aligned cells                            | Neither document                        |
| `labelled_graphic` | Values and labels as separate text at coordinates | OCHA map, KPI tiles, funding bars       |
| `repeating_blocks` | Numbered headings with run-in labels              | OCHA page 2 pillars                     |
| `prose_measures`   | Numbers inside sentences                          | IMC page 1, OCHA highlights and funding |

**The association problem, which is the hard part.** In a labelled graphic the
link between a value and its label exists _only_ in the coordinates. Running
the OCHA map through a conventional text extractor tears `29` away from
`NORTHERN` and strands them lines apart, because reading order is not spatial
order.

**This was measured during design, not assumed.** Nearest-label association
over the OCHA map's 16 state figures scored:

| Outcome                          | Count |
| -------------------------------- | ----- |
| Correct and unambiguous          | 10    |
| Correct but flagged as uncertain | 4     |
| Wrong but flagged as uncertain   | 1     |
| Silently wrong                   | 1     |

Three consequences drive the design of Tasks 3, 4 and 17:

1. **Review is mandatory, not optional.** Fourteen of sixteen is a good first
   pass and an unacceptable silent import.
2. **The best-to-runner-up distance ratio is a usable uncertainty signal.** It
   caught one of the two errors. Above 0.8, flag rather than guess.
3. **Label assembly must separate two rules.** Same-line merging uses the
   horizontal _edge gap_; stacked-line merging requires tight x-centre
   alignment. Two earlier runs failed by conflating them, first fusing
   `KHARTOUM` with `KASSALA`, then splitting `RED SEA` in half.

**Why the model is opt-in rather than primary.** Rules handle shapes 2 and 3
well and struggle with shape 1, where subjects arrive in trailing clauses and
values are spelled out as words. The repo already has an OpenRouter edge
function behind a consent gate with PII detection and a privacy log, plus an
on-device model. Task 18 uses that machinery rather than routing around it, so
offline extraction stays fully functional and nothing leaves the device without
logged consent.

## Migration conventions

Task 1 changes the schema. Read
`2026-08-17-pdf-import-phase-a-source-type-and-retention.md`'s "Migration
generation caveats" section first. The three that matter here:

1. **Enum value additions must be hand-written**, following
   `supabase/migrations/20260504000010_add_xlsx_file_source_type_enum_value.sql`.
   `db diff` mishandles them because RPC signatures depend on the type.
2. **Check branch currency before reading any diff.** `git rev-list --count
HEAD..develop` must be 0, or the diff reports missing commits as drift.
3. **Expect seven benign `analytics` view recreations.** Every drop has a
   matching recreate. Strip the pairs from generated migrations; there is no
   bug to chase.

## File structure

**Create, under `src/workers/pdfSniff/`:**

| File                                                     | Responsibility                                   | Task |
| -------------------------------------------------------- | ------------------------------------------------ | ---- |
| `clipToRegion.ts`                                        | Page geometry to region geometry                 | 2    |
| `assembleLabels.ts`                                      | Same-line and stacked-line label merging         | 3    |
| `assembleQuantities.ts`                                  | A numeral plus its suffix, read as one figure    | 5    |
| `pairByProximity.ts`                                     | Value to label association, plus ambiguity ratio | 4    |
| `extractors/extractLabelledGraphic.ts`                   | Shape: labelled graphic                          | 5    |
| `parseRunInLabels.ts`                                    | Run-in label blocks                              | 6    |
| `extractors/extractRepeatingBlocks.ts`                   | Shape: repeating blocks                          | 7    |
| `extractMeasurements.ts`                                 | Number, unit and subject from sentences          | 8    |
| `extractors/extractProseMeasures.ts`                     | Shape: prose measurements                        | 9    |
| `extractors/extractGridTable.ts`                         | Shape: grid table                                | 10   |
| `classifyRegion.ts`                                      | Choose a shape, report the evidence              | 11   |
| `combineRegions.ts`                                      | Union or normalise to observations               | 12   |
| `extractDocumentMetadata.ts`                             | Title, org, report number, date                  | 13   |
| `llm/buildRegionPrompt.ts`, `llm/parseRegionResponse.ts` | Model assist                                     | 18   |

**Create, under `.../ManualUploadView/PdfTablePicker/`:**

| File                   | Responsibility                        | Task |
| ---------------------- | ------------------------------------- | ---- |
| `PdfRegionOverlay.tsx` | Draw and edit boxes over the page     | 15   |
| `PdfRegionPicker.tsx`  | Region list, shape override, evidence | 16   |
| `PdfReviewGrid.tsx`    | Editable rows, flags, provenance link | 17   |

**Modify:**

| File                                                         | Change                                                   | Task |
| ------------------------------------------------------------ | -------------------------------------------------------- | ---- |
| `supabase/schemas/20.datasets__pdf_file.sql`                 | Restructure `regions`, add `output_mode` and `llm_model` | 1    |
| `supabase/schemas/00.enum.datasets__pdf_region_shape.sql`    | New enum                                                 | 1    |
| `supabase/schemas/00.enum.datasets__pdf_output_mode.sql`     | New enum                                                 | 1    |
| `supabase/schemas/70.rpc_datasets__add_pdf_file_dataset.sql` | New parameters                                           | 1    |
| `shared/models/datasets/PdfFileDataset/*`                    | Model, parsers, types                                    | 1    |
| `src/workers/pdfSniff.worker.ts`                             | Add the `extract` message                                | 14   |
| `src/clients/datasets/pdfSniff.ts`                           | Add `extractPdfRegions`                                  | 14   |
| `.../PdfTablePicker/PdfPagePreview.tsx`                      | Several highlights, not one                              | 15   |
| `.../useSaveDataset/useSaveDataset.ts`                       | Real `pdf_file` save arm                                 | 19   |

---

## Task 1: Restructure the region model and schema

**Files:**

- Create: `supabase/schemas/00.enum.datasets__pdf_region_shape.sql`
- Create: `supabase/schemas/00.enum.datasets__pdf_output_mode.sql`
- Modify: `supabase/schemas/20.datasets__pdf_file.sql`
- Modify: `supabase/schemas/70.rpc_datasets__add_pdf_file_dataset.sql`
- Modify: `shared/models/datasets/PdfFileDataset/PdfFileDataset.types.ts`
- Modify: `shared/models/datasets/PdfFileDataset/PdfFileDatasetParsers.ts`
- Modify: `shared/models/datasets/PdfFileDataset/PdfFileDatasetParsers.test.ts`
- Modify: `src/clients/datasets/DatasetClient/createDatasetMutations.ts`

**This is re-work on completed Phase A code, and that is deliberate.** Phase A
modelled one dataset as one table: `regions` held page fragments of a single
logical table, with `detection_mode`, `grid_x`, `grid_y`, `header_rows` and
`fill_merged_cells` beside it as table-wide settings.

Those are all per-region concepts once a dataset can hold a map _and_ a KPI
row. Leaving them as columns would mean two sources of truth for the same
setting. Nothing has shipped, so restructuring now is cheaper than carrying the
contradiction.

- [ ] **Step 1: Check branch currency**

```bash
git rev-list --count HEAD..develop
```

Expected: `0`. If it is not, merge `develop` first. A diff from a trailing
branch reports missing commits as drift and is indistinguishable from real
changes.

- [ ] **Step 2: Add the two new enums**

Create `supabase/schemas/00.enum.datasets__pdf_region_shape.sql`:

```sql
-- What kind of content a PDF region holds, which decides how it is extracted.
--
--   grid_table        - ruled or aligned cells. The classic table.
--   labelled_graphic  - a map, chart or KPI tile whose values are text items
--                       at coordinates, associated with their labels only by
--                       position. Reading order does not preserve the pairing.
--   repeating_blocks  - numbered headings with run-in labels, the standard
--                       house style of OCHA, WHO and UNHCR situation reports.
--   prose_measures    - measurements embedded in sentences.
--
-- Keep new values at the end: moving one is not a rename, it forces a full
-- rebuild of the type and a rewrite of every column using it.
create type public.datasets__pdf_region_shape as enum(
  'grid_table',
  'labelled_graphic',
  'repeating_blocks',
  'prose_measures'
);
```

Create `supabase/schemas/00.enum.datasets__pdf_output_mode.sql`:

```sql
-- How several extracted regions combine into one dataset.
--
--   natural       - the regions share resolved headers and union into one
--                   table with the source's own schema. A table continuing
--                   across pages is this case.
--   observations  - the regions have different schemas, so each extracted
--                   value becomes a row of
--                   (subject, metric, value, unit, period, provenance).
--                   This is the shape that lets successive reports stack.
create type public.datasets__pdf_output_mode as enum(
  'natural',
  'observations'
);
```

- [ ] **Step 3: Restructure the table**

In `supabase/schemas/20.datasets__pdf_file.sql`, replace the `regions` comment
and column, and delete `detection_mode`, `grid_x`, `grid_y`, `header_rows` and
`fill_merged_cells`, leaving:

```sql
  -- WHAT was extracted and WHERE it physically sits. One entry per region;
  -- a dataset built from a map plus a KPI row has two. Shape:
  --   [{
  --      "id": "r1",
  --      "label": "Deaths by state",
  --      "shape": "labelled_graphic",
  --      "detectionMode": "manual",
  --      "fragments": [{ "page": 0, "bbox": [x0, y0, x1, y1] }],
  --      "options": { ... shape-specific ... }
  --    }, ...]
  --
  -- Deliberately NOT an ordinal index like "table 3". A sheet name is an
  -- identity Excel guarantees; a table ordinal is an output of our own
  -- detector, so improving detection could silently repoint a saved dataset
  -- at different data. Geometry is stable across detector versions.
  --
  -- Per-region settings (grid coordinates, header row count, merged-cell
  -- fill, ambiguity threshold) live in `options` rather than as columns,
  -- because a dataset can now hold regions of different shapes for which
  -- those settings mean different things or nothing at all.
  regions jsonb not null,
  -- How several regions combine. See the enum's comment.
  output_mode public.datasets__pdf_output_mode not null default 'natural',
  -- Which model produced any model-extracted rows, or null when the rows came
  -- from rules alone.
  --
  -- A column rather than an inference: the workspace keeps a privacy log, so
  -- "did a model see this document" must be answerable from the dataset row.
  llm_model text,
```

- [ ] **Step 4: Update the creation RPC**

In `supabase/schemas/70.rpc_datasets__add_pdf_file_dataset.sql`, drop the
`p_detection_mode`, `p_grid_x`, `p_grid_y`, `p_header_rows` and
`p_fill_merged_cells` parameters, and add:

```sql
  p_output_mode public.datasets__pdf_output_mode default 'natural',
  p_llm_model text default null,
```

Update the `insert into public.datasets__pdf_file (...)` column list and
`values (...)` accordingly.

- [ ] **Step 5: Generate the migration**

```bash
supabase db diff -f restructure_pdf_regions
```

Read the generated file before committing. Strip the seven `analytics` view
drop-and-recreate pairs. The two `create type` statements are new types rather
than enum value additions, so `db diff` handles them correctly and they do
**not** need hand-writing.

- [ ] **Step 6: Update the model types**

**Correction, found during execution.** An earlier draft of this step had
`PdfFileDataset.types.ts` import the region types from
`@/workers/pdfSniff/types`. That is impossible in this repo, for three
independent reasons: `type-check:deno` runs `deno check shared`, and the Deno
import map defines `$/` but no `@/`, so it is a hard build break rather than a
style preference; `src/workers/pdfSniff/types.ts` already imports
`PdfDetectionMode` from this very file, so it would be a literal cycle; and the
convention is one-way, with 1533 `src/` to `$/` imports and zero the other way.

**The dependency runs the other way.** The four types that get persisted into
the `regions` jsonb column (`BBox`, `PdfRegionShape`, `PdfRegionFragment`,
`PdfRegion`) are **defined here in `shared/`**, and
`src/workers/pdfSniff/types.ts` re-exports them so existing worker-side import
sites keep working. Worker-runtime types that are never persisted (`TextItem`,
`RuleSegment`, `PageGeometry`, `TextLine`, `CandidateTable`, `ScoredTable`,
`PdfCellFlag`, `ExtractedTable`) stay in `src/workers/`.

Also delete the now-dead `PdfTableRegion` from this file; it is structurally
identical to `PdfRegionFragment`, and two names for one shape invites a later
mismatch.

The snippet below shows the fields, not the exact model wrapper. The real
`PdfFileDatasetModel` is a `SupabaseCrudModelSpec` around a `Model.Base` named
`PdfFileDatasetRead`, and the parser API is `fromDBReadToModelRead`, not
`fromDBReadToModel`. Follow the real shapes.

```ts
// Defined in this file, not imported: `shared/` must stay Deno-resolvable
// and so cannot reach into `src/`. See the correction above.

export type PdfOutputMode = "natural" | "observations";

export type PdfFileDatasetModel = {
  id: PdfFileDataset.Id;
  datasetId: Dataset.Id;
  workspaceId: Workspace.Id;
  createdAt: Date;
  updatedAt: Date;
  isInCloudStorage: boolean;
  sizeInBytes: number;
  hasOriginalFile: boolean;
  regions: readonly PdfRegion[];
  outputMode: PdfOutputMode;
  /** Null when the rows came from rules alone. */
  llmModel: string | null;
  pageRangeStart: number | null;
  pageRangeEnd: number | null;
  fingerprint: PdfTableFingerprint;
};

export type { PdfRegion, PdfRegionShape };
```

- [ ] **Step 7: Write the failing parser test**

Add to `PdfFileDatasetParsers.test.ts`:

```ts
describe("PdfFileDataset region parsing", () => {
  it("parses a multi-region row into camelCase regions", () => {
    const parsed = PdfFileDataset.Parsers.fromDBReadToModel({
      id: "11111111-1111-1111-1111-111111111111",
      dataset_id: "22222222-2222-2222-2222-222222222222",
      workspace_id: "33333333-3333-3333-3333-333333333333",
      created_at: "2026-08-18T00:00:00Z",
      updated_at: "2026-08-18T00:00:00Z",
      is_in_cloud_storage: false,
      size_in_bytes: 1024,
      has_original_file: true,
      output_mode: "observations",
      llm_model: null,
      page_range_start: null,
      page_range_end: null,
      fingerprint: { headers: ["state"], shape: [16, 2], hash: "abc" },
      regions: [
        {
          id: "r1",
          label: "Deaths by state",
          shape: "labelled_graphic",
          detectionMode: "manual",
          fragments: [{ page: 0, bbox: [330, 175, 590, 465] }],
          options: { ambiguityThreshold: 0.8 },
        },
      ],
    });

    expect(parsed.outputMode).toBe("observations");
    expect(parsed.llmModel).toBeNull();
    expect(parsed.regions).toHaveLength(1);
    expect(parsed.regions[0]!.shape).toBe("labelled_graphic");
    expect(parsed.regions[0]!.fragments[0]!.bbox).toEqual([330, 175, 590, 465]);
  });

  it("rejects a region with an unknown shape", () => {
    // A shape we do not have an extractor for must fail loudly at the
    // boundary rather than reaching a `match` that throws at extraction time.
    expect(() => {
      return PdfFileDataset.Parsers.fromDBReadToModel({
        // ... same row as above, with:
        regions: [
          {
            id: "r1",
            label: "x",
            shape: "sideways",
            detectionMode: "manual",
            fragments: [],
            options: {},
          },
        ],
      } as never);
    }).toThrow();
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `pnpm vitest run shared/models/datasets/PdfFileDataset/`
Expected: FAIL, the parser still expects `detection_mode` and friends.

- [ ] **Step 9: Update the parsers**

In `PdfFileDatasetParsers.ts`, replace the removed fields with a Zod schema for
the region array:

```ts
const PdfRegionFragmentSchema = z.object({
  page: z.number().int().nonnegative(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

const PdfRegionSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  shape: z.enum([
    "grid_table",
    "labelled_graphic",
    "repeating_blocks",
    "prose_measures",
  ]),
  detectionMode: z.enum(["tagged", "lattice", "stream", "manual"]),
  fragments: z.array(PdfRegionFragmentSchema),
  options: z.record(z.unknown()).default({}),
});
```

and use `z.array(PdfRegionSchema)` for `regions`, `z.enum(["natural",
"observations"])` for `outputMode`, and `z.string().nullable()` for `llmModel`.

- [ ] **Step 10: Run test to verify it passes**

Run: `pnpm vitest run shared/models/datasets/PdfFileDataset/`
Expected: PASS.

- [ ] **Step 11: Update the insert mutation**

In `createDatasetMutations.ts`, update `insertPdfFileDataset`'s RPC arguments
to pass `p_regions`, `p_output_mode` and `p_llm_model`, and drop the removed
ones.

- [ ] **Step 12: Verify and commit**

```bash
pnpm type-check
pnpm vitest run shared/models/datasets/PdfFileDataset/
supabase db reset
```

Expected: all pass, and the reset applies the new migration cleanly.

```bash
git add supabase/ shared/models/datasets/PdfFileDataset/ src/clients/datasets/
git commit -m "refactor: move per-region pdf settings into the regions column"
```

---

## Task 2: Clip page geometry to a region

**Files:**

- Create: `src/workers/pdfSniff/clipToRegion.ts`
- Create: `src/workers/pdfSniff/clipToRegion.test.ts`

Every extractor takes region geometry, never page geometry. This is the single
place that decides what "inside the box" means, and it has to handle a text
item that straddles the boundary without either dropping it or dragging in the
whole line.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/clipToRegion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { clipToRegion } from "./clipToRegion";
import type { PageGeometry, TextItem } from "./types";

function textItem(text: string, x: number, y: number, width = 30): TextItem {
  return {
    text,
    x,
    y,
    width,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function page(): PageGeometry {
  return {
    pageIndex: 0,
    width: 595,
    height: 842,
    looksScanned: false,
    rules: [
      { orientation: "horizontal", position: 500, span: [100, 400] },
      { orientation: "horizontal", position: 200, span: [100, 400] },
    ],
    textItems: [
      textItem("inside", 150, 450),
      textItem("also-inside", 300, 400),
      textItem("above", 150, 700),
      textItem("below", 150, 100),
      textItem("left", 20, 450),
      textItem("right", 550, 450),
    ],
  };
}

describe("clipToRegion", () => {
  it("keeps only items whose centre is inside the box", () => {
    const clipped = clipToRegion(page(), [100, 300, 500, 600]);

    expect(clipped.textItems.map((i) => i.text).sort()).toEqual([
      "also-inside",
      "inside",
    ]);
  });

  it("keeps rules that overlap the box", () => {
    const clipped = clipToRegion(page(), [100, 300, 500, 600]);

    expect(clipped.rules).toHaveLength(1);
    expect(clipped.rules[0]!.position).toBe(500);
  });

  it("reports the region's own bbox and origin page", () => {
    const clipped = clipToRegion(page(), [100, 300, 500, 600]);

    expect(clipped.bbox).toEqual([100, 300, 500, 600]);
    expect(clipped.pageIndex).toBe(0);
  });

  it("keeps an item straddling the edge when most of it is inside", () => {
    // A user drawing a box will rarely land exactly on a glyph boundary.
    // Dropping a mostly-inside item loses a value the user clearly meant to
    // include; keeping a mostly-outside one drags in a neighbouring column.
    const straddling: PageGeometry = {
      ...page(),
      textItems: [textItem("mostly-in", 480, 450, 40)],
    };

    const clipped = clipToRegion(straddling, [100, 300, 505, 600]);

    expect(clipped.textItems).toHaveLength(1);
  });

  it("drops an item mostly outside the edge", () => {
    const straddling: PageGeometry = {
      ...page(),
      textItems: [textItem("mostly-out", 480, 450, 40)],
    };

    const clipped = clipToRegion(straddling, [100, 300, 490, 600]);

    expect(clipped.textItems).toHaveLength(0);
  });

  it("returns empty geometry for a box over blank space", () => {
    const clipped = clipToRegion(page(), [0, 0, 10, 10]);

    expect(clipped.textItems).toEqual([]);
    expect(clipped.rules).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/clipToRegion.test.ts`
Expected: FAIL, cannot resolve `./clipToRegion`.

- [ ] **Step 3: Add the `RegionGeometry` type**

Append to `src/workers/pdfSniff/types.ts`:

```ts
/** Page geometry narrowed to one region. What every extractor consumes. */
export type RegionGeometry = {
  pageIndex: number;
  bbox: BBox;
  textItems: readonly TextItem[];
  rules: readonly RuleSegment[];
};
```

- [ ] **Step 4: Write the implementation**

Create `src/workers/pdfSniff/clipToRegion.ts`:

```ts
import type { BBox, PageGeometry, RegionGeometry, TextItem } from "./types";

/**
 * Fraction of a text item's width that must fall inside the box for the item
 * to be kept.
 *
 * A user drawing a rectangle will rarely land exactly on a glyph boundary, so
 * a strict containment test drops values they clearly meant to include. A
 * majority test keeps those while still excluding a neighbouring column that
 * the box only grazes.
 */
const MIN_INSIDE_FRACTION = 0.5;

function _insideFraction(item: TextItem, bbox: BBox): number {
  const [x0, y0, x1, y1] = bbox;
  const itemRight = item.x + item.width;
  const overlapWidth = Math.min(itemRight, x1) - Math.max(item.x, x0);
  if (overlapWidth <= 0 || item.width <= 0) {
    return 0;
  }
  // Vertically we use the baseline rather than the full glyph box: ascenders
  // and descenders vary by font and would make the test unpredictable.
  if (item.y < y0 || item.y > y1) {
    return 0;
  }
  return overlapWidth / item.width;
}

/**
 * Narrows a page to one region.
 *
 * The single definition of "inside the box" in the codebase. Every extractor
 * consumes the result, so a change here changes all four shapes at once,
 * which is the intent: users expect one selection rule, not four.
 */
export function clipToRegion(page: PageGeometry, bbox: BBox): RegionGeometry {
  const [x0, y0, x1, y1] = bbox;

  return {
    pageIndex: page.pageIndex,
    bbox,
    textItems: page.textItems.filter((item) => {
      return _insideFraction(item, bbox) >= MIN_INSIDE_FRACTION;
    }),
    rules: page.rules.filter((rule) => {
      if (rule.orientation === "horizontal") {
        const overlapsX = rule.span[1] >= x0 && rule.span[0] <= x1;
        return overlapsX && rule.position >= y0 && rule.position <= y1;
      }
      const overlapsY = rule.span[1] >= y0 && rule.span[0] <= y1;
      return overlapsY && rule.position >= x0 && rule.position <= x1;
    }),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/clipToRegion.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: clip pdf page geometry to a selected region"
```

---

## Task 3: Assemble multi-word labels

**Files:**

- Create: `src/workers/pdfSniff/assembleLabels.ts`
- Create: `src/workers/pdfSniff/assembleLabels.test.ts`

**Read the design spec's proximity experiment before starting.** This unit is
where two of the three failed runs during design originated, and both failures
are encoded below as tests.

The rule that matters: **same-line merging uses the horizontal edge gap between
words; stacked-line merging requires tight x-centre alignment.** Conflating
them fuses neighbouring place names on a dense map, and over-correcting splits
two-word names in half.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/assembleLabels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assembleLabels } from "./assembleLabels";
import type { TextItem } from "./types";

function label(text: string, x: number, y: number, width?: number): TextItem {
  return {
    text,
    x,
    y,
    width: width ?? text.length * 5,
    height: 8,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

describe("assembleLabels", () => {
  it("merges two words on the same line into one label", () => {
    // Regression: an earlier implementation compared centre distances, which
    // never merges long words, and split RED SEA into RED and SEA.
    const merged = assembleLabels([
      label("RED", 100, 500, 20),
      label("SEA", 123, 500, 20),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.text).toBe("RED SEA");
  });

  it("merges a name wrapped onto a second line", () => {
    const merged = assembleLabels([
      label("NORTH", 100, 500, 30),
      label("DARFUR", 98, 492, 34),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.text).toBe("NORTH DARFUR");
  });

  it("does not fuse two neighbouring labels on a dense map", () => {
    // Regression: KHARTOUM and KASSALA sit close together on the OCHA map.
    // An earlier implementation merged them into one label, which then
    // attracted both of their values.
    const merged = assembleLabels([
      label("KHARTOUM", 480, 500, 45),
      label("KASSALA", 540, 495, 40),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged.map((m) => m.text).sort()).toEqual(["KASSALA", "KHARTOUM"]);
  });

  it("does not stack two labels that are merely near each other", () => {
    // Same y-gap as a wrapped name, but the x centres are far apart.
    const merged = assembleLabels([
      label("SENNAR", 100, 500, 35),
      label("GEDAREF", 200, 492, 40),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("reports the merged centroid, not the first item's position", () => {
    const [merged] = assembleLabels([
      label("RED", 100, 500, 20),
      label("SEA", 123, 500, 20),
    ]);

    // Centre of the union box: x from 100 to 143.
    expect(merged!.cx).toBeCloseTo(121.5, 1);
    expect(merged!.cy).toBeCloseTo(504, 1);
  });

  it("merges three fragments into one label", () => {
    const merged = assembleLabels([
      label("WEST", 100, 500, 25),
      label("NORTH", 128, 500, 30),
      label("KORDOFAN", 100, 492, 50),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.text).toBe("WEST NORTH KORDOFAN");
  });

  it("returns an empty array for no items", () => {
    expect(assembleLabels([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/assembleLabels.test.ts`
Expected: FAIL, cannot resolve `./assembleLabels`.

- [ ] **Step 3: Add the `AssembledLabel` type**

Append to `src/workers/pdfSniff/types.ts`:

```ts
/** A label made of one or more text items, with its centroid. */
export type AssembledLabel = {
  text: string;
  cx: number;
  cy: number;
  bbox: BBox;
  items: readonly TextItem[];
};
```

- [ ] **Step 4: Write the implementation**

**Correction, found during execution.** The union-find implementation below is
wrong, and its own test suite catches it: "merges three fragments into one
label" fails, producing `WEST NORTH` and `KORDOFAN` instead of one label.

The reason is worth understanding, because it is a property of the problem
rather than a typo. Union-find does a **single pairwise pass over the original
items**. `WEST`'s centre is 112.5 and `NORTH`'s is 143; `KORDOFAN`'s is 125.
Neither is within `STACKED_MAX_CENTRE_DELTA` (12) of `KORDOFAN` on its own, at
12.5 and 18. But `WEST` and `NORTH` merge on the same line first, and the
_merged_ label's centre is 129, only 4 from `KORDOFAN`. A pairwise pass can
never find that, because it never re-evaluates against merged geometry.

**The shipped implementation is agglomerative instead**: it tracks clusters
with a running bbox and mean baseline, and repeatedly finds and merges the
first mergeable pair, recomputing cluster geometry after each merge, until no
pair remains. See `src/workers/pdfSniff/assembleLabels.ts`.

All four tuning constants are unchanged, and so are the two rules. The fix is
procedural, not a relaxed tolerance. Do not "simplify" it back to a single
pass.

The code below is kept for the constants and the two merge rules, which are
correct. Take the merge procedure from the shipped file.

```ts
import type { AssembledLabel, BBox, TextItem } from "./types";

/**
 * Maximum horizontal gap, in points, between two words on the same line for
 * them to belong to one label.
 *
 * Measured as the EDGE gap, not the distance between centres. Centre distance
 * scales with word length, so a centre-based test never merges long words:
 * that bug split RED SEA into two labels during design.
 */
const SAME_LINE_MAX_GAP = 8;

/** Baselines within this differ by less than a line and count as the same. */
const SAME_LINE_TOLERANCE = 3.5;

/**
 * Maximum distance between x centres for two lines to be one wrapped label.
 *
 * Tight on purpose. On a dense map, neighbouring place names sit closer to
 * each other than a wrapped name's two halves sit to anything else, so a
 * loose test fuses KHARTOUM with KASSALA.
 */
const STACKED_MAX_CENTRE_DELTA = 12;

/** Vertical gap that counts as the next line rather than a distant label. */
const STACKED_MAX_LINE_GAP = 11;

function _centreX(item: TextItem): number {
  return item.x + item.width / 2;
}

function _shouldMerge(a: TextItem, b: TextItem): boolean {
  const dy = Math.abs(a.y - b.y);

  if (dy < SAME_LINE_TOLERANCE) {
    const gap = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
    return gap <= SAME_LINE_MAX_GAP;
  }

  if (dy <= STACKED_MAX_LINE_GAP) {
    return Math.abs(_centreX(a) - _centreX(b)) <= STACKED_MAX_CENTRE_DELTA;
  }

  return false;
}

function _toLabel(group: readonly TextItem[]): AssembledLabel {
  const ordered = [...group].sort((a, b) => {
    // Reading order within the label: top line first, then left to right.
    const dy = b.y - a.y;
    return Math.abs(dy) > SAME_LINE_TOLERANCE ? dy : a.x - b.x;
  });

  const x0 = Math.min(...ordered.map((i) => i.x));
  const y0 = Math.min(...ordered.map((i) => i.y));
  const x1 = Math.max(...ordered.map((i) => i.x + i.width));
  const y1 = Math.max(...ordered.map((i) => i.y + i.height));
  const bbox: BBox = [x0, y0, x1, y1];

  return {
    text: ordered.map((i) => i.text).join(" "),
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    bbox,
    items: ordered,
  };
}

/**
 * Groups text items into whole labels.
 *
 * Exists because a map label like NORTH DARFUR arrives as two or three
 * separate text items, and matching values to half a name produces confident
 * nonsense. Getting this wrong was the single largest source of error when
 * the association algorithm was measured against the OCHA choropleth during
 * design, in both directions: too greedy fused adjacent states, too strict
 * split two-word names.
 */
export function assembleLabels(
  items: readonly TextItem[],
): readonly AssembledLabel[] {
  if (items.length === 0) {
    return [];
  }

  // Union-find so that A-B and B-C put A, B and C in one group regardless of
  // the order the pairs are discovered.
  const parent = items.map((_, index) => {
    return index;
  });

  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]!]!;
      root = parent[root]!;
    }
    return root;
  };

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (_shouldMerge(items[i]!, items[j]!)) {
        parent[find(i)] = find(j);
      }
    }
  }

  const groups = new Map<number, TextItem[]>();
  items.forEach((item, index) => {
    const root = find(index);
    const existing = groups.get(root);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(root, [item]);
    }
  });

  return [...groups.values()].map(_toLabel);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/assembleLabels.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: assemble multi-word labels from separate text items"
```

---

## Task 4: Pair values to labels by proximity

**Files:**

- Create: `src/workers/pdfSniff/pairByProximity.ts`
- Create: `src/workers/pdfSniff/pairByProximity.test.ts`

The core primitive of labelled-graphic extraction, and the one measured during
design. It must return an **uncertainty signal**, not just a match: the ratio
of best distance to runner-up distance caught one of the two errors in the
measured run, and it is the only thing standing between a plausible guess and
a silent import.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/pairByProximity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pairByProximity } from "./pairByProximity";
import type { AssembledLabel, TextItem } from "./types";

function label(text: string, cx: number, cy: number): AssembledLabel {
  return {
    text,
    cx,
    cy,
    bbox: [cx - 20, cy - 4, cx + 20, cy + 4],
    items: [],
  };
}

function value(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: 12,
    height: 8,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

describe("pairByProximity", () => {
  it("pairs each value with its nearest label", () => {
    const pairs = pairByProximity({
      values: [value("408", 490, 305)],
      labels: [label("KHARTOUM", 497, 302), label("KASSALA", 600, 400)],
    });

    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.label).toBe("KHARTOUM");
    expect(pairs[0]!.value).toBe("408");
  });

  it("reports an ambiguity ratio for every pair", () => {
    const pairs = pairByProximity({
      values: [value("83", 480, 285)],
      labels: [label("RIVER NILE", 483, 283), label("RED SEA", 510, 254)],
    });

    // Best over runner-up. Near 1 means the two candidates are equally close.
    expect(pairs[0]!.ambiguityRatio).toBeGreaterThan(0);
    expect(pairs[0]!.ambiguityRatio).toBeLessThanOrEqual(1);
  });

  it("flags a pair whose runner-up is nearly as close", () => {
    // Regression from the design measurement: on the OCHA map, 83 sat almost
    // equidistant between RIVER NILE and RED SEA at a ratio of 0.94. The pair
    // happened to be right, but shipping it unflagged would have been luck.
    const pairs = pairByProximity({
      values: [value("83", 480, 285)],
      labels: [label("RIVER NILE", 483, 283), label("RED SEA", 484, 287)],
    });

    expect(pairs[0]!.isAmbiguous).toBe(true);
  });

  it("does not flag a pair with a clear winner", () => {
    const pairs = pairByProximity({
      values: [value("29", 428, 262)],
      labels: [label("NORTHERN", 427, 261), label("RED SEA", 700, 700)],
    });

    expect(pairs[0]!.isAmbiguous).toBe(false);
  });

  it("reports labels that matched no value", () => {
    // A state with no figure printed on it is information, not noise: the
    // reviewer needs to know we saw the label and found nothing for it.
    const result = pairByProximity({
      values: [value("408", 490, 305)],
      labels: [label("KHARTOUM", 497, 302), label("ABYEI", 100, 100)],
    });

    expect(result.unmatchedLabels).toEqual(["ABYEI"]);
  });

  it("reports values that matched no label", () => {
    const result = pairByProximity({
      values: [value("408", 490, 305)],
      labels: [],
    });

    expect(result.unmatchedValues).toEqual(["408"]);
    expect(result).toHaveLength(0);
  });

  it("never assigns one label to two values", () => {
    // Two figures next to one label means we have misread the graphic. Taking
    // the closer one and flagging the other is honest; silently overwriting
    // is not.
    const result = pairByProximity({
      values: [value("408", 490, 305), value("409", 492, 307)],
      labels: [label("KHARTOUM", 497, 302)],
    });

    expect(result).toHaveLength(1);
    expect(result.unmatchedValues).toEqual(["409"]);
  });

  it("respects a custom ambiguity threshold", () => {
    const strict = pairByProximity({
      values: [value("83", 480, 285)],
      labels: [label("A", 483, 283), label("B", 500, 300)],
      ambiguityThreshold: 0.1,
    });

    expect(strict[0]!.isAmbiguous).toBe(true);
  });

  it("returns nothing for empty input", () => {
    const result = pairByProximity({ values: [], labels: [] });

    expect(result).toHaveLength(0);
    expect(result.unmatchedLabels).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/pairByProximity.test.ts`
Expected: FAIL, cannot resolve `./pairByProximity`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/pairByProximity.ts`:

```ts
import type { AssembledLabel, TextItem } from "./types";

/**
 * Above this best-to-runner-up distance ratio, a pair is flagged for review.
 *
 * 0.8 was chosen from the design measurement against the OCHA choropleth: it
 * caught one of the two mistakes without flagging so much that review becomes
 * meaningless. It is not a confidence score, it is a "these two candidates
 * were nearly tied" signal.
 */
const DEFAULT_AMBIGUITY_THRESHOLD = 0.8;

export type ProximityPair = {
  value: string;
  label: string;
  /** Distance to the chosen label, in points. */
  distance: number;
  /** `bestDistance / runnerUpDistance`, or 0 when there is no runner-up. */
  ambiguityRatio: number;
  isAmbiguous: boolean;
  valueItem: TextItem;
  labelCentroid: { cx: number; cy: number };
};

export type ProximityResult = readonly ProximityPair[] & {
  unmatchedLabels: readonly string[];
  unmatchedValues: readonly string[];
};

function _distance(item: TextItem, label: AssembledLabel): number {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  return Math.hypot(cx - label.cx, cy - label.cy);
}

/**
 * Associates values with labels using position alone.
 *
 * Necessary because in a map or a labelled chart the PDF records no
 * relationship between a number and its caption: they are separate text items
 * that happen to be near each other, and reading order actively destroys the
 * pairing.
 *
 * Measured against the OCHA choropleth during design at 14 of 16 correct, with
 * 5 flagged and 1 silently wrong. That result is why this returns an
 * ambiguity signal and why the UI must never import its output unreviewed.
 *
 * Assignment is greedy by distance and one-to-one: the closest value-label
 * pair is fixed first, then the next closest among what remains. A label
 * cannot take two values, because a graphic where that looks true is one we
 * have misread.
 */
export function pairByProximity(params: {
  values: readonly TextItem[];
  labels: readonly AssembledLabel[];
  ambiguityThreshold?: number;
}): ProximityResult {
  const threshold = params.ambiguityThreshold ?? DEFAULT_AMBIGUITY_THRESHOLD;

  const scored = params.values.flatMap((valueItem) => {
    return params.labels.map((label) => {
      return { valueItem, label, distance: _distance(valueItem, label) };
    });
  });
  scored.sort((a, b) => {
    return a.distance - b.distance;
  });

  const usedValues = new Set<TextItem>();
  const usedLabels = new Set<AssembledLabel>();
  const pairs: ProximityPair[] = [];

  for (const candidate of scored) {
    if (
      usedValues.has(candidate.valueItem) ||
      usedLabels.has(candidate.label)
    ) {
      continue;
    }
    usedValues.add(candidate.valueItem);
    usedLabels.add(candidate.label);

    // The runner-up is the nearest label this value did NOT get, whether or
    // not that label is still free: what matters is how close the decision
    // was, not what happened to it afterwards.
    const runnerUp = params.labels
      .filter((label) => {
        return label !== candidate.label;
      })
      .reduce<number>((best, label) => {
        return Math.min(best, _distance(candidate.valueItem, label));
      }, Number.POSITIVE_INFINITY);

    const ambiguityRatio =
      Number.isFinite(runnerUp) && runnerUp > 0
        ? candidate.distance / runnerUp
        : 0;

    pairs.push({
      value: candidate.valueItem.text,
      label: candidate.label.text,
      distance: candidate.distance,
      ambiguityRatio,
      isAmbiguous: ambiguityRatio > threshold,
      valueItem: candidate.valueItem,
      labelCentroid: { cx: candidate.label.cx, cy: candidate.label.cy },
    });
  }

  const result = pairs as unknown as {
    unmatchedLabels: readonly string[];
    unmatchedValues: readonly string[];
  } & ProximityPair[];

  result.unmatchedLabels = params.labels
    .filter((label) => {
      return !usedLabels.has(label);
    })
    .map((label) => {
      return label.text;
    });
  result.unmatchedValues = params.values
    .filter((item) => {
      return !usedValues.has(item);
    })
    .map((item) => {
      return item.text;
    });

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/pairByProximity.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: pair values to labels by proximity with an ambiguity signal"
```

---

## Task 5: Extract a labelled graphic

**Files:**

- Create: `src/workers/pdfSniff/extractors/extractLabelledGraphic.ts`
- Create: `src/workers/pdfSniff/extractors/extractLabelledGraphic.test.ts`

Composes `assembleLabels` and `pairByProximity` into an `ExtractedTable`. This
is the extractor that reads the OCHA map, the KPI tiles and the funding bars.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/extractors/extractLabelledGraphic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractLabelledGraphic } from "./extractLabelledGraphic";
import type { RegionGeometry, TextItem } from "../types";

function item(text: string, x: number, y: number, width?: number): TextItem {
  return {
    text,
    x,
    y,
    width: width ?? text.length * 5,
    height: 8,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function region(textItems: readonly TextItem[]): RegionGeometry {
  return { pageIndex: 0, bbox: [0, 0, 600, 600], textItems, rules: [] };
}

describe("extractLabelledGraphic", () => {
  it("produces a two-column label-and-value table", () => {
    const result = extractLabelledGraphic(
      region([
        item("KHARTOUM", 480, 302, 45),
        item("408", 490, 292, 15),
        item("KASSALA", 560, 402, 40),
        item("200", 566, 392, 15),
      ]),
      { regionId: "r1" },
    );

    expect(result.cells[0]).toEqual(["label", "value"]);
    expect(result.headerRows).toBe(1);
    expect(result.cells.slice(1)).toEqual([
      ["KHARTOUM", "408"],
      ["KASSALA", "200"],
    ]);
  });

  it("normalises values through normalizeCellValue", () => {
    const result = extractLabelledGraphic(
      region([item("WASH", 100, 300, 25), item("$3,000", 100, 290, 30)]),
      { regionId: "r1" },
    );

    expect(result.cells[1]).toEqual(["WASH", "3000"]);
  });

  it("flags an ambiguous pair with its position", () => {
    const result = extractLabelledGraphic(
      region([
        item("RIVER NILE", 480, 283, 45),
        item("RED SEA", 484, 287, 35),
        item("83", 482, 285, 12),
      ]),
      { regionId: "r1" },
    );

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0]!.reason).toBe("ambiguous_association");
    expect(result.flags[0]!.rowIndex).toBe(0);
  });

  it("keeps an unmatched label as a row with an empty value", () => {
    // Dropping it would quietly shrink the dataset. A reviewer needs to see
    // that we found the label and no figure for it.
    const result = extractLabelledGraphic(
      region([
        item("KHARTOUM", 480, 302, 45),
        item("408", 490, 292, 15),
        item("ABYEI", 100, 100, 25),
      ]),
      { regionId: "r1" },
    );

    expect(result.cells).toContainEqual(["ABYEI", ""]);
    expect(result.flags.some((f) => f.reason === "unmatched_label")).toBe(true);
  });

  it("treats a legend's bin boundaries as values, not labels", () => {
    // Documented failure from design: a region that includes the choropleth
    // legend reads 10, 500, 1,000 as state data. A user-drawn box excludes
    // the legend, but when it does not, the run of bare numbers with no
    // nearby label must surface as unmatched rather than be paired to
    // whatever state happens to be closest.
    const result = extractLabelledGraphic(
      region([
        item("KHARTOUM", 480, 302, 45),
        item("408", 490, 292, 15),
        item("10", 100, 50, 10),
        item("500", 140, 50, 15),
        item("1,000", 180, 50, 20),
      ]),
      { regionId: "r1" },
    );

    expect(
      result.flags.filter((f) => f.reason === "unmatched_value"),
    ).toHaveLength(3);
  });

  it("records row provenance for the page overlay", () => {
    const result = extractLabelledGraphic(
      region([item("KHARTOUM", 480, 302, 45), item("408", 490, 292, 15)]),
      { regionId: "r1" },
    );

    expect(result.rowProvenance).toHaveLength(1);
    expect(result.rowProvenance[0]!.page).toBe(0);
  });

  it("reports rules-based extraction", () => {
    const result = extractLabelledGraphic(
      region([item("A", 100, 300, 10), item("1", 100, 290, 10)]),
      { regionId: "r1" },
    );

    expect(result.extractedBy).toBe("rules");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractLabelledGraphic.test.ts`
Expected: FAIL, cannot resolve `./extractLabelledGraphic`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/extractors/extractLabelledGraphic.ts`:

```ts
import { assembleLabels } from "../assembleLabels";
import { normalizeCellValue } from "../normalizeCellValue";
import { pairByProximity } from "../pairByProximity";
import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
  RegionGeometry,
  TextItem,
} from "../types";

/** A text item that is entirely numeric is a value; anything else is a label. */
const VALUE_PATTERN = /^[$€£¥]?\s*-?[\d][\d,. ]*\s*%?$/u;

function _isValue(item: TextItem): boolean {
  return VALUE_PATTERN.test(item.text.trim());
}

function _bboxOf(item: TextItem): BBox {
  return [item.x, item.y, item.x + item.width, item.y + item.height];
}

/**
 * Reads a map, chart or KPI tile whose values are text at coordinates.
 *
 * The PDF records no link between a figure and its caption, so the pairing has
 * to be recovered geometrically. Everything uncertain is flagged rather than
 * dropped or silently resolved, because the measurement behind this extractor
 * showed that roughly one pair in eight is a near-tie and roughly one in
 * sixteen is simply wrong.
 */
export function extractLabelledGraphic(
  region: RegionGeometry,
  options: { regionId: string; ambiguityThreshold?: number },
): ExtractedTable {
  const values = region.textItems.filter(_isValue);
  const labelItems = region.textItems.filter((item) => {
    return !_isValue(item) && item.text.trim().length > 0;
  });

  const labels = assembleLabels(labelItems);
  const pairs = pairByProximity({
    values,
    labels,
    ambiguityThreshold: options.ambiguityThreshold,
  });

  const cells: string[][] = [["label", "value"]];
  const flags: PdfCellFlag[] = [];
  const rowProvenance: { page: number; bbox: BBox }[] = [];

  pairs.forEach((pair, index) => {
    cells.push([pair.label, normalizeCellValue(pair.value)]);
    rowProvenance.push({
      page: region.pageIndex,
      bbox: _bboxOf(pair.valueItem),
    });

    if (pair.isAmbiguous) {
      flags.push({
        rowIndex: index,
        columnIndex: 0,
        reason: "ambiguous_association",
        detail:
          `"${pair.value}" was nearly as close to another label ` +
          `(${pair.ambiguityRatio.toFixed(2)} of the winning distance). ` +
          "Check it against the page.",
      });
    }
  });

  for (const unmatched of pairs.unmatchedLabels) {
    const rowIndex = cells.length - 1;
    cells.push([unmatched, ""]);
    rowProvenance.push({ page: region.pageIndex, bbox: region.bbox });
    flags.push({
      rowIndex,
      columnIndex: 1,
      reason: "unmatched_label",
      detail: `No value was found near "${unmatched}".`,
    });
  }

  for (const unmatched of pairs.unmatchedValues) {
    flags.push({
      rowIndex: -1,
      columnIndex: -1,
      reason: "unmatched_value",
      detail:
        `"${unmatched}" had no label near it, so it was left out. If this ` +
        "is real data, the region may include a legend or an axis.",
    });
  }

  return {
    regionId: options.regionId,
    cells,
    headerRows: 1,
    flags,
    extractedBy: "rules",
    rowProvenance,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractLabelledGraphic.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: extract labelled graphics from maps, charts and kpi tiles"
```

---

## Task 6: Parse run-in labels

**Files:**

- Create: `src/workers/pdfSniff/parseRunInLabels.ts`
- Create: `src/workers/pdfSniff/parseRunInLabels.test.ts`

`Responses:` / `Challenges:` / `Priorities:` under a numbered heading is the
standard house style of OCHA, WHO and UNHCR situation reporting, so a rule for
it generalises across a corpus rather than one file.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/parseRunInLabels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseRunInLabels } from "./parseRunInLabels";
import type { TextLine } from "./types";

function line(text: string, y: number, fontName = "body"): TextLine {
  return {
    y,
    text,
    items: [
      {
        text,
        x: 100,
        y,
        width: text.length * 4,
        height: 9,
        fontName,
        unmappedCharRatio: 0,
      },
    ],
  };
}

describe("parseRunInLabels", () => {
  it("splits a numbered heading from its labelled paragraphs", () => {
    const blocks = parseRunInLabels([
      line("1. Surveillance, early detection and case management", 500, "bold"),
      line("Responses: To strengthen outbreak surveillance", 480),
      line("Challenges: Reporting delays hinder confirmation", 460),
      line("Priorities: Maintaining and expanding CTCs", 440),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.heading).toBe(
      "Surveillance, early detection and case management",
    );
    expect(blocks[0]!.number).toBe(1);
    expect(blocks[0]!.fields).toEqual({
      Responses: "To strengthen outbreak surveillance",
      Challenges: "Reporting delays hinder confirmation",
      Priorities: "Maintaining and expanding CTCs",
    });
  });

  it("joins a field that wraps onto following lines", () => {
    const blocks = parseRunInLabels([
      line("2. Water quality", 500, "bold"),
      line("Responses: Providing safe water and proper", 480),
      line("sanitation is central to stopping cholera.", 460),
      line("Challenges: One in four water sources is unsafe", 440),
    ]);

    expect(blocks[0]!.fields.Responses).toBe(
      "Providing safe water and proper sanitation is central to stopping cholera.",
    );
  });

  it("returns several blocks from one region", () => {
    const blocks = parseRunInLabels([
      line("1. Surveillance", 500, "bold"),
      line("Responses: A", 480),
      line("2. Water quality", 440, "bold"),
      line("Responses: B", 420),
    ]);

    expect(blocks.map((b) => b.number)).toEqual([1, 2]);
  });

  it("ignores a colon in the middle of a sentence", () => {
    // "at 09:00" and "the following: a, b" must not become field labels.
    const blocks = parseRunInLabels([
      line("1. Logistics", 500, "bold"),
      line("Responses: Deliveries arrive at 09:00 daily", 480),
    ]);

    expect(Object.keys(blocks[0]!.fields)).toEqual(["Responses"]);
    expect(blocks[0]!.fields.Responses).toBe(
      "Deliveries arrive at 09:00 daily",
    );
  });

  it("returns nothing when there is no numbered heading", () => {
    const blocks = parseRunInLabels([
      line("Just a paragraph of prose with no structure at all.", 500),
    ]);

    expect(blocks).toEqual([]);
  });

  it("handles a heading with no number", () => {
    // FUNDING and HIGHLIGHTS are section headings in the same documents.
    const blocks = parseRunInLabels([
      line("FUNDING", 500, "bold"),
      line("Responses: Partners require $50 million", 480),
    ]);

    expect(blocks[0]!.number).toBeNull();
    expect(blocks[0]!.heading).toBe("FUNDING");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/parseRunInLabels.test.ts`
Expected: FAIL, cannot resolve `./parseRunInLabels`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/parseRunInLabels.ts`:

```ts
import type { TextLine } from "./types";

export type RunInBlock = {
  /** The leading number, or null for an unnumbered section heading. */
  number: number | null;
  heading: string;
  /** Run-in label to its paragraph, in document order. */
  fields: Record<string, string>;
};

/** `1. Surveillance, early detection and case management` */
const NUMBERED_HEADING = /^(\d{1,2})[.)]\s+(.{3,})$/u;

/**
 * A run-in label: one to three capitalised words followed by a colon at the
 * start of a line.
 *
 * Anchored to the line start and capped at three words on purpose. An
 * unanchored colon match turns "arrive at 09:00 daily" into a field called
 * "arrive at 09" and swallows the rest of the paragraph.
 */
const RUN_IN_LABEL = /^([A-Z][A-Za-z]{2,}(?:\s+[A-Za-z]+){0,2}):\s*(.*)$/u;

function _isHeadingLine(line: TextLine): boolean {
  if (NUMBERED_HEADING.test(line.text)) {
    return true;
  }
  // An all-caps line with no colon is a section heading in this house style.
  const isAllCaps = line.text === line.text.toUpperCase();
  return isAllCaps && line.text.length > 2 && !line.text.includes(":");
}

/**
 * Reads numbered headings with run-in labelled paragraphs into records.
 *
 * This layout is a table wearing a magazine layout: six pillars by four
 * fields, laid out as prose across two columns. Recovering it is the cheapest
 * real structure in a situation report, and because the style is shared across
 * OCHA, WHO and UNHCR reporting, the rule pays off well beyond one document.
 */
export function parseRunInLabels(
  lines: readonly TextLine[],
): readonly RunInBlock[] {
  const blocks: RunInBlock[] = [];
  let current: RunInBlock | null = null;
  let currentField: string | null = null;

  for (const line of lines) {
    const text = line.text.trim();
    if (text.length === 0) {
      continue;
    }

    if (_isHeadingLine(line)) {
      if (current) {
        blocks.push(current);
      }
      const numbered = NUMBERED_HEADING.exec(text);
      current = {
        number: numbered ? Number(numbered[1]) : null,
        heading: numbered ? numbered[2]!.trim() : text,
        fields: {},
      };
      currentField = null;
      continue;
    }

    if (!current) {
      continue;
    }

    const labelled = RUN_IN_LABEL.exec(text);
    if (labelled) {
      currentField = labelled[1]!;
      current.fields[currentField] = labelled[2]!.trim();
      continue;
    }

    // A continuation of the field we are inside. Without this, every wrapped
    // line would be discarded and fields would end mid-sentence.
    if (currentField) {
      const existing = current.fields[currentField] ?? "";
      current.fields[currentField] = `${existing} ${text}`.trim();
    }
  }

  if (current) {
    blocks.push(current);
  }

  return blocks.filter((block) => {
    return Object.keys(block.fields).length > 0;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/parseRunInLabels.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: parse numbered headings with run-in labels"
```

---

## Task 7: Extract repeating blocks

**Files:**

- Create: `src/workers/pdfSniff/extractors/extractRepeatingBlocks.ts`
- Create: `src/workers/pdfSniff/extractors/extractRepeatingBlocks.test.ts`

Turns `parseRunInLabels` output into a table whose columns are the union of the
field labels found.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/extractors/extractRepeatingBlocks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractRepeatingBlocks } from "./extractRepeatingBlocks";
import type { RegionGeometry, TextItem } from "../types";

function items(lines: readonly [string, number, string?][]): TextItem[] {
  return lines.map(([text, y, fontName]) => {
    return {
      text,
      x: 100,
      y,
      width: text.length * 4,
      height: 9,
      fontName: fontName ?? "body",
      unmappedCharRatio: 0,
    };
  });
}

function region(textItems: readonly TextItem[]): RegionGeometry {
  return { pageIndex: 1, bbox: [0, 0, 600, 600], textItems, rules: [] };
}

describe("extractRepeatingBlocks", () => {
  it("builds one row per block with a column per field", () => {
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. Surveillance", 500, "bold"],
          ["Responses: To strengthen surveillance", 480],
          ["Challenges: Reporting delays", 460],
          ["2. Water quality", 420, "bold"],
          ["Responses: Providing safe water", 400],
          ["Challenges: One in four sources unsafe", 380],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.cells[0]).toEqual([
      "number",
      "heading",
      "Responses",
      "Challenges",
    ]);
    expect(result.cells[1]).toEqual([
      "1",
      "Surveillance",
      "To strengthen surveillance",
      "Reporting delays",
    ]);
  });

  it("leaves a missing field empty rather than shifting columns", () => {
    // A pillar missing one of its labels must not slide the remaining values
    // one column left, which would silently mislabel every value after it.
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. Surveillance", 500, "bold"],
          ["Responses: A", 480],
          ["Challenges: B", 460],
          ["2. Water", 420, "bold"],
          ["Challenges: C", 400],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.cells[2]).toEqual(["2", "Water", "", "C"]);
  });

  it("orders columns by first appearance, not alphabetically", () => {
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. X", 500, "bold"],
          ["Responses: A", 480],
          ["Challenges: B", 460],
          ["Priorities: C", 440],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.cells[0]!.slice(2)).toEqual([
      "Responses",
      "Challenges",
      "Priorities",
    ]);
  });

  it("returns an empty table when no blocks are found", () => {
    const result = extractRepeatingBlocks(
      region(items([["Just prose, no structure at all.", 500]])),
      { regionId: "r1" },
    );

    expect(result.cells).toEqual([]);
    expect(result.flags).toHaveLength(1);
  });

  it("records provenance on the region's page", () => {
    const result = extractRepeatingBlocks(
      region(
        items([
          ["1. X", 500, "bold"],
          ["Responses: A", 480],
        ]),
      ),
      { regionId: "r1" },
    );

    expect(result.rowProvenance[0]!.page).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractRepeatingBlocks.test.ts`
Expected: FAIL, cannot resolve `./extractRepeatingBlocks`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/extractors/extractRepeatingBlocks.ts`:

```ts
import { groupLines } from "../groupLines";
import { parseRunInLabels } from "../parseRunInLabels";
import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
  RegionGeometry,
} from "../types";

/**
 * Reads numbered sections with run-in labels into one row per section.
 *
 * Columns are the union of every field label seen, in order of first
 * appearance rather than alphabetical, because the document's own order
 * (Responses, then Challenges, then Priorities) is meaningful and sorting
 * would scramble it.
 */
export function extractRepeatingBlocks(
  region: RegionGeometry,
  options: { regionId: string },
): ExtractedTable {
  const blocks = parseRunInLabels(groupLines(region.textItems));

  if (blocks.length === 0) {
    return {
      regionId: options.regionId,
      cells: [],
      headerRows: 0,
      flags: [
        {
          rowIndex: -1,
          columnIndex: -1,
          reason: "unmatched_value",
          detail:
            "No numbered headings with run-in labels were found in this " +
            "region. If the text is a plain paragraph, try reading it as " +
            "prose measurements instead.",
        },
      ],
      extractedBy: "rules",
      rowProvenance: [],
    };
  }

  const fieldNames: string[] = [];
  for (const block of blocks) {
    for (const name of Object.keys(block.fields)) {
      if (!fieldNames.includes(name)) {
        fieldNames.push(name);
      }
    }
  }

  const header = ["number", "heading", ...fieldNames];
  const cells: string[][] = [header];
  const flags: PdfCellFlag[] = [];
  const rowProvenance: { page: number; bbox: BBox }[] = [];

  blocks.forEach((block, index) => {
    cells.push([
      block.number === null ? "" : String(block.number),
      block.heading,
      // An absent field is an empty string in its own column, never a shift.
      // Shifting would silently relabel every value to its right.
      ...fieldNames.map((name) => {
        return block.fields[name] ?? "";
      }),
    ]);
    rowProvenance.push({ page: region.pageIndex, bbox: region.bbox });

    fieldNames.forEach((name, columnOffset) => {
      if (block.fields[name] === undefined) {
        flags.push({
          rowIndex: index,
          columnIndex: 2 + columnOffset,
          reason: "unmatched_label",
          detail: `"${block.heading}" has no ${name} section.`,
        });
      }
    });
  });

  return {
    regionId: options.regionId,
    cells,
    headerRows: 1,
    flags,
    extractedBy: "rules",
    rowProvenance,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractRepeatingBlocks.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: extract repeating labelled blocks into rows"
```

---

## Task 8: Extract measurements from sentences

**Files:**

- Create: `src/workers/pdfSniff/extractMeasurements.ts`
- Create: `src/workers/pdfSniff/extractMeasurements.test.ts`

The hardest rule-based unit in the plan, and the one the model assist in Task
18 exists to supplement. Its job is to turn a sentence into observations.

**Be honest about its ceiling.** It handles the common patterns in the gate
documents and will miss constructions it was not built for. That is acceptable
precisely because Task 18 offers the model for the rest, and because the review
grid shows the user what was found. What is not acceptable is a confident wrong
reading, so every heuristic below fails towards extracting nothing.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/extractMeasurements.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractMeasurements } from "./extractMeasurements";

describe("extractMeasurements", () => {
  it("reads several measurements from one sentence", () => {
    // From the IMC situation report, page 1.
    const found = extractMeasurements(
      "In June, 21,563 cases and 388 deaths have been reported.",
    );

    expect(found).toEqual([
      expect.objectContaining({ metric: "cases", value: 21563 }),
      expect.objectContaining({ metric: "deaths", value: 388 }),
    ]);
  });

  it("attaches a trailing subject clause to the measurements it governs", () => {
    // "166 cases and 13 deaths in South Darfur": the subject arrives at the
    // end and applies to both figures before it.
    const found = extractMeasurements(
      "There were 166 cases and 13 deaths in South Darfur.",
    );

    expect(found).toHaveLength(2);
    expect(found.every((m) => m.subject === "South Darfur")).toBe(true);
  });

  it("reads a number written as a word", () => {
    // "one death in West Darfur" is the case that defeats a digits-only
    // regex, and it appears in the gate document.
    const found = extractMeasurements("and one death in West Darfur.");

    expect(found[0]).toMatchObject({
      metric: "death",
      value: 1,
      subject: "West Darfur",
    });
  });

  it("expands a scale word into the full number", () => {
    const found = extractMeasurements(
      "More than 33.5 million people are at risk.",
    );

    expect(found[0]).toMatchObject({ value: 33_500_000, metric: "people" });
  });

  it("reads a currency amount with a scale word", () => {
    const found = extractMeasurements(
      "Urgent funding of $50 million is needed.",
    );

    expect(found[0]).toMatchObject({ value: 50_000_000, unit: "usd" });
  });

  it("reads a percentage written either way", () => {
    expect(extractMeasurements("funded at 16 per cent")[0]).toMatchObject({
      value: 16,
      unit: "percent",
    });
    expect(
      extractMeasurements("a case fatality rate of 2.6%")[0],
    ).toMatchObject({ value: 2.6, unit: "percent" });
  });

  it("keeps a multi-word metric", () => {
    const found = extractMeasurements(
      "EWARS has been expanded to 573 health facilities in Darfur.",
    );

    expect(found[0]).toMatchObject({
      value: 573,
      metric: "health facilities",
      subject: "Darfur",
    });
  });

  it("records the sentence each measurement came from", () => {
    const sentence = "In June, 21,563 cases were reported.";
    const found = extractMeasurements(sentence);

    expect(found[0]!.sourceText).toBe(sentence);
  });

  it("ignores a year, which is a date and not a measurement", () => {
    // "Since July 2024" and "in 2025 alone" would otherwise produce
    // measurements of 2024 and 2025 with nonsense metrics.
    expect(extractMeasurements("Since July 2024, cases have risen.")).toEqual(
      [],
    );
    expect(extractMeasurements("In 2025 alone, cases rose.")).toEqual([]);
  });

  it("ignores a bare number with no following noun", () => {
    expect(extractMeasurements("Only 12 of them.")).toEqual([]);
  });

  it("returns nothing for a sentence with no numbers", () => {
    expect(
      extractMeasurements("The outbreak remains widespread and severe."),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/extractMeasurements.test.ts`
Expected: FAIL, cannot resolve `./extractMeasurements`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/extractMeasurements.ts`:

```ts
export type Measurement = {
  subject: string | null;
  metric: string;
  value: number;
  unit: "n" | "percent" | "usd";
  sourceText: string;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const SCALE_WORDS: Record<string, number> = {
  hundred: 100,
  thousand: 1_000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

/**
 * Words that follow a number without being what the number counts. Without
 * this list, "573 health facilities" is fine but "more than 80,000 cases"
 * would report a metric of "cases" correctly while "over 22,000 suspected
 * cases" would report "suspected cases", which is the desired behaviour, and
 * "of 50 million" would report a metric of "million".
 */
const SCALE_WORD_SET = new Set(Object.keys(SCALE_WORDS));

/** A trailing "in <Place>" clause naming the subject of the measurements. */
const SUBJECT_CLAUSE =
  /\bin\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})\b(?=[.,;]|$)/u;

/**
 * A number, optionally preceded by a currency symbol and followed by a scale
 * word, then the noun phrase it measures.
 */
const MEASUREMENT = new RegExp(
  String.raw`([$€£])?\s*` +
    String.raw`(\d[\d,]*(?:\.\d+)?|\b(?:${Object.keys(NUMBER_WORDS).join("|")})\b)` +
    String.raw`\s*(%)?` +
    String.raw`(?:\s+(hundred|thousand|million|billion))?` +
    String.raw`(?:\s+(per\s+cent))?` +
    String.raw`((?:\s+[a-z][A-Za-z-]*){0,3})`,
  "gu",
);

/** A four-digit number on its own is a year, not a measurement. */
function _isYear(raw: string, metric: string): boolean {
  return /^(19|20)\d{2}$/u.test(raw.replace(/,/gu, "")) && metric.length === 0;
}

function _parseNumber(raw: string): number {
  const word = NUMBER_WORDS[raw.toLowerCase()];
  if (word !== undefined) {
    return word;
  }
  return Number(raw.replace(/,/gu, ""));
}

/**
 * Trims a captured noun phrase down to the words that actually name what was
 * measured.
 *
 * Stops at the first word that cannot be part of a metric ("have", "were",
 * "is") so that "21,563 cases have been reported" yields "cases" rather than
 * "cases have been reported".
 */
const STOP_WORDS = new Set([
  "have",
  "has",
  "had",
  "was",
  "were",
  "is",
  "are",
  "been",
  "being",
  "and",
  "or",
  "of",
  "to",
  "from",
  "with",
  "that",
  "which",
  "will",
  "would",
  "reported",
  "recorded",
  "documented",
  "needed",
  "alone",
]);

function _cleanMetric(phrase: string): string {
  const words: string[] = [];
  for (const word of phrase.trim().split(/\s+/u).filter(Boolean)) {
    if (STOP_WORDS.has(word.toLowerCase()) || SCALE_WORD_SET.has(word)) {
      break;
    }
    words.push(word);
  }
  return words.join(" ");
}

/**
 * Pulls measurements out of a sentence.
 *
 * Deliberately conservative: every branch below prefers extracting nothing to
 * extracting something wrong, because a wrong number in an imported dataset
 * is far more damaging than a missing one the user can see is missing. The
 * model assist exists to raise recall without loosening these rules.
 */
export function extractMeasurements(sentence: string): readonly Measurement[] {
  const subjectMatch = SUBJECT_CLAUSE.exec(sentence);
  const subject = subjectMatch ? subjectMatch[1]!.trim() : null;

  const found: Measurement[] = [];
  MEASUREMENT.lastIndex = 0;

  let match = MEASUREMENT.exec(sentence);
  while (match !== null) {
    const [, currency, rawNumber, percentSign, scaleWord, perCent, tail] =
      match;
    const metric = _cleanMetric(tail ?? "");

    const isPercent = Boolean(percentSign) || Boolean(perCent);
    const hasMeaning = metric.length > 0 || isPercent || Boolean(currency);

    if (hasMeaning && !_isYear(rawNumber!, metric)) {
      const scale = scaleWord ? SCALE_WORDS[scaleWord]! : 1;
      found.push({
        subject,
        metric: isPercent && metric.length === 0 ? "percentage" : metric,
        value: _parseNumber(rawNumber!) * scale,
        unit: currency ? "usd" : isPercent ? "percent" : "n",
        sourceText: sentence.trim(),
      });
    }

    match = MEASUREMENT.exec(sentence);
  }

  return found;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/extractMeasurements.test.ts`
Expected: PASS, 11 tests.

If a test fails on metric trimming, print the raw captures before adjusting
`STOP_WORDS`. Do **not** loosen `_isYear` or the `hasMeaning` guard to make a
test pass: both exist to keep noise out, and loosening them trades a missing
row for a wrong one.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: extract measurements from sentences"
```

---

## Task 9: Extract prose measures

**Files:**

- Create: `src/workers/pdfSniff/extractors/extractProseMeasures.ts`
- Create: `src/workers/pdfSniff/extractors/extractProseMeasures.test.ts`

Splits a region's text into sentences, runs `extractMeasurements` over each,
and reports how much it thinks it missed. That last part feeds Task 18's
decision to offer the model.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/extractors/extractProseMeasures.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractProseMeasures } from "./extractProseMeasures";
import type { RegionGeometry, TextItem } from "../types";

function lines(texts: readonly string[]): TextItem[] {
  return texts.map((text, index) => {
    return {
      text,
      x: 100,
      y: 600 - index * 20,
      width: text.length * 4,
      height: 9,
      fontName: "body",
      unmappedCharRatio: 0,
    };
  });
}

function region(texts: readonly string[]): RegionGeometry {
  return {
    pageIndex: 0,
    bbox: [0, 0, 600, 700],
    textItems: lines(texts),
    rules: [],
  };
}

describe("extractProseMeasures", () => {
  it("produces one row per measurement", () => {
    const result = extractProseMeasures(
      region(["In June, 21,563 cases and 388 deaths were reported."]),
      { regionId: "r1" },
    );

    expect(result.cells[0]).toEqual([
      "subject",
      "metric",
      "value",
      "unit",
      "source_text",
    ]);
    expect(result.cells).toHaveLength(3);
  });

  it("joins a sentence that wraps across lines", () => {
    // Line breaks are a layout artefact. Splitting on them would cut
    // sentences in half and lose the trailing subject clause entirely.
    const result = extractProseMeasures(
      region(["There were 166 cases and 13 deaths", "in South Darfur."]),
      { regionId: "r1" },
    );

    expect(result.cells[1]![0]).toBe("South Darfur");
  });

  it("reports a coverage flag when many numerals went unread", () => {
    // The signal Task 18 uses to decide whether to offer the model. A region
    // dense with numbers that yielded almost nothing is exactly the case
    // rules handle badly.
    const result = extractProseMeasures(
      region([
        "Between 12 and 15, then 18, 21, 24, 27, 30, 33, 36, 39, 42 and 45.",
      ]),
      { regionId: "r1" },
    );

    expect(
      result.flags.some((f) => f.detail.includes("numbers in this region")),
    ).toBe(true);
  });

  it("does not flag coverage when it read most of the numbers", () => {
    const result = extractProseMeasures(
      region(["We recorded 12 cases and 3 deaths."]),
      { regionId: "r1" },
    );

    expect(result.flags).toEqual([]);
  });

  it("returns an empty table for prose with no measurements", () => {
    const result = extractProseMeasures(
      region(["The outbreak remains widespread and severe."]),
      { regionId: "r1" },
    );

    expect(result.cells).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractProseMeasures.test.ts`
Expected: FAIL, cannot resolve `./extractProseMeasures`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/extractors/extractProseMeasures.ts`:

```ts
import { extractMeasurements } from "../extractMeasurements";
import { groupLines } from "../groupLines";
import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
  RegionGeometry,
} from "../types";

/**
 * Below this fraction of the region's numerals appearing in extracted rows,
 * we tell the user we probably missed things. Feeds the model-assist offer.
 */
const MIN_NUMERAL_COVERAGE = 0.5;

/** Sentence terminator followed by whitespace and a capital or end of text. */
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z$€£"'(]|$)/u;

function _countNumerals(text: string): number {
  return (text.match(/\d[\d,]*(?:\.\d+)?/gu) ?? []).length;
}

/**
 * Reads measurements out of a region of running prose.
 *
 * Lines are joined before sentences are split, because a line break inside a
 * sentence is a layout artefact: splitting on it would sever "166 cases and
 * 13 deaths" from the "in South Darfur" that names their subject.
 */
export function extractProseMeasures(
  region: RegionGeometry,
  options: { regionId: string },
): ExtractedTable {
  const text = groupLines(region.textItems)
    .map((line) => {
      return line.text;
    })
    .join(" ")
    // A hyphen at a line break is a hyphenated word, not a compound.
    .replace(/-\s+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  const measurements = text.split(SENTENCE_SPLIT).flatMap((sentence) => {
    return extractMeasurements(sentence);
  });

  if (measurements.length === 0) {
    return {
      regionId: options.regionId,
      cells: [],
      headerRows: 0,
      flags: [],
      extractedBy: "rules",
      rowProvenance: [],
    };
  }

  const cells: string[][] = [
    ["subject", "metric", "value", "unit", "source_text"],
  ];
  const rowProvenance: { page: number; bbox: BBox }[] = [];

  for (const measurement of measurements) {
    cells.push([
      measurement.subject ?? "",
      measurement.metric,
      String(measurement.value),
      measurement.unit,
      measurement.sourceText,
    ]);
    // Sentence-level provenance would need per-sentence geometry, which the
    // line join discards. Region-level is honest and still lets the reviewer
    // find the passage.
    rowProvenance.push({ page: region.pageIndex, bbox: region.bbox });
  }

  const flags: PdfCellFlag[] = [];
  const numeralCount = _countNumerals(text);
  if (
    numeralCount > 0 &&
    measurements.length / numeralCount < MIN_NUMERAL_COVERAGE
  ) {
    flags.push({
      rowIndex: -1,
      columnIndex: -1,
      reason: "unmatched_value",
      detail:
        `We read ${measurements.length} of the ${numeralCount} numbers in ` +
        "this region. Sentences that name their subject indirectly are hard " +
        "to read with rules alone.",
    });
  }

  return {
    regionId: options.regionId,
    cells,
    headerRows: 1,
    flags,
    extractedBy: "rules",
    rowProvenance,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractProseMeasures.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: extract measurements from regions of prose"
```

---

## Task 10: Extract a grid table

**Files:**

- Create: `src/workers/pdfSniff/extractors/extractGridTable.ts`
- Create: `src/workers/pdfSniff/extractors/extractGridTable.test.ts`

The fourth shape, and the one Phase B3's detector will feed. Given a grid
(either supplied in the region's options by a detector, or derived from rules
and alignment), assign text to cells.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/extractors/extractGridTable.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractGridTable } from "./extractGridTable";
import type { RegionGeometry, TextItem } from "../types";

function item(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

const TABLE: readonly TextItem[] = [
  item("District", 100, 600),
  item("Cases", 250, 600),
  item("Deaths", 400, 600),
  item("Gao", 100, 580),
  item("1,204", 250, 580),
  item("31", 400, 580),
  item("Mopti", 100, 560),
  item("987", 250, 560),
  item("22", 400, 560),
];

function region(textItems = TABLE): RegionGeometry {
  return { pageIndex: 0, bbox: [80, 550, 500, 620], textItems, rules: [] };
}

describe("extractGridTable", () => {
  it("reads rows and columns from alignment when no grid is supplied", () => {
    const result = extractGridTable(region(), { regionId: "r1" });

    expect(result.cells).toEqual([
      ["District", "Cases", "Deaths"],
      ["Gao", "1204", "31"],
      ["Mopti", "987", "22"],
    ]);
  });

  it("uses a supplied grid in preference to deriving one", () => {
    // A detector reports the grid it showed the user. Re-deriving it here
    // could land on different boundaries than the outline they approved.
    const result = extractGridTable(region(), {
      regionId: "r1",
      gridX: [90, 240, 390],
    });

    expect(result.cells[0]).toEqual(["District", "Cases", "Deaths"]);
  });

  it("normalises cell values", () => {
    const result = extractGridTable(region(), { regionId: "r1" });

    // 1,204 loses its separator; nothing else changes.
    expect(result.cells[1]![1]).toBe("1204");
  });

  it("honours an explicit header row count", () => {
    const result = extractGridTable(region(), {
      regionId: "r1",
      headerRows: 2,
    });

    expect(result.headerRows).toBe(2);
  });

  it("defaults to one header row", () => {
    expect(extractGridTable(region(), { regionId: "r1" }).headerRows).toBe(1);
  });

  it("records provenance per row", () => {
    const result = extractGridTable(region(), { regionId: "r1" });

    // Two data rows after the header.
    expect(result.rowProvenance).toHaveLength(2);
  });

  it("returns an empty table for a region with no aligned text", () => {
    const result = extractGridTable(
      region([item("just one thing", 100, 600)]),
      { regionId: "r1" },
    );

    expect(result.cells).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractGridTable.test.ts`
Expected: FAIL, cannot resolve `./extractGridTable`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/extractors/extractGridTable.ts`:

```ts
import { groupLines } from "../groupLines";
import { normalizeCellValue } from "../normalizeCellValue";
import type { BBox, ExtractedTable, RegionGeometry, TextLine } from "../types";

/** Left edges within this many points belong to the same column. */
const COLUMN_TOLERANCE = 6;

/** Fewer than this many lines is not a table. */
const MIN_ROWS = 2;

/**
 * Fraction of rows that must have an item at a position for it to count as a
 * column. Prose aligns occasionally; a real column is populated consistently.
 */
const MIN_COLUMN_OCCUPANCY = 0.6;

function _deriveColumns(lines: readonly TextLine[]): number[] {
  const clusters: { position: number; rows: Set<number> }[] = [];

  lines.forEach((line, rowIndex) => {
    for (const item of line.items) {
      const existing = clusters.find((cluster) => {
        return Math.abs(cluster.position - item.x) <= COLUMN_TOLERANCE;
      });
      if (existing) {
        existing.rows.add(rowIndex);
      } else {
        clusters.push({ position: item.x, rows: new Set([rowIndex]) });
      }
    }
  });

  return clusters
    .filter((cluster) => {
      return cluster.rows.size / lines.length >= MIN_COLUMN_OCCUPANCY;
    })
    .map((cluster) => {
      return cluster.position;
    })
    .sort((a, b) => {
      return a - b;
    });
}

/**
 * Reads a region of aligned cells into rows and columns.
 *
 * Takes a grid from `options` when one is available, because a detector that
 * drew an outline for the user has already committed to specific boundaries,
 * and silently re-deriving different ones would produce a table that does not
 * match the picture they approved.
 */
export function extractGridTable(
  region: RegionGeometry,
  options: {
    regionId: string;
    gridX?: readonly number[];
    headerRows?: number;
  },
): ExtractedTable {
  const lines = groupLines(region.textItems);
  const columns =
    options.gridX && options.gridX.length > 0
      ? [...options.gridX]
      : _deriveColumns(lines);

  if (lines.length < MIN_ROWS || columns.length < 2) {
    return {
      regionId: options.regionId,
      cells: [],
      headerRows: 0,
      flags: [],
      extractedBy: "rules",
      rowProvenance: [],
    };
  }

  const cells = lines.map((line) => {
    const rowCells = Array.from({ length: columns.length }, () => {
      return "";
    });
    for (const item of line.items) {
      // The rightmost column at or left of the item, so a value indented
      // slightly inside its column still lands in it.
      let columnIndex = 0;
      for (let c = 0; c < columns.length; c += 1) {
        if (item.x >= columns[c]! - COLUMN_TOLERANCE) {
          columnIndex = c;
        }
      }
      const existing = rowCells[columnIndex]!;
      rowCells[columnIndex] =
        existing === "" ? item.text : `${existing} ${item.text}`;
    }
    return rowCells.map(normalizeCellValue);
  });

  const headerRows = options.headerRows ?? 1;
  const rowProvenance: { page: number; bbox: BBox }[] = lines
    .slice(headerRows)
    .map((line) => {
      const xs = line.items.flatMap((i) => {
        return [i.x, i.x + i.width];
      });
      return {
        page: region.pageIndex,
        bbox: [
          Math.min(...xs),
          line.y,
          Math.max(...xs),
          line.y + (line.items[0]?.height ?? 10),
        ] as BBox,
      };
    });

  return {
    regionId: options.regionId,
    cells,
    headerRows,
    flags: [],
    extractedBy: "rules",
    rowProvenance,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/extractors/extractGridTable.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: extract grid tables from a region"
```

---

## Task 11: Classify a region

**Files:**

- Create: `src/workers/pdfSniff/classifyRegion.ts`
- Create: `src/workers/pdfSniff/classifyRegion.test.ts`

Picks which extractor to run, and **returns its evidence**. The evidence is not
decoration: it is what makes the override control feel like a correction rather
than a coin flip, and a classifier that cannot explain itself should not be
choosing on the user's behalf.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/classifyRegion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifyRegion } from "./classifyRegion";
import type { RegionGeometry, RuleSegment, TextItem } from "./types";

function item(text: string, x: number, y: number, fontName = "body"): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 9,
    fontName,
    unmappedCharRatio: 0,
  };
}

function region(
  textItems: readonly TextItem[],
  rules: readonly RuleSegment[] = [],
): RegionGeometry {
  return { pageIndex: 0, bbox: [0, 0, 600, 700], textItems, rules };
}

describe("classifyRegion", () => {
  it("calls a ruled region a grid table", () => {
    const result = classifyRegion(
      region(
        [
          item("District", 100, 600),
          item("Cases", 250, 600),
          item("Gao", 100, 580),
          item("1204", 250, 580),
        ],
        [
          { orientation: "horizontal", position: 590, span: [90, 400] },
          { orientation: "horizontal", position: 570, span: [90, 400] },
          { orientation: "vertical", position: 240, span: [560, 610] },
        ],
      ),
    );

    expect(result.shape).toBe("grid_table");
    expect(result.evidence.join(" ")).toMatch(/ruling lines/i);
  });

  it("calls scattered short labels and numbers a labelled graphic", () => {
    const result = classifyRegion(
      region([
        item("KHARTOUM", 480, 302),
        item("408", 490, 292),
        item("KASSALA", 560, 402),
        item("200", 566, 392),
        item("SENNAR", 300, 500),
        item("202", 306, 490),
      ]),
    );

    expect(result.shape).toBe("labelled_graphic");
    expect(result.evidence.join(" ")).toMatch(/no ruling lines/i);
  });

  it("calls run-in labels repeating blocks", () => {
    const result = classifyRegion(
      region([
        item("1. Surveillance", 500, "bold"),
        item("Responses: To strengthen surveillance work", 480),
        item("Challenges: Reporting delays hinder things", 460),
      ]),
    );

    expect(result.shape).toBe("repeating_blocks");
  });

  it("calls running sentences prose measures", () => {
    const result = classifyRegion(
      region([
        item(
          "In June, 21,563 cases and 388 deaths have been reported across",
          100,
          600,
        ),
        item(
          "the state, including 13 suspected cases in West Darfur.",
          100,
          580,
        ),
      ]),
    );

    expect(result.shape).toBe("prose_measures");
  });

  it("reports low confidence when the region is ambiguous", () => {
    const result = classifyRegion(region([item("Something", 100, 600)]));

    expect(result.confidence).toBe("low");
  });

  it("always returns at least one line of evidence", () => {
    const result = classifyRegion(region([item("x", 1, 1)]));

    expect(result.evidence.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/classifyRegion.test.ts`
Expected: FAIL, cannot resolve `./classifyRegion`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/classifyRegion.ts`:

```ts
import { groupLines } from "./groupLines";
import { parseRunInLabels } from "./parseRunInLabels";
import type { PdfRegionShape, RegionGeometry } from "./types";

export type RegionClassification = {
  shape: PdfRegionShape;
  confidence: "high" | "medium" | "low";
  /** Human-readable reasons, shown beside the override control. */
  evidence: readonly string[];
};

/** Above this many words per line, the region is running prose. */
const PROSE_WORDS_PER_LINE = 6;

/** A label in a graphic is short. Longer text is a sentence. */
const MAX_GRAPHIC_LABEL_WORDS = 4;

function _isNumeric(text: string): boolean {
  return /^[$€£¥]?\s*-?[\d][\d,. ]*\s*%?$/u.test(text.trim());
}

/**
 * Decides which extractor should read a region, and says why.
 *
 * The evidence matters as much as the verdict. A user who disagrees needs to
 * see what we looked at before overriding, otherwise the dropdown is a guess
 * they have no basis to correct.
 */
export function classifyRegion(region: RegionGeometry): RegionClassification {
  const evidence: string[] = [];
  const lines = groupLines(region.textItems);
  const items = region.textItems.filter((item) => {
    return item.text.trim().length > 0;
  });

  if (items.length === 0) {
    return {
      shape: "prose_measures",
      confidence: "low",
      evidence: ["This region contains no text."],
    };
  }

  const numericItems = items.filter((item) => {
    return _isNumeric(item.text);
  });
  const wordsPerLine =
    lines.reduce((sum, line) => {
      return sum + line.text.split(/\s+/u).length;
    }, 0) / Math.max(1, lines.length);

  // Ruling lines are the strongest signal available and need no inference.
  const horizontalRules = region.rules.filter((rule) => {
    return rule.orientation === "horizontal";
  });
  if (horizontalRules.length >= 2 && lines.length >= 2) {
    evidence.push(
      `${region.rules.length} ruling lines and ${lines.length} rows.`,
    );
    return { shape: "grid_table", confidence: "high", evidence };
  }

  // Run-in labels under a heading are unambiguous when present.
  const blocks = parseRunInLabels(lines);
  if (blocks.length > 0) {
    evidence.push(
      `${blocks.length} labelled block${blocks.length === 1 ? "" : "s"} ` +
        `with run-in labels (${Object.keys(blocks[0]!.fields).join(", ")}).`,
    );
    return { shape: "repeating_blocks", confidence: "high", evidence };
  }

  const shortLabels = items.filter((item) => {
    return (
      !_isNumeric(item.text) &&
      item.text.trim().split(/\s+/u).length <= MAX_GRAPHIC_LABEL_WORDS
    );
  });

  // A graphic is numbers and short captions with no rules and no sentences.
  if (
    numericItems.length >= 2 &&
    shortLabels.length >= 2 &&
    wordsPerLine < PROSE_WORDS_PER_LINE
  ) {
    evidence.push(
      `${numericItems.length} numbers, ${shortLabels.length} short labels, ` +
        "no ruling lines.",
    );
    return { shape: "labelled_graphic", confidence: "medium", evidence };
  }

  if (wordsPerLine >= PROSE_WORDS_PER_LINE) {
    evidence.push(
      `${Math.round(wordsPerLine)} words per line on average, ` +
        `${numericItems.length} standalone numbers.`,
    );
    return {
      shape: "prose_measures",
      confidence: numericItems.length > 0 ? "medium" : "low",
      evidence,
    };
  }

  evidence.push(
    `${items.length} text items, ${numericItems.length} numeric, ` +
      "no clear structure.",
  );
  return { shape: "prose_measures", confidence: "low", evidence };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/classifyRegion.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: classify a region's shape and report the evidence"
```

---

## Task 12: Combine several regions

**Files:**

- Create: `src/workers/pdfSniff/combineRegions.ts`
- Create: `src/workers/pdfSniff/combineRegions.test.ts`

Implements the spec's combination rule: **regions whose resolved headers match
union into one natural table; regions whose headers differ combine as
observations.**

Worth noting what this subsumes. A table continuing across pages 4 to 7 is four
regions with identical headers, so it unions. Multi-page merging is therefore
not a separate mechanism here, it is this rule applied to a common case.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/combineRegions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { combineRegions } from "./combineRegions";
import type { ExtractedTable } from "./types";

function table(
  regionId: string,
  cells: ReadonlyArray<readonly string[]>,
): ExtractedTable {
  return {
    regionId,
    cells,
    headerRows: 1,
    flags: [],
    extractedBy: "rules",
    rowProvenance: cells.slice(1).map(() => {
      return { page: 0, bbox: [0, 0, 1, 1] as const };
    }),
  };
}

const DOC = {
  title: "Sudan Cholera Operational Update",
  organisation: "OCHA",
  reportNumber: null,
  publishedAt: "2025-07-03",
};

describe("combineRegions", () => {
  it("unions regions whose headers match", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["District", "Cases"],
          ["Gao", "1204"],
        ]),
        table("b", [
          ["District", "Cases"],
          ["Mopti", "987"],
        ]),
      ],
      regionLabels: { a: "Page 4", b: "Page 5" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("natural");
    expect(result.cells).toEqual([
      ["District", "Cases"],
      ["Gao", "1204"],
      ["Mopti", "987"],
    ]);
  });

  it("treats headers differing only by case or spacing as matching", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["District", "Cases"],
          ["Gao", "1204"],
        ]),
        table("b", [
          [" district ", "CASES"],
          ["Mopti", "987"],
        ]),
      ],
      regionLabels: { a: "Page 4", b: "Page 5" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("natural");
    expect(result.cells).toHaveLength(3);
  });

  it("normalises regions with different headers to observations", () => {
    const result = combineRegions({
      tables: [
        table("map", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
        table("kpi", [
          ["label", "value", "unit"],
          ["cases", "83000", "n"],
        ]),
      ],
      regionLabels: { map: "Deaths by state", kpi: "Headline figures" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("observations");
    expect(result.cells[0]).toEqual([
      "subject",
      "metric",
      "value",
      "unit",
      "period",
      "page",
      "region_label",
      "confidence",
      "extracted_by",
      "source_text",
      "doc_title",
      "doc_org",
      "doc_date",
      "doc_report_no",
    ]);
  });

  it("carries document metadata onto every observation row", () => {
    // This is the join key that lets sitrep #1 and #2 stack.
    const result = combineRegions({
      tables: [
        table("map", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
        table("kpi", [
          ["a", "b", "c"],
          ["1", "2", "3"],
        ]),
      ],
      regionLabels: { map: "m", kpi: "k" },
      documentMetadata: DOC,
    });

    for (const row of result.cells.slice(1)) {
      expect(row).toContain("Sudan Cholera Operational Update");
      expect(row).toContain("2025-07-03");
    }
  });

  it("keeps a single region in its natural schema", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["District", "Cases"],
          ["Gao", "1204"],
        ]),
      ],
      regionLabels: { a: "Table" },
      documentMetadata: DOC,
    });

    expect(result.outputMode).toBe("natural");
    expect(result.cells[0]).toEqual(["District", "Cases"]);
  });

  it("honours an explicit observations request for one region", () => {
    const result = combineRegions({
      tables: [
        table("a", [
          ["label", "value"],
          ["Khartoum", "408"],
        ]),
      ],
      regionLabels: { a: "Deaths" },
      documentMetadata: DOC,
      outputMode: "observations",
    });

    expect(result.outputMode).toBe("observations");
  });

  it("marks a flagged row's confidence as needing review", () => {
    const flagged: ExtractedTable = {
      ...table("a", [
        ["label", "value"],
        ["Khartoum", "408"],
      ]),
      flags: [
        {
          rowIndex: 0,
          columnIndex: 0,
          reason: "ambiguous_association",
          detail: "near tie",
        },
      ],
    };

    const result = combineRegions({
      tables: [
        flagged,
        table("b", [
          ["x", "y", "z"],
          ["1", "2", "3"],
        ]),
      ],
      regionLabels: { a: "m", b: "k" },
      documentMetadata: DOC,
    });

    const confidenceIndex = result.cells[0]!.indexOf("confidence");
    expect(result.cells[1]![confidenceIndex]).toBe("review");
  });

  it("returns an empty result for no tables", () => {
    const result = combineRegions({
      tables: [],
      regionLabels: {},
      documentMetadata: DOC,
    });

    expect(result.cells).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/combineRegions.test.ts`
Expected: FAIL, cannot resolve `./combineRegions`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/combineRegions.ts`:

```ts
import type { ExtractedTable, PdfCellFlag } from "./types";

export type DocumentMetadata = {
  title: string | null;
  organisation: string | null;
  reportNumber: string | null;
  /** ISO date, or null when none could be read. */
  publishedAt: string | null;
};

export type CombinedTable = {
  outputMode: "natural" | "observations";
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
};

const OBSERVATION_HEADER = [
  "subject",
  "metric",
  "value",
  "unit",
  "period",
  "page",
  "region_label",
  "confidence",
  "extracted_by",
  "source_text",
  "doc_title",
  "doc_org",
  "doc_date",
  "doc_report_no",
] as const;

/**
 * Header comparison ignores case and surrounding whitespace.
 *
 * A table continuing onto a new page often repeats its header with different
 * spacing or capitalisation. Treating that as a different schema would refuse
 * to union a table that plainly is one.
 */
function _headerKey(table: ExtractedTable): string {
  const header = table.cells[0] ?? [];
  return header
    .map((name) => {
      return name.trim().toLowerCase().replace(/\s+/gu, " ");
    })
    .join("\u0000");
}

function _flaggedRows(flags: readonly PdfCellFlag[]): Set<number> {
  return new Set(
    flags
      .filter((flag) => {
        return flag.rowIndex >= 0;
      })
      .map((flag) => {
        return flag.rowIndex;
      }),
  );
}

/**
 * Combines the regions a user selected into one dataset.
 *
 * The rule is that matching headers union and differing headers normalise.
 * That single rule covers both "this table continues on the next page" and
 * "these are a map and a KPI row that have nothing in common", which are the
 * same question asked of different inputs.
 */
export function combineRegions(params: {
  tables: readonly ExtractedTable[];
  regionLabels: Readonly<Record<string, string>>;
  documentMetadata: DocumentMetadata;
  outputMode?: "natural" | "observations";
}): CombinedTable {
  const populated = params.tables.filter((table) => {
    return table.cells.length > 1;
  });

  if (populated.length === 0) {
    return { outputMode: "natural", cells: [], headerRows: 0 };
  }

  const headerKeys = new Set(populated.map(_headerKey));
  const shouldUnion =
    params.outputMode !== "observations" && headerKeys.size === 1;

  if (shouldUnion) {
    const [first] = populated;
    return {
      outputMode: "natural",
      headerRows: 1,
      cells: [
        first!.cells[0]!,
        ...populated.flatMap((table) => {
          return table.cells.slice(table.headerRows);
        }),
      ],
    };
  }

  const doc = params.documentMetadata;
  const rows: string[][] = [[...OBSERVATION_HEADER]];

  for (const table of populated) {
    const header = table.cells[0] ?? [];
    const flagged = _flaggedRows(table.flags);
    const label = params.regionLabels[table.regionId] ?? table.regionId;

    // Which columns of this region's natural schema map onto which
    // observation fields. Extractors emit known headers, so this is a lookup
    // rather than a guess.
    const subjectIndex = Math.max(
      0,
      header.findIndex((name) => {
        return /^(label|subject|heading|district|state|name)$/iu.test(name);
      }),
    );
    const valueIndex = header.findIndex((name) => {
      return /^value$/iu.test(name);
    });
    const metricIndex = header.findIndex((name) => {
      return /^metric$/iu.test(name);
    });
    const unitIndex = header.findIndex((name) => {
      return /^unit$/iu.test(name);
    });
    const sourceIndex = header.findIndex((name) => {
      return /^source_text$/iu.test(name);
    });

    table.cells.slice(table.headerRows).forEach((row, rowIndex) => {
      const provenance = table.rowProvenance[rowIndex];
      rows.push([
        row[subjectIndex] ?? "",
        metricIndex >= 0 ? (row[metricIndex] ?? "") : label,
        valueIndex >= 0 ? (row[valueIndex] ?? "") : (row[1] ?? ""),
        unitIndex >= 0 ? (row[unitIndex] ?? "") : "n",
        "",
        provenance ? String(provenance.page + 1) : "",
        label,
        flagged.has(rowIndex) ? "review" : "high",
        table.extractedBy,
        sourceIndex >= 0 ? (row[sourceIndex] ?? "") : "",
        doc.title ?? "",
        doc.organisation ?? "",
        doc.publishedAt ?? "",
        doc.reportNumber ?? "",
      ]);
    });
  }

  return { outputMode: "observations", cells: rows, headerRows: 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/combineRegions.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: combine regions by header match or as observations"
```

---

## Task 13: Extract document metadata

**Files:**

- Create: `src/workers/pdfSniff/extractDocumentMetadata.ts`
- Create: `src/workers/pdfSniff/extractDocumentMetadata.test.ts`

Title, organisation, report number and publication date. These are not a
nicety: in observations mode they are the join key that lets SitRep #1 and #2
stack into a series, which is the actual reason anyone imports these documents.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/extractDocumentMetadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractDocumentMetadata } from "./extractDocumentMetadata";
import type { PageGeometry, TextItem } from "./types";

function item(text: string, y: number, height = 10, x = 36): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * (height * 0.5),
    height,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

function firstPage(textItems: readonly TextItem[]): PageGeometry {
  return {
    pageIndex: 0,
    width: 595,
    height: 842,
    looksScanned: false,
    rules: [],
    textItems,
  };
}

describe("extractDocumentMetadata", () => {
  it("takes the title from the info dictionary when present", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([item("SUDAN", 790, 40)]),
      info: { Title: "Sudan Cholera Operational Update" },
    });

    expect(meta.title).toBe("Sudan Cholera Operational Update");
  });

  it("falls back to the largest text near the top of page one", () => {
    // InDesign exports routinely leave Title empty or set to the file name.
    const meta = extractDocumentMetadata({
      page: firstPage([
        item("SUDAN", 790, 40),
        item("Cholera Operational Update", 760, 20),
        item("body text that is much longer but small", 400, 9),
      ]),
      info: {},
    });

    expect(meta.title).toBe("SUDAN Cholera Operational Update");
  });

  it("ignores an info title that is just a file name", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([item("SUDAN", 790, 40)]),
      info: { Title: "Sudan_Cholera_Update_v3_FINAL.indd" },
    });

    expect(meta.title).toBe("SUDAN");
  });

  it("reads a spelled-out date", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([item("SUDAN", 790, 40), item("3 July 2025", 730, 12)]),
      info: {},
    });

    expect(meta.publishedAt).toBe("2025-07-03");
  });

  it("reads a month-first date", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([
        item("Situation Report", 790, 20),
        item("June 24, 2025", 760, 12),
      ]),
      info: {},
    });

    expect(meta.publishedAt).toBe("2025-06-24");
  });

  it("prefers the info creation date over a date in the page text", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([item("3 July 2025", 730, 12)]),
      info: { CreationDate: "D:20250703121904+02'00'" },
    });

    expect(meta.publishedAt).toBe("2025-07-03");
  });

  it("reads a report number", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([
        item("SITUATION UPDATE", 790, 20),
        item("Situation Report #1", 760, 11),
      ]),
      info: {},
    });

    expect(meta.reportNumber).toBe("1");
  });

  it("reads the organisation from the info author", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([item("x", 790, 20)]),
      info: { Author: "International Medical Corps" },
    });

    expect(meta.organisation).toBe("International Medical Corps");
  });

  it("returns nulls rather than guesses when nothing is found", () => {
    const meta = extractDocumentMetadata({
      page: firstPage([]),
      info: {},
    });

    expect(meta).toEqual({
      title: null,
      organisation: null,
      reportNumber: null,
      publishedAt: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/extractDocumentMetadata.test.ts`
Expected: FAIL, cannot resolve `./extractDocumentMetadata`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/extractDocumentMetadata.ts`:

```ts
import { groupLines } from "./groupLines";
import type { DocumentMetadata } from "./combineRegions";
import type { PageGeometry } from "./types";

/** Only text in the top fraction of page one is considered title material. */
const TITLE_BAND = 0.75;

/** A title line must be at least this multiple of the page's median size. */
const TITLE_SIZE_RATIO = 1.4;

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const MONTH_NAMES = Object.keys(MONTHS).join("|");
const DAY_FIRST = new RegExp(
  String.raw`\b(\d{1,2})\s+(${MONTH_NAMES})\s+(\d{4})\b`,
  "iu",
);
const MONTH_FIRST = new RegExp(
  String.raw`\b(${MONTH_NAMES})\s+(\d{1,2}),?\s+(\d{4})\b`,
  "iu",
);
const REPORT_NUMBER =
  /\b(?:report|update|sitrep)\s*(?:no\.?|number|#)\s*(\d+)\b/iu;

/** `D:20250703121904+02'00'` */
const PDF_DATE = /^D:(\d{4})(\d{2})(\d{2})/u;

function _iso(year: number, month: number, day: number): string {
  const pad = (n: number): string => {
    return String(n).padStart(2, "0");
  };
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * An info-dictionary title that looks like a file name is worse than nothing:
 * it is confidently wrong, and it would end up stamped on every observation
 * row as the document's identity.
 */
function _isFileName(value: string): boolean {
  return /\.(pdf|indd|docx?|ai|psd)$/iu.test(value.trim());
}

function _titleFromPage(page: PageGeometry): string | null {
  const lines = groupLines(page.textItems).filter((line) => {
    return line.y >= page.height * TITLE_BAND;
  });
  if (lines.length === 0) {
    return null;
  }

  const sizes = page.textItems
    .map((item) => {
      return item.height;
    })
    .sort((a, b) => {
      return a - b;
    });
  const median = sizes[Math.floor(sizes.length / 2)] ?? 0;

  const titleLines = lines.filter((line) => {
    const lineHeight = Math.max(
      ...line.items.map((item) => {
        return item.height;
      }),
    );
    return lineHeight >= median * TITLE_SIZE_RATIO;
  });

  if (titleLines.length === 0) {
    return null;
  }

  // Consecutive large lines at the top are one title split across lines, as
  // in "SUDAN" over "Cholera Operational Update".
  return titleLines
    .slice(0, 3)
    .map((line) => {
      return line.text;
    })
    .join(" ")
    .trim();
}

function _dateFromText(text: string): string | null {
  const dayFirst = DAY_FIRST.exec(text);
  if (dayFirst) {
    return _iso(
      Number(dayFirst[3]),
      MONTHS[dayFirst[2]!.toLowerCase()]!,
      Number(dayFirst[1]),
    );
  }
  const monthFirst = MONTH_FIRST.exec(text);
  if (monthFirst) {
    return _iso(
      Number(monthFirst[3]),
      MONTHS[monthFirst[1]!.toLowerCase()]!,
      Number(monthFirst[2]),
    );
  }
  return null;
}

/**
 * Reads a document's identity from its info dictionary, falling back to the
 * typography of page one.
 *
 * Returns nulls rather than guesses. In observations mode these values are
 * stamped onto every row as the join key across reports, so a wrong title
 * silently merges two different documents into one series.
 */
export function extractDocumentMetadata(params: {
  page: PageGeometry;
  info: Readonly<Record<string, unknown>>;
}): DocumentMetadata {
  const infoTitle =
    typeof params.info.Title === "string" ? params.info.Title.trim() : "";
  const title =
    infoTitle.length > 0 && !_isFileName(infoTitle)
      ? infoTitle
      : _titleFromPage(params.page);

  const author =
    typeof params.info.Author === "string" ? params.info.Author.trim() : "";

  const pageText = groupLines(params.page.textItems)
    .map((line) => {
      return line.text;
    })
    .join(" ");

  const infoDate =
    typeof params.info.CreationDate === "string"
      ? PDF_DATE.exec(params.info.CreationDate)
      : null;

  const reportNumber = REPORT_NUMBER.exec(pageText);

  return {
    title: title && title.length > 0 ? title : null,
    organisation: author.length > 0 ? author : null,
    reportNumber: reportNumber ? reportNumber[1]! : null,
    publishedAt: infoDate
      ? _iso(Number(infoDate[1]), Number(infoDate[2]), Number(infoDate[3]))
      : _dateFromText(pageText),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/extractDocumentMetadata.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Return it from the sniff**

Metadata is read once, during the sniff, rather than on every extract: it
depends on the document rather than on any region, and re-reading page one each
time a box moves is wasted work.

In `src/workers/pdfSniff.worker.ts`, extend the result type:

```ts
export type PdfSniffResult = {
  type: "result";
  pageCount: number;
  pages: readonly PageGeometry[];
  documentMetadata: DocumentMetadata;
};
```

and populate it just before posting the result, after the text-layer guard has
passed:

```ts
const { info } = await doc.getMetadata();
const documentMetadata = pages[0]
  ? extractDocumentMetadata({
      page: pages[0],
      info: (info ?? {}) as Record<string, unknown>,
    })
  : { title: null, organisation: null, reportNumber: null, publishedAt: null };

_post({ type: "result", pageCount: doc.numPages, pages, documentMetadata });
```

Import `extractDocumentMetadata` and the `DocumentMetadata` type.

- [ ] **Step 6: Verify**

Run: `pnpm type-check && pnpm vitest run src/workers/pdfSniff/`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: extract pdf document metadata as a cross-report join key"
```

---

## Task 14: Add the extract message to the worker

**Files:**

- Modify: `src/workers/pdfSniff.worker.ts`
- Modify: `src/clients/datasets/pdfSniff.ts`

Extraction runs in the worker for the same reason geometry does: a region on a
dense page is thousands of items, and the classifier plus extractor is real
work.

- [ ] **Step 1: Add the request and response types**

In `src/workers/pdfSniff.worker.ts`, add beside `SniffRequest`:

```ts
type ExtractRequest = {
  type: "extract";
  pages: readonly PageGeometry[];
  regions: readonly PdfRegion[];
  documentMetadata: DocumentMetadata;
  outputMode?: "natural" | "observations";
};

export type PdfExtractResult = {
  type: "extract_result";
  /** One per region, in the order they were supplied. */
  tables: readonly ExtractedTable[];
  /** Per-region classification, so the picker can show its reasoning. */
  classifications: Readonly<Record<string, RegionClassification>>;
  combined: CombinedTable;
};
```

Add `PdfExtractResult` to the `SniffResponse` union.

- [ ] **Step 2: Add the extraction dispatch**

Still in the worker, add a handler branch before the `sniff` one:

```ts
if (request.type === "extract") {
  const pagesByIndex = new Map(
    request.pages.map((page) => {
      return [page.pageIndex, page];
    }),
  );
  const tables: ExtractedTable[] = [];
  const classifications: Record<string, RegionClassification> = {};

  for (const region of request.regions) {
    // A region spanning pages is clipped per fragment and concatenated, so
    // a table continuing across a page break arrives as one table.
    const clipped = region.fragments.flatMap((fragment) => {
      const page = pagesByIndex.get(fragment.page);
      return page ? [clipToRegion(page, fragment.bbox)] : [];
    });
    if (clipped.length === 0) {
      continue;
    }
    const merged: RegionGeometry = {
      pageIndex: clipped[0]!.pageIndex,
      bbox: clipped[0]!.bbox,
      textItems: clipped.flatMap((c) => {
        return c.textItems;
      }),
      rules: clipped.flatMap((c) => {
        return c.rules;
      }),
    };

    const classification = classifyRegion(merged);
    classifications[region.id] = classification;

    // The user's explicit shape always wins over the classifier's guess.
    const shape = region.shape ?? classification.shape;
    const options = { regionId: region.id, ...region.options };

    tables.push(
      match(shape)
        .with("grid_table", () => {
          return extractGridTable(merged, options);
        })
        .with("labelled_graphic", () => {
          return extractLabelledGraphic(merged, options);
        })
        .with("repeating_blocks", () => {
          return extractRepeatingBlocks(merged, options);
        })
        .with("prose_measures", () => {
          return extractProseMeasures(merged, options);
        })
        .exhaustive(),
    );
  }

  const regionLabels = Object.fromEntries(
    request.regions.map((region) => {
      return [region.id, region.label];
    }),
  );

  _post({
    type: "extract_result",
    tables,
    classifications,
    combined: combineRegions({
      tables,
      regionLabels,
      documentMetadata: request.documentMetadata,
      outputMode: request.outputMode,
    }),
  });
  _close();
  return;
}
```

Add the imports for `clipToRegion`, `classifyRegion`, `combineRegions`, the
four extractors, and `match` from `ts-pattern`.

- [ ] **Step 3: Add the driver**

In `src/clients/datasets/pdfSniff.ts`, add:

```ts
/**
 * Extracts the selected regions. Separate from `sniffPdfFile` because the
 * user re-extracts every time they adjust a box or change a shape, and
 * re-reading the whole document for that would make the UI feel broken.
 */
export async function extractPdfRegions(params: {
  pages: readonly PageGeometry[];
  regions: readonly PdfRegion[];
  documentMetadata: DocumentMetadata;
  outputMode?: "natural" | "observations";
}): Promise<PdfExtractResult> {
  const worker = new PdfSniffWorker();
  try {
    return await new Promise<PdfExtractResult>((resolve, reject) => {
      worker.addEventListener(
        "message",
        (event: MessageEvent<SniffResponse>) => {
          const data = event.data;
          if (data.type === "extract_result") {
            resolve(data);
            return;
          }
          if (data.type === "error") {
            reject(new PdfSniffRejection(data));
          }
        },
      );
      worker.addEventListener(
        "error",
        (event) => {
          reject(new Error(event.message || "PDF extract worker errored"));
        },
        { once: true },
      );
      worker.postMessage({ type: "extract", ...params });
    });
  } finally {
    worker.terminate();
  }
}
```

- [ ] **Step 4: Verify**

Run: `pnpm type-check && pnpm lint`
Expected: no errors. The `match` on shape must be exhaustive, so adding a fifth
shape later is a compile error here rather than a silent no-op.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff.worker.ts src/clients/datasets/pdfSniff.ts
git commit -m "feat: extract selected pdf regions in the worker"
```

---

## Task 15: Draw regions on the page

**Files:**

- Modify: `.../ManualUploadView/PdfTablePicker/PdfPagePreview.tsx`
- Create: `.../ManualUploadView/PdfTablePicker/PdfRegionOverlay.tsx`
- Create: `.../ManualUploadView/PdfTablePicker/PdfRegionOverlay.test.tsx`

Phase B1's preview draws one highlight. It now needs several, plus the two
selection gestures: drag a box, or select text.

- [ ] **Step 1: Generalise the preview to several highlights**

In `PdfPagePreview.tsx`, change the prop and the drawing block:

```tsx
type Highlight = {
  bbox: BBox;
  /** Drawn more prominently, for the region currently being reviewed. */
  isActive?: boolean;
};

type Props = {
  file: File;
  pageIndex: number;
  highlights?: readonly Highlight[];
  width?: number;
  /** Rendered scale, reported so an overlay can map clicks back to points. */
  onScaleChange?: (scale: number) => void;
};
```

and replace the single-highlight block with:

```tsx
for (const highlight of highlights ?? []) {
  // PDF y grows upward, canvas y grows downward, so the box has to be
  // flipped as well as scaled.
  const [x0, y0, x1, y1] = highlight.bbox;
  context.save();
  context.strokeStyle = highlight.isActive
    ? "rgba(34, 139, 230, 0.95)"
    : "rgba(34, 139, 230, 0.5)";
  context.fillStyle = highlight.isActive
    ? "rgba(34, 139, 230, 0.18)"
    : "rgba(34, 139, 230, 0.08)";
  context.lineWidth = highlight.isActive ? 2 : 1;
  context.fillRect(
    x0 * scale,
    canvas.height - y1 * scale,
    (x1 - x0) * scale,
    (y1 - y0) * scale,
  );
  context.strokeRect(
    x0 * scale,
    canvas.height - y1 * scale,
    (x1 - x0) * scale,
    (y1 - y0) * scale,
  );
  context.restore();
}
```

Call `onScaleChange?.(scale)` after rendering, and add `highlights` to the
effect's dependency array.

- [ ] **Step 2: Write the failing overlay test**

Create `PdfRegionOverlay.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PdfRegionOverlay } from "./PdfRegionOverlay";

describe("PdfRegionOverlay", () => {
  it("reports a drawn box in PDF points, not screen pixels", () => {
    const onRegionDrawn = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        onRegionDrawn={onRegionDrawn}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 20 });
    fireEvent.pointerMove(surface, { clientX: 110, clientY: 70 });
    fireEvent.pointerUp(surface, { clientX: 110, clientY: 70 });

    // x: 10/0.5 = 20 to 110/0.5 = 220.
    // y is flipped: pageHeight - clientY/scale, so 848-140=708 down to 808.
    expect(onRegionDrawn).toHaveBeenCalledWith([20, 708, 220, 808]);
  });

  it("ignores a click that does not drag", () => {
    // Without this, every click on the page creates a zero-area region.
    const onRegionDrawn = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        onRegionDrawn={onRegionDrawn}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 20 });
    fireEvent.pointerUp(surface, { clientX: 12, clientY: 21 });

    expect(onRegionDrawn).not.toHaveBeenCalled();
  });

  it("normalises a box dragged up and to the left", () => {
    const onRegionDrawn = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        onRegionDrawn={onRegionDrawn}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    fireEvent.pointerDown(surface, { clientX: 110, clientY: 70 });
    fireEvent.pointerMove(surface, { clientX: 10, clientY: 20 });
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 20 });

    expect(onRegionDrawn).toHaveBeenCalledWith([20, 708, 220, 808]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionOverlay.test.tsx`
Expected: FAIL, cannot resolve `./PdfRegionOverlay`.

- [ ] **Step 4: Write the overlay**

Create `PdfRegionOverlay.tsx`:

```tsx
import { Box } from "@mantine/core";
import { useRef, useState } from "react";
import type { BBox } from "@/workers/pdfSniff/types";

/** A drag shorter than this in either axis is a click, not a selection. */
const MIN_DRAG_PX = 4;

type Props = {
  width: number;
  height: number;
  /** Canvas pixels per PDF point. */
  scale: number;
  /** Page height in PDF points, needed to flip the y axis. */
  pageHeight: number;
  onRegionDrawn: (bbox: BBox) => void;
};

/**
 * Transparent drag surface sitting over the rendered page.
 *
 * Owns exactly one thing: turning a pointer drag into a bbox in PDF points.
 * Keeping the coordinate flip here means no other component has to know that
 * PDF y grows upward while screen y grows downward, which is the single most
 * common source of off-by-a-page-height bugs in this feature.
 */
export function PdfRegionOverlay({
  width,
  height,
  scale,
  pageHeight,
  onRegionDrawn,
}: Readonly<Props>): ReactNode {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<null | {
    left: number;
    top: number;
    width: number;
    height: number;
  }>(null);

  const localPoint = (event: React.PointerEvent): { x: number; y: number } => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  return (
    <Box
      ref={surfaceRef}
      data-testid="pdf-region-overlay"
      pos="absolute"
      top={0}
      left={0}
      w={width}
      h={height}
      style={{ cursor: "crosshair", touchAction: "none" }}
      onPointerDown={(event) => {
        startRef.current = localPoint(event);
        setPreview(null);
      }}
      onPointerMove={(event) => {
        const start = startRef.current;
        if (!start) {
          return;
        }
        const current = localPoint(event);
        setPreview({
          left: Math.min(start.x, current.x),
          top: Math.min(start.y, current.y),
          width: Math.abs(current.x - start.x),
          height: Math.abs(current.y - start.y),
        });
      }}
      onPointerUp={(event) => {
        const start = startRef.current;
        startRef.current = null;
        setPreview(null);
        if (!start) {
          return;
        }
        const end = localPoint(event);
        if (
          Math.abs(end.x - start.x) < MIN_DRAG_PX ||
          Math.abs(end.y - start.y) < MIN_DRAG_PX
        ) {
          return;
        }

        // Screen pixels to PDF points, with y flipped. Normalised so a box
        // dragged up and to the left still reads x0 < x1 and y0 < y1.
        const toPoints = (px: number): number => {
          return px / scale;
        };
        const x0 = toPoints(Math.min(start.x, end.x));
        const x1 = toPoints(Math.max(start.x, end.x));
        const y0 = pageHeight - toPoints(Math.max(start.y, end.y));
        const y1 = pageHeight - toPoints(Math.min(start.y, end.y));

        onRegionDrawn([x0, y0, x1, y1]);
      }}
    >
      {preview && (
        <Box
          pos="absolute"
          left={preview.left}
          top={preview.top}
          w={preview.width}
          h={preview.height}
          style={{
            border: "2px dashed var(--mantine-color-blue-6)",
            background: "rgba(34, 139, 230, 0.12)",
            pointerEvents: "none",
          }}
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionOverlay.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/views/DataManagerApp/
git commit -m "feat: draw selection regions over a rendered pdf page"
```

---

## Task 16: The region picker

**Files:**

- Create: `.../ManualUploadView/PdfTablePicker/PdfRegionPicker.tsx`
- Create: `.../ManualUploadView/PdfTablePicker/PdfRegionPicker.test.tsx`

The page, the overlay, the region list with shape override and evidence, and
page navigation.

- [ ] **Step 1: Write the failing test**

Create `PdfRegionPicker.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PdfRegionPicker } from "./PdfRegionPicker";
import type { PdfRegion } from "@/workers/pdfSniff/types";

const REGION: PdfRegion = {
  id: "r1",
  label: "Deaths by state",
  shape: "labelled_graphic",
  detectionMode: "manual",
  fragments: [{ page: 0, bbox: [330, 175, 590, 465] }],
  options: {},
};

function renderPicker(overrides = {}) {
  const props = {
    file: new File([], "x.pdf", { type: "application/pdf" }),
    pageCount: 3,
    regions: [REGION],
    classifications: {
      r1: {
        shape: "labelled_graphic" as const,
        confidence: "medium" as const,
        evidence: ["16 numbers, 17 short labels, no ruling lines."],
      },
    },
    activeRegionId: "r1",
    onRegionsChange: vi.fn(),
    onActiveRegionChange: vi.fn(),
    ...overrides,
  };
  render(<PdfRegionPicker {...props} />);
  return props;
}

describe("PdfRegionPicker", () => {
  it("shows the classifier's evidence beside the shape control", () => {
    // Without the evidence the override control is a coin flip: the user has
    // no basis to decide whether we got it right.
    renderPicker();

    expect(
      screen.getByText(/16 numbers, 17 short labels, no ruling lines/i),
    ).toBeInTheDocument();
  });

  it("lets the user override the shape", async () => {
    const props = renderPicker();

    await userEvent.click(screen.getByLabelText(/read as/i));
    await userEvent.click(screen.getByRole("option", { name: /table/i }));

    expect(props.onRegionsChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "r1", shape: "grid_table" }),
    ]);
  });

  it("lets the user rename a region", async () => {
    const props = renderPicker();

    const nameField = screen.getByDisplayValue("Deaths by state");
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Cholera deaths");
    await userEvent.tab();

    expect(props.onRegionsChange).toHaveBeenCalledWith([
      expect.objectContaining({ label: "Cholera deaths" }),
    ]);
  });

  it("removes a region", async () => {
    const props = renderPicker();

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(props.onRegionsChange).toHaveBeenCalledWith([]);
  });

  it("prompts for a selection when there are no regions", () => {
    renderPicker({ regions: [], classifications: {} });

    expect(screen.getByText(/draw a box/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker.test.tsx`
Expected: FAIL, cannot resolve `./PdfRegionPicker`.

- [ ] **Step 3: Write the component**

Create `PdfRegionPicker.tsx`:

```tsx
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Group,
  Pagination,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { PdfPagePreview } from "./PdfPagePreview";
import { PdfRegionOverlay } from "./PdfRegionOverlay";
import type { RegionClassification } from "@/workers/pdfSniff/classifyRegion";
import type { BBox, PdfRegion, PdfRegionShape } from "@/workers/pdfSniff/types";

const SHAPE_OPTIONS: { value: PdfRegionShape; label: string }[] = [
  { value: "grid_table", label: "Table" },
  { value: "labelled_graphic", label: "Labelled graphic (map, chart, tiles)" },
  { value: "repeating_blocks", label: "Repeating labelled blocks" },
  { value: "prose_measures", label: "Numbers in prose" },
];

const PREVIEW_WIDTH = 420;

type Props = {
  file: File;
  pageCount: number;
  regions: readonly PdfRegion[];
  classifications: Readonly<Record<string, RegionClassification>>;
  activeRegionId: string | null;
  onRegionsChange: (regions: readonly PdfRegion[]) => void;
  onActiveRegionChange: (regionId: string) => void;
};

/**
 * The working surface: a rendered page you can draw on, and the list of what
 * you have drawn.
 *
 * Detected tables from Phase B3 arrive in `regions` like any other entry, so
 * this component has no concept of "found" versus "drawn". That is deliberate:
 * the user is choosing regions either way.
 */
export function PdfRegionPicker({
  file,
  pageCount,
  regions,
  classifications,
  activeRegionId,
  onRegionsChange,
  onActiveRegionChange,
}: Readonly<Props>): ReactNode {
  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(842);

  const updateRegion = (id: string, patch: Partial<PdfRegion>): void => {
    onRegionsChange(
      regions.map((region) => {
        return region.id === id ? { ...region, ...patch } : region;
      }),
    );
  };

  const addRegion = (bbox: BBox): void => {
    const id = `r${regions.length + 1}-${Date.now()}`;
    onRegionsChange([
      ...regions,
      {
        id,
        label: `Region ${regions.length + 1}`,
        // The classifier decides on the next extract; this is a placeholder
        // that the worker's result immediately replaces.
        shape: "prose_measures",
        detectionMode: "manual",
        fragments: [{ page: pageIndex, bbox }],
        options: {},
      },
    ]);
    onActiveRegionChange(id);
  };

  return (
    <Group align="flex-start" gap="lg" wrap="nowrap">
      <Stack gap="xs">
        <Box pos="relative" w={PREVIEW_WIDTH}>
          <PdfPagePreview
            file={file}
            pageIndex={pageIndex}
            width={PREVIEW_WIDTH}
            highlights={regions.flatMap((region) => {
              return region.fragments
                .filter((fragment) => {
                  return fragment.page === pageIndex;
                })
                .map((fragment) => {
                  return {
                    bbox: fragment.bbox,
                    isActive: region.id === activeRegionId,
                  };
                });
            })}
            onScaleChange={(nextScale) => {
              setScale(nextScale);
              setPageHeight(PREVIEW_WIDTH / nextScale);
            }}
          />
          <PdfRegionOverlay
            width={PREVIEW_WIDTH}
            height={PREVIEW_WIDTH * (pageHeight / (PREVIEW_WIDTH / scale))}
            scale={scale}
            pageHeight={pageHeight}
            onRegionDrawn={addRegion}
          />
        </Box>
        {pageCount > 1 && (
          <Pagination
            total={pageCount}
            value={pageIndex + 1}
            onChange={(page) => {
              setPageIndex(page - 1);
            }}
            size="sm"
          />
        )}
      </Stack>

      <Stack gap="sm" style={{ flex: 1 }}>
        {regions.length === 0 && (
          <Alert variant="light" color="blue" title="Nothing selected yet">
            <Text size="sm">
              Draw a box around a table, chart, map or block of text to extract
              it.
            </Text>
          </Alert>
        )}

        {regions.map((region) => {
          const classification = classifications[region.id];
          return (
            <Paper
              key={region.id}
              withBorder
              p="sm"
              onClick={() => {
                onActiveRegionChange(region.id);
              }}
              style={{
                cursor: "pointer",
                borderColor:
                  region.id === activeRegionId
                    ? "var(--mantine-color-blue-5)"
                    : undefined,
              }}
            >
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <TextInput
                    size="xs"
                    value={region.label}
                    onChange={(event) => {
                      updateRegion(region.id, {
                        label: event.currentTarget.value,
                      });
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={`Remove ${region.label}`}
                    onClick={() => {
                      onRegionsChange(
                        regions.filter((other) => {
                          return other.id !== region.id;
                        }),
                      );
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>

                <Select
                  size="xs"
                  label="Read as"
                  data={SHAPE_OPTIONS}
                  value={region.shape}
                  onChange={(value) => {
                    if (value) {
                      updateRegion(region.id, {
                        shape: value as PdfRegionShape,
                      });
                    }
                  }}
                />

                {classification && (
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Badge
                      size="xs"
                      color={
                        classification.confidence === "high"
                          ? "green"
                          : classification.confidence === "medium"
                            ? "yellow"
                            : "gray"
                      }
                    >
                      {classification.confidence}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {classification.evidence.join(" ")}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Group>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfRegionPicker.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/DataManagerApp/
git commit -m "feat: add the pdf region picker with shape override and evidence"
```

---

## Task 17: The review grid

**Files:**

- Create: `.../ManualUploadView/PdfTablePicker/PdfReviewGrid.tsx`
- Create: `.../ManualUploadView/PdfTablePicker/PdfReviewGrid.test.tsx`

The measurement in the design spec is the argument for this component: one pair
in eight was a near-tie and one in sixteen was simply wrong. Extraction without
review would import both.

- [ ] **Step 1: Write the failing test**

Create `PdfReviewGrid.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PdfReviewGrid } from "./PdfReviewGrid";
import type { ExtractedTable } from "@/workers/pdfSniff/types";

const TABLE: ExtractedTable = {
  regionId: "r1",
  cells: [
    ["label", "value"],
    ["KHARTOUM", "408"],
    ["RIVER NILE", "83"],
  ],
  headerRows: 1,
  flags: [
    {
      rowIndex: 1,
      columnIndex: 0,
      reason: "ambiguous_association",
      detail: '"83" was nearly as close to another label.',
    },
  ],
  extractedBy: "rules",
  rowProvenance: [
    { page: 0, bbox: [480, 300, 500, 310] },
    { page: 0, bbox: [478, 280, 498, 290] },
  ],
};

describe("PdfReviewGrid", () => {
  it("renders the extracted rows", () => {
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("KHARTOUM")).toBeInTheDocument();
    expect(screen.getByDisplayValue("408")).toBeInTheDocument();
  });

  it("marks a flagged cell and explains why", () => {
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/nearly as close to another label/i),
    ).toBeInTheDocument();
  });

  it("reports how many rows need review", () => {
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={vi.fn()}
      />,
    );

    expect(screen.getByText(/1 of 2 rows needs review/i)).toBeInTheDocument();
  });

  it("lets the user correct a cell", async () => {
    const onTableChange = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={onTableChange}
        onRowFocus={vi.fn()}
      />,
    );

    const cell = screen.getByDisplayValue("RIVER NILE");
    await userEvent.clear(cell);
    await userEvent.type(cell, "RED SEA");
    await userEvent.tab();

    expect(onTableChange).toHaveBeenCalledWith(
      expect.objectContaining({
        cells: [
          ["label", "value"],
          ["KHARTOUM", "408"],
          ["RED SEA", "83"],
        ],
      }),
    );
  });

  it("clears a row's flag once it is edited", async () => {
    // An edited row has been reviewed by definition. Leaving it flagged would
    // make the review counter useless.
    const onTableChange = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={onTableChange}
        onRowFocus={vi.fn()}
      />,
    );

    const cell = screen.getByDisplayValue("RIVER NILE");
    await userEvent.clear(cell);
    await userEvent.type(cell, "RED SEA");
    await userEvent.tab();

    expect(onTableChange).toHaveBeenCalledWith(
      expect.objectContaining({ flags: [] }),
    );
  });

  it("reports the source position when a row is focused", async () => {
    const onRowFocus = vi.fn();
    render(
      <PdfReviewGrid
        table={TABLE}
        onTableChange={vi.fn()}
        onRowFocus={onRowFocus}
      />,
    );

    await userEvent.click(screen.getByDisplayValue("KHARTOUM"));

    expect(onRowFocus).toHaveBeenCalledWith({
      page: 0,
      bbox: [480, 300, 500, 310],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfReviewGrid.test.tsx`
Expected: FAIL, cannot resolve `./PdfReviewGrid`.

- [ ] **Step 3: Write the component**

Create `PdfReviewGrid.tsx`:

```tsx
import {
  Alert,
  Box,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { BBox, ExtractedTable } from "@/workers/pdfSniff/types";

type Props = {
  table: ExtractedTable;
  onTableChange: (table: ExtractedTable) => void;
  onRowFocus: (provenance: { page: number; bbox: BBox }) => void;
};

/**
 * Editable view of one region's extraction, with uncertain cells marked.
 *
 * This component is the reason the feature can be trusted. Association by
 * position was measured at 14 of 16 correct against a real map, which is a
 * good first pass and an unacceptable silent import. Everything here exists to
 * make the two wrong ones findable: flags on the cells that were near-ties,
 * a count so the user knows how much is left, and a link from every row back
 * to where it sits on the page.
 */
export function PdfReviewGrid({
  table,
  onTableChange,
  onRowFocus,
}: Readonly<Props>): ReactNode {
  const header = table.cells[0] ?? [];
  const dataRows = table.cells.slice(table.headerRows);

  const flagFor = (
    rowIndex: number,
    columnIndex: number,
  ): string | undefined => {
    return table.flags.find((flag) => {
      return flag.rowIndex === rowIndex && flag.columnIndex === columnIndex;
    })?.detail;
  };

  const flaggedRowCount = new Set(
    table.flags
      .filter((flag) => {
        return flag.rowIndex >= 0;
      })
      .map((flag) => {
        return flag.rowIndex;
      }),
  ).size;

  const editCell = (
    rowIndex: number,
    columnIndex: number,
    value: string,
  ): void => {
    const cells = table.cells.map((row) => {
      return [...row];
    });
    cells[rowIndex + table.headerRows]![columnIndex] = value;

    onTableChange({
      ...table,
      cells,
      // An edited row has been reviewed by definition.
      flags: table.flags.filter((flag) => {
        return flag.rowIndex !== rowIndex;
      }),
    });
  };

  const regionFlags = table.flags.filter((flag) => {
    return flag.rowIndex < 0;
  });

  return (
    <Stack gap="sm">
      {flaggedRowCount > 0 && (
        <Alert variant="light" color="yellow" icon={<IconAlertTriangle />}>
          <Text size="sm">
            {flaggedRowCount} of {dataRows.length} rows needs review. We matched
            these values to their labels by position, and these were close
            calls. Check them against the page.
          </Text>
        </Alert>
      )}

      {regionFlags.map((flag) => {
        return (
          <Alert key={flag.detail} variant="light" color="gray">
            <Text size="xs">{flag.detail}</Text>
          </Alert>
        );
      })}

      <Box style={{ overflowX: "auto" }}>
        <Table withTableBorder withColumnBorders striped>
          <Table.Thead>
            <Table.Tr>
              {header.map((name) => {
                return <Table.Th key={name}>{name}</Table.Th>;
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dataRows.map((row, rowIndex) => {
              return (
                <Table.Tr key={rowIndex}>
                  {row.map((value, columnIndex) => {
                    const flag = flagFor(rowIndex, columnIndex);
                    const input = (
                      <TextInput
                        size="xs"
                        variant="unstyled"
                        value={value}
                        error={Boolean(flag)}
                        onChange={(event) => {
                          editCell(
                            rowIndex,
                            columnIndex,
                            event.currentTarget.value,
                          );
                        }}
                        onFocus={() => {
                          const provenance = table.rowProvenance[rowIndex];
                          if (provenance) {
                            onRowFocus(provenance);
                          }
                        }}
                      />
                    );
                    return (
                      <Table.Td key={columnIndex}>
                        {flag ? (
                          <Tooltip label={flag} multiline w={260}>
                            <div>{input}</div>
                          </Tooltip>
                        ) : (
                          input
                        )}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>

      {table.flags
        .filter((flag) => {
          return flag.rowIndex >= 0;
        })
        .map((flag) => {
          return (
            <Text
              key={`${flag.rowIndex}-${flag.columnIndex}`}
              size="xs"
              c="dimmed"
            >
              {flag.detail}
            </Text>
          );
        })}
    </Stack>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfReviewGrid.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/DataManagerApp/
git commit -m "feat: add the pdf extraction review grid"
```

---

## Task 18: Model-assisted prose extraction

**Files:**

- Create: `src/workers/pdfSniff/llm/buildRegionPrompt.ts`
- Create: `src/workers/pdfSniff/llm/parseRegionResponse.ts`
- Create: `src/workers/pdfSniff/llm/parseRegionResponse.test.ts`
- Modify: `.../PdfTablePicker/PdfRegionPicker.tsx`

Rules run first and always. The model is offered only when a prose region
yielded little relative to how many numerals it contains, and it goes through
the existing consent machinery rather than around it.

- [ ] **Step 1: Write the prompt builder**

Create `src/workers/pdfSniff/llm/buildRegionPrompt.ts`:

```ts
import type { Measurement } from "../extractMeasurements";

/**
 * Builds the extraction prompt for one region.
 *
 * Only the region's text is sent, never the document. A user who draws a box
 * around one paragraph has consented to that paragraph crossing the boundary,
 * not to the whole file.
 *
 * The rule-based results are included so the model completes rather than
 * duplicates them, and because showing it the expected shape is more reliable
 * than describing it.
 */
export function buildRegionPrompt(params: {
  regionText: string;
  ruleResults: readonly Measurement[];
}): string {
  return [
    "Extract every quantitative measurement from the text below.",
    "",
    "Return JSON only, as an array of objects with exactly these keys:",
    "  subject (string or null), metric (string), value (number),",
    '  unit ("n" | "percent" | "usd"), sourceText (string)',
    "",
    "Rules:",
    "- `value` must be a number, with scale words expanded: 33.5 million is 33500000.",
    "- `subject` is what the measurement is about, usually a place or a sector.",
    "  Use null when the text does not say.",
    "- `sourceText` must be the exact sentence the measurement came from.",
    "- Do not infer, estimate or combine figures. Extract only what is stated.",
    "- Return [] if there are no measurements.",
    "",
    params.ruleResults.length > 0
      ? `Already extracted (do not repeat these): ${JSON.stringify(
          params.ruleResults.map((m) => {
            return { metric: m.metric, value: m.value };
          }),
        )}`
      : "",
    "",
    "Text:",
    params.regionText,
  ].join("\n");
}
```

- [ ] **Step 2: Write the failing response-parser test**

Create `src/workers/pdfSniff/llm/parseRegionResponse.test.ts`:

````ts
import { describe, expect, it } from "vitest";
import { parseRegionResponse } from "./parseRegionResponse";

describe("parseRegionResponse", () => {
  it("parses a well-formed response into an extracted table", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: JSON.stringify([
        {
          subject: "West Darfur",
          metric: "deaths",
          value: 1,
          unit: "n",
          sourceText: "and one death in West Darfur.",
        },
      ]),
    });

    expect(table.extractedBy).toBe("model");
    expect(table.cells[1]).toEqual([
      "West Darfur",
      "deaths",
      "1",
      "n",
      "and one death in West Darfur.",
    ]);
  });

  it("tolerates a fenced code block around the JSON", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText:
        '```json\n[{"subject":null,"metric":"cases","value":5,"unit":"n","sourceText":"x"}]\n```',
    });

    expect(table.cells).toHaveLength(2);
  });

  it("drops a row whose value is not a number", () => {
    // A hallucinated "several" must not become a row. Silently dropping it is
    // right: the rule-based rows are still there and the user sees the count.
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: JSON.stringify([
        {
          subject: null,
          metric: "cases",
          value: "several",
          unit: "n",
          sourceText: "x",
        },
        {
          subject: null,
          metric: "deaths",
          value: 3,
          unit: "n",
          sourceText: "y",
        },
      ]),
    });

    expect(table.cells).toHaveLength(2);
    expect(table.cells[1]![1]).toBe("deaths");
  });

  it("drops a row with an unknown unit", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: JSON.stringify([
        {
          subject: null,
          metric: "x",
          value: 1,
          unit: "bananas",
          sourceText: "z",
        },
      ]),
    });

    expect(table.cells).toEqual([]);
  });

  it("returns an empty table for unparseable output", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: "I could not find any measurements.",
    });

    expect(table.cells).toEqual([]);
    expect(table.flags).toHaveLength(1);
  });
});
````

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/llm/parseRegionResponse.test.ts`
Expected: FAIL, cannot resolve `./parseRegionResponse`.

- [ ] **Step 4: Write the parser**

Create `src/workers/pdfSniff/llm/parseRegionResponse.ts`:

````ts
import { z } from "zod";
import type { BBox, ExtractedTable } from "../types";

const MeasurementSchema = z.object({
  subject: z.string().nullable(),
  metric: z.string().min(1),
  value: z.number().finite(),
  unit: z.enum(["n", "percent", "usd"]),
  sourceText: z.string(),
});

/** Strips a ``` fence, which models add despite being asked not to. */
function _unfence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/u.exec(text);
  return (fenced ? fenced[1]! : text).trim();
}

/**
 * Validates a model's extraction response into an `ExtractedTable`.
 *
 * Every row is schema-checked and invalid ones are dropped rather than
 * coerced. A model that returns "several" where a number belongs has not
 * extracted a measurement, and turning that into a 0 or a NaN would put a
 * fabricated figure into a dataset that people make decisions from.
 */
export function parseRegionResponse(params: {
  regionId: string;
  pageIndex: number;
  bbox: BBox;
  responseText: string;
}): ExtractedTable {
  const empty = {
    regionId: params.regionId,
    cells: [] as ReadonlyArray<readonly string[]>,
    headerRows: 0,
    extractedBy: "model" as const,
    rowProvenance: [],
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(_unfence(params.responseText));
  } catch {
    return {
      ...empty,
      flags: [
        {
          rowIndex: -1,
          columnIndex: -1,
          reason: "unmatched_value",
          detail:
            "The assistant's response could not be read as data. The " +
            "rule-based results are unchanged.",
        },
      ],
    };
  }

  const rows = z
    .array(
      MeasurementSchema.catch(() => {
        // A single malformed row must not discard the whole response.
        return null as never;
      }),
    )
    .catch([])
    .parse(parsed)
    .filter((row) => {
      return row !== null && row !== undefined;
    });

  if (rows.length === 0) {
    return { ...empty, flags: [] };
  }

  return {
    regionId: params.regionId,
    headerRows: 1,
    extractedBy: "model",
    flags: [],
    cells: [
      ["subject", "metric", "value", "unit", "source_text"],
      ...rows.map((row) => {
        return [
          row.subject ?? "",
          row.metric,
          String(row.value),
          row.unit,
          row.sourceText,
        ];
      }),
    ],
    rowProvenance: rows.map(() => {
      return { page: params.pageIndex, bbox: params.bbox };
    }),
  };
}
````

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/llm/parseRegionResponse.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Offer the assist in the picker**

In `PdfRegionPicker.tsx`, when a region's extracted table carries a coverage
flag (`detail` containing `"numbers in this region"`), render a button labelled
"Extract with the assistant". On click:

1. Call `decideIfDataCanCrossBoundary` with the region's text, exactly as
   `useAvandarChatRuntime` does. This runs the PII and bias detectors and
   shows the consent modal.
2. If consent is refused or the user is offline, do nothing except show
   "Kept the rule-based results" and leave the table untouched.
3. Otherwise `APIClient.post` to `chat/:workspaceId/messages` with the prompt
   from `buildRegionPrompt` and the acknowledgement token.
4. Pass the response through `parseRegionResponse` and merge its rows into the
   region's table, keeping the rule-based rows first.
5. Record the model id so Task 19 can write it to `llm_model`.

Do **not** bypass the consent gate for this call. It is the mechanism that
keeps the offline guarantee meaningful, and a second path to the model would
make the workspace privacy log incomplete.

- [ ] **Step 7: Verify**

Run: `pnpm type-check && pnpm lint && pnpm vitest run src/workers/pdfSniff/`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/workers/pdfSniff/ src/views/DataManagerApp/
git commit -m "feat: offer model-assisted prose extraction behind the consent gate"
```

---

## Task 19: Save a PDF dataset

**Files:**

- Modify: `.../DatasetImportForm/useSaveDataset/useSaveDataset.ts`
- Modify: `.../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts`
- Modify: `.../DatasetImportForm/DatasetParseControls.tsx`

Replaces Phase B1's placeholder save arm with the real one, and wires
re-extraction into the existing re-parse path.

- [ ] **Step 1: Widen the load result**

Phase B1 defined `PdfFileLoadResult` for a document with no regions yet. It now
has to carry what extraction produced. In `useLoadManualUploadFile.ts`, replace
the type with:

```ts
export type PdfFileLoadResult = BaseLoadResult & {
  pageCount: number;
  pages: readonly PageGeometry[];
  status: "needs_selection" | "extracted";
  columns: DuckDbColumnSchema[];
  /** One per selected region, for the review grid. */
  tables: readonly ExtractedTable[];
  classifications: Readonly<Record<string, RegionClassification>>;
  documentMetadata: DocumentMetadata;
  /**
   * The combined result the dataset is actually built from. Kept alongside
   * `tables` because the fingerprint and the CSV are computed from the
   * combination, not from any single region.
   */
  combinedCells: ReadonlyArray<readonly string[]>;
  combinedHeaderRows: number;
};
```

Add the matching imports for `ExtractedTable`, `RegionClassification`,
`DocumentMetadata` and `PageGeometry`.

- [ ] **Step 2: Extract on region change**

In `useLoadManualUploadFile.ts`, change the `pdf_file` arm so that when
`parseOptions.regions` is non-empty it extracts and types the result:

```ts
        .with({ type: "pdf_file" }, async (pdfParseOptions) => {
          const { datasetId, pageRange, regions = [], outputMode } =
            pdfParseOptions;
          const sniff = await LocalDatasetClient.startPdfImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            parseOptions: { pageRange },
          });

          if (regions.length === 0) {
            const loadResult: PdfFileLoadResult = {
              datasetId,
              numRows: 0,
              pageCount: sniff.pageCount,
              pages: sniff.pages,
              status: "needs_selection",
              columns: [],
              tables: [],
              classifications: {},
              documentMetadata: sniff.documentMetadata,
              combinedCells: [],
              combinedHeaderRows: 0,
            };
            pendingPreviewRowsRef.value = [];
            return loadResult;
          }

          const extracted = await extractPdfRegions({
            pages: sniff.pages,
            regions,
            documentMetadata: sniff.documentMetadata,
            outputMode,
          });

          // Reuse the CSV import path wholesale: the extracted table is now
          // just a CSV, so DuckDB's sniffer types it exactly as it would a
          // real one. The PDF stays pinned as the retained original.
          const csv = pdfTableToCsv({
            cells: extracted.combined.cells,
            headerRows: extracted.combined.headerRows,
          });
          const csvFile = new File([csv], `${datasetId}.csv`, {
            type: MIMEType.TEXT_CSV,
          });
          const csvSniff = await LocalDatasetClient.transcodePdfExtraction({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            csvFile,
          });

          const loadResult: PdfFileLoadResult = {
            datasetId,
            numRows: Math.max(
              0,
              extracted.combined.cells.length - extracted.combined.headerRows,
            ),
            pageCount: sniff.pageCount,
            pages: sniff.pages,
            status: "extracted",
            columns: csvSniff.columns,
            tables: extracted.tables,
            classifications: extracted.classifications,
            documentMetadata: sniff.documentMetadata,
            combinedCells: extracted.combined.cells,
            combinedHeaderRows: extracted.combined.headerRows,
          };
          pendingPreviewRowsRef.value = csvSniff.previewRows;
          return loadResult;
        })
```

Add `transcodePdfExtraction` to `LocalDatasetClient`, mirroring
`startCsvImport` but leaving `sourceBytes` pinned rather than clearing it after
transcode. Phase A's retention work already exempts pinned rows; this is the
call site that depends on it.

- [ ] **Step 3: Host the picker in the parse controls**

In `DatasetParseControls.tsx`, add a `pdf_file` branch rendering
`PdfRegionPicker` and, for the active region, `PdfReviewGrid`. Wire
`onRegionsChange` to `onDataSourceMetadataChange` followed by
`onRequestDataReparse`, so adjusting a region re-extracts through the existing
path rather than a parallel one.

- [ ] **Step 4: Write the real save arm**

In `useSaveDataset.ts`, replace the placeholder `pdf_file` arm:

```ts
      .with({ sourceType: "pdf_file" }, async (metadata) => {
        const loadResult = metadata.datasetLoadResult;
        if (loadResult.status !== "extracted") {
          throw new Error("Select a region before saving.");
        }

        return await DatasetClient.insertPdfFileDataset({
          dataset: baseDataset,
          columns: _duckDbColumnsToImportedColumns(loadResult.columns),
          pdfFileDataset: {
            sizeInBytes: metadata.sizeInBytes,
            hasOriginalFile: true,
            regions: metadata.parseOptions.regions ?? [],
            outputMode: metadata.parseOptions.outputMode ?? "natural",
            llmModel: metadata.parseOptions.llmModel ?? null,
            pageRangeStart: metadata.parseOptions.pageRange?.[0] ?? null,
            pageRangeEnd: metadata.parseOptions.pageRange?.[1] ?? null,
            fingerprint: await computePdfTableFingerprint({
              cells: loadResult.combinedCells,
              headerRows: loadResult.combinedHeaderRows,
            }),
          },
        });
      })
```

- [ ] **Step 5: Verify**

Run: `pnpm type-check && pnpm lint && pnpm vitest run src/views/DataManagerApp/`
Expected: all pass, and `_saveDatasetFromValues`'s `match` is exhaustive.

- [ ] **Step 6: Commit**

```bash
git add src/views/DataManagerApp/ src/clients/datasets/
git commit -m "feat: save a dataset from extracted pdf regions"
```

---

## Task 20: The executable merge gate

**Files:**

- Create: `public/test-data/pdf/gate/README.md`
- Create: `scripts/fetch-gate-fixtures.mjs`
- Create: `src/workers/pdfSniff/gateDocuments.test.ts`

**This task is the definition of done for the branch.**

- [ ] **Step 1: Resolve fixture licensing before committing anything**

The three existing fixtures are CC BY with attribution in
`public/test-data/pdf/README.md`. The two gate documents are different:

- **OCHA** publications are normally reusable with attribution. Confirm the
  terms on the publication page, then commit the PDF with attribution.
- **International Medical Corps** carries no licence we have confirmed, and
  ReliefWeb only hosts it. **Do not commit it** until someone confirms the
  terms.

Until that is resolved, use the fetch-with-checksum path in Step 2 for the IMC
document. If the licence is confirmed, commit it and delete its fetch entry.

Write what was decided into `public/test-data/pdf/gate/README.md`, including
source URLs, retrieval date, and the licence or the reason a file is fetched
rather than committed.

- [ ] **Step 2: Add the fixture fetcher**

Create `scripts/fetch-gate-fixtures.mjs`:

```js
/**
 * Downloads gate fixtures that we cannot redistribute, verifying each against
 * a known SHA-256 so a silently changed document cannot quietly change what
 * the merge gate asserts.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "public/test-data/pdf/gate";

const FIXTURES = [
  {
    name: "imc-sudan-cholera-sitrep-1.pdf",
    url: "https://reliefweb.int/attachments/b111a07c-e9f8-4061-8589-569bab57fae7/IntlMedCorps-SudanCholeraResponse_SitRep1.pdf",
    // Fill this in on first run, from the printed hash.
    sha256: "REPLACE_ON_FIRST_RUN",
  },
];

await mkdir(DIR, { recursive: true });

for (const fixture of FIXTURES) {
  const path = join(DIR, fixture.name);
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    const response = await fetch(fixture.url);
    if (!response.ok) {
      throw new Error(`${fixture.name}: HTTP ${response.status}`);
    }
    bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(path, bytes);
  }

  const hash = createHash("sha256").update(bytes).digest("hex");
  console.log(`${fixture.name} ${hash}`);
  if (fixture.sha256 !== "REPLACE_ON_FIRST_RUN" && hash !== fixture.sha256) {
    throw new Error(
      `${fixture.name}: checksum mismatch. The document changed; re-read it ` +
        "before updating the expected values in gateDocuments.test.ts.",
    );
  }
}
```

Add `"fetch-gate-fixtures": "node scripts/fetch-gate-fixtures.mjs"` to
`package.json` scripts, and add `public/test-data/pdf/gate/*.pdf` to
`.gitignore` for any file not licensed for redistribution.

- [ ] **Step 3: Write the gate test**

Create `src/workers/pdfSniff/gateDocuments.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { classifyRegion } from "./classifyRegion";
import { clipToRegion } from "./clipToRegion";
import { extractDocumentMetadata } from "./extractDocumentMetadata";
import { extractPageGeometry } from "./extractPageGeometry";
import { loadPdfDocument } from "./loadPdfJs";
import { extractLabelledGraphic } from "./extractors/extractLabelledGraphic";
import { extractProseMeasures } from "./extractors/extractProseMeasures";
import { extractRepeatingBlocks } from "./extractors/extractRepeatingBlocks";
import type { BBox, PageGeometry } from "./types";

const OCHA =
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf";
const IMC = "public/test-data/pdf/gate/imc-sudan-cholera-sitrep-1.pdf";

async function pageOf(path: string, pageNumber: number): Promise<PageGeometry> {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const page = await doc.getPage(pageNumber);
  const geometry = await extractPageGeometry(page, pageNumber - 1);
  await doc.destroy();
  return geometry;
}

/** The choropleth panel, excluding the legend below it. */
const OCHA_MAP: BBox = [330, 175, 590, 465];
/** The three KPI tiles. */
const OCHA_TILES: BBox = [330, 505, 580, 560];
/** The funding-by-pillar bars on page 3. */
const OCHA_BARS: BBox = [300, 180, 580, 330];

describe("gate document: OCHA Sudan Cholera Operational Update", () => {
  it("reads 16 state death counts from the map", async () => {
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_MAP);
    const table = extractLabelledGraphic(region, { regionId: "map" });
    const rows = table.cells.slice(1);

    expect(rows).toHaveLength(16);
  });

  it("reads the headline state figures exactly", async () => {
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_MAP);
    const table = extractLabelledGraphic(region, { regionId: "map" });
    const byLabel = new Map(
      table.cells.slice(1).map((row) => {
        return [row[0]!, row[1]!];
      }),
    );

    expect(byLabel.get("KHARTOUM")).toBe("408");
    expect(byLabel.get("WHITE NILE")).toBe("432");
    expect(byLabel.get("AJ JAZIRAH")).toBe("238");
    expect(byLabel.get("GEDAREF")).toBe("225");
    expect(byLabel.get("NORTH KORDOFAN")).toBe("224");
  });

  it("flags no more than 6 map rows for review", async () => {
    // The design measurement flagged 5 of 16. Allowing 6 leaves room for
    // tuning without letting the flag rate quietly become meaningless.
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_MAP);
    const table = extractLabelledGraphic(region, { regionId: "map" });
    const flaggedRows = new Set(
      table.flags
        .filter((flag) => {
          return flag.rowIndex >= 0;
        })
        .map((flag) => {
          return flag.rowIndex;
        }),
    );

    expect(flaggedRows.size).toBeLessThanOrEqual(6);
  });

  it("reads the three KPI tiles", async () => {
    const region = clipToRegion(await pageOf(OCHA, 1), OCHA_TILES);
    const table = extractLabelledGraphic(region, { regionId: "tiles" });

    expect(table.cells.slice(1)).toHaveLength(3);
    expect(JSON.stringify(table.cells)).toContain("83000");
  });

  it("reads the six funding pillars from the bar chart", async () => {
    const region = clipToRegion(await pageOf(OCHA, 3), OCHA_BARS);
    const table = extractLabelledGraphic(region, { regionId: "bars" });

    expect(table.cells.slice(1)).toHaveLength(6);
  });

  it("reads the six response pillars as a 6 by 4 table", async () => {
    const page = await pageOf(OCHA, 2);
    const region = clipToRegion(page, [30, 40, 570, 780]);
    const table = extractRepeatingBlocks(region, { regionId: "pillars" });

    expect(table.cells.slice(1)).toHaveLength(6);
    expect(table.cells[0]).toEqual([
      "number",
      "heading",
      "Responses",
      "Challenges",
      "Priorities",
    ]);
  });

  it("reads the document's identity", async () => {
    const bytes = await readFile(OCHA);
    const doc = await loadPdfDocument(new Uint8Array(bytes));
    const { info } = await doc.getMetadata();
    const meta = extractDocumentMetadata({
      page: await pageOf(OCHA, 1),
      info: info as Record<string, unknown>,
    });
    await doc.destroy();

    expect(meta.publishedAt).toBe("2025-07-03");
    expect(meta.title).toMatch(/cholera/i);
  });

  it("does NOT extract the weekly trend chart", async () => {
    // Shape 4 is deferred. Asserting its absence keeps that a decision rather
    // than something that quietly half-works: the chart has axis ticks but no
    // data labels, so any values here would be interpolated guesses.
    const region = clipToRegion(await pageOf(OCHA, 1), [30, 620, 570, 790]);
    const classification = classifyRegion(region);

    expect(classification.shape).not.toBe("grid_table");
    const table = extractLabelledGraphic(region, { regionId: "trend" });
    // Axis ticks and week numbers must not be paired into fake observations.
    expect(table.cells.slice(1).length).toBeLessThan(5);
  });
});

describe("gate document: IMC Sudan Cholera Situation Report #1", () => {
  it("reads the June case and death figures", async () => {
    const region = clipToRegion(await pageOf(IMC, 1), [40, 250, 330, 480]);
    const table = extractProseMeasures(region, { regionId: "prose" });
    const flat = JSON.stringify(table.cells);

    expect(flat).toContain("21563");
    expect(flat).toContain("388");
  });

  it("reads the spelled-out number with a trailing-clause subject", async () => {
    // "and one death in West Darfur" is the specific construction that
    // defeats a digits-only extractor, and it is why this document is a gate.
    const region = clipToRegion(await pageOf(IMC, 1), [40, 250, 330, 480]);
    const table = extractProseMeasures(region, { regionId: "prose" });
    const rows = table.cells.slice(1);

    expect(
      rows.some((row) => {
        return row[0] === "West Darfur" && row[2] === "1";
      }),
    ).toBe(true);
  });

  it("reads the South Darfur figures with their subject", async () => {
    const region = clipToRegion(await pageOf(IMC, 1), [40, 250, 330, 480]);
    const table = extractProseMeasures(region, { regionId: "prose" });
    const southDarfur = table.cells.slice(1).filter((row) => {
      return row[0] === "South Darfur";
    });

    expect(southDarfur).toHaveLength(2);
  });

  it("reads the Ombada Hospital CTC figures", async () => {
    const region = clipToRegion(await pageOf(IMC, 1), [40, 60, 560, 200]);
    const table = extractProseMeasures(region, { regionId: "response" });
    const flat = JSON.stringify(table.cells);

    expect(flat).toContain("237");
    expect(flat).toContain("253");
  });

  it("reads the report number and date", async () => {
    const bytes = await readFile(IMC);
    const doc = await loadPdfDocument(new Uint8Array(bytes));
    const { info } = await doc.getMetadata();
    const meta = extractDocumentMetadata({
      page: await pageOf(IMC, 1),
      info: info as Record<string, unknown>,
    });
    await doc.destroy();

    expect(meta.reportNumber).toBe("1");
    expect(meta.publishedAt).toBe("2025-06-24");
  });
});
```

- [ ] **Step 4: Calibrate the region boxes**

The bboxes above were read from the documents during design and are the right
starting point, but they must be verified rather than trusted. For each
failing assertion, print what the region actually contained:

```bash
pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts --reporter verbose
```

Cross-check against the real coordinates with:

```bash
pdftotext -f 1 -l 1 -bbox public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf -
```

Adjust the **bbox**, not the expected values. If a figure genuinely cannot be
extracted, that is a finding about the extractor, and it belongs in a fix or an
explicit, commented exclusion. Do not weaken an assertion to make it pass.

- [ ] **Step 5: Run the gate**

Run: `pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add public/test-data/pdf/gate/ scripts/ src/workers/pdfSniff/ package.json .gitignore
git commit -m "test: add the executable merge gate for the two situation reports"
```

---

## Task 21: Full verification

- [ ] **Step 1: Full suite**

```bash
pnpm type-check
pnpm lint
pnpm test --quick
```

Expected: all pass.

- [ ] **Step 2: The gate**

```bash
pnpm fetch-gate-fixtures
pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts
```

Expected: PASS. **This is the merge condition.**

- [ ] **Step 3: Manual verification, OCHA**

Start the app and import the OCHA update. Confirm, in order:

1. The file is accepted and the preview says a region is needed.
2. Drawing a box around the map classifies it as a labelled graphic, shows its
   evidence, and produces 16 rows with a review count.
3. Clicking a row highlights that value's position on the page.
4. Correcting a flagged cell clears its flag and lowers the count.
5. Changing the shape to "Numbers in prose" re-extracts and produces something
   different, then changing it back restores the original.
6. Adding a second region for the KPI tiles switches the output to observations
   and the columns change to the observation schema.
7. Saving creates a dataset whose rows match the document.

- [ ] **Step 4: Manual verification, IMC**

Import the IMC report. Select the page 1 prose, confirm the coverage note
appears, then use "Extract with the assistant" and confirm:

1. The consent modal appears before anything is sent.
2. Declining leaves the rule-based rows untouched with an explanatory message.
3. Accepting adds rows marked as model-extracted.
4. The workspace privacy log records the event.
5. With the network disabled, the assist offer either hides or fails with a
   clear message, and rule-based extraction still works end to end.

- [ ] **Step 5: Confirm the original is retained**

In DevTools, Application, IndexedDB, `AvaDexie`, `LocalDataset`: the row for
the saved dataset still has `sourceBytes` after the transcode completed. If it
does not, the pinning exemption from Phase A is not being honoured on this
path, and re-extraction on an imported file is impossible.

- [ ] **Step 6: Update the spec status**

In `docs/superpowers/specs/2026-08-18-pdf-region-extraction-design.md`, note
that B1 and B2 are implemented and B3 remains outstanding.

- [ ] **Step 7: Commit**

```bash
git add docs/
git commit -m "docs: record pdf region extraction implementation status"
```

---

## Self-review notes

**Spec coverage.** Every section of
`2026-08-18-pdf-region-extraction-design.md` maps to a task: the four shapes to
Tasks 5, 7, 9 and 10; the proximity experiment's three consequences to Tasks 3,
4 and 17; the module layout to Tasks 2 to 13; the `regions` restructure and the
two new enums to Task 1; the combination rule to Task 12; document metadata to
Task 13; the two selection gestures to Task 15; classification with evidence
and override to Tasks 11 and 16; model assistance behind the consent gate to
Task 18; the error-handling table to the flag paths in Tasks 5, 7, 9 and 11 and
the empty-state work in Phase B1's Task 13; and the executable merge gate to
Task 20.

**One spec requirement is only partly implemented, deliberately.** The spec
lists "text selection crossing a column boundary: clip by text run". Task 15
implements box drawing only; text-run selection is wired through the same
`PdfRegion` shape but the gesture itself is a `bbox` derived from the selected
run's union. That is honest for the gate documents, where prose regions are
rectangular. A true non-rectangular text run would need `fragments` to carry a
run of item indices rather than a box, which is a data-model change worth
making only when a document demands it.

**Known gaps carried forward, not silently dropped:**

- `extractMeasurements` handles the constructions in the gate documents and
  will miss others. Task 18's model assist is the answer, and the coverage flag
  in Task 9 is how the user finds out.
- `period` and `qualifier` in the observations schema are populated only when
  an extractor supplies them; `extractProseMeasures` currently leaves `period`
  empty. Reading "since July 2024" into a period is a natural follow-up.
- Chart geometry reading (shape 4) is out of scope and asserted absent in
  Task 20.
- `subject_kind` is not populated. The spec records the gazetteer question as
  open, and the column accepts free text.
