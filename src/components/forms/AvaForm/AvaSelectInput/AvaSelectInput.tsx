import type {
  GenericFormSchemaRecord,
  ValuesOfFieldRecord,
} from "@/components/forms/AvaForm/AvaForm.types";
import type { SelectOption, SelectProps } from "@avandar/ui";
import type { FormType } from "@avandar/ui/hooks";
import type { ObjectPaths } from "@avandar/utils";

import { Select } from "@avandar/ui";

type Props<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, string>,
> = {
  fieldKey: FieldKey;

  /** The form instance, returned by `useForm` */
  form: FormType<FormValues>;

  /** The record of all field schemas */
  fields: FieldSchemaRecord;
  onChange?: (
    value: FormValues[FieldKey] | null,
    option: SelectOption<FormValues[FieldKey]>,
  ) => void;
} & Omit<SelectProps<FormValues[FieldKey]>, "onChange" | "form">;

export function AvaSelectInput<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, string>,
>({
  fieldKey,
  data,
  form,
  onChange,
  ...props
}: Props<FieldKey, FieldSchemaRecord, FormValues>): JSX.Element {
  const formInputProps = form.getInputProps(
    fieldKey as unknown as ObjectPaths<FormValues>,
  );

  const onValueChange = (
    value: FormValues[FieldKey] | null,
    option: SelectOption<FormValues[FieldKey]>,
  ) => {
    if (onChange) {
      onChange(value, option);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setFieldValue(fieldKey as any, value as FormValues[FieldKey]);
  };

  return (
    <Select
      key={form.key(fieldKey as unknown as ObjectPaths<FormValues>)}
      {...formInputProps}
      {...props}
      data={data}
      onChange={onValueChange}
    />
  );
}
