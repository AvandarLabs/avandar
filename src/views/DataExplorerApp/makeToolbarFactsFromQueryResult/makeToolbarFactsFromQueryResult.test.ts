import { describe, expect, it } from "vitest";
import { makeToolbarFactsFromQueryResult } from "@/views/DataExplorerApp/makeToolbarFactsFromQueryResult/makeToolbarFactsFromQueryResult";

describe("makeToolbarFactsFromQueryResult", () => {
  it("counts numeric and date columns", () => {
    expect(
      makeToolbarFactsFromQueryResult({
        hasResult: true,
        rowCount: 20,
        columns: [
          { name: "x", dataType: "bigint" },
          { name: "y", dataType: "double" },
          { name: "onset", dataType: "date" },
          { name: "district", dataType: "varchar" },
        ],
      }),
    ).toEqual({
      hasResult: true,
      rowCount: 20,
      columnCount: 4,
      numericColumnCount: 2,
      dateColumnCount: 1,
    });
  });

  it("counts timestamp and time columns as date columns", () => {
    expect(
      makeToolbarFactsFromQueryResult({
        hasResult: true,
        rowCount: 1,
        columns: [
          { name: "seen_at", dataType: "timestamp" },
          { name: "clock", dataType: "time" },
          { name: "flag", dataType: "boolean" },
        ],
      }),
    ).toMatchObject({ dateColumnCount: 2, numericColumnCount: 0 });
  });

  it("reports zero counts for an empty result", () => {
    expect(
      makeToolbarFactsFromQueryResult({
        hasResult: false,
        rowCount: 0,
        columns: [],
      }),
    ).toEqual({
      hasResult: false,
      rowCount: 0,
      columnCount: 0,
      numericColumnCount: 0,
      dateColumnCount: 0,
    });
  });
});
