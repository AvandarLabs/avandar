import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactElement, ReactNode } from "react";

const { runStructuredQueryMock } = vi.hoisted(() => {
  return { runStructuredQueryMock: vi.fn() };
});

vi.mock("@/clients/queries/runStructuredQuery/runStructuredQuery", () => {
  return { runStructuredQuery: runStructuredQueryMock };
});

const { useMapLayerData } =
  await import("@/views/GisApp/layers/useMapLayerData/useMapLayerData");
const { MapLayerData } =
  await import("@/views/GisApp/layers/useMapLayerData/MapLayerData");

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
function _createQueryableLayer(): MapLayer.T {
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

/** Wraps a hook under test with the `QueryClient` it needs. */
function _wrapperForHook(options: { children: ReactNode }): ReactElement {
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

  it("does not query a layer with no data source", () => {
    const layer = MapLayer.makeEmpty("Cases");

    const { result } = renderHook(
      () => {
        return useMapLayerData({ layer, workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    // A disabled query never invokes its queryFn, so this holds synchronously.
    expect(runStructuredQueryMock).not.toHaveBeenCalled();
    expect(result.current[0]).toBeUndefined();
    expect(result.current[1]).toBe(false);
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
        return useMapLayerData({ layer, workspaceId });
      },
      { wrapper: _wrapperForHook },
    );

    expect(runStructuredQueryMock).not.toHaveBeenCalled();
    expect(result.current[0]).toBeUndefined();
    expect(result.current[1]).toBe(false);
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

describe("MapLayerData.makeQueryKey", () => {
  it("changes when the source changes", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const withLimit = { ...layer, source: { ...layer.source, limit: 500 } };
    expect(MapLayerData.makeQueryKey(layer)).not.toEqual(
      MapLayerData.makeQueryKey(withLimit),
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
    expect(MapLayerData.makeQueryKey(layer)).toEqual(
      MapLayerData.makeQueryKey(recolored),
    );
  });
});
