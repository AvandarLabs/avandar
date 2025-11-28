import { camelToTitleCase } from "@/lib/utils/strings/transformations";
import type {
  BaseFormFieldSchema,
  GenericFormSchemaRecord,
  ValuesOfFieldRecord,
} from "./AvaForm.types";

export function getFieldLabel<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord>,
>(fieldSchema: BaseFormFieldSchema<FieldKey, FormValues>): string {
  return (
    fieldSchema.label ??
    camelToTitleCase(String(fieldSchema.key), { capitalizeFirstLetter: true })
  );
}
