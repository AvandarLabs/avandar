import { createInMemoryCheckpointStore } from "@etl/stores/InMemoryCheckpointStore/createInMemoryCheckpointStore";
import { describe, expect, it } from "vitest";
import type {
  CheckpointKey,
  StoredCheckpoint,
} from "@etl/stores/EtlStores.types";

const KEY: CheckpointKey = {
  pipelineName: "hdx",
  driveKey: "https://data.humdata.org",
  scopeKey: "format:csv",
};

function _checkpoint(iso: string, pipelineRunId = "run-1"): StoredCheckpoint {
  return { ...KEY, highWaterMark: new Date(iso), pipelineRunId };
}

describe("createInMemoryCheckpointStore", () => {
  it("has no checkpoint for a scope never written", async () => {
    await expect(
      createInMemoryCheckpointStore().read(KEY),
    ).resolves.toBeUndefined();
  });

  it("reads back the last value written for a key", async () => {
    const store = createInMemoryCheckpointStore();
    await store.write(_checkpoint("2026-10-01T00:00:00.000Z"));
    await store.write(_checkpoint("2026-10-02T00:00:00.000Z", "run-2"));

    await expect(store.read(KEY)).resolves.toEqual(
      new Date("2026-10-02T00:00:00.000Z"),
    );
  });

  it("keeps each pipeline, drive, and scope apart", async () => {
    const store = createInMemoryCheckpointStore({
      checkpoints: [_checkpoint("2026-10-01T00:00:00.000Z")],
    });

    const reads = await Promise.all([
      store.read({ ...KEY, pipelineName: "socrata" }),
      store.read({ ...KEY, driveKey: "https://other.invalid" }),
      store.read({ ...KEY, scopeKey: "format:parquet" }),
    ]);

    expect(reads).toEqual([undefined, undefined, undefined]);
  });

  it("lists every checkpoint with the run that last wrote it", async () => {
    const store = createInMemoryCheckpointStore({
      checkpoints: [_checkpoint("2026-10-01T00:00:00.000Z")],
    });
    await store.write(_checkpoint("2026-10-03T00:00:00.000Z", "run-3"));

    expect([store.getCheckpoints(), store.getWriteCount()]).toEqual([
      [_checkpoint("2026-10-03T00:00:00.000Z", "run-3")],
      1,
    ]);
  });

  it("is not changed by editing a date it returned", async () => {
    const store = createInMemoryCheckpointStore({
      checkpoints: [_checkpoint("2026-10-01T00:00:00.000Z")],
    });

    (await store.read(KEY))?.setTime(0);
    store.getCheckpoints()[0]?.highWaterMark.setTime(0);

    await expect(store.read(KEY)).resolves.toEqual(
      new Date("2026-10-01T00:00:00.000Z"),
    );
  });

  it("rejects an invalid date, as Postgres would", async () => {
    await expect(
      createInMemoryCheckpointStore().write({
        ...KEY,
        highWaterMark: new Date(Number.NaN),
        pipelineRunId: "run-1",
      }),
    ).rejects.toThrow("invalid high-water mark");
  });
});
