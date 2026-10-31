import { DashboardFilterColumnBindingTestFixtures } from "./DashboardFilterColumnBindingTestFixtures";
import type { AvaPageData } from "./AvaPage/AvaPage.types";
import type { Props } from "./AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";

const {
  DashboardConfigs,
  withDuckDb,
  DataVizColumnBindings,
  applyDashboardFiltersToSql,
  QueryClient,
  renderHook,
  waitFor,
  expect,
  it,
  DashboardColumnBindingPreparation,
  makeRuntimeColumnBindingsFromDataVizProps,
  useDataVizRuntimeColumnBindings,
  FILTER,
  AUTH,
  _createProps,
  _createWrapper,
} = DashboardFilterColumnBindingTestFixtures;

it.each([
  "SELECT region AS territory FROM sales_a",
  "SELECT region FROM sales_b",
])("retains registered unsaved targets across %s", async (rawSql) => {
  const props = _createProps("chart");
  const original = JSON.stringify(props);
  const client = new QueryClient();
  const { result, rerender, unmount } = renderHook(
    ({ currentProps }) => {
      return useDataVizRuntimeColumnBindings({
        props: currentProps,
        auth: AUTH,
      });
    },
    { initialProps: { currentProps: props }, wrapper: _createWrapper(client) },
  );
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  const originalTarget = result.current.runtime!.global.targets.filter;
  rerender({
    currentProps: { ...props, nlQuery: { ...props.nlQuery, rawSql } },
  });
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  expect(result.current.runtime!.global.targets.filter).toEqual(originalTarget);
  unmount();
  // The explicit query callback has no filter list, then save supplies it.
  // Target ownership must survive changing the selected authoring field.
  const edited = await DashboardColumnBindingPreparation.prepareChart({
    props: { ...props, nlQuery: { ...props.nlQuery, rawSql } },
    auth: AUTH,
    queryClient: client,
    filters: [],
  });
  const savedDocument = await DashboardColumnBindingPreparation.prepareDocument(
    {
      data: {
        ...DashboardConfigs.makeEmpty(),
        content: [
          { type: "DataViz", props: edited },
          {
            type: "Filter",
            props: {
              id: "filter-block",
              filterId: "filter",
              columnName: "region",
              label: "Region",
              mode: "select_single",
              defaultValue: "North",
              optionsRaw: "North,South",
            },
          },
        ],
      } as AvaPageData,
      auth: AUTH,
      queryClient: client,
    },
  );
  const saved = savedDocument.content[0]!.props;
  expect(JSON.stringify(props)).toBe(original);
  const reopened = JSON.parse(JSON.stringify(saved)) as Props & { id: string };
  const reopenedSchema = await DataVizColumnBindings.get({
    options: {
      scopeKey: reopened.id,
      rawSql,
      auth: AUTH,
      projections: [],
      initialRegistry:
        reopened.columnBindingVersion === 1
          ? reopened.columnBindings
          : undefined,
    },
    queryClient: new QueryClient(),
  });
  const reopenedBindings = makeRuntimeColumnBindingsFromDataVizProps({
    props: reopened,
    schema: reopenedSchema,
    filters: [FILTER],
  });
  expect(reopenedBindings.global.targets.filter).toEqual(originalTarget);
  await withDuckDb(async (connection) => {
    await connection.run(
      "CREATE TABLE sales_a AS SELECT * FROM (VALUES ('North'), ('South')) t(region)",
    );
    await connection.run("CREATE TABLE sales_b AS SELECT * FROM sales_a");
    const rows = await connection.runAndReadAll(
      applyDashboardFiltersToSql({
        sql: rawSql,
        filters: reopenedBindings.global.resolvedFilters,
      }),
    );
    expect(rows.getRowObjects()).toEqual(
      rawSql.includes("territory")
        ? [{ territory: "North" }]
        : [{ region: "North" }, { region: "South" }],
    );
  });
});
