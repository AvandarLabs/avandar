/**
 * Runs the view hook through a real React Query cycle, with only the query
 * runner mocked, so the cache key, column bindings, and chart config are the
 * ones the chat card really gets.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUiVizConfigFromAvaVizConfig } from "$/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { useAgentQueryResultView } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView";
import { TestProviders, renderHook, waitFor } from "@/test-utils";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { ReactNode } from "react";

const { runStructuredQueryWithMetadataMock } = vi.hoisted(() => {
  return { runStructuredQueryWithMetadataMock: vi.fn() };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

vi.mock(
  "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata",
  () => {
    return {
      runStructuredQueryWithMetadata: runStructuredQueryWithMetadataMock,
      runStructuredQuery: vi.fn(),
    };
  },
);

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const SQL = 'SELECT "state", COUNT(*) AS "n" FROM "cases" GROUP BY "state"';

const RESULT = AgentQueryResult.create({
  sql: SQL,
  chart: "bar",
  title: "Cases by state",
});

function _succeed(): void {
  runStructuredQueryWithMetadataMock.mockResolvedValue({
    result: {
      id: "r1",
      columns: [
        { name: "state", dataType: "varchar" },
        { name: "n", dataType: "bigint" },
      ],
      data: [{ state: "TX", n: 3 }],
      numRows: 1,
    },
    didAutoLimit: false,
    executedSql: SQL,
  });
}

const LONG_SQL = 'SELECT "week", "district", "cases" FROM "weekly_cases"';

const LONG_RESULT = AgentQueryResult.create({
  sql: LONG_SQL,
  chart: "line",
  title: "Cases by week and district",
});

function _succeedWithLongResult(): void {
  runStructuredQueryWithMetadataMock.mockResolvedValue({
    result: {
      id: "r2",
      columns: [
        { name: "week", dataType: "date" },
        { name: "district", dataType: "varchar" },
        { name: "cases", dataType: "bigint" },
      ],
      data: [
        { week: "2024-01-01", district: "North", cases: 5 },
        { week: "2024-01-01", district: "South", cases: 3 },
        { week: "2024-01-08", district: "North", cases: 7 },
        { week: "2024-01-08", district: "South", cases: 2 },
      ],
      numRows: 4,
    },
    didAutoLimit: false,
    executedSql: LONG_SQL,
  });
}

function _renderView(
  queryClient: QueryClient,
  agentResult: AgentQueryResultData = RESULT,
) {
  return renderHook(
    () => {
      return useAgentQueryResultView(agentResult, WORKSPACE_ID);
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <TestProviders>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </TestProviders>
        );
      },
    },
  );
}

function _createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
}

beforeEach(() => {
  runStructuredQueryWithMetadataMock.mockReset();
});

describe("useAgentQueryResultView", () => {
  it("is unavailable when the query fails", async () => {
    runStructuredQueryWithMetadataMock.mockRejectedValue(
      new Error('Binder Error: Referenced column "nope" not found'),
    );

    const { result } = _renderView(_createQueryClient());

    await waitFor(() => {
      expect(result.current.status).toBe("unavailable");
    });
  });

  it("is ready with a chart config filled from the result", async () => {
    _succeed();

    const { result } = _renderView(_createQueryClient());

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    const view = result.current;
    if (view.status !== "ready") {
      throw new Error("Expected a ready view");
    }
    const [stateColumn, countColumn] = view.columns;
    expect(view.vizConfig).toMatchObject({
      vizType: "bar",
      xAxisKey: stateColumn?.id,
      series: [{ key: countColumn?.id }],
    });
    expect(view.data).toEqual([{ state: "TX", n: 3 }]);
  });

  it("does not run the query again when the card mounts again", async () => {
    _succeed();
    const queryClient = _createQueryClient();

    const first = _renderView(queryClient);
    await waitFor(() => {
      expect(first.result.current.status).toBe("ready");
    });
    first.unmount();
    const second = _renderView(queryClient);

    await waitFor(() => {
      expect(second.result.current.status).toBe("ready");
    });
    expect(runStructuredQueryWithMetadataMock).toHaveBeenCalledTimes(1);
  });

  it("draws a line per district for a long result", async () => {
    _succeedWithLongResult();

    const { result } = _renderView(_createQueryClient(), LONG_RESULT);

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    const view = result.current;
    if (view.status !== "ready") {
      throw new Error("Expected a ready view");
    }
    const { config } = makeUiVizConfigFromAvaVizConfig({
      config: view.vizConfig,
      columns: view.columns,
    });
    expect(config).toMatchObject({
      vizType: "line",
      xAxisKey: "week",
      withLegend: true,
      series: [{ key: "North" }, { key: "South" }],
    });
    expect(view.data).toEqual([
      { week: "2024-01-01", North: 5, South: 3 },
      { week: "2024-01-08", North: 7, South: 2 },
    ]);
  });

  it.each([
    { chart: "bar", layout: "stack" },
    { chart: "area", layout: "stacked" },
  ])("stacks a $chart chart split by district", async ({ chart, layout }) => {
    _succeedWithLongResult();
    const agentResult = AgentQueryResult.create({
      sql: LONG_SQL,
      chart,
      title: "Cases by week and district",
    });

    const { result } = _renderView(_createQueryClient(), agentResult);

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current).toMatchObject({
      vizConfig: { vizType: chart, layout },
    });
  });

  it("keeps a bar chart grouped when the result is not split", async () => {
    _succeed();
    const agentResult = AgentQueryResult.create({
      sql: SQL,
      chart: "bar",
      title: "Cases by state",
    });

    const { result } = _renderView(_createQueryClient(), agentResult);

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current).toMatchObject({ vizConfig: { layout: "group" } });
  });
});
