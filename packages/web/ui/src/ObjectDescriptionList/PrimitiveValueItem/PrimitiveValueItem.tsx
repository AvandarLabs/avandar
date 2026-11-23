import {
  isBoolean,
  isDate,
  isISODateString,
  isNullish,
  isNumber,
  isString,
} from "@avandar/utils";
import { Text } from "@mantine/core";
import { useI18nMessages } from "@ui/i18n/useI18nMessages";
import { NullOrUndefinedValueItem } from "./NullOrUndefinedValueItem";
import { TypedPrimitiveValueItem } from "./TypedPrimitiveValueItem/TypedPrimitiveValueItem";
import type {
  GenericRootData,
  PrimitiveValue,
  RenderAsTypeOptions,
} from "../ObjectDescriptionList.types";
import type { PrimitiveValueItemProps as Props } from "./PrimitiveValueItem.types";

/** Infers the built-in display type for an unconfigured primitive value. */
function _getPrimitiveRenderType(
  value: PrimitiveValue,
): RenderAsTypeOptions | undefined {
  if (isBoolean(value)) {
    return "boolean";
  }
  if (isDate(value) || isISODateString(value)) {
    return "date";
  }
  if (isNumber(value)) {
    return "number";
  }
  if (isString(value)) {
    return "text";
  }
  return undefined;
}

/** Renders primitive display or edit values with optional custom renderers. */
export function PrimitiveValueItem<
  T extends PrimitiveValue,
  RootData extends GenericRootData | undefined,
>({
  value,
  editMode = false,
  rootData,
  parentObject,
  renderValue,
  renderEditableValue,
  renderAsType: configuredRenderAsType,
  renderNullString,
  renderUndefinedString,
  ...renderOptions
}: Readonly<Props<T, RootData>>): JSX.Element {
  const i18n = useI18nMessages();
  const customRenderer = editMode ? renderEditableValue : renderValue;
  const customValue = customRenderer?.(
    value,
    rootData as RootData,
    parentObject,
  );
  if (customValue !== undefined) {
    return <>{customValue}</>;
  }
  const renderAsType = configuredRenderAsType ?? _getPrimitiveRenderType(value);
  if (renderAsType !== undefined) {
    return (
      <TypedPrimitiveValueItem
        {...renderOptions}
        value={value}
        editMode={editMode}
        renderNullString={renderNullString}
        renderUndefinedString={renderUndefinedString}
        renderAsType={renderAsType}
      />
    );
  }
  if (isNullish(value)) {
    return (
      <NullOrUndefinedValueItem
        value={value}
        renderNullString={renderNullString ?? i18n.noValue}
        renderUndefinedString={renderUndefinedString ?? i18n.noValue}
      />
    );
  }
  return <Text>{String(value)}</Text>;
}
