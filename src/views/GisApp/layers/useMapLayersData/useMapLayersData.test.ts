import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

const {
  initializeDuckDbMock,
  runStructuredQueryMock,
  runSpatialQueryMock,
  spatialAvailability,
} = vi.hoisted(() => {
  return {
    initializeDuckDbMock: vi.fn(),
    runStructuredQueryMock: vi.fn(),
    runSpatialQueryMock: vi.fn(),
    spatialAvailability: { value: "available" },
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      initialize: initializeDuckDbMock,
      getSpatialAvailability: () => {
        return spatialAvailability.value;
      },
      subscribeSpatialAvailability: () => {
        return () => {
          return undefined;
        };
      },
    },
  };
});

vi.mock("@/clients/qetl/WorkspaceQetlClient", () => {
  return {
    WorkspaceQetlClient: { runQuery: runSpatialQueryMock },
  };
});

vi.mock("@/clients/queries/runStructuredQuery/runStructuredQuery", () => {
  return { runStructuredQuery: runStructuredQueryMock };
});

const { useMapLayersData } =
  await import("@/views/GisApp/layers/useMapLayersData/useMapLayersData");
const { MapLayerData } =
  await import("@/views/GisApp/layers/useMapLayersData/MapLayerData");

/**
 * An honest `DatasetColumn`, built through `Model.make` with no cast. Mirrors
 * the fixture in `MapLayerModule.test.ts`: `dataType` is a real `AvaDataType`
 * ("double"), not a loose "number", and the id field is `columnIdx`.
 */
function _createNumericColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "DOUBLE",
    dataType: "double",
    detectedDataType: "DOUBLE",
    description: undefined,
    columnIdx: 0,
  });
}

/** An honest `Dataset`, built through `Model.make` with no cast. */
function _createDataset(): Dataset.T {
  const now = new Date().toISOString();
  return Model.make("Dataset", {
    id: uuid<Dataset.Id>(),
    createdAt: now,
    updatedAt: now,
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
    name: "Cases",
    sourceType: "csv_file",
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    workspaceId: uuid<Workspace.Id>(),
  });
}

/** A layer with a data source and a geo binding that resolves. */
function _createQueryableLayer(): MapLayer.Standard {
  const layer = MapLayer.makeEmpty("Cases");
  const latitude = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("lat"),
  );
  const longitude = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("lon"),
  );
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: _createDataset(),
      queryColumns: [latitude, longitude],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
  };
}

/** A direct WKT point layer that requires DuckDB Spatial. */
function _createSpatialLayer(): MapLayer.Standard {
  const layer = MapLayer.makeEmpty("Shapes");
  const dataset = _createDataset();
  const geometry = QueryColumn.makeFromDatasetColumn(
    _createNumericColumn("shape"),
  );
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: dataset,
      queryColumns: [geometry],
    },
    geoBinding: {
      type: "geometryColumn",
      column: geometry.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
    },
  };
}

/** Wraps a hook under test with the QueryClient it needs. */
function _wrapperForHook(options: { children: ReactNode }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, options.children);
}

describe("useMapLayersData", () => {
  const workspaceId = uuid<Workspace.Id>();

  beforeEach(() => {
    initializeDuckDbMock.mockReset();
    initializeDuckDbMock.mockResolvedValue(undefined);
    runStructuredQueryMock.mockReset();
    runSpatialQueryMock.mockReset();
    spatialAvailability.value = "available";
  });

  it("queries with a layer's source when the layer is queryable", async () => {
    const layer = _createQueryableLayer();
    const queryResult: QueryResult.T<UnknownRow> = {
      id: uuid<QueryResult.Id>(),
      data: [{ cases: 1 }],
      columns: [{ name: "cases", dataType: "double" }],
      numRows: 1,
    };
    runStructuredQueryMock.mockResolvedValue(queryResult);

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(layer.id)?.data).toEqual({
        type: "rows",
        queryResult,
      });
    });

    expect(runStructuredQueryMock).toHaveBeenCalledTimes(1);
    expect(runStructuredQueryMock.mock.calls[0]?.[0]).toMatchObject({
      query: layer.source,
    });
  });

  it("does not query a layer with no data source", () => {
    const layer = MapLayer.makeEmpty("Cases");

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    expect(runStructuredQueryMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.data).toBeUndefined();
    expect(result.current.get(layer.id)?.isLoading).toBe(false);
  });

  it("does not query a layer whose geo binding does not resolve", () => {
    const queryable = _createQueryableLayer();
    const layer: MapLayer.T = {
      ...queryable,
      geoBinding: {
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      },
    };

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    expect(runStructuredQueryMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.data).toBeUndefined();
    expect(result.current.get(layer.id)?.isLoading).toBe(false);
  });

  it("runs separate queries and retains rows for two queryable layers", async () => {
    const firstLayer = _createQueryableLayer();
    const secondLayer = _createQueryableLayer();
    const firstQueryResult: QueryResult.T<UnknownRow> = {
      id: uuid<QueryResult.Id>(),
      data: [{ cases: 1 }],
      columns: [{ name: "cases", dataType: "double" }],
      numRows: 1,
    };
    const secondQueryResult: QueryResult.T<UnknownRow> = {
      id: uuid<QueryResult.Id>(),
      data: [{ cases: 2 }],
      columns: [{ name: "cases", dataType: "double" }],
      numRows: 1,
    };
    runStructuredQueryMock
      .mockResolvedValueOnce(firstQueryResult)
      .mockResolvedValueOnce(secondQueryResult);

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [firstLayer, secondLayer],
          workspaceId,
        });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(firstLayer.id)?.data).toEqual({
        type: "rows",
        queryResult: firstQueryResult,
      });
      expect(result.current.get(secondLayer.id)?.data).toEqual({
        type: "rows",
        queryResult: secondQueryResult,
      });
    });

    expect(runStructuredQueryMock).toHaveBeenCalledTimes(2);
  });

  it("waits for Spatial capability before running a geometry layer", () => {
    spatialAvailability.value = "loading";
    const layer = _createSpatialLayer();

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    expect(runSpatialQueryMock).not.toHaveBeenCalled();
    expect(initializeDuckDbMock).toHaveBeenCalledTimes(1);
    expect(result.current.get(layer.id)?.isLoading).toBe(true);
  });

  it("reports unavailable Spatial without executing QETL", () => {
    spatialAvailability.value = "unavailable";
    const layer = _createSpatialLayer();

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    expect(runSpatialQueryMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.error?.message).toMatch(/spatial/i);
  });

  it("runs available geometry layers as raw SQL and parses the envelope", async () => {
    const layer = _createSpatialLayer();
    const featureCollection = { type: "FeatureCollection", features: [] };
    const diagnostics = {
      sourceCount: 0,
      parsedCount: 0,
      invalidCount: 0,
      observedFamilies: [],
      hasMixedFamilies: false,
    };
    runSpatialQueryMock.mockResolvedValue({
      id: uuid<QueryResult.Id>(),
      columns: [],
      numRows: 1,
      data: [
        {
          __avandar_feature_collection: featureCollection,
          __avandar_diagnostics: diagnostics,
        },
      ],
    });

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(layer.id)?.data).toEqual({
        type: "spatial",
        featureCollection,
        diagnostics,
      });
    });
    expect(runSpatialQueryMock).toHaveBeenCalledWith({
      rawSql: expect.stringContaining("ST_GeomFromText"),
      signal: expect.any(AbortSignal),
      workspaceId,
    });
    expect(runStructuredQueryMock).not.toHaveBeenCalled();
  });
});

describe("MapLayerData.isQueryable", () => {
  it("is true for a layer with a source and a resolvable binding", () => {
    expect(MapLayerData.isQueryable(_createQueryableLayer())).toBe(true);
  });

  it("is false until the layer has a data source", () => {
    expect(MapLayerData.isQueryable(MapLayer.makeEmpty("Cases"))).toBe(false);
  });

  it("is false when the layer has a source but no resolvable geo binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withSource: MapLayer.T = {
      ...layer,
      source: { ...layer.source, dataSource: _createDataset() },
    };
    expect(MapLayerData.isQueryable(withSource)).toBe(false);
  });
});

describe("MapLayerData.toQueryKey", () => {
  it("changes when the source changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withLimit = { ...layer, source: { ...layer.source, limit: 500 } };
    expect(MapLayerData.toQueryKey(layer)).not.toEqual(
      MapLayerData.toQueryKey(withLimit),
    );
  });

  it("does not change when only symbology changes, so repaint skips refetch", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const recolored = {
      ...layer,
      symbology: {
        ...layer.symbology,
        color: { type: "single" as const, color: "#ef4444" },
      },
    };
    expect(MapLayerData.toQueryKey(layer)).toEqual(
      MapLayerData.toQueryKey(recolored),
    );
  });
});
