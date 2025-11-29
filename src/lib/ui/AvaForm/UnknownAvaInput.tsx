import { match } from "ts-pattern";
import { FormType } from "@/lib/hooks/ui/useForm";
import { SelectData } from "../inputs/Select";
import {
  FormFieldSchema,
  GenericFormSchemaRecord,
  ValidBaseValueType,
  ValuesOfFieldRecord,
} from "./AvaForm.types";
import { AvaSelectInput } from "./AvaSelectInput";
import { AvaTextInput } from "./AvaTextInput";

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
      const { syncWhileUntouched, initialValue, ...textInputProps } =
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
      const { data, ...selectInputProps } = fieldSchema;
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
