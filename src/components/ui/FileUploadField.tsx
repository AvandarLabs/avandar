import { Button, FileInput, Group } from "@mantine/core";
import { useForm } from "@mantine/form";
import { MIMEType } from "@/types/common";

type Props = {
  /**
   * Whether the file input should be clearable
   */
  clearable?: boolean;

  /**
   * Label to display above the file input
   */
  label?: string;

  /**
   * Description to display below the file input
   */
  description?: string;

  /**
   * Placeholder text to display when no file is selected
   */
  placeholder?: string;

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
};

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
  label,
  description,
  placeholder,
  accept,
  onSubmit,
  isSubmitting = false,
  submitButtonLabel = "Upload",
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
    >
      <FileInput
        key={form.key("file")}
        {...form.getInputProps("file")}
        clearable={clearable}
        label={label}
        description={description}
        placeholder={placeholder}
        accept={accept}
      />
      <Group justify="flex-end" mt="md">
        <Button type="submit" loading={isSubmitting}>
          {submitButtonLabel}
        </Button>
      </Group>
    </form>
  );
}
