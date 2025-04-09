import { Text } from "@mantine/core";
import { isDate } from "@/lib/utils/guards";
import type {
  PrimitiveFieldValue,
  PrimitiveFieldValueRenderOptions,
} from "./types";

type Props<T extends PrimitiveFieldValue> = {
  value: T;
} & PrimitiveFieldValueRenderOptions;

/**
 * Render a primitive field value. Primitive values are not recursive.
 */
export function PrimitiveFieldValueItem<T extends PrimitiveFieldValue>({
  value,
  emptyString = "Empty text",
  booleanTrue = "Yes",
  booleanFalse = "No",
  nullOrUndefined = "No value",
}: Props<T>): JSX.Element {
  if (value === null || value === undefined) {
    return <Text fs="italic">{nullOrUndefined}</Text>;
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
    // TODO(pablo): add options to format the date
    return <Text>{value.toISOString()}</Text>;
  }

  // fallback, just cast to string
  return <Text>{String(value)}</Text>;
}
