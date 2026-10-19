import { DashboardFilterBindingTestFixtures } from "./DashboardFilterBindingTestFixtures";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Props } from "./AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
const {
  withDuckDb,
  applyDashboardFiltersToSql,
  QueryClient,
  renderHook,
  waitFor,
  expect,
  it,
  DashboardBindingPreparation,
  useResolvedDataVizBindings,
  FILTER,
  AUTH,
  SQL,
  _createProps,
  _createWrapper,
} = DashboardFilterBindingTestFixtures;

it.each(["owner", "workspace", "revision", "auth"])(
  "scopes target memory to the %s and saves only its own identity",
  async (scope) => {
    const first = _createProps("chart-a");
    const second = _createProps(scope === "owner" ? "chart-b" : "chart-a");
    const initialAuth: StructuredQueryAuth =
      scope === "revision"
        ? {
            auth: "public",
            publicAvaPageId: "dashboard" as Dashboard.Id,
            snapshotRevision: "one",
          }
        : AUTH;
    const changedAuth: StructuredQueryAuth =
      scope === "revision"
        ? ({ ...initialAuth, snapshotRevision: "two" } as StructuredQueryAuth)
        : scope === "auth"
          ? {
              auth: "public",
              publicAvaPageId: "dashboard" as Dashboard.Id,
              snapshotRevision: "one",
            }
          : scope === "workspace"
            ? { auth: "workspace", workspaceId: "other" as Workspace.Id }
            : AUTH;
    const client = new QueryClient();
    const { result, rerender } = renderHook(
      ({
        props,
        auth,
      }: {
        props: Props & { id: string };
        auth: StructuredQueryAuth;
      }) => {
        return useResolvedDataVizBindings({ props: props, auth: auth });
      },
      {
        initialProps: {
          props: first,
          auth: initialAuth as StructuredQueryAuth,
        },
        wrapper: _createWrapper(client),
      },
    );
    await waitFor(() => {
      return expect(result.current.status).toBe("ready");
    });
    rerender({ props: second, auth: changedAuth });
    await waitFor(() => {
      return expect(result.current.status).toBe("ready");
    });
    const saved = await DashboardBindingPreparation.prepareChart({
      props: second,
      auth: changedAuth,
      queryClient: client,
      filters: [FILTER],
    });
    expect(saved).toMatchObject({
      globalFilterTargets: {
        filter: {
          columnId:
            second.bindingVersion === 1
              ? second.columnBindings.columns[0]!.id
              : undefined,
        },
      },
    });
    await withDuckDb(async (connection) => {
      await connection.run(
        "CREATE TABLE sales_a AS SELECT * FROM (VALUES ('North'), ('South')) t(region)",
      );
      const rows = await connection.runAndReadAll(
        applyDashboardFiltersToSql({
          sql: SQL,
          filters: result.current.resolved!.global.resolvedFilters,
        }),
      );
      expect(rows.getRowObjects()).toEqual([{ region: "North" }]);
    });
  },
);
