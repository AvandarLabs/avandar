import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  _setBackgroundJobStoreForTests,
  BackgroundJobs,
} from "./BackgroundJobs";
import { createBackgroundJobStore } from "./BackgroundJobStore";
import { useBackgroundJob, useBackgroundJobs } from "./useBackgroundJobs";

describe("useBackgroundJobs", () => {
  afterEach(() => {
    _setBackgroundJobStoreForTests(null);
  });

  it("re-renders when a new job is registered", () => {
    _setBackgroundJobStoreForTests(createBackgroundJobStore());
    const { result } = renderHook(() => {
      return useBackgroundJobs();
    });
    expect(result.current).toHaveLength(0);

    act(() => {
      BackgroundJobs.register({ type: "t", label: "L" });
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]!.label).toBe("L");
  });

  it("re-renders when a single job's progress changes", () => {
    _setBackgroundJobStoreForTests(createBackgroundJobStore());
    const job = BackgroundJobs.register({ type: "t", label: "L" });
    const { result } = renderHook(() => {
      return useBackgroundJob(job.id);
    });
    expect(result.current?.progress).toBeUndefined();
    act(() => {
      BackgroundJobs.updateProgress(job.id, 33);
    });
    expect(result.current?.progress).toBe(33);
  });
});
