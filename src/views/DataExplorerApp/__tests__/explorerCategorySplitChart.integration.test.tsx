/**
 * Runs the Data Explorer on a long SQL result (one row per week and
 * district) and checks what it hands `VisualizationContainer`: a line chart
 * gets one series per district, while the table gets the rows as returned.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { makeUiVizConfigFromAvaVizConfig } from "$/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { TestProviders, act, cleanup, renderHook, waitFor } from "@/test-utils";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ReactNode } from "react";

type VisualizationProps = {
  columns: readonly QueryResult.ColumnWithId[];
  data: UnknownDataFrame;
  vizConfig: AvaVizConfig.T;
};

const SQL = 'SELECT "week", "district", "cases" FROM "weekly_cases"';

const LONG_ROWS = [
  { week: "2024-01-01", district: "North", cases: 5 },
  { week: "2024-01-01", district: "South", cases: 3 },
  { week: "2024-01-08", district: "North", cases: 7 },
  { week: "2024-01-08", district: "South", cases: 2 },
];

const fixtures = vi.hoisted(() => {
  return {
    renderedProps: [] as VisualizationProps[],
    drawerSplitColumnNames: [] as Array<string | undefined>,
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "acme" };
    },
  };
});
vi.mock("@/views/DataExplorerApp/useDataExplorerUrlSync", () => {
  return {
    useDataExplorerUrlSync: () => {
      return undefined;
    },
  };
});
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
vi.mock("@/views/DataExplorerApp/useDataQuery/useDataQuery", () => {
  return {
    useDataQuery: (options: { rawSql: string | undefined }) => {
      if (options.rawSql === undefined) {
        return [undefined, false, { isError: false, isSuccess: false }];
      }
      const result = {
        id: "long-result",
        columns: [
          { name: "week", dataType: "date" },
          { name: "district", dataType: "varchar" },
          { name: "cases", dataType: "bigint" },
        ],
        data: LONG_ROWS,
        numRows: LONG_ROWS.length,
        executedSql: options.rawSql,
      };
      return [result, false, { isError: false, isSuccess: true }];
    },
  };
});
vi.mock("@/components/VisualizationContainer/VisualizationContainer", () => {
  return {
    VisualizationContainer: (props: VisualizationProps) => {
      fixtures.renderedProps.push(props);
      return null;
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
    DataExplorerDrawer: (props: { splitColumnName: string | undefined }) => {
      fixtures.drawerSplitColumnNames.push(props.splitColumnName);
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

/** Mounts the Explorer and returns its state and dispatch. */
function _renderExplorer() {
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
                    urlSearch={EMPTY_EXPLORER_URL_SEARCH}
                    navigate={() => {}}
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

function _getLastRenderedProps(): VisualizationProps {
  const props = fixtures.renderedProps.at(-1);
  if (props === undefined) {
    throw new Error("VisualizationContainer was never rendered");
  }
  return props;
}

afterEach(() => {
  cleanup();
  fixtures.renderedProps = [];
  fixtures.drawerSplitColumnNames = [];
});

it("draws a line per district for a long result in line view", async () => {
  const explorer = _renderExplorer();

  act(() => {
    explorer.result.current[1].setRawSql(SQL);
  });
  await waitFor(() => {
    expect(explorer.result.current[0].lastResultColumns).toBeDefined();
  });
  act(() => {
    explorer.result.current[1].setActiveVizType("line");
  });

  await waitFor(() => {
    expect(_getLastRenderedProps().vizConfig.vizType).toBe("line");
  });
  const { columns, data, vizConfig } = _getLastRenderedProps();
  expect(
    makeUiVizConfigFromAvaVizConfig({ config: vizConfig, columns }).config,
  ).toMatchObject({
    xAxisKey: "week",
    withLegend: true,
    series: [{ key: "North" }, { key: "South" }],
  });
  expect(data).toEqual([
    { week: "2024-01-01", North: 5, South: 3 },
    { week: "2024-01-08", North: 7, South: 2 },
  ]);
  expect(fixtures.drawerSplitColumnNames.at(-1)).toBe("district");
});

it("keeps the line view's stored chart on the one cases series", async () => {
  const explorer = _renderExplorer();

  act(() => {
    explorer.result.current[1].setRawSql(SQL);
  });
  await waitFor(() => {
    expect(explorer.result.current[0].lastResultColumns).toBeDefined();
  });
  act(() => {
    explorer.result.current[1].setActiveVizType("line");
  });

  const state = explorer.result.current[0];
  const casesColumn = state.lastResultColumns?.find((column) => {
    return column.name === "cases";
  });
  expect(state.vizConfig).toMatchObject({
    vizType: "line",
    series: [{ key: casesColumn?.id }],
  });
});

it("gives the table view the rows as the query returned them", async () => {
  const explorer = _renderExplorer();

  act(() => {
    explorer.result.current[1].setRawSql(SQL);
  });
  await waitFor(() => {
    expect(explorer.result.current[0].lastResultColumns).toBeDefined();
  });
  act(() => {
    explorer.result.current[1].setActiveVizType("line");
  });
  act(() => {
    explorer.result.current[1].setActiveVizType("table");
  });

  await waitFor(() => {
    expect(_getLastRenderedProps().vizConfig.vizType).toBe("table");
  });
  expect(_getLastRenderedProps().data).toEqual(LONG_ROWS);
  expect(fixtures.drawerSplitColumnNames.at(-1)).toBeUndefined();
});
