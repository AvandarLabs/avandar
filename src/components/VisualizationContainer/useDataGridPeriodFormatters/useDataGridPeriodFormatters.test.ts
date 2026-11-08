/**
 * A results grid reads a per-period cell with the same period labels and
 * value formatting as the record page's period table.
 */
import { describe, expect, it } from "vitest";
import { useDataGridPeriodFormatters } from "@/components/VisualizationContainer/useDataGridPeriodFormatters/useDataGridPeriodFormatters";
import { renderHook, TestProviders } from "@/test-utils";

function _renderFormatters() {
  return renderHook(
    () => {
      return useDataGridPeriodFormatters();
    },
    { wrapper: TestProviders },
  ).result.current;
}

describe("useDataGridPeriodFormatters", () => {
  it.each([
    ["day", "2026-01-05", "Jan 5, 2026"],
    ["week", "2026-01-05", "Week of Jan 5, 2026"],
    ["month", "2026-01-01", "Jan 2026"],
    ["quarter", "2026-04-01", "Q2 2026"],
    ["year", "2026-01-01", "2026"],
  ] as const)(
    "labels a %s that starts on %s as %s",
    (bucketGrain, bucket, label) => {
      expect(_renderFormatters().formatPeriod(bucket, bucketGrain)).toBe(label);
    },
  );

  it("leaves a period of an unknown length as its first day", () => {
    expect(_renderFormatters().formatPeriod("2026-04-01", undefined)).toBe(
      "2026-04-01",
    );
  });

  it("shows a number to at most two decimals", () => {
    const { formatValue } = _renderFormatters();

    expect(formatValue(38.456)).toBe("38.46");
    expect(formatValue(38)).toBe("38");
    expect(formatValue(1234.5)).toBe("1,234.5");
  });

  it("shows a missing value as blank and text as it is", () => {
    const { formatValue } = _renderFormatters();

    expect(formatValue(null)).toBe("");
    expect(formatValue("Rash")).toBe("Rash");
  });
});
