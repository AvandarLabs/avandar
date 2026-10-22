import { buildPruneExecutionScope } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/buildPruneExecutionScope";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { describe, expect, it } from "vitest";

describe("buildPruneExecutionScope", () => {
  it("records a pruned pair's counts, with no crawl timings or denominators", () => {
    expect(
      buildPruneExecutionScope({
        driveKey: "https://data.humdata.org",
        scopeKey: "format:parquet",
        counts: {
          listings_deleted: 2,
          listings_kept_in_use: 0,
          listings_detached: 1,
          checkpoints_deleted: 1,
        },
        status: "skipped",
        startedAt: new Date("2026-10-22T10:00:00.000Z"),
        finishedAt: new Date("2026-10-22T10:00:01.000Z"),
      }),
    ).toEqual({
      driveKey: "https://data.humdata.org",
      scopeKey: "format:parquet",
      status: "skipped",
      error: undefined,
      windowSince: undefined,
      windowUntil: undefined,
      checkpointBefore: undefined,
      checkpointAfter: undefined,
      startedAt: new Date("2026-10-22T10:00:00.000Z"),
      finishedAt: new Date("2026-10-22T10:00:01.000Z"),
      timings: NO_STAGE_TIMINGS,
      denominators: NO_DENOMINATORS,
      deletions: {
        listingsDeleted: 2,
        listingsKeptInUse: 0,
        listingsDetached: 1,
        checkpointsDeleted: 1,
      },
      pipelineMetrics: {},
    });
  });
});
