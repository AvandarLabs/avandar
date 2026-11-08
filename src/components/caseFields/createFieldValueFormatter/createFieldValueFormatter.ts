import { unknownToString } from "@avandar/utils";
import { match } from "ts-pattern";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

const MICROSECONDS_PER_MILLISECOND = 1000;

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeZone: "UTC",
};
const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
};
const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeStyle: "short",
  timeZone: "UTC",
};

/** Reads one value of a known type, or `undefined` if it is of another kind. */
type TypedValueFormatter = (value: unknown) => string | undefined;

/** Formats an epoch-millisecond number or date text, or gives `undefined`. */
function _formatDateValue(
  options: Readonly<{ value: unknown; format: Intl.DateTimeFormat }>,
): string | undefined {
  const { value, format } = options;
  if (typeof value !== "number" && typeof value !== "string") {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : format.format(date);
}

function _createTypedValueFormatter(
  options: Readonly<{ dataType: AvaDataType.T; locale: string }>,
): TypedValueFormatter {
  const { locale } = options;
  return match(options.dataType)
    .with("bigint", "double", (): TypedValueFormatter => {
      const numberFormat = new Intl.NumberFormat(locale);
      return (value) => {
        return typeof value === "number"
          ? numberFormat.format(value)
          : undefined;
      };
    })
    .with("date", "timestamp", (dataType): TypedValueFormatter => {
      const format = new Intl.DateTimeFormat(
        locale,
        dataType === "date" ? DATE_OPTIONS : TIMESTAMP_OPTIONS,
      );
      return (value) => {
        return _formatDateValue({ value, format });
      };
    })
    .with("time", (): TypedValueFormatter => {
      const timeFormat = new Intl.DateTimeFormat(locale, TIME_OPTIONS);
      return (value) => {
        return typeof value === "number"
          ? timeFormat.format(value / MICROSECONDS_PER_MILLISECOND)
          : undefined;
      };
    })
    .with("varchar", "boolean", (): TypedValueFormatter => {
      return () => {
        return undefined;
      };
    })
    .exhaustive();
}

/**
 * Builds a function that reads one value of a case type field as text, by
 * the field's `data_type`: numbers grouped for the locale, dates and
 * timestamps as a medium date (and time) in UTC, a time (microseconds since
 * midnight, as DuckDB returns it) as a short time. A missing value reads as
 * empty, and anything else as `unknownToString` reads it. Pure, so code
 * outside React can call it, for example to name a record by its label;
 * components use `useFieldValueFormatter`.
 */
export function createFieldValueFormatter(
  options: Readonly<{ dataType: AvaDataType.T; locale: string }>,
): (value: unknown) => string {
  const formatTypedValue = _createTypedValueFormatter(options);
  return (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    return formatTypedValue(value) ?? unknownToString(value);
  };
}
