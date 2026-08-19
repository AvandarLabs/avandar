import { describe, expect, it } from "vitest";
import { buildXlsxReadRange } from "@/clients/DuckDbClient/buildXlsxReadRange/buildXlsxReadRange";

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
