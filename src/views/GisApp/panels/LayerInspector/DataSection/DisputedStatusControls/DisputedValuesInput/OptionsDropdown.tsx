import { useLingui } from "@lingui/react/macro";
import { Combobox } from "@mantine/core";
import { CREATE_OPTION_VALUE } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedValuesInput/DisputedValuesInput.constants";
import type { ReactNode } from "react";

type Props = {
  matchingSuggestions: readonly string[];
  trimmedSearch: string;
  isKnownValue: boolean;
};

/** The suggestion list, plus a "create" entry for a brand-new typed value. */
export function OptionsDropdown({
  matchingSuggestions,
  trimmedSearch,
  isKnownValue,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Combobox.Dropdown>
      <Combobox.Options>
        {matchingSuggestions.map((suggestion) => {
          return (
            <Combobox.Option value={suggestion} key={suggestion}>
              {suggestion}
            </Combobox.Option>
          );
        })}
        {trimmedSearch.length === 0 || isKnownValue ? null : (
          <Combobox.Option value={CREATE_OPTION_VALUE}>
            {t`Create "${trimmedSearch}"`}
          </Combobox.Option>
        )}
      </Combobox.Options>
    </Combobox.Dropdown>
  );
}
