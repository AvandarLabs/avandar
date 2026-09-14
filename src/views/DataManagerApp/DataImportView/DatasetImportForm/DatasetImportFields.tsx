import { SimpleGrid, TextInput } from "@mantine/core";
import type { DatasetImportFormValues } from "./DatasetImportForm.types";
import type { UseFormReturnType } from "@mantine/form";
import type { ReactNode, RefObject } from "react";

export type DatasetImportFieldsProps = {
  descriptionInputRef: RefObject<HTMLInputElement | null>;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  form: UseFormReturnType<DatasetImportFormValues>;
  nameInputRef: RefObject<HTMLInputElement | null>;
  nameLabel: string;
  namePlaceholder: string;
};

/**
 * The two text fields the user fills in. Both refs are held by the validation
 * hook, which focuses whichever field a failed submit names first.
 *
 * They sit side by side rather than stacked: two short single-line fields
 * stacked full-width across a wide view leave the eye travelling further
 * than the content justifies.
 */
export function DatasetImportFields({
  descriptionInputRef,
  descriptionLabel,
  descriptionPlaceholder,
  form,
  nameInputRef,
  nameLabel,
  namePlaceholder,
}: Readonly<DatasetImportFieldsProps>): ReactNode {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" maw={880}>
      <TextInput
        ref={nameInputRef}
        key={form.key("name")}
        label={nameLabel}
        placeholder={namePlaceholder}
        required
        {...form.getInputProps("name")}
      />
      <TextInput
        ref={descriptionInputRef}
        key={form.key("description")}
        label={descriptionLabel}
        placeholder={descriptionPlaceholder}
        {...form.getInputProps("description")}
      />
    </SimpleGrid>
  );
}
