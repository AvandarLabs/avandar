import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type {
  QueryResult,
  QueryResultId,
} from "$/models/queries/QueryResult/QueryResult.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const { runStructuredQueryMock } = vi.hoisted(() => {
  return { runStructuredQueryMock: vi.fn() };
});

vi.mock("@/clients/queries/runStructuredQuery/runStructuredQuery", () => {
  return { runStructuredQuery: runStructuredQueryMock };
});

const { useMapLayerData, buildMapLayerQueryKey, isMapLayerQueryable } =
  await import("@/views/GISApp/layers/useMapLayerData/useMapLayerData");

/**
 * An honest `DatasetColumnRead`, built with no cast. Mirrors the fixture in
 * `MapLayerModule.test.ts`: `dataType` is a real `AvaDataType` ("double"),
 * not a loose "number", and the id field is `columnIdx`, not `columnIndex`.
 */
function createNumericColumn(name: string): DatasetColumnRead {
  const now = new Date().toISOString();
  return {
    __type: "DatasetColumn",
    id: uuid<DatasetColumnId>(),
    datasetId: uuid<DatasetId>(),
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
  };
}

/** A layer with a data source and a geo binding that resolves. */
function createQueryableLayer(): MapLayer.T {
  const layer = MapLayer.makeEmpty("Cases");
  const latitude = QueryColumn.makeFromDatasetColumn(
    createNumericColumn("lat"),
  );
  const longitude = QueryColumn.makeFromDatasetColumn(
    createNumericColumn("lon"),
  );
  return {
    ...layer,
    source: {
      ...layer.source,
      dataSource: { __type: "Dataset", id: "dataset-1" },
      queryColumns: [latitude, longitude],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
  } as never;
}

/** Wraps a hook under test with the `QueryClient` it needs. */
function _wrapperForHook(options: { children: ReactNode }): JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, options.children);
}

describe("useMapLayerData", () => {
  const workspaceId = uuid<Workspace.Id>();

  beforeEach(() => {
    runStructuredQueryMock.mockReset();
  });

  it("queries with the layer's source when the layer is queryable", async () => {
    const layer = createQueryableLayer();
    const queryResult: QueryResult<UnknownRow> = {
      id: uuid<QueryResultId>(),
      data: [{ cases: 1 }],
      columns: [{ name: "cases", dataType: "double" }],
      numRows: 1,
    };
    runStructuredQueryMock.mockResolvedValue(queryResult);

    const { result } = renderHook(
      () => {
        return useMapLayerData({ layer, workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual(queryResult);
    });

    expect(runStructuredQueryMock).toHaveBeenCalledTimes(1);
    expect(runStructuredQueryMock.mock.calls[0]?.[0]).toMatchObject({
      query: layer.source,
    });
  });

  it("does not query a layer with no data source", async () => {
    const layer = MapLayer.makeEmpty("Cases");

    renderHook(
      () => {
        return useMapLayerData({ layer, workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    await new Promise((resolve) => {
      return setTimeout(resolve, 0);
    });

    expect(runStructuredQueryMock).not.toHaveBeenCalled();
  });

  it("does not query a layer whose geo binding does not resolve", async () => {
    const layer = {
      ...createQueryableLayer(),
      geoBinding: {
        type: "latLngColumns" as const,
        latitude: uuid(),
        longitude: uuid(),
      },
    } as never as MapLayer.T;

    renderHook(
      () => {
        return useMapLayerData({ layer, workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    await new Promise((resolve) => {
      return setTimeout(resolve, 0);
    });

    expect(runStructuredQueryMock).not.toHaveBeenCalled();
  });
});

describe("isMapLayerQueryable", () => {
  it("is false until the layer has a data source", () => {
    expect(isMapLayerQueryable(MapLayer.makeEmpty("Cases"))).toBe(false);
  });

  it("is false when the layer has a source but no resolvable geo binding", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withSource = {
      ...layer,
      source: { ...layer.source, dataSource: { __type: "Dataset", id: "d1" } },
    } as never;
    expect(isMapLayerQueryable(withSource)).toBe(false);
  });
});

describe("buildMapLayerQueryKey", () => {
  it("changes when the source changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withLimit = { ...layer, source: { ...layer.source, limit: 500 } };
    expect(buildMapLayerQueryKey(layer)).not.toEqual(
      buildMapLayerQueryKey(withLimit),
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
    expect(buildMapLayerQueryKey(layer)).toEqual(
      buildMapLayerQueryKey(recolored),
    );
  });
});

describe("compiled SQL for a lat/lng layer", () => {
  it("uses no spatial function", () => {
    const latitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lat"),
    );
    const longitude = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("lon"),
    );
    const query = {
      ...StructuredQuery.makeEmpty(),
      dataSource: { __type: "Dataset", id: "dataset-1" },
      queryColumns: [latitude, longitude],
    } as never;

    expect(StructuredQuery.toRawDuckDBQuery(query)).not.toMatch(/ST_/i);
  });
});
