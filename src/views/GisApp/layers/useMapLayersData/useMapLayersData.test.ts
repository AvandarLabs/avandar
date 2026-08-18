import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  createDataset,
  createGridBinLayer,
  createQueryableLayer,
  createSpatialLayer,
  wrapperForHook,
} from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

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

vi.mock("@/clients/qetl/WorkspaceQetlClient/WorkspaceQetlClient", () => {
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
    const layer = createQueryableLayer();
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
      { wrapper: wrapperForHook },
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
      { wrapper: wrapperForHook },
    );

    expect(runStructuredQueryMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.data).toBeUndefined();
    expect(result.current.get(layer.id)?.isLoading).toBe(false);
  });

  it("does not query a layer whose geo binding does not resolve", () => {
    const queryable = createQueryableLayer();
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
      { wrapper: wrapperForHook },
    );

    expect(runStructuredQueryMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.data).toBeUndefined();
    expect(result.current.get(layer.id)?.isLoading).toBe(false);
  });

  it("runs separate queries and retains rows for two queryable layers", async () => {
    const firstLayer = createQueryableLayer();
    const secondLayer = createQueryableLayer();
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
      { wrapper: wrapperForHook },
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
    const layer = createSpatialLayer();

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: wrapperForHook },
    );

    expect(runSpatialQueryMock).not.toHaveBeenCalled();
    expect(initializeDuckDbMock).toHaveBeenCalledTimes(1);
    expect(result.current.get(layer.id)?.isLoading).toBe(true);
  });

  it("reports unavailable Spatial without executing QETL", () => {
    spatialAvailability.value = "unavailable";
    const layer = createSpatialLayer();

    const { result } = renderHook(
      () => {
        return useMapLayersData({ layers: [layer], workspaceId });
      },
      { wrapper: wrapperForHook },
    );

    expect(runSpatialQueryMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.error?.message).toMatch(/spatial/i);
  });

  it("runs available geometry layers as raw SQL and parses the envelope", async () => {
    const layer = createSpatialLayer();
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
      { wrapper: wrapperForHook },
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
    expect(MapLayerData.isQueryable(createQueryableLayer())).toBe(true);
  });

  it("is false until the layer has a data source", () => {
    expect(MapLayerData.isQueryable(MapLayer.makeEmpty("Cases"))).toBe(false);
  });

  it("is false when the layer has a source but no resolvable geo binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withSource: MapLayer.T = {
      ...layer,
      source: { ...layer.source, dataSource: createDataset() },
    };
    expect(MapLayerData.isQueryable(withSource)).toBe(false);
  });

  it("is true for a grid bin bound to both coordinate columns", () => {
    const base = createQueryableLayer();
    const [latitude, longitude] = base.source.queryColumns;
    const layer = createGridBinLayer(base, {
      type: "latLngColumns",
      latitude: latitude?.id,
      longitude: longitude?.id,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(true);
  });

  it("is false for a grid bin missing one coordinate column", () => {
    const base = createQueryableLayer();
    const layer = createGridBinLayer(base, {
      type: "latLngColumns",
      latitude: base.source.queryColumns[0]?.id,
      longitude: undefined,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(false);
  });

  it("is true for a grid bin bound to a point geometry column", () => {
    const base = createSpatialLayer();
    const layer = createGridBinLayer(base, {
      type: "geometryColumn",
      column: base.source.queryColumns[0]!.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(true);
  });

  it("is false for a grid bin whose point geometry column is gone", () => {
    const layer = createGridBinLayer(createSpatialLayer(), {
      type: "geometryColumn",
      column: uuid<QueryColumn.Id>(),
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    });

    expect(MapLayerData.isQueryable(layer)).toBe(false);
  });
});

describe("MapLayerData.getQueryKeyFromMapLayer", () => {
  it("changes when the source changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withLimit = { ...layer, source: { ...layer.source, limit: 500 } };
    expect(MapLayerData.getQueryKeyFromMapLayer(layer)).not.toEqual(
      MapLayerData.getQueryKeyFromMapLayer(withLimit),
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
    expect(MapLayerData.getQueryKeyFromMapLayer(layer)).toEqual(
      MapLayerData.getQueryKeyFromMapLayer(recolored),
    );
  });
});
