import { describe, expect, it } from "vitest";
import {
  countDashboardTiles,
  findDashboardTile,
} from "@/clients/dashboards/findDashboardTile/findDashboardTile";

const CONFIG = {
  root: { props: { title: "Measles" } },
  content: [
    {
      type: "DataViz",
      props: {
        id: "DataViz-top",
        nlQuery: { prompt: "Weekly cases" },
        vizType: "line",
      },
    },
    {
      type: "Grid",
      props: {
        id: "Grid-1",
        r1c1: [
          {
            type: "DataViz",
            props: {
              id: "DataViz-nested",
              nlQuery: { prompt: "By borough" },
              vizType: "bar",
            },
          },
        ],
      },
    },
    { type: "Text", props: { id: "Text-1" } },
  ],
};

describe("findDashboardTile", () => {
  it("finds a top-level and a nested tile", () => {
    expect(findDashboardTile(CONFIG, "DataViz-top")).toEqual({
      id: "DataViz-top",
      prompt: "Weekly cases",
      vizType: "line",
    });
    expect(findDashboardTile(CONFIG, "DataViz-nested")).toEqual({
      id: "DataViz-nested",
      prompt: "By borough",
      vizType: "bar",
    });
  });

  it("returns undefined for a missing block or a non-tile block", () => {
    expect(findDashboardTile(CONFIG, "DataViz-gone")).toBeUndefined();
    expect(findDashboardTile(CONFIG, "Text-1")).toBeUndefined();
  });

  it("counts every tile at any depth", () => {
    expect(countDashboardTiles(CONFIG)).toBe(2);
  });
});
