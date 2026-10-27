import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { makeBufferLayersFromSource } from "./makeBufferLayersFromSource";
import type { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";

type Props = { children: ReactNode };
/** Persisted filter trees must hydrate before any map compiler reads them. */
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import * as StructuredQueryCompiler from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import * as SpatialCompiler from "@/clients/maps/MapLayerSpatialQuery/compileMapLayerSpatialQuery/compileMapLayerSpatialQuery";
import { TestProviders, renderHook, waitFor } from "@/test-utils";
import { useMapLayersData } from "./layers/useMapLayersData/useMapLayersData";
import { useMapTimeExtent } from "./shell/MapTimeSlider/useMapTimeExtent";
import { useHydratedMapSources } from "./useGisApp/MapSourceHydration/useHydratedMapSources/useHydratedMapSources";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const boundary = vi.hoisted<{
  columns: DatasetColumn.T[];
  status: "pending" | "error" | "success";
  runQuery: ReturnType<typeof vi.fn>;
}>(() => {
  return {
    columns: [] as DatasetColumn.T[],
    status: "pending" as "pending" | "error" | "success",
    runQuery: vi.fn(),
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [
          boundary.columns,
          boundary.status === "pending",
          {
            isSuccess: boundary.status === "success",
            isError: boundary.status === "error",
            isPending: boundary.status === "pending",
          },
        ];
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
vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      getSpatialAvailability: () => {
        return "available";
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
  return { WorkspaceQuerySession: { runQuery: boundary.runQuery } };
});

const workspaceId = "workspace" as Workspace.Id;
const structuredCompiler = vi.spyOn(
  StructuredQueryCompiler,
  "structuredQueryToSql",
);
const spatialCompiler = vi.spyOn(
  SpatialCompiler,
  "compileMapLayerSpatialQuery",
);

function _createFixture({
  clause,
  bufferDepth = 0,
}: {
  clause: "where" | "having";
  bufferDepth?: number;
}): { config: AvaMapConfig.T; columns: DatasetColumn.T[] } {
  const columns = (
    [
      { name: "shape", dataType: "varchar" },
      { name: "observed_at", dataType: "timestamp" },
      { name: "cnt", dataType: "bigint" },
    ] as const
  ).map(({ name, dataType }) => {
    return Model.make("DatasetColumn", {
      id: name,
      datasetId: "cases",
      name,
      dataType,
    }) as DatasetColumn.T;
  });
  const projections = columns.map(QueryColumn.makeFromDatasetColumn);
  const shape = projections[0]!;
  const observedAt = projections[1]!;
  const total = {
    ...projections[2]!,
    aggregation: "sum" as const,
    outputAlias: "total",
  };
  const empty = MapLayer.makeEmpty("cases");
  const layers = [
    {
      ...empty,
      timeColumn: observedAt.id,
      geoBinding: {
        type: "geometryColumn",
        column: shape.id,
        encoding: "wkt",
        family: "point",
      },
      source: {
        ...empty.source,
        dataSource: Model.make("Dataset", {
          id: "cases",
          name: "cases",
        }) as Dataset.T,
        queryColumns:
          clause === "having"
            ? [shape, observedAt, total]
            : [shape, observedAt],
        aggregations:
          clause === "having"
            ? {
                [shape.id]: "group_by",
                [observedAt.id]: "group_by",
                [total.id]: "sum",
              }
            : {},
        [clause === "having" ? "having" : "filters"]: {
          type: "group",
          combinator: "AND",
          rules: [
            {
              type: "rule",
              columnName: clause === "having" ? "total" : "cnt",
              operator: ">=",
              value: 5,
            },
          ],
        },
      },
    },
  ];
  const buffers = makeBufferLayersFromSource({
    sourceId: empty.id,
    bufferDepth,
  });
  const config = AvaMapConfigSchema.fromJson({
    ...AvaMapConfig.makeEmpty(),
    layers: [...layers, ...buffers],
  });
  return { config, columns };
}

function _createEditor(
  mapConfig: AvaMapConfig.T,
): ReturnType<typeof useAvaMapEditor> {
  return {
    name: "map",
    mapConfig,
    saveState: "saved" as const,
    updateName: vi.fn(),
    updateConfig: vi.fn(),
    saveNow: vi.fn(),
  };
}

function _createWrapper(): (props: Readonly<Props>) => ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: Readonly<Props>): ReactNode => {
    return (
      <TestProviders>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </TestProviders>
    );
  };
}

function useLayerQueries(
  layers: readonly MapLayer.T[],
): ReturnType<typeof useMapLayersData> {
  return useMapLayersData({
    layers,
    workspaceId,
    overlay: { aoi: undefined, timeRange: undefined },
  });
}

function useTimeQuery(
  layers: readonly MapLayer.T[],
): ReturnType<typeof useMapTimeExtent> {
  return useMapTimeExtent({ layers, workspaceId });
}

beforeEach(() => {
  vi.clearAllMocks();
  boundary.columns = [];
  boundary.status = "pending";
  boundary.runQuery.mockImplementation(
    async ({ rawSql }: { rawSql: string }) => {
      const data = rawSql.includes("extent_start")
        ? [
            {
              extent_start: "2026-01-01T00:00:00Z",
              extent_end: "2026-01-02T00:00:00Z",
            },
          ]
        : [
            {
              __avandar_feature_collection: {
                type: "FeatureCollection",
                features: [],
              },
              __avandar_diagnostics: {
                sourceCount: 0,
                parsedCount: 0,
                invalidCount: 0,
                observedFamilies: [],
                hasMixedFamilies: false,
              },
            },
          ];
      return { id: "result", columns: [], data, numRows: data.length };
    },
  );
});

it.each([
  { name: "layer", useConsumer: useLayerQueries },
  { name: "time extent", useConsumer: useTimeQuery },
])(
  "defers $name compilation of legacy HAVING until metadata recovers",
  async ({ useConsumer }) => {
    const { config, columns } = _createFixture({ clause: "having" });
    const editor = _createEditor(config);
    const { result, rerender } = renderHook(
      () => {
        const hydrated = useHydratedMapSources({
          editor: editor,
          workspaceId: workspaceId,
        });
        useConsumer(hydrated.mapConfig.layers);
        return hydrated;
      },
      { wrapper: _createWrapper() },
    );
    expect(structuredCompiler).not.toHaveBeenCalled();
    expect(spatialCompiler).not.toHaveBeenCalled();
    boundary.status = "error";
    rerender();
    expect(structuredCompiler).not.toHaveBeenCalled();
    expect(spatialCompiler).not.toHaveBeenCalled();
    expect(result.current.mapConfig.layers[0]?.source.having).toEqual(
      config.layers[0]?.source.having,
    );
    boundary.status = "success";
    boundary.columns = columns;
    rerender();
    await waitFor(() => {
      expect(boundary.runQuery).toHaveBeenCalled();
    });
    expect(
      boundary.runQuery.mock.calls.every(([input]) => {
        return input.rawSql.includes('having sum("cnt") >= 5');
      }),
    ).toBe(true);
  },
);

it("defers buffered legacy source compilation through every dependency until metadata recovers", async () => {
  const { config, columns } = _createFixture({
    clause: "where",
    bufferDepth: 2,
  });
  const editor = _createEditor(config);
  const { result, rerender } = renderHook(
    () => {
      const hydrated = useHydratedMapSources({
        editor: editor,
        workspaceId: workspaceId,
      });
      const queries = useLayerQueries(hydrated.mapConfig.layers);
      return { hydrated, queries };
    },
    { wrapper: _createWrapper() },
  );
  expect(spatialCompiler).not.toHaveBeenCalled();
  expect(structuredCompiler).not.toHaveBeenCalled();
  boundary.status = "error";
  rerender();
  expect(spatialCompiler).not.toHaveBeenCalled();
  expect(structuredCompiler).not.toHaveBeenCalled();
  boundary.status = "success";
  boundary.columns = columns;
  rerender();
  await waitFor(() => {
    config.layers.forEach((layer) => {
      expect(result.current.queries.get(layer.id)?.data?.type).toBe("spatial");
    });
  });
  expect(boundary.runQuery.mock.calls).toHaveLength(3);
  expect(
    boundary.runQuery.mock.calls.every(([input]) => {
      return input.rawSql.includes('where "cnt" >= 5');
    }),
  ).toBe(true);
});
