import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";
import { queryFilterOperatorLabel } from "@/views/DataExplorerApp/copy/queryFilterOperatorLabel/queryFilterOperatorLabel";
import {
  getFilterControlsContext,
  getOptionNameFromUnknown,
} from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControlHelpers";
import classes from "./FilterOperatorSelector.module.css";
import type { ReactNode } from "react";
import type { OperatorSelectorProps } from "react-querybuilder";

type Props = OperatorSelectorProps;

/** Operator picker, labelled for the column's type. */
export function FilterOperatorSelector({
  field,
  value,
  options,
  handleOnChange,
  context,
}: Props): ReactNode {
  const { t } = useLingui();
  const dataType = getFilterControlsContext(context).columnTypes[field];
  return (
    <Select
      size="sm"
      aria-label={t`Condition`}
      data={options.map((option) => {
        const name = getOptionNameFromUnknown(option);
        return {
          value: name,
          label: QueryFilterOperator.isOperator(name)
            ? queryFilterOperatorLabel({ operator: name, dataType })
            : name,
        };
      })}
      value={String(value ?? "")}
      onChange={(nextOperator) => {
        handleOnChange(nextOperator ?? "=");
      }}
      comboboxProps={{ withinPortal: true, position: "bottom-start" }}
      className={classes.filterOperatorControl}
      classNames={{ option: classes.filterOperatorWrappingOption }}
      allowDeselect={false}
    />
  );
}
