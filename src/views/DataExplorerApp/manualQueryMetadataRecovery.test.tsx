import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { TestProviders, act, renderHook, waitFor } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { ReactNode } from "react";
type Props = { children: ReactNode };
/** Exercises column reconstruction and chart edits through the real store. */
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const metadata = vi.hoisted<{
  columns: DatasetColumn.T[];
  shouldFail: boolean;
  observedStatus: string;
}>(() => {
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
      return undefined;
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

function _createSourceColumn({
  name,
  dataType,
}: {
  name: string;
  dataType: AvaDataType.T;
}): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: `dc_${name}` as DatasetColumn.Id,
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  }) as DatasetColumn.T;
}

it("preserves selected IDs, SUM, ordering, and SQL when reopened metadata fails", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const sourceColumn = _createSourceColumn({
    name: "revenue",
    dataType: "double",
  });
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
      wrapper: ({ children }: Readonly<Props>) => {
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
