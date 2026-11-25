import { describe, expect, it } from "vitest";
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";

const FIRST_MAP = "00000000-0000-4000-8000-0000000000f5";
const SECOND_MAP = "00000000-0000-4000-8000-0000000000f6";

const CONFIG = {
  root: { props: { title: "Coverage" } },
  content: [
    { type: "Map", props: { id: "Map-1", mapId: FIRST_MAP } },
    { type: "DataViz", props: { id: "DataViz-1", mapId: SECOND_MAP } },
    {
      type: "Section",
      props: {
        id: "Section-1",
        content: [
          { type: "Map", props: { id: "Map-2", mapId: SECOND_MAP } },
          { type: "Map", props: { id: "Map-3", mapId: FIRST_MAP } },
          { type: "Map", props: { id: "Map-4" } },
          { type: "Map", props: { id: "Map-5", mapId: "not-a-map" } },
        ],
      },
    },
  ],
};

describe("DashboardMapBlocks", () => {
  it("finds readable Map blocks at any depth", () => {
    expect(
      DashboardMapBlocks.getMapBlocks(CONFIG).map((block) => {
        return block.blockId;
      }),
    ).toEqual(["Map-1", "Map-2", "Map-3", "Map-4"]);
  });

  it("lists each picked map once", () => {
    expect(DashboardMapBlocks.getMapIds(CONFIG)).toEqual([
      FIRST_MAP,
      SECOND_MAP,
    ]);
  });
});
