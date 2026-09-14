/**
 * End-to-end for one query: a real React Query cycle through `useDataQuery`
 * has to produce exactly one `query.ran` with the duration and shape of the
 * run that actually happened.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { renderHook, waitFor } from "@/test-utils";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import type { UserQueryAnalyticsTrigger } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const TEST_QUERY = StructuredQuery.makeEmpty();

const { logEventMock, runStructuredQueryWithMetadataMock } = vi.hoisted(() => {
  return {
    logEventMock: vi.fn(),
    runStructuredQueryWithMetadataMock: vi.fn(),
  };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: logEventMock } };
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

// PascalCase rather than the usual `_`-prefixed test helper name because it
// holds state, which `react-hooks/rules-of-hooks` only permits in a component.
function TestQueryClientWrapper({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  // Held in state rather than built in the render body so a remount keeps its
  // cache, which is what any future test of cached-error behavior depends on.
  const [queryClient] = useState(() => {
    return new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderDataQuery(
  options: Readonly<{ rawSql: string; trigger: UserQueryAnalyticsTrigger }>,
): void {
  renderHook(
    () => {
      return useDataQuery({
        query: TEST_QUERY,
        rawSql: options.rawSql,
        auth: "workspace",
        workspaceId: TEST_WORKSPACE_ID,
        analyticsSurface: "data_explorer",
        analyticsTrigger: options.trigger,
      });
    },
    { wrapper: TestQueryClientWrapper },
  );
}

beforeEach(() => {
  logEventMock.mockReset();
  runStructuredQueryWithMetadataMock.mockReset();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDataQuery analytics", () => {
  it("records one query.ran for a successful Data Explorer run", async () => {
    runStructuredQueryWithMetadataMock.mockResolvedValue({
      result: {
        id: "r1",
        columns: [{ name: "a", dataType: "varchar" }],
        data: [{ a: "x" }],
        numRows: 1,
      },
      didAutoLimit: false,
    });

    _renderDataQuery({ rawSql: "SELECT 1", trigger: "sql_submit" });

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledTimes(1);
    });
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.ran",
      workspaceId: TEST_WORKSPACE_ID,
      app: "data_explorer",
      payload: {
        trigger: "sql_submit",
        source: "rawSql",
        rowCount: 1,
        columnCount: 1,
        didAutoLimit: false,
      },
    });
  });

  it("records query.failed when the run throws", async () => {
    runStructuredQueryWithMetadataMock.mockRejectedValue(
      new Error('Binder Error: Referenced column "nope" not found'),
    );

    _renderDataQuery({ rawSql: "SELECT nope", trigger: "sql_submit" });

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledTimes(1);
    });
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.failed",
      payload: { errorClass: "missing_column", trigger: "sql_submit" },
    });
  });

  it("measures the real elapsed time and carries the auto-limit flag through", async () => {
    runStructuredQueryWithMetadataMock.mockImplementation(async () => {
      await new Promise((resolve) => {
        return setTimeout(resolve, 20);
      });
      return {
        result: { id: "r2", columns: [], data: [], numRows: 0 },
        didAutoLimit: true,
      };
    });

    _renderDataQuery({ rawSql: "SELECT 1", trigger: "structured_change" });

    await waitFor(() => {
      expect(logEventMock).toHaveBeenCalledTimes(1);
    });
    const payload = logEventMock.mock.calls[0]?.[0]?.payload;
    // The mock sleeps 20ms and `setTimeout` never fires early; 15 leaves room
    // for timer skew while still ruling out a wrong unit or a fixed value.
    expect(payload.durationMs).toBeGreaterThanOrEqual(15);
    expect(payload.didAutoLimit).toBe(true);
  });
});
