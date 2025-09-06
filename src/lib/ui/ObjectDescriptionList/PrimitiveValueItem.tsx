import { Text } from "@mantine/core";
import { formatDate } from "@/lib/utils/formatters/formatDate";
import { isDate } from "@/lib/utils/guards";
import { isStringOrNumber } from "./guards";
import type {
  GenericRootData,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "./types";

type Props<T extends PrimitiveValue, RootData extends GenericRootData> = {
  value: T;
  rootData: RootData;
} & PrimitiveValueRenderOptions<T, RootData>;

/**
 * Render a primitive value. Primitive values are not recursive.
 */
export function PrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData,
>({
  value,
  rootData,
  renderValue = undefined,
  renderEmptyString = "Empty text",
  renderBooleanTrue = "Yes",
  renderBooleanFalse = "No",
  renderNullString = "No value",
  renderUndefinedString = "No value",
  dateFormat,
}: Props<T, RootData>): JSX.Element {
  if (renderValue !== undefined) {
    const customRenderedValue = renderValue(value, rootData);
    if (customRenderedValue !== undefined) {
      // only use the returned value if it's not `undefined`, which we use
      // to signal a no-op
      return <>{renderValue(value, rootData)}</>;
    }
  }

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
    return <Text span>{formatDate(value, dateFormat ?? "YYYY-MM-DD")}</Text>;
  }

  // fallback, just cast to string
  return <Text>{String(value)}</Text>;
}
