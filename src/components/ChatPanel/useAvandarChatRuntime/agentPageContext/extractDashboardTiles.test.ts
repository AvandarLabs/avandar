import { describe, expect, it } from "vitest";
import {
  extractDashboardTile,
  extractDashboardTiles,
  extractSavedDashboardTile,
  extractSavedDashboardTiles,
} from "./extractDashboardTiles";

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

  it("reads charts nested three levels deep in layout blocks", () => {
    const tiles = extractDashboardTiles({
      content: [
        {
          type: "Section",
          props: {
            items: [
              {
                type: "Grid",
                props: {
                  r1c1: [
                    {
                      type: "Card",
                      props: { body: [_dataViz("Deep chart", "SELECT 4")] },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });

    expect(tiles).toEqual([
      { title: "Deep chart", chartType: "bar", sql: "SELECT 4" },
    ]);
  });

  it("reads charts stored in legacy zones", () => {
    const tiles = extractDashboardTiles({
      content: [_dataViz("Top", "SELECT 1")],
      zones: { "Columns-1:left": [_dataViz("In a zone", "SELECT 5", "pie")] },
    });

    expect(tiles).toEqual([
      { title: "Top", chartType: "bar", sql: "SELECT 1" },
      { title: "In a zone", chartType: "pie", sql: "SELECT 5" },
    ]);
  });
});

describe("extractDashboardTile", () => {
  it("finds a chart by its block id, with or without SQL", () => {
    const data = {
      content: [
        {
          type: "DataViz",
          props: {
            id: "b1",
            vizType: "line",
            nlQuery: { prompt: "Weekly cases", rawSql: "SELECT 1" },
          },
        },
        { type: "DataViz", props: { id: "b2", nlQuery: {} } },
      ],
    };

    expect(extractDashboardTile(data, "b1")).toEqual({
      title: "Weekly cases",
      chartType: "line",
      sql: "SELECT 1",
    });
    expect(extractDashboardTile(data, "b2")).toEqual({
      title: "Untitled chart",
      chartType: "table",
      sql: "",
    });
    expect(extractDashboardTile(data, "missing")).toBeUndefined();
  });
});

describe("saved config helpers", () => {
  const config = {
    root: { props: { title: "Saved", schemaVersion: 5 } },
    content: [_dataViz("Cases", "SELECT 1")],
  };

  it("extractSavedDashboardTiles reads a saved config's charts", () => {
    expect(extractSavedDashboardTiles(config)).toEqual([
      { title: "Cases", chartType: "bar", sql: "SELECT 1" },
    ]);
  });

  it("extractSavedDashboardTile reads one chart of a saved config", () => {
    expect(extractSavedDashboardTile(config, "Cases")?.sql).toBe("SELECT 1");
  });

  it("extractSavedDashboardTiles returns none for a config of no shape", () => {
    expect(extractSavedDashboardTiles(null)).toEqual([]);
  });

  it("extractSavedDashboardTile returns nothing for a config of no shape", () => {
    expect(extractSavedDashboardTile(null, "Cases")).toBeUndefined();
  });
});
