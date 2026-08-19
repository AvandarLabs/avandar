import type { PageGeometry } from "../pdfSniff.types";

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
