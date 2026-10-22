import {
  buildExecutionOutcomeRow,
  buildExecutionScopeRow,
  buildExecutionStartRow,
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { describe, expect, it } from "vitest";
import type { ExecutionScope } from "@etl/stores/ExecutionStore.types";

const SCOPE: ExecutionScope = {
  driveKey: "https://data.humdata.org",
  scopeKey: "format:csv",
  status: "failed",
  error: "source answered 500",
  windowSince: new Date("2026-10-01T00:00:00.000Z"),
  windowUntil: undefined,
  checkpointBefore: undefined,
  checkpointAfter: new Date("2026-10-02T00:00:00.000Z"),
  startedAt: new Date("2026-10-22T10:00:00.000Z"),
  finishedAt: new Date("2026-10-22T10:00:01.000Z"),
  timings: { ...NO_STAGE_TIMINGS, extractMs: 12, loadWriteMs: 3 },
  denominators: { ...NO_DENOMINATORS, pageCount: 2, sourceBytesReported: 99 },
  deletions: undefined,
  pipelineMetrics: { "hdx.parquet_footer_reads": 1 },
};

describe("executionRecords", () => {
  it("builds a start row in the functions' snake_case", () => {
    expect(
      buildExecutionStartRow({
        id: "run-1",
        pipelineName: "hdx",
        command: "run",
        runMode: "incremental",
        isDryRun: false,
        isScoped: true,
        isLimited: false,
        isWindowed: false,
        arguments: { mode: "incremental", scopes: ["format:csv"] },
        invocation: {
          invokedVia: "cli_server",
          cliArgv: ["pipeline", "run", "hdx"],
        },
        startedAt: new Date("2026-10-22T10:00:00.000Z"),
      }),
    ).toEqual({
      id: "run-1",
      pipeline_name: "hdx",
      command: "run",
      run_mode: "incremental",
      is_dry_run: false,
      is_scoped: true,
      is_limited: false,
      is_windowed: false,
      invoked_via: "cli_server",
      cli_argv: ["pipeline", "run", "hdx"],
      request_body: null,
      arguments: { mode: "incremental", scopes: ["format:csv"] },
      actor: null,
      host: null,
      code_version: null,
      started_at: "2026-10-22T10:00:00.000Z",
    });
  });

  it("builds a scope row with every timing and count, and null for what is unknown", () => {
    expect(buildExecutionScopeRow(SCOPE)).toMatchObject({
      drive_key: "https://data.humdata.org",
      scope_key: "format:csv",
      status: "failed",
      error: "source answered 500",
      window_since: "2026-10-01T00:00:00.000Z",
      window_until: null,
      checkpoint_before: null,
      checkpoint_after: "2026-10-02T00:00:00.000Z",
      extract_ms: 12,
      load_write_ms: 3,
      setup_ms: 0,
      page_count: 2,
      source_bytes_reported: 99,
      listings_deleted: 0,
      pipeline_metrics: { "hdx.parquet_footer_reads": 1 },
    });
  });

  it("leaves a scope's unknown source size null", () => {
    expect(
      buildExecutionScopeRow({
        ...SCOPE,
        denominators: NO_DENOMINATORS,
      }).source_bytes_reported,
    ).toBe(null);
  });

  it("omits an outcome's deletions when it has none, so the stored totals stay", () => {
    expect(
      buildExecutionOutcomeRow({
        status: "succeeded",
        error: undefined,
        finishedAt: new Date("2026-10-22T10:00:05.000Z"),
        setupMs: 20,
        deletions: undefined,
      }),
    ).toEqual({
      status: "succeeded",
      error: null,
      finished_at: "2026-10-22T10:00:05.000Z",
      setup_ms: 20,
    });
  });

  it("writes an outcome's deletions when it has them", () => {
    expect(
      buildExecutionOutcomeRow({
        status: "succeeded",
        error: undefined,
        finishedAt: new Date("2026-10-22T10:00:05.000Z"),
        setupMs: 0,
        deletions: {
          listingsDeleted: 7,
          listingsKeptInUse: 3,
          listingsDetached: 0,
          checkpointsDeleted: 2,
          workspaceDatasetsDeleted: 1,
        },
      }),
    ).toMatchObject({
      listings_deleted: 7,
      listings_kept_in_use: 3,
      listings_detached: 0,
      checkpoints_deleted: 2,
      workspace_datasets_deleted: 1,
    });
  });
});
