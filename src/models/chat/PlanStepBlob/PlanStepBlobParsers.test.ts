import { describe, expect, it } from "vitest";
import { PlanStepBlobParsers } from "./PlanStepBlobParsers";
import type { PlanStepBlob } from "./PlanStepBlob";

const row: PlanStepBlob.T = {
  id: "plan-1|step-1" as PlanStepBlob.Id,
  planId: "plan-1",
  stepId: "step-1",
  parquet: new Blob(["parquet"], { type: "application/octet-stream" }),
  schema: [
    { name: "city", type: "VARCHAR" },
    { name: "population", type: "BIGINT" },
  ],
  rowCount: 2,
  savedAt: 1_700_000_000_000,
};

describe("PlanStepBlobParsers", () => {
  it("parses the persisted Blob row", () => {
    expect(PlanStepBlobParsers.DBReadSchema.parse(row)).toEqual(row);
  });

  it("converts every parser direction without changing the row", () => {
    const update: PlanStepBlob.T<"Update"> = {
      rowCount: 3,
      savedAt: 1_700_000_000_100,
    };

    expect(PlanStepBlobParsers.fromDBReadToModelRead(row)).toEqual(row);
    expect(PlanStepBlobParsers.fromModelInsertToDBInsert(row)).toEqual(row);
    expect(PlanStepBlobParsers.fromModelUpdateToDBUpdate(update)).toEqual(
      update,
    );
  });

  it("rejects non-Blob parquet data and incomplete schema fields", () => {
    expect(() => {
      PlanStepBlobParsers.DBReadSchema.parse({ ...row, parquet: "parquet" });
    }).toThrow();
    expect(() => {
      PlanStepBlobParsers.DBReadSchema.parse({
        ...row,
        schema: [{ name: "city" }],
      });
    }).toThrow();
  });
});
