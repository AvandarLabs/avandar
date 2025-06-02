import { Text } from "@mantine/core";
import dayjs from "dayjs";
import { isDate } from "@/lib/utils/guards";
import { isStringOrNumber } from "./guards";
import type { PrimitiveValue, PrimitiveValueRenderOptions } from "./types";

type Props<T extends PrimitiveValue> = {
  value: T;
} & PrimitiveValueRenderOptions;

/**
 * Render a primitive value. Primitive values are not recursive.
 */
export function PrimitiveValueItem<T extends PrimitiveValue>({
  value,
  renderEmptyString = "Empty text",
  renderBooleanTrue = "Yes",
  renderBooleanFalse = "No",
  renderNullString = "No value",
  renderUndefinedString = "No value",
  dateFormat,
}: Props<T>): JSX.Element {
  if (value === null) {
    if (isStringOrNumber(renderNullString)) {
      return (
        <Text span fs="italic">
          {renderNullString}
        </Text>
      );
    } else {
      return <>{renderNullString}</>;
    }
  }

  if (value === undefined) {
    if (isStringOrNumber(renderUndefinedString)) {
      return (
        <Text span fs="italic">
          {renderUndefinedString}
        </Text>
      );
    } else {
      return <>{renderUndefinedString}</>;
    }
  }

  if (value === "") {
    if (isStringOrNumber(renderEmptyString)) {
      return (
        <Text span fs="italic">
          {renderEmptyString}
        </Text>
      );
    } else {
      return <>{renderEmptyString}</>;
    }
  }

  if (typeof value === "string") {
    return <Text span>{value}</Text>;
  }

  if (typeof value === "number") {
    return <Text span>{Intl.NumberFormat().format(value)}</Text>;
  }

  if (typeof value === "boolean") {
    if (isStringOrNumber(renderBooleanTrue)) {
      return <Text span>{value ? renderBooleanTrue : renderBooleanFalse}</Text>;
    } else {
      return <>{value ? renderBooleanTrue : renderBooleanFalse}</>;
    }
  }

  if (isDate(value)) {
    // TODO(jpsyx): add options to format the date
    return (
      <Text span>
        {dateFormat ?
          dayjs(value).format(dateFormat)
        : value.toLocaleDateString()}
      </Text>
    );
  }

  // fallback, just cast to string
  return <Text>{String(value)}</Text>;
}
