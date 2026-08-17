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

describe("useDataQueryRunRecorder", () => {
  it("records nothing until a run finishes", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "dataset",
      });
    });

    expect(result.current.runMetadataRef.current).toBeUndefined();
  });

  it("records the duration, source, and result shape of a finished run", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "structured",
        dataSourceType: "entity",
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
      });
    });

    act(() => {
      result.current.beginRun()({
        outcome: "error",
        error: new Error("failed"),
      });
      result.current.beginRun()({
        outcome: "error",
        error: new Error("failed"),
      });
    });

    expect(result.current.runMetadataRef.current?.runId).toBe(2);
  });

  it("does not let a superseded run overwrite the newer one", () => {
    const { result } = renderHook(() => {
      return useDataQueryRunRecorder({
        source: "rawSql",
        dataSourceType: "dataset",
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
