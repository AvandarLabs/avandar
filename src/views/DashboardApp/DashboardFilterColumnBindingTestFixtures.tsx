import type { Props as DataVizProps } from "./AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DashboardFilterRecord } from "./DashboardFilterStateManager/DashboardFilterStateManager";

type Props = { children: ReactNode };

import { AvaQueryProvider } from "@avandar/query-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { DataVizColumnBindings } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizColumnBindings";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import { withDuckDb } from "../../../tests/integration/queries/executedDuckDb";
import { makeRuntimeColumnBindingsFromDataVizProps } from "./AvaPage/pblocks/DataVizPBlock/makeSavedColumnBindingsFromDataVizProps/makeRuntimeColumnBindingsFromDataVizProps";
import { useDataVizRuntimeColumnBindings } from "./AvaPage/pblocks/DataVizPBlock/useDataVizRuntimeColumnBindings/useDataVizRuntimeColumnBindings";
import { DashboardColumnBindingPreparation } from "./AvaPage/utils/DashboardColumnBindingPreparation/DashboardColumnBindingPreparation";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted<{
  runQuery: ReturnType<typeof vi.fn>;
  filtersById: Record<
    string,
    import("@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager").DashboardFilterRecord
  >;
}>(() => {
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

const FILTER: DashboardFilterRecord = {
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

function _createProps(id: string): DataVizProps & { id: string } {
  const columns: QueryResult.Column[] = [
    { name: "region", dataType: "varchar" },
  ];
  const schema = reconcileQueryResultColumnBindings({
    scopeKey: id,
    sqlKey: SQL,
    columns,
    projections: makeProjectionDescriptorsFromSql({ sql: SQL, columns }),
    previous: undefined,
  });
  return {
    id,
    columnBindingVersion: 1,
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
  client: QueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
): (props: Readonly<Props>) => ReactNode {
  return ({ children }: Readonly<Props>) => {
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
/** Shared setup and fixtures for DashboardFilterColumnBindingTestFixtures. */
export const DashboardFilterColumnBindingTestFixtures = {
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
  SQL,
  _createProps,
  _createWrapper,
};
