import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
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
  ensureSpatialMock,
  runStructuredQueryWithMetadataMock,
  runSpatialQueryMock,
  resolveManualQueryForExecutionMock,
  spatialAvailability,
} = vi.hoisted(() => {
  return {
    ensureSpatialMock: vi.fn(),
    runStructuredQueryWithMetadataMock: vi.fn(),
    runSpatialQueryMock: vi.fn(),
    resolveManualQueryForExecutionMock: vi.fn(),
    spatialAvailability: { value: "available" },
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      ensureSpatial: ensureSpatialMock,
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

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return {
    WorkspaceQuerySession: { runQuery: runSpatialQueryMock },
  };
});

vi.mock("@/clients/qetl/PublicQetlClient/PublicQetlClient", () => {
  return {
    PublicQetlClient: { runQuery: vi.fn() },
  };
});

vi.mock(
  "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient",
  () => {
    return {
      AttributeAssertionClient: { getConceptExtension: vi.fn() },
    };
  },
);

// Only consulted by `runStructuredQueryWithMetadata` when `rawSql` is
// undefined. A separate test loads the real implementation to prove a
// resolvable lat/lng layer never reaches it.
vi.mock(
  "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution",
  () => {
    return {
      resolveManualQueryForExecution: resolveManualQueryForExecutionMock,
    };
  },
);

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
const { runStructuredQueryWithMetadata: realRunStructuredQueryWithMetadata } =
  await vi.importActual<
    typeof import("@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata")
  >("@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata");

/**
 * Answers the statements a lat/lng point layer issues through the workspace
 * session: the coordinate audit first, then either the layer's source query or,
 * above the aggregation threshold, a cell count and the aggregate itself.
 *
 * Dispatching on the result column each statement is defined by, rather than on
 * call order, keeps these tests honest if the loader's steps are reordered.
 */
function _mockPointLayerQueries(options: {
  mappableRowCount: number;
  sourceRowCount?: number;
  dropNullCoordinateCount?: number;
  cellCount?: number;
  dataRows?: UnknownRow[];
}): { getDataSql: () => string[] } {
  const dataSql: string[] = [];
  const makeResult = (data: UnknownRow[]): QueryResult.T<UnknownRow> => {
    return {
      id: uuid<QueryResult.Id>(),
      columns: [],
      data,
      numRows: data.length,
    };
  };
  runSpatialQueryMock.mockImplementation(
    async ({ rawSql }: { rawSql: string }) => {
      if (rawSql.includes("source_row_count")) {
        return makeResult([
          {
            source_row_count:
              options.sourceRowCount ?? options.mappableRowCount,
            mappable_row_count: options.mappableRowCount,
            drop_null_coordinate: options.dropNullCoordinateCount ?? 0,
            drop_non_numeric_coordinate: 0,
            drop_out_of_range: 0,
            drop_suspected_lat_lng_swap: 0,
            drop_null_island: 0,
          },
        ]);
      }
      if (rawSql.includes("point_aggregate_cell_count")) {
        return makeResult([
          { point_aggregate_cell_count: options.cellCount ?? 1 },
        ]);
      }
      dataSql.push(rawSql);
      return makeResult(options.dataRows ?? [{ cases: 1 }]);
    },
  );
  return {
    getDataSql: () => {
      return dataSql;
    },
  };
}

describe("useMapLayersData", () => {
  const workspaceId = uuid<Workspace.Id>();

  beforeEach(() => {
    ensureSpatialMock.mockReset();
    ensureSpatialMock.mockResolvedValue(true);
    runStructuredQueryWithMetadataMock.mockReset();
    runSpatialQueryMock.mockReset();
    resolveManualQueryForExecutionMock.mockReset();
    spatialAvailability.value = "available";
  });

  it("returns a small layer's own rows without aggregating them", async () => {
    const layer = createQueryableLayer();
    const { getDataSql } = _mockPointLayerQueries({
      mappableRowCount: 12,
      dataRows: [{ cases: 1 }],
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
      expect(result.current.get(layer.id)?.data?.type).toBe("rows");
    });

    const data = result.current.get(layer.id)?.data;
    expect(data?.type === "rows" && data.aggregation).toBeUndefined();
    expect(data?.type === "rows" && data.queryResult.data).toEqual([
      { cases: 1 },
    ]);
    expect(getDataSql()).toEqual([structuredQueryToSql(layer.source)]);
  });

  it("aggregates a layer too large to convert row by row", async () => {
    const layer = createQueryableLayer();
    const { getDataSql } = _mockPointLayerQueries({
      mappableRowCount: 3_800_000,
      cellCount: 3_228,
      dataRows: [{ lat: 1, lon: 2, point_count: 1_200 }],
    });

    const { result } = renderHook(
      () => {
        return useMapLayersData({
          layers: [layer],
          workspaceId,
          overlay: EMPTY_MAP_OVERLAY,
          zoom: 6,
        });
      },
      { wrapper: wrapperForHook },
    );

    await waitFor(() => {
      const data = result.current.get(layer.id)?.data;
      expect(
        data?.type === "rows" ? data.aggregation : undefined,
      ).toBeDefined();
    });

    const data = result.current.get(layer.id)?.data;
    expect(data?.type === "rows" && data.aggregation?.aggregatedRowCount).toBe(
      3_800_000,
    );
    expect(getDataSql()[0]).toContain("GROUP BY");
    expect(getDataSql()[0]).not.toBe(structuredQueryToSql(layer.source));
  });

  it("reports rows a map cannot place even when it aggregated the rest", async () => {
    const layer = createQueryableLayer();
    _mockPointLayerQueries({
      mappableRowCount: 3_800_000,
      sourceRowCount: 3_800_500,
      dropNullCoordinateCount: 500,
      cellCount: 100,
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
      const data = result.current.get(layer.id)?.data;
      expect(data?.type === "rows" ? data.audit : undefined).toBeDefined();
    });

    const data = result.current.get(layer.id)?.data;
    expect(data?.type === "rows" && data.audit?.drops).toEqual([
      { reason: "nullCoordinate", count: 500 },
    ]);
  });

  it("runs lat/lng time filters as raw sql without waiting for spatial", async () => {
    spatialAvailability.value = "loading";
    const layer = createQueryableLayer();
    const timedLayer = {
      ...layer,
      timeColumn: layer.source.queryColumns[0]?.id,
    };
    const { getDataSql } = _mockPointLayerQueries({ mappableRowCount: 5 });

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
      expect(result.current.get(timedLayer.id)?.data?.type).toBe("rows");
    });

    expect(ensureSpatialMock).not.toHaveBeenCalled();
    expect(getDataSql()[0]).toContain("BETWEEN");
    expect(getDataSql()[0]).not.toContain("ST_");
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
    _mockPointLayerQueries({
      mappableRowCount: 3,
      dataRows: [{ cases: 1 }],
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
      expect(result.current.get(firstLayer.id)?.data?.type).toBe("rows");
      expect(result.current.get(secondLayer.id)?.data?.type).toBe("rows");
    });

    // Each layer keeps its own result rather than sharing one cache entry.
    expect(result.current.get(firstLayer.id)?.data).not.toBe(
      result.current.get(secondLayer.id)?.data,
    );
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
    // The hook waits for the capability without asking for it: `GisApp` owns
    // the only trigger, so a second one here would be dead weight.
    expect(ensureSpatialMock).not.toHaveBeenCalled();
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
    expect(ensureSpatialMock).not.toHaveBeenCalled();
    expect(result.current.get(layer.id)?.isLoading).toBe(true);
  });

  it("runs lat/lng aoi filters as raw sql with spatial functions", async () => {
    const layer = createQueryableLayer();
    const aoi = UNIT_SQUARE;
    const { getDataSql } = _mockPointLayerQueries({ mappableRowCount: 7 });

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
      expect(result.current.get(layer.id)?.data?.type).toBe("rows");
    });

    expect(getDataSql()[0]).toContain("ST_Point");
    expect(getDataSql()[0]).toContain("ST_Intersects");
  });

  it("runs a plain lat/lng layer with no injected LIMIT and without consulting the auto-limit resolver", async () => {
    // Wires in the real `runStructuredQueryWithMetadata` (rather than the
    // mock every other test in this file uses) so this proves the actual
    // guarantee: `resolveManualQueryForExecution` is not merely uncalled in
    // some mock's bookkeeping, it is not consulted by the real execution
    // path, and the SQL that reaches `WorkspaceQuerySession.runQuery` is the
    // compiled overlay SQL verbatim, with no LIMIT clause appended anywhere
    // along the way. This is the hidden 100-row cap the point loader exists
    // to keep replaced: a large layer is aggregated, never silently truncated.
    runStructuredQueryWithMetadataMock.mockImplementation(
      realRunStructuredQueryWithMetadata,
    );
    const layer = createQueryableLayer();
    const expectedSql = structuredQueryToSql(layer.source);
    const { getDataSql } = _mockPointLayerQueries({ mappableRowCount: 9_000 });

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
      expect(result.current.get(layer.id)?.data?.type).toBe("rows");
    });

    expect(resolveManualQueryForExecutionMock).not.toHaveBeenCalled();
    expect(expectedSql).not.toMatch(/limit/i);
    expect(getDataSql()).toEqual([expectedSql]);
  });
});
