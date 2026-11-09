import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema";
import { createMapSnapshotFromMapId } from "@/clients/maps/MapSnapshot/createMapSnapshotFromMapId/createMapSnapshotFromMapId";
import { MapSnapshotPublishError } from "@/clients/maps/MapSnapshot/MapSnapshotPublishError";
import { createQueryableLayer } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  compileMapSnapshotMock,
  getMapByIdMock,
  getVirtualDatasetsMock,
  ensureSpatialMock,
} = vi.hoisted(() => {
  return {
    compileMapSnapshotMock: vi.fn(),
    getMapByIdMock: vi.fn(),
    getVirtualDatasetsMock: vi.fn(),
    ensureSpatialMock: vi.fn(),
  };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { getById: getMapByIdMock } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAll: vi.fn().mockResolvedValue([]) } };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: vi.fn().mockResolvedValue([]) } };
});
vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return { VirtualDatasetClient: { getAll: getVirtualDatasetsMock } };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: { getAll: vi.fn().mockResolvedValue([]) } };
});
vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { ensureSpatial: ensureSpatialMock } };
});
vi.mock(
  "@/clients/maps/MapSnapshot/compileMapSnapshot/compileMapSnapshot",
  () => {
    return { compileMapSnapshot: compileMapSnapshotMock };
  },
);

const WORKSPACE_ID = "00000000-0000-4000-8000-0000000000aa" as Workspace.Id;
const PLACES_DATASET_ID = "00000000-0000-4000-8000-0000000000d1" as Dataset.Id;
const MAP_CONFIG: AvaMapConfig.T = {
  ...AvaMapConfig.makeEmpty(),
  view: { ...AvaMapConfig.makeEmpty().view, zoom: 7.6, center: [-97.5, 33.2] },
};
/** A layer whose saved filter names a column its dataset no longer has. */
function _createLayerWithStaleFilter(name: string): MapLayer.T {
  const layer = { ...createQueryableLayer(), name };
  const [parsedLayer] = AvaMapConfigSchema.fromJson({
    ...AvaMapConfig.makeEmpty(),
    layers: [
      {
        ...layer,
        source: {
          ...layer.source,
          filters: {
            type: "group",
            combinator: "AND",
            rules: [
              {
                type: "rule",
                id: "stale",
                columnName: "vaccinated",
                operator: "=",
                value: "no",
              },
            ],
          },
        },
      },
    ],
  }).layers;
  return parsedLayer!;
}

const MAP = {
  id: "00000000-0000-4000-8000-0000000000f5" as AvaMap.Id,
  name: "Coverage risk",
  workspaceId: WORKSPACE_ID,
  jitterSalt: "8f14e45f-ceea-467a-9575-1a1c0c1e7f3b",
  config: MAP_CONFIG,
};

describe("createMapSnapshotFromMapId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVirtualDatasetsMock.mockResolvedValue([
      { datasetId: PLACES_DATASET_ID, isPlaces: true },
    ]);
    ensureSpatialMock.mockResolvedValue(true);
  });

  it("compiles the saved map under its own name with its own salt", async () => {
    getMapByIdMock.mockResolvedValue(MAP);
    compileMapSnapshotMock.mockResolvedValue({ mapId: MAP.id });

    await createMapSnapshotFromMapId({
      mapId: MAP.id,
      workspaceId: WORKSPACE_ID,
    });

    expect(compileMapSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapId: MAP.id,
        mapName: "Coverage risk",
        mapConfig: MAP_CONFIG,
        placesDatasetIds: new Set([PLACES_DATASET_ID]),
        queryContext: {
          workspaceId: WORKSPACE_ID,
          zoomBand: 7,
          simplificationReferenceLatitude: 33.2,
          datasets: [],
          datasetColumns: [],
          jitterSalt: MAP.jitterSalt,
        },
      }),
    );
  });

  it("refuses a map the publisher cannot read", async () => {
    getMapByIdMock.mockResolvedValue(undefined);

    await expect(
      createMapSnapshotFromMapId({ mapId: MAP.id, workspaceId: WORKSPACE_ID }),
    ).rejects.toThrow("unavailable");
    expect(compileMapSnapshotMock).not.toHaveBeenCalled();
  });

  it("refuses a map from another workspace", async () => {
    getMapByIdMock.mockResolvedValue({
      ...MAP,
      workspaceId: "00000000-0000-4000-8000-0000000000bb" as Workspace.Id,
    });

    await expect(
      createMapSnapshotFromMapId({ mapId: MAP.id, workspaceId: WORKSPACE_ID }),
    ).rejects.toThrow("outside this workspace");
  });

  it("refuses a map that needs DuckDB Spatial when it cannot load", async () => {
    const zones = { ...createQueryableLayer(), isVisible: false };
    const cases = createQueryableLayer();
    getMapByIdMock.mockResolvedValue({
      ...MAP,
      config: {
        ...MAP_CONFIG,
        layers: [zones, { ...cases, spatialFilter: { layerId: zones.id } }],
      },
    });
    ensureSpatialMock.mockResolvedValue(false);

    await expect(
      createMapSnapshotFromMapId({ mapId: MAP.id, workspaceId: WORKSPACE_ID }),
    ).rejects.toThrow("DuckDB Spatial");
    expect(compileMapSnapshotMock).not.toHaveBeenCalled();
  });

  it("refuses a map whose saved filters no longer match its data", async () => {
    const hiddenLayer = {
      ...(_createLayerWithStaleFilter("Unvaccinated zones") as MapLayer.T),
      isVisible: false,
    };
    getMapByIdMock.mockResolvedValue({
      ...MAP,
      config: {
        ...MAP_CONFIG,
        layers: [
          createQueryableLayer(),
          _createLayerWithStaleFilter("Cases"),
          hiddenLayer,
        ],
      },
    });

    const publish = createMapSnapshotFromMapId({
      mapId: MAP.id,
      workspaceId: WORKSPACE_ID,
    });

    await expect(publish).rejects.toBeInstanceOf(MapSnapshotPublishError);
    await expect(publish).rejects.toMatchObject({
      reason: "filtersNoLongerApply",
      mapId: MAP.id,
      mapName: "Coverage risk",
      layerNames: ["Cases", "Unvaccinated zones"],
    });
    expect(compileMapSnapshotMock).not.toHaveBeenCalled();
  });
});
