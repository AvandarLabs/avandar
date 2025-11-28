import { ExclusifyUnion } from "type-fest";
import { SelectData } from "../inputs/Select";
import type { StringKeyOf } from "@/lib/types/utilityTypes";
import type { HTMLInputAutoCompleteAttribute, ReactNode } from "react";

/** For now, forms can only have string values */
export type ValidBaseValueType = string;

export type AnyFormValues = Record<string, ValidBaseValueType>;

export type SemanticTextType = "email" | "text";

export type AnyValidationFn = ValidationFn<
  string,
  ValidBaseValueType,
  AnyFormValues
>;

export type ValidationFn<
  FieldKey extends string,
  FieldValue,
  FormValues extends AnyFormValues,
> = (
  value: FieldValue,
  allFormValues: FormValues,
  fieldKey: FieldKey,
) => ReactNode;

/**
 * Convert a record of field schemas to a record mapping the field keys to their
 * value types.
 */
export type ValuesOfFieldRecord<
  FieldSchemaRecord extends GenericFormSchemaRecord,
> = {
  [FieldKey in StringKeyOf<FieldSchemaRecord>]: FieldSchemaRecord[FieldKey]["initialValue"];
};

export type GenericFormSchemaRecord<FieldKeys extends string = string> = {
  [K in FieldKeys]: FormFieldSchema<K, Record<FieldKeys, ValidBaseValueType>>;
};

export type BaseFormFieldSchema<
  FieldKey extends string,
  FormValues extends AnyFormValues,
> = {
  key: FieldKey;
  initialValue: FormValues[FieldKey];
  description?: ReactNode;
  required?: boolean;
  name?: string;
  label?: string;
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
  validateFn?: ValidationFn<FieldKey, FormValues[FieldKey], FormValues>;

  /**
   * The function to call when the field value changes.
   */
  onChange?: (value: FormValues[FieldKey]) => void;
};

export type TextFieldSchema<
  FieldKey extends string,
  FormValues extends AnyFormValues,
> = BaseFormFieldSchema<FieldKey, FormValues> & {
  /** The type of the field. */
  type: "text";

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
};

export type SelectFieldSchema<
  FieldKey extends string,
  FormValues extends AnyFormValues,
> = BaseFormFieldSchema<FieldKey, FormValues> & {
  type: "select";
  data: SelectData<FormValues[FieldKey]>;
};

/**
 * A schema for a form field.
 *
 * The `FormFieldKey` generic represents any valid key in the entire form.
 */
export type FormFieldSchema<
  FieldKey extends string,
  FormValues extends AnyFormValues,
> = ExclusifyUnion<
  | TextFieldSchema<FieldKey, FormValues>
  | SelectFieldSchema<FieldKey, FormValues>
>;
