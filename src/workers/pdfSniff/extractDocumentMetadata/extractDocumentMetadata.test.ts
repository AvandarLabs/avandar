import { describe, expect, it } from "vitest";
import { extractDocumentMetadata } from "./extractDocumentMetadata";
import type { PageGeometry, TextItem } from "../pdfSniff.types";

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
