import type { BBox, PdfValueUnit, TextItem } from "../pdfSniff.types";

import {
  getLineSpanFromTextItem,
  isSameLineRun,
} from "../assembleLabels/assembleLabels";
import { normalizeCellValue } from "../normalizeCellValue/normalizeCellValue";

/**
 * A text item that is entirely numeric, and so can head a quantity.
 *
 * Currency and a trailing percent are allowed inside it because pdf.js
 * sometimes delivers `$3,000` or `2.6%` as one item and sometimes as two.
 */
const NUMERIC_HEAD = /^[$€£¥₹]?\s*-?\d[\d,. ]*\s*%?$/u;

/** What `normalizeCellValue` leaves behind when a value really is a number. */
const NUMERIC = /^-?\d+(\.\d+)?$/u;

/**
 * Magnitude suffixes and what they multiply the figure by.
 *
 * A `Map` rather than an object literal so that a stray item reading
 * `constructor` cannot look up as a scale factor.
 */
const SCALE_TOKENS = new Map<string, number>([
  ["k", 1_000],
  ["thousand", 1_000],
  ["m", 1_000_000],
  ["mn", 1_000_000],
  ["million", 1_000_000],
  ["bn", 1_000_000_000],
  ["billion", 1_000_000_000],
]);

/**
 * A share printed beside a figure, as in `3 M (15%)`.
 *
 * It is a second measurement of the same bar, not the first one's unit, so it
 * is absorbed into the run and then ignored. Reading it as the unit would
 * claim the bar IS 3%; leaving it loose is what made it a label of its own.
 */
const SHARE_ANNOTATION = /^\(\s*-?\d+(?:\.\d+)?\s*%\s*\)$/u;

/** A currency printed after the figure, as in `3,000 US$`. */
const CURRENCY_TOKEN = /^(?:[$€£¥₹]|us\$|usd|eur|gbp)$/iu;

/** One figure, with everything printed against it read as part of it. */
export type AssembledQuantity = {
  /** The run's source text, spaces normalised: `"3 M (15%)"`. */
  text: string;
  /** Numeric, normalised, and scaled by any magnitude suffix: `"3000000"`. */
  value: string;
  unit: PdfValueUnit;
  /**
   * The numeral itself, and so the anchor for proximity pairing.
   *
   * A figure sits where its digits are printed. A suffix or a share extends
   * the run rightwards without moving the figure, and pairing on the run's
   * centre instead drags every bar's amount towards the next row's label:
   * measured on the OCHA funding chart, that hands WASH's $3M to
   * "Log and Supply".
   */
  item: TextItem;
  /** The whole run's box, so provenance highlights everything that was read. */
  bbox: BBox;
};

export type QuantitySplit = {
  quantities: readonly AssembledQuantity[];
  /** Everything that is not part of a figure, in the region's own order. */
  labelItems: readonly TextItem[];
};

/** What an item following a numeral contributes to it, if anything. */
type Continuation =
  | { kind: "scale"; factor: number }
  | { kind: "percent" }
  | { kind: "currency" }
  | { kind: "share" };

function _continuationOf(rawText: string): Continuation | undefined {
  const token = rawText.trim();

  const factor = SCALE_TOKENS.get(token.toLowerCase());
  if (factor !== undefined) {
    return { kind: "scale", factor };
  }
  if (token === "%") {
    return { kind: "percent" };
  }
  if (SHARE_ANNOTATION.test(token)) {
    return { kind: "share" };
  }
  if (CURRENCY_TOKEN.test(token)) {
    return { kind: "currency" };
  }
  return undefined;
}

/** The unit the numeral itself carries, before any following item. */
function _headUnit(rawText: string): PdfValueUnit {
  if (/[$€£¥₹]/u.test(rawText)) {
    return "usd";
  }
  return rawText.trim().endsWith("%") ? "percent" : "n";
}

/**
 * Applies a magnitude suffix without inventing digits.
 *
 * `toPrecision(15)` drops the binary floating-point noise that turns
 * `1.1 * 1e6` into `1100000.0000000002`, which is well short of the 17 digits
 * at which a real value could be altered.
 */
function _scaled(normalized: string, factor: number): string {
  return String(Number((Number(normalized) * factor).toPrecision(15)));
}

function _runBBox(run: readonly TextItem[]): BBox {
  return [
    Math.min(
      ...run.map((item) => {
        return item.x;
      }),
    ),
    Math.min(
      ...run.map((item) => {
        return item.y;
      }),
    ),
    Math.max(
      ...run.map((item) => {
        return item.x + item.width;
      }),
    ),
    Math.max(
      ...run.map((item) => {
        return item.y + item.height;
      }),
    ),
  ];
}

/** Reading order: top line first, then left to right within the line. */
function _readingOrder(a: TextItem, b: TextItem): number {
  const dy = b.y - a.y;
  return Math.abs(dy) > 1 ? dy : a.x - b.x;
}

/**
 * Splits a region's text into the figures it prints and everything else.
 *
 * Exists because a quantity is routinely more than one text item. The OCHA
 * funding chart prints `3M (15%)` as `"3"`, `"M"` and `"(15%)"`, and reading
 * those as a value plus a label is not merely untidy: the orphaned `"M (15%)"`
 * assembles into a label 13 points from the figure, while the pillar name the
 * figure belongs to is 172 points away, so every bar pairs with its own unit
 * and wins on distance by enough not to be flagged. Deciding what is a figure
 * has to happen before deciding what is a label.
 *
 * Adjacency is `assembleLabels`' own same-line test, deliberately: a suffix
 * beside a number and a second word beside the first are the same measurement
 * of the same page, and a second set of thresholds here would drift from the
 * tuned ones there.
 *
 * Both halves come back in the region's original item order, because that
 * order decides how `assembleLabels` agglomerates and how ties break during
 * pairing. Only the scan runs in reading order.
 */
export function assembleQuantities(items: readonly TextItem[]): QuantitySplit {
  const visible = items.filter((item) => {
    return item.text.trim().length > 0;
  });
  const scanOrder = [...visible].sort(_readingOrder);

  const consumed = new Set<TextItem>();
  const byHead = new Map<TextItem, AssembledQuantity>();

  scanOrder.forEach((head, headIndex) => {
    if (consumed.has(head) || !NUMERIC_HEAD.test(head.text.trim())) {
      return;
    }

    const run: TextItem[] = [head];
    let span = getLineSpanFromTextItem(head);
    let factor = 1;
    let unit = _headUnit(head.text);

    for (let next = headIndex + 1; next < scanOrder.length; next += 1) {
      const candidate = scanOrder[next]!;
      const continuation = _continuationOf(candidate.text);
      if (
        continuation === undefined ||
        !isSameLineRun({
          a: span,
          b: getLineSpanFromTextItem(candidate),
        })
      ) {
        break;
      }

      consumed.add(candidate);
      run.push(candidate);
      span = { ...span, x1: Math.max(span.x1, candidate.x + candidate.width) };

      if (continuation.kind === "scale") {
        factor *= continuation.factor;
      } else if (continuation.kind === "percent" && unit === "n") {
        unit = "percent";
      } else if (continuation.kind === "currency" && unit === "n") {
        unit = "usd";
      }
    }

    const normalized = normalizeCellValue(head.text);
    byHead.set(head, {
      text: run
        .map((item) => {
          return item.text.trim();
        })
        .join(" "),
      value:
        factor !== 1 && NUMERIC.test(normalized)
          ? _scaled(normalized, factor)
          : normalized,
      unit,
      item: head,
      bbox: _runBBox(run),
    });
  });

  return {
    quantities: visible.flatMap((item) => {
      const quantity = byHead.get(item);
      return quantity ? [quantity] : [];
    }),
    labelItems: visible.filter((item) => {
      return !consumed.has(item) && !byHead.has(item);
    }),
  };
}
