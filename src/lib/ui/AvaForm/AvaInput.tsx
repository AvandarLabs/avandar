import { match } from "ts-pattern";
import { FormType } from "@/lib/hooks/ui/useForm";
import {
  FormFieldSchema,
  GenericFormSchemaRecord,
  ValidBaseValueType,
  ValuesOfFieldRecord,
} from "./AvaForm.types";
import { AvaTextInput } from "./AvaTextInput";
import { hydrateTextFieldSchema } from "./AvaTextInput/hydrateTextFieldSchema";

type Props<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord>,
> = {
  fieldKey: FieldKey;

  /** The field schema representing this input */
  field: FormFieldSchema<FieldKey, FormValues>;

  /** The form instance, returned by `useForm` */
  parentForm: FormType<FormValues>;

  /** The record of all field schemas */
  fields: FieldSchemaRecord;
};

export function AvaInput<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, ValidBaseValueType>,
>({
  fieldKey,
  fields,
  field,
  parentForm,
}: Props<FieldKey, FieldSchemaRecord, FormValues>): JSX.Element {
  return match(field)
    .with({ type: "text" }, (fieldSchema) => {
      const { syncWhileUntouched, initialValue, ...textInputProps } =
        hydrateTextFieldSchema(fieldSchema);
      return (
        <AvaTextInput
          fieldKey={fieldKey}
          fields={fields}
          parentForm={parentForm}
          {...textInputProps}
        />
      );
    })
    .with({ type: "select" }, () => {
      return <div>Not implemented</div>;
    })
    .exhaustive(() => {
      return <div>omg</div>;
    });
}
