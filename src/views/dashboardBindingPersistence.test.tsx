import { pickProps } from "@avandar/utils";
import { DashboardBindingTestFixtures } from "./dashboardBindings/DashboardBindingTestFixtures";
const {
  QueryResult,
  withDuckDb,
  QueryClient,
  hydrate,
  renderHook,
  screen,
  waitFor,
  expect,
  it,
  useResolvedDataVizBindings,
  DashboardBindingPreparation,
  mocks,
  AUTH,
  _createProps,
  _createWrapper,
  _renderBlock,
  _dehydrateWithProductionPolicy,
} = DashboardBindingTestFixtures;

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
          return useResolvedDataVizBindings({ props: props, auth: AUTH });
        },
        { wrapper: _createWrapper(before) },
      );
      await waitFor(() => {
        return expect(hook.result.current.status).toBe("ready");
      });
      hook.unmount();
    } else {
      await DashboardBindingPreparation.prepareChart({
        props: props,
        auth: AUTH,
        queryClient: before,
        filters: [],
      });
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
    const view = _renderBlock({
      props: props,
      wrapper: _createWrapper(reopened),
    });
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
    const saved = await DashboardBindingPreparation.prepareChart({
      props: props,
      auth: AUTH,
      queryClient: reopened,
      filters: [],
    });
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
      _dehydrateWithProductionPolicy(reopened).queries.some((query) => {
        return (
          typeof query.queryKey[0] === "string" &&
          query.queryKey[0].startsWith("data-viz-column-bindings")
        );
      }),
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
              rawColumns: registry.columns.map(pickProps(["name", "dataType"])),
            }
          : {
              registry,
              columns: registry.columns.map(pickProps(["name", "dataType"])),
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
      const view = _renderBlock({
        props: props,
        wrapper: _createWrapper(reopened),
      });
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
      const saved = await DashboardBindingPreparation.prepareChart({
        props: props,
        auth: AUTH,
        queryClient: reopened,
        filters: [],
      });
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
