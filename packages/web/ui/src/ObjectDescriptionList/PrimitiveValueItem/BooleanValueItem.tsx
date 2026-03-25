import { Checkbox, Text } from "@mantine/core";
import { isNullish } from "@utils/guards/isNullish/isNullish";
import { isStringOrNumber } from "@ui/ObjectDescriptionList/guards";
import { NullOrUndefinedValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/NullOrUndefinedValueItem";
import type { ReactNode } from "react";

type Props = {
  /** The value to render. */
  value: boolean | null | undefined;

  /** Whether to render the value in edit mode. */
  editMode?: boolean;

  /** Called when the value changes in edit mode. */
  onChange?: (value: boolean) => void;

  renderNullString: NonNullable<ReactNode>;
  renderUndefinedString: NonNullable<ReactNode>;
  renderBooleanTrue: NonNullable<ReactNode>;
  renderBooleanFalse: NonNullable<ReactNode>;
};

export function BooleanValueItem({
  value,
  editMode,
  onChange,
  renderNullString,
  renderUndefinedString,
  renderBooleanTrue,
  renderBooleanFalse,
}: Props): JSX.Element {
  if (editMode) {
    return (
      <Checkbox
        defaultChecked={value ?? false}
        onChange={(newValue) => {
          return onChange?.(newValue.currentTarget.checked);
        }}
      />
    );
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

  if (isStringOrNumber(renderBooleanTrue)) {
    return <Text span>{value ? renderBooleanTrue : renderBooleanFalse}</Text>;
  }
  return <>{value ? renderBooleanTrue : renderBooleanFalse}</>;
}
