import { DashboardColumnBindingTestFixtures } from "./dashboardColumnBindings/DashboardColumnBindingTestFixtures";
import type { QueryResult as QueryResultModel } from "$/models/queries/QueryResult/QueryResult";

const {
  QueryResult,
  QueryClient,
  act,
  render,
  screen,
  waitFor,
  expect,
  it,
  DataVizPBlock,
  DashboardColumnBindingPreparation,
  mocks,
  AUTH,
  _createProps,
  _createWrapper,
  _createPuck,
} = DashboardColumnBindingTestFixtures;

it.each(["sql", "owner", "workspace", "revision"])(
  "keeps completed metadata scoped across a %s switch",
  async (change) => {
    let finishOld!: (result: QueryResultModel.T) => void;
    const oldResult = new Promise<QueryResultModel.T>((resolve) => {
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
      const original = await DashboardColumnBindingPreparation.prepareChart({
        props: props,
        auth: AUTH,
        queryClient: client,
        filters: [],
      });
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
