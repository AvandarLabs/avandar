import { describe, expect, it } from "vitest";
import {
  buildXlsxReadRange,
  buildXlsxWidthProbeRange,
  getXlsxColumnIndex,
} from "@/clients/DuckDbClient/buildXlsxReadRange/buildXlsxReadRange";

describe("buildXlsxReadRange", () => {
  it("returns no range when nothing is skipped", () => {
    expect(buildXlsxReadRange(0)).toBeUndefined();
  });

  it("returns no range for a negative skip count", () => {
    expect(buildXlsxReadRange(-2)).toBeUndefined();
  });

  it("starts the range on the first row after the skipped rows", () => {
    expect(buildXlsxReadRange(3)).toBe("A4:XFD1048576");
  });

  it("starts on row 2 when one row is skipped", () => {
    expect(buildXlsxReadRange(1)).toBe("A2:XFD1048576");
  });

  it("truncates a fractional skip count rather than emitting a bad range", () => {
    expect(buildXlsxReadRange(2.7)).toBe("A3:XFD1048576");
  });
});

describe("buildXlsxReadRange with a detected width", () => {
  it("bounds the range at the sheet's last populated column", () => {
    expect(buildXlsxReadRange(3, "X")).toBe("A4:X1048576");
  });

  it("falls back to the format's last column when the width is unknown", () => {
    expect(buildXlsxReadRange(3, undefined)).toBe("A4:XFD1048576");
  });

  it("still returns no range when nothing is skipped", () => {
    expect(buildXlsxReadRange(0, "X")).toBeUndefined();
  });
});

describe("buildXlsxWidthProbeRange", () => {
  it("starts on the header row and spans the probe window", () => {
    expect(buildXlsxWidthProbeRange(3, 25)).toBe("A4:XFD28");
  });

  it("starts on row 1 when nothing is skipped", () => {
    expect(buildXlsxWidthProbeRange(0, 25)).toBe("A1:XFD25");
  });

  it("reads at least the header row", () => {
    expect(buildXlsxWidthProbeRange(3, 0)).toBe("A4:XFD4");
  });
});

describe("getXlsxColumnIndex", () => {
  it("indexes single-letter columns", () => {
    expect(getXlsxColumnIndex("A")).toBe(1);
    expect(getXlsxColumnIndex("Z")).toBe(26);
  });

  it("orders a longer label after a shorter one, unlike a lexical sort", () => {
    expect(getXlsxColumnIndex("AA")).toBeGreaterThan(getXlsxColumnIndex("Z"));
  });

  it("indexes the format's last column", () => {
    expect(getXlsxColumnIndex("XFD")).toBe(16384);
  });

  it("returns 0 for a label that is not a column reference", () => {
    expect(getXlsxColumnIndex("A1")).toBe(0);
  });
});
