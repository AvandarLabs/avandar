import { Text, TextInput } from "@mantine/core";
import { Select } from "@ui/inputs/Select/Select";
import { isNullish } from "@utils/guards/isNullish/isNullish";
import { isStringOrNumber } from "@ui/ObjectDescriptionList/guards";
import { NullOrUndefinedValueItem } from "@ui/ObjectDescriptionList/PrimitiveValueItem/NullOrUndefinedValueItem";
import type { SelectData } from "@ui/inputs/Select/Select";
import type { ReactNode } from "react";

type Props = {
  /** Whether to render the value in edit mode. */
  editMode: boolean;

  /** The value to render. */
  value: string | null | undefined;

  /** Called when the value changes in edit mode. */
  onChange: (value: string) => void;

  /** What we display for null values. */
  renderNullString: NonNullable<ReactNode>;

  /** What we display for undefined values. */
  renderUndefinedString: NonNullable<ReactNode>;

  /** What we display for empty strings. */
  renderEmptyString: NonNullable<ReactNode>;

  /**
   * The choices to render. If provided, the editable mode will be a Select
   * instead of a text input.
   */
  choices?: SelectData<string>;
};

export function TextValueItem({
  editMode,
  value,
  onChange,
  choices,
  renderNullString,
  renderUndefinedString,
  renderEmptyString,
}: Props): JSX.Element {
  if (editMode) {
    if (choices) {
      return (
        <Select
          defaultValue={value ?? ""}
          data={choices}
          onChange={(newValue) => {
            return onChange(newValue ?? "");
          }}
        />
      );
    }
    return (
      <TextInput
        defaultValue={value ?? ""}
        onChange={(event) => {
          return onChange(event.currentTarget.value);
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

  return <Text span>{value}</Text>;
}
