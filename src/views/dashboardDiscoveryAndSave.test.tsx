import { DashboardColumnBindingTestFixtures } from "./dashboardColumnBindings/DashboardColumnBindingTestFixtures";
const {
  QueryResult,
  withDuckDb,
  QueryClient,
  renderHook,
  screen,
  waitFor,
  expect,
  it,
  useDataVizRuntimeColumnBindings,
  DashboardColumnBindingPreparation,
  mocks,
  AUTH,
  _createProps,
  _createWrapper,
  _renderBlock,
} = DashboardColumnBindingTestFixtures;

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
    const view = _renderBlock({ props: props, wrapper: wrapper });
    const picker = renderHook(
      () => {
        return useDataVizRuntimeColumnBindings({ props: props, auth: AUTH });
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
    expect(picker.result.current.runtime?.global.resolvedFilters).toEqual([]);
    expect(JSON.stringify(props)).toBe(original);
    const saved = await DashboardColumnBindingPreparation.prepareChart({
      props: props,
      auth: AUTH,
      queryClient: client,
      filters: [],
    });
    expect(saved).toMatchObject({
      columnBindings: {
        columns: [
          { name: "territory", dataType: "varchar" },
          { name: "amount", dataType: "double" },
        ],
      },
      globalFilterTargets:
        props.columnBindingVersion === 1 ? props.globalFilterTargets : {},
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
  const view = _renderBlock({ props: props, wrapper: wrapper });
  const picker = renderHook(
    () => {
      return useDataVizRuntimeColumnBindings({ props: props, auth: AUTH });
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
  const saved = await DashboardColumnBindingPreparation.prepareChart({
    props: props,
    auth: AUTH,
    queryClient: client,
    filters: [],
  });
  expect(saved).toMatchObject({
    columnBindings: picker.result.current.schema?.registry,
  });
  view.unmount();
  picker.unmount();
});
