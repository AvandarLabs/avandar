import type { TextareaProps, TextInputProps, TextProps } from "@mantine/core";

type BaseProps = {
  /** The current text value. This makes the component controlled. */
  value: string;

  /** Called whenever the text changes in edit mode. */
  onChange: (value: string) => void;

  /** Called when the user clicks save. */
  onSave: (value: string) => void;

  /** Called when the user cancels editing. */
  onCancel?: () => void;
  isSaving?: boolean;
  disabled?: boolean;

  /**
   * The name of the item to edit. The name will be used in the tooltip label
   * as "Edit ${name}".
   */
  name?: string;

  /** Display text to show when `value` is empty */
  emptyDisplayText?: string;
  isSaveDisabled?: boolean;
  displayTextProps?: TextProps;
};

type TextInputVariantProps = BaseProps & {
  /**
   * Whether or not to render the component as a textarea.
   * @default false
   */
  textarea?: false;
};

type TextareaVariantProps = BaseProps & {
  /**
   * Whether or not to render the component as a textarea.
   * @default false
   */
  textarea: true;

  /** Min rows for the editable text area */
  minRows?: number;

  /** Max rows for the editable text area */
  maxRows?: number;
};

export type EditableDisplayTextProps =
  | (TextInputVariantProps &
      Omit<TextInputProps, "value" | "onChange" | "onSubmit">)
  | (TextareaVariantProps &
      Omit<
        TextareaProps,
        "value" | "onChange" | "onSubmit" | "minRows" | "maxRows"
      >);

/** Input-specific options shared with the inline editing surface. */
export type EditableDisplayTextInputProps =
  | Omit<
      TextInputVariantProps &
        Omit<TextInputProps, "value" | "onChange" | "onSubmit">,
      keyof BaseProps
    >
  | Omit<
      TextareaVariantProps &
        Omit<
          TextareaProps,
          "value" | "onChange" | "onSubmit" | "minRows" | "maxRows"
        >,
      keyof BaseProps
    >;
