import { Button, Group, Loader, TextInput } from "@mantine/core";
import { isEmail, useForm } from "@mantine/form";

type Props = {
  defaultValue: string;
  required?: boolean;
  minLength?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  placeholder?: string;

  /**
   * Type of input. If "email", the input will be validated as an email address.
   */
  type?: "email" | "text";

  /**
   * Label to display above the InputText (unless `hideLabel` is true). This
   * label is also used in the validation error message.
   */
  label?: string;
  hideLabel?: boolean;

  /**
   * Whether to show a submit button. If true, the `onSubmit` prop will be
   * called with the value when the form is submitted.
   */
  showSubmitButton?: boolean;

  /**
   * Whether to show a cancel button. If true, the `onCancel` prop will be
   * called when the cancel button is clicked.
   */
  showCancelButton?: boolean;

  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  submitButtonLabel?: string;
  cancelButtonLabel?: string;
  isSubmitting?: boolean;
};

type SingleInputForm = {
  value: string;
};

/**
 * A text input field wrapped in a form with validation and a button
 * to submit the value. This is useful for situations where you only
 * need a single field input.
 *
 * If you're using multiple fields, use Mantine's `useForm` hook instead of
 * multiple XField components.
 */
export function InputTextField({
  defaultValue,
  required = false,
  minLength,
  validateOnChange = false,
  validateOnBlur = false,
  label,
  hideLabel = false,
  type = "text",
  placeholder,
  isSubmitting = false,
  onSubmit,
  onCancel,
  showSubmitButton = true,
  showCancelButton = false,
  submitButtonLabel = "Submit",
  cancelButtonLabel = "Cancel",
}: Props): JSX.Element {
  const form = useForm<SingleInputForm>({
    mode: "uncontrolled",
    initialValues: {
      value: defaultValue,
    },

    validateInputOnBlur: validateOnBlur,
    validateInputOnChange: validateOnChange,
    validate: {
      value: (value) => {
        if (minLength && value.length < minLength) {
          return `${hideLabel ? "This field" : label} must be at least ${minLength} characters long`;
        }
        if (type === "email") {
          return isEmail("Invalid email address")(value);
        }
        return null;
      },
    },
  });

  return (
    <form
      onSubmit={form.onSubmit(({ value }) => {
        onSubmit?.(value);
      })}
    >
      <Group gap="xs">
        <TextInput
          key={form.key("value")}
          {...form.getInputProps("value")}
          required={required}
          label={hideLabel ? undefined : label}
          placeholder={placeholder}
        />
        {showSubmitButton ?
          <Button type="submit" disabled={isSubmitting}>
            {submitButtonLabel}
            {isSubmitting ?
              <Loader />
            : null}
          </Button>
        : null}
        {showCancelButton ?
          <Button variant="outline" onClick={onCancel}>
            {cancelButtonLabel}
          </Button>
        : null}
      </Group>
    </form>
  );
}
