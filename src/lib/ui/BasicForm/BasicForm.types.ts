import type { StringKeyOf } from "@/lib/types/utilityTypes";
import type { HTMLInputAutoCompleteAttribute, ReactNode } from "react";

export type SemanticTextType = "email" | "text";

export type ValidationFn = (
  value: string,
  fullFormValues: Record<string, string>,
) => ReactNode;

export type GenericFormSchemaRecord<FieldKey extends string = string> = {
  [key in FieldKey]: FormFieldSchema<GenericFormSchemaRecord<FieldKey>>;
};

/**
 * A schema for a form field.
 *
 * The `FormFieldKey` generic represents any valid key in the entire form.
 */
export type FormFieldSchema<
  FullFormSchemaRecord extends
    GenericFormSchemaRecord<string> = GenericFormSchemaRecord,
> = {
  /** The type of the field. */
  type: "text";
  initialValue: string;
  description?: ReactNode;

  /**
   * The semantic type of the field. This controls things like how the Input
   * might render or how it is validated.
   */
  semanticType?: SemanticTextType;
  required?: boolean;
  name?: string;
  label?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  disabled?: boolean;

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
    syncFrom: StringKeyOf<FullFormSchemaRecord>;

    /**
     * If you don't want the sync to be an exact copy of the `syncFrom` field,
     * you can provide a transform function to modify the value.
     */
    transform?: (value: string) => string;
  };
  validateFn?: ValidationFn;
};
