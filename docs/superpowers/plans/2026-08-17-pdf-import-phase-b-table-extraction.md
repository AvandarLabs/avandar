# PDF Import Phase B: Table Detection and Import UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect tables in a born-digital PDF entirely in the browser, show them outlined over rendered page previews, and import the selected one as a dataset.

**Architecture:** A web worker running pdf.js normalises each page into text items and path segments, then three independent detectors (tagged structure tree, ruling lines, whitespace clustering) propose candidate tables. Candidates are deduplicated by bounding-box overlap, merged across page spans, scored for confidence, and returned to the import form. Cell values are normalised for PDF-specific noise and then typed by DuckDB's existing CSV sniffer.

**Tech Stack:** TypeScript, pdfjs-dist, Web Workers, DuckDB-WASM, React, Mantine, Vitest.

---

## Prerequisites

**Phase A must be complete.** This plan assumes `pdf_file` exists in
`datasets__source_type`, the `datasets__pdf_file` table and model exist, and
the original-file retention mechanism works. See
`2026-08-17-pdf-import-phase-a-source-type-and-retention.md`.

Read `docs/superpowers/specs/2026-08-17-pdf-import-design.md` first.

## Background an engineer new to this codebase needs

**The two-phase import pipeline.** Manual uploads run a fast **sniff phase**
that returns column names and roughly 200 preview rows so the import form can
render immediately, then a **background parquet transcode** that does the real
work and writes the parquet into IndexedDB. `useLoadManualUploadFile` awaits
only the sniff. See `src/views/DataManagerApp/DataImportView/ManualUploadView/`.

**Why PDF maps onto the XLSX path.** An XLSX file contains several sheets, of
which the user picks one; changing the pick re-parses. A PDF contains several
detected tables with exactly the same relationship. Copy `xlsxSniff.worker.ts`
and `sniffXlsxFile` as the model for the new worker and its driver.

**pdf.js coordinate system.** Origin is bottom-left, units are points (1/72
inch). `getTextContent()` returns items whose `transform` is a 6-element matrix
`[a, b, c, d, e, f]` where `e` and `f` are the x and y translation. Items come
back in **content-stream order, which is not visual order**, so everything must
be sorted geometrically.

**A warning about `str` items.** Some generators emit one text item per glyph
with no space characters at all. Word boundaries then have to be inferred from
x-gaps relative to font size. Fixture
`plos-one-ncd-mobile-phone-surveys.pdf` exercises this.

## Test fixtures

Three real CC BY papers live in `public/test-data/pdf/` with attribution and
per-file notes in that directory's README. Read it before writing detector
tests. Summary of what each proves:

| Fixture | Tagged | Proves |
|---|---|---|
| `frontiers-peru-child-health-insurance.pdf` | yes | Structure tree path, multi-page continuation, two tables side by side on one page, wrapped header cells, Unicode minus |
| `plos-one-online-research-data-quality.pdf` | no | Untagged multi-page continuation |
| `plos-one-ncd-mobile-phone-surveys.pdf` | no | Four-level spanning headers, `n (%)` values, dashes as nulls, a real broken ToUnicode map |

## File structure

All detection code lives under `src/workers/pdfSniff/`, one file per
responsibility, so each is unit-testable against fixture JSON with no PDF in
the loop:

| File | Responsibility |
|---|---|
| `src/workers/pdfSniff.worker.ts` | Worker entry: orchestrate, post progress and result |
| `src/workers/pdfSniff/types.ts` | Shared geometry and candidate types |
| `src/workers/pdfSniff/extractPageGeometry.ts` | The only file that touches pdf.js |
| `src/workers/pdfSniff/detectTextLayer.ts` | Scanned-PDF guard |
| `src/workers/pdfSniff/normalizeCellValue.ts` | PDF-specific value cleanup |
| `src/workers/pdfSniff/detectTaggedTables.ts` | Signal A |
| `src/workers/pdfSniff/detectLatticeTables.ts` | Signal B |
| `src/workers/pdfSniff/detectStreamTables.ts` | Signal C |
| `src/workers/pdfSniff/dedupeCandidates.ts` | Cross-signal dedup |
| `src/workers/pdfSniff/mergePageSpans.ts` | Multi-page joining |
| `src/workers/pdfSniff/scoreCandidate.ts` | Confidence scoring |
| `src/clients/datasets/pdfSniff.ts` | Main-thread driver |

UI and wiring:

| File | Responsibility |
|---|---|
| `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfTablePicker.tsx` | Candidate list plus page preview |
| `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfPagePreview.tsx` | Canvas render with bbox overlay |

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
  cells: readonly (readonly string[])[];
};

/** A candidate after page-span merging and scoring. */
export type ScoredTable = {
  /** Page fragments in reading order. A single-page table has one. */
  fragments: readonly { pageIndex: number; bbox: BBox }[];
  detectionMode: PdfDetectionMode;
  gridX: readonly number[];
  gridY: readonly number[];
  cells: readonly (readonly string[])[];
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

## Task 3: Normalise cell values

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

## Task 4: Extract page geometry from pdf.js

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
const UNMAPPED_CHAR = /[-�]/gu;

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

## Task 5: The scanned-PDF guard

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

## Task 6: Lattice detection from ruling lines

**Files:**
- Create: `src/workers/pdfSniff/detectLatticeTables.ts`
- Create: `src/workers/pdfSniff/detectLatticeTables.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/detectLatticeTables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectLatticeTables } from "./detectLatticeTables";
import type { PageGeometry, RuleSegment, TextItem } from "./types";

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

function hRule(y: number, x0: number, x1: number): RuleSegment {
  return { orientation: "horizontal", position: y, span: [x0, x1] };
}

function vRule(x: number, y0: number, y1: number): RuleSegment {
  return { orientation: "vertical", position: x, span: [y0, y1] };
}

/**
 * A 2-column, 2-row fully ruled grid spanning x 100-300, y 500-560,
 * with row boundaries at y 560, 530, 500 and column boundaries at x 100,
 * 200, 300.
 */
function fullyRuledPage(): PageGeometry {
  return {
    pageIndex: 0,
    width: 595,
    height: 842,
    looksScanned: false,
    rules: [
      hRule(560, 100, 300),
      hRule(530, 100, 300),
      hRule(500, 100, 300),
      vRule(100, 500, 560),
      vRule(200, 500, 560),
      vRule(300, 500, 560),
    ],
    textItems: [
      textItem("District", 110, 540),
      textItem("Cases", 210, 540),
      textItem("Gao", 110, 510),
      textItem("1204", 210, 510),
    ],
  };
}

describe("detectLatticeTables", () => {
  it("builds a grid from a fully ruled table", () => {
    const [table, ...rest] = detectLatticeTables(fullyRuledPage());

    expect(rest).toHaveLength(0);
    expect(table).toBeDefined();
    expect(table!.detectionMode).toBe("lattice");
    expect(table!.gridX).toEqual([100, 200, 300]);
    expect(table!.gridY).toEqual([560, 530, 500]);
    expect(table!.cells).toEqual([
      ["District", "Cases"],
      ["Gao", "1204"],
    ]);
  });

  it("assigns each text item to the cell containing it", () => {
    const [table] = detectLatticeTables(fullyRuledPage());
    expect(table!.cells[1]![0]).toBe("Gao");
    expect(table!.cells[1]![1]).toBe("1204");
  });

  it("snaps rules that are within tolerance of each other", () => {
    // Generators emit rules at slightly different coordinates for what is
    // visually one line. Without snapping, a 3-column table becomes a
    // 6-column one with empty alternating columns.
    const page = fullyRuledPage();
    const jittered: PageGeometry = {
      ...page,
      rules: [
        hRule(560, 100, 300),
        hRule(560.4, 100, 300),
        hRule(530, 100, 300),
        hRule(500, 100, 300),
        vRule(100, 500, 560),
        vRule(200, 500, 560),
        vRule(200.3, 500, 560),
        vRule(300, 500, 560),
      ],
    };

    const [table] = detectLatticeTables(jittered);

    expect(table!.gridX).toHaveLength(3);
    expect(table!.gridY).toHaveLength(3);
  });

  it("returns nothing when there are too few rules to form a grid", () => {
    const page: PageGeometry = {
      ...fullyRuledPage(),
      rules: [hRule(560, 100, 300)],
    };

    expect(detectLatticeTables(page)).toEqual([]);
  });

  it("finds two separate tables on one page", () => {
    // Two tables side by side is exactly the case that makes naive column
    // detection merge unrelated data. See page 8 of the Frontiers fixture.
    const page: PageGeometry = {
      pageIndex: 0,
      width: 595,
      height: 842,
      looksScanned: false,
      rules: [
        hRule(560, 60, 260),
        hRule(530, 60, 260),
        vRule(60, 530, 560),
        vRule(160, 530, 560),
        vRule(260, 530, 560),
        hRule(560, 330, 530),
        hRule(530, 330, 530),
        vRule(330, 530, 560),
        vRule(430, 530, 560),
        vRule(530, 530, 560),
      ],
      textItems: [
        textItem("Left A", 70, 540),
        textItem("Left B", 170, 540),
        textItem("Right A", 340, 540),
        textItem("Right B", 440, 540),
      ],
    };

    const tables = detectLatticeTables(page);

    expect(tables).toHaveLength(2);
    expect(tables[0]!.cells[0]).toEqual(["Left A", "Left B"]);
    expect(tables[1]!.cells[0]).toEqual(["Right A", "Right B"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/detectLatticeTables.test.ts`
Expected: FAIL, cannot resolve `./detectLatticeTables`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/detectLatticeTables.ts`:

```ts
import { normalizeCellValue } from "./normalizeCellValue";
import type { BBox, CandidateTable, PageGeometry, RuleSegment } from "./types";

/**
 * Rules within this many points of each other are the same line. Generators
 * routinely emit a table's rules at marginally different coordinates;
 * without snapping, a 3-column table is read as 6 columns with empty
 * alternating cells.
 */
const SNAP_TOLERANCE = 2;

/** A grid needs at least two lines each way to enclose one cell. */
const MIN_GRID_LINES = 2;

/**
 * Collapses near-identical positions into one representative value, keeping
 * the mean of each cluster so the grid sits where the ink actually is.
 */
function _snapPositions(positions: readonly number[]): number[] {
  const sorted = [...positions].sort((a, b) => {
    return a - b;
  });
  const snapped: number[] = [];
  let cluster: number[] = [];

  for (const position of sorted) {
    const clusterHead = cluster[0];
    if (clusterHead === undefined || position - clusterHead <= SNAP_TOLERANCE) {
      cluster.push(position);
      continue;
    }
    snapped.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
    cluster = [position];
  }
  if (cluster.length > 0) {
    snapped.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
  }

  return snapped;
}

/**
 * Groups rules into connected regions, so two tables on one page produce two
 * grids rather than one grid spanning the gap between them. Two rules are
 * connected when their spans overlap along the shared axis.
 */
function _clusterRulesIntoRegions(
  rules: readonly RuleSegment[],
): RuleSegment[][] {
  const horizontal = rules.filter((r) => {
    return r.orientation === "horizontal";
  });
  const vertical = rules.filter((r) => {
    return r.orientation === "vertical";
  });

  const regions: RuleSegment[][] = [];

  for (const vRule of vertical) {
    const matchingRegion = regions.find((region) => {
      return region.some((existing) => {
        return (
          existing.orientation === "vertical" &&
          Math.abs(existing.position - vRule.position) < 400 &&
          existing.span[0] <= vRule.span[1] &&
          vRule.span[0] <= existing.span[1]
        );
      });
    });
    if (matchingRegion) {
      matchingRegion.push(vRule);
    } else {
      regions.push([vRule]);
    }
  }

  // Attach each horizontal rule to every region whose vertical rules it
  // actually crosses. A rule spanning both tables would otherwise glue them
  // together.
  for (const hRule of horizontal) {
    for (const region of regions) {
      const crossesRegion = region.some((existing) => {
        return (
          existing.orientation === "vertical" &&
          existing.position >= hRule.span[0] - SNAP_TOLERANCE &&
          existing.position <= hRule.span[1] + SNAP_TOLERANCE &&
          existing.span[0] <= hRule.position + SNAP_TOLERANCE &&
          hRule.position <= existing.span[1] + SNAP_TOLERANCE
        );
      });
      if (crossesRegion) {
        region.push(hRule);
      }
    }
  }

  return regions;
}

function _buildTable(
  page: PageGeometry,
  regionRules: readonly RuleSegment[],
): CandidateTable | undefined {
  const gridX = _snapPositions(
    regionRules
      .filter((r) => {
        return r.orientation === "vertical";
      })
      .map((r) => {
        return r.position;
      }),
  );
  // Row boundaries descend down the page, and y grows upward in PDF space,
  // so the grid reads top to bottom when sorted descending.
  const gridY = _snapPositions(
    regionRules
      .filter((r) => {
        return r.orientation === "horizontal";
      })
      .map((r) => {
        return r.position;
      }),
  ).reverse();

  if (gridX.length < MIN_GRID_LINES || gridY.length < MIN_GRID_LINES) {
    return undefined;
  }

  const bbox: BBox = [
    gridX[0]!,
    gridY[gridY.length - 1]!,
    gridX[gridX.length - 1]!,
    gridY[0]!,
  ];

  const rowCount = gridY.length - 1;
  const columnCount = gridX.length - 1;
  const cells: string[][] = Array.from({ length: rowCount }, () => {
    return Array.from({ length: columnCount }, () => {
      return "";
    });
  });

  for (const item of page.textItems) {
    const columnIndex = gridX.findIndex((boundary, index) => {
      const next = gridX[index + 1];
      return next !== undefined && item.x >= boundary && item.x < next;
    });
    const rowIndex = gridY.findIndex((boundary, index) => {
      const next = gridY[index + 1];
      return next !== undefined && item.y <= boundary && item.y > next;
    });

    if (columnIndex < 0 || rowIndex < 0) {
      continue;
    }
    const existing = cells[rowIndex]![columnIndex]!;
    // Text wrapping inside a cell arrives as several items. Joining with a
    // space reassembles the cell rather than inventing extra rows.
    cells[rowIndex]![columnIndex] =
      existing === "" ? item.text : `${existing} ${item.text}`;
  }

  return {
    pageIndex: page.pageIndex,
    bbox,
    detectionMode: "lattice",
    gridX,
    gridY,
    cells: cells.map((row) => {
      return row.map(normalizeCellValue);
    }),
  };
}

/**
 * Finds tables by reading the ruling lines the generator drew.
 *
 * This is Camelot's lattice mode without the raster round-trip. Camelot
 * rasterizes the page and runs OpenCV morphology to rediscover lines that
 * were vector geometry to begin with; we read that geometry directly, which
 * is both more accurate and free of any image dependency.
 */
export function detectLatticeTables(
  page: PageGeometry,
): readonly CandidateTable[] {
  return _clusterRulesIntoRegions(page.rules)
    .map((regionRules) => {
      return _buildTable(page, regionRules);
    })
    .filter((table): table is CandidateTable => {
      return table !== undefined;
    })
    .sort((a, b) => {
      return a.bbox[0] - b.bbox[0];
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/detectLatticeTables.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: detect ruled pdf tables from content-stream geometry"
```

---

## Task 7: Tagged structure tree detection

**Files:**
- Create: `src/workers/pdfSniff/detectTaggedTables.ts`
- Create: `src/workers/pdfSniff/detectTaggedTables.test.ts`

Signal A, and the only one that is ground truth rather than inference. It runs
first and its results outrank the others during dedup.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/detectTaggedTables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectTaggedTables } from "./detectTaggedTables";
import type { StructTreeNode } from "./detectTaggedTables";
import type { PageGeometry, TextItem } from "./types";

function textItem(text: string, x: number, y: number, id: string): TextItem & {
  id: string;
} {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
    id,
  };
}

const PAGE: PageGeometry = {
  pageIndex: 0,
  width: 595,
  height: 842,
  looksScanned: false,
  rules: [],
  textItems: [
    textItem("District", 100, 540, "t1"),
    textItem("Cases", 200, 540, "t2"),
    textItem("Gao", 100, 510, "t3"),
    textItem("1204", 200, 510, "t4"),
  ],
};

/** A 2x2 table with a header row, in pdf.js's structure tree shape. */
const STRUCT_TREE: StructTreeNode = {
  role: "Document",
  children: [
    {
      role: "Table",
      children: [
        {
          role: "TR",
          children: [
            { role: "TH", children: [{ type: "content", id: "t1" }] },
            { role: "TH", children: [{ type: "content", id: "t2" }] },
          ],
        },
        {
          role: "TR",
          children: [
            { role: "TD", children: [{ type: "content", id: "t3" }] },
            { role: "TD", children: [{ type: "content", id: "t4" }] },
          ],
        },
      ],
    },
  ],
};

describe("detectTaggedTables", () => {
  it("reads the cell grid straight out of the structure tree", () => {
    const [table] = detectTaggedTables(PAGE, STRUCT_TREE, {
      t1: PAGE.textItems[0]!,
      t2: PAGE.textItems[1]!,
      t3: PAGE.textItems[2]!,
      t4: PAGE.textItems[3]!,
    });

    expect(table).toBeDefined();
    expect(table!.detectionMode).toBe("tagged");
    expect(table!.cells).toEqual([
      ["District", "Cases"],
      ["Gao", "1204"],
    ]);
  });

  it("returns nothing when the document has no structure tree", () => {
    // Roughly 85 percent of PDFs in the wild are untagged, so this is the
    // common case rather than an edge case.
    expect(detectTaggedTables(PAGE, null, {})).toEqual([]);
  });

  it("returns nothing when the tree has no Table nodes", () => {
    const proseOnly: StructTreeNode = {
      role: "Document",
      children: [{ role: "P", children: [{ type: "content", id: "t1" }] }],
    };

    expect(detectTaggedTables(PAGE, proseOnly, {})).toEqual([]);
  });

  it("finds a Table nested below other structure elements", () => {
    const nested: StructTreeNode = {
      role: "Document",
      children: [{ role: "Sect", children: [STRUCT_TREE.children![0]!] }],
    };

    const tables = detectTaggedTables(nested === nested ? PAGE : PAGE, nested, {
      t1: PAGE.textItems[0]!,
      t2: PAGE.textItems[1]!,
      t3: PAGE.textItems[2]!,
      t4: PAGE.textItems[3]!,
    });

    expect(tables).toHaveLength(1);
  });

  it("pads short rows so every row has the same column count", () => {
    // A row with a missing trailing cell would otherwise produce a ragged
    // array that breaks CSV serialisation downstream.
    const ragged: StructTreeNode = {
      role: "Table",
      children: [
        {
          role: "TR",
          children: [
            { role: "TH", children: [{ type: "content", id: "t1" }] },
            { role: "TH", children: [{ type: "content", id: "t2" }] },
          ],
        },
        {
          role: "TR",
          children: [
            { role: "TD", children: [{ type: "content", id: "t3" }] },
          ],
        },
      ],
    };

    const [table] = detectTaggedTables(PAGE, ragged, {
      t1: PAGE.textItems[0]!,
      t2: PAGE.textItems[1]!,
      t3: PAGE.textItems[2]!,
    });

    expect(table!.cells).toEqual([
      ["District", "Cases"],
      ["Gao", ""],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/detectTaggedTables.test.ts`
Expected: FAIL, cannot resolve `./detectTaggedTables`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/detectTaggedTables.ts`:

```ts
import { normalizeCellValue } from "./normalizeCellValue";
import type { BBox, CandidateTable, PageGeometry, TextItem } from "./types";

/**
 * pdf.js's structure tree shape. Interior nodes carry a `role` (the PDF
 * structure type: Table, TR, TD, P, and so on); leaves are content items
 * whose `id` matches a marked-content id on the page.
 */
export type StructTreeNode = {
  role?: string;
  type?: string;
  id?: string;
  children?: readonly StructTreeNode[];
};

/** Maps a marked-content id to the text item it labels. */
export type ContentItemIndex = Readonly<Record<string, TextItem>>;

function _collectTableNodes(node: StructTreeNode): StructTreeNode[] {
  if (node.role === "Table") {
    return [node];
  }
  return (node.children ?? []).flatMap(_collectTableNodes);
}

/** Concatenates every content leaf beneath a node into one cell string. */
function _cellText(
  node: StructTreeNode,
  contentIndex: ContentItemIndex,
): string {
  if (node.type === "content" && node.id !== undefined) {
    return contentIndex[node.id]?.text ?? "";
  }
  return (node.children ?? [])
    .map((child) => {
      return _cellText(child, contentIndex);
    })
    .filter((text) => {
      return text !== "";
    })
    .join(" ");
}

function _collectTextItems(
  node: StructTreeNode,
  contentIndex: ContentItemIndex,
): TextItem[] {
  if (node.type === "content" && node.id !== undefined) {
    const item = contentIndex[node.id];
    return item ? [item] : [];
  }
  return (node.children ?? []).flatMap((child) => {
    return _collectTextItems(child, contentIndex);
  });
}

function _bboxOf(items: readonly TextItem[], page: PageGeometry): BBox {
  if (items.length === 0) {
    return [0, 0, page.width, page.height];
  }
  const xs = items.flatMap((i) => {
    return [i.x, i.x + i.width];
  });
  const ys = items.flatMap((i) => {
    return [i.y, i.y + i.height];
  });
  return [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];
}

/**
 * Reads tables out of a tagged PDF's logical structure tree.
 *
 * When a document is tagged this is ground truth rather than inference: the
 * generator recorded the cell grid, the header rows, and the spans, and we
 * are simply reading them back. That is why tagged results outrank lattice
 * and stream results during deduplication.
 *
 * The catch is coverage. Only around 10 to 15 percent of PDFs in the wild
 * are tagged at all, so this returns an empty array most of the time and the
 * other two signals do the work.
 */
export function detectTaggedTables(
  page: PageGeometry,
  structTree: StructTreeNode | null,
  contentIndex: ContentItemIndex,
): readonly CandidateTable[] {
  if (!structTree) {
    return [];
  }

  return _collectTableNodes(structTree).flatMap((tableNode) => {
    const rowNodes = (tableNode.children ?? []).filter((child) => {
      return child.role === "TR";
    });
    if (rowNodes.length === 0) {
      return [];
    }

    const rawCells = rowNodes.map((rowNode) => {
      return (rowNode.children ?? [])
        .filter((cell) => {
          return cell.role === "TD" || cell.role === "TH";
        })
        .map((cell) => {
          return normalizeCellValue(_cellText(cell, contentIndex));
        });
    });

    // Pad short rows. A ragged array breaks CSV serialisation downstream,
    // and a missing trailing cell is far more likely to be an omitted empty
    // value than a genuinely different row shape.
    const columnCount = Math.max(
      ...rawCells.map((row) => {
        return row.length;
      }),
    );
    const cells = rawCells.map((row) => {
      return [
        ...row,
        ...Array.from({ length: columnCount - row.length }, () => {
          return "";
        }),
      ];
    });

    const items = _collectTextItems(tableNode, contentIndex);
    const bbox = _bboxOf(items, page);

    return [
      {
        pageIndex: page.pageIndex,
        bbox,
        detectionMode: "tagged" as const,
        // The structure tree supplies the grid directly, so there are no
        // snapped coordinates to record. Persisted as null; see the
        // `grid_x` / `grid_y` columns.
        gridX: [],
        gridY: [],
        cells,
      },
    ];
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/detectTaggedTables.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: read tables from tagged pdf structure trees"
```

---

## Task 8: Stream detection from whitespace

**Files:**
- Create: `src/workers/pdfSniff/detectStreamTables.ts`
- Create: `src/workers/pdfSniff/detectStreamTables.test.ts`

The least reliable signal, and always surfaced as such. It exists because
borderless tables are common enough that omitting it would gut the feature.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/detectStreamTables.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectStreamTables } from "./detectStreamTables";
import type { PageGeometry, TextItem } from "./types";

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

/** Three rows of three columns at x 100, 250, 400, with no rules. */
function borderlessTablePage(): PageGeometry {
  return {
    pageIndex: 0,
    width: 595,
    height: 842,
    looksScanned: false,
    rules: [],
    textItems: [
      textItem("District", 100, 600),
      textItem("Cases", 250, 600),
      textItem("Deaths", 400, 600),
      textItem("Gao", 100, 580),
      textItem("1204", 250, 580),
      textItem("31", 400, 580),
      textItem("Mopti", 100, 560),
      textItem("987", 250, 560),
      textItem("22", 400, 560),
    ],
  };
}

describe("detectStreamTables", () => {
  it("recovers a borderless table from column alignment", () => {
    const [table] = detectStreamTables(borderlessTablePage());

    expect(table).toBeDefined();
    expect(table!.detectionMode).toBe("stream");
    expect(table!.cells).toEqual([
      ["District", "Cases", "Deaths"],
      ["Gao", "1204", "31"],
      ["Mopti", "987", "22"],
    ]);
  });

  it("groups items on the same baseline into one row", () => {
    // Baselines drift by a fraction of a point within a row. Treating that
    // as a new row would produce one row per cell.
    const page = borderlessTablePage();
    const jittered: PageGeometry = {
      ...page,
      textItems: [
        textItem("Gao", 100, 580),
        textItem("1204", 250, 580.4),
        textItem("31", 400, 579.7),
      ],
    };

    const [table] = detectStreamTables(jittered);
    expect(table!.cells).toHaveLength(1);
    expect(table!.cells[0]).toHaveLength(3);
  });

  it("ignores prose, which has no consistent column structure", () => {
    // A paragraph produces rows of wildly varying item counts and no
    // persistent whitespace corridors. Reporting it as a table would bury
    // real results under noise.
    const prose: PageGeometry = {
      pageIndex: 0,
      width: 595,
      height: 842,
      looksScanned: false,
      rules: [],
      textItems: [
        textItem("The quick brown fox jumps over the lazy dog and", 72, 600),
        textItem("continues running through the field until it", 72, 585),
        textItem("reaches the river at the far edge of the", 72, 570),
      ],
    };

    expect(detectStreamTables(prose)).toEqual([]);
  });

  it("requires several rows before calling something a table", () => {
    const twoItems: PageGeometry = {
      ...borderlessTablePage(),
      textItems: [textItem("District", 100, 600), textItem("Cases", 250, 600)],
    };

    expect(detectStreamTables(twoItems)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/detectStreamTables.test.ts`
Expected: FAIL, cannot resolve `./detectStreamTables`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/detectStreamTables.ts`:

```ts
import { normalizeCellValue } from "./normalizeCellValue";
import type { BBox, CandidateTable, PageGeometry, TextItem } from "./types";

/** Baselines within this many points belong to the same visual row. */
const ROW_TOLERANCE = 3;

/** Left edges within this many points belong to the same column. */
const COLUMN_TOLERANCE = 6;

/** Fewer rows than this is not worth calling a table. */
const MIN_ROWS = 3;

/** Fewer columns than this is a list, not a table. */
const MIN_COLUMNS = 2;

/**
 * Fraction of rows that must contain an item at a given column position for
 * that position to count as a real column. Prose happens to align
 * occasionally; a genuine column is populated consistently.
 */
const MIN_COLUMN_OCCUPANCY = 0.6;

function _groupIntoRows(
  items: readonly TextItem[],
): TextItem[][] {
  const rows: TextItem[][] = [];

  for (const item of items) {
    const existingRow = rows.find((row) => {
      const head = row[0];
      return head !== undefined && Math.abs(head.y - item.y) <= ROW_TOLERANCE;
    });
    if (existingRow) {
      existingRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows
    .map((row) => {
      return [...row].sort((a, b) => {
        return a.x - b.x;
      });
    })
    .sort((a, b) => {
      return (b[0]?.y ?? 0) - (a[0]?.y ?? 0);
    });
}

/**
 * Finds x positions that recur across enough rows to be real columns.
 *
 * This is the crux of stream detection and the reason it earns only medium
 * or low confidence: alignment is evidence of a column, not proof of one.
 */
function _findColumnPositions(rows: readonly (readonly TextItem[])[]): number[] {
  const clusters: { position: number; rowsSeen: Set<number> }[] = [];

  rows.forEach((row, rowIndex) => {
    for (const item of row) {
      const existing = clusters.find((cluster) => {
        return Math.abs(cluster.position - item.x) <= COLUMN_TOLERANCE;
      });
      if (existing) {
        existing.rowsSeen.add(rowIndex);
      } else {
        clusters.push({ position: item.x, rowsSeen: new Set([rowIndex]) });
      }
    }
  });

  return clusters
    .filter((cluster) => {
      return cluster.rowsSeen.size / rows.length >= MIN_COLUMN_OCCUPANCY;
    })
    .map((cluster) => {
      return cluster.position;
    })
    .sort((a, b) => {
      return a - b;
    });
}

/**
 * Recovers tables that have no ruling lines, using text alignment alone.
 *
 * Borderless tables are common in agency and NGO reporting, so skipping this
 * signal would leave a large class of real documents unimportable. But the
 * inference is genuinely weaker than the other two signals, so results are
 * always surfaced with a visible caveat rather than presented as facts.
 */
export function detectStreamTables(
  page: PageGeometry,
): readonly CandidateTable[] {
  const rows = _groupIntoRows(page.textItems);
  if (rows.length < MIN_ROWS) {
    return [];
  }

  const columnPositions = _findColumnPositions(rows);
  if (columnPositions.length < MIN_COLUMNS) {
    return [];
  }

  const cells = rows.map((row) => {
    const rowCells = Array.from({ length: columnPositions.length }, () => {
      return "";
    });
    for (const item of row) {
      // Assign to the rightmost column whose position is at or left of the
      // item, which handles a value indented slightly inside its column.
      let columnIndex = 0;
      for (let c = 0; c < columnPositions.length; c += 1) {
        if (item.x >= columnPositions[c]! - COLUMN_TOLERANCE) {
          columnIndex = c;
        }
      }
      const existing = rowCells[columnIndex]!;
      rowCells[columnIndex] =
        existing === "" ? item.text : `${existing} ${item.text}`;
    }
    return rowCells.map(normalizeCellValue);
  });

  const xs = page.textItems.flatMap((i) => {
    return [i.x, i.x + i.width];
  });
  const ys = page.textItems.flatMap((i) => {
    return [i.y, i.y + i.height];
  });
  const bbox: BBox = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];

  return [
    {
      pageIndex: page.pageIndex,
      bbox,
      detectionMode: "stream",
      gridX: columnPositions,
      gridY: rows.map((row) => {
        return row[0]?.y ?? 0;
      }),
      cells,
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/detectStreamTables.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: detect borderless pdf tables from text alignment"
```

---

## Task 9: Deduplicate candidates across signals

**Files:**
- Create: `src/workers/pdfSniff/dedupeCandidates.ts`
- Create: `src/workers/pdfSniff/dedupeCandidates.test.ts`

All three detectors run on every page, so a ruled table in a tagged document
is found three times. Without dedup the user sees the same table repeated with
different quality.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/dedupeCandidates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dedupeCandidates } from "./dedupeCandidates";
import type { BBox, CandidateTable, PdfDetectionModeAlias } from "./types";
import type { PdfDetectionMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

function candidate(options: {
  bbox: BBox;
  detectionMode: PdfDetectionMode;
  pageIndex?: number;
}): CandidateTable {
  return {
    pageIndex: options.pageIndex ?? 0,
    bbox: options.bbox,
    detectionMode: options.detectionMode,
    gridX: [],
    gridY: [],
    cells: [["a", "b"]],
  };
}

describe("dedupeCandidates", () => {
  it("keeps the tagged version when signals overlap", () => {
    // Tagged is ground truth read from the document; the other two are
    // inference. When they describe the same rectangle, trust the document.
    const result = dedupeCandidates([
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "stream" }),
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "tagged" }),
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.detectionMode).toBe("tagged");
  });

  it("prefers lattice over stream", () => {
    const result = dedupeCandidates([
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "stream" }),
      candidate({ bbox: [102, 498, 298, 562], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.detectionMode).toBe("lattice");
  });

  it("keeps tables that merely sit near each other", () => {
    // Two tables side by side must survive as two. This is the case that
    // makes naive merging destroy real data.
    const result = dedupeCandidates([
      candidate({ bbox: [60, 500, 260, 560], detectionMode: "lattice" }),
      candidate({ bbox: [330, 500, 530, 560], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("keeps identical rectangles on different pages", () => {
    // A templated report puts a table at the same coordinates on every
    // page. Those are different tables, not duplicates.
    const result = dedupeCandidates([
      candidate({
        bbox: [100, 500, 300, 560],
        detectionMode: "lattice",
        pageIndex: 0,
      }),
      candidate({
        bbox: [100, 500, 300, 560],
        detectionMode: "lattice",
        pageIndex: 1,
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("treats partial overlap below the threshold as distinct tables", () => {
    const result = dedupeCandidates([
      candidate({ bbox: [100, 500, 300, 560], detectionMode: "lattice" }),
      candidate({ bbox: [280, 500, 480, 560], detectionMode: "lattice" }),
    ]);

    expect(result).toHaveLength(2);
  });
});
```

Delete the unused `PdfDetectionModeAlias` import if your editor flags it; it
is not part of `types.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/dedupeCandidates.test.ts`
Expected: FAIL, cannot resolve `./dedupeCandidates`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/dedupeCandidates.ts`:

```ts
import type { BBox, CandidateTable } from "./types";
import type { PdfDetectionMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

/**
 * Intersection-over-union above which two rectangles on the same page are
 * considered the same table.
 */
const OVERLAP_THRESHOLD = 0.5;

/**
 * Higher wins. Tagged is read from the document itself; lattice reads
 * geometry the generator drew; stream infers from alignment.
 */
const MODE_RANK: Record<PdfDetectionMode, number> = {
  tagged: 3,
  lattice: 2,
  stream: 1,
  manual: 4,
};

function _intersectionOverUnion(a: BBox, b: BBox): number {
  const overlapWidth = Math.max(
    0,
    Math.min(a[2], b[2]) - Math.max(a[0], b[0]),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(a[3], b[3]) - Math.max(a[1], b[1]),
  );
  const intersection = overlapWidth * overlapHeight;
  if (intersection === 0) {
    return 0;
  }

  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = areaA + areaB - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Collapses candidates that describe the same physical table.
 *
 * All three detectors run over every page, so a ruled table inside a tagged
 * document is proposed three times. The user should see it once, described
 * by the most trustworthy signal that found it.
 *
 * Overlap is only ever compared within a page. A templated report places its
 * table at identical coordinates on every page, and those are different
 * tables holding different data.
 */
export function dedupeCandidates(
  candidates: readonly CandidateTable[],
): readonly CandidateTable[] {
  const ranked = [...candidates].sort((a, b) => {
    return MODE_RANK[b.detectionMode] - MODE_RANK[a.detectionMode];
  });

  const kept: CandidateTable[] = [];

  for (const candidate of ranked) {
    const isDuplicate = kept.some((existing) => {
      return (
        existing.pageIndex === candidate.pageIndex &&
        _intersectionOverUnion(existing.bbox, candidate.bbox) >=
          OVERLAP_THRESHOLD
      );
    });
    if (!isDuplicate) {
      kept.push(candidate);
    }
  }

  return kept.sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) {
      return a.pageIndex - b.pageIndex;
    }
    // Top of the page first, then left to right.
    if (Math.abs(b.bbox[3] - a.bbox[3]) > 1) {
      return b.bbox[3] - a.bbox[3];
    }
    return a.bbox[0] - b.bbox[0];
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/dedupeCandidates.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: dedupe pdf table candidates across detection signals"
```

---

## Task 10: Merge tables that span pages

**Files:**
- Create: `src/workers/pdfSniff/mergePageSpans.ts`
- Create: `src/workers/pdfSniff/mergePageSpans.test.ts`

Both real untagged fixtures contain a table that continues onto a second page.
Merging is the default because it is right most of the time, and because the
mistake is visible in the UI and reversible with a split control.

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/mergePageSpans.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mergePageSpans } from "./mergePageSpans";
import type { CandidateTable } from "./types";

function fragment(options: {
  pageIndex: number;
  gridX: readonly number[];
  cells: readonly (readonly string[])[];
}): CandidateTable {
  return {
    pageIndex: options.pageIndex,
    bbox: [100, 100, 400, 700],
    detectionMode: "lattice",
    gridX: options.gridX,
    gridY: [700, 400, 100],
    cells: options.cells,
  };
}

const HEADER = ["District", "Cases"];

describe("mergePageSpans", () => {
  it("merges consecutive pages with matching columns and a repeated header", () => {
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.fragments.map((f) => f.pageIndex)).toEqual([3, 4]);
    // The header appears once. The repeat on page 4 is page furniture, not
    // data, and leaving it in would inject a fake row mid-table.
    expect(merged[0]!.cells).toEqual([HEADER, ["Gao", "1204"], ["Mopti", "987"]]);
  });

  it("merges a continuation page that omits the header", () => {
    // Long statistical tables frequently drop the header on later pages.
    // Requiring a repeated header would miss them.
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [100, 250, 400],
        cells: [["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.cells).toEqual([HEADER, ["Gao", "1204"], ["Mopti", "987"]]);
  });

  it("does not merge across a gap in page numbers", () => {
    // Pages 3 and 7 are not a continuation, however similar they look.
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 7,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("does not merge tables whose columns differ", () => {
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [100, 200, 300, 400],
        cells: [["A", "B", "C"], ["1", "2", "3"]],
      }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("does not merge when the column count matches but positions do not", () => {
    // Same shape, different layout, so almost certainly a different table.
    const merged = mergePageSpans([
      fragment({
        pageIndex: 3,
        gridX: [100, 250, 400],
        cells: [HEADER, ["Gao", "1204"]],
      }),
      fragment({
        pageIndex: 4,
        gridX: [60, 300, 540],
        cells: [HEADER, ["Mopti", "987"]],
      }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("records the fragment count so the UI can offer a split", () => {
    const merged = mergePageSpans([
      fragment({
        pageIndex: 0,
        gridX: [100, 250, 400],
        cells: [HEADER, ["a", "1"]],
      }),
      fragment({
        pageIndex: 1,
        gridX: [100, 250, 400],
        cells: [HEADER, ["b", "2"]],
      }),
      fragment({
        pageIndex: 2,
        gridX: [100, 250, 400],
        cells: [HEADER, ["c", "3"]],
      }),
    ]);

    expect(merged[0]!.fragments).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/mergePageSpans.test.ts`
Expected: FAIL, cannot resolve `./mergePageSpans`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/mergePageSpans.ts`:

```ts
import type { BBox, CandidateTable } from "./types";

/** Column boundaries within this many points are the same layout. */
const COLUMN_MATCH_TOLERANCE = 6;

/** A merged table before scoring. */
export type MergedTable = {
  fragments: readonly { pageIndex: number; bbox: BBox }[];
  detectionMode: CandidateTable["detectionMode"];
  gridX: readonly number[];
  gridY: readonly number[];
  cells: readonly (readonly string[])[];
};

function _columnsMatch(a: CandidateTable, b: CandidateTable): boolean {
  // Tagged tables carry no snapped grid, so fall back to column count.
  if (a.gridX.length === 0 || b.gridX.length === 0) {
    const aColumns = a.cells[0]?.length ?? 0;
    const bColumns = b.cells[0]?.length ?? 0;
    return aColumns > 0 && aColumns === bColumns;
  }

  if (a.gridX.length !== b.gridX.length) {
    return false;
  }
  return a.gridX.every((position, index) => {
    return Math.abs(position - b.gridX[index]!) <= COLUMN_MATCH_TOLERANCE;
  });
}

function _rowsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((cell, i) => cell === b[i]);
}

/**
 * Joins table fragments that are really one table continuing across pages.
 *
 * Merging is the default because it is correct most of the time, and because
 * a wrong merge is visible in the picker and reversible with the split
 * control. The opposite default, listing a 40-page statistical table as 40
 * separate items, is technically never wrong and practically unusable.
 *
 * Two guards keep false merges rare: fragments must be on consecutive pages,
 * and their column layouts must match within tolerance. A templated report
 * whose pages each carry a different table will usually differ in column
 * positions; when it does not, the split control is the remedy.
 */
export function mergePageSpans(
  candidates: readonly CandidateTable[],
): readonly MergedTable[] {
  const ordered = [...candidates].sort((a, b) => {
    return a.pageIndex - b.pageIndex;
  });

  const merged: MergedTable[] = [];
  let currentGroup: CandidateTable[] = [];

  const flush = (): void => {
    if (currentGroup.length === 0) {
      return;
    }
    const first = currentGroup[0]!;
    const headerRow = first.cells[0];

    const cells = currentGroup.flatMap((fragment, fragmentIndex) => {
      if (fragmentIndex === 0 || !headerRow) {
        return fragment.cells;
      }
      // Drop a repeated header on a continuation page. Keeping it would
      // inject a row of column names into the middle of the data.
      const [firstRow, ...rest] = fragment.cells;
      if (firstRow && _rowsEqual(firstRow, headerRow)) {
        return rest;
      }
      return fragment.cells;
    });

    merged.push({
      fragments: currentGroup.map((fragment) => {
        return { pageIndex: fragment.pageIndex, bbox: fragment.bbox };
      }),
      detectionMode: first.detectionMode,
      gridX: first.gridX,
      gridY: first.gridY,
      cells,
    });
    currentGroup = [];
  };

  for (const candidate of ordered) {
    const previous = currentGroup[currentGroup.length - 1];
    const continuesPrevious =
      previous !== undefined &&
      candidate.pageIndex === previous.pageIndex + 1 &&
      _columnsMatch(previous, candidate);

    if (!continuesPrevious) {
      flush();
    }
    currentGroup.push(candidate);
  }
  flush();

  return merged;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/mergePageSpans.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: merge pdf table fragments across page spans"
```

---

## Task 11: Score confidence and detect headers

**Files:**
- Create: `src/workers/pdfSniff/scoreCandidate.ts`
- Create: `src/workers/pdfSniff/scoreCandidate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/workers/pdfSniff/scoreCandidate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scoreCandidate } from "./scoreCandidate";
import type { MergedTable } from "./mergePageSpans";

function table(options: {
  detectionMode: MergedTable["detectionMode"];
  cells: readonly (readonly string[])[];
}): MergedTable {
  return {
    fragments: [{ pageIndex: 0, bbox: [100, 100, 400, 700] }],
    detectionMode: options.detectionMode,
    gridX: [100, 250, 400],
    gridY: [700, 400, 100],
    cells: options.cells,
  };
}

const CLEAN_CELLS = [
  ["District", "Cases", "Deaths"],
  ["Gao", "1204", "31"],
  ["Mopti", "987", "22"],
];

describe("scoreCandidate", () => {
  it("rates a tagged table as high confidence", () => {
    const scored = scoreCandidate(
      table({ detectionMode: "tagged", cells: CLEAN_CELLS }),
    );

    expect(scored.confidence).toBe("high");
    expect(scored.confidenceNotes.join(" ")).toMatch(/structure tree/i);
  });

  it("rates a well-filled lattice table as high confidence", () => {
    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: CLEAN_CELLS }),
    );

    expect(scored.confidence).toBe("high");
  });

  it("rates a stream table as medium at best and says why", () => {
    // The caveat is the point: a user cannot sanity-check a guess they were
    // not told was a guess.
    const scored = scoreCandidate(
      table({ detectionMode: "stream", cells: CLEAN_CELLS }),
    );

    expect(scored.confidence).toBe("medium");
    expect(scored.confidenceNotes.join(" ")).toMatch(/alignment/i);
  });

  it("downgrades a sparsely filled table", () => {
    const sparse = [
      ["A", "B", "C"],
      ["1", "", ""],
      ["", "", ""],
      ["", "2", ""],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: sparse }),
    );

    expect(scored.confidence).toBe("low");
    expect(scored.confidenceNotes.join(" ")).toMatch(/empty/i);
  });

  it("detects a single header row", () => {
    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: CLEAN_CELLS }),
    );

    expect(scored.headerRows).toBe(1);
  });

  it("detects two header rows when the first two are non-numeric", () => {
    // Government statistical tables stack a spanning header over a detail
    // header. Treating the second as data would inject a junk row and lose
    // the real column names.
    const spanning = [
      ["", "2024", "2024", "2025", "2025"],
      ["Region", "Q1", "Q2", "Q1", "Q2"],
      ["Gao", "1", "2", "3", "4"],
      ["Mopti", "5", "6", "7", "8"],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: spanning }),
    );

    expect(scored.headerRows).toBe(2);
  });

  it("counts merged cells that were filled down", () => {
    const withMerges = [
      ["Region", "City", "Pop"],
      ["North", "Gao", "1204"],
      ["", "Mopti", "987"],
      ["", "Segou", "654"],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: withMerges }),
    );

    expect(scored.mergedCellCount).toBe(2);
    expect(scored.cells[2]![0]).toBe("North");
    expect(scored.cells[3]![0]).toBe("North");
  });

  it("does not fill down a column that is simply mostly empty", () => {
    // Fill-down applies to a leading grouping column, not to any blank. A
    // sparse notes column must stay sparse.
    const sparseNotes = [
      ["City", "Notes"],
      ["Gao", "checked"],
      ["Mopti", ""],
      ["Segou", ""],
    ];

    const scored = scoreCandidate(
      table({ detectionMode: "lattice", cells: sparseNotes }),
    );

    expect(scored.cells[2]![1]).toBe("");
    expect(scored.cells[3]![1]).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/scoreCandidate.test.ts`
Expected: FAIL, cannot resolve `./scoreCandidate`.

- [ ] **Step 3: Write the implementation**

Create `src/workers/pdfSniff/scoreCandidate.ts`:

```ts
import type { MergedTable } from "./mergePageSpans";
import type { ScoredTable } from "./types";

/** Below this fill ratio a table is probably a misdetection. */
const MIN_FILL_RATIO = 0.5;

/** At most this many leading rows may be treated as header. */
const MAX_HEADER_ROWS = 3;

function _isNumericish(value: string): boolean {
  return value !== "" && /^-?\d+(\.\d+)?$/u.test(value);
}

function _fillRatio(cells: readonly (readonly string[])[]): number {
  const total = cells.reduce((sum, row) => {
    return sum + row.length;
  }, 0);
  if (total === 0) {
    return 0;
  }
  const filled = cells.reduce((sum, row) => {
    return (
      sum +
      row.filter((cell) => {
        return cell !== "";
      }).length
    );
  }, 0);
  return filled / total;
}

/**
 * Counts leading rows that carry no numbers. A header row is text; a data
 * row in any table worth importing has at least one number somewhere.
 */
function _detectHeaderRows(cells: readonly (readonly string[])[]): number {
  let headerRows = 0;
  for (let i = 0; i < Math.min(cells.length - 1, MAX_HEADER_ROWS); i += 1) {
    const row = cells[i]!;
    const hasNumber = row.some(_isNumericish);
    if (hasNumber) {
      break;
    }
    headerRows += 1;
  }
  return Math.max(1, headerRows);
}

/**
 * Fills a merged cell's value down into the rows it spans.
 *
 * Only applied to a leading run of columns, because that is where merged
 * grouping cells actually occur. Applying it to every column would corrupt
 * a legitimately sparse column such as free-text notes.
 */
function _fillMergedCellsDown(
  cells: readonly (readonly string[])[],
  headerRows: number,
): { cells: string[][]; mergedCellCount: number } {
  const filled = cells.map((row) => {
    return [...row];
  });
  let mergedCellCount = 0;

  const columnCount = filled[0]?.length ?? 0;
  for (let column = 0; column < columnCount; column += 1) {
    // Stop at the first column that is not a grouping column. A grouping
    // column's first data cell is populated; a sparse notes column may not
    // be, but more importantly we only walk left-to-right and break out.
    const firstDataCell = filled[headerRows]?.[column] ?? "";
    if (firstDataCell === "") {
      break;
    }

    let lastValue = "";
    for (let row = headerRows; row < filled.length; row += 1) {
      const value = filled[row]![column]!;
      if (value !== "") {
        lastValue = value;
        continue;
      }
      if (lastValue !== "") {
        filled[row]![column] = lastValue;
        mergedCellCount += 1;
      }
    }

    // Only the leading grouping columns get this treatment.
    const hasBlanks = cells.some((row, rowIndex) => {
      return rowIndex >= headerRows && row[column] === "";
    });
    if (!hasBlanks) {
      break;
    }
  }

  return { cells: filled, mergedCellCount };
}

/**
 * Assigns a confidence rating and resolves header and merged-cell handling.
 *
 * Confidence is surfaced directly in the picker because the alternative is
 * presenting a guess with the same authority as a fact. A user can sanity
 * check a table they were told was inferred from alignment; they cannot
 * check one presented as certain.
 */
export function scoreCandidate(table: MergedTable): ScoredTable {
  const notes: string[] = [];
  const fillRatio = _fillRatio(table.cells);

  let confidence: ScoredTable["confidence"];
  if (table.detectionMode === "tagged") {
    confidence = "high";
    notes.push(
      "Read from the document's own structure tree, so the cell layout is exact.",
    );
  } else if (table.detectionMode === "lattice") {
    confidence = "high";
    notes.push("Built from the ruling lines drawn in the document.");
  } else if (table.detectionMode === "manual") {
    confidence = "high";
    notes.push("You selected this region yourself.");
  } else {
    confidence = "medium";
    notes.push(
      "This table has no ruling lines, so its columns were guessed from text alignment. Check it carefully.",
    );
  }

  if (fillRatio < MIN_FILL_RATIO) {
    confidence = "low";
    notes.push(
      `${Math.round((1 - fillRatio) * 100)} percent of the cells are empty, which often means the grid was misread.`,
    );
  }

  const headerRows = _detectHeaderRows(table.cells);
  const { cells, mergedCellCount } = _fillMergedCellsDown(
    table.cells,
    headerRows,
  );

  if (mergedCellCount > 0) {
    notes.push(
      `${mergedCellCount} merged ${mergedCellCount === 1 ? "cell was" : "cells were"} filled down.`,
    );
  }

  return {
    fragments: table.fragments,
    detectionMode: table.detectionMode,
    gridX: table.gridX,
    gridY: table.gridY,
    cells,
    confidence,
    confidenceNotes: notes,
    headerRows,
    mergedCellCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/workers/pdfSniff/scoreCandidate.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/workers/pdfSniff/
git commit -m "feat: score pdf table confidence and resolve headers"
```

---

## Task 12: The sniff worker and its driver

**Files:**
- Create: `src/workers/pdfSniff.worker.ts`
- Create: `src/clients/datasets/pdfSniff.ts`

Mirrors `xlsxSniff.worker.ts` and `xlsxSniff.ts` exactly: one worker per call,
self-closing after reply, `terminate()` as the error-path fallback.

- [ ] **Step 1: Write the worker**

Create `src/workers/pdfSniff.worker.ts`:

```ts
/**
 * Worker that finds tables in a PDF without blocking the main thread.
 *
 * Lifecycle: main thread sends `{ file, pageRange?, password? }`, the worker
 * posts zero or more `progress` messages, then one `result` or `error`, then
 * closes. One worker per import, matching `xlsxSniff.worker.ts`.
 *
 * Why this is a worker: detection reads every page's text and operator list,
 * which for a 200-page statistical publication is seconds of pure JS. On the
 * main thread that freezes input and animation.
 */
import { dedupeCandidates } from "./pdfSniff/dedupeCandidates";
import { detectLatticeTables } from "./pdfSniff/detectLatticeTables";
import { detectStreamTables } from "./pdfSniff/detectStreamTables";
import { detectTaggedTables } from "./pdfSniff/detectTaggedTables";
import { detectTextLayer } from "./pdfSniff/detectTextLayer";
import { extractPageGeometry } from "./pdfSniff/extractPageGeometry";
import { loadPdfDocument } from "./pdfSniff/loadPdfJs";
import { mergePageSpans } from "./pdfSniff/mergePageSpans";
import { scoreCandidate } from "./pdfSniff/scoreCandidate";
import type { ContentItemIndex } from "./pdfSniff/detectTaggedTables";
import type { CandidateTable, PageGeometry, ScoredTable } from "./pdfSniff/types";

/**
 * Hard cap on pages scanned when the user has not chosen a range. Beyond
 * this we stop and ask for a range rather than grinding for a minute.
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
  tables: readonly ScoredTable[];
};

export type PdfSniffProgress = {
  type: "progress";
  pagesScanned: number;
  totalPages: number;
};

export type PdfSniffError = {
  type: "error";
  /**
   * Machine-readable so the UI can render a specific explanation rather
   * than a generic failure. Every one of these is a different conversation
   * with the user.
   */
  reason:
    | "no_text_layer"
    | "unreliable_text"
    | "password_required"
    | "too_many_pages"
    | "no_tables_found"
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
          "only scan the part you need.",
        detail: { pageCount: doc.numPages },
      });
      _close();
      return;
    }

    const geometries: PageGeometry[] = [];
    const candidates: CandidateTable[] = [];

    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const geometry = await extractPageGeometry(page, pageNumber - 1);
      geometries.push(geometry);

      const structTree = await page.getStructTree().catch(() => {
        return null;
      });
      const contentIndex: ContentItemIndex = {};

      candidates.push(
        ...detectTaggedTables(geometry, structTree, contentIndex),
        ...detectLatticeTables(geometry),
        ...detectStreamTables(geometry),
      );

      _post({
        type: "progress",
        pagesScanned: pageNumber - firstPage + 1,
        totalPages: pageCountToScan,
      });
    }

    // The text-layer check runs on collected geometry rather than per page,
    // because a document is only unusable when EVERY page is a scan.
    const textLayer = detectTextLayer(geometries);
    if (textLayer.status === "no_text_layer") {
      _post({
        type: "error",
        reason: "no_text_layer",
        message:
          "This PDF has no text layer. It looks like a scan or photo of a " +
          "document, and we can only extract tables from PDFs that contain " +
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

    const tables = mergePageSpans(dedupeCandidates(candidates)).map(
      scoreCandidate,
    );

    if (tables.length === 0) {
      _post({
        type: "error",
        reason: "no_tables_found",
        message:
          "We could not find any tables in this PDF. Its text was readable, " +
          "so this may mean the tables are laid out in a way we do not " +
          "recognise yet. Try narrowing the page range.",
      });
      _close();
      return;
    }

    _post({ type: "result", pageCount: doc.numPages, tables });
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

**Note on `contentIndex`:** the tagged detector needs marked-content ids
mapped to text items, which requires `getTextContent({ includeMarkedContent:
true })`. Task 13 wires that up; until then the tagged path returns empty and
the lattice and stream paths carry the tests.

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
 * reason. Carries the machine-readable code so the import form can render
 * the right guidance rather than a generic failure.
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
        (event: MessageEvent<PdfSniffResult | PdfSniffProgress | PdfSniffError>) => {
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

Note the progress listener is **not** `{ once: true }`, unlike the XLSX
driver, because progress messages arrive repeatedly before the result.

- [ ] **Step 3: Verify**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/workers/pdfSniff.worker.ts src/clients/datasets/pdfSniff.ts
git commit -m "feat: add pdf sniff worker and main-thread driver"
```

---

## Task 13: Wire marked content into tagged detection

**Files:**
- Modify: `src/workers/pdfSniff/extractPageGeometry.ts`
- Modify: `src/workers/pdfSniff.worker.ts`
- Create: `src/workers/pdfSniff/pdfSniff.fixtures.test.ts`

Until now the tagged detector receives an empty content index, so it never
produces a table from a real document. This task closes that gap and adds the
end-to-end fixture tests.

- [ ] **Step 1: Write the failing integration test**

Create `src/workers/pdfSniff/pdfSniff.fixtures.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { dedupeCandidates } from "./dedupeCandidates";
import { detectLatticeTables } from "./detectLatticeTables";
import { detectStreamTables } from "./detectStreamTables";
import { detectTaggedTables } from "./detectTaggedTables";
import { extractPageGeometry } from "./extractPageGeometry";
import { loadPdfDocument } from "./loadPdfJs";
import { mergePageSpans } from "./mergePageSpans";
import { scoreCandidate } from "./scoreCandidate";
import type { CandidateTable } from "./types";

const FIXTURES = {
  frontiers: "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf",
  plosDataQuality:
    "public/test-data/pdf/plos-one-online-research-data-quality.pdf",
  plosNcd: "public/test-data/pdf/plos-one-ncd-mobile-phone-surveys.pdf",
} as const;

async function detectTables(path: string, pageNumbers: readonly number[]) {
  const bytes = await readFile(path);
  const doc = await loadPdfDocument(new Uint8Array(bytes));
  const candidates: CandidateTable[] = [];

  for (const pageNumber of pageNumbers) {
    const page = await doc.getPage(pageNumber);
    const { geometry, contentIndex } = await extractPageGeometry(
      page,
      pageNumber - 1,
      { includeMarkedContent: true },
    );
    const structTree = await page.getStructTree().catch(() => null);

    candidates.push(
      ...detectTaggedTables(geometry, structTree, contentIndex),
      ...detectLatticeTables(geometry),
      ...detectStreamTables(geometry),
    );
  }

  await doc.destroy();
  return mergePageSpans(dedupeCandidates(candidates)).map(scoreCandidate);
}

describe("detection against real fixtures", () => {
  it("uses the structure tree on the tagged Frontiers paper", async () => {
    const tables = await detectTables(FIXTURES.frontiers, [4]);

    expect(tables.length).toBeGreaterThan(0);
    expect(tables.some((t) => t.detectionMode === "tagged")).toBe(true);
  }, 30_000);

  it("finds two side-by-side tables as two tables", async () => {
    // Page 8 carries Table 2 and Table 3 in adjacent columns. Reporting one
    // wide table would silently splice unrelated data together.
    const tables = await detectTables(FIXTURES.frontiers, [8]);

    expect(tables.length).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("merges the untagged multi-page table in the PLOS data quality paper", async () => {
    // Table 1 continues under a "Table 1. (Continued)" caption, with no
    // structure tree to lean on.
    const tables = await detectTables(FIXTURES.plosDataQuality, [7, 8]);
    const multiPage = tables.find((t) => t.fragments.length > 1);

    expect(multiPage).toBeDefined();
  }, 30_000);

  it("does not read n (%) values as negative numbers", async () => {
    // The single most dangerous normalisation bug available in this corpus.
    const tables = await detectTables(FIXTURES.plosNcd, [8]);
    const allCells = tables.flatMap((t) => t.cells.flat());
    const negatives = allCells.filter((cell) => cell.startsWith("-"));

    expect(negatives).toEqual([]);
  }, 30_000);

  it("rates every detected table with an explicit confidence", async () => {
    const tables = await detectTables(FIXTURES.plosNcd, [8]);

    for (const table of tables) {
      expect(["high", "medium", "low"]).toContain(table.confidence);
      expect(table.confidenceNotes.length).toBeGreaterThan(0);
    }
  }, 30_000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/workers/pdfSniff/pdfSniff.fixtures.test.ts`
Expected: FAIL. `extractPageGeometry` does not accept a third argument and
does not return `{ geometry, contentIndex }`.

- [ ] **Step 3: Change `extractPageGeometry` to return a content index**

In `extractPageGeometry.ts`, change the signature and return shape:

```ts
export type PageGeometryResult = {
  geometry: PageGeometry;
  /** Marked-content id to text item, for the tagged detector. */
  contentIndex: Record<string, TextItem>;
};

export async function extractPageGeometry(
  page: PDFPageProxy,
  pageIndex: number,
  options: { includeMarkedContent?: boolean } = {},
): Promise<PageGeometryResult> {
```

Replace the `getTextContent()` call with:

```ts
  const textContent = await page.getTextContent({
    includeMarkedContent: options.includeMarkedContent ?? false,
  });
```

When `includeMarkedContent` is true, pdf.js interleaves
`{ type: "beginMarkedContentProps", id }` markers with the text items. Track
the most recent id and record it against each item:

```ts
  const contentIndex: Record<string, TextItem> = {};
  let currentMarkedContentId: string | undefined;
  const rawItems: TextItem[] = [];

  for (const rawItem of textContent.items) {
    if (!("str" in rawItem)) {
      // A marked-content boundary. `id` is present on begin markers and
      // absent on end markers, so an absent id clears the current scope.
      const markerId = (rawItem as { id?: string }).id;
      currentMarkedContentId = markerId;
      continue;
    }
    if (rawItem.str.length === 0) {
      continue;
    }
    const item: TextItem = {
      text: rawItem.str,
      x: rawItem.transform[4] ?? 0,
      y: rawItem.transform[5] ?? 0,
      width: rawItem.width ?? 0,
      height: rawItem.height ?? 0,
      fontName: rawItem.fontName ?? "",
      unmappedCharRatio: _unmappedCharRatio(rawItem.str),
    };
    rawItems.push(item);
    if (currentMarkedContentId !== undefined) {
      contentIndex[currentMarkedContentId] = item;
    }
  }

  const textItems = rawItems.sort((a, b) => {
    const yDelta = b.y - a.y;
    if (Math.abs(yDelta) > 1) {
      return yDelta;
    }
    return a.x - b.x;
  });
```

and return `{ geometry: { ... }, contentIndex }`.

- [ ] **Step 4: Update the existing geometry test**

`extractPageGeometry.test.ts` destructures the old return shape. Change its
helper to:

```ts
  const { geometry } = await extractPageGeometry(page, pageNumber - 1);
  await doc.destroy();
  return geometry;
```

- [ ] **Step 5: Update the worker call site**

In `pdfSniff.worker.ts`, replace the geometry call with:

```ts
      const { geometry, contentIndex } = await extractPageGeometry(
        page,
        pageNumber - 1,
        { includeMarkedContent: true },
      );
```

and delete the `const contentIndex: ContentItemIndex = {};` line.

- [ ] **Step 6: Run both test files**

```bash
pnpm vitest run src/workers/pdfSniff/extractPageGeometry.test.ts
pnpm vitest run src/workers/pdfSniff/pdfSniff.fixtures.test.ts
```

Expected: PASS.

These are the tests most likely to need threshold tuning against real
documents. If a fixture test fails, print the detected tables and compare
against the PDF with
`pdftotext -layout <fixture> - | sed -n '<start>,<end>p'` before changing a
constant. Adjust the constant, never the assertion, unless the assertion is
demonstrably describing the wrong thing.

- [ ] **Step 7: Commit**

```bash
git add src/workers/pdfSniff/ src/workers/pdfSniff.worker.ts
git commit -m "feat: map marked content to text items for tagged detection"
```

---

## Task 14: Type the extracted table through DuckDB

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
  headerRows: readonly (readonly string[])[],
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
  cells: readonly (readonly string[])[];
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

## Task 15: Compute the drift fingerprint

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
  cells: readonly (readonly string[])[];
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

## Task 16: The page preview canvas

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
}: Props): JSX.Element {
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

## Task 17: The table picker

**Files:**
- Create: `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfTablePicker.tsx`
- Create: `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfTablePicker.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `PdfTablePicker.test.tsx`:

```tsx
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PdfTablePicker } from "./PdfTablePicker";
import type { ScoredTable } from "@/workers/pdfSniff/types";

vi.mock("./PdfPagePreview", () => {
  return {
    PdfPagePreview: () => {
      return <div data-testid="page-preview" />;
    },
  };
});

const TABLES: ScoredTable[] = [
  {
    fragments: [{ pageIndex: 1, bbox: [100, 100, 400, 700] }],
    detectionMode: "lattice",
    gridX: [100, 250, 400],
    gridY: [700, 400, 100],
    cells: [["District", "Cases"], ["Gao", "1204"]],
    confidence: "high",
    confidenceNotes: ["Built from the ruling lines drawn in the document."],
    headerRows: 1,
    mergedCellCount: 0,
  },
  {
    fragments: [
      { pageIndex: 3, bbox: [100, 100, 400, 700] },
      { pageIndex: 4, bbox: [100, 100, 400, 700] },
    ],
    detectionMode: "stream",
    gridX: [100, 250],
    gridY: [700, 100],
    cells: [["Region"], ["North"]],
    confidence: "medium",
    confidenceNotes: [
      "This table has no ruling lines, so its columns were guessed from text alignment. Check it carefully.",
    ],
    headerRows: 1,
    mergedCellCount: 0,
  },
];

function renderPicker(props: Partial<React.ComponentProps<typeof PdfTablePicker>> = {}) {
  return render(
    <MantineProvider>
      <PdfTablePicker
        file={new File([new Uint8Array(4)], "report.pdf")}
        tables={TABLES}
        selectedIndex={0}
        onSelect={vi.fn()}
        onSplit={vi.fn()}
        {...props}
      />
    </MantineProvider>,
  );
}

describe("PdfTablePicker", () => {
  it("lists every detected table with its size", () => {
    renderPicker();

    expect(screen.getByText(/1 row × 2 columns/i)).toBeInTheDocument();
  });

  it("labels a multi-page table with its page span", () => {
    renderPicker();

    expect(screen.getByText(/pages 4-5/i)).toBeInTheDocument();
  });

  it("shows the confidence caveat for a guessed table", () => {
    // A user cannot sanity-check a guess they were not told was a guess.
    renderPicker();

    expect(screen.getByText(/guessed from text alignment/i)).toBeInTheDocument();
  });

  it("offers a split control only for merged tables", () => {
    renderPicker();

    const splitButtons = screen.getAllByRole("button", { name: /split/i });
    expect(splitButtons).toHaveLength(1);
  });

  it("calls onSelect when a different table is chosen", async () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });

    await userEvent.click(screen.getByRole("radio", { name: /table 2/i }));

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("calls onSplit with the table index", async () => {
    const onSplit = vi.fn();
    renderPicker({ onSplit });

    await userEvent.click(screen.getByRole("button", { name: /split/i }));

    expect(onSplit).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfTablePicker.test.tsx`
Expected: FAIL, cannot resolve `./PdfTablePicker`.

- [ ] **Step 3: Write the component**

Create `PdfTablePicker.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import {
  Badge,
  Button,
  Group,
  Paper,
  Radio,
  Stack,
  Text,
} from "@mantine/core";
import { PdfPagePreview } from "./PdfPagePreview";
import type { ScoredTable } from "@/workers/pdfSniff/types";

type Props = {
  file: File;
  tables: readonly ScoredTable[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onSplit: (index: number) => void;
};

const CONFIDENCE_COLOR = {
  high: "green",
  medium: "yellow",
  low: "red",
} as const;

function _pageLabel(table: ScoredTable): string {
  const pages = table.fragments.map((fragment) => {
    return fragment.pageIndex + 1;
  });
  const first = pages[0] ?? 1;
  const last = pages[pages.length - 1] ?? first;
  return first === last ? `Page ${first}` : `Pages ${first}-${last}`;
}

/**
 * Lets the user pick which detected table to import, with the detection
 * drawn over the page it came from.
 *
 * The preview is load-bearing rather than decorative: a list of table names
 * gives the user no way to tell a correct detection from a wrong one, and
 * confidence ratings only help if they can see what was rated.
 */
export function PdfTablePicker({
  file,
  tables,
  selectedIndex,
  onSelect,
  onSplit,
}: Props): JSX.Element {
  const selectedTable = tables[selectedIndex];

  return (
    <Group align="flex-start" gap="lg" wrap="nowrap">
      <Radio.Group
        value={String(selectedIndex)}
        onChange={(value) => {
          onSelect(Number(value));
        }}
      >
        <Stack gap="xs">
          <Text fw={600}>
            <Trans>Found {tables.length} tables</Trans>
          </Text>

          {tables.map((table, index) => {
            const rowCount = Math.max(0, table.cells.length - table.headerRows);
            const columnCount = table.cells[0]?.length ?? 0;
            const isMerged = table.fragments.length > 1;

            return (
              <Paper key={index} withBorder p="sm">
                <Radio
                  value={String(index)}
                  label={`Table ${index + 1}`}
                  aria-label={`Table ${index + 1}`}
                />
                <Group gap="xs" mt={4}>
                  <Text size="sm" c="dimmed">
                    {_pageLabel(table)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {rowCount} {rowCount === 1 ? "row" : "rows"} ×{" "}
                    {columnCount} {columnCount === 1 ? "column" : "columns"}
                  </Text>
                  <Badge
                    size="sm"
                    color={CONFIDENCE_COLOR[table.confidence]}
                    variant="light"
                  >
                    {table.confidence}
                  </Badge>
                </Group>

                {table.confidenceNotes.map((note) => {
                  return (
                    <Text key={note} size="xs" c="dimmed" mt={4}>
                      {note}
                    </Text>
                  );
                })}

                {isMerged && (
                  <Group gap="xs" mt="xs">
                    <Text size="xs" c="dimmed">
                      <Trans>
                        Merged from {table.fragments.length} page fragments.
                      </Trans>
                    </Text>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      onClick={() => {
                        onSplit(index);
                      }}
                    >
                      <Trans>Split</Trans>
                    </Button>
                  </Group>
                )}
              </Paper>
            );
          })}
        </Stack>
      </Radio.Group>

      {selectedTable && (
        <PdfPagePreview
          file={file}
          pageIndex={selectedTable.fragments[0]?.pageIndex ?? 0}
          highlight={selectedTable.fragments[0]?.bbox}
        />
      )}
    </Group>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/PdfTablePicker.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/
git commit -m "feat: add pdf table picker with confidence and page previews"
```

---

## Task 18: Wire PDF into the import flow

**Files:**
- Modify: `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx:36-60,179-187`
- Modify: `src/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts`
- Modify: `src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types.ts`
- Modify: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.ts`

- [ ] **Step 1: Add the parse options type**

In `useSaveDataset.ts`, add alongside `XlsxParseOptions`:

```ts
export type PdfParseOptions = {
  type: "pdf_file";
  /** Index into the detected table list. */
  tableIndex?: number;
  /** Inclusive, one-based page range the user limited detection to. */
  pageRange?: readonly [number, number];
  headerRows?: number;
  fillMergedCells?: boolean;
};
```

and add it to the `FileParseOptions` union.

- [ ] **Step 2: Add the load result and metadata types**

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

add `PdfDataSourceMetadata` to both `ManualUploadDataSourceMetadata` and
`DataSourceMetadata`, and import `PdfFileLoadResult` and `PdfParseOptions`
alongside the existing imports.

In `useLoadManualUploadFile.ts`, add:

```ts
export type PdfFileLoadResult = BaseLoadResult & {
  /** Every table we detected, so the picker can offer them all. */
  detectedTables: readonly ScoredTable[];
  /** Which one is currently selected. */
  tableIndex: number;
  pageCount: number;
  columns: DuckDbColumnSchema[];
  fingerprint: PdfTableFingerprint;
};
```

- [ ] **Step 3: Add the pdf branch to the loader**

In `useLoadManualUploadFile.ts`, add a `.with({ type: "pdf_file" }, ...)` arm
to the mutation's `match`, before `.exhaustive()`:

```ts
        .with({ type: "pdf_file" }, async (pdfParseOptions) => {
          const { datasetId, tableIndex = 0, pageRange } = pdfParseOptions;
          const sniff = await sniffPdfFile({ file, pageRange });

          const selectedTable = sniff.tables[tableIndex] ?? sniff.tables[0];
          if (!selectedTable) {
            throw new Error("No tables were detected in this PDF.");
          }

          const headerRows =
            pdfParseOptions.headerRows ?? selectedTable.headerRows;
          const csv = pdfTableToCsv({
            cells: selectedTable.cells,
            headerRows,
          });
          const fingerprint = await computePdfTableFingerprint({
            cells: selectedTable.cells,
            headerRows,
          });

          // Reuse the CSV import path wholesale: the extracted table is now
          // just a CSV, so DuckDB's sniffer types it exactly as it would a
          // real one. Marking the local row pinned is what keeps the
          // original PDF from being evicted or cleared (AVA-317).
          const csvFile = new File([csv], `${datasetId}.csv`, {
            type: MIMEType.TEXT_CSV,
          });
          const csvSniff = await LocalDatasetClient.startPdfImport({
            datasetId,
            workspaceId: workspace.id,
            userId: user!.id as UserId,
            file,
            csvFile,
          });

          const loadResult: PdfFileLoadResult = {
            datasetId,
            numRows: Math.max(0, selectedTable.cells.length - headerRows),
            detectedTables: sniff.tables,
            tableIndex: sniff.tables.indexOf(selectedTable),
            pageCount: sniff.pageCount,
            columns: csvSniff.columns,
            fingerprint,
          };
          pendingPreviewRowsRef.value = csvSniff.previewRows;
          return loadResult;
        })
```

Add a `_buildDataSourceMetadataFromLoadResult` arm mirroring the XLSX one, and
the corresponding imports.

- [ ] **Step 4: Add `startPdfImport` to LocalDatasetClient**

In `LocalDatasetClient.ts`, add a mutation that mirrors `startCsvImport` but
stores the **PDF** as the pinned source bytes while transcoding the derived
CSV:

```ts
function _makeStartPdfImport(
  context: Readonly<LocalDatasetMutationContext>,
): LocalDatasetMutationRecord["startPdfImport"] {
  return async (params) => {
    const logger = context.logger.appendName("startPdfImport");
    logger.log("Starting PDF import (sniff phase)", {
      datasetId: params.datasetId,
      size: params.file.size,
    });

    const sniff = await DuckDbClient.sniffCsv({
      file: params.csvFile,
      maxPreviewRows: PREVIEW_ROW_COUNT,
    });

    // The pinned bytes are the ORIGINAL PDF, not the derived CSV. The CSV
    // can be regenerated from the PDF; the PDF cannot be regenerated from
    // anything. See AVA-317.
    await AvaDexie.DB.LocalDataset.put({
      datasetId: params.datasetId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      parquetData: undefined,
      parseStatus: "parsing",
      parseStartedAt: Date.now(),
      parseFailedReason: undefined,
      sourceBytes: params.file,
      sourceFileName: params.file.name,
      sourceFileType: "pdf",
      sourceFileSize: params.file.size,
      lastSourceAccessedAt: Date.now(),
      isSourcePinned: true,
      parseOptions: undefined,
    });

    void runBackgroundParquetTranscoding({
      datasetId: params.datasetId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      source: {
        kind: "csv",
        file: params.csvFile,
        options: { type: "csv" },
      },
    });

    return sniff;
  };
}
```

Add it to `LocalDatasetMutationRecord`, to the returned record, and to the
exported mutation name list.

Note this deliberately bypasses `_maybeCacheSourceBytes`: a retained original
is not subject to the per-file cache cap, because refusing to keep a 250MB
PDF would silently break the retention guarantee for large documents.

- [ ] **Step 5: Accept PDFs in the upload form**

In `ManualUploadView.tsx`, extend `_fileMimeTypeToSourceType`:

```ts
function _fileMimeTypeToSourceType(
  file: File,
): "csv_file" | "xlsx_file" | "pdf_file" {
  const lowerFileName = file.name.toLowerCase();

  if (file.type.startsWith("text/csv") || lowerFileName.endsWith(".csv")) {
    return "csv_file";
  }

  if (
    file.type === MIMEType.APPLICATION_OPENXML_EXCEL ||
    file.type === MIMEType.APPLICATION_MS_EXCEL ||
    lowerFileName.endsWith(".xlsx")
  ) {
    return "xlsx_file";
  }

  if (file.type === "application/pdf" || lowerFileName.endsWith(".pdf")) {
    return "pdf_file";
  }

  throw new Error(`Unsupported file type: ${file.type}`);
}
```

and update the `FileUploadForm` props:

```tsx
          label={t`Upload a file`}
          description={t`Select an Excel, CSV, or PDF file from your computer to import`}
          accept={[
            MIMEType.TEXT_CSV,
            MIMEType.APPLICATION_MS_EXCEL,
            MIMEType.APPLICATION_OPENXML_EXCEL,
            "application/pdf",
          ]}
```

- [ ] **Step 6: Add the save branch**

In `useSaveDataset.ts`, add `_savePdfDataset` mirroring `_saveXlsxDataset`:

```ts
async function _savePdfDataset(
  options: Readonly<{
    context: DatasetInsertContext;
    payload: Extract<DataSourceMetadata, { sourceType: "pdf_file" }>;
  }>,
): Promise<Dataset.T> {
  const { datasetLoadResult, onlineStorageAllowed, parseOptions, sizeInBytes } =
    options.payload;
  const selectedTable =
    datasetLoadResult.detectedTables[datasetLoadResult.tableIndex];

  if (!selectedTable) {
    throw new Error("The selected PDF table is no longer available.");
  }

  return DatasetClient.insertPdfFileDataset({
    datasetId: datasetLoadResult.datasetId,
    workspaceId: options.context.workspaceId,
    datasetName: options.context.datasetName,
    datasetDescription: options.context.datasetDescription,
    columns: _duckDbColumnsToImportedColumns(datasetLoadResult.columns).map(
      snakeCaseKeysShallow,
    ),
    isInCloudStorage: onlineStorageAllowed,
    sizeInBytes,
    // The original is retained whenever we can keep it, which is always for
    // a PDF: see AVA-317.
    hasOriginalFile: true,
    regions: selectedTable.fragments.map((fragment) => {
      return { page: fragment.pageIndex, bbox: fragment.bbox };
    }),
    detectionMode: selectedTable.detectionMode,
    gridX: selectedTable.gridX.length > 0 ? selectedTable.gridX : undefined,
    gridY: selectedTable.gridY.length > 0 ? selectedTable.gridY : undefined,
    // Phase A stores the page range as two integer columns, not a tuple.
    // The worker and parse options still pass a `[start, end]` tuple around
    // internally; it is only flattened here, at the persistence boundary.
    pageRangeStart: parseOptions.pageRange?.[0],
    pageRangeEnd: parseOptions.pageRange?.[1],
    headerRows: parseOptions.headerRows ?? selectedTable.headerRows,
    fillMergedCells: parseOptions.fillMergedCells ?? true,
    fingerprint: datasetLoadResult.fingerprint,
  });
}
```

add the `.with({ sourceType: "pdf_file" }, ...)` arm to
`_saveDatasetFromValues`, and add `insertPdfFileDataset` to
`createDatasetMutations.ts` calling `rpc_datasets__add_pdf_file_dataset` with
the parameters defined in Phase A Task 5.

- [ ] **Step 7: Render the picker**

In `ManualUploadView.tsx`, render `PdfTablePicker` above `DatasetImportForm`
when `dataSourceMetadata?.sourceType === "pdf_file"`, wiring `onSelect` to
`onRequestFileParse` with an updated `tableIndex` so selecting a different
table re-parses exactly as changing an Excel sheet does.

- [ ] **Step 8: Verify**

```bash
pnpm type-check
pnpm lint
pnpm vitest run src/views/DataManagerApp/DataImportView/
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: wire pdf import through the manual upload flow"
```

---

## Task 19: Synthetic fixtures for the uncovered cases

**Files:**
- Create: `scripts/generate-pdf-test-fixtures/generate-pdf-test-fixtures.ts`
- Create: `public/test-data/pdf/synthetic-scanned-no-text-layer.pdf`
- Create: `public/test-data/pdf/synthetic-fully-ruled-statistics.pdf`
- Create: `public/test-data/pdf/synthetic-financial-statement.pdf`
- Modify: `public/test-data/pdf/README.md`

The three real fixtures leave three gaps, listed in that README. These must be
generated because no suitably licensed real sample was available, and because
generated content is exactly right here: we are testing structural handling,
not text fidelity.

- [ ] **Step 1: Write the generator**

**Use Playwright, not jspdf.** jspdf cannot produce the scanned fixture: it
needs a raster of rendered text, and there is no canvas in a Node script.
Playwright is already a dev dependency and Chromium is already installed, so
`page.pdf()` gives us real browser-generated PDFs, which is also a more
realistic generator than a JS PDF writer.

Create `scripts/generate-pdf-test-fixtures/generate-pdf-test-fixtures.ts` as a
Playwright script that writes three files:

1. **`synthetic-fully-ruled-statistics.pdf`** — an HTML table with
   `border-collapse: collapse` and a visible border on **every** cell, so the
   lattice detector sees a complete grid. The three real fixtures use
   horizontal rules only, per journal house style, so nothing currently tests
   the full-grid path. Give it a two-level spanning header (`colspan`) and
   enough rows to break across three printed pages under a repeated
   `<thead>`. Produce with `page.pdf({ format: "A4" })`.

2. **`synthetic-financial-statement.pdf`** — a balance sheet where
   parentheses genuinely mean negative (`(1,234)`), with currency symbols and
   right-aligned numeric columns. This is the counterpart to the `n (%)` case:
   Task 3 must convert here and must not convert there, and only having both
   fixtures pins that behaviour down.

3. **`synthetic-scanned-no-text-layer.pdf`** — built in two passes. First
   render a normal HTML table and `page.screenshot()` it to PNG. Then load a
   second page whose entire body is `<img src="data:image/png;base64,...">`
   sized to the sheet, and `page.pdf()` that. The result contains a raster
   image and no text layer at all, which is the only way to exercise the
   `no_text_layer` guard.

All text may be lorem ipsum and all numbers randomly chosen. Nothing needs to
resemble a real document beyond its layout: we are testing structural
handling, not content.

Because scripts cannot use `Math.random()` reproducibly across runs, seed a
small deterministic PRNG so regenerating the fixtures does not produce a noisy
diff every time.

- [ ] **Step 2: Generate them**

Run: `pnpm vite-script scripts/generate-pdf-test-fixtures/generate-pdf-test-fixtures.ts`
Expected: three PDFs written to `public/test-data/pdf/`.

Verify the scanned one really has no text layer before trusting it:

```bash
pdftotext -q public/test-data/pdf/synthetic-scanned-no-text-layer.pdf - | wc -c
```

Expected: a value near zero. If it prints the table's text, the image
embedding did not work and the fixture is worthless for its purpose.

- [ ] **Step 3: Add tests using them**

Append to `src/workers/pdfSniff/pdfSniff.fixtures.test.ts`:

```ts
describe("synthetic fixtures", () => {
  it("refuses a scanned document with a diagnosis", async () => {
    const bytes = await readFile(
      "public/test-data/pdf/synthetic-scanned-no-text-layer.pdf",
    );
    const doc = await loadPdfDocument(new Uint8Array(bytes));
    const geometries = [];
    for (let p = 1; p <= doc.numPages; p += 1) {
      const page = await doc.getPage(p);
      const { geometry } = await extractPageGeometry(page, p - 1);
      geometries.push(geometry);
    }
    await doc.destroy();

    const result = detectTextLayer(geometries);
    expect(result.status).toBe("no_text_layer");
  }, 30_000);

  it("reads a fully ruled table via the lattice path", async () => {
    const tables = await detectTables(
      "public/test-data/pdf/synthetic-fully-ruled-statistics.pdf",
      [1],
    );

    expect(tables[0]!.detectionMode).toBe("lattice");
    expect(tables[0]!.confidence).toBe("high");
  }, 30_000);

  it("reads accounting negatives as negative numbers", async () => {
    // The mirror image of the n (%) test: here the parentheses really do
    // mean negative, and refusing to convert would be just as wrong as
    // over-converting was in the other direction.
    const tables = await detectTables(
      "public/test-data/pdf/synthetic-financial-statement.pdf",
      [1],
    );
    const allCells = tables.flatMap((t) => t.cells.flat());

    expect(allCells.some((cell) => /^-\d/u.test(cell))).toBe(true);
  }, 30_000);
});
```

Add `detectTextLayer` and `extractPageGeometry` to that file's imports.

- [ ] **Step 4: Update the fixtures README**

Replace the "Not covered by these fixtures" section with a "Synthetic
fixtures" section documenting the three new files, what each tests, and the
fact that they are generated by
`scripts/generate-pdf-test-fixtures/` and can be regenerated.

- [ ] **Step 5: Run and commit**

```bash
pnpm vitest run src/workers/pdfSniff/pdfSniff.fixtures.test.ts
git add scripts/ public/test-data/pdf/
git commit -m "test: add synthetic pdf fixtures for scanned, ruled, and financial cases"
```

---

## Task 20: Full verification

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

Inspect the output for the pdf.js chunk. It should be a **separate lazy
chunk**, not part of the main entry, because `PdfPagePreview` imports it
dynamically and the worker is its own bundle. If pdfjs appears in the main
chunk, find the static import that pulled it in and make it dynamic.

- [ ] **Step 3: Manual verification against a real file**

Start the app, drag `public/test-data/pdf/frontiers-peru-child-health-insurance.pdf`
onto the import dropzone, and confirm: tables are listed with confidences, the
page preview renders with a bounding box, selecting a different table
re-parses, and saving creates a dataset whose rows match the PDF.

Then repeat with `synthetic-scanned-no-text-layer.pdf` and confirm the scanned
diagnosis appears rather than a generic failure.

- [ ] **Step 4: Update the spec status**

Change the spec's status line from `design approved, not yet implemented` to
`implemented`.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: mark pdf import spec as implemented"
```

---

## Self-review notes

**Spec coverage.** Every spec section maps to a task: detection signals A, B,
C to Tasks 7, 6, 8; confidence to Task 11; the worker architecture to Task 12;
value normalisation and DuckDB typing to Tasks 3 and 14; the fingerprint to
Task 15; the picker and preview to Tasks 16 and 17; page range to Task 12's
`MAX_PAGES_WITHOUT_RANGE` and the `too_many_pages` error; the error-handling
table to Task 12's `PdfSniffError` union; testing to Tasks 13 and 19.

**Two deliberate deviations from the spec**, both flagged where they occur:

1. **Percent handling.** The spec's diagram showed `12%` becoming `0.12`.
   Task 3 makes it `12` and updates the spec, because rescaling makes an
   imported table disagree with the document the user is reading beside it.
2. **`n (%)` values.** The spec listed parenthesised negatives and footnote
   markers separately; surveying the real fixtures showed these interact, and
   `361 (84.7)` must survive untouched. Task 3 treats parentheses as a sign
   only when they wrap the entire value.

**Known gaps carried forward, not silently dropped:**

- **Password-protected PDFs** produce the `password_required` error, but no
  password prompt UI is built. The user sees the message and cannot proceed.
  Worth a follow-up issue.
- **Extraction-disallowed permission flags** are not checked. pdf.js exposes
  them via `getPermissions()`; the spec listed this and no task implements it.
  Worth a follow-up issue.
- **The split control** calls `onSplit` and Task 18 wires selection, but
  unmerging a merged table back into per-page fragments is not implemented in
  the loader. It needs a `splitTableIndex` in the parse options.

Raise all three as Linear issues before starting implementation so they are
tracked rather than discovered later.
