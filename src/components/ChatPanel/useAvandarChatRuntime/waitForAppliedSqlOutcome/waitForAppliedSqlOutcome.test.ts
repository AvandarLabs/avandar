import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitForAppliedSqlOutcome } from "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome";
import type { QueryKey } from "@tanstack/react-query";

const WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_WORKSPACE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SQL = 'SELECT * FROM "t"';

/** The leading positions of a `useDataQuery` key, which is all it reads. */
function _makeDataQueryKey(workspaceId: string, rawSql: string): QueryKey {
  return [{ auth: "workspace", workspaceId }, {}, "rawSql", rawSql];
}

function _makeResult(numRows: number): Record<string, unknown> {
  return { id: "result", columns: [], data: [], numRows };
}

let queryClient: QueryClient;
const unsubscribers: Array<() => void> = [];

/** Mounts an observer, the way the explorer's `useQuery` does. */
function _observe(queryKey: QueryKey, queryFn: () => Promise<unknown>): void {
  const observer = new QueryObserver(queryClient, { queryKey, queryFn });
  unsubscribers.push(observer.subscribe(() => {}));
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => {
    unsubscribe();
  });
  queryClient.clear();
  vi.useRealTimers();
});

function _wait(
  timeoutMs?: number,
): ReturnType<typeof waitForAppliedSqlOutcome> {
  return waitForAppliedSqlOutcome({
    queryCache: queryClient.getQueryCache(),
    workspaceId: WORKSPACE_ID,
    rawSql: SQL,
    timeoutMs,
  });
}

describe("waitForAppliedSqlOutcome", () => {
  it("resolves rows once the explorer query returns rows", async () => {
    const outcome = _wait();
    _observe(_makeDataQueryKey(WORKSPACE_ID, SQL), async () => {
      return _makeResult(3);
    });

    await expect(outcome).resolves.toBe("rows");
  });

  it("resolves empty when the explorer query returns no rows", async () => {
    const outcome = _wait();
    _observe(_makeDataQueryKey(WORKSPACE_ID, SQL), async () => {
      return _makeResult(0);
    });

    await expect(outcome).resolves.toBe("empty");
  });

  it("resolves failed when the explorer query errors", async () => {
    const outcome = _wait();
    _observe(_makeDataQueryKey(WORKSPACE_ID, SQL), async () => {
      throw new Error("refused");
    });

    await expect(outcome).resolves.toBe("failed");
  });

  it("ignores a settled run of the same SQL that nothing displays", async () => {
    // Settled and cached, but with no observer: the explorer is not showing
    // it, so it must not answer for the run the chat just started.
    queryClient.setQueryData(
      _makeDataQueryKey(WORKSPACE_ID, SQL),
      _makeResult(0),
    );

    await expect(_wait(20)).resolves.toBe("unknown");
  });

  it("ignores the same SQL run against another workspace", async () => {
    _observe(_makeDataQueryKey(OTHER_WORKSPACE_ID, SQL), async () => {
      return _makeResult(3);
    });

    await expect(_wait(20)).resolves.toBe("unknown");
  });

  it("resolves unknown when no query settles in time", async () => {
    vi.useFakeTimers();
    const outcome = _wait(1000);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(outcome).resolves.toBe("unknown");
  });
});
