import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { MapPBlock } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/MapPBlock";
import { DEFAULT_MAP_PBLOCK_SETTINGS } from "@/views/DashboardApp/AvaPage/pblocks/MapPBlock/parseMapPBlockSettings/parseMapPBlockSettings";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { PuckContext } from "@puckeditor/core";

const { mapViewerSpy } = vi.hoisted(() => {
  return { mapViewerSpy: vi.fn() };
});

vi.mock("@/views/GisApp/MapViewer/MapViewer", () => {
  return {
    MapViewer: (props: unknown) => {
      mapViewerSpy(props);
      return <div>map viewer</div>;
    },
  };
});

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const DASHBOARD_ID = "00000000-0000-4000-8000-000000000001";

function _puck(isEditing: boolean): PuckContext {
  return {
    renderDropZone: () => {
      return null;
    },
    metadata: {
      auth: "public",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "00000000-0000-4000-8000-000000000003",
    },
    isEditing,
    dragRef: null,
  };
}

describe("MapPBlock", () => {
  it("tells the author that dashboard filters do not reach the map", () => {
    render(
      <MapPBlock
        id="Map-1"
        {...DEFAULT_MAP_PBLOCK_SETTINGS}
        mapId={MAP_ID}
        puck={_puck(true)}
      />,
    );

    expect(
      screen.getByText("Dashboard filters don't apply to this map yet."),
    ).toBeInTheDocument();
  });

  it("shows readers the map without the authoring note", () => {
    render(
      <MapPBlock
        id="Map-1"
        {...DEFAULT_MAP_PBLOCK_SETTINGS}
        mapId={MAP_ID}
        puck={_puck(false)}
      />,
    );

    expect(
      screen.queryByText("Dashboard filters don't apply to this map yet."),
    ).not.toBeInTheDocument();
    expect(mapViewerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({ type: "snapshot", mapId: MAP_ID }),
      }),
    );
  });

  it("asks the author to pick a map before one is chosen", () => {
    render(
      <MapPBlock
        id="Map-1"
        {...DEFAULT_MAP_PBLOCK_SETTINGS}
        puck={_puck(true)}
      />,
    );

    expect(
      screen.getByText("Pick a map in this block's settings."),
    ).toBeInTheDocument();
  });
});
