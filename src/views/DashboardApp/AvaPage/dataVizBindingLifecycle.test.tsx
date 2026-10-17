import { AvaQueryProvider } from "@avandar/query-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { describeSqlProjections } from "$/models/queries/QueryColumnBindings/describeSqlProjections/describeSqlProjections";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { DataVizPBlock } from "./pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { useResolvedDataVizBindings } from "./pblocks/DataVizPBlock/useResolvedDataVizBindings/useResolvedDataVizBindings";
import { prepareDataVizBindings } from "./utils/prepareDashboardBindings/prepareDashboardBindings";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Props } from "./pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { PuckContext } from "@puckeditor/core";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { runQuery: vi.fn(), filtersById: {} };
});
vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return {
    WorkspaceQuerySession: { runQuery: mocks.runQuery },
  };
});
vi.mock(
  "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager",
  () => {
    return {
      DashboardFilterStateManager: {
        useState: () => {
          return { filtersById: mocks.filtersById };
        },
      },
    };
  },
);
// Keep the query, filter, discovery and save boundaries real. The visual sink
// exposes the renderer's metadata and values without chart-library layout.
vi.mock("./pblocks/DataVizPBlock/DataVizPBlock/DataVizContent", () => {
  return {
    DataVizContent: ({
      columns,
      data,
    }: {
      columns: unknown;
      data: unknown;
    }) => {
      return (
        <output data-testid="rendered">
          {JSON.stringify({ columns, data })}
        </output>
      );
    },
  };
});
vi.mock("@/clients/qetl/PublicQuerySession/PublicQuerySession", () => {
  return {
    PublicQuerySession: { runQuery: mocks.runQuery },
  };
});
const AUTH = {
  auth: "workspace" as const,
  workspaceId: "00000000-0000-4000-8000-000000000002" as Workspace.Id,
};
function _createProps(): Props & { id: string } {
  const registry = reconcileResultBindings({
    scopeKey: "chart",
    sqlKey: "SELECT * FROM sales",
    projections: describeSqlProjections({
      sql: "SELECT * FROM sales",
      columns: [
        { name: "region", dataType: "varchar" },
        { name: "amount", dataType: "varchar" },
      ],
    }),
    previous: undefined,
    columns: [
      { name: "region", dataType: "varchar" },
      { name: "amount", dataType: "varchar" },
    ],
  }).registry;
  return {
    id: "chart",
    bindingVersion: 1,
    columnBindings: registry,
    globalFilterTargets: {
      filter: {
        kind: "bound",
        columnId: registry.columns[0]!.id,
        authoringColumnName: "region",
      },
    },
    localFilters: [],
    globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
    nlQuery: {
      rawSql: "SELECT * FROM sales",
      prompt: "Sales",
      generations: [],
    },
    vizType: "table",
    vizConfig: { vizType: "table" },
  };
}
function _createWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={client}>
        <AvaQueryProvider onError={vi.fn()}>{children}</AvaQueryProvider>
      </QueryClientProvider>
    );
  };
}
function _createPuck(metadata: PuckContext["metadata"]): PuckContext {
  return {
    metadata,
    isEditing: true,
    dragRef: null,
    renderDropZone: () => {
      return null;
    },
  };
}
function _renderBlock(
  props: Props & { id: string },
  wrapper: ReturnType<typeof _createWrapper>,
) {
  return render(
    <DataVizPBlock
      {...props}
      puck={_createPuck({
        ...AUTH,
        dashboardId: "00000000-0000-4000-8000-000000000001",
      })}
    />,
    { wrapper },
  );
}

it("revalidates a saved SELECT star before executing a removed target and saving current types", async () => {
  await withDuckDb(async (connection) => {
    await connection.run(
      "CREATE TABLE sales AS SELECT 'West' AS territory, 42::DOUBLE AS amount",
    );
    const executions: string[] = [];
    mocks.filtersById = {
      filter: {
        filterId: "filter",
        columnName: "region",
        label: "Region",
        operator: "equals",
        value: "North",
      },
    };
    mocks.runQuery.mockImplementation(
      async ({ rawSql }: { rawSql: string }) => {
        executions.push(rawSql);
        const rows = await connection.runAndReadAll(rawSql);
        return {
          ...QueryResult.makeEmpty(),
          columns: [
            { name: "territory", dataType: "varchar" },
            { name: "amount", dataType: "double" },
          ],
          data: rows.getRowObjects(),
          numRows: rows.currentRowCount,
        };
      },
    );
    const props = _createProps();
    const original = JSON.stringify(props);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = _createWrapper(client);
    const view = _renderBlock(props, wrapper);
    const picker = renderHook(
      () => {
        return useResolvedDataVizBindings(props, AUTH);
      },
      {
        wrapper,
      },
    );
    await waitFor(() => {
      return expect(screen.getByTestId("rendered").textContent).toContain(
        '"amount":42',
      );
    });
    expect(executions[0]).toContain('"_ava_schema" LIMIT 0');
    expect(
      executions.some((sql) => {
        return sql.includes('"region" =');
      }),
    ).toBe(false);
    expect(picker.result.current.schema?.columns).toMatchObject([
      { name: "territory", dataType: "varchar" },
      { name: "amount", dataType: "double" },
    ]);
    expect(picker.result.current.resolved?.global.resolvedFilters).toEqual([]);
    expect(JSON.stringify(props)).toBe(original);
    const saved = await prepareDataVizBindings(props, AUTH, client, []);
    expect(saved).toMatchObject({
      columnBindings: {
        columns: [
          { name: "territory", dataType: "varchar" },
          { name: "amount", dataType: "double" },
        ],
      },
      globalFilterTargets:
        props.bindingVersion === 1 ? props.globalFilterTargets : {},
    });
    view.unmount();
    picker.unmount();
  });
});

it("shares successful execution metadata with settings and explicit save", async () => {
  mocks.filtersById = {};
  mocks.runQuery.mockImplementation(async ({ rawSql }: { rawSql: string }) => {
    return {
      ...QueryResult.makeEmpty(),
      columns: rawSql.includes('"_ava_schema"')
        ? [
            { name: "region", dataType: "varchar" },
            { name: "amount", dataType: "varchar" },
          ]
        : [
            { name: "region", dataType: "varchar" },
            { name: "amount", dataType: "double" },
            { name: "added", dataType: "date" },
          ],
      data: rawSql.includes('"_ava_schema"')
        ? []
        : [{ region: "North", amount: 42, added: "2026-10-16" }],
    };
  });
  const props = _createProps();
  const original = JSON.stringify(props);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = _createWrapper(client);
  const view = _renderBlock(props, wrapper);
  const picker = renderHook(
    () => {
      return useResolvedDataVizBindings(props, AUTH);
    },
    {
      wrapper,
    },
  );
  await waitFor(() => {
    return expect(picker.result.current.schema?.columns).toMatchObject([
      { name: "region", dataType: "varchar" },
      { name: "amount", dataType: "double" },
      { name: "added", dataType: "date" },
    ]);
  });
  expect(screen.getByTestId("rendered").textContent).toContain(
    '"name":"added","dataType":"date"',
  );
  expect(JSON.stringify(props)).toBe(original);
  const saved = await prepareDataVizBindings(props, AUTH, client, []);
  expect(saved).toMatchObject({
    columnBindings: picker.result.current.schema?.registry,
  });
  view.unmount();
  picker.unmount();
});

it.each(["sql", "owner", "workspace", "revision"])(
  "keeps completed metadata scoped across a %s switch",
  async (change) => {
    let finishOld!: (result: QueryResult.T) => void;
    const oldResult = new Promise<QueryResult.T>((resolve) => {
      finishOld = resolve;
    });
    let executions = 0;
    mocks.filtersById = {};
    mocks.runQuery.mockImplementation(
      async ({ rawSql }: { rawSql: string }) => {
        if (!rawSql.includes('"_ava_schema"') && executions++ === 0) {
          return oldResult;
        }
        return {
          ...QueryResult.makeEmpty(),
          columns: [{ name: "current", dataType: "double" }],
          data: [{ current: 42 }],
        };
      },
    );
    const props = _createProps();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = _createWrapper(client);
    const initialMetadata =
      change === "revision"
        ? {
            auth: "public",
            dashboardId: "00000000-0000-4000-8000-000000000001",
            snapshotRevision: "one",
          }
        : { ...AUTH, dashboardId: "00000000-0000-4000-8000-000000000001" };
    const view = render(
      <DataVizPBlock {...props} puck={_createPuck(initialMetadata)} />,
      { wrapper },
    );
    await waitFor(() => {
      return expect(executions).toBe(1);
    });
    const changedProps = {
      ...props,
      id: change === "owner" ? "other-chart" : props.id,
      nlQuery: {
        ...props.nlQuery,
        rawSql:
          change === "sql" ? "SELECT * FROM other_sales" : props.nlQuery.rawSql,
      },
    };
    const metadata =
      change === "workspace"
        ? {
            ...initialMetadata,
            workspaceId: "00000000-0000-4000-8000-000000000003",
          }
        : change === "revision"
          ? { ...initialMetadata, snapshotRevision: "two" }
          : initialMetadata;
    view.rerender(
      <DataVizPBlock {...changedProps} puck={_createPuck(metadata)} />,
    );
    // Data execution is intentionally shared across blocks with identical SQL.
    // Different owners must still keep the result in their own schema cache.
    if (change !== "owner") {
      await waitFor(() => {
        return expect(screen.getByTestId("rendered").textContent).toContain(
          '"current":42',
        );
      });
    }
    await act(async () => {
      finishOld({
        ...QueryResult.makeEmpty(),
        columns: [{ name: "late", dataType: "varchar" }],
        data: [{ late: "old" }],
      });
    });
    if (change === "owner") {
      await waitFor(() => {
        return expect(screen.getByTestId("rendered").textContent).toContain(
          '"late":"old"',
        );
      });
      const original = await prepareDataVizBindings(props, AUTH, client, []);
      expect(original).toMatchObject({
        columnBindings: { columns: [{ name: "current", dataType: "double" }] },
      });
    } else {
      expect(screen.getByTestId("rendered").textContent).not.toContain(
        '"name":"late"',
      );
      expect(screen.getByTestId("rendered").textContent).toContain(
        '"name":"current"',
      );
    }
    view.unmount();
  },
);

it("keeps freshly discovered metadata while cached rows are revalidating", async () => {
  mocks.filtersById = {};
  mocks.runQuery.mockResolvedValue({
    ...QueryResult.makeEmpty(),
    columns: [
      { name: "region", dataType: "varchar" },
      { name: "amount", dataType: "varchar" },
    ],
    data: [{ region: "North", amount: "42" }],
  });
  const props = _createProps();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = _createWrapper(client);
  const first = _renderBlock(props, wrapper);
  await waitFor(() => {
    return expect(screen.getByTestId("rendered").textContent).toContain(
      '"amount":"42"',
    );
  });
  let finish!: (result: QueryResult.T) => void;
  const pending = new Promise<QueryResult.T>((resolve) => {
    finish = resolve;
  });
  const current: QueryResult.T = {
    ...QueryResult.makeEmpty(),
    columns: [
      { name: "territory", dataType: "varchar" },
      { name: "amount", dataType: "double" },
    ],
    data: [{ territory: "West", amount: 42 }],
  };
  mocks.runQuery.mockImplementation(({ rawSql }: { rawSql: string }) => {
    return rawSql.includes('"_ava_schema"')
      ? Promise.resolve(current)
      : pending;
  });
  act(() => {
    void client.invalidateQueries();
  });
  await waitFor(() => {
    return expect(screen.getByTestId("rendered").textContent).toContain(
      '"name":"territory"',
    );
  });
  await act(async () => {
    await new Promise((resolve) => {
      return setTimeout(resolve, 20);
    });
  });
  expect(screen.getByTestId("rendered").textContent).not.toContain(
    '"name":"region"',
  );
  await act(async () => {
    finish(current);
  });
  await waitFor(() => {
    return expect(screen.getByTestId("rendered").textContent).toContain(
      '"amount":42',
    );
  });
  first.unmount();
});
