import { makeWdiParquetRelation } from "@pipelines/world-bank__wdi/makeWdiParquetRelation/makeWdiParquetRelation";
import { describe, expect, it } from "vitest";

function _relation(yearCoverage?: { minYear: number; maxYear: number }) {
  return makeWdiParquetRelation({
    tableBaseName: "WDICSV",
    csvPath: "/tmp/WDICSV.csv",
    csvColumns: [],
    yearCoverage,
  });
}

describe("makeWdiParquetRelation", () => {
  it("names the listing from the WDI presentation config", () => {
    expect(_relation().displayName).toBe("World Development Indicators (WDI)");
  });

  it("turns year coverage into coverage dates and year_coverage metadata", () => {
    const relation = _relation({ minYear: 1960, maxYear: 2023 });

    expect([
      relation.coverageStartDate?.toISOString(),
      relation.coverageEndDate?.toISOString(),
      relation.metadata,
    ]).toEqual([
      "1960-01-01T00:00:00.000Z",
      "2023-12-31T23:59:59.999Z",
      { year_coverage: { min_year: 1960, max_year: 2023 } },
    ]);
  });

  it("leaves coverage and metadata unset without year coverage", () => {
    const relation = _relation();

    expect([
      relation.coverageStartDate,
      relation.coverageEndDate,
      relation.metadata,
    ]).toEqual([undefined, undefined, undefined]);
  });
});
