import { randomUUID } from "node:crypto";
import { createSupabaseCheckpointStore } from "@etl/stores/SupabaseCheckpointStore/createSupabaseCheckpointStore";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { CheckpointKey } from "@etl/stores/EtlStores.types";

const CHECKPOINTS_TABLE = "pipeline_scope_checkpoints";
const PIPELINE_NAME = `etl-fixture-${randomUUID()}`;
const KEY: CheckpointKey = {
  pipelineName: PIPELINE_NAME,
  driveKey: "https://etl-fixture.invalid",
  scopeKey: "format:csv",
};

const client = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } },
);
const store = createSupabaseCheckpointStore({
  client,
  checkpointsTable: CHECKPOINTS_TABLE,
});

async function _readRunIds(): Promise<string[]> {
  const { data, error } = await client
    .from(CHECKPOINTS_TABLE)
    .select("pipeline_run_id")
    .eq("pipeline_name", PIPELINE_NAME);
  expect(error).toBeNull();
  return (data ?? []).map((row) => {
    return String(row.pipeline_run_id);
  });
}

beforeAll(async () => {
  // Removes what a crashed earlier run left behind.
  const { error } = await client
    .from(CHECKPOINTS_TABLE)
    .delete()
    .like("pipeline_name", "etl-fixture-%");
  expect(error).toBeNull();
});

afterEach(async () => {
  const { error } = await client
    .from(CHECKPOINTS_TABLE)
    .delete()
    .eq("pipeline_name", PIPELINE_NAME);
  expect(error).toBeNull();
});

describe("createSupabaseCheckpointStore", () => {
  it("has no checkpoint for a scope never written", async () => {
    await expect(store.read(KEY)).resolves.toBeUndefined();
  });

  it("writes a checkpoint and reads it back as the same instant", async () => {
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-01T12:34:56.789Z"),
      pipelineRunId: "run-1",
    });

    await expect(store.read(KEY)).resolves.toEqual(
      new Date("2026-10-01T12:34:56.789Z"),
    );
  });

  it("replaces a checkpoint's value and run id on one row", async () => {
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-01T00:00:00.000Z"),
      pipelineRunId: "run-1",
    });
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-02T00:00:00.000Z"),
      pipelineRunId: "run-2",
    });

    expect([await store.read(KEY), await _readRunIds()]).toEqual([
      new Date("2026-10-02T00:00:00.000Z"),
      ["run-2"],
    ]);
  });

  it("keeps two scopes of one drive apart", async () => {
    await store.write({
      ...KEY,
      highWaterMark: new Date("2026-10-01T00:00:00.000Z"),
      pipelineRunId: "run-1",
    });

    await expect(
      store.read({ ...KEY, scopeKey: "format:parquet" }),
    ).resolves.toBeUndefined();
  });

  it("names the table when a request fails", async () => {
    const brokenStore = createSupabaseCheckpointStore({
      client,
      checkpointsTable: "no_such_table",
    });

    await expect(brokenStore.read(KEY)).rejects.toThrow(
      "Supabase failed reading a checkpoint from no_such_table",
    );
  });
});
