# PDF Import: Handoff, Remaining Work, and the Phase A Audit

**Date:** 2026-08-18
**Branch:** `feat/pdf-import` (77 commits ahead of `develop`, 6 behind, nothing pushed)
**Read this first if you are picking the work up cold.**

---

## 1. Where things stand

Phases B1 and B2 are complete and verified. **The merge gate passes**, which was
the condition set for this branch: it must be able to process two specific UN
situation reports.

### Verify the claim yourself before trusting it

Run these. All should be green on a clean checkout.

```bash
pnpm type-check                                          # tsc -b + deno check shared
pnpm vitest run                                          # 427 files, 2536 tests
pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts   # 17 tests: THE MERGE GATE
pnpm i18n:check
pnpm exec eslint .
pnpm build
```

For the browser tests you need a local Supabase stack up, and:

```bash
pnpm fetch-gate-fixtures        # downloads the IMC PDF, verifies SHA-256
npx playwright test tests/e2e/pdf-import.spec.ts
```

**Whether you need a port override depends on whether this worktree is
switched.** `playwright.config.ts` resolves its base URL as
`PLAYWRIGHT_BASE_URL ?? http://127.0.0.1:${AVA_VITE_DEV_PORT || 5173}`, so the
correct invocation differs by setup:

- **Switched worktree (recommended).** `ava supabase switch <projectId>` starts
  an isolated Supabase project for this branch, seeds it, and pins both its
  ports and `AVA_VITE_DEV_PORT` into `.env.development`. Playwright reads that
  pin and finds the right port by itself, so run the command above with **no
  override**. Setting `PLAYWRIGHT_BASE_URL` here is actively wrong: it points
  Playwright away from the port the switch assigned. Verify the pin with
  `grep AVA_VITE_DEV_PORT .env.development`, and cross-check it against the
  port `ava supabase switch` printed ("`pnpm dev` will serve this worktree on
  port NNNN").
- **Shared stack (not switched).** Every worktree shares one Supabase on the
  standard ports, `AVA_VITE_DEV_PORT` is unset, and Playwright falls back to
  5173, where a vite instance from another worktree may be squatting while
  pointing at a _different_ Supabase. Pass an explicit free port instead:
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5199 npx playwright test tests/e2e/pdf-import.spec.ts`.
  The symptom of getting this wrong is a sign-in failure reading "Invalid login
  credentials", which looks nothing like the actual cause.

Prefer the switch. Besides fixing the port problem at the source, it keeps this
branch's seven PDF migrations out of every other worktree's `supabase db diff`.

### What the gate proves

`src/workers/pdfSniff/gateDocuments.test.ts`, asserting against both documents:

- All 16 OCHA state figures from the choropleth, by exact equality of the whole
  map, **zero silently wrong**, 6 rows flagged for review (the budget is 6, with
  no headroom left)
- The map classifies as `labelled_graphic` **without being told to**
- Funding bars: 6 rows at printed magnitude (`WASH` 3000000, `Health` 2000000,
  `Others` 0)
- KPI tiles carrying `2.6% → percent` through to observations
- Six response pillars, and document identity
- IMC prose including `one death` / `West Darfur`, a spelled-out number whose
  subject arrives in a trailing clause
- The weekly trend chart asserted **absent**, so deferring chart-geometry
  reading stays a decision rather than something that quietly half-works

### The two specs

- `docs/superpowers/specs/2026-08-17-pdf-import-design.md` — original table
  detection design, **partly superseded**
- `docs/superpowers/specs/2026-08-18-pdf-region-extraction-design.md` — the
  current design. Its header records status and the three known divergences.

### The three plans

- `2026-08-18-pdf-import-phase-b1-extraction-foundation.md` — **done**
- `2026-08-18-pdf-import-phase-b2-selection-extraction.md` — **done**
- `2026-08-18-pdf-import-phase-b3-auto-table-detection.md` — **not started**

`2026-08-17-pdf-import-phase-b-table-extraction.md` is superseded; its header
says so. Do not execute it.

---

## 2. Hard-won knowledge that is not obvious from the code

Every item here cost real debugging time. Read before touching the relevant area.

### pdf.js 6.x differs from the docs in five ways

1. Runtime imports must use `pdfjs-dist/legacy/build/pdf.mjs`. The modern build
   touches `DOMMatrix` at module scope, which jsdom lacks, so tests crash on
   import. Type-only imports from `"pdfjs-dist"` are fine.
2. `PDFDocumentProxy.destroy()` is gone; only the loading task has it.
   `loadPdfJs.ts` patches `destroy` back onto the returned document.
3. `isEvalSupported` no longer exists in the init options.
4. A falsy `GlobalWorkerOptions.workerSrc` now **throws** instead of falling
   back to in-process parsing.
5. `constructPath` args are `[paintOp, [pathData], minMax]`, not `[ops, coords]`,
   and the path opcodes are an **unexported internal enum** (`DrawOPS`:
   moveTo 0, lineTo 1, curveTo 2, quadraticCurveTo 3, closePath 4) distinct from
   the public `OPS` numbering. `extractPageGeometry.ts` hardcodes it with a
   comment. **If you upgrade pdfjs-dist, re-verify that mapping** — the rules
   test in `extractPageGeometry.test.ts` is the guard.

### The worker port is shared, and jsdom cannot model it

Inside the sniff worker, `loadPdfJs` imports `pdf.worker.mjs`, which makes
pdf.js install **its own** handler on the same worker global and post internal
protocol traffic (starting `{ action: "ready" }`) to the main thread.

Both sides guard against foreign messages: the worker with `_isPdfWorkerRequest`,
the driver with `_isPdfSniffResponse`. **Do not remove either.** Before those
guards existed, the driver rejected on pdf.js's first message and **no PDF could
be imported at all**, while every unit test passed.

Under jsdom `typeof importScripts !== "function"`, so there is no shared port
and unit tests cannot see this class of bug. `tests/e2e/pdf-import.spec.ts` is
the only thing that can.

### Mantine's `--mantine-scale` breaks naive canvas coordinate maths

`src/index.css` sets `--mantine-scale` to 0.9 for viewports 1200–1408px and 0.8
for 768–1200px, so a preview whose canvas bitmap is 420px wide renders at 378
CSS px. Pointer events report CSS pixels.

`PdfRegionOverlay` originally divided by the bitmap scale, so every drawn region
decoded to the wrong coordinates: `[305,450,570,615]` became `[274,489,513,638]`,
cutting six states off the map and pairing White Nile with `1` instead of `432`
— **silently, with no error, producing a table that looks fine**. It now measures
its own rendered size against the page height it is given.

This was invisible to unit tests (jsdom has no layout, so
`getBoundingClientRect()` returns zeros) and invisible when testing manually on
a wide monitor (scale is 1 above 1408px).

### Repo conventions that bite

- `@typescript-eslint/array-type` is **`array-simple`**: `readonly T[]` for
  simple element types, `ReadonlyArray<T>` / `Array<T>` for non-simple ones
  (object literals, nested arrays, unions). Wrong either way is an error.
- `arrow-body-style: ["error", "always"]` — block bodies with explicit `return`.
- Components return `ReactNode` with `Readonly<Props>`, never `JSX.Element`.
- **`@testing-library/user-event` is not installed.** Use `fireEvent` from
  `@/test-utils` (the repo's `MantineProvider`-wrapped render) and
  `pickMantineSelectOption` for Mantine selects.
- `shared/` **cannot import from `src/`**. `type-check:deno` runs
  `deno check shared`, and the Deno import map has `$/` but no `@/`. This passes
  `tsc` and only explodes at `deno check`. Persisted types therefore live in
  `shared/models/datasets/PdfFileDataset/PdfFileDataset.types.ts` and are
  re-exported from `src/workers/pdfSniff/types.ts`.

### Migration conventions

Read the "Migration generation caveats" section of the Phase A plan. In short:
use `pnpm db:new-migration` (not raw `db diff -f`), expect seven benign
`analytics` view drop-and-recreate pairs that the script strips automatically,
and hand-write enum **value additions** because `db diff` mishandles them.

**Always take a baseline `supabase db diff` before editing schema**, so you can
tell your changes from pre-existing drift. That is how the missing `service_role`
grant was found.

---

## 3. Remaining work, in recommended order

### 3.1 Phase A audit — do this first

See section 4 below. Phase A underpins everything already built, has **67
unverified plan steps**, and two of its defects were found _by accident_ during
B1 and B2 without anyone looking for them.

### 3.2 Phase B3 — automatic table detection

`docs/superpowers/plans/2026-08-18-pdf-import-phase-b3-auto-table-detection.md`,
10 tasks. Seven are lifted unchanged from the original Phase B plan.

It is purely additive: it extracts nothing from the two gate documents by
design, so it cannot break the gate. Its output is a **region** of shape
`grid_table`, consumed by the extractor B2 already built — not a dataset of its
own.

One thing to know going in: `classifyRegion` now requires ruling lines to
actually organise the text into columns (via the shared `deriveColumns.ts`)
before returning `grid_table`. B3's detectors must stay consistent with that, or
the classifier and the detector will disagree about what a table is.

### 3.3 The three known divergences

Recorded in the spec header and as `KNOWN GAP` comments at their gate
assertions:

1. **Pillar 6 straddles a page-3 gutter.** A full-page box interleaves the two
   magazine columns (baselines fall inside `groupLines`' 3pt tolerance), so the
   pillars are read as three column regions. Fixing it needs reading order
   across region fragments.
2. **`NORTH KORDOFAN Khartoum`** — a capital-city annotation fuses into the
   state label. The _value_ is correct. Requiring matching fonts to merge was
   implemented and **measured**: it frees `Khartoum` to win the 408 figure from
   `KHARTOUM` on distance (15.9pt vs 20.5pt), unflagged, and pushes flagged rows
   to 7. Do not retry that. The real fix is for association to distinguish a
   point annotation from an area label.
3. **`doc_org` reads the PDF `Author` field**, which is a person's name in the
   IMC document and null in OCHA. Do not rely on it as a join key.

### 3.4 Smaller carried items

- **No password-protected fixture**, so the `password_required` error path is
  untested.
- **A mid-selection refresh loses form state.** `resumeImport` correctly returns
  `undefined` for a `pdf` row (there is no transcode to redrive), so the bytes
  survive but the picker state does not.
- **The import preview grid shows unreviewed rows.** After a review edit, the
  grid above the picker still shows the original value; only the review grid and
  the saved data reflect the correction. Re-typing per keystroke was rejected
  deliberately (a DuckDB round trip in the edit path).
- **Flags do not cover the fused label.** All six flagged map rows are near-tie
  pairings the gate pins as correct; the one genuinely wrong cell carries no
  flag, because it is a label-assembly problem rather than an association one.

### 3.5 Deferred by design, not oversights

OCR for scanned documents; chart-geometry reading (shape 4, the weekly trend
chart); and AVA-316 multi-dataset import.

---

## 4. How to do the Phase A audit

### Why it is worth doing

`docs/superpowers/plans/2026-08-17-pdf-import-phase-a-source-type-and-retention.md`
has **0 of 67 checkboxes ticked**. Phase A was implemented before the session
that built B1 and B2, by a different run, and was never verified against its own
plan.

Two defects were found in it _incidentally_, without anyone auditing:

1. **The declarative schema omitted `service_role`** from `datasets__pdf_file`'s
   grant while the creating migration had granted it. The two states disagreed,
   so the next generated migration would have silently stripped service-role
   access, breaking edge functions, admin tooling and the E2E admin helpers.
   Fixed in `ce67c7fb`.
2. **`_maybeCacheSourceBytes` dropped bytes above 200MB** while
   `_putParsingDataset` still derived `isSourcePinned` from the source type, so
   a large PDF landed as a **pinned row with no bytes** and
   `startOriginalFileUploadIfNeeded` threw at save time. Fixed by computing
   `requiresOriginalFileRetention` once and feeding both decisions, making the
   bad state unrepresentable.

Two-for-two on blind discovery is the argument for a deliberate pass.

### What the audit is not

Every file Phase A's plan says it creates **does exist**. This is not a
completeness check against a file list; that would pass trivially and prove
nothing. It is a **behaviour** audit, concentrated on the parts nothing since
has exercised.

### Coverage map: what later work already exercised

Do not spend much time here; B1, B2 and the gate lean on these daily.

| Phase A task                               | Status                                                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Retention classification                | Exercised. `requiresOriginalFileRetention` now drives both the pin and the cache decision, with tests in `LocalDatasetClient.sourceRetention.test.ts`.                                |
| 2. Enum members                            | Exercised. `pdf_file` and the detection-mode enum are used throughout.                                                                                                                |
| 4. `datasets__pdf_file` table and model    | **Restructured** by B2 Task 1 (per-region settings moved into `regions` jsonb; `output_mode` and `llm_model` added; five columns dropped). Audit the _current_ shape, not the plan's. |
| 5. Creation RPC and source client          | Exercised by the save path and the E2E.                                                                                                                                               |
| 6. Pin against LRU eviction                | Partly exercised; see below.                                                                                                                                                          |
| 7. Preserve pinned bytes after transcoding | Partly exercised; see below.                                                                                                                                                          |

### Where to actually look

These are the parts **nothing built since has touched**. Expect defects here.

**A. Storage RLS for original files (Task 3).**
`public.util__storage_object_dataset_id` was widened to parse original-file
object names, not just `<workspaceId>/datasets/<datasetId>.parquet`. There is a
pgTAP test at
`supabase/tests/database/permissions/storage_original_file_object_names.test.sql`.

```bash
pnpm test:db     # supabase test db + privilege validation
```

Check specifically: does the widened regex still **reject** junk object names?
A parser that accidentally matches too much would grant access based on a
dataset id extracted from an attacker-controlled path. Read the regex and try
adversarial names in the pgTAP test if they are not already there.

**B. The original-file storage client (Tasks 8, 9, 10, 11).**
`src/clients/storage/DatasetOriginalFileStorageClient/`. Nothing in B1 or B2
uploads or deletes an original in anger — the E2E saves a dataset but does not
assert the original PDF landed in the `workspaces` bucket, nor that deleting the
dataset removes it.

Highest-value single check: **import a PDF with cloud storage enabled, then
confirm the original object exists in Supabase Storage, then delete the dataset
and confirm the object is gone.** Cascade delete of a second object is exactly
the kind of thing that gets written and never run. `tests/e2e/helpers/supabaseAdminClient.ts`
has admin helpers, and `isDatasetParquetInStorage` is the pattern to copy.

**C. The offline-only path.**
The spec promises that an offline-only PDF's original is stored locally and
**never uploaded**. Verify the negative: with `onlineStorageAllowed` false, no
object appears in the bucket. A negative guarantee is easy to write and easy to
have silently broken.

**D. Eviction and post-transcode clearing (Tasks 6, 7).**
Two mechanisms delete `sourceBytes` for CSV/XLSX and must skip pinned rows: the
LRU evictor (`_evictSourceCache`, 1GB cumulative cap) and the post-transcode
clear. The B2 fix covered the _ceiling_, not these two.

Worth testing directly: fill the cache past the LRU cap with unpinned rows plus
one pinned PDF row, run the evictor, and assert the pinned row keeps its bytes.
Then run a transcode to completion and assert the same.

**E. Storage quota treatment.**
The original spec left this open: "the storage quota treatment of retained
originals is a product decision that can be made during AVA-317 implementation."
Find out what was actually decided, if anything. If retained originals do not
count against the workspace quota, that is a product decision someone should
have made knowingly.

### How to run the audit

Work through the plan file task by task, but **spend your time proportionally**:
skim tasks 1, 2, 4 and 5 (heavily exercised), and go deep on 3, 6, 7, 8, 9, 10
and 11.

For each, do not merely read the code and agree with it. Ask what would be
observably different if it were wrong, then check that. The two defects already
found were both invisible to reading and obvious to running:

- the grant defect appeared only in a `supabase db diff`;
- the retention defect appeared only when a file exceeded 200MB.

**Tick the checkboxes as you verify them**, so the next person inherits a
trustworthy record rather than repeating this. If a step turns out to be wrong
or superseded (several are, given B2's restructure), annotate it rather than
ticking it.

Finally: take a baseline `supabase db diff` before and after, and expect only
the seven `analytics` view pairs.

---

## 5. Environment notes

- **Local Supabase** must be running for `pnpm test:db` and the E2E. Prefer
  `ava supabase switch <projectId>`, which starts an isolated project for this
  worktree and seeds it; `pnpm db:reset` rebuilds and seeds whichever stack is
  currently selected. On the shared stack the branch is 7 migrations ahead, and
  running `pnpm test:db` against it fails in three files
  (`storage_original_file_object_names`, `exact_data_api_grants`,
  `resource_deleted_triggers`) purely because those migrations are unapplied.
  Confirm with `supabase migration list --local` before believing a failure.
- **Port selection is automatic once switched.** The switch pins
  `AVA_VITE_DEV_PORT` in `.env.development` and `playwright.config.ts` reads it,
  so Playwright needs no override. Only on the unswitched shared stack do you
  need `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5199`, because another worktree's
  dev server may be squatting 5173 against a different Supabase. See section 1.
- **The IMC gate fixture is gitignored** (no confirmed redistribution licence).
  Run `pnpm fetch-gate-fixtures` to download it; the script verifies SHA-256
  **before** writing, because ReliefWeb returns HTTP 202 with an HTML challenge
  page to unrecognised user agents, and that is `response.ok`. Without the PDF,
  the gate's two PDF-fidelity tests skip with a clear banner and the other 15
  still run against committed geometry.
- **The branch is 6 commits behind `develop`** and was deliberately kept that
  way. None of those commits touch `supabase/`, so schema diffs are safe, but
  `tests/e2e/helpers/constants.ts` has changed on both sides and will conflict
  on merge.
- **React Doctor** reports four warnings, all deliberate and commented: two
  array-index keys in `PdfReviewGrid` (index is a tiebreaker on lists that never
  reorder), the sequential `await` in the worker page loop (needed for per-page
  progress and bounded memory), and a lookup in `extractRepeatingBlocks`.

---

## 6. If you only do one thing

Run the gate and the E2E. If both pass, the branch still does what it claims:

```bash
pnpm fetch-gate-fixtures
pnpm vitest run src/workers/pdfSniff/gateDocuments.test.ts

# Switched worktree (recommended): no override, Playwright reads AVA_VITE_DEV_PORT.
npx playwright test tests/e2e/pdf-import.spec.ts

# Shared, unswitched stack only:
# PLAYWRIGHT_BASE_URL=http://127.0.0.1:5199 npx playwright test tests/e2e/pdf-import.spec.ts
```
