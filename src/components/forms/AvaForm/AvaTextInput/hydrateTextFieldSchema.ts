import { isEmail } from "@mantine/form";
import { match } from "ts-pattern";
import { getFieldLabel } from "@/components/forms/AvaForm/getFieldLabel";
import type {
  GenericFormSchemaRecord,
  TextFieldSchema,
  ValuesOfFieldRecord,
} from "@/components/forms/AvaForm/AvaForm.types";
import type { useLingui } from "@lingui/react/macro";

/**
 * Fill in the text field schema with default values based on its semantic type
 * and other properties.
 *
 * @param fieldSchema - The field schema to hydrate.
 * @param t - Lingui translator from `useLingui` used for default user-visible
 *   strings (placeholder, validation messages).
 * @returns The hydrated field schema.
 */
export function hydrateTextFieldSchema<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, string>,
>(
  fieldSchema: TextFieldSchema<FieldKey, FormValues>,
  t: ReturnType<typeof useLingui>["t"],
): TextFieldSchema<FieldKey, FormValues> {
  const processedSchema =
    fieldSchema.semanticType ?
      match(fieldSchema.semanticType)
        .with("email", () => {
          return {
            autoComplete: "email",
            placeholder: t`Enter email`,
            validateFn: isEmail(t`Invalid email address`),
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
