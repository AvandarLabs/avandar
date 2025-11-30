import { Text } from "@mantine/core";
import { formatDate } from "$/lib/utils/dates/formatDate";
import { isDate } from "$/lib/utils/guards/isDate";
import { isValidDateValue } from "$/lib/utils/guards/isValidDateValue";
import { formatNumber } from "@/lib/utils/formatters/formatNumber";
import { isStringOrNumber } from "./guards";
import type {
  GenericRootData,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "./ObjectDescriptionList.types";

type Props<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
> = {
  value: T;

  /**
   * Data that gets passed into the `renderValue` function, if provided.
   * This prop gets auto-filled when this component is used recursively
   * within an `ObjectDescriptionList` hierarchy.
   *
   * If `PrimitiveValueItem` is being used directly, outsiede of an
   * `ObjectDescriptionList` hierarchy, this prop does not need to be
   * passed in.
   */
  rootData?: RootData;
} & PrimitiveValueRenderOptions<T, RootData>;

/**
 * Render a primitive value. Primitive values are not recursive.
 */
export function PrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
>({
  value,
  asDate = false,
  rootData = undefined,
  renderValue = undefined,
  renderEmptyString = "Empty text",
  renderBooleanTrue = "Yes",
  renderBooleanFalse = "No",
  renderNullString = "No value",
  renderUndefinedString = "No value",
  dateFormat = "YYYY-MM-DDTHH:mm:ssZ",
  dateTimeZone = "local",
}: Props<T, RootData>): JSX.Element {
  if (renderValue !== undefined) {
    const customRenderedValue = renderValue(value, rootData as RootData);
    if (customRenderedValue !== undefined) {
      // only use the returned value if it's not `undefined`, which we use
      // to signal a no-op
      return <>{customRenderedValue}</>;
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

  if (typeof value === "boolean") {
    if (isStringOrNumber(renderBooleanTrue)) {
      return <Text span>{value ? renderBooleanTrue : renderBooleanFalse}</Text>;
    } else {
      return <>{value ? renderBooleanTrue : renderBooleanFalse}</>;
    }
  }

  if (typeof value === "string" && !asDate) {
    return <Text span>{value}</Text>;
  }

  if (typeof value === "number" && !asDate) {
    return (
      <Text span>
        {formatNumber(value, { locale: "en-US", useGrouping: true })}
      </Text>
    );
  }

  if (isDate(value) || (asDate && isValidDateValue(value))) {
    return (
      <Text span>
        {formatDate(value, { format: dateFormat, zone: dateTimeZone })}
      </Text>
    );
  }

  // fallback, just cast to string
  return <Text>{String(value)}</Text>;
}
