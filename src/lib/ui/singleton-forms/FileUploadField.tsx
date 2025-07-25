import { Button, FileInput, FileInputProps, Group } from "@mantine/core";
import { useForm } from "@mantine/form";
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
export function FileUploadField({
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

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        onSubmit(values.file ?? undefined);
      })}
      style={{ width: fullWidth ? "100%" : undefined }}
    >
      <FileInput
        key={form.key("file")}
        {...form.getInputProps("file")}
        clearable={clearable}
        accept={accept}
        {...fileInputProps}
      />
      <Group justify="flex-end" mt="md">
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={form.getValues().file === null}
        >
          {submitButtonLabel}
        </Button>
      </Group>
    </form>
  );
}
