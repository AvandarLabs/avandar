import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackgroundJobStore } from "./BackgroundJobStore";
import { createInMemoryBackgroundJobPersistence } from "./persistence/InMemoryBackgroundJobPersistence";
import type { BackgroundJob } from "./BackgroundJob.types";
import type { BackgroundJobNotifier } from "./notifier/BackgroundJobNotifier.types";

function _makeFakeNotifier(): BackgroundJobNotifier & {
  successCalls: Array<{ title: string; message?: string }>;
  errorCalls: Array<{ title: string; message?: string }>;
  warningCalls: Array<{ title: string; message?: string }>;
} {
  const successCalls: Array<{ title: string; message?: string }> = [];
  const errorCalls: Array<{ title: string; message?: string }> = [];
  const warningCalls: Array<{ title: string; message?: string }> = [];
  return {
    successCalls,
    errorCalls,
    warningCalls,
    success: (toast): void => {
      successCalls.push(toast);
    },
    error: (toast): void => {
      errorCalls.push(toast);
    },
    warning: (toast): void => {
      warningCalls.push(toast);
    },
  };
}

describe("BackgroundJobStore", () => {
  let clock = 0;

  beforeEach(() => {
    clock = 1_000;
  });

  const now = (): number => {
    clock += 1;
    return clock;
  };

  it("registers a new job with default status in_progress", () => {
    const store = createBackgroundJobStore({ now });
    const job = store.register({
      type: "test",
      label: "Test job",
    });
    expect(job.id).toMatch(/.+/);
    expect(job.status).toBe("in_progress");
    expect(job.persistAcrossRefresh).toBe(false);
    expect(job.createdAt).toBeGreaterThan(0);
    expect(store.getJob(job.id)).toEqual(job);
  });

  it("returns the existing job when registering with a duplicate id", () => {
    const store = createBackgroundJobStore({ now });
    const first = store.register({
      id: "fixed-id",
      type: "test",
      label: "First",
    });
    const second = store.register({
      id: "fixed-id",
      type: "test",
      label: "Second",
    });
    expect(second).toEqual(first);
    expect(store.listJobs()).toHaveLength(1);
  });

  it("orders jobs newest first", () => {
    const store = createBackgroundJobStore({ now });
    const a = store.register({ type: "test", label: "A" });
    const b = store.register({ type: "test", label: "B" });
    const c = store.register({ type: "test", label: "C" });
    const ids = store.listJobs().map((j) => {
      return j.id;
    });
    expect(ids).toEqual([c.id, b.id, a.id]);
  });

  it("clamps progress to [0, 100]", () => {
    const store = createBackgroundJobStore({ now });
    const job = store.register({
      type: "test",
      label: "Test",
      progress: 200,
    });
    expect(job.progress).toBe(100);

    store.updateProgress(job.id, -50);
    expect(store.getJob(job.id)?.progress).toBe(0);

    store.updateProgress(job.id, 42);
    expect(store.getJob(job.id)?.progress).toBe(42);
  });

  it("ignores progress updates on terminal jobs", () => {
    const store = createBackgroundJobStore({ now });
    const job = store.register({ type: "test", label: "T" });
    store.markCompleted(job.id);
    store.updateProgress(job.id, 10);
    expect(store.getJob(job.id)?.progress).toBe(100);
  });

  it("fires the success notifier when a job completes", () => {
    const notifier = _makeFakeNotifier();
    const store = createBackgroundJobStore({ now, notifier });
    const job = store.register({
      type: "test",
      label: "Test",
      successToast: { title: "Done", message: "ok" },
    });
    store.markCompleted(job.id);
    expect(notifier.successCalls).toEqual([{ title: "Done", message: "ok" }]);
  });

  it("fires the failure notifier and stores the error message", () => {
    const notifier = _makeFakeNotifier();
    const store = createBackgroundJobStore({ now, notifier });
    const job = store.register({
      type: "test",
      label: "Test",
      failureToast: { title: "Failed" },
    });
    store.markFailed(job.id, "boom");
    expect(notifier.errorCalls).toEqual([{ title: "Failed" }]);
    expect(store.getJob(job.id)?.errorMessage).toBe("boom");
    expect(store.getJob(job.id)?.status).toBe("failed");
  });

  it("does not double-fire toast on repeated terminal transitions", () => {
    const notifier = _makeFakeNotifier();
    const store = createBackgroundJobStore({ now, notifier });
    const job = store.register({
      type: "test",
      label: "Test",
      successToast: { title: "Done" },
    });
    store.markCompleted(job.id);
    store.markCompleted(job.id);
    store.markFailed(job.id, "ignored");
    expect(notifier.successCalls).toHaveLength(1);
    expect(notifier.errorCalls).toHaveLength(0);
  });

  it("fires the warning notifier on cancel", () => {
    const notifier = _makeFakeNotifier();
    const store = createBackgroundJobStore({ now, notifier });
    const job = store.register({
      type: "test",
      label: "Test",
      cancelToast: { title: "Canceled" },
    });
    store.markCanceled(job.id);
    expect(notifier.warningCalls).toEqual([{ title: "Canceled" }]);
    expect(store.getJob(job.id)?.status).toBe("canceled");
  });

  it("does not fire any notifier on indeterminate", () => {
    const notifier = _makeFakeNotifier();
    const store = createBackgroundJobStore({ now, notifier });
    const job = store.register({
      type: "test",
      label: "Test",
      successToast: { title: "Done" },
      failureToast: { title: "Failed" },
    });
    store.markIndeterminate(job.id);
    expect(notifier.successCalls).toHaveLength(0);
    expect(notifier.errorCalls).toHaveLength(0);
    expect(notifier.warningCalls).toHaveLength(0);
  });

  it("removes a job from the store", () => {
    const store = createBackgroundJobStore({ now });
    const job = store.register({ type: "test", label: "T" });
    store.removeJob(job.id);
    expect(store.getJob(job.id)).toBeUndefined();
    expect(store.listJobs()).toHaveLength(0);
  });

  it("notifies subscribers on each mutation", () => {
    const store = createBackgroundJobStore({ now });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const job = store.register({ type: "test", label: "T" });
    expect(listener).toHaveBeenCalledTimes(1);
    store.updateProgress(job.id, 50);
    expect(listener).toHaveBeenCalledTimes(2);
    store.markCompleted(job.id);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.removeJob(job.id);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("returns a new snapshot reference after each mutation but caches between reads", () => {
    const store = createBackgroundJobStore({ now });
    const initialSnapshot = store.getSnapshot();
    // Cached: same reference across reads when nothing changed.
    expect(store.getSnapshot()).toBe(initialSnapshot);

    const job = store.register({ type: "test", label: "T" });
    const afterRegister = store.getSnapshot();
    expect(afterRegister).not.toBe(initialSnapshot);
    expect(afterRegister.byId).not.toBe(initialSnapshot.byId);

    store.updateProgress(job.id, 25);
    const afterProgress = store.getSnapshot();
    expect(afterProgress).not.toBe(afterRegister);
    expect(afterProgress.byId).not.toBe(afterRegister.byId);

    // Cached again after a quiet period.
    expect(store.getSnapshot()).toBe(afterProgress);
  });
});

describe("BackgroundJobStore persistence", () => {
  it("only persists jobs that opted in via persistAcrossRefresh", async () => {
    const persistence = createInMemoryBackgroundJobPersistence();
    const saveSpy = vi.spyOn(persistence, "save");
    const store = createBackgroundJobStore({ persistence });

    store.register({ type: "test", label: "ephemeral" });
    store.register({
      type: "test",
      label: "persistent",
      persistAcrossRefresh: true,
    });

    // wait a tick for the void-promise persistence call to flush
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0]![0].label).toBe("persistent");
  });

  it("removes the persisted row when a persistent job is removed", async () => {
    const persistence = createInMemoryBackgroundJobPersistence();
    const removeSpy = vi.spyOn(persistence, "remove");
    const store = createBackgroundJobStore({ persistence });

    const job = store.register({
      type: "test",
      label: "p",
      persistAcrossRefresh: true,
    });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    store.removeJob(job.id);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(removeSpy).toHaveBeenCalledWith(job.id);
  });

  it("demotes in_progress persisted jobs to indeterminate on hydrate", async () => {
    const persisted: readonly BackgroundJob[] = [
      {
        id: "stale-1",
        type: "test",
        label: "stale",
        status: "in_progress",
        persistAcrossRefresh: true,
        createdAt: 100,
      },
      {
        id: "done-1",
        type: "test",
        label: "done",
        status: "completed",
        persistAcrossRefresh: true,
        createdAt: 50,
        finishedAt: 75,
      },
    ];
    const persistence = createInMemoryBackgroundJobPersistence(persisted);
    const store = createBackgroundJobStore({ persistence });

    await store.hydrate();

    expect(store.getJob("stale-1")?.status).toBe("indeterminate");
    expect(store.getJob("done-1")?.status).toBe("completed");
  });

  it("hydrate is idempotent", async () => {
    const persisted: readonly BackgroundJob[] = [
      {
        id: "x",
        type: "test",
        label: "x",
        status: "completed",
        persistAcrossRefresh: true,
        createdAt: 1,
        finishedAt: 2,
      },
    ];
    const persistence = createInMemoryBackgroundJobPersistence(persisted);
    const store = createBackgroundJobStore({ persistence });
    await store.hydrate();
    await store.hydrate();
    expect(store.listJobs()).toHaveLength(1);
  });
});
