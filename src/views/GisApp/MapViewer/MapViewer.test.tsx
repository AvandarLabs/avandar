import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { render, screen, waitFor, within } from "@/test-utils";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import { MapViewer } from "@/views/GisApp/MapViewer/MapViewer";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";
import type {
  MapViewerDisplay,
  MapViewerSource,
} from "@/views/GisApp/MapViewer/MapViewer.types";

const {
  downloadMapSnapshotMock,
  placesState,
  useGetDatasetsMock,
  useGetMapByIdMock,
  useMapCanvasSpy,
  useMapLayerRenderingMock,
  usePlacesDatasetIdsMock,
} = vi.hoisted(() => {
  return {
    downloadMapSnapshotMock: vi.fn(),
    placesState: { placesDatasetIds: new Set<string>() },
    useGetDatasetsMock: vi.fn(),
    useGetMapByIdMock: vi.fn(),
    useMapCanvasSpy: vi.fn(),
    useMapLayerRenderingMock: vi.fn(),
    usePlacesDatasetIdsMock: vi.fn(),
  };
});

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => {
  return {};
});
vi.mock("@/views/GisApp/MapCanvas/useMapCanvas", () => {
  return {
    useMapCanvas: (options: unknown) => {
      useMapCanvasSpy(options);
      return {
        containerRef: { current: null },
        mapInstance: { mapRef: { current: undefined } },
      };
    },
  };
});
vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { useGetById: useGetMapByIdMock } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { useGetAll: useGetDatasetsMock } };
});
vi.mock("@/clients/places/VirtualPlacesStore/VirtualPlacesStore", () => {
  return {
    VirtualPlacesStore: {
      usePlacesDatasetIds: (workspaceId: string) => {
        usePlacesDatasetIdsMock(workspaceId);
        return placesState.placesDatasetIds;
      },
    },
  };
});
vi.mock(
  "@/views/GisApp/useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapConfig",
  () => {
    return {
      useHydratedMapConfig: ({ config }: { config: AvaMapConfig.T }) => {
        return {
          config,
          issues: [],
          readyColumns: [],
          readyAttributes: [],
        };
      },
    };
  },
);
vi.mock("@/views/GisApp/layers/useMapLayerRendering", () => {
  return { useMapLayerRendering: useMapLayerRenderingMock };
});
vi.mock(
  "@/views/GisApp/useRequestSpatialExtension/useRequestSpatialExtension",
  () => {
    return { useRequestSpatialExtension: vi.fn() };
  },
);
vi.mock(
  "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient",
  () => {
    return {
      PublicMapSnapshotStorageClient: {
        downloadMapSnapshot: downloadMapSnapshotMock,
      },
    };
  },
);

const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000aa" as Workspace.Id;
const MAP_ID = "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id;
const JITTER_SALT = "map-secret-salt";
const DISPLAY: MapViewerDisplay = {
  camera: { type: "saved" },
  heightPx: 400,
  showLegend: true,
  isInteractive: true,
};
const LIVE_SOURCE: MapViewerSource = {
  type: "live",
  mapId: MAP_ID,
  workspaceId: WORKSPACE_ID,
};
const SNAPSHOT_SOURCE: MapViewerSource = {
  type: "snapshot",
  mapId: MAP_ID,
  dashboardId: "00000000-0000-4000-8000-0000000000d1" as Dashboard.Id,
  snapshotRevision: "00000000-0000-4000-8000-0000000000e1",
};

function _makeMap(layers: readonly MapLayer.T[]): AvaMap.T {
  return Model.make("AvaMap", {
    id: MAP_ID,
    workspaceId: WORKSPACE_ID,
    ownerId: "00000000-0000-4000-8000-0000000000b1" as User.Id,
    ownerProfileId: "00000000-0000-4000-8000-0000000000b2" as UserProfile.Id,
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    name: "Coverage risk",
    description: undefined,
    isPublic: false,
    isRestricted: false,
    jitterSalt: JITTER_SALT,
    slug: undefined,
    config: { ...AvaMapConfig.makeEmpty(), layers: [...layers] },
  });
}

function _makeRendering(hasDrawnDisputedFeature = false): unknown {
  return {
    spec: { sources: {}, layers: [] },
    interactiveLayerIds: [],
    layerViewStates: new Map(),
    layerBounds: new Map(),
    legendUpdates: new Map(),
    hasDrawnDisputedFeature,
    layerFeatureCollections: new Map(),
  };
}

function _render(source: MapViewerSource): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MapViewer source={source} display={DISPLAY} />
    </QueryClientProvider>,
  );
}

function _makeSnapshot(layer: MapLayer.T, point: GeoJSON.Point): MapSnapshot {
  return {
    version: 1,
    mapId: MAP_ID,
    mapName: "Coverage risk",
    config: { ...AvaMapConfig.makeEmpty(), layers: [layer] },
    layers: [
      {
        layerId: layer.id,
        featureCollection: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", id: 0, geometry: point, properties: {} },
          ],
        },
        aggregation: undefined,
      },
    ],
  };
}

describe("MapViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    placesState.placesDatasetIds = new Set();
    useGetDatasetsMock.mockReturnValue([[], false]);
    useMapLayerRenderingMock.mockReturnValue(_makeRendering());
  });

  it("shows a live map's legend and attribution to a viewer with access", () => {
    useGetMapByIdMock.mockReturnValue([
      _makeMap([MapLayer.makeEmpty("Schools")]),
      false,
    ]);

    _render(LIVE_SOURCE);

    expect(
      screen.getByRole("region", { name: "Map of Coverage risk" }),
    ).toBeInTheDocument();
    // The legend names the layer in its group header and its swatch row.
    expect(screen.getAllByText("Schools").length).toBeGreaterThan(0);
    expect(
      screen.getByText("MapLibre, OpenStreetMap contributors"),
    ).toBeInTheDocument();
  });

  it("renders a live map with the map's own displacement salt", () => {
    useGetMapByIdMock.mockReturnValue([
      _makeMap([MapLayer.makeEmpty("Schools")]),
      false,
    ]);

    _render(LIVE_SOURCE);

    expect(useMapLayerRenderingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jitterSalt: JITTER_SALT,
        workspaceId: WORKSPACE_ID,
      }),
    );
  });

  it("keeps a places layer's internal id out of a live popup", () => {
    const layer = createQueryableLayer();
    const dataset = layer.source.dataSource as Dataset.T;
    placesState.placesDatasetIds = new Set([dataset.id]);
    useGetDatasetsMock.mockReturnValue([[dataset], false]);
    useGetMapByIdMock.mockReturnValue([_makeMap([layer]), false]);

    _render(LIVE_SOURCE);
    act(() => {
      useMapCanvasSpy.mock.lastCall?.[0]?.onFeatureClick(
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { name: "Clinic A", place_id: "place-1" },
        },
        MapLayerIds.toLayerId(layer.id),
      );
    });

    const popup = screen.getByRole("region", { name: "Cases" });
    expect(within(popup).getByText("Clinic A")).toBeInTheDocument();
    expect(within(popup).queryByText("place_id")).not.toBeInTheDocument();
    expect(usePlacesDatasetIdsMock).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it("tells a viewer who cannot read the map that they have no access", () => {
    useGetMapByIdMock.mockReturnValue([undefined, false]);

    _render(LIVE_SOURCE);

    expect(
      screen.getByText("You don't have access to this map"),
    ).toBeInTheDocument();
    expect(useMapCanvasSpy).not.toHaveBeenCalled();
  });

  it("tells a viewer who cannot read a layer's dataset that they have no access", () => {
    useGetMapByIdMock.mockReturnValue([
      _makeMap([createQueryableLayer()]),
      false,
    ]);

    _render(LIVE_SOURCE);

    expect(
      screen.getByText("You don't have access to this map"),
    ).toBeInTheDocument();
  });

  it("shows the map's disclaimer when a disputed boundary is drawn", () => {
    const map = _makeMap([MapLayer.makeEmpty("Districts")]);
    useGetMapByIdMock.mockReturnValue([
      {
        ...map,
        config: {
          ...map.config,
          exportLayout: {
            ...map.config.exportLayout,
            disclaimer: "Lines are not borders.",
          },
        },
      },
      false,
    ]);
    useMapLayerRenderingMock.mockReturnValue(_makeRendering(true));

    _render(LIVE_SOURCE);

    expect(screen.getByText("Lines are not borders.")).toBeInTheDocument();
  });

  it("draws a public map from its snapshot without running layer queries", async () => {
    const layer = createQueryableLayer();
    const point: GeoJSON.Point = {
      type: "Point",
      coordinates: [-73.98, 40.75],
    };
    downloadMapSnapshotMock.mockResolvedValue(_makeSnapshot(layer, point));

    _render(SNAPSHOT_SOURCE);

    await waitFor(() => {
      const spec = useMapCanvasSpy.mock.lastCall?.[0]?.spec;
      expect(
        spec?.sources[MapLayerIds.toSourceId(layer.id)]?.data.features[0]
          ?.geometry,
      ).toEqual(point);
    });
    expect(useMapLayerRenderingMock).not.toHaveBeenCalled();
    expect(useGetDatasetsMock).not.toHaveBeenCalled();
    expect(usePlacesDatasetIdsMock).not.toHaveBeenCalled();
  });

  it("explains a map that was added after the last publish", async () => {
    downloadMapSnapshotMock.mockResolvedValue(undefined);

    _render(SNAPSHOT_SOURCE);

    expect(
      await screen.findByText(
        "This map was added after the dashboard was last published. Publish again to show it here.",
      ),
    ).toBeInTheDocument();
  });
});
