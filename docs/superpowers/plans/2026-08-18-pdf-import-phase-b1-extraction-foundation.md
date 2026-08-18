# PDF Import Phase B1: Extraction Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build everything a PDF needs before anyone extracts anything from it: pdf.js in a worker, normalised page geometry, the scanned-document guard, word and line assembly, CSV round-trip typing, the drift fingerprint, the page preview canvas, and import-flow wiring that tolerates a document with no rows yet.

**Architecture:** A web worker running pdf.js normalises each page into text items and axis-aligned rule segments, and posts that geometry back to the main thread. Nothing in this phase decides what a table is. The worker's job ends at "here is the page, cleanly described"; Phase B2 turns a region of it into rows, and Phase B3 finds regions automatically.

**Tech Stack:** TypeScript, pdfjs-dist, Web Workers, DuckDB-WASM, React, Mantine, Vitest.

---

## Prerequisites

**Phase A must be complete.** This plan assumes `pdf_file` exists in
`datasets__source_type`, the `datasets__pdf_file` table and model exist, and
the original-file retention mechanism works. See
`2026-08-17-pdf-import-phase-a-source-type-and-retention.md`.

Read both specs first, in this order:

1. `docs/superpowers/specs/2026-08-17-pdf-import-design.md` for the library
   choice, the in-browser architecture, value normalisation and retention.
2. `docs/superpowers/specs/2026-08-18-pdf-region-extraction-design.md` for what
   this foundation is being built to support, and why it is split out.

## Where this phase sits

The original Phase B plan bundled foundation, table detection and UI into
twenty tasks. Reading the two situation reports named as the v0 merge gate
showed neither contains a single table, so table detection cannot unblock the
merge and should not sit on its critical path. The work is now three phases:

| Phase | Contents |
|---|---|
| **B1 (this plan)** | Everything shared. Produces no rows on its own. |
| **B2** | Selection-driven extraction. **The merge gate.** |
| **B3** | Automatic table detection. |

Eight of this plan's fourteen tasks are lifted unchanged from the original
Phase B plan; six are new or rewritten. Where a task is rewritten, the reason
is stated in the task itself.

## Background an engineer new to this codebase needs

**The two-phase import pipeline.** Manual uploads run a fast **sniff phase**
that returns column names and roughly 200 preview rows so the import form can
render immediately, then a **background parquet transcode** that does the real
work and writes the parquet into IndexedDB. `useLoadManualUploadFile` awaits
only the sniff. See `src/views/DataManagerApp/DataImportView/ManualUploadView/`.

**Why PDF does not map cleanly onto the XLSX path.** An XLSX file has sheets
the moment it is opened, so its sniff returns rows immediately. A PDF has **no
rows at all** until someone chooses a region. Task 12 handles this with an
explicit `needs-selection` state rather than treating an empty result as a
parse failure, and that distinction is the single most important thing this
phase contributes to the UI.

**pdf.js coordinate system.** Origin is bottom-left, units are points (1/72
inch). `getTextContent()` returns items whose `transform` is a 6-element matrix
`[a, b, c, d, e, f]` where `e` and `f` are the x and y translation. Items come
back in **content-stream order, which is not visual order**, so everything must
be sorted geometrically.

**A warning about `str` items.** Some generators emit one text item per glyph
with no space characters at all. Word boundaries then have to be inferred from
x-gaps relative to font size. Fixture
`plos-one-ncd-mobile-phone-surveys.pdf` exercises this, and Task 6 is where it
is handled.

## Test fixtures

Three real CC BY papers live in `public/test-data/pdf/` with attribution and
per-file notes in that directory's README. Read it before writing tests.

| Fixture | Tagged | Proves |
|---|---|---|
| `frontiers-peru-child-health-insurance.pdf` | yes | Structure tree path, multi-page continuation, two tables side by side on one page, wrapped header cells, Unicode minus |
| `plos-one-online-research-data-quality.pdf` | no | Untagged multi-page continuation |
| `plos-one-ncd-mobile-phone-surveys.pdf` | no | Four-level spanning headers, `n (%)` values, dashes as nulls, a real broken ToUnicode map |

## File structure

All extraction code lives under `src/workers/pdfSniff/`, one file per
responsibility, so each is unit-testable against fixture JSON with no PDF in
the loop.

| File | Responsibility | Task |
|---|---|---|
| `src/workers/pdfSniff/loadPdfJs.ts` | Open a document with pdf.js | 1 |
| `src/workers/pdfSniff/types.ts` | Shared geometry types | 2, 3 |
| `src/workers/pdfSniff/normalizeCellValue.ts` | PDF-specific value cleanup | 4 |
| `src/workers/pdfSniff/extractPageGeometry.ts` | The only file that touches pdf.js page APIs | 5 |
| `src/workers/pdfSniff/detectTextLayer.ts` | Scanned-PDF guard | 6 |
| `src/workers/pdfSniff/assembleWords.ts` | Glyph runs to words | 7 |
| `src/workers/pdfSniff/groupLines.ts` | Text items to visual lines | 8 |
| `src/workers/pdfSniff.worker.ts` | Worker entry: geometry only | 9 |
| `src/clients/datasets/pdfSniff.ts` | Main-thread driver | 9 |
| `src/clients/datasets/pdfTableToColumns.ts` | Cells to CSV for DuckDB typing | 10 |
| `src/clients/datasets/pdfTableFingerprint.ts` | Drift fingerprint | 11 |
| `.../ManualUploadView/PdfTablePicker/PdfPagePreview.tsx` | Canvas render with overlay | 12 |

---

## Task 1: Add pdfjs-dist and prove it runs in a worker

**Files:**
- Modify: `package.json`
- Create: `src/workers/pdfSniff/loadPdfJs.ts`
- Create: `src/workers/pdfSniff/loadPdfJs.test.ts`

- [ ] **Step 1: Install**

Run: `pnpm add pdfjs-dist`
Expected: `pdfjs-dist` appears in `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `src/workers/pdfSniff/loadPdfJs.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadPdfDocument } from "./loadPdfJs";

const FIXTURE = "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf";

describe("loadPdfDocument", () => {
  it("opens a real PDF and reports its page count", async () => {
    const bytes = await readFile(FIXTURE);
    const doc = await loadPdfDocument(new Uint8Array(bytes));

    expect(doc.numPages).toBe(10);

    await doc.destroy();
  });

  it("reports whether the document carries a structure tree", async () => {
    // The Frontiers paper is our only tagged fixture. If this ever starts
    // returning false, the tagged-detection tests are silently testing
    // nothing.
    const bytes = await readFile(FIXTURE);
    const doc = await loadPdfDocument(new Uint8Array(bytes));
    const page = await doc.getPage(1);
    const structTree = await page.getStructTree();

    expect(structTree).not.toBeNull();

    await doc.destroy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/loadPdfJs.test.ts`
Expected: FAIL, cannot resolve `./loadPdfJs`.

- [ ] **Step 4: Write the loader**

Create `src/workers/pdfSniff/loadPdfJs.ts`:

```ts
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

/**
 * Opens a PDF with pdf.js.
 *
 * We disable pdf.js's own nested worker (`useWorkerFetch: false` plus an
 * empty `workerSrc`) because this code already runs inside our sniff worker.
 * Spawning a worker from a worker is supported unevenly across browsers and
 * buys us nothing here: we are already off the main thread.
 *
 * `isEvalSupported: false` keeps us compatible with a strict CSP.
 */
export async function loadPdfDocument(
  data: Uint8Array,
  options: { password?: string } = {},
): Promise<PDFDocumentProxy> {
  pdfjs.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjs.getDocument({
    data,
    password: options.password,
    useWorkerFetch: false,
    isEvalSupported: false,
    // Needed for getStructTree() to be populated.
    disableAutoFetch: false,
  });

  return await loadingTask.promise;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/loadPdfJs.test.ts`
Expected: PASS, 2 tests.

If the second test fails with `structTree` being null, stop and check the
fixture with `pdfinfo public/test-data/pdf/frontiers-peru-child-health-insurance.pdf | grep Tagged`.
It should print `Tagged: yes`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/workers/pdfSniff/
git commit -m "feat: add pdfjs-dist and a PDF document loader"
```

---

## Task 2: Shared geometry types

**Files:**
- Create: `src/workers/pdfSniff/types.ts`

No test: this file is types only, and the type checker is the test.

- [ ] **Step 1: Write the types**

Create `src/workers/pdfSniff/types.ts`:

```ts
import type { PdfDetectionMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

/** `[x0, y0, x1, y1]`, bottom-left and top-right, in PDF points. */
export type BBox = readonly [number, number, number, number];

/**
 * One run of text with a position. Normalised out of pdf.js's raw items so
 * that no downstream code has to understand transform matrices.
 */
export type TextItem = {
  text: string;
  /** Left edge, in PDF points from the page's left. */
  x: number;
  /** Baseline y, in PDF points from the page's bottom. */
  y: number;
  width: number;
  height: number;
  fontName: string;
  /**
   * Fraction of characters that failed to map to a meaningful Unicode
   * codepoint, in [0, 1]. A high value across a page means a broken
   * ToUnicode map and text we should not trust.
   */
  unmappedCharRatio: number;
};

/**
 * A straight line from the page content stream, already classified as
 * horizontal or vertical and snapped to a single coordinate.
 */
export type RuleSegment = {
  orientation: "horizontal" | "vertical";
  /** For a horizontal rule this is y; for a vertical rule, x. */
  position: number;
  /** Extent along the other axis, as `[start, end]`. */
  span: readonly [number, number];
};

/** Everything one page contributes, in a pdf.js-free form. */
export type PageGeometry = {
  pageIndex: number;
  width: number;
  height: number;
  textItems: readonly TextItem[];
  rules: readonly RuleSegment[];
  /** True when the page carries a full-page image and almost no text. */
  looksScanned: boolean;
};

/** A table proposed by one detector, before dedup, merging, or scoring. */
export type CandidateTable = {
  pageIndex: number;
  bbox: BBox;
  detectionMode: PdfDetectionMode;
  /** Column boundaries in page x coordinates, ascending. */
  gridX: readonly number[];
  /** Row boundaries in page y coordinates, descending (top to bottom). */
  gridY: readonly number[];
  /** Extracted cell text, `cells[rowIndex][columnIndex]`. */
  cells: ReadonlyArray<readonly string[]>;
};

/** A candidate after page-span merging and scoring. */
export type ScoredTable = {
  /** Page fragments in reading order. A single-page table has one. */
  fragments: ReadonlyArray<{ pageIndex: number; bbox: BBox }>;
  detectionMode: PdfDetectionMode;
  gridX: readonly number[];
  gridY: readonly number[];
  cells: ReadonlyArray<readonly string[]>;
  confidence: "high" | "medium" | "low";
  /** Human-readable reasons behind the confidence, shown in the UI. */
  confidenceNotes: readonly string[];
  headerRows: number;
  mergedCellCount: number;
};
```

- [ ] **Step 2: Verify**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/workers/pdfSniff/types.ts
git commit -m "feat: add pdf sniff geometry types"
```

---

## Task 3: Region and extracted-table types

**Files:**
- Modify: `src/workers/pdfSniff/types.ts`

**New in this phase.** The region is the unit of extraction, and both Phase B2
(user-drawn regions) and Phase B3 (auto-detected ones) produce it. Defining it
here keeps the two phases from inventing incompatible shapes.

No test: this file is types only, and the type checker is the test.

- [ ] **Step 1: Add the types**

Append to `src/workers/pdfSniff/types.ts`:

```ts
/** What kind of content a region holds, which decides how it is extracted. */
export type PdfRegionShape =
  | "grid_table"
  | "labelled_graphic"
  | "repeating_blocks"
  | "prose_measures";

/** One page's worth of a region. A region spanning pages has several. */
export type PdfRegionFragment = {
  /** Zero-based, matching `PageGeometry.pageIndex`. */
  page: number;
  bbox: BBox;
};

/**
 * A rectangle (or text run) the user or a detector has marked for extraction.
 *
 * Deliberately carries resolved geometry rather than an ordinal like
 * "table 3". A sheet name is an identity Excel guarantees; a table ordinal is
 * an output of our own detector, so improving detection could silently
 * repoint a saved dataset at different data.
 */
export type PdfRegion = {
  id: string;
  /** User-editable. Prefixes column names when regions are combined. */
  label: string;
  shape: PdfRegionShape;
  detectionMode: PdfDetectionMode;
  fragments: readonly PdfRegionFragment[];
  /** Shape-specific settings. Read only by the matching extractor. */
  options: Readonly<Record<string, unknown>>;
};

/** Why a single extracted value might be wrong, and how sure we are. */
export type PdfCellFlag = {
  rowIndex: number;
  columnIndex: number;
  reason: "ambiguous_association" | "unmatched_label" | "unmatched_value";
  /** Free text shown next to the flagged cell in the review grid. */
  detail: string;
};

/**
 * What every extractor returns, whatever shape it read and whether rules or a
 * model produced it. Keeping this one type is what lets the review grid, type
 * inference and import stay ignorant of which extractor ran.
 */
export type ExtractedTable = {
  regionId: string;
  /** `cells[rowIndex][columnIndex]`, header rows included. */
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
  flags: readonly PdfCellFlag[];
  extractedBy: "rules" | "model";
  /**
   * Where each row came from, parallel to `cells` minus the header rows.
   * Powers "click a row, highlight it on the page".
   */
  rowProvenance: ReadonlyArray<{ page: number; bbox: BBox }>;
};
```

- [ ] **Step 2: Verify**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/workers/pdfSniff/types.ts
git commit -m "feat: add pdf region and extracted-table types"
```

---

## Task 4: Normalise cell values

**Files:**
- Create: `src/workers/pdfSniff/normalizeCellValue.ts`
- Create: `src/workers/pdfSniff/normalizeCellValue.test.ts`

This is the highest-value unit in the plan and the easiest to get subtly
wrong. Survey of the real fixtures turned up two cases worth stating plainly:

1. **Parentheses do not always mean negative.** Public health tables write
   `361 (84.7)` for count and percent. Only treat parentheses as a sign when
   they wrap the *entire* value.
2. **The digits must not change.** `12%` becomes `12`, not `0.12`. Converting
   to a fraction would silently disagree with what the reader sees in the
   document, and a user comparing our table to the PDF would conclude we had
   corrupted their data.

Point 2 is a deliberate refinement of the spec, which had suggested `0.12`.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/normalizeCellValue.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeCellValue } from "./normalizeCellValue";

describe("normalizeCellValue", () => {
  describe("values it must leave alone", () => {
    it("passes plain text through untouched", () => {
      expect(normalizeCellValue("Mopti")).toBe("Mopti");
      expect(normalizeCellValue("Health facility")).toBe("Health facility");
    });

    it("passes a plain number through untouched", () => {
      expect(normalizeCellValue("1204")).toBe("1204");
      expect(normalizeCellValue("45.3")).toBe("45.3");
    });

    it("does not read count-and-percent as a negative number", () => {
      // From plos-one-ncd-mobile-phone-surveys.pdf: "361 (84.7)" means 361
      // respondents, 84.7 percent. Accounting-style cleanup would turn the
      // parenthesised part into -84.7 and produce a number that appears
      // nowhere in the document.
      expect(normalizeCellValue("361 (84.7)")).toBe("361 (84.7)");
      expect(normalizeCellValue("6 (1.4)")).toBe("6 (1.4)");
    });

    it("does not invent a number from a footnote-only cell", () => {
      expect(normalizeCellValue("*")).toBe("*");
      expect(normalizeCellValue("†")).toBe("†");
    });
  });

  describe("accounting negatives", () => {
    it("converts parentheses wrapping the whole value to a minus sign", () => {
      expect(normalizeCellValue("(1,234)")).toBe("-1234");
      expect(normalizeCellValue("(0.5)")).toBe("-0.5");
      expect(normalizeCellValue("($1,234.56)")).toBe("-1234.56");
    });
  });

  describe("sign characters", () => {
    it("converts a Unicode minus to an ASCII hyphen", () => {
      // From frontiers-peru-child-health-insurance.pdf, which writes
      // negatives with U+2212 rather than U+002D.
      expect(normalizeCellValue("−0.126")).toBe("-0.126");
      expect(normalizeCellValue("−1,450")).toBe("-1450");
    });
  });

  describe("currency, separators, and percent", () => {
    it("strips currency symbols", () => {
      expect(normalizeCellValue("$1234")).toBe("1234");
      expect(normalizeCellValue("€45.30")).toBe("45.30");
      expect(normalizeCellValue("£12")).toBe("12");
    });

    it("strips thousands separators", () => {
      expect(normalizeCellValue("1,234,567")).toBe("1234567");
      expect(normalizeCellValue("1,234.56")).toBe("1234.56");
    });

    it("strips a percent sign without rescaling the number", () => {
      // 12% becomes 12, never 0.12. Rescaling would make our table disagree
      // with the document a reader is holding next to it.
      expect(normalizeCellValue("12%")).toBe("12");
      expect(normalizeCellValue("84.7 %")).toBe("84.7");
    });

    it("does not strip a comma that is acting as a decimal point", () => {
      // "1,5" is ambiguous, but three digits after a comma is the giveaway
      // for a thousands separator, and anything else is left alone rather
      // than guessed at.
      expect(normalizeCellValue("1,5")).toBe("1,5");
      expect(normalizeCellValue("1,50")).toBe("1,50");
    });
  });

  describe("footnote markers", () => {
    it("strips a trailing marker from a number", () => {
      expect(normalizeCellValue("45.3*")).toBe("45.3");
      expect(normalizeCellValue("45.3†")).toBe("45.3");
      expect(normalizeCellValue("1,204‡")).toBe("1204");
    });

    it("strips a trailing superscript digit from a number", () => {
      expect(normalizeCellValue("45.3¹")).toBe("45.3");
    });

    it("leaves a trailing marker on text alone", () => {
      // "Gao*" is a place name with a footnote, not a number.
      expect(normalizeCellValue("Gao*")).toBe("Gao*");
    });
  });

  describe("null tokens", () => {
    it("treats dash-family placeholders as empty", () => {
      expect(normalizeCellValue("-")).toBe("");
      expect(normalizeCellValue("–")).toBe("");
      expect(normalizeCellValue("—")).toBe("");
      expect(normalizeCellValue("−")).toBe("");
    });

    it("treats not-applicable markers as empty", () => {
      expect(normalizeCellValue("n/a")).toBe("");
      expect(normalizeCellValue("N/A")).toBe("");
      expect(normalizeCellValue("NA")).toBe("");
      expect(normalizeCellValue("")).toBe("");
      expect(normalizeCellValue("   ")).toBe("");
    });
  });

  describe("whitespace", () => {
    it("collapses internal whitespace and trims", () => {
      expect(normalizeCellValue("  Health   facility  ")).toBe(
        "Health facility",
      );
    });

    it("collapses non-breaking spaces", () => {
      expect(normalizeCellValue("Health facility")).toBe(
        "Health facility",
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/normalizeCellValue.test.ts`
Expected: FAIL, cannot resolve `./normalizeCellValue`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/normalizeCellValue.ts`:

```ts
/** Tokens that mean "no value" in a table cell. */
const NULL_TOKENS = new Set([
  "",
  "-",
  "–",
  "—",
  "−",
  "n/a",
  "na",
  "n.a.",
  "nil",
  "null",
]);

/** Characters journals use to attach a footnote to a value. */
const FOOTNOTE_MARKERS = /[*†‡§¶#¹²³⁴⁵⁶⁷⁸⁹⁰]+$/u;

/** Currency symbols we strip before attempting to read a number. */
const CURRENCY_SYMBOLS = /[$€£¥₹]/gu;

/** A number with optional sign, thousands separators, and decimals. */
const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/u;

/**
 * Collapses every whitespace flavour, including non-breaking spaces, to a
 * single ASCII space and trims the ends.
 */
function _collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

/**
 * Removes thousands separators only where the grouping is unambiguous:
 * a comma followed by exactly three digits, repeated to the end of the
 * integer part. `1,234` and `1,234,567` qualify; `1,5` does not, because in
 * much of the world that is a decimal comma and rewriting it to `15` would
 * multiply the value by ten.
 */
function _stripThousandsSeparators(value: string): string {
  if (!/^-?\d{1,3}(,\d{3})+(\.\d+)?$/u.test(value)) {
    return value;
  }
  return value.replace(/,/gu, "");
}

/**
 * Normalises one extracted PDF cell into something DuckDB's CSV sniffer can
 * type correctly, without changing any digit a reader would see in the
 * document.
 *
 * The guiding rule is conservatism: when a value is ambiguous we return it
 * unchanged and let it land as text, because a column that needs a manual
 * cast is a nuisance, while a silently rescaled number is a wrong answer.
 */
export function normalizeCellValue(rawValue: string): string {
  const collapsed = _collapseWhitespace(rawValue);

  if (NULL_TOKENS.has(collapsed.toLowerCase())) {
    return "";
  }

  // Unicode minus to ASCII hyphen, before any numeric test.
  let value = collapsed.replace(/−/gu, "-");

  // Accounting negative, but only when the parentheses wrap everything.
  // "361 (84.7)" is a count and a percent, not a negative number.
  const isFullyParenthesised = /^\((.*)\)$/u.test(value);
  let isAccountingNegative = false;
  if (isFullyParenthesised) {
    const inner = value.slice(1, -1).trim();
    const innerLooksNumeric = /^[$€£¥₹]?\s*[\d,.\s]+$/u.test(inner);
    if (innerLooksNumeric) {
      isAccountingNegative = true;
      value = inner;
    }
  }

  // Strip a trailing footnote marker, but only if what remains is numeric.
  // "Gao*" is a place name; "45.3*" is a measurement with a footnote.
  const withoutMarker = value.replace(FOOTNOTE_MARKERS, "").trim();
  const markerStrippedCandidate = _stripThousandsSeparators(
    withoutMarker.replace(CURRENCY_SYMBOLS, "").replace(/\s*%$/u, "").trim(),
  );
  if (
    withoutMarker !== value &&
    NUMERIC_PATTERN.test(markerStrippedCandidate)
  ) {
    value = withoutMarker;
  }

  // Currency and percent. Percent is stripped without rescaling: 12% is 12.
  const withoutCurrency = value.replace(CURRENCY_SYMBOLS, "").trim();
  const withoutPercent = withoutCurrency.replace(/\s*%$/u, "").trim();
  const candidate = _stripThousandsSeparators(withoutPercent);

  if (NUMERIC_PATTERN.test(candidate)) {
    return isAccountingNegative ? `-${candidate.replace(/^-/u, "")}` : candidate;
  }

  // Not a number we recognise. Return the collapsed original so nothing is
  // silently altered, undoing the accounting-negative unwrap if we did one.
  return isAccountingNegative ? collapsed : value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/normalizeCellValue.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Update the spec's percent example**

The spec's extraction diagram shows `12%` becoming `0.12`. Edit
`docs/superpowers/specs/2026-08-17-pdf-import-design.md` and change that
diagram entry to `12`, and add to the paragraph below it:

```
Percent signs are stripped without rescaling: `12%` becomes `12`, not `0.12`.
Rescaling would make an imported table disagree with the document a reader has
open beside it, which is a worse failure than losing the unit.
```

- [ ] **Step 6: Commit**

```bash
git add src/workers/pdfSniff/ docs/superpowers/specs/
git commit -m "feat: normalise pdf cell values without changing their digits"
```

---

## Task 5: Extract page geometry from pdf.js

**Files:**
- Create: `src/workers/pdfSniff/extractPageGeometry.ts`
- Create: `src/workers/pdfSniff/extractPageGeometry.test.ts`

The only file that imports pdf.js types beyond the loader. It owns page
rotation and geometric sorting so that no downstream detector ever sees
content-stream order.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/extractPageGeometry.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractPageGeometry } from "./extractPageGeometry";
import { loadPdfDocument } from "./loadPdfJs";

const FRONTIERS =
  "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf";
const PLOS_NCD = "public/test-data/pdf/plos-one-ncd-mobile-phone-surveys.pdf";

async function geometryForPage(path: string, pageNumber: number) {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const page = await doc.getPage(pageNumber);
  const geometry = await extractPageGeometry(page, pageNumber - 1);
  await doc.destroy();
  return geometry;
}

describe("extractPageGeometry", () => {
  it("reports page dimensions in points", async () => {
    const geometry = await geometryForPage(FRONTIERS, 1);
    // A4 is 595 x 842 points.
    expect(Math.round(geometry.width)).toBe(595);
    expect(Math.round(geometry.height)).toBe(842);
  });

  it("returns text items sorted top-to-bottom then left-to-right", async () => {
    // pdf.js returns items in content-stream order, which routinely differs
    // from visual order. Every detector depends on this sort, so it is
    // asserted here rather than assumed.
    const geometry = await geometryForPage(FRONTIERS, 1);
    const items = geometry.textItems;

    expect(items.length).toBeGreaterThan(50);

    for (let i = 1; i < items.length; i += 1) {
      const previous = items[i - 1]!;
      const current = items[i]!;
      const isBelow = current.y < previous.y - 1;
      const isSameLineAndRight =
        Math.abs(current.y - previous.y) <= 1 && current.x >= previous.x;
      expect(isBelow || isSameLineAndRight).toBe(true);
    }
  });

  it("extracts horizontal ruling lines from a ruled page", async () => {
    // Journal tables are ruled horizontally. Page 4 of the Frontiers paper
    // holds Table 1's continuation.
    const geometry = await geometryForPage(FRONTIERS, 4);
    const horizontal = geometry.rules.filter((r) => {
      return r.orientation === "horizontal";
    });

    expect(horizontal.length).toBeGreaterThan(2);
  });

  it("flags a page with real text as not scanned", async () => {
    const geometry = await geometryForPage(PLOS_NCD, 1);
    expect(geometry.looksScanned).toBe(false);
  });

  it("reports unmapped characters where the ToUnicode map is broken", async () => {
    // PLOS renders the decimal point with a private-use glyph, so "84.7"
    // extracts as "84<PUA>7". We must notice rather than import mojibake.
    const geometry = await geometryForPage(PLOS_NCD, 6);
    const worstItem = geometry.textItems.reduce((worst, item) => {
      return item.unmappedCharRatio > worst ? item.unmappedCharRatio : worst;
    }, 0);

    expect(worstItem).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/extractPageGeometry.test.ts`
Expected: FAIL, cannot resolve `./extractPageGeometry`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/extractPageGeometry.ts`:

```ts
import * as pdfjs from "pdfjs-dist";
import type { PageGeometry, RuleSegment, TextItem } from "./types";
import type { PDFPageProxy } from "pdfjs-dist";

/**
 * A rule thinner than this many points is treated as a line rather than a
 * filled shape. Journal tables draw rules at 0.5 to 1.5 points; a filled
 * header band is typically 8 points or more.
 */
const MAX_RULE_THICKNESS = 3;

/** A segment shorter than this is noise, not a table rule. */
const MIN_RULE_LENGTH = 8;

/**
 * Below this many text items, a page carrying a large image is almost
 * certainly a scan. Real pages have hundreds of items; a scanned page often
 * has a handful from a header stamp or an OCR-free watermark.
 */
const SCANNED_PAGE_MAX_TEXT_ITEMS = 10;

/** Codepoints in the Unicode private use area, plus the replacement char. */
const UNMAPPED_CHAR = /[\uE000-\uF8FF\uFFFD]/gu;

function _unmappedCharRatio(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  const unmapped = text.match(UNMAPPED_CHAR)?.length ?? 0;
  return unmapped / text.length;
}

/**
 * Walks the page's operator list and pulls out axis-aligned line segments.
 *
 * This is the lattice signal's raw input, and it is why we do not need
 * computer vision: Camelot rasterizes the page and runs OpenCV morphology to
 * rediscover lines the generator already told us about, whereas we read the
 * original vector geometry straight out of the content stream.
 *
 * Both stroked paths and thin filled rectangles count, because generators
 * differ in which they emit for a table rule.
 */
async function _extractRules(page: PDFPageProxy): Promise<RuleSegment[]> {
  const operatorList = await page.getOperatorList();
  const rules: RuleSegment[] = [];

  for (let i = 0; i < operatorList.fnArray.length; i += 1) {
    if (operatorList.fnArray[i] !== pdfjs.OPS.constructPath) {
      continue;
    }
    const args = operatorList.argsArray[i] as
      | [number[], number[]]
      | undefined;
    if (!args) {
      continue;
    }
    const [ops, coords] = args;
    let coordIndex = 0;
    let currentX = 0;
    let currentY = 0;

    for (const op of ops) {
      if (op === pdfjs.OPS.moveTo || op === pdfjs.OPS.lineTo) {
        const nextX = coords[coordIndex] ?? 0;
        const nextY = coords[coordIndex + 1] ?? 0;
        coordIndex += 2;

        if (op === pdfjs.OPS.lineTo) {
          _pushIfAxisAligned(rules, currentX, currentY, nextX, nextY);
        }
        currentX = nextX;
        currentY = nextY;
      } else if (op === pdfjs.OPS.rectangle) {
        const x = coords[coordIndex] ?? 0;
        const y = coords[coordIndex + 1] ?? 0;
        const width = coords[coordIndex + 2] ?? 0;
        const height = coords[coordIndex + 3] ?? 0;
        coordIndex += 4;

        // A rectangle thin in one dimension is how many generators draw a
        // rule. A rectangle thin in neither is a filled cell background,
        // which carries no grid information.
        if (Math.abs(height) <= MAX_RULE_THICKNESS) {
          _pushIfAxisAligned(rules, x, y, x + width, y);
        }
        if (Math.abs(width) <= MAX_RULE_THICKNESS) {
          _pushIfAxisAligned(rules, x, y, x, y + height);
        }
      }
    }
  }

  return rules;
}

function _pushIfAxisAligned(
  rules: RuleSegment[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);

  if (dy <= MAX_RULE_THICKNESS && dx >= MIN_RULE_LENGTH) {
    rules.push({
      orientation: "horizontal",
      position: (y0 + y1) / 2,
      span: [Math.min(x0, x1), Math.max(x0, x1)],
    });
    return;
  }
  if (dx <= MAX_RULE_THICKNESS && dy >= MIN_RULE_LENGTH) {
    rules.push({
      orientation: "vertical",
      position: (x0 + x1) / 2,
      span: [Math.min(y0, y1), Math.max(y0, y1)],
    });
  }
}

/**
 * Normalises one page into geometry no downstream code has to understand
 * pdf.js to consume.
 *
 * Two responsibilities live here and nowhere else: applying the page's
 * rotation via the viewport, and sorting text items into visual reading
 * order. pdf.js hands back items in content-stream order, which for many
 * generators is unrelated to where the text appears.
 */
export async function extractPageGeometry(
  page: PDFPageProxy,
  pageIndex: number,
): Promise<PageGeometry> {
  // Requesting the viewport at scale 1 with the page's own rotation gives us
  // dimensions and coordinates already corrected for landscape pages.
  const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
  const textContent = await page.getTextContent();

  const textItems: TextItem[] = textContent.items
    .flatMap((rawItem) => {
      if (!("str" in rawItem)) {
        return [];
      }
      const text = rawItem.str;
      if (text.length === 0) {
        return [];
      }
      // transform is [a, b, c, d, e, f]; e and f are the translation.
      const x = rawItem.transform[4] ?? 0;
      const y = rawItem.transform[5] ?? 0;
      return [
        {
          text,
          x,
          y,
          width: rawItem.width ?? 0,
          height: rawItem.height ?? 0,
          fontName: rawItem.fontName ?? "",
          unmappedCharRatio: _unmappedCharRatio(text),
        },
      ];
    })
    .sort((a, b) => {
      // Top to bottom first. y grows upward in PDF space, so a larger y is
      // higher on the page and sorts first.
      const yDelta = b.y - a.y;
      if (Math.abs(yDelta) > 1) {
        return yDelta;
      }
      return a.x - b.x;
    });

  const rules = await _extractRules(page);

  return {
    pageIndex,
    width: viewport.width,
    height: viewport.height,
    textItems,
    rules,
    looksScanned: textItems.length <= SCANNED_PAGE_MAX_TEXT_ITEMS,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/extractPageGeometry.test.ts`
Expected: PASS, 5 tests.

If the rules test fails, print what was found and check against the fixture:
`pdftotext -layout public/test-data/pdf/frontiers-peru-child-health-insurance.pdf - | sed -n '271,300p'`.
If `pdfjs.OPS.rectangle` is undefined in the installed version, check the
actual export name with
`node -e "const p=require('pdfjs-dist');console.log(Object.keys(p.OPS).filter(k=>/rect|path/i.test(k)))"`.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: normalise pdf page geometry from pdf.js"
```

---

## Task 6: The scanned-PDF guard

**Files:**
- Create: `src/workers/pdfSniff/detectTextLayer.ts`
- Create: `src/workers/pdfSniff/detectTextLayer.test.ts`

Runs before any detection work. A scanned document must be diagnosed, not
reported as "no tables found", and the user must not wait through a doomed
scan of 200 pages first.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/detectTextLayer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectTextLayer } from "./detectTextLayer";
import type { PageGeometry } from "./types";

function makePage(options: {
  pageIndex: number;
  textItemCount: number;
  looksScanned: boolean;
  unmappedCharRatio?: number;
}): PageGeometry {
  return {
    pageIndex: options.pageIndex,
    width: 595,
    height: 842,
    rules: [],
    looksScanned: options.looksScanned,
    textItems: Array.from({ length: options.textItemCount }, (_, i) => {
      return {
        text: "sample",
        x: 10,
        y: 800 - i,
        width: 30,
        height: 10,
        fontName: "g_d0_f1",
        unmappedCharRatio: options.unmappedCharRatio ?? 0,
      };
    }),
  };
}

describe("detectTextLayer", () => {
  it("accepts a document with a real text layer", () => {
    const pages = [
      makePage({ pageIndex: 0, textItemCount: 400, looksScanned: false }),
      makePage({ pageIndex: 1, textItemCount: 380, looksScanned: false }),
    ];

    expect(detectTextLayer(pages)).toEqual({ status: "ok" });
  });

  it("rejects a document where every page looks scanned", () => {
    const pages = [
      makePage({ pageIndex: 0, textItemCount: 0, looksScanned: true }),
      makePage({ pageIndex: 1, textItemCount: 2, looksScanned: true }),
    ];

    const result = detectTextLayer(pages);

    expect(result.status).toBe("no_text_layer");
    if (result.status === "no_text_layer") {
      // The evidence is shown to the user, because "this PDF has no text
      // layer" is far more actionable when it says how it knows.
      expect(result.scannedPageCount).toBe(2);
      expect(result.totalPageCount).toBe(2);
    }
  });

  it("accepts a mostly-scanned document that still has readable pages", () => {
    // A report with scanned annexes still has extractable tables in the
    // body. Refusing the whole document would be wrong.
    const pages = [
      makePage({ pageIndex: 0, textItemCount: 400, looksScanned: false }),
      makePage({ pageIndex: 1, textItemCount: 0, looksScanned: true }),
      makePage({ pageIndex: 2, textItemCount: 0, looksScanned: true }),
    ];

    expect(detectTextLayer(pages).status).toBe("ok");
  });

  it("warns when the text layer is present but unreliable", () => {
    // A broken ToUnicode map produces text that looks fine to the parser and
    // is garbage to a reader. Importing it silently is the worst outcome.
    const pages = [
      makePage({
        pageIndex: 0,
        textItemCount: 400,
        looksScanned: false,
        unmappedCharRatio: 0.4,
      }),
    ];

    const result = detectTextLayer(pages);

    expect(result.status).toBe("unreliable_text");
    if (result.status === "unreliable_text") {
      expect(result.unmappedCharRatio).toBeCloseTo(0.4, 2);
    }
  });

  it("tolerates the small amount of unmapped text real journals produce", () => {
    // PLOS's private-use decimal glyph affects a few percent of characters.
    // That deserves the mojibake note on individual values, not a
    // document-level refusal.
    const pages = [
      makePage({
        pageIndex: 0,
        textItemCount: 400,
        looksScanned: false,
        unmappedCharRatio: 0.03,
      }),
    ];

    expect(detectTextLayer(pages).status).toBe("ok");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/detectTextLayer.test.ts`
Expected: FAIL, cannot resolve `./detectTextLayer`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/detectTextLayer.ts`:

```ts
import type { PageGeometry } from "./types";

/**
 * Fraction of characters that may fail to map before we stop trusting the
 * text layer. Set above the few percent that real journal PDFs produce from
 * decorative glyph substitutions, and well below the level at which values
 * become unreadable.
 */
const MAX_TOLERABLE_UNMAPPED_RATIO = 0.15;

export type TextLayerResult =
  | { status: "ok" }
  | {
      status: "no_text_layer";
      scannedPageCount: number;
      totalPageCount: number;
    }
  | { status: "unreliable_text"; unmappedCharRatio: number };

/**
 * Decides whether a document's text layer is usable, before any detection
 * work runs.
 *
 * Ordering matters: scanning a 200-page document and then reporting "no
 * tables found" wastes the user's time and, worse, reads as our detector
 * failing rather than as a diagnosis of their file. A scan is not a
 * detection failure; it is a different kind of document.
 *
 * A document is only refused when EVERY page looks scanned. Reports with
 * scanned annexes still have extractable tables in the body.
 */
export function detectTextLayer(
  pages: readonly PageGeometry[],
): TextLayerResult {
  const totalPageCount = pages.length;
  const scannedPageCount = pages.filter((page) => {
    return page.looksScanned;
  }).length;

  if (totalPageCount > 0 && scannedPageCount === totalPageCount) {
    return { status: "no_text_layer", scannedPageCount, totalPageCount };
  }

  const allItems = pages.flatMap((page) => {
    return page.textItems;
  });
  const totalChars = allItems.reduce((sum, item) => {
    return sum + item.text.length;
  }, 0);
  const unmappedChars = allItems.reduce((sum, item) => {
    return sum + item.unmappedCharRatio * item.text.length;
  }, 0);

  const unmappedCharRatio = totalChars === 0 ? 0 : unmappedChars / totalChars;
  if (unmappedCharRatio > MAX_TOLERABLE_UNMAPPED_RATIO) {
    return { status: "unreliable_text", unmappedCharRatio };
  }

  return { status: "ok" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/detectTextLayer.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: diagnose scanned and unreliable pdf text layers"
```

---

## Task 7: Assemble words from glyph runs

**Files:**
- Create: `src/workers/pdfSniff/assembleWords.ts`
- Create: `src/workers/pdfSniff/assembleWords.test.ts`

**New in this phase.** The original plan left glyph-level text items as a known
gap. It cannot stay a gap: all four extraction shapes in Phase B2 read words,
and a generator that emits one item per glyph turns "Khartoum" into eight
items, which breaks label matching, sentence parsing and column detection
alike.

The rule is that a gap wider than a fraction of the font size is a space, and
anything narrower is just letter spacing.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/assembleWords.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assembleWords } from "./assembleWords";
import type { TextItem } from "./types";

function glyph(text: string, x: number, y = 100, width = 6): TextItem {
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

describe("assembleWords", () => {
  it("leaves items that already contain spaces alone", () => {
    // The common case. Most generators emit whole words or whole lines, and
    // re-splitting them would be a regression.
    const items = [glyph("Deaths by state", 100, 100, 60)];
    expect(assembleWords(items)).toEqual(items);
  });

  it("joins adjacent glyphs into one word", () => {
    const items = [
      glyph("K", 100),
      glyph("h", 106),
      glyph("a", 112),
      glyph("r", 118),
    ];

    const words = assembleWords(items);

    expect(words).toHaveLength(1);
    expect(words[0]!.text).toBe("Khar");
    expect(words[0]!.x).toBe(100);
  });

  it("splits on a gap wide enough to be a space", () => {
    // 6pt glyphs on a 10pt font: a 5pt gap is a space, a 0pt gap is not.
    const items = [
      glyph("R", 100),
      glyph("e", 106),
      glyph("d", 112),
      glyph("S", 123),
      glyph("e", 129),
      glyph("a", 135),
    ];

    const words = assembleWords(items);

    expect(words.map((w) => w.text)).toEqual(["Red", "Sea"]);
  });

  it("spans the full width of the assembled word", () => {
    const items = [glyph("a", 100), glyph("b", 106), glyph("c", 112)];

    const [word] = assembleWords(items);

    // Left edge of the first glyph to right edge of the last.
    expect(word!.x).toBe(100);
    expect(word!.width).toBeCloseTo(18, 5);
  });

  it("does not join glyphs on different lines", () => {
    const items = [glyph("a", 100, 200), glyph("b", 106, 100)];

    const words = assembleWords(items);

    expect(words).toHaveLength(2);
  });

  it("does not join glyphs in different fonts", () => {
    // A bold run-in label followed by body text is two words even with no
    // gap, and Phase B2's block parser depends on that boundary surviving.
    const items = [
      { ...glyph("a", 100), fontName: "bold" },
      { ...glyph("b", 106), fontName: "body" },
    ];

    const words = assembleWords(items);

    expect(words).toHaveLength(2);
  });

  it("preserves the worst unmapped-character ratio in the run", () => {
    const items = [
      { ...glyph("8", 100), unmappedCharRatio: 0 },
      { ...glyph("", 106), unmappedCharRatio: 1 },
      { ...glyph("7", 112), unmappedCharRatio: 0 },
    ];

    const [word] = assembleWords(items);

    // Losing this would let a broken ToUnicode map through the guard.
    expect(word!.unmappedCharRatio).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/assembleWords.test.ts`
Expected: FAIL, cannot resolve `./assembleWords`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/assembleWords.ts`:

```ts
import type { TextItem } from "./types";

/**
 * A horizontal gap wider than this fraction of the font size is a word
 * boundary. Tuned against generators that emit one item per glyph: real
 * inter-letter spacing is a small fraction of the em, while a space is
 * typically a quarter to a third of it.
 */
const SPACE_GAP_RATIO = 0.25;

/** Baselines further apart than this are different lines. */
const SAME_LINE_TOLERANCE = 1.5;

function _isSameRun(previous: TextItem, current: TextItem): boolean {
  if (Math.abs(previous.y - current.y) > SAME_LINE_TOLERANCE) {
    return false;
  }
  if (previous.fontName !== current.fontName) {
    return false;
  }
  const gap = current.x - (previous.x + previous.width);
  const spaceThreshold = Math.max(previous.height, current.height) *
    SPACE_GAP_RATIO;
  return gap < spaceThreshold;
}

function _mergeRun(run: readonly TextItem[]): TextItem {
  const first = run[0]!;
  const last = run[run.length - 1]!;
  return {
    text: run.map((item) => {
      return item.text;
    }).join(""),
    x: first.x,
    y: first.y,
    width: last.x + last.width - first.x,
    height: Math.max(...run.map((item) => {
      return item.height;
    })),
    fontName: first.fontName,
    // The worst ratio in the run wins. Averaging would let one bad glyph in a
    // long word slip under the unreliable-text threshold.
    unmappedCharRatio: Math.max(...run.map((item) => {
      return item.unmappedCharRatio;
    })),
  };
}

/**
 * Reconstructs words from generators that emit one text item per glyph.
 *
 * Returns the input untouched when it already contains spaces, because the
 * common case is a generator that emits whole words or whole lines and
 * re-splitting those would lose information rather than add it.
 */
export function assembleWords(
  items: readonly TextItem[],
): readonly TextItem[] {
  const hasSpaces = items.some((item) => {
    return item.text.includes(" ");
  });
  if (hasSpaces || items.length === 0) {
    return items;
  }

  const words: TextItem[] = [];
  let run: TextItem[] = [items[0]!];

  for (let i = 1; i < items.length; i += 1) {
    const current = items[i]!;
    const previous = run[run.length - 1]!;
    if (_isSameRun(previous, current)) {
      run.push(current);
    } else {
      words.push(_mergeRun(run));
      run = [current];
    }
  }
  words.push(_mergeRun(run));

  return words;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/assembleWords.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Call it from `extractPageGeometry`**

In `src/workers/pdfSniff/extractPageGeometry.ts`, import `assembleWords` and
wrap the sorted items before returning:

```ts
import { assembleWords } from "./assembleWords";
```

and change the return statement's `textItems` to:

```ts
    textItems: assembleWords(textItems),
```

- [ ] **Step 6: Verify nothing regressed**

Run: `pnpm vitest run src/workers/pdfSniff/`
Expected: PASS. `extractPageGeometry.test.ts` must still pass, since its
fixtures emit normal word items and `assembleWords` returns those unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: reconstruct words from glyph-level pdf text items"
```

---

## Task 8: Group text items into visual lines

**Files:**
- Create: `src/workers/pdfSniff/groupLines.ts`
- Create: `src/workers/pdfSniff/groupLines.test.ts`

**Lifted forward.** The original plan buried this inside stream table
detection as a private `_groupIntoRows`. All four Phase B2 extractors need it,
so it becomes a shared primitive here and the stream detector consumes it in
Phase B3 rather than owning a private copy.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/groupLines.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { groupLines } from "./groupLines";
import type { TextItem } from "./types";

function textItem(text: string, x: number, y: number): TextItem {
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

describe("groupLines", () => {
  it("groups items sharing a baseline into one line", () => {
    const lines = groupLines([
      textItem("District", 100, 600),
      textItem("Cases", 250, 600),
      textItem("Deaths", 400, 600),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]!.items.map((i) => i.text)).toEqual([
      "District",
      "Cases",
      "Deaths",
    ]);
  });

  it("tolerates sub-point baseline jitter within a line", () => {
    // Baselines drift by a fraction of a point within a row. Treating that as
    // a new line would produce one line per cell.
    const lines = groupLines([
      textItem("Gao", 100, 580),
      textItem("1204", 250, 580.4),
      textItem("31", 400, 579.7),
    ]);

    expect(lines).toHaveLength(1);
  });

  it("returns lines top to bottom", () => {
    // PDF y grows upward, so the largest y is the topmost line.
    const lines = groupLines([
      textItem("bottom", 100, 100),
      textItem("top", 100, 700),
      textItem("middle", 100, 400),
    ]);

    expect(lines.map((l) => l.items[0]!.text)).toEqual([
      "top",
      "middle",
      "bottom",
    ]);
  });

  it("sorts items within a line left to right", () => {
    const lines = groupLines([
      textItem("third", 400, 600),
      textItem("first", 100, 600),
      textItem("second", 250, 600),
    ]);

    expect(lines[0]!.items.map((i) => i.text)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("reports each line's baseline and text", () => {
    const lines = groupLines([
      textItem("Responses:", 100, 600),
      textItem("Providing", 160, 600),
    ]);

    expect(lines[0]!.y).toBeCloseTo(600, 5);
    expect(lines[0]!.text).toBe("Responses: Providing");
  });

  it("returns an empty array for no items", () => {
    expect(groupLines([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/groupLines.test.ts`
Expected: FAIL, cannot resolve `./groupLines`.

- [ ] **Step 3: Add the `TextLine` type**

In `src/workers/pdfSniff/types.ts`, add:

```ts
/** A run of text items sharing a baseline, in left-to-right order. */
export type TextLine = {
  /** Baseline y, in PDF points from the page's bottom. */
  y: number;
  items: readonly TextItem[];
  /** The line's items joined with single spaces. */
  text: string;
};
```

- [ ] **Step 4: Write the implementation**

Create `src/workers/pdfSniff/groupLines.ts`:

```ts
import type { TextItem, TextLine } from "./types";

/** Baselines within this many points belong to the same visual line. */
const LINE_TOLERANCE = 3;

/**
 * Groups text items into visual lines, top to bottom, each sorted left to
 * right.
 *
 * Every extractor needs this and none of them should reimplement it: the
 * tolerance is the difference between reading a table row correctly and
 * emitting one row per cell.
 */
export function groupLines(items: readonly TextItem[]): readonly TextLine[] {
  const buckets: TextItem[][] = [];

  for (const item of items) {
    const existing = buckets.find((bucket) => {
      const head = bucket[0];
      return head !== undefined && Math.abs(head.y - item.y) <= LINE_TOLERANCE;
    });
    if (existing) {
      existing.push(item);
    } else {
      buckets.push([item]);
    }
  }

  return buckets
    .map((bucket): TextLine => {
      const sorted = [...bucket].sort((a, b) => {
        return a.x - b.x;
      });
      return {
        // The mean baseline is steadier than the first item's, which matters
        // when a line starts with a superscript.
        y: sorted.reduce((sum, i) => {
          return sum + i.y;
        }, 0) / sorted.length,
        items: sorted,
        text: sorted
          .map((i) => {
            return i.text;
          })
          .join(" ")
          .replace(/\s+/gu, " ")
          .trim(),
      };
    })
    .sort((a, b) => {
      // y grows upward in PDF space, so larger y is higher and sorts first.
      return b.y - a.y;
    });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/groupLines.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: add shared line grouping primitive"
```

---

## Task 9: The geometry worker and its driver

**Files:**
- Create: `src/workers/pdfSniff.worker.ts`
- Create: `src/clients/datasets/pdfSniff.ts`

**Rewritten.** The original plan's worker orchestrated three detectors, dedup,
page-span merging and scoring, and failed with `no_tables_found` when they came
up empty. That is now wrong in two ways: extraction is a separate concern from
geometry, and "no tables" is not an error for a document nobody claimed had
tables.

The worker's contract here is narrow: **return clean geometry, or explain why
the document cannot be read.** Phase B2 adds an extraction message, Phase B3
adds a detection message, and neither has to touch this file's page loop.

Mirrors `xlsxSniff.worker.ts` and `xlsxSniff.ts`: one worker per call,
self-closing after reply, `terminate()` as the error-path fallback.

- [ ] **Step 1: Write the worker**

Create `src/workers/pdfSniff.worker.ts`:

```ts
/**
 * Worker that reads a PDF's page geometry without blocking the main thread.
 *
 * Lifecycle: main thread sends `{ type: "sniff", file, pageRange?, password? }`,
 * the worker posts zero or more `progress` messages, then one `result` or
 * `error`, then closes. One worker per import, matching `xlsxSniff.worker.ts`.
 *
 * Why this is a worker: reading every page's text and operator list is, for a
 * 200-page statistical publication, seconds of pure JS. On the main thread
 * that freezes input and animation.
 *
 * Deliberately knows nothing about tables, regions or extraction. It answers
 * one question ("what is on these pages") so that later phases can add
 * extraction without touching the page loop or the error taxonomy.
 */
import { detectTextLayer } from "./pdfSniff/detectTextLayer";
import { extractPageGeometry } from "./pdfSniff/extractPageGeometry";
import { loadPdfDocument } from "./pdfSniff/loadPdfJs";
import type { PageGeometry } from "./pdfSniff/types";

/**
 * Hard cap on pages read when the user has not chosen a range. Beyond this we
 * stop and ask for a range rather than grinding for a minute.
 */
const MAX_PAGES_WITHOUT_RANGE = 50;

type SniffRequest = {
  type: "sniff";
  file: File;
  /** Inclusive, one-based, as the user would type it. */
  pageRange?: readonly [number, number];
  password?: string;
};

export type PdfSniffResult = {
  type: "result";
  pageCount: number;
  /** Geometry for the pages actually read, in page order. */
  pages: readonly PageGeometry[];
};

export type PdfSniffProgress = {
  type: "progress";
  pagesScanned: number;
  totalPages: number;
};

export type PdfSniffError = {
  type: "error";
  /**
   * Machine-readable so the UI can render a specific explanation rather than
   * a generic failure. Every one of these is a different conversation with
   * the user.
   */
  reason:
    | "no_text_layer"
    | "unreliable_text"
    | "password_required"
    | "too_many_pages"
    | "unknown";
  message: string;
  detail?: Record<string, unknown>;
};

type SniffResponse = PdfSniffResult | PdfSniffProgress | PdfSniffError;

function _post(message: SniffResponse): void {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
}

function _close(): void {
  (self as unknown as DedicatedWorkerGlobalScope).close();
}

self.addEventListener("message", async (event: MessageEvent<SniffRequest>) => {
  const request = event.data;
  if (request.type !== "sniff") {
    return;
  }

  try {
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const doc = await loadPdfDocument(bytes, { password: request.password });

    const [rangeStart, rangeEnd] = request.pageRange ?? [1, doc.numPages];
    const firstPage = Math.max(1, rangeStart);
    const lastPage = Math.min(doc.numPages, rangeEnd);
    const pageCountToScan = lastPage - firstPage + 1;

    if (!request.pageRange && pageCountToScan > MAX_PAGES_WITHOUT_RANGE) {
      _post({
        type: "error",
        reason: "too_many_pages",
        message:
          `This PDF has ${doc.numPages} pages. Choose a page range so we ` +
          "only read the part you need.",
        detail: { pageCount: doc.numPages },
      });
      _close();
      return;
    }

    const pages: PageGeometry[] = [];

    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      pages.push(await extractPageGeometry(page, pageNumber - 1));

      _post({
        type: "progress",
        pagesScanned: pageNumber - firstPage + 1,
        totalPages: pageCountToScan,
      });
    }

    // The text-layer check runs on collected geometry rather than per page,
    // because a document is only unusable when EVERY page is a scan.
    const textLayer = detectTextLayer(pages);
    if (textLayer.status === "no_text_layer") {
      _post({
        type: "error",
        reason: "no_text_layer",
        message:
          "This PDF has no text layer. It looks like a scan or photo of a " +
          "document, and we can only extract data from PDFs that contain " +
          "real text. Try re-exporting from the original source, or run OCR " +
          "first. OCR support is planned.",
        detail: {
          scannedPageCount: textLayer.scannedPageCount,
          totalPageCount: textLayer.totalPageCount,
        },
      });
      _close();
      return;
    }
    if (textLayer.status === "unreliable_text") {
      _post({
        type: "error",
        reason: "unreliable_text",
        message:
          "This PDF's text cannot be read reliably. Its embedded fonts do " +
          "not map cleanly to characters, so extracted values would be " +
          "garbled. Try re-exporting it from the original source.",
        detail: { unmappedCharRatio: textLayer.unmappedCharRatio },
      });
      _close();
      return;
    }

    _post({ type: "result", pageCount: doc.numPages, pages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isPasswordError = /password/i.test(message);
    _post({
      type: "error",
      reason: isPasswordError ? "password_required" : "unknown",
      message:
        isPasswordError ?
          "This PDF is password protected. Enter its password to continue."
        : message,
    });
  } finally {
    _close();
  }
});
```

Note there is **no `no_tables_found`**. A PDF with no tables is not a broken
PDF, and in the two documents driving this feature it is the normal case.

- [ ] **Step 2: Write the main-thread driver**

Create `src/clients/datasets/pdfSniff.ts`:

```ts
// eslint-disable-next-line import-x/extensions
import PdfSniffWorker from "@/workers/pdfSniff.worker.ts?worker";
import type {
  PdfSniffError,
  PdfSniffProgress,
  PdfSniffResult,
} from "@/workers/pdfSniff.worker";

/**
 * Thrown when the worker rejects a document for a specific, explainable
 * reason. Carries the machine-readable code so the import form can render the
 * right guidance rather than a generic failure.
 */
export class PdfSniffRejection extends Error {
  readonly reason: PdfSniffError["reason"];
  readonly detail: Record<string, unknown> | undefined;

  constructor(error: PdfSniffError) {
    super(error.message);
    this.name = "PdfSniffRejection";
    this.reason = error.reason;
    this.detail = error.detail;
  }
}

/**
 * Main-thread driver for the PDF sniff worker. Owns one worker per call,
 * spawns it, awaits the result, and terminates. Mirrors `sniffXlsxFile`.
 *
 * The worker self-closes after replying, so the `terminate()` here is a
 * defensive fallback for the error path.
 */
export async function sniffPdfFile(params: {
  file: File;
  pageRange?: readonly [number, number];
  password?: string;
  onProgress?: (progress: PdfSniffProgress) => void;
}): Promise<PdfSniffResult> {
  const worker = new PdfSniffWorker();
  try {
    return await new Promise<PdfSniffResult>((resolve, reject) => {
      worker.addEventListener(
        "message",
        (
          event: MessageEvent<
            PdfSniffResult | PdfSniffProgress | PdfSniffError
          >,
        ) => {
          const data = event.data;
          if (data.type === "progress") {
            params.onProgress?.(data);
            return;
          }
          if (data.type === "result") {
            resolve(data);
            return;
          }
          reject(new PdfSniffRejection(data));
        },
      );
      worker.addEventListener(
        "error",
        (event) => {
          reject(new Error(event.message || "PDF sniff worker errored"));
        },
        { once: true },
      );
      worker.postMessage({
        type: "sniff",
        file: params.file,
        pageRange: params.pageRange,
        password: params.password,
      });
    });
  } finally {
    worker.terminate();
  }
}
```

Note the progress listener is **not** `{ once: true }`, unlike the XLSX driver,
because progress messages arrive repeatedly before the result.

- [ ] **Step 3: Verify**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/workers/pdfSniff.worker.ts src/clients/datasets/pdfSniff.ts
git commit -m "feat: add pdf geometry worker and main-thread driver"
```

---

## Task 10: Type the extracted table through DuckDB

**Files:**
- Create: `src/clients/datasets/pdfTableToColumns.ts`
- Create: `src/clients/datasets/pdfTableToColumns.test.ts`

Rather than writing a second type-inference engine, serialise the extracted
table to CSV in memory and hand it to the sniffer CSV import already uses. A
number then behaves identically whether it arrived by CSV or by PDF.

- [ ] **Step 1: Write the failing test**

Create `src/clients/datasets/pdfTableToColumns.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pdfTableToCsv } from "./pdfTableToColumns";

describe("pdfTableToCsv", () => {
  it("uses the header rows as column names", () => {
    const csv = pdfTableToCsv({
      cells: [
        ["District", "Cases"],
        ["Gao", "1204"],
      ],
      headerRows: 1,
    });

    expect(csv).toBe("District,Cases\nGao,1204");
  });

  it("flattens spanning headers with a space", () => {
    // "2024" over "Q1" becomes "2024 Q1", which keeps the year that the
    // bottom row alone would lose.
    const csv = pdfTableToCsv({
      cells: [
        ["", "2024", "2024", "2025", "2025"],
        ["Region", "Q1", "Q2", "Q1", "Q2"],
        ["Gao", "1", "2", "3", "4"],
      ],
      headerRows: 2,
    });

    expect(csv.split("\n")[0]).toBe("Region,2024 Q1,2024 Q2,2025 Q1,2025 Q2");
  });

  it("quotes values containing a comma", () => {
    const csv = pdfTableToCsv({
      cells: [
        ["Name", "Note"],
        ["Gao", "big, busy"],
      ],
      headerRows: 1,
    });

    expect(csv).toBe('Name,Note\nGao,"big, busy"');
  });

  it("escapes embedded quotes", () => {
    const csv = pdfTableToCsv({
      cells: [
        ["Name"],
        ['He said "hi"'],
      ],
      headerRows: 1,
    });

    expect(csv).toBe('Name\n"He said ""hi"""');
  });

  it("disambiguates duplicate column names", () => {
    // A bottom-row-only header of Q1, Q2, Q1, Q2 would otherwise produce a
    // table with two columns of the same name.
    const csv = pdfTableToCsv({
      cells: [
        ["Q1", "Q2", "Q1"],
        ["1", "2", "3"],
      ],
      headerRows: 1,
    });

    expect(csv.split("\n")[0]).toBe("Q1,Q2,Q1_2");
  });

  it("names a blank header column by position", () => {
    const csv = pdfTableToCsv({
      cells: [
        ["", "Cases"],
        ["Gao", "1204"],
      ],
      headerRows: 1,
    });

    expect(csv.split("\n")[0]).toBe("column_1,Cases");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/clients/datasets/pdfTableToColumns.test.ts`
Expected: FAIL, cannot resolve `./pdfTableToColumns`.

- [ ] **Step 3: Write the implementation**

Create `src/clients/datasets/pdfTableToColumns.ts`:

```ts
/**
 * Serialises an extracted PDF table to CSV text so DuckDB's existing
 * `sniff_csv` can decide the column types.
 *
 * Writing our own type inference would mean maintaining a second engine that
 * slowly drifts from the one CSV import uses, so that the same number
 * imported two ways ends up with two different types. Round-tripping through
 * CSV costs one serialise and buys inference that is already correct.
 */
function _escapeCsvValue(value: string): string {
  if (!/[",\n]/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/gu, '""')}"`;
}

/**
 * Flattens however many header rows into one name per column.
 *
 * A spanning header writes the year once above four quarter columns, so the
 * bottom row alone would give four columns called Q1, Q2, Q1, Q2 with the
 * year lost entirely. Joining the stack preserves it.
 */
function _buildColumnNames(
  headerRows: ReadonlyArray<readonly string[]>,
  columnCount: number,
): string[] {
  const names = Array.from({ length: columnCount }, (_, columnIndex) => {
    const parts = headerRows
      .map((row) => {
        return row[columnIndex] ?? "";
      })
      .filter((part) => {
        return part !== "";
      });

    // A spanning header repeats its value across the columns it covers, so
    // strip consecutive duplicates before joining.
    const deduped = parts.filter((part, index) => {
      return part !== parts[index - 1];
    });

    const joined = deduped.join(" ").trim();
    return joined === "" ? `column_${columnIndex + 1}` : joined;
  });

  // Disambiguate duplicates. Two columns with the same name is not
  // representable in a dataset schema.
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return count === 0 ? name : `${name}_${count + 1}`;
  });
}

/** Serialises the table, header included, as CSV text. */
export function pdfTableToCsv(table: {
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
}): string {
  const columnCount = table.cells[0]?.length ?? 0;
  const headerRows = table.cells.slice(0, table.headerRows);
  const dataRows = table.cells.slice(table.headerRows);

  const columnNames = _buildColumnNames(headerRows, columnCount);

  const lines = [
    columnNames.map(_escapeCsvValue).join(","),
    ...dataRows.map((row) => {
      return Array.from({ length: columnCount }, (_, i) => {
        return _escapeCsvValue(row[i] ?? "");
      }).join(",");
    }),
  ];

  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/clients/datasets/pdfTableToColumns.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/clients/datasets/pdfTableToColumns.ts src/clients/datasets/pdfTableToColumns.test.ts
git commit -m "feat: serialise extracted pdf tables to csv for duckdb typing"
```

---

## Task 11: Compute the drift fingerprint

**Files:**
- Create: `src/clients/datasets/pdfTableFingerprint.ts`
- Create: `src/clients/datasets/pdfTableFingerprint.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/clients/datasets/pdfTableFingerprint.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  computePdfTableFingerprint,
  fingerprintsMatch,
} from "./pdfTableFingerprint";

const TABLE = {
  cells: [
    ["District", "Cases"],
    ["Gao", "1204"],
    ["Mopti", "987"],
  ],
  headerRows: 1,
};

describe("computePdfTableFingerprint", () => {
  it("records the headers and shape", async () => {
    const fingerprint = await computePdfTableFingerprint(TABLE);

    expect(fingerprint.headers).toEqual(["District", "Cases"]);
    expect(fingerprint.shape).toEqual([2, 2]);
    expect(fingerprint.hash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("is stable across calls", async () => {
    const a = await computePdfTableFingerprint(TABLE);
    const b = await computePdfTableFingerprint(TABLE);

    expect(a.hash).toBe(b.hash);
  });

  it("changes when a value changes", async () => {
    const a = await computePdfTableFingerprint(TABLE);
    const b = await computePdfTableFingerprint({
      ...TABLE,
      cells: [["District", "Cases"], ["Gao", "9999"], ["Mopti", "987"]],
    });

    expect(a.hash).not.toBe(b.hash);
  });
});

describe("fingerprintsMatch", () => {
  it("matches a fingerprint against itself", async () => {
    const fingerprint = await computePdfTableFingerprint(TABLE);
    expect(fingerprintsMatch(fingerprint, fingerprint)).toBe(true);
  });

  it("reports a mismatch when the headers change", async () => {
    // This is the drift the whole mechanism exists to catch: a re-parse
    // resolving the same geometry to a different table.
    const original = await computePdfTableFingerprint(TABLE);
    const drifted = await computePdfTableFingerprint({
      cells: [["Region", "Total"], ["Gao", "1204"], ["Mopti", "987"]],
      headerRows: 1,
    });

    expect(fingerprintsMatch(original, drifted)).toBe(false);
  });

  it("reports a mismatch when the row count changes", async () => {
    const original = await computePdfTableFingerprint(TABLE);
    const truncated = await computePdfTableFingerprint({
      cells: [["District", "Cases"], ["Gao", "1204"]],
      headerRows: 1,
    });

    expect(fingerprintsMatch(original, truncated)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/clients/datasets/pdfTableFingerprint.test.ts`
Expected: FAIL, cannot resolve `./pdfTableFingerprint`.

- [ ] **Step 3: Write the implementation**

Create `src/clients/datasets/pdfTableFingerprint.ts`:

```ts
import type { PdfTableFingerprint } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

async function _sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

/**
 * Snapshots what a table contained at import time.
 *
 * Geometry alone makes a re-parse reproducible against detector changes, but
 * it cannot tell us that the geometry now resolves to something different,
 * which is what happens when a document is revised or our cell assignment
 * shifts. The fingerprint is the only mechanism that can actually notice
 * drift rather than silently importing different data under the same name.
 */
export async function computePdfTableFingerprint(table: {
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
}): Promise<PdfTableFingerprint> {
  const headerRow = table.cells[table.headerRows - 1] ?? [];
  const dataRows = table.cells.slice(table.headerRows);

  const hash = await _sha256Hex(
    JSON.stringify({ cells: table.cells, headerRows: table.headerRows }),
  );

  return {
    headers: [...headerRow],
    shape: [dataRows.length, table.cells[0]?.length ?? 0],
    hash,
  };
}

/**
 * True when a freshly extracted table is the same as the one originally
 * imported. A false result should warn the user and ask for confirmation,
 * never silently replace their data.
 */
export function fingerprintsMatch(
  original: PdfTableFingerprint,
  fresh: PdfTableFingerprint,
): boolean {
  return original.hash === fresh.hash;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/clients/datasets/pdfTableFingerprint.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/clients/datasets/pdfTableFingerprint.ts src/clients/datasets/pdfTableFingerprint.test.ts
git commit -m "feat: fingerprint extracted pdf tables to detect drift"
```

---

## Task 12: The page preview canvas

**Files:**
- Create: `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfPagePreview.tsx`

Renders one page to a canvas with the detected bounding box drawn over it.
Without this, "this PDF has 4 tables" is a list of numbers the user has no way
to verify, and a medium-confidence stream detection is an unverifiable guess.

- [ ] **Step 1: Write the component**

Create `PdfPagePreview.tsx`:

```tsx
import { Box, Loader, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { BBox } from "@/workers/pdfSniff/types";

type Props = {
  file: File;
  /** Zero-based. */
  pageIndex: number;
  /** Drawn over the rendered page, in PDF points. */
  highlight: BBox | undefined;
  /** Rendered width in CSS pixels; height follows the page aspect ratio. */
  width?: number;
};

/**
 * Renders a single PDF page to a canvas and outlines the detected table.
 *
 * pdf.js is imported dynamically so its bundle only loads when a user
 * actually opens a PDF, rather than on every visit to the data manager.
 */
export function PdfPagePreview({
  file,
  pageIndex,
  highlight,
  width = 320,
}: Readonly<Props>): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let isCancelled = false;

    const render = async (): Promise<void> => {
      setStatus("loading");
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "";

        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjs.getDocument({
          data: bytes,
          useWorkerFetch: false,
          isEvalSupported: false,
        }).promise;

        const page = await doc.getPage(pageIndex + 1);
        const unscaled = page.getViewport({ scale: 1, rotation: page.rotate });
        const scale = width / unscaled.width;
        const viewport = page.getViewport({ scale, rotation: page.rotate });

        const canvas = canvasRef.current;
        if (isCancelled || !canvas) {
          await doc.destroy();
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) {
          await doc.destroy();
          return;
        }

        await page.render({ canvasContext: context, viewport }).promise;

        if (highlight) {
          // PDF y grows upward, canvas y grows downward, so the box has to
          // be flipped as well as scaled.
          const [x0, y0, x1, y1] = highlight;
          context.save();
          context.strokeStyle = "rgba(34, 139, 230, 0.9)";
          context.fillStyle = "rgba(34, 139, 230, 0.15)";
          context.lineWidth = 2;
          const boxX = x0 * scale;
          const boxY = canvas.height - y1 * scale;
          const boxWidth = (x1 - x0) * scale;
          const boxHeight = (y1 - y0) * scale;
          context.fillRect(boxX, boxY, boxWidth, boxHeight);
          context.strokeRect(boxX, boxY, boxWidth, boxHeight);
          context.restore();
        }

        await doc.destroy();
        if (!isCancelled) {
          setStatus("ready");
        }
      } catch {
        if (!isCancelled) {
          setStatus("error");
        }
      }
    };

    void render();

    return () => {
      isCancelled = true;
    };
  }, [file, pageIndex, highlight, width]);

  return (
    <Box pos="relative" w={width}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "auto" }} />
      {status === "loading" && <Loader size="sm" pos="absolute" top={8} left={8} />}
      {status === "error" && (
        <Text size="xs" c="dimmed">
          Could not render this page.
        </Text>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm type-check && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/
git commit -m "feat: render pdf page previews with detected table outlines"
```

---

## Task 13: Wire PDF into the import flow with a needs-selection state

**Files:**
- Modify: `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx:36-60,179-187`
- Modify: `src/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts`
- Modify: `src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types.ts`
- Modify: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.ts`
- Modify: `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.ts`
- Modify: `src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetPreview.tsx`

**Rewritten.** The original plan's wiring task assumed the sniff returned a
selected table with columns and rows. It cannot: at the end of this phase a PDF
has geometry and nothing else.

That is the point of the task. CSV and XLSX have rows the instant they are
sniffed; a PDF has none until a region exists. Getting the form to treat that
as a **normal intermediate state** rather than a parse failure is what lets
Phase B2 add extraction without fighting the UI.

- [ ] **Step 1: Accept PDFs**

In `ManualUploadView.tsx`, change `_fileMimeTypeToSourceType`'s return type to
`"csv_file" | "xlsx_file" | "pdf_file"` and add this branch before the final
throw:

```ts
  // Check for PDF MIME type or extension
  if (file.type === MIMEType.APPLICATION_PDF || lowerFileName.endsWith(".pdf")) {
    return "pdf_file";
  }
```

Add `APPLICATION_PDF` to the `MIMEType` enum if it is not already present, and
add `MIMEType.APPLICATION_PDF` to the `accept` array around line 179.

- [ ] **Step 2: Add the parse options type**

In `useSaveDataset.ts`, add alongside `XlsxParseOptions`:

```ts
export type PdfParseOptions = {
  type: "pdf_file";
  /**
   * Regions the user has chosen to extract. Empty until they pick one, which
   * is the normal state immediately after upload.
   */
  regions?: readonly PdfRegion[];
  /** Inclusive, one-based page range the user limited reading to. */
  pageRange?: readonly [number, number];
  outputMode?: "natural" | "observations";
};
```

and add it to the `FileParseOptions` union. `PdfRegion` is defined in Task 2's
types file; import it from `@/workers/pdfSniff/types`.

- [ ] **Step 3: Add the load result and metadata types**

In `useLoadManualUploadFile.ts`, add:

```ts
export type PdfFileLoadResult = BaseLoadResult & {
  pageCount: number;
  /** Geometry for the pages read, so the picker can render and clip them. */
  pages: readonly PageGeometry[];
  /**
   * `needs_selection` means the document parsed fine and is waiting for the
   * user to choose a region. It is NOT an error, and the form must not treat
   * it as one.
   */
  status: "needs_selection" | "extracted";
  columns: DuckDbColumnSchema[];
};
```

In `DatasetImportForm.types.ts`, add:

```ts
export type PdfDataSourceMetadata = {
  sourceType: "pdf_file";
  onlineStorageAllowed: boolean;
  sizeInBytes: number;
  datasetLoadResult: PdfFileLoadResult;
  parseOptions: PdfParseOptions;
};
```

Add `PdfDataSourceMetadata` to both `ManualUploadDataSourceMetadata` and
`DataSourceMetadata`, and import `PdfFileLoadResult` and `PdfParseOptions`
alongside the existing imports.

- [ ] **Step 4: Add `startPdfImport` to `LocalDatasetClient`**

In `LocalDatasetClient.ts`, add a mutation that stores the PDF as **pinned**
source bytes and starts no transcode, because there is nothing to transcode
until a region is chosen:

```ts
function _makeStartPdfImport(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["startPdfImport"] {
  return async (params) => {
    const logger = context.logger.appendName("startPdfImport");
    logger.log("Storing PDF and reading geometry", {
      datasetId: params.datasetId,
      size: params.file.size,
    });

    const sniff = await sniffPdfFile({
      file: params.file,
      pageRange: params.parseOptions.pageRange,
    });

    // Pinned, not cached. For CSV and XLSX the original is a short-lived
    // resume cache; for PDF it is the only copy of data extraction is lossy
    // against, so it must survive LRU eviction and the post-transcode clear.
    // See AVA-317 and Phase A's retention work.
    await _putParsingDataset({
      ...params,
      sourceFileType: "pdf",
      parseOptions: { type: "pdf", regions: [], pageRange: params.parseOptions.pageRange },
    });

    return sniff;
  };
}
```

Register it in the mutation record beside `startXlsxImport`, add its signature
to `LocalDatasetMutationRecord`, and add `"startPdfImport"` to the mutation
name list around line 467.

- [ ] **Step 5: Add the pdf branch to the loader**

In `useLoadManualUploadFile.ts`, add a `.with({ type: "pdf_file" }, ...)` arm to
the mutation's `match`, before `.exhaustive()`:

```ts
        .with({ type: "pdf_file" }, async (pdfParseOptions) => {
          const { datasetId, pageRange } = pdfParseOptions;
          const sniff = await LocalDatasetClient.startPdfImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            parseOptions: { pageRange },
          });

          // No regions yet, so no rows yet. This is the expected state
          // immediately after upload, not a failure.
          const loadResult: PdfFileLoadResult = {
            datasetId,
            numRows: 0,
            pageCount: sniff.pageCount,
            pages: sniff.pages,
            status: "needs_selection",
            columns: [],
          };
          pendingPreviewRowsRef.value = [];
          return loadResult;
        })
```

Add a `_buildDataSourceMetadataFromLoadResult` arm mirroring the XLSX one, and
the corresponding imports.

- [ ] **Step 6: Write the failing test for the empty-preview state**

Create
`src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetPreview.pdf.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatasetPreview } from "./DatasetPreview";

describe("DatasetPreview for a PDF awaiting selection", () => {
  it("asks for a region instead of reporting an empty dataset", () => {
    render(
      <DatasetPreview
        columns={[]}
        previewRows={[]}
        sourceType="pdf_file"
        pdfStatus="needs_selection"
      />,
    );

    expect(
      screen.getByText(/select a region .* to see data/i),
    ).toBeInTheDocument();
    // The generic empty state would be actively misleading here: it tells the
    // user their file contained nothing, when in fact they simply have not
    // chosen anything yet.
    expect(screen.queryByText(/no rows/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetPreview.pdf.test.tsx`
Expected: FAIL, `pdfStatus` is not a prop / text not found.

- [ ] **Step 8: Implement the empty-preview state**

In `DatasetPreview.tsx`, add the optional props and an early return before the
existing empty-state branch:

```tsx
  if (sourceType === "pdf_file" && pdfStatus === "needs_selection") {
    return (
      <Alert variant="light" color="blue" title="No region selected yet">
        <Text size="sm">
          Select a region on the page to see data. Draw a box around a table,
          chart or block of text, or highlight a sentence.
        </Text>
      </Alert>
    );
  }
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportFeedback/DatasetPreview.pdf.test.tsx`
Expected: PASS.

- [ ] **Step 10: Disable save while a PDF has no regions**

In `useDatasetImportValidation.ts`, add to the validation result:

```ts
  const isPdfAwaitingSelection =
    dataSourceMetadata.sourceType === "pdf_file" &&
    dataSourceMetadata.datasetLoadResult.status === "needs_selection";
```

and include `!isPdfAwaitingSelection` in whatever the hook returns as the
"can save" condition, so the button is disabled rather than saving an empty
dataset.

- [ ] **Step 11: Verify**

Run: `pnpm type-check && pnpm lint && pnpm vitest run src/views/DataManagerApp/`
Expected: all pass. In particular `_saveDatasetFromValues`'s exhaustive `match`
must now compile with the `pdf_file` arm present; if it does not, add an arm
that throws `new Error("Select a region before saving")` for the
`needs_selection` case. Phase B2 replaces that arm with the real save.

- [ ] **Step 12: Commit**

```bash
git add src/views/DataManagerApp/ src/clients/datasets/ src/lib/
git commit -m "feat: accept pdf uploads and hold them in a needs-selection state"
```

---

## Task 14: Full verification

- [ ] **Step 1: Full suite**

```bash
pnpm type-check
pnpm lint
pnpm test --quick
```

Expected: all pass.

- [ ] **Step 2: Check the bundle cost**

```bash
pnpm build
```

Inspect the output for the pdf.js chunk. It must be a **separate lazy chunk**,
not part of the main entry, because `PdfPagePreview` imports it dynamically and
the worker is its own bundle. If pdfjs appears in the main chunk, find the
static import that pulled it in and make it dynamic.

- [ ] **Step 3: Manual verification against real files**

**Done as an E2E test instead, and it was worth it.** This repo already has a
Playwright suite with auth and workspace fixtures, so case 1 below became
`tests/e2e/pdf-import.spec.ts` rather than a one-off click-through: a real
Chromium upload of the 10-page tagged fixture, asserting the "No region
selected yet" alert, the *absence* of the "Data processing failed" and "No rows
were read successfully" strings, a disabled save button, and no uncaught page
errors.

Running it for real caught a fully blocking bug that every unit test missed:
**no PDF could be imported in a browser at all.** Inside the sniff worker,
`loadPdfJs` imports `pdf.worker.mjs`, which makes pdf.js install its own
handler on the same worker global and post its internal protocol traffic
(starting with `{ action: "ready" }`) to the main thread. `sniffPdfFile`
treated every message that was not `progress` or `result` as a rejection, so
that first pdf.js message rejected the promise with an empty error. Under jsdom
the worker-context branch never runs and there is no shared port, so unit tests
could not see it. Fixed with a `_isPdfSniffResponse` guard mirroring the one
the worker side already had.

The lesson generalises to B2 and B3: **anything involving the worker port needs
at least one real-browser test.** jsdom cannot model it.

Cases 2 and 3 remain unverified and are carried forward:

2. A password-protected PDF. Expected: the password-required message, not a
   generic failure. Needs a password-protected fixture, which the repo does not
   have.
3. A document over 50 pages. Expected: the `too_many_pages` message asking for
   a page range. The tagged fixture is 10 pages; the largest committed fixture
   is 17.

**Environment gotcha when running the E2E suite here:** `playwright.config.ts`
reuses an existing dev server, and a vite server from another worktree may be
squatting port 5173 while pointing at a different Supabase, which fails sign-in
with "Invalid login credentials". Run with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5199`
(or any free port) so Playwright starts vite from this worktree.

- [ ] **Step 4: Confirm the original PDF is retained**

In DevTools, open Application, IndexedDB, `AvaDexie`, `LocalDataset`. Find the
row for the dataset id from step 3.1 and confirm `sourceBytes` is present and
the row is marked pinned. This is the Phase A retention mechanism doing its
job; if the bytes are missing, extraction in Phase B2 has nothing to re-read.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify pdf extraction foundation"
```

---

## Self-review notes

**Spec coverage.** Every foundation requirement in
`2026-08-18-pdf-region-extraction-design.md` maps to a task: the module layout
to Tasks 1 to 9; `assembleWords` and `groupLines` being lifted forward to Tasks
7 and 8; the region and `ExtractedTable` interfaces to Task 3; value
normalisation and DuckDB typing to Tasks 4 and 10; the drift fingerprint to
Task 11; the page canvas to Task 12; and the `needs-selection` state, which the
spec calls out as the one structural difference from CSV and XLSX, to Task 13.

**What this phase deliberately does not do.** It produces no rows. A PDF
imported at the end of B1 is accepted, stored, rendered and readable, and the
save button is disabled. That is the correct end state: Phase B2 turns geometry
into data.

**Carried forward, not dropped:**

- The scanned-PDF guard is implemented (Task 6) but has no fixture to prove it
  against until Phase B3 generates one. Its unit tests use synthetic geometry.
- `PdfPagePreview` renders a single highlight. Phase B2 extends it to several
  highlights plus drawing interaction.
- The tagged structure tree is fetched but unused until Phase B3.

---
