import { Button, Group, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { useMemo, useRef } from "react";
import type { TextareaProps } from "@mantine/core";

type Props = {
  defaultValue: string;
  required?: boolean;
  minLength?: number;
  inputWidth?: number | string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;

  /**
   * Label to display above the Textarea (unless `hideLabel` is true). This
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
} & Omit<
  TextareaProps,
  "defaultValue" | "required" | "minLength" | "label" | "onSubmit"
>;

type SingleInputForm = {
  value: string;
};

/**
 * A textarea field wrapped in a form with validation and a button
 * to submit the value. This is useful for situations where you only
 * need a single field input for multi-line text.
 *
 * The form can be submitted with cmd+enter (Mac) or ctrl+enter (Windows/Linux).
 *
 * If you're using multiple fields, use Mantine's `useForm` hook instead of
 * multiple XField components.
 */
export function TextareaForm({
  defaultValue,
  required = false,
  minLength,
  inputWidth,
  validateOnChange = false,
  validateOnBlur = false,
  label,
  hideLabel = false,
  isSubmitting = false,
  onSubmit,
  onCancel,
  showSubmitButton = true,
  showCancelButton = false,
  submitButtonLabel = "Submit",
  cancelButtonLabel = "Cancel",
  ...moreTextareaProps
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
        if (required && value.trim().length === 0) {
          // prevent a value that is only empty spaces
          return "This field cannot be empty";
        }

        if (minLength && value.length < minLength) {
          return `${hideLabel || !label ? "This field" : label} must be at least ${minLength} characters long`;
        }
        return null;
      },
    },
  });

  const formRef = useRef<HTMLFormElement>(null);

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }
    // Use modern User-Agent Client Hints API if available
    const userAgentData = (
      navigator as Navigator & {
        userAgentData?: { platform: string };
      }
    ).userAgentData;
    if (userAgentData?.platform) {
      return /Mac|iPhone|iPod|iPad/i.test(userAgentData.platform);
    }
    // Fallback to userAgent string (widely supported and reliable)
    return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
  }, []);

  const shortcutText = isMac ? "⌘↵" : "Ctrl↵";

  return (
    <form
      ref={formRef}
      onSubmit={form.onSubmit(({ value }) => {
        onSubmit?.(value);
      })}
    >
      <Group gap="xs" align="start" wrap="wrap">
        <Textarea
          key={form.key("value")}
          {...form.getInputProps("value")}
          required={required}
          label={hideLabel ? undefined : label}
          style={{ width: inputWidth }}
          onKeyDown={getHotkeyHandler([
            [
              "mod+Enter",
              (event) => {
                event.preventDefault();
                formRef.current?.requestSubmit();
              },
            ],
          ])}
          {...moreTextareaProps}
        />
        {showSubmitButton ?
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || (validateOnChange && !form.isValid())}
          >
            {submitButtonLabel}
            <Text ml="xxs" span size="xs" c="white">
              {shortcutText}
            </Text>
          </Button>
        : null}
        {showCancelButton ?
          <Button variant="default" onClick={onCancel}>
            {cancelButtonLabel}
          </Button>
        : null}
      </Group>
    </form>
  );
}
