/**
 * Runs the view hook through a real React Query cycle, with only the query
 * runner mocked, so the cache key, column bindings, and chart config are the
 * ones the chat card really gets.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { useAgentQueryResultView } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/useAgentQueryResultView";
import { renderHook, waitFor } from "@/test-utils";
import type { Workspace } from "$/models/Workspace/Workspace";
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

function _renderView(queryClient: QueryClient) {
  return renderHook(
    () => {
      return useAgentQueryResultView(RESULT, WORKSPACE_ID);
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
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
});
