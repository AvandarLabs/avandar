import { Text } from "@mantine/core";
import {
  formatDate,
  FormattableTimezone,
} from "@utils/dates/formatDate/formatDate";
import { isDate } from "@utils/guards/isDate/isDate";
import { isISODateString } from "@utils/guards/isISODateString/isISODateString";
import { isNullish } from "@utils/guards/isNullish/isNullish";
import { isValidDateValue } from "@utils/guards/isValidDateValue/isValidDateValue";
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

  return <div>Hello DateValueItem</div>;
}
