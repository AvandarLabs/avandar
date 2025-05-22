import { Text } from "@mantine/core";
import dayjs from "dayjs";
import { isDate } from "@/lib/utils/guards";
import type { PrimitiveValue, PrimitiveValueRenderOptions } from "./types";

type Props<T extends PrimitiveValue> = {
  value: T;
} & PrimitiveValueRenderOptions;

/**
 * Render a primitive value. Primitive values are not recursive.
 */
export function PrimitiveValueItem<T extends PrimitiveValue>({
  value,
  emptyString = "Empty text",
  booleanTrue = "Yes",
  booleanFalse = "No",
  nullString = "No value",
  undefinedString = "No value",
  dateFormat,
}: Props<T>): JSX.Element {
  if (value === null) {
    return <Text fs="italic">{nullString}</Text>;
  }

  if (value === undefined) {
    return <Text fs="italic">{undefinedString}</Text>;
  }

  if (value === "") {
    return <Text fs="italic">{emptyString}</Text>;
  }

  if (typeof value === "string") {
    return <Text>{value}</Text>;
  }

  if (typeof value === "number") {
    return <Text>{Intl.NumberFormat().format(value)}</Text>;
  }

  if (typeof value === "boolean") {
    return <Text>{value ? booleanTrue : booleanFalse}</Text>;
  }

  if (isDate(value)) {
    // TODO(jpsyx): add options to format the date
    return (
      <Text>
        {dateFormat ?
          dayjs(value).format(dateFormat)
        : value.toLocaleDateString()}
      </Text>
    );
  }

  // fallback, just cast to string
  return <Text>{String(value)}</Text>;
}
