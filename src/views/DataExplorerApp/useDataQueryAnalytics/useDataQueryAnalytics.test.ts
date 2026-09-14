/**
 * These behaviours decide whether this instrumentation is trustworthy: a cache
 * hit must not count as a run, a retry must not count twice, only the Data
 * Explorer records successes, and a public page records nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useDataQueryAnalytics } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics";
import type { QueryAnalyticsSurface } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DataQueryRunMetadata } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";
import type { QueryAnalyticsObserverState } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryAnalytics";
import type { RenderHookResult } from "@testing-library/react";

const { logEventMock } = vi.hoisted(() => {
  return { logEventMock: vi.fn() };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: logEventMock } };
});

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const RUN_METADATA: DataQueryRunMetadata = {
  runId: 1,
  durationMs: 50,
  trigger: "sql_submit",
  outcome: "success",
  didAutoLimit: false,
  rowCount: 7,
  columnCount: 1,
  source: "rawSql",
  dataSourceType: "dataset",
};

/** A run that threw. The emitter branches on this, not on observer status. */
function _failedRun(error: unknown): DataQueryRunMetadata {
  return {
    runId: 1,
    durationMs: 50,
    trigger: "sql_submit",
    outcome: "error",
    error,
    isOffline: false,
    source: "rawSql",
    dataSourceType: "dataset",
  };
}

/**
 * The hook's own parameter type, so a fixture can express only what the hook
 * can actually read and no cast is needed to hand it over.
 */
type FakeQueryResult = QueryAnalyticsObserverState;

/** What a rerender may vary. */
type AnalyticsRenderProps = {
  queryResult: FakeQueryResult;
};

function _renderAnalytics(
  options: Readonly<{
    surface?: QueryAnalyticsSurface;
    workspaceId?: Workspace.Id;
    runMetadata?: DataQueryRunMetadata;
    queryResult: FakeQueryResult;
  }>,
): RenderHookResult<void, AnalyticsRenderProps> {
  const runMetadataRef = { current: options.runMetadata };
  const initialProps: AnalyticsRenderProps = {
    queryResult: options.queryResult,
  };
  return renderHook(
    (props: AnalyticsRenderProps) => {
      return useDataQueryAnalytics({
        surface: options.surface ?? "data_explorer",
        workspaceId:
          "workspaceId" in options ? options.workspaceId : TEST_WORKSPACE_ID,
        runMetadataRef,
        queryResult: props.queryResult,
      });
    },
    { initialProps },
  );
}

beforeEach(() => {
  logEventMock.mockReset();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDataQueryAnalytics", () => {
  it("records query.ran when a Data Explorer run settles successfully", () => {
    _renderAnalytics({
      runMetadata: RUN_METADATA,
      queryResult: {
        status: "success",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock).toHaveBeenCalledWith({
      event: "query.ran",
      workspaceId: TEST_WORKSPACE_ID,
      app: "data_explorer",
      payload: {
        trigger: "sql_submit",
        source: "rawSql",
        dataSourceType: "dataset",
        rowCount: 7,
        columnCount: 1,
        durationMs: 50,
        didAutoLimit: false,
      },
    });
  });

  it("records nothing when the data came from cache and no run happened", () => {
    _renderAnalytics({
      runMetadata: undefined,
      queryResult: {
        status: "success",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("records nothing while a retry is still in flight", () => {
    _renderAnalytics({
      runMetadata: _failedRun(new Error("boom")),
      queryResult: {
        status: "error",
        fetchStatus: "fetching",
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("still records a run that was paused while pending and later settled", () => {
    // An offline device leaves the query pending with nothing in flight. That
    // render must not consume the run id, or the event is lost when the query
    // resumes and settles.
    const { rerender } = _renderAnalytics({
      runMetadata: RUN_METADATA,
      queryResult: {
        status: "pending",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();

    rerender({
      queryResult: {
        status: "success",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.ran",
    });
  });

  it("records one failure for a run that was retried and then settled", () => {
    const { rerender } = _renderAnalytics({
      runMetadata: {
        ..._failedRun(new Error("Parser Error: syntax error")),
        runId: 2,
      },
      queryResult: {
        status: "error",
        fetchStatus: "fetching",
      },
    });

    rerender({
      queryResult: {
        status: "error",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.failed",
      payload: { errorClass: "syntax", surface: "data_explorer" },
    });
  });

  it("does not re-record when the query result identity churns without a new run", () => {
    const settled: FakeQueryResult = {
      status: "success",
      fetchStatus: "idle",
    };
    const { rerender } = _renderAnalytics({
      runMetadata: RUN_METADATA,
      queryResult: settled,
    });

    // A fresh observer object with equal contents is what a re-render hands
    // back, and it must not read as a second run.
    rerender({ queryResult: { ...settled } });
    rerender({ queryResult: { ...settled } });

    expect(logEventMock).toHaveBeenCalledTimes(1);
  });

  it("does not record query.ran for a dashboard block", () => {
    _renderAnalytics({
      surface: "dashboard_block",
      runMetadata: RUN_METADATA,
      queryResult: {
        status: "success",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("does record query.failed for a dashboard block", () => {
    _renderAnalytics({
      surface: "dashboard_block",
      runMetadata: _failedRun(
        new Error("permission denied for table datasets"),
      ),
      queryResult: {
        status: "error",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.failed",
      app: "dashboards",
      payload: { errorClass: "permission", surface: "dashboard_block" },
    });
  });

  it("records nothing while a retry is paused rather than fetching", () => {
    // A retry pauses when the tab is hidden or the device drops offline. The
    // observer keeps reporting success over its stale cached rows, so a guard
    // that only checks `isFetching` reads this as settled and reports the
    // attempt that just failed as a finished run.
    _renderAnalytics({
      runMetadata: _failedRun(new Error("Parser Error: syntax error")),
      queryResult: { status: "success", fetchStatus: "paused" },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("reports a failed run as query.failed even when the observer still reads success", () => {
    // Switching to an already-cached key never cancels the run in flight, so
    // that run still settles and writes its record while the observer is
    // serving the other query's successful data. The run's own outcome has to
    // win, or a failure is reported as a successful query.
    _renderAnalytics({
      runMetadata: _failedRun(new Error("Parser Error: syntax error")),
      queryResult: { status: "success", fetchStatus: "idle" },
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    expect(logEventMock.mock.calls[0]?.[0]).toMatchObject({
      event: "query.failed",
      payload: { errorClass: "syntax" },
    });
  });

  it("records nothing on a public page, which has no session to attribute", () => {
    _renderAnalytics({
      surface: "dashboard_block",
      workspaceId: undefined,
      runMetadata: _failedRun(
        new Error("permission denied for table datasets"),
      ),
      queryResult: {
        status: "error",
        fetchStatus: "idle",
      },
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });
});
