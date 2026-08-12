/**
 * The translatable strings rendered by `@avandar/ui` components.
 *
 * This package deliberately does not depend on an i18n framework. An i18n
 * framework is an app-level singleton (locale detection, catalog loading,
 * plural rules), so depending on one would force every consumer onto the same
 * framework. Instead the host application supplies already-translated strings
 * through `I18nAvaUiProvider`, exactly as MUI (`localeText`), Ant Design
 * (`ConfigProvider locale`), and AG Grid (`localeText`) do.
 *
 * Interpolated strings are functions rather than templates on purpose:
 * languages order their words differently, so the translator has to control
 * where each value lands. A template string would hard-code English order.
 */
export type I18nMessages = {
  cancel: string;
  confirm: string;
  confirmActionMessage: string;
  confirmActionTitle: string;
  edit: string;
  empty: string;
  emptyText: string;
  fieldCannotBeEmpty: string;
  invalidDate: string;
  invalidEmail: string;
  no: string;
  noValue: string;
  noValues: string;
  save: string;
  submit: string;
  thisField: string;
  upload: string;
  yes: string;

  /** e.g. "... and 3 more" */
  andMore: (remainingCount: number) => string;
  /** e.g. "Collection 2" */
  collectionLabel: (collectionNumber: number) => string;
  /** e.g. "Edit workspace name" */
  editNamed: (name: string) => string;
  /** e.g. "Email must be at least 8 characters long" */
  fieldMinLength: (params: { fieldName: string; minLength: number }) => string;
  /** e.g. "Cmd+Enter to save" */
  saveWithShortcut: (keyboardShortcut: string) => string;
};

/**
 * English defaults, so the package works with no configuration at all.
 * Supplying `i18nMessages` to `I18nAvaUiProvider` is entirely opt-in.
 */
export const defaultI18nMessages: I18nMessages = {
  cancel: "Cancel",
  confirm: "Confirm",
  confirmActionMessage:
    "Are you sure you want to proceed with this action? This cannot be undone.",
  confirmActionTitle: "Confirm Action",
  edit: "Edit",
  empty: "Empty",
  emptyText: "Empty text",
  fieldCannotBeEmpty: "This field cannot be empty",
  invalidDate: "Invalid date",
  invalidEmail: "Invalid email address",
  no: "No",
  noValue: "No value",
  noValues: "There are no values",
  save: "Save",
  submit: "Submit",
  thisField: "This field",
  upload: "Upload",
  yes: "Yes",

  andMore: (remainingCount) => {
    return `... and ${remainingCount} more`;
  },
  collectionLabel: (collectionNumber) => {
    return `Collection ${collectionNumber}`;
  },
  editNamed: (name) => {
    return `Edit ${name}`;
  },
  fieldMinLength: ({ fieldName, minLength }) => {
    return `${fieldName} must be at least ${minLength} characters long`;
  },
  saveWithShortcut: (keyboardShortcut) => {
    return `${keyboardShortcut} to save`;
  },
};
