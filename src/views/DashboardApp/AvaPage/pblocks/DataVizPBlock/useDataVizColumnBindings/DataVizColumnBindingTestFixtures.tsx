import type { DataVizColumnBindingsOptions } from "../DataVizColumnBindings";
type Props = { children: ReactNode };

import { AvaQueryProvider } from "@avandar/query-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { applyDashboardFiltersToSql } from "@/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql/applyDashboardFiltersToSql";
import { makeBindingsFromDashboardFilters } from "@/views/DashboardApp/DashboardFilterStateManager/makeBindingsFromDashboardFilters/makeBindingsFromDashboardFilters";
import { useDataVizColumnBindings } from "./useDataVizColumnBindings";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { ReactNode } from "react";

const { runQuery, reportError } = vi.hoisted<{
  runQuery: ReturnType<typeof vi.fn>;
  reportError: ReturnType<typeof vi.fn>;
}>(() => {
  return { runQuery: vi.fn(), reportError: vi.fn() };
});

vi.mock("@/clients/queries/runStructuredQuery/runStructuredQuery", () => {
  return { runStructuredQuery: runQuery };
});

const AUTH: StructuredQueryAuth = {
  auth: "workspace",
  workspaceId: uuid<Workspace.Id>(),
};

const DASHBOARD = uuid<Dashboard.Id>();

const OPTIONS: DataVizColumnBindingsOptions = {
  scopeKey: "block-a",
  rawSql: " SELECT region FROM sales; ",
  initialRegistry: undefined,
  auth: AUTH,
  projections: [],
};

function _createResult(name: string = "region"): QueryResult.T {
  return {
    ...QueryResult.makeEmpty(),
    columns: [{ name, dataType: "varchar" }],
  };
}

function _deferred(): {
  promise: Promise<QueryResult.T>;
  resolve: (value: QueryResult.T) => void;
  reject: (error: Error) => void;
} {
  let resolve!: (value: QueryResult.T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<QueryResult.T>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );
  return { promise, resolve, reject };
}

function _createWrapper(): (props: Readonly<Props>) => ReactNode {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: Readonly<Props>) => {
    return (
      <QueryClientProvider client={client}>
        <AvaQueryProvider onError={reportError}>{children}</AvaQueryProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  runQuery.mockReset();
  reportError.mockReset();
  runQuery.mockResolvedValue(_createResult());
});
/** Shared setup and fixtures for DataVizColumnBindingTestFixtures. */
export const DataVizColumnBindingTestFixtures = {
  uuid,
  makeProjectionDescriptorsFromSql,
  reconcileResultBindings,
  applyDashboardFiltersToSql,
  makeBindingsFromDashboardFilters,
  act,
  renderHook,
  waitFor,
  expect,
  it,
  useDataVizColumnBindings,
  runQuery,
  reportError,
  AUTH,
  DASHBOARD,
  OPTIONS,
  _createResult,
  _deferred,
  _createWrapper,
};
