import { NO_CRAWL_METRICS } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import {
  buildRunExecutionStart,
  createRunExecutionRecorder,
  getRunExecutionStatus,
} from "@etl/EtlEngine/recordRunExecution/createRunExecutionRecorder";
import { createInMemoryExecutionStore } from "@etl/stores/InMemoryExecutionStore/createInMemoryExecutionStore";
import { describe, expect, it } from "vitest";
import type {
  EtlCrawlReport,
  EtlPipelineRunId,
} from "@etl/EtlEngine/EtlEngine.types";

const RUN_ID = "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId;
const STARTED_AT = new Date("2026-10-22T10:00:00.000Z");

function _crawl(overrides: Partial<EtlCrawlReport> = {}): EtlCrawlReport {
  return {
    driveKey: "https://data.cityofnewyork.us",
    scopeKey: "all",
    window: { since: undefined, until: undefined },
    connectionsFetched: 3,
    relationsWritten: 2,
    relationsUnchanged: 1,
    newestTimestamp: undefined,
    status: "ok",
    startedAt: STARTED_AT,
    finishedAt: new Date("2026-10-22T10:00:01.000Z"),
    checkpointBefore: undefined,
    checkpointAfter: undefined,
    metrics: NO_CRAWL_METRICS,
    ...overrides,
  };
}

describe("buildRunExecutionStart", () => {
  it("records the run's mode, flags, and parsed arguments", () => {
    const start = buildRunExecutionStart({
      pipelineName: "socrata",
      pipelineRunId: RUN_ID,
      startedAt: STARTED_AT,
      invocation: { invokedVia: "cli_local" },
      options: {
        mode: "incremental",
        until: new Date("2026-10-21T00:00:00.000Z"),
        limit: 5,
        scopes: ["all"],
      },
    });

    expect([
      {
        id: start.id,
        command: start.command,
        runMode: start.runMode,
        isDryRun: start.isDryRun,
        isScoped: start.isScoped,
        isLimited: start.isLimited,
        isWindowed: start.isWindowed,
      },
      start.arguments,
    ]).toStrictEqual([
      {
        id: RUN_ID,
        command: "run",
        runMode: "incremental",
        isDryRun: false,
        isScoped: true,
        isLimited: true,
        isWindowed: true,
      },
      // Strict, so an option left unset never appears as an undefined key.
      {
        mode: "incremental",
        until: "2026-10-21T00:00:00.000Z",
        limit: 5,
        scopes: ["all"],
      },
    ]);
  });
});

describe("getRunExecutionStatus", () => {
  it.each([
    ["succeeded", [_crawl(), _crawl({ status: "skipped" })], undefined],
    [
      "partially_failed",
      [_crawl(), _crawl({ status: "failed", error: "boom" })],
      "boom",
    ],
    [
      "failed",
      [
        _crawl({ status: "failed", error: "first" }),
        _crawl({ status: "failed", error: "second" }),
      ],
      "first",
    ],
    ["succeeded", [], undefined],
  ] as const)("is %s, with the first error", (status, crawls, error) => {
    expect(getRunExecutionStatus(crawls)).toEqual({ status, error });
  });
});

describe("createRunExecutionRecorder", () => {
  it("records nothing without an invocation", async () => {
    const store = createInMemoryExecutionStore();
    const recorder = createRunExecutionRecorder({
      store,
      pipelineName: "socrata",
      pipelineRunId: RUN_ID,
      options: { mode: "full" },
      startedAt: STARTED_AT,
    });

    await recorder.start();
    await recorder.recordCrawl(_crawl());

    expect(store.getExecutions()).toEqual([]);
  });

  it("records each crawl as a scope, with its outcome and metrics", async () => {
    const store = createInMemoryExecutionStore();
    const recorder = createRunExecutionRecorder({
      store,
      pipelineName: "socrata",
      pipelineRunId: RUN_ID,
      options: { mode: "full", invocation: { invokedVia: "http" } },
      startedAt: STARTED_AT,
    });

    await recorder.start();
    await recorder.recordCrawl(
      _crawl({ status: "failed", error: "source answered 500" }),
    );

    expect(store.getExecutions()[0]?.scopes[0]).toMatchObject({
      driveKey: "https://data.cityofnewyork.us",
      scopeKey: "all",
      status: "failed",
      error: "source answered 500",
      deletions: undefined,
      timings: NO_CRAWL_METRICS.timings,
    });
  });
});
