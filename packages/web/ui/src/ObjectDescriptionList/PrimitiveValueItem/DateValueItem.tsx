import {
  formatDate,
  FormattableTimezone,
  isDate,
  isISODateString,
  isNullish,
  isValidDateValue,
} from "@avandar/utils";
import { Text } from "@mantine/core";
import { ReactNode } from "react";

import { NullOrUndefinedValueItem } from "./NullOrUndefinedValueItem";

type Props = {
  /** The value to render. */
  value: string | number | Date | null | undefined;

  /** Whether to render the value in edit mode. */
  editMode?: boolean;

  /** Called when the value changes in edit mode. */
  onChange?: (value: Date) => void;

  /** What we display for null values. */
  renderNullString: NonNullable<ReactNode>;

  /** What we display for undefined values. */
  renderUndefinedString: NonNullable<ReactNode>;

  /**
   * The format to use for dates.
   */
  dateFormat: string;

  /**
   * The timezone to use for dates.
   */
  dateTimeZone: FormattableTimezone;
};

export function DateValueItem({
  value,
  editMode,
  renderNullString,
  renderUndefinedString,
  dateFormat,
  dateTimeZone,
}: Props): JSX.Element {
  if (editMode) {
    throw new Error("DateValueItem does not support edit mode yet");
  }

  if (isNullish(value)) {
    return (
      <NullOrUndefinedValueItem
        value={value}
        renderNullString={renderNullString}
        renderUndefinedString={renderUndefinedString}
      />
    );
  }

  if (isDate(value) || isISODateString(value) || isValidDateValue(value)) {
    return (
      <Text span>
        {formatDate(value, { format: dateFormat, zone: dateTimeZone })}
      </Text>
    );
  }

  // The value did not parse as a date. This is a developer-facing signal that
  // the wrong renderer was chosen for this field, not user copy, so it is
  // deliberately an untranslated literal rather than an `I18nMessages` key.
  return (
    <Text span c="red">
      Unsupported data type
    </Text>
  );
}
