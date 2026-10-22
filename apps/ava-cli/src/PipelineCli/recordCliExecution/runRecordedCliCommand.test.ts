import { runRecordedCliCommand } from "@ava-cli/PipelineCli/recordCliExecution/runRecordedCliCommand";
import { Acclimate } from "@avandar/acclimate";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionScope } from "@etl/stores/ExecutionStore.types";

const TARGET = {
  apiUrl: "http://127.0.0.1:54321",
  secretKey: "sb_secret_test",
};

const START = {
  pipelineName: "hdx",
  command: "prune_retired_scopes",
  isDryRun: true,
  isScoped: false,
  arguments: { dryRun: true },
} as const;

const SCOPE: ExecutionScope = {
  driveKey: "https://data.humdata.org",
  scopeKey: "format:parquet",
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
  deletions: {
    listingsDeleted: 2,
    listingsKeptInUse: 0,
    listingsDetached: 1,
    checkpointsDeleted: 1,
  },
  pipelineMetrics: {},
};

type _RpcCall = Readonly<{
  functionName: string;
  body: Record<string, unknown>;
}>;

/** Stubs PostgREST's RPC endpoint, answering every call with `status`. */
function _stubRpcs(status = 204): _RpcCall[] {
  const calls: _RpcCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { body?: string }) => {
      calls.push({
        functionName: new URL(input).pathname.replace("/rest/v1/rpc/", ""),
        body: JSON.parse(init?.body ?? "{}") as Record<string, unknown>,
      });
      return new Response(status === 204 ? null : "no such function", {
        status,
      });
    }),
  );
  return calls;
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return logCalls.flat().join("\n");
}

describe("runRecordedCliCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records the start, each scope, and the outcome, under one id", async () => {
    const calls = _stubRpcs();

    await runRecordedCliCommand({
      target: TARGET,
      start: START,
      work: async (recordScope) => {
        await recordScope(SCOPE);
        return { status: "succeeded" };
      },
    });

    const executionId = (calls[0]?.body.p_execution as { id: string }).id;
    expect(
      calls.map((call) => {
        return [call.functionName, call.body.p_execution_id ?? executionId];
      }),
    ).toEqual([
      ["rpc_pipeline_executions__start", executionId],
      ["rpc_pipeline_executions__record_scope", executionId],
      ["rpc_pipeline_executions__finish", executionId],
    ]);
  });

  it("records the command, its flags, and how the CLI was invoked", async () => {
    const calls = _stubRpcs();

    await runRecordedCliCommand({
      target: TARGET,
      start: START,
      work: async () => {
        return { status: "succeeded" };
      },
    });

    expect(calls[0]?.body.p_execution).toMatchObject({
      pipeline_name: "hdx",
      command: "prune_retired_scopes",
      run_mode: null,
      is_dry_run: true,
      is_scoped: false,
      is_limited: false,
      is_windowed: false,
      arguments: { dryRun: true },
      invoked_via: "cli_local",
      cli_argv: expect.any(Array),
      request_body: null,
      actor: expect.stringContaining("@"),
    });
  });

  it("records the outcome and deletions the command resolves to", async () => {
    const calls = _stubRpcs();

    await runRecordedCliCommand({
      target: TARGET,
      start: START,
      work: async () => {
        return {
          status: "cancelled",
          deletions: {
            listingsDeleted: 7,
            listingsKeptInUse: 3,
            listingsDetached: 0,
            checkpointsDeleted: 2,
            workspaceDatasetsDeleted: 1,
          },
        };
      },
    });

    expect(calls[1]?.body.p_outcome).toMatchObject({
      status: "cancelled",
      error: null,
      listings_deleted: 7,
      workspace_datasets_deleted: 1,
    });
  });

  it("records failed with the error, and rethrows it", async () => {
    const calls = _stubRpcs();

    await expect(
      runRecordedCliCommand({
        target: TARGET,
        start: START,
        work: async () => {
          throw new Error("boom");
        },
      }),
    ).rejects.toThrow("boom");

    expect(calls[1]?.body.p_outcome).toMatchObject({
      status: "failed",
      error: "boom",
    });
  });

  it("warns and still runs the command when recording fails", async () => {
    _stubRpcs(404);
    const work = vi.fn(async () => {
      return { status: "succeeded" } as const;
    });

    await runRecordedCliCommand({ target: TARGET, start: START, work });

    expect([work.mock.calls.length, _getCombinedLogs()]).toEqual([
      1,
      expect.stringContaining("Could not record the start"),
    ]);
  });
});
