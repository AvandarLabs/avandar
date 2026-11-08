import { describe, expect, it } from "vitest";
import { extractDashboardTiles } from "./extractDashboardTiles";

function _dataViz(prompt: string, rawSql: string, vizType = "bar"): unknown {
  return {
    type: "DataViz",
    props: { id: prompt, vizType, nlQuery: { prompt, rawSql } },
  };
}

describe("extractDashboardTiles", () => {
  it("lists charts in page order, including charts inside layout blocks", () => {
    const tiles = extractDashboardTiles({
      content: [
        _dataViz("Cases by month", "SELECT 1"),
        { type: "HeadingBlock", props: { text: "Deaths" } },
        {
          type: "Columns",
          props: { left: [_dataViz("Deaths by state", "SELECT 2", "line")] },
        },
      ],
    });

    expect(tiles).toEqual([
      { title: "Cases by month", chartType: "bar", sql: "SELECT 1" },
      { title: "Deaths by state", chartType: "line", sql: "SELECT 2" },
    ]);
  });

  it("skips charts with no SQL and names untitled ones", () => {
    expect(
      extractDashboardTiles({
        content: [_dataViz("", "SELECT 3"), _dataViz("Empty", "  ")],
      }),
    ).toEqual([{ title: "Untitled chart", chartType: "bar", sql: "SELECT 3" }]);
  });

  it("returns nothing for data it cannot read", () => {
    expect(extractDashboardTiles(undefined)).toEqual([]);
    expect(extractDashboardTiles({ content: "nope" })).toEqual([]);
  });
});
