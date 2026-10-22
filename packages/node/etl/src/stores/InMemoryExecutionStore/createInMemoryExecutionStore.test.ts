import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { createInMemoryExecutionStore } from "@etl/stores/InMemoryExecutionStore/createInMemoryExecutionStore";
import { describe, expect, it } from "vitest";
import type {
  ExecutionOutcome,
  ExecutionScope,
  ExecutionStart,
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

describe("createInMemoryExecutionStore", () => {
  it("records a start, its scopes in order, and its finish", async () => {
    const store = createInMemoryExecutionStore();
    const otherScope = { ...SCOPE, scopeKey: "format:xlsx" };

    await store.start(START);
    await store.recordScope({ executionId: "run-1", scope: SCOPE });
    await store.recordScope({ executionId: "run-1", scope: otherScope });
    await store.finish({ executionId: "run-1", outcome: OUTCOME });

    expect(store.getExecutions()).toEqual([
      { start: START, scopes: [SCOPE, otherScope], outcome: OUTCOME },
    ]);
  });

  it("throws for a scope or finish on an unknown execution", async () => {
    const store = createInMemoryExecutionStore();

    await expect(
      store.recordScope({ executionId: "nope", scope: SCOPE }),
    ).rejects.toThrow("does not exist");
    await expect(
      store.finish({ executionId: "nope", outcome: OUTCOME }),
    ).rejects.toThrow("does not exist");
  });

  it("throws on a duplicate start id", async () => {
    const store = createInMemoryExecutionStore();
    await store.start(START);

    await expect(store.start(START)).rejects.toThrow("already exists");
  });

  it("throws for a scope or finish after the execution finished", async () => {
    const store = createInMemoryExecutionStore();
    await store.start(START);
    await store.finish({ executionId: "run-1", outcome: OUTCOME });

    await expect(
      store.recordScope({ executionId: "run-1", scope: SCOPE }),
    ).rejects.toThrow("already finished");
    await expect(
      store.finish({ executionId: "run-1", outcome: OUTCOME }),
    ).rejects.toThrow("already finished");
  });
});
