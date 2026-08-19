import { isPlainObject } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { getOptionNameFromUnknown } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControlHelpers";
import classes from "./FilterCombinatorSelector.module.css";
import type { ReactNode } from "react";
import type { CombinatorSelectorProps } from "react-querybuilder";

type Props = CombinatorSelectorProps;

/**
 * AND / OR picker. Its options carry our own combinator values, which is what
 * makes the control display them.
 */
export function FilterCombinatorSelector({
  value,
  options,
  handleOnChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      size="sm"
      aria-label={t`Combine conditions with`}
      data={options.map((option) => {
        const name = getOptionNameFromUnknown(option);
        const label =
          isPlainObject(option) && "label" in option ?
            String(option.label)
          : name;
        return { value: name, label };
      })}
      value={String(value ?? "AND")}
      onChange={(nextCombinator) => {
        handleOnChange(nextCombinator ?? "AND");
      }}
      comboboxProps={{ withinPortal: true, position: "bottom-start" }}
      className={classes.filterCombinatorControl}
      allowDeselect={false}
    />
  );
}
