import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { render, screen } from "@/test-utils";
import { PublishMapLayersPreview } from "@/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersPreview";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const { prepareMapSnapshotsMock } = vi.hoisted(() => {
  return { prepareMapSnapshotsMock: vi.fn() };
});

vi.mock(
  "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots",
  () => {
    return { prepareMapSnapshots: prepareMapSnapshotsMock };
  },
);

const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;

function _makeDashboard(content: unknown[]): Dashboard.T {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    workspaceId: "00000000-0000-4000-8000-000000000002",
    updatedAt: "2026-11-09T00:00:00Z",
    config: { root: { props: { title: "Coverage" } }, content },
  } as unknown as Dashboard.T;
}

function _makeSnapshot(): MapSnapshot {
  const layer = MapLayer.makeEmpty("Schools");
  const point: GeoJSON.Feature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties: {},
  };
  return {
    version: 1,
    mapId: MAP_ID,
    mapName: "Coverage risk",
    config: AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer,
    }),
    layers: [
      {
        layerId: layer.id,
        featureCollection: { type: "FeatureCollection", features: [point] },
        aggregation: undefined,
      },
    ],
  };
}

function _renderPreview(dashboard: Dashboard.T): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PublishMapLayersPreview dashboard={dashboard} />
    </QueryClientProvider>,
  );
}

describe("PublishMapLayersPreview", () => {
  beforeEach(() => {
    prepareMapSnapshotsMock.mockReset();
  });

  it("lists each map's published layers with their feature counts", async () => {
    prepareMapSnapshotsMock.mockResolvedValue([_makeSnapshot()]);

    _renderPreview(
      _makeDashboard([{ type: "Map", props: { id: "Map-1", mapId: MAP_ID } }]),
    );

    expect(await screen.findByText("Coverage risk")).toBeInTheDocument();
    expect(screen.getByText("Schools: 1 feature")).toBeInTheDocument();
  });

  it("shows nothing for a dashboard without maps", () => {
    _renderPreview(_makeDashboard([]));

    expect(screen.queryByText("Maps")).toBeNull();
    expect(prepareMapSnapshotsMock).not.toHaveBeenCalled();
  });
});
