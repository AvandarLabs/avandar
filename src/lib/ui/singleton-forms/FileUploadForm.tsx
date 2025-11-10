import { Box, Button, FileInput, FileInputProps, Group } from "@mantine/core";
import { useRef, useState } from "react";
import { useForm } from "@/lib/hooks/ui/useForm";
import { MIMEType } from "@/lib/types/common";

type Props = {
  /**
   * Whether the file input should be clearable
   */
  clearable?: boolean;

  /**
   * MIME type to accept. Example: "text/csv"
   */
  accept: MIMEType;

  /**
   * Callback fired when a file is submitted
   */
  onSubmit: (file: File | undefined) => void;

  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;

  /**
   * Label for the submit button
   */
  submitButtonLabel?: string;

  /**
   * Whether the form that wraps this file input should have
   * `width: 100%` applied to it
   */
  fullWidth?: boolean;
} & Omit<FileInputProps, "clearable" | "accept" | "onSubmit">;

type FileUploadForm = {
  file: File | null;
};

/**
 * A file upload field wrapped in a form with validation and a button
 * to submit the file. This is useful for situations where you only
 * need a single file upload field.
 *
 * If you're using multiple file upload fields, use Mantine's `useForm` hook
 * instead of multiple FileUploadField components.
 */
export function FileUploadForm({
  clearable = true,
  accept,
  onSubmit,
  isSubmitting = false,
  submitButtonLabel = "Upload",
  fullWidth,
  ...fileInputProps
}: Props): JSX.Element {
  const form = useForm<FileUploadForm>({
    initialValues: {
      file: null,
    },
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  form.useFieldWatch("file", () => {
    // when the file changes, reset the submitted state
    setIsSubmitted(false);
    // we request an animation frame because the button cannot receive focus
    // while it is disabled, so we need to wait for the browser to first
    // remove the button's disabled state before we can call `focus()`
    requestAnimationFrame(() => {
      submitBtnRef.current?.focus();
    });
  });
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        onSubmit(values.file ?? undefined);
        setIsSubmitted(true);
      })}
      style={{ width: fullWidth ? "100%" : undefined }}
    >
      <Group mt="md">
        <FileInput
          style={{ flex: 1 }}
          key={form.key("file")}
          {...form.getInputProps("file")}
          clearable={clearable}
          accept={accept}
          {...fileInputProps}
        />
        <Box style={{ alignSelf: "flex-end" }}>
          <Button
            ref={submitBtnRef}
            type="submit"
            loading={isSubmitting}
            disabled={form.getValues().file === null || isSubmitted}
          >
            {submitButtonLabel}
          </Button>
        </Box>
      </Group>
    </form>
  );
}
