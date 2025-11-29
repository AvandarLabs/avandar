import { camelToTitleCase } from "@/lib/utils/strings/transformations";
import type { BaseFormFieldSchema, ValidBaseValueType } from "./AvaForm.types";

export function getFieldLabel<
  FieldKey extends string,
  FieldValue extends ValidBaseValueType,
>(fieldSchema: BaseFormFieldSchema<FieldKey, FieldValue>): string {
  return (
    fieldSchema.label ??
    camelToTitleCase(String(fieldSchema.key), { capitalizeFirstLetter: true })
  );
}
