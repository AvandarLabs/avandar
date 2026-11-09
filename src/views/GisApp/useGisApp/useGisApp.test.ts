/**
 * useGisApp expands the inspector when an annotation is created or selected.
 */
import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { PLACES_COLUMNS } from "@/clients/places/places.constants";
import { act, renderHook, TestProviders } from "@/test-utils";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { createPlacesLayer } from "@/views/GisApp/places/createPlacesLayer/createPlacesLayer";
import { makeTextAnnotationFeature } from "@/views/GisApp/tools/makeAnnotationFeatureHelpers";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  expandPanelMock,
  mapCanvasState,
  placesState,
  saveMapConfigMock,
  useMapLayersDataMock,
} = vi.hoisted(() => {
  return {
    expandPanelMock: vi.fn(),
    saveMapConfigMock: vi.fn(),
    useMapLayersDataMock: vi.fn(() => {
      return new Map();
    }),
    placesState: {
      placesDatasetIds: new Set<string>(),
      datasetColumns: [] as unknown[],
    },
    mapCanvasState: {
      lastCreatedAnnotationId: undefined as
        | AvaMapConfig.AnnotationFeatureId
        | undefined,
    },
  };
});

vi.mock("@/views/GisApp/shell/ChromePanelState/ChromePanelState", () => {
  return {
    ChromePanelState: {
      fromCanvasWidth: () => {
        return { layers: false, inspector: true, legend: false };
      },
      useChromePanelState: () => {
        return {
          panelState: { layers: false, inspector: true, legend: false },
          togglePanel: vi.fn(),
          expandPanel: expandPanelMock,
        };
      },
    },
  };
});

vi.mock("@/views/GisApp/MapCanvas/useMapCanvas", () => {
  return {
    useMapCanvas: () => {
      return {
        containerRef: { current: null },
        mapInstance: { mapRef: { current: null } },
        invalidRingStatus: undefined,
        measureVertices: [],
        lastCreatedAnnotationId: mapCanvasState.lastCreatedAnnotationId,
      };
    },
  };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return {
    AvaMapClient: {
      saveMapConfig: saveMapConfigMock,
      QueryKeys: {
        getAll: () => {
          return ["AvaMap", "getAll"];
        },
      },
    },
  };
});

vi.mock("@/config/AvaQueryClient", () => {
  return {
    AvaQueryClient: { invalidateQueries: vi.fn() },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[]];
      },
    },
  };
});

vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        return [undefined, false, { isSuccess: false }];
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
  return {
    useMapLayersData: useMapLayersDataMock,
  };
});

const { useGisApp } = await import("@/views/GisApp/useGisApp/useGisApp");

const PLACES_WORKSPACE_ID = uuid<Workspace.Id>();
const PLACES_NOW = "2026-11-09T00:00:00.000Z";

/** A places dataset, its columns, and the map config showing it as a layer. */
function _createPlacesFixture(): {
  datasetId: Dataset.Id;
  datasetColumns: DatasetColumn.T[];
  mapConfig: AvaMapConfig.T;
} {
  const dataset: Dataset.T = Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: PLACES_NOW,
    updatedAt: PLACES_NOW,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Exposure sites",
    sourceType: "virtual",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: PLACES_WORKSPACE_ID,
  });
  const datasetColumns = PLACES_COLUMNS.map((column, columnIdx) => {
    return Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: dataset.id,
      workspaceId: PLACES_WORKSPACE_ID,
      createdAt: PLACES_NOW,
      updatedAt: PLACES_NOW,
      name: column.name,
      originalName: column.name,
      originalDataType: column.duckDbType,
      dataType: column.dataType,
      detectedDataType: column.duckDbType,
      description: undefined,
      columnIdx,
    });
  });
  const placesLayer = createPlacesLayer({ dataset, datasetColumns });
  return {
    datasetId: dataset.id,
    datasetColumns,
    mapConfig: { ...AvaMapConfig.makeEmpty(), layers: [placesLayer] },
  };
}

function _getQueryColumnNames(layers: readonly MapLayer.T[]): string[] {
  return layers.flatMap((layer) => {
    return layer.source.queryColumns.map(QueryColumn.getDerivedColumnName);
  });
}

function _createAvaMap(
  config: AvaMapConfig.T = AvaMapConfig.makeEmpty(),
): AvaMap.T {
  return Model.make("AvaMap", {
    id: uuid<AvaMap.Id>(),
    workspaceId: PLACES_WORKSPACE_ID,
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    name: "Untitled map",
    description: undefined,
    isPublic: false,
    isRestricted: false,
    slug: undefined,
    config,
  });
}

describe("useGisApp annotation inspector", () => {
  beforeEach(() => {
    placesState.placesDatasetIds = new Set();
    placesState.datasetColumns = [];
    expandPanelMock.mockReset();
    mapCanvasState.lastCreatedAnnotationId = undefined;
  });

  it("expands the inspector when a new annotation is created", () => {
    const feature = makeTextAnnotationFeature([10, 10], "Goma");
    const { rerender } = renderHook(
      () => {
        return useGisApp(_createAvaMap());
      },
      { wrapper: TestProviders },
    );

    expect(expandPanelMock).not.toHaveBeenCalled();

    mapCanvasState.lastCreatedAnnotationId = feature.id;
    rerender();

    expect(expandPanelMock).toHaveBeenCalledWith("inspector");
  });

  it("expands the inspector when an annotation feature is clicked on the map", () => {
    const feature = makeTextAnnotationFeature([10, 10], "Goma");
    const { result } = renderHook(
      () => {
        return useGisApp(_createAvaMap());
      },
      { wrapper: TestProviders },
    );

    act(() => {
      result.current.onMapFeatureClick(
        {
          type: "Feature",
          properties: { id: feature.id },
          geometry: {
            type: "Point",
            coordinates: [10, 10],
          },
        },
        MapLayerIds.annotationSymbolLayer,
      );
    });

    expect(expandPanelMock).toHaveBeenCalledWith("inspector");
    expect(result.current.selectedAnnotationFeatureId).toBe(feature.id);
    expect(result.current.isAnnotationRowSelected).toBe(true);
  });
});

describe("useGisApp places layers", () => {
  beforeEach(() => {
    saveMapConfigMock.mockReset();
    useMapLayersDataMock.mockClear();
  });

  it("loads place_id for a places layer but never saves it into the map", async () => {
    const fixture = _createPlacesFixture();
    placesState.placesDatasetIds = new Set([fixture.datasetId]);
    placesState.datasetColumns = fixture.datasetColumns;
    const { result } = renderHook(
      () => {
        return useGisApp(_createAvaMap(fixture.mapConfig));
      },
      { wrapper: TestProviders },
    );

    const [loadOptions] = (useMapLayersDataMock.mock.lastCall ?? []) as [
      { layers: readonly MapLayer.T[] }?,
    ];
    const loadedLayers = loadOptions?.layers;
    expect(_getQueryColumnNames(loadedLayers ?? [])).toContain("place_id");
    expect(_getQueryColumnNames(result.current.mapConfig.layers)).not.toContain(
      "place_id",
    );

    act(() => {
      result.current.updateConfig((current) => {
        return { ...current, view: { ...current.view, zoom: 9 } };
      });
    });
    await act(async () => {
      result.current.saveNow();
    });

    const savedConfig: AvaMapConfig.T | undefined =
      saveMapConfigMock.mock.lastCall?.[0]?.mapConfig;
    expect(savedConfig?.view.zoom).toBe(9);
    expect(_getQueryColumnNames(savedConfig?.layers ?? [])).not.toContain(
      "place_id",
    );
    expect(savedConfig?.layers[0]?.popup).toEqual(
      fixture.mapConfig.layers[0]?.popup,
    );
  });
});
