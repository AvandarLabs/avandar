/**
 * A Data Explorer toolbar command that adds derived columns: the explorer runs
 * the wrapped SQL, and the notification's Undo restores the SQL and the chart
 * config from before the command.
 *
 * This renders the real `DataExplorerApp`, state manager, bridge hook, and
 * notification, and calls the real `addColumnsForInvocation` from a stand-in
 * for `PluginMenuSlot`. Loading and running plugin code is covered by the
 * `runPluginCommand` and `makePluginApi` tests, so the stand-in skips it.
 * `useDataQuery` echoes the SQL it is asked to run, as a completed run would.
 */
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import {
  TestProviders,
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@/test-utils";
import { DataExplorerApp } from "@/views/DataExplorerApp/DataExplorerApp";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { DataExplorerToolbarContext } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type DataQueryOptions = {
  rawSql: string | undefined;
};

type SaveMenuProps = { savableSql: string | undefined };

type FakeSlotProps = {
  getContext: (() => DataExplorerToolbarContext) | undefined;
  getDataExplorerBridge?: (() => DataExplorerBridge) | undefined;
};

const BASE_SQL = `SELECT "quarter", "revenue" FROM "sales"`;

const DOUBLE_REVENUE = {
  name: "double_revenue",
  expression: "{revenue} * 2",
  inputs: { revenue: "revenue" },
};

const { sql: WRAPPED_SQL } = makeDerivedColumnsSqlFromColumns({
  baseSql: BASE_SQL,
  existingColumnNames: ["quarter", "revenue"],
  columns: [DOUBLE_REVENUE],
});

const BASE_COLUMNS = [
  { name: "quarter", dataType: "varchar" },
  { name: "revenue", dataType: "double" },
];

const RESULTS_BY_SQL = new Map<string, unknown>([
  [
    BASE_SQL,
    {
      id: "base-result",
      columns: BASE_COLUMNS,
      data: [{ quarter: "Q1", revenue: 10 }],
      numRows: 1,
      executedSql: BASE_SQL,
    },
  ],
  [
    WRAPPED_SQL,
    {
      id: "wrapped-result",
      columns: [
        ...BASE_COLUMNS,
        { name: "double_revenue", dataType: "double" },
      ],
      data: [{ quarter: "Q1", revenue: 10, double_revenue: 20 }],
      numRows: 1,
      executedSql: WRAPPED_SQL,
    },
  ],
]);

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
    useDataQuery: (options: DataQueryOptions) => {
      const result =
        options.rawSql === undefined
          ? undefined
          : RESULTS_BY_SQL.get(options.rawSql);
      return [
        result,
        false,
        { isError: false, isSuccess: result !== undefined, dataUpdatedAt: 1 },
      ];
    },
  };
});
vi.mock("@/lib/plugins/PluginMenuSlot/PluginMenuSlot", async () => {
  const { addColumnsForInvocation } =
    await import("@/lib/plugins/derivedColumns/addColumnsForInvocation/addColumnsForInvocation");
  return {
    PluginMenuSlot: ({ getContext, getDataExplorerBridge }: FakeSlotProps) => {
      return (
        <button
          type="button"
          disabled={
            getContext === undefined || getDataExplorerBridge === undefined
          }
          onClick={() => {
            if (getContext && getDataExplorerBridge) {
              addColumnsForInvocation({
                context: getContext(),
                bridge: getDataExplorerBridge(),
                columns: [
                  {
                    name: "double_revenue",
                    expression: "{revenue} * 2",
                    inputs: { revenue: "revenue" },
                  },
                ],
              });
            }
          }}
        >
          Double revenue
        </button>
      );
    },
  };
});
vi.mock("@/lib/ui/viz/BarChart/BarChart", () => {
  return {
    BarChart: () => {
      return <output data-testid="bar-chart" />;
    },
  };
});
vi.mock("@/lib/ui/viz/LineChart/LineChart", () => {
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
/**
 * The block the Save menu stand-in built on its last click, as "Save to
 * dashboard" would hand it to the dashboard insert or update.
 */
const savedBlockRef = vi.hoisted((): { current: unknown } => {
  return { current: undefined };
});

/**
 * A stand-in for the Save menu that builds the dashboard block from the
 * `savableSql` the explorer passes and the explorer state, the same inputs
 * `DataExplorerSaveAsMenuItems` gives `SaveToDashboardModal`. The modal's own
 * test covers that it saves the block it builds.
 */
vi.mock(
  "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu",
  async () => {
    const { createDataVizBlock } =
      await import("@/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock");
    const { DataExplorerStateManager: StateManager } =
      await import("@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager");
    return {
      DataExplorerSaveMenu: ({ savableSql }: SaveMenuProps) => {
        const state = StateManager.useState();
        return (
          <button
            type="button"
            onClick={() => {
              if (state.columnBindings && savableSql !== undefined) {
                savedBlockRef.current = createDataVizBlock({
                  columnBindings: state.columnBindings,
                  rawSql: savableSql,
                  prompt: state.nlPrompt,
                  vizType: state.vizConfig.vizType,
                  vizConfig: state.vizConfig,
                });
              }
            }}
          >
            Save to dashboard
          </button>
        );
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

/** Mounts the explorer and exposes its state and actions to the test. */
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

/**
 * Renders the explorer on `BASE_SQL` with a bar chart of revenue by quarter
 * bound to the result's column IDs.
 */
async function _renderExplorerWithBarChart(): Promise<
  ReturnType<typeof _renderExplorer>
> {
  const session = _renderExplorer();
  act(() => {
    session.result.current[1].setRawSql(BASE_SQL);
  });
  await waitFor(() => {
    expect(session.result.current[0].lastResultColumns).toHaveLength(2);
  });
  const [quarter, revenue] = session.result.current[0].lastResultColumns ?? [];
  act(() => {
    session.result.current[1].setVizConfig({
      vizType: "bar",
      layout: "group",
      withLegend: true,
      xAxisKey: quarter?.id,
      series: revenue ? [{ renderAs: "bar", key: revenue.id }] : [],
    });
  });
  await screen.findByTestId("bar-chart");
  return session;
}

afterEach(() => {
  savedBlockRef.current = undefined;
  cleanup();
  act(() => {
    notifications.clean();
  });
});

function _getColumnIds(
  session: ReturnType<typeof _renderExplorer>,
): Array<string | undefined> {
  return (session.result.current[0].lastResultColumns ?? []).map((column) => {
    return column.id;
  });
}

it("runs the wrapped SQL and keeps the chart on the same columns", async () => {
  const session = await _renderExplorerWithBarChart();
  const chartBefore = session.result.current[0].vizConfig;
  const columnIdsBefore = _getColumnIds(session);

  fireEvent.click(
    await screen.findByRole("button", { name: "Double revenue" }),
  );

  await waitFor(() => {
    expect(
      session.result.current[0].lastResultColumns?.map((column) => {
        return column.name;
      }),
    ).toEqual(["quarter", "revenue", "double_revenue"]);
  });
  expect(session.result.current[0].rawSql).toBe(WRAPPED_SQL);
  expect(_getColumnIds(session).slice(0, 2)).toEqual(columnIdsBefore);
  expect(session.result.current[0].vizConfig).toEqual(chartBefore);
});

it("restores the SQL and chart config from before the command on Undo", async () => {
  const session = await _renderExplorerWithBarChart();
  const chartBefore = session.result.current[0].vizConfig;
  fireEvent.click(
    await screen.findByRole("button", { name: "Double revenue" }),
  );
  await waitFor(() => {
    expect(session.result.current[0].lastResultColumns).toHaveLength(3);
  });
  act(() => {
    session.result.current[1].setActiveVizType("line");
  });

  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

  await waitFor(() => {
    expect(session.result.current[0].rawSql).toBe(BASE_SQL);
  });
  expect(session.result.current[0].vizConfig).toEqual(chartBefore);
});

it("saves the wrapped SQL and the derived column's binding to a dashboard", async () => {
  const session = await _renderExplorerWithBarChart();
  fireEvent.click(
    await screen.findByRole("button", { name: "Double revenue" }),
  );
  await waitFor(() => {
    expect(session.result.current[0].lastResultColumns).toHaveLength(3);
  });
  const derivedColumnId = session.result.current[0].lastResultColumns?.find(
    (column) => {
      return column.name === "double_revenue";
    },
  )?.id;

  fireEvent.click(screen.getByRole("button", { name: "Save to dashboard" }));

  expect(derivedColumnId).toBeDefined();
  expect(savedBlockRef.current).toMatchObject({
    props: {
      nlQuery: { rawSql: WRAPPED_SQL },
      vizConfig: session.result.current[0].vizConfig,
      columnBindings: {
        columns: expect.arrayContaining([
          expect.objectContaining({
            id: derivedColumnId,
            name: "double_revenue",
          }),
        ]),
      },
    },
  });
});
