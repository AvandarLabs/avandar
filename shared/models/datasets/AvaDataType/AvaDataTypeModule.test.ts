import { describe, expect, it } from "vitest";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

describe("AvaDataType.toDuckDbTypeSql", () => {
  it.each([
    ["varchar", "VARCHAR"],
    ["bigint", "BIGINT"],
    ["double", "DOUBLE"],
    ["time", "TIME"],
    ["date", "DATE"],
    ["timestamp", "TIMESTAMP"],
    ["boolean", "BOOLEAN"],
  ] as const)("casts %s values to %s", (avaDataType, expected) => {
    expect(AvaDataType.toDuckDbTypeSql(avaDataType)).toBe(expected);
  });
});
