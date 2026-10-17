import { AvaQueryProvider } from "@avandar/query-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { describeSqlProjections } from "$/models/queries/QueryColumnBindings/describeSqlProjections/describeSqlProjections";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import { getDataVizAuthoringProps } from "../../../pfields/useDataVizAuthoring/getDataVizAuthoringProps";
import { useResolvedDataVizBindings } from "./useResolvedDataVizBindings";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
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
function _createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
it.each(["owner", "workspace", "revision"])(
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
        : scope === "workspace"
          ? { auth: "workspace", workspaceId: "other" as Workspace.Id }
          : AUTH;
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
        wrapper: _createWrapper(),
      },
    );
    await waitFor(() => {
      return expect(result.current.status).toBe("ready");
    });
    rerender({ props: second, auth: changedAuth });
    await waitFor(() => {
      return expect(result.current.status).toBe("ready");
    });
    const saved = getDataVizAuthoringProps({
      props: second,
      bindings: result.current,
      filters: [FILTER],
      change: { kind: "bound", props: {} },
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
it.each([
  "SELECT region AS territory FROM sales_a",
  "SELECT region FROM sales_b",
])("retains registered unsaved targets across %s", async (rawSql) => {
  const props = _createProps("chart");
  const { result, rerender } = renderHook(
    ({ currentProps }) => {
      return useResolvedDataVizBindings(currentProps, AUTH);
    },
    { initialProps: { currentProps: props }, wrapper: _createWrapper() },
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
  await withDuckDb(async (connection) => {
    await connection.run(
      "CREATE TABLE sales_a AS SELECT * FROM (VALUES ('North'), ('South')) t(region)",
    );
    await connection.run("CREATE TABLE sales_b AS SELECT * FROM sales_a");
    const rows = await connection.runAndReadAll(
      applyDashboardFiltersToSql({
        sql: rawSql,
        filters: result.current.resolved!.global.resolvedFilters,
      }),
    );
    expect(rows.getRowObjects()).toEqual(
      rawSql.includes("territory")
        ? [{ territory: "North" }]
        : [{ region: "North" }, { region: "South" }],
    );
  });
});
