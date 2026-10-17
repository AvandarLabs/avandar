/** Exercises column reconstruction and chart edits through the real store. */
import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { resolveVizColumnBindings } from "$/models/vizs/resolveVizColumnBindings/resolveVizColumnBindings";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { ReactNode } from "react";

const metadata = vi.hoisted(() => {
  return {
    columns: [] as DatasetColumn.T[],
    shouldFail: false,
    observedStatus: "pending",
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    DatasetColumnClient: {
      useGetAll: (options: { useQueryOptions: { enabled: boolean } }) => {
        const query = useQuery({
          queryKey: ["identity-metadata", "dataset"],
          queryFn: async () => {
            if (metadata.shouldFail) {
              throw new Error("Metadata unavailable");
            }
            return metadata.columns;
          },
          enabled: options.useQueryOptions.enabled,
          retry: false,
        });
        if (options.useQueryOptions.enabled) {
          metadata.observedStatus = query.status;
        }
        return [query.data, query.isLoading, query];
      },
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        const query = useQuery({
          queryKey: ["identity-metadata", "concept"],
          queryFn: async () => {
            return [];
          },
          enabled: false,
        });
        return [query.data, query.isLoading, query];
      },
    },
  };
});
vi.mock("@/views/DataExplorerApp/QueryDataSourceSelect", () => {
  return {
    QueryDataSourceSelect: () => {
      return null;
    },
  };
});
vi.mock(
  "@/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange",
  () => {
    return {
      useManualQueryDataSourceChange: () => {
        return {
          onDataSourceChange: () => {},
          isLargeDatasetLimitHintVisible: false,
          dismissLargeDatasetLimitHint: () => {},
        };
      },
    };
  },
);

const _STYLED_BAR_CONFIG: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "quarter" as QueryColumn.Id,
  layout: "group",
  withLegend: true,
  series: [
    {
      key: "revenue" as QueryColumn.Id,
      renderAs: "line",
      label: "Revenue trend",
      color: "#123456",
      strokeWidth: 4,
    },
    {
      key: "profit" as QueryColumn.Id,
      renderAs: "bar",
      label: "Profit",
      color: "#654321",
    },
  ],
};

function _createSourceColumn(
  name: string,
  dataType: AvaDataType.T,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: `dc_${name}` as DatasetColumn.Id,
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  }) as DatasetColumn.T;
}

function _Wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

function _renderStateManager() {
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    {
      wrapper: _Wrapper,
    },
  );
}

describe("Data Explorer column identity", () => {
  it("keeps a styled series when its aggregation changes and another series survives", () => {
    const { result } = _renderStateManager();
    const quarter = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("quarter", "varchar"),
    );
    const revenue = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("revenue", "double"),
    );
    const profit = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("profit", "double"),
    );
    act(() => {
      return result.current[1].setColumns([quarter, revenue, profit]);
    });
    act(() => {
      return result.current[1].setVizConfig({
        ..._STYLED_BAR_CONFIG,
        xAxisKey: quarter.id,
        series: _STYLED_BAR_CONFIG.series.map((series) => {
          return {
            ...series,
            key: series.key === "revenue" ? revenue.id : profit.id,
          };
        }),
      });
    });

    act(() => {
      return result.current[1].setColumnAggregation({
        columnId: revenue.id,
        aggregation: "sum",
      });
    });

    const resolved = resolveVizColumnBindings(result.current[0].vizConfig, [
      { id: quarter.id, name: "quarter", dataType: "varchar" },
      { id: revenue.id, name: "sum(revenue)", dataType: "double" },
      { id: profit.id, name: "profit", dataType: "double" },
    ]);
    expect(resolved.config).toMatchObject({
      series: [
        {
          key: "sum(revenue)" as QueryColumn.Id,
          renderAs: "line",
          label: "Revenue trend",
          color: "#123456",
          strokeWidth: 4,
        },
        {
          key: "profit" as QueryColumn.Id,
          renderAs: "bar",
          label: "Profit",
          color: "#654321",
        },
      ],
    });
  });

  it("waits for current raw-SQL metadata before seeding a new chart type", () => {
    const { result } = _renderStateManager();
    const oldColumn = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("old", "double"),
    );
    act(() => {
      return result.current[1].setColumns([oldColumn]);
    });
    act(() => {
      return result.current[1].setRawSql("SELECT other FROM new_source");
    });
    act(() => {
      return result.current[1].setActiveVizType("bar");
    });
    expect(result.current[0].vizConfig).toMatchObject({
      xAxisKey: undefined,
      series: [],
    });
    const currentColumns = [
      {
        id: "new-output" as QueryColumn.Id,
        name: "other",
        dataType: "double" as const,
      },
    ];
    act(() => {
      return result.current[1].syncVizFromQueryResult(currentColumns);
    });
    expect(result.current[0].vizConfig).toMatchObject({
      series: [{ key: currentColumns[0]!.id }],
    });
  });

  it("propagates scatter X-only and bubble size-only changes through the real provider", () => {
    const { result } = _renderStateManager();
    const x = "x" as QueryColumn.Id;
    const y = "y" as QueryColumn.Id;
    const size = "size" as QueryColumn.Id;
    const changed = "changed" as QueryColumn.Id;
    const columns = [x, y, size, changed].map((id) => {
      return { id, name: String(id), dataType: "double" as const };
    });
    act(() => {
      return result.current[1].setVizConfig({
        vizType: "scatter",
        series: [{ xKey: x, key: y, label: "Measured", color: "#123456" }],
      });
    });
    act(() => {
      return result.current[1].syncVizFromQueryResult(columns);
    });
    act(() => {
      return result.current[1].setVizConfig({
        vizType: "scatter",
        series: [
          { xKey: changed, key: y, label: "Measured", color: "#123456" },
        ],
      });
    });
    act(() => {
      return result.current[1].syncVizFromQueryResult(columns);
    });
    expect(
      resolveVizColumnBindings(result.current[0].vizConfig, columns).config,
    ).toMatchObject({
      series: [
        { xKey: "changed", key: "y", label: "Measured", color: "#123456" },
      ],
    });
    act(() => {
      return result.current[1].setVizConfig({
        vizType: "bubble",
        series: [{ xKey: x, key: y, sizeKey: size, color: "#654321" }],
      });
    });
    act(() => {
      return result.current[1].syncVizFromQueryResult(columns);
    });
    act(() => {
      return result.current[1].setVizConfig({
        vizType: "bubble",
        series: [{ xKey: x, key: y, sizeKey: changed, color: "#654321" }],
      });
    });
    act(() => {
      return result.current[1].syncVizFromQueryResult(columns);
    });
    expect(
      resolveVizColumnBindings(result.current[0].vizConfig, columns).config,
    ).toMatchObject({
      series: [{ xKey: "x", key: "y", sizeKey: "changed", color: "#654321" }],
    });
  });

  it("keeps aggregate SQL when selected columns are rebuilt from the same source metadata", () => {
    const { result } = _renderStateManager();
    const sourceColumn = _createSourceColumn("revenue", "double");
    const revenue = QueryColumn.makeFromDatasetColumn(sourceColumn);
    const dataset = Model.make("Dataset", {
      id: "sales",
      name: "sales",
    }) as Dataset.T;
    act(() => {
      return result.current[1].setDataSource({ dataSource: dataset });
    });
    act(() => {
      return result.current[1].setColumns([revenue]);
    });
    act(() => {
      return result.current[1].setColumnAggregation({
        columnId: revenue.id,
        aggregation: "sum",
      });
    });
    act(() => {
      result.current[1].setOrderByColumn(revenue.id);
      result.current[1].setOrderByDirection("desc");
    });
    const aggregatedSql = result.current[0].rawSql;
    expect(aggregatedSql).toContain('sum("revenue")');

    // The source loader and column picker reconstruct wrappers this way.
    const refreshedRevenue = QueryColumn.makeFromDatasetColumn({
      ...sourceColumn,
    });
    act(() => {
      return result.current[1].setColumns([refreshedRevenue]);
    });

    expect(result.current[0].rawSql).toBe(aggregatedSql);

    act(() => {
      result.current[1].setColumns([
        QueryColumn.makeFromDatasetColumn({
          ...sourceColumn,
          name: "net_revenue",
        }),
      ]);
    });
    expect(result.current[0].rawSql).toContain('sum("net_revenue")');
    expect(result.current[0].rawSql).toContain(
      'order by "sum(net_revenue)" desc',
    );
    expect(result.current[0].query.orderByColumn).toBe(revenue.id);
  });

  it("does not inherit aggregation or ordering from a different source column with the same name", () => {
    const { result } = _renderStateManager();
    const revenue = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("revenue", "double"),
    );
    act(() => {
      result.current[1].setColumns([revenue]);
      result.current[1].setColumnAggregation({
        columnId: revenue.id,
        aggregation: "sum",
      });
      result.current[1].setOrderByColumn(revenue.id);
    });
    const replacement = QueryColumn.makeFromDatasetColumn({
      ...revenue.baseColumn,
      id: "dc_replacement" as DatasetColumn.Id,
    } as DatasetColumn.T);
    act(() => {
      result.current[1].setColumns([replacement]);
    });
    expect(result.current[0].query.queryColumns).toEqual([replacement]);
    expect(result.current[0].query.aggregations[replacement.id]).toBe("none");
    expect(result.current[0].query.orderByColumn).toBeUndefined();
  });

  it("retains both explicit projection IDs over one source column", () => {
    const { result } = _renderStateManager();
    const sourceColumn = _createSourceColumn("revenue", "double");
    const sumRevenue = QueryColumn.makeFromDatasetColumn(sourceColumn);
    const averageRevenue = QueryColumn.makeFromDatasetColumn(sourceColumn);
    act(() => {
      result.current[1].setColumns([sumRevenue]);
      result.current[1].setColumnAggregation({
        columnId: sumRevenue.id,
        aggregation: "sum",
      });
      result.current[1].setColumns([sumRevenue, averageRevenue]);
      result.current[1].setColumnAggregation({
        columnId: averageRevenue.id,
        aggregation: "avg",
      });
    });
    act(() => {
      result.current[1].setColumns([
        {
          ...averageRevenue,
          baseColumn: { ...sourceColumn, name: "net_revenue" },
        },
        { ...sumRevenue, baseColumn: { ...sourceColumn, name: "net_revenue" } },
      ]);
    });
    expect(
      result.current[0].query.queryColumns.map(({ id, aggregation }) => {
        return { id, aggregation };
      }),
    ).toEqual([
      { id: averageRevenue.id, aggregation: "avg" },
      { id: sumRevenue.id, aggregation: "sum" },
    ]);
    act(() => {
      result.current[1].setColumnAggregation({
        columnId: sumRevenue.id,
        aggregation: "max",
      });
    });
    expect(result.current[0].query.aggregations).toEqual({
      [averageRevenue.id]: "avg",
      [sumRevenue.id]: "max",
    });
    expect(
      result.current[0].query.queryColumns.map(({ id, aggregation }) => {
        return { id, aggregation };
      }),
    ).toEqual([
      { id: averageRevenue.id, aggregation: "avg" },
      { id: sumRevenue.id, aggregation: "max" },
    ]);
  });

  it("keeps source catalog IDs while refreshing selected metadata and ignores late catalogs", () => {
    const { result } = _renderStateManager();
    const source = QueryColumn.makeFromDatasetColumn(
      _createSourceColumn("revenue", "double"),
    );
    const dataset = Model.make("Dataset", {
      id: "sales",
      name: "sales",
    }) as Dataset.T;
    const sourceKey = Model.getTypedId(dataset);
    act(() => {
      result.current[1].setDataSource({ dataSource: dataset });
    });
    expect(result.current[0].sourceCatalog).toMatchObject({
      status: "loading",
      columns: [],
    });
    act(() => {
      result.current[1].setSourceColumns({
        sourceKey,
        status: "ready",
        columns: [source],
      });
      result.current[1].setColumns([
        QueryColumn.makeFromDatasetColumn(source.baseColumn as DatasetColumn.T),
      ]);
    });
    const selectedId = result.current[0].query.queryColumns[0]!.id;
    act(() => {
      result.current[1].setColumnAggregation({
        columnId: selectedId,
        aggregation: "sum",
      });
      result.current[1].setOrderByColumn(selectedId);
      result.current[1].setSourceColumns({
        sourceKey: { ...sourceKey },
        status: "ready",
        columns: [
          QueryColumn.makeFromDatasetColumn({
            ...source.baseColumn,
            name: "net_revenue",
          } as DatasetColumn.T),
        ],
      });
    });
    expect(result.current[0].sourceCatalog?.columns[0]?.id).toBe(source.id);
    expect(result.current[0].query.sourceColumns).toBe(
      result.current[0].sourceCatalog?.columns,
    );
    expect(result.current[0].query.queryColumns[0]).toMatchObject({
      id: selectedId,
      aggregation: "sum",
      baseColumn: { name: "net_revenue" },
    });
    expect(result.current[0].rawSql).toContain('sum("net_revenue")');
    const otherDataset = Model.make("Dataset", {
      id: "other",
      name: "other",
    }) as Dataset.T;
    act(() => {
      result.current[1].setDataSource({ dataSource: otherDataset });
      result.current[1].setSourceColumns({
        sourceKey,
        status: "ready",
        columns: [source],
      });
    });
    expect(result.current[0].sourceCatalog).toMatchObject({
      sourceKey: { id: "other" },
      status: "loading",
      columns: [],
    });
    expect(result.current[0].query.queryColumns).toEqual([]);
    expect(result.current[0].query.sourceColumns).toBeUndefined();
    act(() => {
      result.current[1].setSourceColumns({
        sourceKey: Model.getTypedId(otherDataset),
        status: "ready",
        columns: [],
      });
    });
    expect(result.current[0].sourceCatalog).toMatchObject({
      status: "ready",
      columns: [],
    });
    expect(result.current[0].query.sourceColumns).toEqual([]);
  });

  it("preserves selected IDs, SUM, ordering, and SQL when reopened metadata fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const sourceColumn = _createSourceColumn("revenue", "double");
    const revenue = QueryColumn.makeFromDatasetColumn(sourceColumn);
    const dataset = Model.make("Dataset", {
      id: "sales",
      name: "sales",
    }) as Dataset.T;
    metadata.columns = [sourceColumn];
    metadata.shouldFail = false;
    let isFormOpen = false;
    const { result, rerender, unmount } = renderHook(
      () => {
        return DataExplorerStateManager.useContext();
      },
      {
        wrapper: ({ children }) => {
          return (
            <TestProviders>
              <QueryClientProvider client={queryClient}>
                <DataExplorerStateManager.Provider>
                  {children}
                  {isFormOpen ? <ManualQueryForm withinPortal={false} /> : null}
                </DataExplorerStateManager.Provider>
              </QueryClientProvider>
            </TestProviders>
          );
        },
      },
    );
    try {
      act(() => {
        result.current[1].setDataSource({ dataSource: dataset });
        result.current[1].setColumns([revenue]);
        result.current[1].setColumnAggregation({
          columnId: revenue.id,
          aggregation: "sum",
        });
        result.current[1].setOrderByColumn(revenue.id);
        result.current[1].setOrderByDirection("desc");
      });
      const aggregatedSql = result.current[0].rawSql;
      expect(aggregatedSql).toContain('sum("revenue")');
      isFormOpen = true;
      rerender();
      await waitFor(() => {
        expect(result.current[0].sourceCatalog?.status).toBe("ready");
      });
      const catalogId = result.current[0].sourceCatalog?.columns[0]?.id;
      isFormOpen = false;
      rerender();
      queryClient.removeQueries({ queryKey: ["identity-metadata"] });
      metadata.shouldFail = true;
      isFormOpen = true;
      rerender();
      // Wait for the form's observer, not only the earlier cache transition.
      await waitFor(() => {
        expect(metadata.observedStatus).toBe("error");
      });
      expect(result.current[0].query.queryColumns).toMatchObject([
        { id: revenue.id, aggregation: "sum" },
      ]);
      expect(result.current[0].query.aggregations).toEqual({
        [revenue.id]: "sum",
      });
      expect(result.current[0].query.orderByColumn).toBe(revenue.id);
      expect(result.current[0].query.orderByDirection).toBe("desc");
      expect(result.current[0].rawSql).toBe(aggregatedSql);
      expect(result.current[0].sourceCatalog).toMatchObject({
        status: "loading",
        columns: [{ id: catalogId }],
      });
      metadata.shouldFail = false;
      metadata.columns = [];
      await act(async () => {
        await queryClient.refetchQueries({
          queryKey: ["identity-metadata", "dataset"],
        });
      });
      await waitFor(() => {
        expect(result.current[0].sourceCatalog).toMatchObject({
          status: "ready",
          columns: [],
        });
      });
      expect(result.current[0].query.queryColumns).toEqual([]);
      expect(result.current[0].query.aggregations).toEqual({});
      expect(result.current[0].query.orderByColumn).toBeUndefined();
    } finally {
      unmount();
      queryClient.clear();
    }
  });
});
