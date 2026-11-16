import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DataSlotAttributeType } from "@avandar/plugin-manifest/runtime";

/**
 * The field types each data slot attribute type can be bound to. A `geo`
 * type binds to text, because a province or district is stored as a name or
 * a code. Read when a binding UI lists the fields an attribute may take, and
 * when a saved binding is checked.
 */
const DATA_SLOT_ACCEPTED_DATA_TYPES: Readonly<
  Record<DataSlotAttributeType, readonly AvaDataType.T[]>
> = {
  number: ["bigint", "double"],
  date: ["date", "timestamp"],
  text: ["varchar"],
  boolean: ["boolean"],
  "geo.admin1": ["varchar"],
  "geo.admin2": ["varchar"],
};

/**
 * Whether a case type attribute or dataset column of `dataType` can fill a
 * data slot attribute of `type`. Use it wherever a field is offered for, or
 * checked against, a slot attribute, for example to filter a field picker.
 */
export function isDataTypeAcceptedBySlotAttribute(
  options: Readonly<{ type: DataSlotAttributeType; dataType: AvaDataType.T }>,
): boolean {
  return DATA_SLOT_ACCEPTED_DATA_TYPES[options.type].includes(options.dataType);
}
