import { sleep } from "@avandar/utils";
import { DashboardColumnBindingTestFixtures } from "./dashboardColumnBindings/DashboardColumnBindingTestFixtures";
import type { QueryResult as QueryResultModel } from "$/models/queries/QueryResult/QueryResult";
const {
  QueryResult,
  StructuredQuery,
  DataVizColumnBindings,
  isWorkspaceRawSqlDataQueryKey,
  useDataQuery,
  QueryClient,
  hydrate,
  act,
  renderHook,
  screen,
  waitFor,
  expect,
  it,
  vi,
  DataVizPBlock,
  DashboardColumnBindingPreparation,
  mocks,
  AUTH,
  _createProps,
  _createWrapper,
  _createPuck,
  _renderBlock,
  _dehydrateWithProductionPolicy,
} = DashboardColumnBindingTestFixtures;

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
  const first = _renderBlock({ props: props, wrapper: wrapper });
  await waitFor(() => {
    return expect(screen.getByTestId("rendered").textContent).toContain(
      '"amount":"42"',
    );
  });
  let finish!: (result: QueryResultModel.T) => void;
  const pending = new Promise<QueryResultModel.T>((resolve) => {
    finish = resolve;
  });
  const current: QueryResultModel.T = {
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
    await sleep(20);
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
    const view = _renderBlock({
      props: props,
      wrapper: _createWrapper(client),
    });
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
      await sleep(20);
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
    const current: QueryResultModel.T = {
      ...QueryResult.makeEmpty(),
      columns: [{ name: "territory", dataType: "varchar" }],
      data: [{ territory: "West" }],
    };
    mocks.runQuery.mockResolvedValue(current);
    await DashboardColumnBindingPreparation.prepareChart({
      props: props,
      auth: AUTH,
      queryClient: client,
      filters: [],
    });
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
    DataVizColumnBindings.refresh({
      options: options,
      queryClient: client,
      result: latest,
      expectedSql: props.nlQuery.rawSql,
    });
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
    DataVizColumnBindings.refresh({
      options: options,
      queryClient: client,
      result: candidate,
      expectedSql: props.nlQuery.rawSql,
    });
    const saved = await DashboardColumnBindingPreparation.prepareChart({
      props: props,
      auth: AUTH,
      queryClient: client,
      filters: [],
    });
    expect(saved).toMatchObject({
      columnBindings: { columns: [{ name: "territory", dataType: "varchar" }] },
    });
    rows.unmount();
  },
);
