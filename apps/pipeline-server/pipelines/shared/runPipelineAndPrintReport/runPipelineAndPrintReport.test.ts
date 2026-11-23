import { EtlRunFailedError, NO_CRAWL_METRICS } from "@avandar/etl";
import {
  PIPELINE_PROGRESS_LINE_PREFIX,
  runPipelineAndPrintReport,
} from "@pipelines/shared/runPipelineAndPrintReport/runPipelineAndPrintReport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EtlPipelineRunId,
  EtlRunProgress,
  EtlRunReport,
} from "@avandar/etl";

const REPORT: EtlRunReport = {
  pipelineRunId: "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId,
  mode: "full",
  crawls: [
    {
      driveKey: "hdx",
      scopeKey: "all",
      window: { since: new Date("2026-10-01T00:00:00Z"), until: undefined },
      connectionsFetched: 0,
      relationsWritten: 0,
      relationsUnchanged: 0,
      newestTimestamp: undefined,
      status: "failed",
      error: "HTTP GET request failed with status 429.",
      startedAt: new Date("2026-10-22T10:00:00.000Z"),
      finishedAt: new Date("2026-10-22T10:00:01.000Z"),
      checkpointBefore: undefined,
      checkpointAfter: undefined,
      metrics: NO_CRAWL_METRICS,
    },
  ],
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
  finishedAt: new Date("2026-10-22T10:00:02.000Z"),
  setupMs: 0,
};

function _lastStdoutLine(): unknown {
  return vi.mocked(console.log).mock.calls.at(-1)?.[0];
}

describe("runPipelineAndPrintReport", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it("writes each progress event to stderr as one prefixed JSON line", async () => {
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => {
        return true;
      });
    const progress: EtlRunProgress = {
      stage: "crawl_started",
      driveKey: "hdx",
      scopeKey: "all",
      crawlNumber: 1,
      crawlCount: 1,
      limit: undefined,
      connectionsFetched: 0,
      relationsTransformed: 0,
      columnsFound: 0,
    };

    await runPipelineAndPrintReport({
      run: async (options) => {
        options.onProgress?.(progress);
        return REPORT;
      },
      options: { mode: "full" },
    });

    expect(
      writeSpy.mock.calls.map(([line]) => {
        return line;
      }),
    ).toEqual([
      `${PIPELINE_PROGRESS_LINE_PREFIX}${JSON.stringify(progress)}\n`,
    ]);
  });

  it("prints the run's report as JSON on the last line of stdout", async () => {
    await runPipelineAndPrintReport({
      run: async () => {
        return REPORT;
      },
      options: { mode: "full" },
    });

    expect([_lastStdoutLine(), process.exitCode]).toEqual([
      JSON.stringify(REPORT),
      undefined,
    ]);
  });

  it("still prints the report, and exits 1, when every drive failed", async () => {
    const error = new EtlRunFailedError({ report: REPORT, errors: [] });

    await runPipelineAndPrintReport({
      run: async () => {
        throw error;
      },
      options: { mode: "full" },
    });

    expect([
      _lastStdoutLine(),
      vi.mocked(console.error).mock.calls[0]?.[0],
      process.exitCode,
    ]).toEqual([JSON.stringify(REPORT), error.message, 1]);
  });

  it("rethrows any other error", async () => {
    await expect(
      runPipelineAndPrintReport({
        run: async () => {
          throw new Error("listDrives failed.");
        },
        options: { mode: "full" },
      }),
    ).rejects.toThrow("listDrives failed.");
  });
});
