import type { ReactNode } from "react";
import type { FieldSelectorProps } from "react-querybuilder";

import { useLingui } from "@lingui/react/macro";
import { Select, Tooltip } from "@mantine/core";

import { getOptionNameFromUnknown } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControlHelpers";

import classes from "./FilterFieldSelector.module.css";

type Props = FieldSelectorProps;

/**
 * Column picker. Ellipsizes the name from the start and shows the full name in
 * a tooltip so a cut label is still identifiable.
 */
export function FilterFieldSelector({
  value,
  options,
  handleOnChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const selected = String(value ?? "");
  return (
    <Tooltip label={selected} disabled={selected === ""} withinPortal>
      <Select
        size="sm"
        aria-label={t`Column`}
        placeholder={t`Column`}
        data={options.map((option) => {
          const name = getOptionNameFromUnknown(option);
          return { value: name, label: name };
        })}
        value={selected === "" ? null : selected}
        onChange={(nextColumnName) => {
          handleOnChange(nextColumnName ?? "");
        }}
        searchable
        comboboxProps={{
          withinPortal: true,
          position: "bottom-start",
          width: "auto",
        }}
        className={classes.filterFieldControl}
        classNames={{
          input: classes.filterFieldTruncatedInput,
          option: classes.filterFieldWrappingOption,
          dropdown: classes.filterFieldWideDropdown,
        }}
      />
    </Tooltip>
  );
}
