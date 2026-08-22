import type {
  BaseFormFieldSchema,
  ValidBaseValueType,
} from "@/components/forms/AvaForm/AvaForm.types";

import { camelToTitleCase } from "@avandar/utils";

export function getFieldLabel<
  FieldKey extends string,
  FieldValue extends ValidBaseValueType,
>(fieldSchema: BaseFormFieldSchema<FieldKey, FieldValue>): string {
  return (
    fieldSchema.label ??
    camelToTitleCase(String(fieldSchema.key), { capitalizeFirstLetter: true })
  );
}
