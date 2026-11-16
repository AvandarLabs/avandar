import { describe, expect, it } from "vitest";
import {
  getConvertKinds,
  getMultiplyPreset,
  makeConvertForKind,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/convertDefaults/convertDefaults";

describe("convertDefaults", () => {
  it("offers padding only for whole-number and text sources", () => {
    expect(getConvertKinds("bigint")).toContain("pad_text");
    expect(getConvertKinds("varchar")).toContain("pad_text");
    expect(getConvertKinds("double")).toEqual([
      "none",
      "parse_date",
      "multiply",
      "trim_and_fix_case",
    ]);
  });

  it("starts a date read with the detected format, and keeps a conversion of the same kind", () => {
    expect(
      makeConvertForKind({
        kind: "parse_date",
        current: undefined,
        detectedDateFormat: "%m/%d/%Y",
      }),
    ).toEqual({ kind: "parse_date", format: "%m/%d/%Y" });
    const current = { kind: "pad_text", length: 9 } as const;
    expect(
      makeConvertForKind({
        kind: "pad_text",
        current,
        detectedDateFormat: undefined,
      }),
    ).toBe(current);
    expect(
      makeConvertForKind({
        kind: "none",
        current,
        detectedDateFormat: undefined,
      }),
    ).toBeUndefined();
  });

  it("starts the other conversions at their defaults", () => {
    const options = { current: undefined, detectedDateFormat: undefined };
    expect(makeConvertForKind({ ...options, kind: "parse_date" })).toEqual({
      kind: "parse_date",
      format: "%Y-%m-%d",
    });
    expect(makeConvertForKind({ ...options, kind: "pad_text" })).toEqual({
      kind: "pad_text",
      length: 5,
    });
    expect(makeConvertForKind({ ...options, kind: "multiply" })).toEqual({
      kind: "multiply",
      factor: 1 / 12,
    });
    expect(
      makeConvertForKind({ ...options, kind: "trim_and_fix_case" }),
    ).toEqual({
      kind: "trim_and_fix_case",
      letterCase: "keep",
    });
  });

  it("names a factor's preset", () => {
    expect(getMultiplyPreset(12)).toBe("years_to_months");
    expect(getMultiplyPreset(1 / 365.25)).toBe("days_to_years");
    expect(getMultiplyPreset(3)).toBeUndefined();
  });
});
