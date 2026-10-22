import { randomUUID } from "node:crypto";
import {
  NO_DENOMINATORS,
  NO_STAGE_TIMINGS,
} from "@etl/stores/executionRecords/executionRecords";
import { createSupabaseExecutionStore } from "@etl/stores/SupabaseExecutionStore/createSupabaseExecutionStore";
import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

const PIPELINE_NAME = `etl-fixture-${randomUUID()}`;

const client = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);

const store = createSupabaseExecutionStore({
  client,
  functions: {
    start: "rpc_pipeline_executions__start",
    recordScope: "rpc_pipeline_executions__record_scope",
    finish: "rpc_pipeline_executions__finish",
  },
});

afterEach(async () => {
  const { error } = await client
    .from("pipeline_executions")
    .delete()
    .eq("pipeline_name", PIPELINE_NAME);
  expect(error).toBeNull();
});

describe("createSupabaseExecutionStore", () => {
  it("records a run's start, a scope, and its finish", async () => {
    const id = randomUUID();
    await store.start({
      id,
      pipelineName: PIPELINE_NAME,
      command: "run",
      runMode: "full",
      isDryRun: false,
      isScoped: false,
      isLimited: true,
      isWindowed: false,
      arguments: { mode: "full", limit: 5 },
      invocation: { invokedVia: "cli_local", cliArgv: ["pipeline", "run"] },
      startedAt: new Date("2026-10-22T10:00:00.000Z"),
    });
    await store.recordScope({
      executionId: id,
      scope: {
        driveKey: "https://etl-fixture.invalid",
        scopeKey: "all",
        status: "succeeded",
        error: undefined,
        windowSince: undefined,
        windowUntil: undefined,
        checkpointBefore: undefined,
        checkpointAfter: undefined,
        startedAt: new Date("2026-10-22T10:00:00.000Z"),
        finishedAt: new Date("2026-10-22T10:00:01.000Z"),
        timings: { ...NO_STAGE_TIMINGS, extractMs: 40 },
        denominators: { ...NO_DENOMINATORS, pageCount: 3 },
        deletions: undefined,
        pipelineMetrics: {},
      },
    });
    await store.finish({
      executionId: id,
      outcome: {
        status: "succeeded",
        error: undefined,
        finishedAt: new Date("2026-10-22T10:00:02.000Z"),
        setupMs: 5,
        deletions: undefined,
      },
    });

    const { data } = await client
      .from("pipeline_executions")
      .select(
        "status, is_limited, extract_ms, page_count, setup_ms, duration_ms",
      )
      .eq("id", id)
      .single();
    expect(data).toEqual({
      status: "succeeded",
      is_limited: true,
      extract_ms: 40,
      page_count: 3,
      setup_ms: 5,
      duration_ms: 2000,
    });
  });

  it("names the function in the error when a call fails", async () => {
    await expect(
      store.finish({
        executionId: randomUUID(),
        outcome: {
          status: "succeeded",
          error: undefined,
          finishedAt: new Date(),
          setupMs: 0,
          deletions: undefined,
        },
      }),
    ).rejects.toThrow("rpc_pipeline_executions__finish");
  });
});
