import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import {
  TestProviders,
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from "@/test-utils";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { DataExplorerUrlSearch } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { ReactNode } from "react";

type BarChartProps = { xAxisKey: string; series: readonly unknown[] };
type DataQueryOptions = {
  query: PartialStructuredQuery;
  rawSql: string | undefined;
  isStructuredQueryInSync?: boolean;
};

const fixtures = vi.hoisted(() => {
  return {
    datasets: [] as unknown[],
    datasetColumns: [] as unknown[],
    isQueryPending: false,
    resultsBySql: new Map<string, unknown>(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme" };
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [fixtures.datasets, false, {}];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [fixtures.datasetColumns, false, {}];
      },
    },
  };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        return [undefined, false, {}];
      },
    },
  };
});
vi.mock(
  "@/views/DataExplorerApp/makeExecutableQueryFromManualQuery/makeExecutableQueryFromManualQuery",
  async (importOriginal) => {
    return {
      ...(await importOriginal<object>()),
      buildDataSourceCommitOptions: async () => {
        return undefined;
      },
    };
  },
);
vi.mock(
  "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit",
  () => {
    return {
      useSyncLargeDatasetAutoLimit: () => {
        return undefined;
      },
    };
  },
);
// Echoes the SQL the Explorer asked for, so a result always belongs to the
// query that is on screen, exactly as a completed execution would.
vi.mock("@/views/DataExplorerApp/useDataQuery/useDataQuery", async () => {
  const { selectSqlToExecute } =
    await import("@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute");
  return {
    useDataQuery: (options: DataQueryOptions) => {
      const sql = selectSqlToExecute({
        rawSql: options.rawSql,
        isStructuredQueryInSync: options.isStructuredQueryInSync ?? true,
        executionQuery: options.query,
      });
      if (sql === undefined || fixtures.isQueryPending) {
        return [
          undefined,
          fixtures.isQueryPending,
          { isError: false, isSuccess: false },
        ];
      }
      const result = fixtures.resultsBySql.get(sql) ?? {
        id: `result-${fixtures.resultsBySql.size}`,
        columns: [
          { name: "quarter", dataType: "varchar" },
          { name: "revenue", dataType: "double" },
        ],
        data: [
          { quarter: "Q1", revenue: 10 },
          { quarter: "Q2", revenue: 20 },
        ],
        numRows: 2,
        executedSql: sql,
      };
      fixtures.resultsBySql.set(sql, result);
      return [result, false, { isError: false, isSuccess: true }];
    },
  };
});
vi.mock("@/lib/ui/viz/BarChart", () => {
  return {
    BarChart: ({ xAxisKey, series }: BarChartProps) => {
      return (
        <output data-testid="bar-chart">
          {JSON.stringify({ xAxisKey, series })}
        </output>
      );
    },
  };
});
vi.mock("@/lib/ui/viz/LineChart", () => {
  return {
    LineChart: () => {
      return <output data-testid="line-chart" />;
    },
  };
});
vi.mock("@/components/layouts/AppSlate/AppSlate", () => {
  return {
    AppSlate: ({ children }: { children: ReactNode }) => {
      return <div>{children}</div>;
    },
  };
});
vi.mock("@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer", () => {
  return {
    DataExplorerDrawer: () => {
      return null;
    },
  };
});
vi.mock(
  "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu",
  () => {
    return {
      DataExplorerSaveMenu: () => {
        return null;
      },
    };
  },
);
vi.mock("@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal", () => {
  return {
    OpenDatasetModal: () => {
      return null;
    },
  };
});

const _STYLED_REVENUE_SERIES = {
  renderAs: "line",
  label: "Revenue trend",
  color: "#123456",
  strokeWidth: 4,
} as const;

/** A link to a styled bar chart, keyed by output name as the app writes it. */
const _STYLED_CHART_URL: DataExplorerUrlSearch = {
  sql: 'select "quarter", "revenue" from "sales"',
  vc: JSON.stringify({
    vizType: "bar",
    layout: "group",
    withLegend: true,
    xAxisKey: "quarter",
    series: [{ key: "revenue", ..._STYLED_REVENUE_SERIES }],
  }),
};

function _createSourceColumn({
  name,
  dataType,
}: {
  name: string;
  dataType: AvaDataType.T;
}): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id: `dc_${name}` as DatasetColumn.Id,
    datasetId: "sales",
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  }) as DatasetColumn.T;
}

/** Mounts one Explorer session, as a browser tab does on load. */
function _renderExplorerSession({
  urlSearch,
  onNavigate,
}: {
  urlSearch: DataExplorerUrlSearch;
  onNavigate: (search: DataExplorerUrlSearch) => void;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <TestProviders>
            <QueryClientProvider client={queryClient}>
              <ChatPanelStateManager.Provider>
                <DataExplorerStateManager.Provider>
                  {children}
                  <DataExplorerApp
                    urlSearch={urlSearch}
                    navigate={({ search }) => {
                      onNavigate(search);
                    }}
                  />
                </DataExplorerStateManager.Provider>
              </ChatPanelStateManager.Provider>
            </QueryClientProvider>
          </TestProviders>
        );
      },
    },
  );
}

async function _getRenderedBarChart(): Promise<BarChartProps> {
  const chart = await screen.findByTestId("bar-chart");
  return JSON.parse(chart.textContent ?? "{}") as BarChartProps;
}

beforeEach(() => {
  fixtures.datasets = [
    Model.make("Dataset", { id: "sales", name: "sales" }) as Dataset.T,
  ];
  fixtures.datasetColumns = [
    _createSourceColumn({ name: "quarter", dataType: "varchar" }),
    _createSourceColumn({ name: "revenue", dataType: "double" }),
  ];
  fixtures.isQueryPending = false;
});

afterEach(() => {
  cleanup();
  fixtures.resultsBySql.clear();
});

it("restores a styled bar chart from the URL of a reloaded Explorer tab", async () => {
  const writtenUrls: DataExplorerUrlSearch[] = [];
  const firstTab = _renderExplorerSession({
    urlSearch: EMPTY_EXPLORER_URL_SEARCH,
    onNavigate: (search) => {
      writtenUrls.push(search);
    },
  });
  const [quarter, revenue] = (fixtures.datasetColumns as DatasetColumn.T[]).map(
    (column) => {
      return QueryColumn.makeFromDatasetColumn(column);
    },
  );
  act(() => {
    const dispatch = firstTab.result.current[1];
    dispatch.setDataSource({ dataSource: fixtures.datasets[0] as Dataset.T });
    dispatch.setColumns([quarter!, revenue!]);
    dispatch.setVizConfig({
      vizType: "bar",
      layout: "group",
      withLegend: true,
      xAxisKey: quarter!.id,
      series: [{ key: revenue!.id, ..._STYLED_REVENUE_SERIES }],
    });
  });
  const styledChart = {
    xAxisKey: "quarter",
    series: [{ key: "revenue", ..._STYLED_REVENUE_SERIES }],
  };
  expect(await _getRenderedBarChart()).toMatchObject(styledChart);
  await waitFor(() => {
    expect(writtenUrls.at(-1)?.vc).toBeDefined();
  });
  const reloadedUrl = writtenUrls.at(-1)!;
  firstTab.unmount();

  _renderExplorerSession({ urlSearch: reloadedUrl, onNavigate: () => {} });

  expect(await _getRenderedBarChart()).toMatchObject(styledChart);
});

it("keeps the restored chart in the URL while the reopened query has no result", async () => {
  fixtures.isQueryPending = true;
  const writtenUrls: DataExplorerUrlSearch[] = [];
  const session = _renderExplorerSession({
    urlSearch: _STYLED_CHART_URL,
    onNavigate: (search) => {
      writtenUrls.push(search);
    },
  });
  await waitFor(() => {
    expect(session.result.current[0].rawSql).toBe(_STYLED_CHART_URL.sql);
  });
  await act(async () => {});

  expect(
    writtenUrls.filter((search) => {
      return search.vc !== _STYLED_CHART_URL.vc;
    }),
  ).toEqual([]);
});

it("keeps a chart type chosen before the reopened query returns", async () => {
  fixtures.isQueryPending = true;
  const session = _renderExplorerSession({
    urlSearch: _STYLED_CHART_URL,
    onNavigate: () => {},
  });
  await waitFor(() => {
    expect(session.result.current[0].vizConfig.vizType).toBe("bar");
  });
  act(() => {
    session.result.current[1].setActiveVizType("line");
  });

  fixtures.isQueryPending = false;
  session.rerender();

  expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
});
