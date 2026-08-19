import { describe, expect, it } from "vitest";
import { buildXlsxPreviewRange } from "@/workers/xlsxSniff/buildXlsxPreviewRange/buildXlsxPreviewRange";

describe("buildXlsxPreviewRange", () => {
  it("caps a long sheet at the requested row count", () => {
    expect(
      buildXlsxPreviewRange({ sheetRef: "A1:D300", rowsToSkip: 0, maxRows: 201 }),
    ).toBe("A1:D201");
  });

  it("keeps every row of a sheet shorter than the requested count", () => {
    expect(
      buildXlsxPreviewRange({ sheetRef: "A1:D23", rowsToSkip: 0, maxRows: 201 }),
    ).toBe("A1:D23");
  });

  it("starts after the skipped rows", () => {
    expect(
      buildXlsxPreviewRange({ sheetRef: "A1:X23", rowsToSkip: 3, maxRows: 201 }),
    ).toBe("A4:X23");
  });

  it("skips relative to the sheet's own first row", () => {
    expect(
      buildXlsxPreviewRange({ sheetRef: "B2:E10", rowsToSkip: 1, maxRows: 5 }),
    ).toBe("B3:E7");
  });

  it("returns nothing when the skip count consumes the whole sheet", () => {
    expect(
      buildXlsxPreviewRange({ sheetRef: "A1:D10", rowsToSkip: 10, maxRows: 20 }),
    ).toBeUndefined();
  });

  it("returns nothing for a sheet with no cell range", () => {
    expect(
      buildXlsxPreviewRange({ sheetRef: undefined, rowsToSkip: 0, maxRows: 20 }),
    ).toBeUndefined();
  });
});
