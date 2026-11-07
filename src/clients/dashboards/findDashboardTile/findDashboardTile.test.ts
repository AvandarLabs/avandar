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
  it("finds a top-level tile", () => {
    expect(findDashboardTile(CONFIG, "DataViz-top")).toEqual({
      id: "DataViz-top",
      prompt: "Weekly cases",
      vizType: "line",
    });
  });

  it("finds a tile nested in a layout slot", () => {
    expect(findDashboardTile(CONFIG, "DataViz-nested")).toEqual({
      id: "DataViz-nested",
      prompt: "By borough",
      vizType: "bar",
    });
  });

  it("returns undefined for a block id that is not in the config", () => {
    expect(findDashboardTile(CONFIG, "DataViz-gone")).toBeUndefined();
  });

  it("returns undefined for a block that is not a tile", () => {
    expect(findDashboardTile(CONFIG, "Text-1")).toBeUndefined();
  });

  it("counts every tile at any depth", () => {
    expect(countDashboardTiles(CONFIG)).toBe(2);
  });
});
