import { TextInput, TextInputProps } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { ChangeEvent } from "react";
import { Paths } from "type-fest";
import { FormType } from "@/lib/hooks/ui/useForm";
import { UnknownObject } from "@/lib/types/common";
import { StringKeyOf } from "@/lib/types/utilityTypes";
import { isDefined } from "@/lib/utils/guards/guards";
import { PathValue } from "@/lib/utils/objects/getValue";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { objectKeys } from "@/lib/utils/objects/misc";
import { GenericFormSchemaRecord } from "../AvaForm.types";

type SyncedField<FieldSchemaRecord extends GenericFormSchemaRecord> = {
  fieldKey: StringKeyOf<FieldSchemaRecord>;
  transform: ((value: string) => string) | undefined;
  isDebounced: boolean;
  debounceMs: number;
  onChange?: ((value: string) => void) | undefined;
};

type Props<
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends UnknownObject,
  FieldKey extends StringKeyOf<FormValues>,
> = {
  fieldKey: FieldKey;
  parentForm: FormType<FormValues>;
  fields: FieldSchemaRecord;
  debounceMs?: number;
  onChange?: (value: string) => void;
} & Omit<TextInputProps, "onChange">;

export function AvaTextInput<
  FieldSchemaRecord extends GenericFormSchemaRecord,
  FormValues extends UnknownObject,
  FieldKey extends StringKeyOf<FormValues>,
>({
  fieldKey: uncastedFieldKey,
  parentForm,
  debounceMs,
  fields,
  onChange,
  ...props
}: Props<FieldSchemaRecord, FormValues, FieldKey>): JSX.Element {
  const fieldKey = uncastedFieldKey as Paths<FormValues>;
  const inputProps = parentForm.getInputProps(fieldKey);
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
    debounced: useDebouncedCallback((value: string) => {
      if (onChange) {
        onChange(value);
      }
      parentForm.setFieldValue(
        fieldKey as Paths<FormValues>,
        value as PathValue<FormValues, Paths<FormValues>>,
      );
    }, debounceMs ?? 0),
    immediate: (event: ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(event.target.value);
      }
      // when not debounced, we call the original onChange prop instead of
      // the form's `setFieldValue` function
      inputProps.onChange(event);
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
      key={parentForm.key(fieldKey as Paths<FormValues>)}
      {...inputProps}
      {...props}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;

        // update the synced values
        fieldsToSyncTo.forEach((syncedField) => {
          if (!parentForm.isTouched(syncedField.fieldKey)) {
            const newSyncedValue =
              syncedField.transform ?
                syncedField.transform(newValue)
              : newValue;
            parentForm.setFieldValue(
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
