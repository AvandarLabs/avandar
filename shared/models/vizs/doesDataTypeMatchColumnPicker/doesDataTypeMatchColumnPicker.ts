import { matchLiteral } from "@avandar/utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { PluginVizColumnPickerDataType } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

/**
 * Whether a column of `dataType` can fill a column picker that asks for
 * `pickerDataType`. `any`, or no data type, accepts every column.
 *
 * Use it wherever a column picker's choices are narrowed, for example to list
 * the columns a settings form offers or to auto-fill a required column.
 */
export function doesDataTypeMatchColumnPicker(
  options: Readonly<{
    dataType: AvaDataType.T;
    pickerDataType: PluginVizColumnPickerDataType | undefined;
  }>,
): boolean {
  const { dataType, pickerDataType } = options;
  if (pickerDataType === undefined) {
    return true;
  }
  return matchLiteral(pickerDataType, {
    any: true,
    numeric: () => {
      return AvaDataType.isNumeric(dataType);
    },
    temporal: () => {
      return AvaDataType.isTemporal(dataType);
    },
    text: () => {
      return AvaDataType.isText(dataType);
    },
  });
}
