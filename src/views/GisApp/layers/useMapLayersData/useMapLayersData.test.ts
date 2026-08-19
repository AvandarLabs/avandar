import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  createQueryableLayer,
  createSpatialLayer,
  EMPTY_MAP_OVERLAY,
  UNIT_SQUARE,
  wrapperForHook,
} from "@/views/GisApp/layers/useMapLayersData/useMapLayersData.fixtures";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  initializeDuckDbMock,
  runStructuredQueryWithMetadataMock,
  runSpatialQueryMock,
  spatialAvailability,
} = vi.hoisted(() => {
  return {
    initializeDuckDbMock: vi.fn(),
    runStructuredQueryWithMetadataMock: vi.fn(),
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

vi.mock(
  "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata",
  () => {
    return {
      runStructuredQueryWithMetadata: runStructuredQueryWithMetadataMock,
    };
  },
);

const { useMapLayersData } =
  await import("@/views/GisApp/layers/useMapLayersData/useMapLayersData");

describe("useMapLayersData", () => {
  const workspaceId = uuid<Workspace.Id>();

  beforeEach(() => {
    initializeDuckDbMock.mockReset();
    initializeDuckDbMock.mockResolvedValue(undefined);
    runStructuredQueryWithMetadataMock.mockReset();
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
    runStructuredQueryWithMetadataMock.mockResolvedValue({
      result: queryResult,
      didAutoLimit: false,
    });

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(layer.id)?.data).toEqual({
        type: "rows",
        queryResult,
        didAutoLimit: false,
      });
    });

    expect(runStructuredQueryWithMetadataMock).toHaveBeenCalledTimes(1);
    expect(runStructuredQueryWithMetadataMock.mock.calls[0]?.[0]).toMatchObject(
      {
        query: layer.source,
      },
    );
  });

  it("runs lat/lng time filters as raw sql without waiting for spatial", async () => {
    spatialAvailability.value = "loading";
    const layer = createQueryableLayer();
    const timedLayer = {
      ...layer,
      timeColumn: layer.source.queryColumns[0]?.id,
    };
    const queryResult: QueryResult.T<UnknownRow> = {
      id: uuid<QueryResult.Id>(),
      data: [{ cases: 1 }],
      columns: [{ name: "cases", dataType: "double" }],
      numRows: 1,
    };
    runStructuredQueryWithMetadataMock.mockResolvedValue({
      result: queryResult,
      didAutoLimit: false,
    });

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [timedLayer],
          workspaceId,
          overlay: {
            aoi: undefined,
            timeRange: {
              start: "2026-01-01T00:00:00.000Z",
              end: "2026-01-31T23:59:59.000Z",
            },
          },
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(timedLayer.id)?.data).toEqual({
        type: "rows",
        queryResult,
        didAutoLimit: false,
      });
    });

    expect(initializeDuckDbMock).not.toHaveBeenCalled();
    expect(runSpatialQueryMock).not.toHaveBeenCalled();
    expect(runStructuredQueryWithMetadataMock).toHaveBeenCalledTimes(1);
    expect(
      runStructuredQueryWithMetadataMock.mock.calls[0]?.[0].rawSql,
    ).toContain("BETWEEN");
    expect(
      runStructuredQueryWithMetadataMock.mock.calls[0]?.[0].rawSql,
    ).not.toContain("ST_");
  });

  it("does not query a layer with no data source", () => {
    const layer = MapLayer.makeEmpty("Cases");

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
      },
      { wrapper: wrapperForHook },
    );

    expect(runStructuredQueryWithMetadataMock).not.toHaveBeenCalled();
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
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
      },
      { wrapper: wrapperForHook },
    );

    expect(runStructuredQueryWithMetadataMock).not.toHaveBeenCalled();
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
    runStructuredQueryWithMetadataMock
      .mockResolvedValueOnce({ result: firstQueryResult, didAutoLimit: false })
      .mockResolvedValueOnce({
        result: secondQueryResult,
        didAutoLimit: false,
      });

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [firstLayer, secondLayer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(firstLayer.id)?.data).toEqual({
        type: "rows",
        queryResult: firstQueryResult,
        didAutoLimit: false,
      });
      expect(result.current.get(secondLayer.id)?.data).toEqual({
        type: "rows",
        queryResult: secondQueryResult,
        didAutoLimit: false,
      });
    });

    expect(runStructuredQueryWithMetadataMock).toHaveBeenCalledTimes(2);
  });

  it("waits for Spatial capability before running a geometry layer", () => {
    spatialAvailability.value = "loading";
    const layer = createSpatialLayer();

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
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
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
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
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
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
    expect(runStructuredQueryWithMetadataMock).not.toHaveBeenCalled();
  });

  it("reports unavailable Spatial for lat/lng when an aoi is applied", () => {
    spatialAvailability.value = "unavailable";
    const layer = createQueryableLayer();
    const aoi = UNIT_SQUARE;

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: { aoi, timeRange: undefined },
        });
      },
      { wrapper: wrapperForHook },
    );

    expect(runStructuredQueryWithMetadataMock).not.toHaveBeenCalled();
    expect(runSpatialQueryMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.error?.message).toMatch(/spatial/i);
  });

  it("waits for Spatial before running lat/lng with an aoi", () => {
    spatialAvailability.value = "loading";
    const layer = createQueryableLayer();
    const aoi = UNIT_SQUARE;

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: { aoi, timeRange: undefined },
        });
      },
      { wrapper: wrapperForHook },
    );

    expect(runStructuredQueryWithMetadataMock).not.toHaveBeenCalled();
    expect(initializeDuckDbMock).toHaveBeenCalledTimes(1);
    expect(result.current.get(layer.id)?.isLoading).toBe(true);
  });

  it("runs lat/lng aoi filters as raw sql with spatial functions", async () => {
    const layer = createQueryableLayer();
    const aoi = UNIT_SQUARE;
    const queryResult: QueryResult.T<UnknownRow> = {
      id: uuid<QueryResult.Id>(),
      data: [{ cases: 1 }],
      columns: [{ name: "cases", dataType: "double" }],
      numRows: 1,
    };
    runStructuredQueryWithMetadataMock.mockResolvedValue({
      result: queryResult,
      didAutoLimit: false,
    });

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: { aoi, timeRange: undefined },
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(layer.id)?.data).toEqual({
        type: "rows",
        queryResult,
        didAutoLimit: false,
      });
    });

    expect(runStructuredQueryWithMetadataMock).toHaveBeenCalledTimes(1);
    expect(
      runStructuredQueryWithMetadataMock.mock.calls[0]?.[0].rawSql,
    ).toContain("ST_Point");
    expect(
      runStructuredQueryWithMetadataMock.mock.calls[0]?.[0].rawSql,
    ).toContain("ST_Intersects");
  });

  it("passes real raw SQL for a plain lat/lng layer with no AOI or time range, never falling back to the workspace auto-limit gate", async () => {
    // `runStructuredQueryWithMetadata` only lets
    // `resolveManualQueryForExecution` auto-limit a large dataset when it
    // receives `rawSql: undefined` for a workspace caller.
    // `compileLatLngOverlaySql` always returns the source SQL now, even with
    // no AOI and no time range, so a plain lat/lng layer can no longer be
    // silently capped at 100 rows: this asserts the map path always supplies
    // real SQL instead of `undefined`.
    const layer = createQueryableLayer();
    const queryResult: QueryResult.T<UnknownRow> = {
      id: uuid<QueryResult.Id>(),
      data: [{ cases: 1 }],
      columns: [{ name: "cases", dataType: "double" }],
      numRows: 100_000,
    };
    runStructuredQueryWithMetadataMock.mockResolvedValue({
      result: queryResult,
      didAutoLimit: false,
    });

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current.get(layer.id)?.data).toEqual({
        type: "rows",
        queryResult,
        didAutoLimit: false,
      });
    });

    expect(
      runStructuredQueryWithMetadataMock.mock.calls[0]?.[0].rawSql,
    ).toEqual(expect.any(String));
  });
});
