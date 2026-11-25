import { describe, expect, it } from "vitest";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { doesDataTypeMatchColumnPicker } from "$/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts";
import type { PluginVizColumnPickerDataType } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

function _getMatchingDataTypes(
  pickerDataType: PluginVizColumnPickerDataType | undefined,
): AvaDataType.T[] {
  return AvaDataType.Types.filter((dataType) => {
    return doesDataTypeMatchColumnPicker({ dataType, pickerDataType });
  });
}

describe("doesDataTypeMatchColumnPicker", () => {
  it("accepts every data type for a picker that asks for any", () => {
    expect(_getMatchingDataTypes("any")).toEqual(AvaDataType.Types);
  });

  it("accepts every data type for a picker with no data type", () => {
    expect(_getMatchingDataTypes(undefined)).toEqual(AvaDataType.Types);
  });

  it("accepts only bigint and double for a numeric picker", () => {
    expect(_getMatchingDataTypes("numeric")).toEqual(["bigint", "double"]);
  });

  it("accepts only time, date, and timestamp for a temporal picker", () => {
    expect(_getMatchingDataTypes("temporal")).toEqual([
      "time",
      "date",
      "timestamp",
    ]);
  });

  it("accepts only varchar for a text picker", () => {
    expect(_getMatchingDataTypes("text")).toEqual(["varchar"]);
  });
});
