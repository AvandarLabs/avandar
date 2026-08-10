import { Button, Group, Loader, TextInput } from "@mantine/core";
import { isEmail } from "@mantine/form";
import { useForm } from "@ui/hooks/useForm/useForm";
import { useI18nMessages } from "@ui/i18n/I18nAvaUiProvider";

type Props = {
  defaultValue: string;
  required?: boolean;
  minLength?: number;
  inputWidth?: number | string;
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
export function InputTextForm({
  defaultValue,
  required = false,
  minLength,
  inputWidth,
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
  submitButtonLabel,
  cancelButtonLabel,
}: Props): JSX.Element {
  const i18n = useI18nMessages();
  const resolvedSubmitLabel = submitButtonLabel ?? i18n.submit;
  const resolvedCancelLabel = cancelButtonLabel ?? i18n.cancel;
  const form = useForm<SingleInputForm>({
    mode: "uncontrolled",
    initialValues: {
      value: defaultValue,
    },

    validateInputOnBlur: validateOnBlur,
    validateInputOnChange: validateOnChange,
    validate: {
      value: (value) => {
        if (value.trim().length === 0) {
          // prevent a value that is only empty spaces
          return i18n.fieldCannotBeEmpty;
        }

        if (minLength && value.length < minLength) {
          const fieldName =
            hideLabel || label === undefined ? i18n.thisField : label;
          return i18n.fieldMinLength({ fieldName, minLength });
        }
        if (type === "email") {
          return isEmail(i18n.invalidEmail)(value);
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
      <Group gap="xs" align="start" wrap="wrap">
        <TextInput
          key={form.key("value")}
          {...form.getInputProps("value")}
          required={required}
          label={hideLabel ? undefined : label}
          placeholder={placeholder}
          style={{ width: inputWidth }}
        />
        {showSubmitButton ?
          <Button
            type="submit"
            disabled={isSubmitting || (validateOnChange && !form.isValid())}
          >
            {resolvedSubmitLabel}
            {isSubmitting ?
              <Loader />
            : null}
          </Button>
        : null}
        {showCancelButton ?
          <Button variant="default" onClick={onCancel}>
            {resolvedCancelLabel}
          </Button>
        : null}
      </Group>
    </form>
  );
}
