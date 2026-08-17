/**
 * The recorder is what lets the emitter tell "a new run finished" from "React
 * re-rendered". React Query retries once by default, so two invocations can
 * back one settled failure, and a query key that changes mid-flight leaves an
 * older run still in the air. The run that started last wins in both cases,
 * which is the run whose data the consumer is looking at.
 */
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useDataQueryRunRecorder } from "@/views/DataExplorerApp/useDataQueryAnalytics/useDataQueryRunRecorder/useDataQueryRunRecorder";
import type { DataQueryRunMetadata } from "@/views/DataExplorerApp/useDataQueryAnalytics/DataQueryRunMetadata.types";

describe("useDataQueryRunRecorder", () => {
  it("records nothing until a run finishes", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "dataset",
        trigger: "sql_submit",
      });
    });

    expect(result.current.runMetadataRef.current).toBeUndefined();
  });

  it("records the duration, source, and result shape of a finished run", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "structured",
        dataSourceType: "entity",
        trigger: "sql_submit",
      });
    });

    act(() => {
      // Faking the clock only inside act(), after renderHook has already
      // rendered, means React's own timing calls during render are never
      // faked, only the calls beginRun and recordRun make.
      vi.useFakeTimers({ toFake: ["performance"] });
      const recordRun = result.current.beginRun();
      vi.advanceTimersByTime(75);
      recordRun({
        outcome: "success",
        didAutoLimit: true,
        rowCount: 12,
        columnCount: 3,
      });
      vi.useRealTimers();
    });

    expect(result.current.runMetadataRef.current).toEqual({
      runId: 1,
      durationMs: 75,
      trigger: "sql_submit",
      outcome: "success",
      didAutoLimit: true,
      rowCount: 12,
      columnCount: 3,
      source: "structured",
      dataSourceType: "entity",
    });
  });

  it("increments the run id per invocation so a retry overwrites the first attempt", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "none",
        trigger: "dataset_opened",
      });
    });

    act(() => {
      result.current.beginRun()({
        outcome: "error",
        error: new Error("failed"),
        isOffline: false,
      });
      result.current.beginRun()({
        outcome: "error",
        error: new Error("failed"),
        isOffline: false,
      });
    });

    expect(result.current.runMetadataRef.current?.runId).toBe(2);
  });

  it("records the trigger the run started with, not the one in effect when it settled", () => {
    // The Data Explorer stamps a new trigger on actions that leave the query
    // key unchanged (a chat turn regenerating identical SQL, a no-op form
    // edit). Those do not start a run, so reading the trigger at settle time
    // would attribute this run to a later, unrelated user action.
    const { rerender, result } = renderHook(
      (props: { trigger: DataQueryRunMetadata["trigger"] }) => {
        return useDataQueryRunRecorder({
          source: "rawSql",
          dataSourceType: "dataset",
          trigger: props.trigger,
        });
      },
      {
        initialProps: {
          trigger: "sql_submit" as DataQueryRunMetadata["trigger"],
        },
      },
    );

    const recordRun = result.current.beginRun();
    rerender({ trigger: "chat_generated" });
    act(() => {
      recordRun({
        outcome: "success",
        didAutoLimit: false,
        rowCount: 1,
        columnCount: 1,
      });
    });

    expect(result.current.runMetadataRef.current?.trigger).toBe("sql_submit");
  });

  it("does not let a superseded run overwrite the newer one", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "dataset",
        trigger: "sql_submit",
      });
    });

    act(() => {
      const recordSupersededRun = result.current.beginRun();
      const recordLatestRun = result.current.beginRun();
      recordLatestRun({
        outcome: "success",
        didAutoLimit: false,
        rowCount: 4,
        columnCount: 2,
      });
      // The first run settles last, after its query key already changed. The
      // data on screen came from the second run, so the first run's metadata
      // must not become what the emitter reports.
      recordSupersededRun({
        outcome: "success",
        didAutoLimit: true,
        rowCount: 999,
        columnCount: 99,
      });
    });

    const recorded = result.current.runMetadataRef.current;
    expect(recorded?.runId).toBe(2);
    expect(recorded).toMatchObject({ rowCount: 4, columnCount: 2 });
  });
});
