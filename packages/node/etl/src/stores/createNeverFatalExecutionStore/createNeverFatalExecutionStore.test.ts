import { SYSTEM_CLOCK } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import { createNeverFatalExecutionStore } from "@etl/stores/createNeverFatalExecutionStore/createNeverFatalExecutionStore";
import { EtlTransientStoreError } from "@etl/stores/EtlTransientStoreError";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { createInMemoryExecutionStore } from "@etl/stores/InMemoryExecutionStore/createInMemoryExecutionStore";
import { describe, expect, it, vi } from "vitest";
import type {
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStart,
  ExecutionStore,
} from "@etl/stores/ExecutionStore.types";

const START: ExecutionStart = {
  id: "run-1",
  pipelineName: "hdx",
  command: "run",
  runMode: "full",
  isDryRun: false,
  isScoped: false,
  isLimited: false,
  isWindowed: false,
  arguments: {},
  invocation: { invokedVia: "cli_local" },
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
};

const SCOPE: ExecutionScope = {
  driveKey: "https://data.humdata.org",
  scopeKey: "format:csv",
  status: "succeeded",
  error: undefined,
  windowSince: undefined,
  windowUntil: undefined,
  checkpointBefore: undefined,
  checkpointAfter: undefined,
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
  finishedAt: new Date("2026-10-22T10:00:01.000Z"),
  timings: NO_STAGE_TIMINGS,
  denominators: NO_DENOMINATORS,
  deletions: undefined,
  pipelineMetrics: {},
};

const OUTCOME: ExecutionOutcome = {
  status: "succeeded",
  error: undefined,
  finishedAt: new Date("2026-10-22T10:00:02.000Z"),
  setupMs: 0,
  deletions: undefined,
};

function _createFailingStore(
  failing: ReadonlySet<keyof ExecutionStore>,
): ExecutionStore {
  const store = createInMemoryExecutionStore();
  return {
    start: async (execution) => {
      if (failing.has("start")) {
        throw new Error("start failed");
      }
      return store.start(execution);
    },
    recordScope: async (args) => {
      if (failing.has("recordScope")) {
        throw new Error("recordScope failed");
      }
      return store.recordScope(args);
    },
    finish: async (args) => {
      if (failing.has("finish")) {
        throw new Error("finish failed");
      }
      return store.finish(args);
    },
  };
}

describe("createNeverFatalExecutionStore", () => {
  it("passes every call through to a working store", async () => {
    const store = createInMemoryExecutionStore();
    const safe = createNeverFatalExecutionStore({ store, warn: vi.fn() });

    await safe.start(START);
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });

    expect(store.getExecutions()).toEqual([
      { start: START, scopes: [SCOPE], outcome: OUTCOME },
    ]);
  });

  it("retries a call that failed transiently before recording it", async () => {
    const store = createInMemoryExecutionStore();
    const sleeps: number[] = [];
    let failuresLeft = 2;
    const warn = vi.fn();
    const safe = createNeverFatalExecutionStore({
      store: {
        ...store,
        start: async (execution) => {
          if (failuresLeft > 0) {
            failuresLeft -= 1;
            throw new EtlTransientStoreError("statement timeout", {
              status: 500,
              code: "57014",
              cause: undefined,
            });
          }
          return await store.start(execution);
        },
      },
      warn,
      clock: {
        ...SYSTEM_CLOCK,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    });

    await safe.start(START);
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });

    expect([store.getExecutions().length, sleeps.length]).toEqual([1, 2]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns instead of throwing when a call fails", async () => {
    const warn = vi.fn();
    const safe = createNeverFatalExecutionStore({
      store: _createFailingStore(new Set(["recordScope", "finish"])),
      warn,
    });

    await safe.start(START);
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain("recordScope failed");
  });

  it("skips scopes and finish after a failed start", async () => {
    const warn = vi.fn();
    const store = createInMemoryExecutionStore();
    const safe = createNeverFatalExecutionStore({
      store: {
        ...store,
        start: async () => {
          throw new Error("no table");
        },
      },
      warn,
    });

    await safe.start(START);
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });

    expect([warn.mock.calls.length, store.getExecutions()]).toEqual([1, []]);
  });

  it("records only the first finish", async () => {
    const store = createInMemoryExecutionStore();
    const safe = createNeverFatalExecutionStore({ store, warn: vi.fn() });

    await safe.start(START);
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });
    await safe.finish({
      executionId: "run-1",
      outcome: { ...OUTCOME, status: "failed", error: "later" },
    });

    expect(store.getExecutions()[0]?.outcome?.status).toBe("succeeded");
  });

  it("skips a scope recorded after finish", async () => {
    const store = createInMemoryExecutionStore();
    const warn = vi.fn();
    const safe = createNeverFatalExecutionStore({ store, warn });

    await safe.start(START);
    await safe.finish({ executionId: "run-1", outcome: OUTCOME });
    await safe.recordScope({ executionId: "run-1", scope: SCOPE });

    expect([warn.mock.calls.length, store.getExecutions()[0]?.scopes]).toEqual([
      0,
      [],
    ]);
  });
});
