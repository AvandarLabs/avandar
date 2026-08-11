import { makeSelectOptions, Select } from "@avandar/ui";
import { propPasses } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useMemo } from "react";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ReactNode } from "react";

type Props = {
  /** Display label for the picker. */
  label: string;
  /** Columns the user can pick from. */
  fields: readonly QueryResultColumn[];
  /**
   * Restricts the pickable columns to those whose data type matches. `any`
   * (or `undefined`) allows every column.
   */
  dataType: "numeric" | "any" | "temporal" | "text" | undefined;
  /** Currently selected column name, if any. */
  value: string | undefined;
  /** Called with the selected column name (or `undefined` when cleared). */
  onChange: (next: unknown) => void;
};

/**
 * A {@link Control} widget that lets the user pick a query-result column,
 * filtered to the {@link ControlSpec}'s `dataType`. Rendered by {@link Control}
 * for `columnPicker` specs.
 */
export function ColumnPickerControl({
  label,
  fields,
  dataType,
  value,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const filtered = useMemo(() => {
    if (dataType === undefined || dataType === "any") {
      return fields;
    }
    if (dataType === "numeric") {
      return fields.filter(propPasses("dataType", AvaDataType.isNumeric));
    }
    if (dataType === "temporal") {
      return fields.filter(propPasses("dataType", AvaDataType.isTemporal));
    }
    return fields.filter(propPasses("dataType", AvaDataType.isText));
  }, [fields, dataType]);

  const options = useMemo(() => {
    return makeSelectOptions(filtered, {
      valueKey: "name",
      labelKey: "name",
    });
  }, [filtered]);

  return (
    <Select
      allowDeselect
      label={label}
      data={options}
      value={value ?? null}
      disabled={options.length === 0}
      placeholder={
        options.length === 0 ? t`No columns available` : t`Select a column`
      }
      onChange={(next) => {
        onChange(next ?? undefined);
      }}
    />
  );
}
