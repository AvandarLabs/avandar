import { match } from "ts-pattern";
import { AvaSelectInput } from "@/lib/ui/AvaForm/AvaSelectInput/AvaSelectInput";
import { AvaTextInput } from "@/lib/ui/AvaForm/AvaTextInput/AvaTextInput";
import type { FormType } from "@/lib/hooks/ui/useForm/useForm";
import type {
  FormFieldSchema,
  GenericFormSchemaRecord,
  ValidBaseValueType,
  ValuesOfFieldRecord,
} from "@/lib/ui/AvaForm/AvaForm.types";
import type { SelectData } from "@ui/inputs/Select/Select";

type Props<
  FieldKey extends string,
  FieldValue extends ValidBaseValueType,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, FieldValue>,
> = {
  fieldKey: FieldKey;

  /** The field schema representing this input */
  field: FormFieldSchema<FieldKey, FormValues>;

  /** The form instance, returned by `useForm` */
  parentForm: FormType<FormValues>;

  /** The record of all field schemas */
  fields: FieldSchemaRecord;
};

export function UnknownAvaInput<
  FieldKey extends string,
  FieldValue extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, FieldValue>,
>({
  fieldKey,
  fields,
  field,
  parentForm,
}: Props<
  FieldKey,
  FieldValue,
  FieldSchemaRecord,
  FormValues
>): JSX.Element | null {
  return match(field)
    .with({ type: "text" }, (fieldSchema) => {
      const { key, syncWhileUntouched, initialValue, ...textInputProps } =
        fieldSchema;
      return (
        <AvaTextInput
          fieldKey={fieldKey}
          fields={fields}
          form={parentForm}
          {...textInputProps}
        />
      );
    })
    .with({ type: "select" }, (fieldSchema) => {
      const { key, data, ...selectInputProps } = fieldSchema;
      return (
        <AvaSelectInput
          fieldKey={fieldKey}
          fields={fields}
          form={parentForm}
          data={data as SelectData<FormValues[FieldKey]>}
          {...selectInputProps}
        />
      );
    })
    .exhaustive(() => {
      return null;
    });
}
