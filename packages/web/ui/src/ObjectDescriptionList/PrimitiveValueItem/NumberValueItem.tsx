import { NumberInput, Text } from "@mantine/core";
import { isNullish } from "@utils/guards/isNullish/isNullish";
import { formatNumber } from "@utils/numbers/formatNumber/formatNumber";
import { ReactNode } from "react";
import { NullOrUndefinedValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/NullOrUndefinedValueItem";

type Props = {
  /** Whether to render the value in edit mode. */
  editMode: boolean;

  /** The value to render. */
  value: number | string | null | undefined;

  /** Called when the value changes in edit mode. */
  onChange?: (value: number | string) => void;

  /** What we display for null values. */
  renderNullString: NonNullable<ReactNode>;

  /** What we display for undefined values. */
  renderUndefinedString: NonNullable<ReactNode>;
};

export function NumberValueItem({
  value,
  editMode,
  onChange,
  renderNullString,
  renderUndefinedString,
}: Props): JSX.Element {
  if (editMode) {
    return (
      <NumberInput
        defaultValue={value ?? ""}
        onChange={(newValue) => {
          return onChange?.(newValue);
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

  return (
    <Text span>
      {formatNumber(Number(value), { locale: "en-US", useGrouping: true })}
    </Text>
  );
}
