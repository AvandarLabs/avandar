import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import { renderHook, TestProviders } from "@/test-utils";
import { createPlacesLayer } from "@/views/GisApp/places/createPlacesLayer/createPlacesLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";

const { placesState, useAvaMapRenderMock, useMapLayersDataMock } = vi.hoisted(
  () => {
    return {
      placesState: {
        placesDatasetIds: new Set<string>(),
        datasetColumns: [] as unknown[],
      },
      useMapLayersDataMock: vi.fn(),
      useAvaMapRenderMock: vi.fn(),
    };
  },
);

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[]];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [placesState.datasetColumns, false, { isSuccess: true }];
      },
    },
  };
});

vi.mock("@/clients/places/VirtualPlacesStore/VirtualPlacesStore", () => {
  return {
    VirtualPlacesStore: {
      usePlacesDatasetIds: () => {
        return placesState.placesDatasetIds;
      },
    },
  };
});

vi.mock("@/views/GisApp/layers/useMapLayersData/useMapLayersData", () => {
  return { useMapLayersData: useMapLayersDataMock };
});

vi.mock("@/views/GisApp/layers/useAvaMapRender/useAvaMapRender", () => {
  return { useAvaMapRender: useAvaMapRenderMock };
});

const { useMapLayerRendering } =
  await import("@/views/GisApp/layers/useMapLayerRendering");

const WORKSPACE_ID = uuid<Workspace.Id>();
const JITTER_SALT = "00000000-0000-4000-8000-0000000000bb";
const NOW = "2026-11-09T00:00:00.000Z";

/** A hydrated schools layer drawn from its WKT column, popup on all fields. */
function _makeSchoolsLayer(): MapLayer.T {
  const dataset = Model.make("Dataset", {
    id: "schools",
    name: "schools",
  }) as Dataset.T;
  const sourceColumns = ["the_geom", "loc_name"].map((name, columnIdx) => {
    return QueryColumn.makeFromDatasetColumn(
      Model.make("DatasetColumn", {
        id: `dc_${name}`,
        datasetId: dataset.id,
        name,
        originalName: name,
        dataType: "varchar",
        columnIdx,
      }) as DatasetColumn.T,
    );
  });
  const geometryColumn = sourceColumns[0]!;
  const layer = MapLayer.makeEmpty("schools");
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: dataset,
      queryColumns: [geometryColumn],
      sourceColumns,
    },
    geoBinding: {
      type: "geometryColumn",
      column: geometryColumn.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    },
  };
}

/** A places dataset's columns and the layer that shows it. */
function _createPlacesFixture(): {
  datasetId: Dataset.Id;
  datasetColumns: DatasetColumn.T[];
  layer: MapLayer.T;
} {
  const dataset: Dataset.T = Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: NOW,
    updatedAt: NOW,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    jitterSalt: JITTER_SALT,
    name: "Exposure sites",
    sourceType: "virtual",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: WORKSPACE_ID,
  });
  const datasetColumns = PLACES_COLUMNS.map((column, columnIdx) => {
    return Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: dataset.id,
      workspaceId: WORKSPACE_ID,
      createdAt: NOW,
      updatedAt: NOW,
      name: column.name,
      originalName: column.name,
      originalDataType: column.duckDbType,
      dataType: column.dataType,
      detectedDataType: column.duckDbType,
      description: undefined,
      columnIdx,
    });
  });
  return {
    datasetId: dataset.id,
    datasetColumns,
    layer: createPlacesLayer({ dataset, datasetColumns }),
  };
}

function _getQueryColumnNames(layers: readonly MapLayer.T[]): string[] {
  return layers.flatMap((layer) => {
    return layer.source.queryColumns.map(QueryColumn.getDerivedColumnName);
  });
}

function _renderRendering(mapConfig: AvaMapConfig.T) {
  return renderHook(
    () => {
      return useMapLayerRendering({
        mapConfig,
        workspaceId: WORKSPACE_ID,
        view: mapConfig.view,
        jitterSalt: JITTER_SALT,
      });
    },
    { wrapper: TestProviders },
  );
}

describe("useMapLayerRendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    placesState.placesDatasetIds = new Set();
    placesState.datasetColumns = [];
    useMapLayersDataMock.mockReturnValue(new Map());
    useAvaMapRenderMock.mockReturnValue({ legendUpdates: new Map() });
  });

  it("queries and draws with the map's jitter salt, so displaced points match the GIS app", () => {
    _renderRendering(AvaMapConfig.makeEmpty());

    expect(useMapLayersDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ jitterSalt: JITTER_SALT }),
    );
    expect(useAvaMapRenderMock).toHaveBeenCalledWith(
      expect.objectContaining({ jitterSalt: JITTER_SALT }),
    );
  });

  it("queries every column of an exact layer whose popup shows all fields", () => {
    const layer = _makeSchoolsLayer();
    _renderRendering({ ...AvaMapConfig.makeEmpty(), layers: [layer] });

    const [{ layers: queriedLayers }] = useMapLayersDataMock.mock.calls[0]!;
    expect(_getQueryColumnNames(queriedLayers)).toEqual([
      "the_geom",
      "loc_name",
    ]);
  });

  it("loads and draws place_id for a places layer", () => {
    const fixture = _createPlacesFixture();
    placesState.placesDatasetIds = new Set([fixture.datasetId]);
    placesState.datasetColumns = fixture.datasetColumns;
    _renderRendering({ ...AvaMapConfig.makeEmpty(), layers: [fixture.layer] });

    const [{ layers: queriedLayers }] = useMapLayersDataMock.mock.lastCall!;
    const [{ mapConfig: drawnConfig }] = useAvaMapRenderMock.mock.lastCall!;
    expect(_getQueryColumnNames(queriedLayers)).toContain("place_id");
    expect(_getQueryColumnNames(drawnConfig.layers)).toContain("place_id");
  });

  it("hands useMapLayersData the same layers across re-renders of one config, so queries do not refetch", () => {
    const mapConfig = {
      ...AvaMapConfig.makeEmpty(),
      layers: [_makeSchoolsLayer()],
    };
    const { rerender } = _renderRendering(mapConfig);
    const [{ layers: firstLayers }] = useMapLayersDataMock.mock.calls[0]!;

    rerender();

    const [{ layers: lastLayers }] = useMapLayersDataMock.mock.lastCall!;
    expect(useMapLayersDataMock.mock.calls.length).toBeGreaterThan(1);
    expect(lastLayers).toBe(firstLayers);
  });

  it("returns each loaded spatial layer's features", () => {
    const layer = _makeSchoolsLayer();
    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    useMapLayersDataMock.mockReturnValue(
      new Map([
        [
          layer.id,
          {
            data: { type: "spatial", featureCollection },
          } as unknown as MapLayerQueryState,
        ],
      ]),
    );

    const { result } = _renderRendering({
      ...AvaMapConfig.makeEmpty(),
      layers: [layer],
    });

    expect(result.current.layerFeatureCollections.get(layer.id)).toBe(
      featureCollection,
    );
  });
});
