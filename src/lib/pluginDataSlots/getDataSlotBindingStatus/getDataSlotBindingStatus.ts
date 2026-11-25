import { match } from "ts-pattern";
import { isDataTypeAcceptedBySlotAttribute } from "@/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type {
  PluginDataSlot,
  PluginDataSlotAttribute,
} from "@avandar/plugin-manifest/runtime";

/**
 * One reason a data slot binding is broken. Settings shows each one next to
 * the slot, and `querySlot` names them in its `SlotBroken` error.
 *
 * - `source_missing`: the case type or dataset was deleted, or the current
 *   user cannot read it.
 * - `field_missing`: the attribute is mapped to a field that no longer
 *   exists.
 * - `type_mismatch`: the mapped field's type no longer fits the attribute.
 * - `required_unmapped`: a required attribute has no field.
 */
export type DataSlotBindingProblem =
  | Readonly<{ kind: "source_missing" }>
  | Readonly<{ kind: "field_missing"; attributeKey: string }>
  | Readonly<{
      kind: "type_mismatch";
      attributeKey: string;
      dataType: AvaDataType.T;
    }>
  | Readonly<{ kind: "required_unmapped"; attributeKey: string }>;

/**
 * Whether a data slot can be read, worked out from its binding when it is
 * read. Settings shows it on the plugin card, and `querySlot` refuses to
 * run unless it is `bound`.
 *
 * - `unbound`: the slot has no binding.
 * - `broken`: the binding cannot be read, for every listed reason.
 * - `bound`: every mapped attribute's field, by attribute key. An unmapped
 *   optional attribute is present with `undefined`.
 */
export type DataSlotBindingStatus =
  | Readonly<{ kind: "unbound" }>
  | Readonly<{ kind: "broken"; problems: readonly DataSlotBindingProblem[] }>
  | Readonly<{
      kind: "bound";
      fieldsByAttributeKey: Readonly<
        Record<string, DataSlotSourceField | undefined>
      >;
    }>;

type BindingSourceFields = Pick<
  PluginDataSlotBinding.T,
  "attributeMap" | "conceptId" | "datasetId" | "sourceType"
>;

type AttributeCheck = {
  attributeKey: string;
  attribute: PluginDataSlotAttribute;
  fieldId: string | undefined;
  field: DataSlotSourceField | undefined;
};

function _isSourceOfBinding(
  source: DataSlotSource,
  binding: Readonly<BindingSourceFields>,
): boolean {
  return match(source)
    .with({ kind: "concept" }, (conceptSource) => {
      return (
        binding.sourceType === "concept" &&
        conceptSource.conceptId === binding.conceptId
      );
    })
    .with({ kind: "dataset" }, (datasetSource) => {
      return (
        binding.sourceType === "dataset" &&
        datasetSource.datasetId === binding.datasetId
      );
    })
    .exhaustive();
}

function _getAttributeProblem(
  check: Readonly<AttributeCheck>,
): DataSlotBindingProblem | undefined {
  const { attributeKey, attribute, fieldId, field } = check;
  if (fieldId === undefined) {
    return attribute.required
      ? { kind: "required_unmapped", attributeKey }
      : undefined;
  }
  if (field === undefined) {
    return { kind: "field_missing", attributeKey };
  }
  return isDataTypeAcceptedBySlotAttribute({
    type: attribute.type,
    dataType: field.dataType,
  })
    ? undefined
    : { kind: "type_mismatch", attributeKey, dataType: field.dataType };
}

/**
 * Works out whether a data slot's binding can be read: unbound, broken with
 * every reason, or bound with the field behind each slot attribute. Pass the
 * source `loadDataSlotSource` read for the binding, or `undefined` when it
 * found none. Use it wherever a slot is shown or read, for example the
 * plugin card's Data section or a command's `querySlot`.
 */
export function getDataSlotBindingStatus(
  options: Readonly<{
    slot: PluginDataSlot;
    binding: Readonly<BindingSourceFields> | undefined;
    source: DataSlotSource | undefined;
  }>,
): DataSlotBindingStatus {
  const { slot, binding, source } = options;
  if (binding === undefined) {
    return { kind: "unbound" };
  }
  if (source === undefined || !_isSourceOfBinding(source, binding)) {
    return { kind: "broken", problems: [{ kind: "source_missing" }] };
  }
  const fieldsById = new Map(
    source.fields.map((field) => {
      return [field.id, field];
    }),
  );
  const problems: DataSlotBindingProblem[] = [];
  const fieldsByAttributeKey: Record<string, DataSlotSourceField | undefined> =
    {};
  Object.entries(slot.attributes).forEach(([attributeKey, attribute]) => {
    // An attribute key may be named like an Object method, so read only an
    // own entry of the map.
    const fieldId = Object.hasOwn(binding.attributeMap, attributeKey)
      ? binding.attributeMap[attributeKey]
      : undefined;
    const field = fieldId === undefined ? undefined : fieldsById.get(fieldId);
    const problem = _getAttributeProblem({
      attributeKey,
      attribute,
      fieldId,
      field,
    });
    if (problem !== undefined) {
      problems.push(problem);
    }
    fieldsByAttributeKey[attributeKey] =
      problem === undefined ? field : undefined;
  });
  return problems.length > 0
    ? { kind: "broken", problems }
    : { kind: "bound", fieldsByAttributeKey };
}
