import type { Workspace } from "$/models/Workspace/Workspace";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { DehydrateOptions, DehydratedState } from "@tanstack/react-query";
type Props = { children: ReactNode };

import { AvaQueryProvider } from "@avandar/query-hooks";
import {
  QueryClient,
  QueryClientProvider,
  dehydrate,
  hydrate,
} from "@tanstack/react-query";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { reconcileResultBindings } from "$/models/queries/QueryColumnBindings/reconcileResultBindings/reconcileResultBindings";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { AvandarQueryClientProvider } from "@/components/providers/AvandarQueryClientProvider/AvandarQueryClientProvider";
import { DataVizColumnBindings } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizColumnBindings";
import { isWorkspaceRawSqlDataQueryKey } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { withDuckDb } from "../../../tests/integration/queries/executedDuckDb";
import { DataVizPBlock } from "../DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { useResolvedDataVizBindings } from "../DashboardApp/AvaPage/pblocks/DataVizPBlock/useResolvedDataVizBindings/useResolvedDataVizBindings";
import { DashboardBindingPreparation } from "../DashboardApp/AvaPage/utils/DashboardBindingPreparation/DashboardBindingPreparation";
import type { Props as DataVizProps } from "../DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { PuckContext } from "@puckeditor/core";
import type { ReactElement, ReactNode } from "react";

const mocks = vi.hoisted<{
  runQuery: ReturnType<typeof vi.fn>;
  filtersById: Record<
    string,
    import("@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager").DashboardFilterRecord
  >;
}>(() => {
  return { runQuery: vi.fn(), filtersById: {} };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return {
    WorkspaceQuerySession: { runQuery: mocks.runQuery },
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

// Keep the query, filter, discovery and save boundaries real. The visual sink
// exposes the renderer's metadata and values without chart-library layout.
vi.mock(
  "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizContent",
  async () => {
    const { BindingResultSink } = await import("./BindingResultSink");
    return { DataVizContent: BindingResultSink };
  },
);
vi.mock("@/clients/qetl/PublicQuerySession/PublicQuerySession", () => {
  return {
    PublicQuerySession: { runQuery: mocks.runQuery },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const AUTH: Extract<StructuredQueryAuth, { auth: "workspace" }> = {
  auth: "workspace" as const,
  workspaceId: "00000000-0000-4000-8000-000000000002" as Workspace.Id,
};

function _createProps(): DataVizProps & { id: string } {
  const registry = reconcileResultBindings({
    scopeKey: "chart",
    sqlKey: "SELECT * FROM sales",
    projections: makeProjectionDescriptorsFromSql({
      sql: "SELECT * FROM sales",
      columns: [
        { name: "region", dataType: "varchar" },
        { name: "amount", dataType: "varchar" },
      ],
    }),
    previous: undefined,
    columns: [
      { name: "region", dataType: "varchar" },
      { name: "amount", dataType: "varchar" },
    ],
  }).registry;
  return {
    id: "chart",
    bindingVersion: 1,
    columnBindings: registry,
    globalFilterTargets: {
      filter: {
        kind: "bound",
        columnId: registry.columns[0]!.id,
        authoringColumnName: "region",
      },
    },
    localFilters: [],
    globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
    nlQuery: {
      rawSql: "SELECT * FROM sales",
      prompt: "Sales",
      generations: [],
    },
    vizType: "table",
    vizConfig: { vizType: "table" },
  };
}

function _createWrapper(
  client: QueryClient,
): (props: Readonly<Props>) => ReactNode {
  return ({ children }: Readonly<Props>) => {
    return (
      <QueryClientProvider client={client}>
        <AvaQueryProvider onError={vi.fn()}>{children}</AvaQueryProvider>
      </QueryClientProvider>
    );
  };
}

function _createPuck(metadata: PuckContext["metadata"]): PuckContext {
  return {
    metadata,
    isEditing: true,
    dragRef: null,
    renderDropZone: () => {
      return null;
    },
  };
}

function _renderBlock({
  props,
  wrapper,
}: {
  props: DataVizProps & { id: string };
  wrapper: ReturnType<typeof _createWrapper>;
}): ReturnType<typeof render> {
  return render(
    <DataVizPBlock
      {...props}
      puck={_createPuck({
        ...AUTH,
        dashboardId: "00000000-0000-4000-8000-000000000001",
      })}
    />,
    { wrapper },
  );
}

function _dehydrateWithProductionPolicy(client: QueryClient): DehydratedState {
  const provider = AvandarQueryClientProvider({
    userId: undefined,
    children: null,
  }) as ReactElement<{
    persistOptions: { dehydrateOptions: DehydrateOptions };
  }>;
  return JSON.parse(
    JSON.stringify(
      dehydrate(client, provider.props.persistOptions.dehydrateOptions),
    ),
  );
}
/** Shared setup and fixtures for DashboardBindingTestFixtures. */
export const DashboardBindingTestFixtures = {
  QueryResult,
  StructuredQuery,
  withDuckDb,
  DataVizColumnBindings,
  isWorkspaceRawSqlDataQueryKey,
  useDataQuery,
  QueryClient,
  hydrate,
  act,
  render,
  renderHook,
  screen,
  waitFor,
  expect,
  it,
  vi,
  DataVizPBlock,
  useResolvedDataVizBindings,
  DashboardBindingPreparation,
  mocks,
  AUTH,
  _createProps,
  _createWrapper,
  _createPuck,
  _renderBlock,
  _dehydrateWithProductionPolicy,
};
