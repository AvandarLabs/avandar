import type { PageGeometry } from "../pdfSniff.types";

import { describe, expect, it } from "vitest";

import { detectTextLayer } from "./detectTextLayer";

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
    marks: [],
    marksTruncated: false,
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
