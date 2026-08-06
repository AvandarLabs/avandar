import { t } from "@lingui/core/macro";
import { isEmail } from "@mantine/form";
import { match } from "ts-pattern";
import { getFieldLabel } from "@/components/forms/AvaForm/getFieldLabel";
import type {
  GenericFormSchemaRecord,
  TextFieldSchema,
  ValuesOfFieldRecord,
} from "@/components/forms/AvaForm/AvaForm.types";

/**
 * Fill in the text field schema with default values based on its semantic type
 * and other properties.
 *
 * Uses the global `t` macro from `@lingui/core/macro` rather than accepting
 * `t` as a parameter: the Lingui macro only transforms tagged-template `t`
 * calls when `t` is bound to a macro import in the same file, so a `t`
 * parameter would silently return empty strings at runtime.
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
