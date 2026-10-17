import { AvaQueryProvider } from "@avandar/query-hooks";
import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { describeSqlProjections } from "$/models/queries/QueryColumnBindings/describeSqlProjections/describeSqlProjections";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { AvandarQueryClientProvider } from "@/components/providers/AvandarQueryClientProvider/AvandarQueryClientProvider";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { isWorkspaceRawSqlDataQueryKey } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { DataVizPBlock } from "./pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { refreshDataVizColumnBindings } from "./pblocks/DataVizPBlock/useDataVizColumnBindings/useDataVizColumnBindings";
import { useResolvedDataVizBindings } from "./pblocks/DataVizPBlock/useResolvedDataVizBindings/useResolvedDataVizBindings";
import { prepareDataVizBindings } from "./utils/prepareDashboardBindings/prepareDashboardBindings";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Props } from "./pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { PuckContext } from "@puckeditor/core";
import type { DehydrateOptions } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

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
afterEach(() => {
  vi.restoreAllMocks();
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

function _dehydrateWithProductionPolicy(client: QueryClient) {
  const provider = AvandarQueryClientProvider({
    userId: undefined,
    children: null,
  }) as ReactElement<{
    persistOptions: { dehydrateOptions: DehydrateOptions };
  }>;
  return JSON.parse(
    JSON.stringify(
      dehydrate(client, provider.props.persistOptions.dehydrateOptions),
    ),
  );
}

it.each(["hook", "explicit"])(
  "rediscovers schema after production persistence from %s creation",
  async (creation) => {
    mocks.filtersById = {};
    const props = _createProps();
    const original = JSON.stringify(props);
    const before = new QueryClient();
    mocks.runQuery.mockResolvedValue({
      ...QueryResult.makeEmpty(),
      columns: [
        { name: "region", dataType: "varchar" },
        { name: "amount", dataType: "varchar" },
      ],
    });
    if (creation === "hook") {
      const hook = renderHook(
        () => {
          return useResolvedDataVizBindings(props, AUTH);
        },
        { wrapper: _createWrapper(before) },
      );
      await waitFor(() => {
        return expect(hook.result.current.status).toBe("ready");
      });
      hook.unmount();
    } else {
      await prepareDataVizBindings(props, AUTH, before, []);
    }
    before.setQueryData(["unrelated-retained-query"], { retained: true });
    const persisted = _dehydrateWithProductionPolicy(before);
    const reopened = new QueryClient();
    hydrate(reopened, persisted);
    const queries: string[] = [];
    mocks.runQuery.mockImplementation(
      async ({ rawSql }: { rawSql: string }) => {
        queries.push(rawSql);
        return {
          ...QueryResult.makeEmpty(),
          columns: [
            { name: "territory", dataType: "varchar" },
            { name: "amount", dataType: "double" },
          ],
          data: [{ territory: "West", amount: 42 }],
        };
      },
    );
    const view = _renderBlock(props, _createWrapper(reopened));
    await waitFor(() => {
      return expect(screen.getByTestId("rendered").textContent).toContain(
        '"name":"territory"',
      );
    });
    expect(queries[0]).toContain('"_ava_schema" LIMIT 0');
    expect(reopened.getQueryData(["unrelated-retained-query"])).toEqual({
      retained: true,
    });
    expect(JSON.stringify(props)).toBe(original);
    const saved = await prepareDataVizBindings(props, AUTH, reopened, []);
    expect(saved).toMatchObject({
      columnBindings: {
        columns: [
          { name: "territory", dataType: "varchar" },
          { name: "amount", dataType: "double" },
        ],
      },
    });
    // A successful discovery must not be part of the next disk snapshot either.
    expect(
      _dehydrateWithProductionPolicy(reopened).queries.some(
        (query: { queryKey: unknown[] }) => {
          return (
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("data-viz-column-bindings")
          );
        },
      ),
    ).toBe(false);
    view.unmount();
  },
);

it.each(["verified", "older-discovery"])(
  "rejects a disk-restored %s schema before applying removed targets",
  async (shape) => {
    await withDuckDb(async (connection) => {
      await connection.run(
        "CREATE TABLE sales AS SELECT 'West' AS territory, 42::DOUBLE AS amount",
      );
      const props = _createProps();
      if (props.bindingVersion !== 1) {
        throw new Error("Expected bound fixture");
      }
      const original = JSON.stringify(props);
      const registry = props.columnBindings;
      const oldClient = new QueryClient();
      oldClient.setQueryData(
        ["data-viz-column-bindings", AUTH, props.id, props.nlQuery.rawSql],
        shape === "verified"
          ? {
              registry,
              columns: registry.columns,
              issues: [],
              rawColumns: registry.columns.map(({ name, dataType }) => {
                return { name, dataType };
              }),
            }
          : {
              registry,
              columns: registry.columns.map(({ name, dataType }) => {
                return { name, dataType };
              }),
              projections: [],
            },
      );
      const reopened = new QueryClient();
      hydrate(reopened, _dehydrateWithProductionPolicy(oldClient));
      const queries: string[] = [];
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
          queries.push(rawSql);
          const rows = await connection.runAndReadAll(rawSql);
          return {
            ...QueryResult.makeEmpty(),
            columns: [
              { name: "territory", dataType: "varchar" },
              { name: "amount", dataType: "double" },
            ],
            data: rows.getRowObjects(),
          };
        },
      );
      const view = _renderBlock(props, _createWrapper(reopened));
      await waitFor(() => {
        return expect(screen.getByTestId("rendered").textContent).toContain(
          '"amount":42',
        );
      });
      expect(queries[0]).toContain('"_ava_schema" LIMIT 0');
      expect(
        queries.some((sql) => {
          return sql.includes('"region" =');
        }),
      ).toBe(false);
      expect(JSON.stringify(props)).toBe(original);
      const saved = await prepareDataVizBindings(props, AUTH, reopened, []);
      expect(saved).toMatchObject({
        columnBindings: {
          columns: [
            { name: "territory", dataType: "varchar" },
            { name: "amount", dataType: "double" },
          ],
        },
        globalFilterTargets: props.globalFilterTargets,
      });
      view.unmount();
    });
  },
);

it.each([false, true])(
  "keeps newer discovery with six-minute-fresh cached rows (same tick: %s)",
  async (sameTick) => {
    if (sameTick) {
      vi.spyOn(Date, "now").mockReturnValue(Date.now());
    }
    mocks.filtersById = {};
    const props = _createProps();
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 6 * 60 * 1000, retry: false } },
    });
    const executions: string[] = [];
    mocks.runQuery.mockImplementation(
      async ({ rawSql }: { rawSql: string }) => {
        executions.push(rawSql);
        return {
          ...QueryResult.makeEmpty(),
          columns: [{ name: "region", dataType: "varchar" }],
          data: [{ region: "North" }],
        };
      },
    );
    const view = _renderBlock(props, _createWrapper(client));
    await waitFor(() => {
      return expect(screen.getByTestId("rendered").textContent).toContain(
        '"region":"North"',
      );
    });
    const isDataQuery = (query: { queryKey: readonly unknown[] }) => {
      return isWorkspaceRawSqlDataQueryKey(query.queryKey, {
        workspaceId: AUTH.workspaceId,
        rawSql: props.nlQuery.rawSql,
      });
    };
    const cached = client
      .getQueryCache()
      .findAll({ predicate: isDataQuery })[0]!;
    client.setQueryData(cached.queryKey, cached.state.data, {
      updatedAt: sameTick ? Date.now() : Date.now() - 60_000,
    });
    executions.length = 0;
    mocks.runQuery.mockImplementation(
      async ({ rawSql }: { rawSql: string }) => {
        executions.push(rawSql);
        return {
          ...QueryResult.makeEmpty(),
          columns: rawSql.includes('"_ava_schema"')
            ? [{ name: "territory", dataType: "varchar" }]
            : [
                { name: "territory", dataType: "varchar" },
                { name: "newest", dataType: "date" },
              ],
          data: [{ territory: "West", newest: "2026-10-16" }],
        };
      },
    );
    const changed = { ...props, id: "other-chart" };
    view.rerender(
      <DataVizPBlock
        {...changed}
        puck={_createPuck({
          ...AUTH,
          dashboardId: "00000000-0000-4000-8000-000000000001",
        })}
      />,
    );
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
    expect(executions).toHaveLength(1);
    expect(executions[0]).toContain('"_ava_schema"');
    await act(async () => {
      await client.invalidateQueries({ predicate: isDataQuery });
    });
    await waitFor(() => {
      return expect(screen.getByTestId("rendered").textContent).toContain(
        '"name":"newest","dataType":"date"',
      );
    });
    view.unmount();
  },
);

it.each(["older", "restored"])(
  "rejects %s row provenance after an unchanged metadata completion",
  async (origin) => {
    const props = _createProps();
    const client = new QueryClient();
    const current: QueryResult.T = {
      ...QueryResult.makeEmpty(),
      columns: [{ name: "territory", dataType: "varchar" }],
      data: [{ territory: "West" }],
    };
    mocks.runQuery.mockResolvedValue(current);
    await prepareDataVizBindings(props, AUTH, client, []);
    mocks.runQuery.mockResolvedValue({
      ...QueryResult.makeEmpty(),
      columns: [{ name: "region", dataType: "varchar" }],
      data: [{ region: "North" }],
    });
    const query = StructuredQuery.makeEmpty();
    const rows = renderHook(
      () => {
        return useDataQuery({
          ...AUTH,
          query,
          rawSql: props.nlQuery.rawSql,
          analyticsSurface: "dashboard_block",
        });
      },
      { wrapper: _createWrapper(client) },
    );
    await waitFor(() => {
      return expect(rows.result.current[2].isSuccess).toBe(true);
    });
    const older = rows.result.current[0]!;
    mocks.runQuery.mockResolvedValue(current);
    await act(async () => {
      await rows.result.current[2].refetch();
    });
    await waitFor(() => {
      return expect(rows.result.current[0]?.columns[0]?.name).toBe("territory");
    });
    const latest = rows.result.current[0]!;
    const options = {
      scopeKey: props.id,
      rawSql: props.nlQuery.rawSql,
      auth: AUTH,
      initialRegistry: undefined,
      projections: [],
    };
    refreshDataVizColumnBindings(options, client, latest, props.nlQuery.rawSql);
    // A later hydrated timestamp cannot make a disk copy runtime-authoritative.
    let candidate = older;
    if (origin === "restored") {
      mocks.runQuery.mockResolvedValue({
        ...QueryResult.makeEmpty(),
        columns: [{ name: "region", dataType: "varchar" }],
        data: [{ region: "North" }],
      });
      await act(async () => {
        await rows.result.current[2].refetch();
      });
      await waitFor(() => {
        return expect(rows.result.current[0]?.columns[0]?.name).toBe("region");
      });
      const restored = new QueryClient();
      hydrate(restored, _dehydrateWithProductionPolicy(client));
      candidate = restored.getQueryCache().findAll({
        predicate: (cachedQuery) => {
          return isWorkspaceRawSqlDataQueryKey(cachedQuery.queryKey, {
            workspaceId: AUTH.workspaceId,
            rawSql: props.nlQuery.rawSql,
          });
        },
      })[0]!.state.data as typeof older;
    }
    refreshDataVizColumnBindings(
      options,
      client,
      candidate,
      props.nlQuery.rawSql,
    );
    const saved = await prepareDataVizBindings(props, AUTH, client, []);
    expect(saved).toMatchObject({
      columnBindings: { columns: [{ name: "territory", dataType: "varchar" }] },
    });
    rows.unmount();
  },
);
