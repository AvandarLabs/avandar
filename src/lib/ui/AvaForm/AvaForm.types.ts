import { ExclusifyUnion, UnknownRecord } from "type-fest";
import { FormType } from "@/lib/hooks/ui/useForm";
import { SelectData, SelectOption } from "../inputs/Select";
import type { StringKeyOf } from "$/lib/types/utilityTypes";
import type { HTMLInputAutoCompleteAttribute, ReactNode } from "react";

/** For now, forms can only have string values */
export type ValidBaseValueType = string | null;

export type AnyFormValues = Record<string, ValidBaseValueType>;

export type SemanticTextType = "email" | "text";

export type AnyValidationFn = FieldValidationFn<string, ValidBaseValueType>;

export type FieldValidationFn<
  FieldKey extends string,
  FieldValue extends ValidBaseValueType,
> = <FormValues extends AnyFormValues & Record<FieldKey, FieldValue>>(
  value: FieldValue,
  allFormValues: FormValues,
  fieldKey: FieldKey,
) => ReactNode;

/**
 * Convert a record of field schemas to a record mapping the field keys to their
 * value types.
 */
export type ValuesOfFieldRecord<FieldSchemaRecord extends UnknownRecord> = {
  [FieldKey in StringKeyOf<FieldSchemaRecord>]: "initialValue" extends (
    keyof FieldSchemaRecord[FieldKey]
  ) ?
    FieldSchemaRecord[FieldKey]["initialValue"]
  : never;
};

export type GenericFormSchemaRecord<
  FormValues extends AnyFormValues = AnyFormValues,
> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in Extract<keyof FormValues, string>]: any;
};

export type BaseFormFieldSchema<
  FieldKey extends string,
  FieldValue extends ValidBaseValueType,
> = {
  /** The key of the field. */
  key: FieldKey;

  /** The description of the field. */
  description?: ReactNode;

  /** Whether the field is required. */
  required?: boolean;

  /**
   * The name of the field. This is used for the `name` attribute of the input.
   */
  name?: string;

  /** The label of the field. */
  label?: string;

  /** Whether the field is disabled. */
  disabled?: boolean;

  /**
   * A function to validate the field value.
   * This returns a ReactNode that will displayed as an error message to the
   * user.
   * Returning `undefined` means the field is valid.
   *
   * @param value - The current value of the field.
   * @param allFormValues - The current values of all fields in the form.
   * @param fieldKey - The key of the current field.
   */
  validateFn?: FieldValidationFn<FieldKey, FieldValue>;
};

export type TextFieldSchema<
  FieldKey extends string,
  FormValues extends AnyFormValues & Record<FieldKey, string>,
> = BaseFormFieldSchema<FieldKey, string> & {
  /** The type of the field. */
  type: "text";

  /** The initial value of the field. */
  initialValue: string;

  /**
   * The semantic type of the field. This controls things like how the Input
   * might render or how it is validated.
   */
  semanticType?: SemanticTextType;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  placeholder?: string;

  /**
   * Whether to sync the value of this field to another field. This is useful
   * when you have two fields that are related (e.g. Name and Preferred Name),
   * so you want to keep them in sync.
   *
   * But once the user edits this field, the sync should stop.
   */
  syncWhileUntouched?: {
    /**
     * The field key to sync from. This must be a valid key from the full
     * `fields` record that is passed to the `BasicForm` component.
     */
    syncFrom: StringKeyOf<FormValues>;

    /**
     * If you don't want the sync to be an exact copy of the `syncFrom` field,
     * you can provide a transform function to modify the value.
     */
    transform?: (value: string) => string;
  };

  /**
   * The number of milliseconds to debounce the field. This is useful to prevent
   * excessive re-renders when the user is typing.
   */
  debounceMs?: number;

  /**
   * The function to call when the field value changes.
   */
  onChange?: (value: string) => void;
};

export type ValueOfSelectData<Data extends SelectData<string>> =
  Data extends SelectData<infer T extends string> ? T : never;

export type SelectFieldSchema<
  FieldKey extends string,
  Data extends SelectData<string>,
> = BaseFormFieldSchema<FieldKey, ValueOfSelectData<Data>> & {
  /** The type of the field. */
  type: "select";

  /** The initial value of the field. */
  initialValue: ValueOfSelectData<Data> | null;

  /** The data for the select field. */
  data: Data;

  /**
   * The function to call when the field value changes.
   */
  onChange?: (
    value: ValueOfSelectData<Data> | null,
    option: SelectOption<ValueOfSelectData<Data>>,
  ) => void;
};

/**
 * A schema for a form field.
 *
 * The `FormFieldKey` generic represents any valid key in the entire form.
 */
export type FormFieldSchema<
  FieldKey extends string,
  FormValues extends AnyFormValues & Record<FieldKey, ValidBaseValueType>,
> = ExclusifyUnion<
  | TextFieldSchema<FieldKey, FormValues & Record<FieldKey, string>>
  | SelectFieldSchema<FieldKey, SelectData<string>>
>;

export type AvaFormRef<FormValues extends AnyFormValues> = {
  getForm: () => FormType<FormValues>;
  getFormValues: () => FormValues;
  getFormNode: () => HTMLFormElement | null;
};
