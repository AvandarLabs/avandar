import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { PlanStepBlobParsers } from "@/models/chat/PlanStepBlob/PlanStepBlobParsers";
import { PlanStepBlobClient } from "./PlanStepBlobClient";
import type { PutPlanStepBlobArgs } from "./PlanStepBlobClient";
import type { PlanStepBlob } from "@/models/chat/PlanStepBlob/PlanStepBlob";

vi.hoisted(() => {
  Object.defineProperty(globalThis, "Blob", {
    configurable: true,
    value: process.getBuiltinModule("node:buffer").Blob,
    writable: true,
  });
});

const SAVED_AT = 1_721_234_567_890;

function _createBlobInput(
  overrides: {
    planId?: string;
    stepId?: string;
    text?: string;
  } = {},
): PutPlanStepBlobArgs {
  return {
    planId: overrides.planId ?? "plan-1",
    stepId: overrides.stepId ?? "step-1",
    parquet: new Blob([overrides.text ?? "parquet bytes"], {
      type: "application/vnd.apache.parquet",
    }),
    schema: [
      { name: "city", type: "VARCHAR" },
      { name: "population", type: "BIGINT" },
    ],
    rowCount: 2,
  };
}

describe("PlanStepBlobClient", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await AvaDexie.DB.PlanStepBlob.clear();
  });

  it("stores a Blob with a deterministic id and current save time", async () => {
    vi.spyOn(Date, "now").mockReturnValue(SAVED_AT);
    const parserSpy = vi.spyOn(
      PlanStepBlobParsers,
      "fromModelInsertToDBInsert",
    );
    const input = _createBlobInput();

    await PlanStepBlobClient.putPlanStepBlob(input);

    const stored = await AvaDexie.DB.PlanStepBlob.get(
      "plan-1|step-1" as PlanStepBlob.Id,
    );
    expect(stored).toMatchObject({
      id: "plan-1|step-1",
      planId: "plan-1",
      stepId: "step-1",
      schema: input.schema,
      rowCount: 2,
      savedAt: SAVED_AT,
    });
    expect(await stored?.parquet.text()).toBe("parquet bytes");
    expect(parserSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "plan-1|step-1",
        savedAt: SAVED_AT,
      }),
    );
  });

  it("gets a Blob by its plan and step ids through the read parser", async () => {
    const input = _createBlobInput();
    await PlanStepBlobClient.putPlanStepBlob(input);
    const parserSpy = vi.spyOn(PlanStepBlobParsers, "fromDBReadToModelRead");

    const result = await PlanStepBlobClient.getPlanStepBlob({
      planId: input.planId,
      stepId: input.stepId,
    });

    expect(result).toMatchObject({
      id: "plan-1|step-1",
      schema: input.schema,
      rowCount: 2,
    });
    expect(await result?.parquet.text()).toBe("parquet bytes");
    expect(parserSpy).toHaveBeenCalledTimes(1);
  });

  it("lists only Blobs belonging to the requested plan", async () => {
    await PlanStepBlobClient.putPlanStepBlob(_createBlobInput());
    await PlanStepBlobClient.putPlanStepBlob(
      _createBlobInput({ stepId: "step-2", text: "second" }),
    );
    await PlanStepBlobClient.putPlanStepBlob(
      _createBlobInput({ planId: "plan-2", text: "other plan" }),
    );
    const parserSpy = vi.spyOn(PlanStepBlobParsers, "fromDBReadToModelRead");

    const results = await PlanStepBlobClient.listPlanStepBlobs("plan-1");

    expect(
      results
        .map(({ stepId }) => {
          return stepId;
        })
        .sort(),
    ).toEqual(["step-1", "step-2"]);
    expect(await results[1]?.parquet.text()).toBe("second");
    expect(parserSpy).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid rows read from IndexedDB", async () => {
    await AvaDexie.DB.PlanStepBlob.put({
      id: "plan-1|step-1" as PlanStepBlob.Id,
      ..._createBlobInput(),
      rowCount: "invalid",
      savedAt: SAVED_AT,
    } as unknown as PlanStepBlob.T);

    await expect(
      PlanStepBlobClient.getPlanStepBlob({
        planId: "plan-1",
        stepId: "step-1",
      }),
    ).rejects.toThrow("[PlanStepBlob:DBReadSchema]");
    await expect(
      PlanStepBlobClient.listPlanStepBlobs("plan-1"),
    ).rejects.toThrow("[PlanStepBlob:DBReadSchema]");
  });

  it("clears one plan without affecting another", async () => {
    await PlanStepBlobClient.putPlanStepBlob(_createBlobInput());
    await PlanStepBlobClient.putPlanStepBlob(
      _createBlobInput({ planId: "plan-2" }),
    );

    await PlanStepBlobClient.clearPlanStepBlobs("plan-1");

    expect(await AvaDexie.DB.PlanStepBlob.toArray()).toEqual([
      expect.objectContaining({ planId: "plan-2" }),
    ]);
  });

  it("clears all persisted plan step Blobs", async () => {
    await PlanStepBlobClient.putPlanStepBlob(_createBlobInput());
    await PlanStepBlobClient.putPlanStepBlob(
      _createBlobInput({ planId: "plan-2" }),
    );

    await PlanStepBlobClient.clearAllPlanStepBlobs();

    expect(await AvaDexie.DB.PlanStepBlob.count()).toBe(0);
  });

  it("exposes hooks for every named operation", () => {
    expect(PlanStepBlobClient.usePutPlanStepBlob).toBeTypeOf("function");
    expect(PlanStepBlobClient.useGetPlanStepBlob).toBeTypeOf("function");
    expect(PlanStepBlobClient.useListPlanStepBlobs).toBeTypeOf("function");
    expect(PlanStepBlobClient.useClearPlanStepBlobs).toBeTypeOf("function");
    expect(PlanStepBlobClient.useClearAllPlanStepBlobs).toBeTypeOf("function");
  });
});
