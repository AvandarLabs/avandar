import { describe, expect, it } from "vitest";
import { isDataTypeAcceptedBySlotAttribute } from "@/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DataSlotAttributeType } from "@avandar/plugin-manifest/runtime";

const ALL_DATA_TYPES: readonly AvaDataType.T[] = [
  "boolean",
  "bigint",
  "double",
  "time",
  "date",
  "timestamp",
  "varchar",
];

const ACCEPTED_CASES: ReadonlyArray<
  [DataSlotAttributeType, readonly AvaDataType.T[]]
> = [
  ["number", ["bigint", "double"]],
  ["date", ["date", "timestamp"]],
  ["text", ["varchar"]],
  ["boolean", ["boolean"]],
  ["geo.admin1", ["varchar"]],
  ["geo.admin2", ["varchar"]],
];

describe("isDataTypeAcceptedBySlotAttribute", () => {
  it.each(ACCEPTED_CASES)(
    "accepts exactly the listed field types for a %s attribute",
    (type, acceptedDataTypes) => {
      const accepted = ALL_DATA_TYPES.filter((dataType) => {
        return isDataTypeAcceptedBySlotAttribute({ type, dataType });
      });
      expect(accepted).toEqual(acceptedDataTypes);
    },
  );
});
