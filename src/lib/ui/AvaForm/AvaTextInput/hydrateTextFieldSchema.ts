import { isEmail } from "@mantine/form";
import { match } from "ts-pattern";
import { getFieldLabel } from "../getFieldLabel";
import type {
  GenericFormSchemaRecord,
  TextFieldSchema,
  ValuesOfFieldRecord,
} from "../AvaForm.types";

/**
 * Fill in the text field schema with default values based on its semantic type
 * and other properties.
 *
 * @param fieldSchema - The field schema to hydrate.
 * @returns The hydrated field schema.
 */
export function hydrateTextFieldSchema<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, string>,
>(
  fieldSchema: TextFieldSchema<FieldKey, FormValues>,
): TextFieldSchema<FieldKey, FormValues> {
  const processedSchema =
    fieldSchema.semanticType ?
      match(fieldSchema.semanticType)
        .with("email", () => {
          return {
            autoComplete: "email",
            placeholder: "Enter email",
            validateFn: isEmail("Invalid email address"),
            ...fieldSchema,
          };
        })
        .with("text", () => {
          return fieldSchema;
        })
        .exhaustive(() => {
          return fieldSchema;
        })
    : fieldSchema;
  return {
    ...processedSchema,
    label: getFieldLabel(processedSchema),
  };
}
