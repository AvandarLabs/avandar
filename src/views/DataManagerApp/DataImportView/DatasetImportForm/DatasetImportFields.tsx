import type { DatasetImportFormValues } from "./DatasetImportForm.types";
import type { UseFormReturnType } from "@mantine/form";
import type { ReactNode, RefObject } from "react";

import { TextInput } from "@mantine/core";

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
    <>
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
    </>
  );
}
