import { Text } from "@mantine/core";
import { isBoolean } from "@utils/guards/isBoolean/isBoolean";
import { isDate } from "@utils/guards/isDate/isDate";
import { isISODateString } from "@utils/guards/isISODateString/isISODateString";
import { isNullish } from "@utils/guards/isNullish/isNullish";
import { isNumber } from "@utils/guards/isNumber/isNumber";
import { isString } from "@utils/guards/isString/isString";
import { match } from "ts-pattern";
import { isStringOrNumber } from "@ui/ObjectDescriptionList/guards";
import { BooleanValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/BooleanValueItem";
import { DateValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/DateValueItem";
import { NullOrUndefinedValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/NullOrUndefinedValueItem";
import { NumberValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/NumberValueItem";
import { TextValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/TextValueItem";
import type {
  GenericRootData,
  PrimitiveValue,
  PrimitiveValueRenderOptions,
} from "@ui/ObjectDescriptionList/ObjectDescriptionList.types";

type Props<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
> = {
  /** The value to render. */
  value: T;

  /** Whether to render the value in edit mode. */
  editMode?: boolean;

  /** Called when the value changes in edit mode. */
  onChange?: (value: T) => void;

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
  onChange,
  editMode = false,
  renderAsType = undefined,
  rootData = undefined,
  renderValue = undefined,
  renderEditableValue = undefined,
  renderEmptyString = "Empty text",
  renderBooleanTrue = "Yes",
  renderBooleanFalse = "No",
  renderNullString = "No value",
  renderUndefinedString = "No value",
  dateFormat = "YYYY-MM-DDTHH:mm:ssZ",
  dateTimeZone = "local",
}: Props<T, RootData>): JSX.Element {
  // if we are in display mode and there is a `renderValue` function, then
  // we use that instead
  if (!editMode && renderValue !== undefined) {
    const customRenderedValue = renderValue(value, rootData as RootData);

    // only use the custom display value if it's not `undefined`, which we use
    // to signal a no-op. If a no-op, we continue down this function until we
    // hit the appropriate fallback.
    if (customRenderedValue !== undefined) {
      return <>{customRenderedValue}</>;
    }
  }

  // if we are in edit mode and there is a `renderEditableValue` function, then
  // we use that instead
  if (editMode && renderEditableValue !== undefined) {
    const customEditableValue = renderEditableValue(
      value,
      rootData as RootData,
    );

    // only use the custom editable value if it's not `undefined`, which we use
    // to signal a no-op. If a no-op, we continue down this function until we
    // hit the appropriate fallback.
    if (customEditableValue !== undefined) {
      return <>{customEditableValue}</>;
    }
  }

  // if renderAsType is provided then we don't do any type inference
  // and we can just render the appropriate component
  if (renderAsType) {
    return match(renderAsType)
      .with("number", () => {
        return (
          <NumberValueItem
            editMode={editMode}
            value={
              isNullish(value) ? value
              : isStringOrNumber(value) ?
                value
              : String(value)
            }
            onChange={(newValue) => {
              return onChange?.(newValue as T);
            }}
            renderNullString={renderNullString}
            renderUndefinedString={renderUndefinedString}
          />
        );
      })
      .with("boolean", () => {
        return (
          <BooleanValueItem
            editMode={editMode}
            value={isNullish(value) ? value : Boolean(value)}
            onChange={(newValue) => {
              return onChange?.(newValue as T);
            }}
            renderNullString={renderNullString}
            renderUndefinedString={renderUndefinedString}
            renderBooleanTrue={renderBooleanTrue}
            renderBooleanFalse={renderBooleanFalse}
          />
        );
      })
      .with("text", { type: "text" }, (typeOptions) => {
        return (
          <TextValueItem
            editMode={editMode}
            value={isNullish(value) ? value : String(value)}
            onChange={(newValue) => {
              return onChange?.(newValue as T);
            }}
            choices={
              typeof typeOptions === "object" ? typeOptions.choices : undefined
            }
            renderNullString={renderNullString}
            renderUndefinedString={renderUndefinedString}
            renderEmptyString={renderEmptyString}
          />
        );
      })
      .with("date", () => {
        if (isBoolean(value)) {
          return (
            <Text span fs="italic">
              Invalid date
            </Text>
          );
        }

        return (
          <DateValueItem
            editMode={editMode}
            value={isNullish(value) ? value : value}
            onChange={(newValue) => {
              return onChange?.(newValue as T);
            }}
            renderNullString={renderNullString}
            renderUndefinedString={renderUndefinedString}
            dateFormat={dateFormat}
            dateTimeZone={dateTimeZone}
          />
        );
      })
      .exhaustive();
  }

  // if no `renderAsType` was provided, then we will try to infer the
  // type in order to render the appropriate component.
  if (isNullish(value)) {
    // it doesn't matter if we are in edit more or not, if the value is
    // nullish and there is no `renderAsType`, all we can do is render in
    // display mode.
    return (
      <NullOrUndefinedValueItem
        value={value}
        renderNullString={renderNullString}
        renderUndefinedString={renderUndefinedString}
      />
    );
  }

  if (isBoolean(value)) {
    return (
      <BooleanValueItem
        editMode={editMode}
        value={value}
        onChange={(newValue) => {
          return onChange?.(newValue as T);
        }}
        renderNullString={renderNullString}
        renderUndefinedString={renderUndefinedString}
        renderBooleanTrue={renderBooleanTrue}
        renderBooleanFalse={renderBooleanFalse}
      />
    );
  }

  if (isDate(value) || isISODateString(value)) {
    return (
      <DateValueItem
        editMode={editMode}
        value={value}
        onChange={(newValue) => {
          return onChange?.(newValue as T);
        }}
        renderNullString={renderNullString}
        renderUndefinedString={renderUndefinedString}
        dateFormat={dateFormat}
        dateTimeZone={dateTimeZone}
      />
    );
  }

  if (isNumber(value)) {
    return (
      <NumberValueItem
        editMode={editMode}
        value={value}
        onChange={(newValue) => {
          return onChange?.(newValue as T);
        }}
        renderNullString={renderNullString}
        renderUndefinedString={renderUndefinedString}
      />
    );
  }

  if (isString(value)) {
    return (
      <TextValueItem
        editMode={editMode}
        value={value}
        onChange={(newValue) => {
          return onChange?.(newValue as T);
        }}
        renderNullString={renderNullString}
        renderUndefinedString={renderUndefinedString}
        renderEmptyString={renderEmptyString}
      />
    );
  }

  // fallback, just cast to string
  return <Text>{String(value)}</Text>;
}
