import { useLingui } from "@lingui/react/macro";
import { Combobox, Pill, PillsInput } from "@mantine/core";
import type { ComboboxStore } from "@mantine/core";
import type { KeyboardEvent, ReactNode } from "react";

type Props = {
  combobox: ComboboxStore;
  label: string;
  value: readonly string[];
  search: string;
  onSearchChange: (search: string) => void;
  onRemoveValue: (removed: string) => void;
};

/** Pills for the values already assigned to this field. */
function _valuePills(
  value: readonly string[],
  onRemove: (removed: string) => void,
): ReactNode[] {
  return value.map((existing) => {
    return (
      <Pill
        key={existing}
        withRemoveButton
        onRemove={() => {
          onRemove(existing);
        }}
      >
        {existing}
      </Pill>
    );
  });
}

/** Removes the last pill when Backspace is pressed in an empty search field. */
function _onBackspaceKeyDown(
  event: KeyboardEvent,
  search: string,
  value: readonly string[],
  onRemoveValue: (removed: string) => void,
): void {
  if (event.key !== "Backspace" || search.length > 0) {
    return;
  }
  event.preventDefault();
  const lastValue = value.at(-1);
  if (lastValue !== undefined) {
    onRemoveValue(lastValue);
  }
}

/** The pills input target: value pills plus the free-text search field. */
export function PillsFieldTarget({
  combobox,
  label,
  value,
  search,
  onSearchChange,
  onRemoveValue,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <PillsInput
      label={label}
      onClick={() => {
        combobox.openDropdown();
      }}
    >
      <Pill.Group>
        {_valuePills(value, onRemoveValue)}
        <Combobox.EventsTarget>
          <PillsInput.Field
            value={search}
            placeholder={t`Type a value`}
            onFocus={() => {
              combobox.openDropdown();
            }}
            onBlur={() => {
              combobox.closeDropdown();
            }}
            onChange={(event) => {
              combobox.updateSelectedOptionIndex();
              onSearchChange(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              _onBackspaceKeyDown(event, search, value, onRemoveValue);
            }}
          />
        </Combobox.EventsTarget>
      </Pill.Group>
    </PillsInput>
  );
}
