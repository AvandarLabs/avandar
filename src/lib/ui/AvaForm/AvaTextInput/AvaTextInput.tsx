import { TextInput, TextInputProps } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { ChangeEvent } from "react";
import { Paths } from "type-fest";
import { FormType } from "@/lib/hooks/ui/useForm";
import { StringKeyOf } from "@/lib/types/utilityTypes";
import { isDefined } from "@/lib/utils/guards/guards";
import { PathValue } from "@/lib/utils/objects/getValue";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import type {
  GenericFormSchemaRecord,
  ValuesOfFieldRecord,
} from "../AvaForm.types";

type SyncedField<FieldSchemaRecord extends GenericFormSchemaRecord> = {
  fieldKey: StringKeyOf<FieldSchemaRecord>;
  transform: ((value: string) => string) | undefined;
  isDebounced: boolean;
  debounceMs: number;
  onChange?: ((value: string) => void) | undefined;
};

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
  debounceMs?: number;
  onChange?: (value: FormValues[FieldKey]) => void;
} & Omit<TextInputProps, "onChange" | "form">;

export function AvaTextInput<
  FieldKey extends string,
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends ValuesOfFieldRecord<FieldSchemaRecord> &
    Record<FieldKey, string>,
>({
  fieldKey: uncastedFieldKey,
  form,
  debounceMs,
  fields,
  onChange,
  ...props
}: Props<FieldKey, FieldSchemaRecord, FormValues>): JSX.Element {
  const fieldKey = uncastedFieldKey as Paths<FormValues>;
  const formInputProps = form.getInputProps(fieldKey);
  const fieldsToSyncTo = objectKeys(fields)
    .map((otherFieldKey) => {
      const otherField = fields[otherFieldKey]!;
      if (otherField.syncWhileUntouched?.syncFrom === fieldKey) {
        return {
          fieldKey: otherFieldKey,
          transform: otherField.syncWhileUntouched?.transform,
          isDebounced: otherField.debounceMs !== undefined,
          debounceMs: otherField.debounceMs ?? 0,
          onChange: otherField.onChange,
        };
      }
      return undefined;
    })
    .filter(isDefined);

  const onValueChange = {
    debounced: useDebouncedCallback((value: FormValues[FieldKey]) => {
      if (onChange) {
        onChange(value);
      }
      form.setFieldValue(
        fieldKey as Paths<FormValues>,
        value as PathValue<FormValues, Paths<FormValues>>,
      );
    }, debounceMs ?? 0),
    immediate: (event: ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(event.target.value as FormValues[FieldKey]);
      }
      // when not debounced, we call the original onChange prop instead of
      // the form's `setFieldValue` function
      formInputProps.onChange(event);
    },
  };

  const onSyncedValueChange = {
    debounced: useDebouncedCallback(
      (syncedValue: string, syncedField: SyncedField<FieldSchemaRecord>) => {
        if (syncedField.onChange) {
          syncedField.onChange(syncedValue);
        }
      },
      // use the longest debounce time of all the synced fields
      Math.max(...fieldsToSyncTo.map(prop("debounceMs"))),
    ),
    immediate: (
      syncedValue: string,
      syncedField: SyncedField<FieldSchemaRecord>,
    ) => {
      if (syncedField.onChange) {
        syncedField.onChange(syncedValue);
      }
    },
  };

  const isDebounced = debounceMs !== undefined;

  return (
    <TextInput
      key={form.key(fieldKey as Paths<FormValues>)}
      {...formInputProps}
      {...props}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value as FormValues[FieldKey];

        // update the synced values
        fieldsToSyncTo.forEach((syncedField) => {
          if (!form.isTouched(syncedField.fieldKey)) {
            const newSyncedValue =
              syncedField.transform ?
                syncedField.transform(newValue)
              : newValue;

            // set the synced value in the form
            form.setFieldValue(
              syncedField.fieldKey as Paths<FormValues>,
              newSyncedValue as PathValue<FormValues, Paths<FormValues>>,
            );
            if (syncedField.isDebounced) {
              onSyncedValueChange.debounced(newSyncedValue, syncedField);
            } else {
              onSyncedValueChange.immediate(newSyncedValue, syncedField);
            }
          }
        });

        if (isDebounced) {
          onValueChange.debounced(newValue);
        } else {
          onValueChange.immediate(event);
        }
      }}
    />
  );
}
