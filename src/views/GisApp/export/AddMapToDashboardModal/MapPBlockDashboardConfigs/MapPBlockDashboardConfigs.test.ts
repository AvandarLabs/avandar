import { describe, expect, it } from "vitest";
import { MapPBlockDashboardConfigs } from "@/views/GisApp/export/AddMapToDashboardModal/MapPBlockDashboardConfigs/MapPBlockDashboardConfigs";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;

describe("MapPBlockDashboardConfigs", () => {
  it("appends a map block after a page's existing blocks", () => {
    const pageData = MapPBlockDashboardConfigs.createPageData({
      dashboardName: "Coverage risk",
      mapId: MAP_ID,
    });
    const withHeading: AvaPageData = {
      ...pageData,
      content: [
        {
          type: "HeadingBlock",
          props: { id: "h-1", text: "Week 34", level: 2, align: "left" },
        },
      ],
    };

    const updated = MapPBlockDashboardConfigs.appendToPageData({
      pageData: withHeading,
      mapId: MAP_ID,
    });

    expect(
      updated.content.map((item) => {
        return item.type;
      }),
    ).toEqual(["HeadingBlock", "Map"]);
    expect(updated.content[1]?.props).toMatchObject({
      mapId: MAP_ID,
      view: { type: "saved" },
      heightPx: 480,
    });
  });

  it("gives each appended map block its own id", () => {
    const pageData = MapPBlockDashboardConfigs.createPageData({
      dashboardName: "Coverage risk",
      mapId: MAP_ID,
    });

    const updated = MapPBlockDashboardConfigs.appendToPageData({
      pageData,
      mapId: MAP_ID,
    });

    const [firstId, secondId] = updated.content.map((item) => {
      return item.props.id;
    });
    expect(firstId).not.toBe(secondId);
  });

  it("starts a new dashboard titled with its name and holding the map", () => {
    const pageData = MapPBlockDashboardConfigs.createPageData({
      dashboardName: "Coverage risk",
      mapId: MAP_ID,
    });

    expect(pageData.root.props?.title).toBe("Coverage risk");
    expect(pageData.content).toHaveLength(1);
    expect(pageData.content[0]?.type).toBe("Map");
  });
});
