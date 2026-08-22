import type { ReactNode } from "react";

import { Combobox } from "@mantine/core";

import { CREATE_OPTION_VALUE } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedValuesInput/DisputedValuesInput.constants";
import { OptionsDropdown } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedValuesInput/OptionsDropdown";
import { PillsFieldTarget } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedValuesInput/PillsFieldTarget";
import { useValuesFieldState } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedValuesInput/useValuesFieldState";

type Props = {
  label: string;
  value: readonly string[];
  suggestions: readonly string[];
  onChange: (value: string[]) => void;
};

/**
 * A free-text, creatable multi-value field for one disputed-status list.
 *
 * The inspector has no distinct-values query for a bound layer's column
 * today, so the author types the source values that mean "disputed" or
 * "undetermined" instead of picking them from observed data. Values already
 * assigned to either list are offered as suggestions, so the author can see
 * what's already taken before typing a conflicting one.
 */
export function DisputedValuesInput({
  label,
  value,
  suggestions,
  onChange,
}: Props): ReactNode {
  const {
    combobox,
    search,
    setSearch,
    trimmedSearch,
    isKnownValue,
    matchingSuggestions,
    addValue,
    removeValue,
  } = useValuesFieldState(value, suggestions, onChange);

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(optionValue) => {
        addValue(
          optionValue === CREATE_OPTION_VALUE ? trimmedSearch : optionValue,
        );
      }}
    >
      <Combobox.DropdownTarget>
        <PillsFieldTarget
          combobox={combobox}
          label={label}
          value={value}
          search={search}
          onSearchChange={setSearch}
          onRemoveValue={removeValue}
        />
      </Combobox.DropdownTarget>
      <OptionsDropdown
        matchingSuggestions={matchingSuggestions}
        trimmedSearch={trimmedSearch}
        isKnownValue={isKnownValue}
      />
    </Combobox>
  );
}
