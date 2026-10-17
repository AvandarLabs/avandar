import { AvaQueryProvider } from "@avandar/query-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { describeSqlProjections } from "$/models/queries/QueryColumnBindings/describeSqlProjections/describeSqlProjections";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import {
  prepareDashboardBindings,
  prepareDataVizBindings,
} from "../../../utils/prepareDashboardBindings/prepareDashboardBindings";
import { resolveDataVizRuntimeBindings } from "../resolveSavedDataVizBindings/resolveDataVizRuntimeBindings";
import { getDataVizColumnBindings } from "../useDataVizColumnBindings/useDataVizColumnBindings";
import { useResolvedDataVizBindings } from "./useResolvedDataVizBindings";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AvaPageData } from "../../../AvaPage.types";
import type { Props } from "../DataVizPBlock/DataVizPBlock";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { runQuery: vi.fn(), filtersById: {} };
});
vi.mock("@/clients/queries/runStructuredQuery/runStructuredQuery", () => {
  return {
    runStructuredQuery: mocks.runQuery,
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
const FILTER = {
  filterId: "filter",
  columnName: "region",
  label: "Region",
  operator: "equals" as const,
  value: "North",
};
const AUTH: StructuredQueryAuth = {
  auth: "workspace",
  workspaceId: "workspace" as Workspace.Id,
};
const SQL = "SELECT region FROM sales_a";
function _createProps(id: string): Props & { id: string } {
  const columns: QueryResult.Column[] = [
    { name: "region", dataType: "varchar" },
  ];
  const schema = reconcileResultBindings({
    scopeKey: id,
    sqlKey: SQL,
    columns,
    projections: describeSqlProjections({ sql: SQL, columns }),
    previous: undefined,
  });
  return {
    id,
    bindingVersion: 1,
    columnBindings: schema.registry,
    globalFilterTargets: {},
    nlQuery: { rawSql: SQL, prompt: "", generations: [] },
    vizType: "table",
    vizConfig: { vizType: "table" },
    localFilters: [],
    globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
  };
}
function _createWrapper(
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={client}>
        <AvaQueryProvider onError={vi.fn()}>{children}</AvaQueryProvider>
      </QueryClientProvider>
    );
  };
}
beforeEach(() => {
  mocks.filtersById = { filter: FILTER };
  mocks.runQuery.mockImplementation(async ({ rawSql }: { rawSql: string }) => {
    return {
      ...QueryResult.makeEmpty(),
      columns: [
        {
          name: rawSql.includes("territory") ? "territory" : "region",
          dataType: "varchar",
        },
      ],
    };
  });
});
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
        return useResolvedDataVizBindings(props, auth);
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
    const saved = await prepareDataVizBindings(second, changedAuth, client, [
      FILTER,
    ]);
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
it.each([
  "SELECT region AS territory FROM sales_a",
  "SELECT region FROM sales_b",
])("retains registered unsaved targets across %s", async (rawSql) => {
  const props = _createProps("chart");
  const original = JSON.stringify(props);
  const client = new QueryClient();
  const { result, rerender, unmount } = renderHook(
    ({ currentProps }) => {
      return useResolvedDataVizBindings(currentProps, AUTH);
    },
    { initialProps: { currentProps: props }, wrapper: _createWrapper(client) },
  );
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  const originalTarget = result.current.resolved!.global.targets.filter;
  rerender({
    currentProps: { ...props, nlQuery: { ...props.nlQuery, rawSql } },
  });
  await waitFor(() => {
    return expect(result.current.status).toBe("ready");
  });
  expect(result.current.resolved!.global.targets.filter).toEqual(
    originalTarget,
  );
  unmount();
  // The explicit query callback has no filter list, then save supplies it.
  // Target ownership must survive changing the selected authoring field.
  const edited = await prepareDataVizBindings(
    { ...props, nlQuery: { ...props.nlQuery, rawSql } },
    AUTH,
    client,
    [],
  );
  const savedDocument = await prepareDashboardBindings(
    {
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
    AUTH,
    client,
  );
  const saved = savedDocument.content[0]!.props;
  expect(JSON.stringify(props)).toBe(original);
  const reopened = JSON.parse(JSON.stringify(saved)) as Props & { id: string };
  const reopenedSchema = await getDataVizColumnBindings(
    {
      scopeKey: reopened.id,
      rawSql,
      auth: AUTH,
      projections: [],
      initialRegistry:
        reopened.bindingVersion === 1 ? reopened.columnBindings : undefined,
    },
    new QueryClient(),
  );
  const reopenedBindings = resolveDataVizRuntimeBindings(
    reopened,
    reopenedSchema,
    [FILTER],
  );
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
