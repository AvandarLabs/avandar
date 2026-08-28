import { useLingui } from "@lingui/react/macro";
import { useForm } from "@mantine/form";
import { useRef, useState } from "react";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { notifyError } from "@/utils/notifications/notify";
import type { DatasetImportFormValues } from "./DatasetImportForm.types";
import type { FormErrors, UseFormReturnType } from "@mantine/form";
import type { RefObject } from "react";

const { maxDatasetNameLength, maxDatasetDescriptionLength } =
  GlobalAppConfig.dataManagerApp;

/** Fields in the order the summary lists them and focus moves through them. */
const VALIDATION_FIELD_ORDER = ["name", "description"] as const;

type ValidationField = (typeof VALIDATION_FIELD_ORDER)[number];

export type FormErrorSummaryItem = {
  field: ValidationField;
  line: string;
};

export type DatasetImportValidation = {
  descriptionInputRef: RefObject<HTMLInputElement | null>;
  form: UseFormReturnType<DatasetImportFormValues>;
  formErrorSummaryItems: FormErrorSummaryItem[];
  isFormErrorSummaryVisible: boolean;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onValidationFailure: (errors: Readonly<FormErrors>) => void;
};

type NotifyInvalidFieldOptions = {
  descriptionInputRef: RefObject<HTMLInputElement | null>;
  errors: Readonly<FormErrors>;
  fallbackMessage: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  title: string;
};

function useErrorMessageForField(): (
  options: Readonly<{ field: ValidationField; value: string }>,
) => string | undefined {
  const { t } = useLingui();
  return ({ field, value }) => {
    if (field === "name") {
      return value.length < maxDatasetNameLength
        ? undefined
        : t`Dataset name must be under ${maxDatasetNameLength} characters (current: ${value.length}).`;
    }

    return value.length < maxDatasetDescriptionLength
      ? undefined
      : t`Description must be under ${maxDatasetDescriptionLength} characters (current: ${value.length}).`;
  };
}

function _getFirstInvalidField(
  errors: Readonly<FormErrors>,
): ValidationField | undefined {
  return VALIDATION_FIELD_ORDER.find((field) => {
    return Boolean(errors[field]);
  });
}

function _getFormErrorSummaryItems(
  options: Readonly<{
    descriptionLabel: string;
    errors: Readonly<FormErrors>;
    nameLabel: string;
  }>,
): FormErrorSummaryItem[] {
  return VALIDATION_FIELD_ORDER.flatMap((field) => {
    const error = options.errors[field];
    if (!error) {
      return [];
    }
    const label =
      field === "name" ? options.nameLabel : options.descriptionLabel;
    return [{ field, line: `${label}: ${String(error)}` }];
  });
}

function _notifyAndFocusFirstInvalidField(
  options: Readonly<NotifyInvalidFieldOptions>,
): void {
  const field = _getFirstInvalidField(options.errors);
  if (!field) {
    return;
  }
  notifyError({
    title: options.title,
    message:
      typeof options.errors[field] === "string"
        ? options.errors[field]
        : options.fallbackMessage,
  });
  const node = (
    field === "name" ? options.nameInputRef : options.descriptionInputRef
  ).current;
  node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  node?.focus({ preventScroll: true });
}

/**
 * The dataset-import form plus the length rules on its two fields, and what a
 * failed submit does: raise the error summary, toast the first problem, and
 * move focus to the field it names.
 */
export function useDatasetImportValidation(
  initialDatasetName: string,
): DatasetImportValidation {
  const { t } = useLingui();
  const errorMessageForField = useErrorMessageForField();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [isFormErrorSummaryVisible, setIsFormErrorSummaryVisible] =
    useState(false);
  const form = useForm<DatasetImportFormValues>({
    initialValues: { name: initialDatasetName, description: "" },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        return errorMessageForField({ field: "name", value });
      },
      description: (value) => {
        return errorMessageForField({ field: "description", value });
      },
    },
  });
  const onValidationFailure = (errors: Readonly<FormErrors>): void => {
    setIsFormErrorSummaryVisible(true);
    _notifyAndFocusFirstInvalidField({
      descriptionInputRef,
      errors,
      fallbackMessage: t`Please fix the highlighted fields.`,
      nameInputRef,
      title: t`Can't save dataset`,
    });
  };
  return {
    descriptionInputRef,
    form,
    formErrorSummaryItems: _getFormErrorSummaryItems({
      descriptionLabel: t`Description`,
      errors: form.errors,
      nameLabel: t`Dataset name`,
    }),
    isFormErrorSummaryVisible,
    nameInputRef,
    onValidationFailure,
  };
}
