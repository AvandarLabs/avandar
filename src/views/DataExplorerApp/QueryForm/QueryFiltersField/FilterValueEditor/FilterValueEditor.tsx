import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";

import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";
import { QueryFilterValue } from "$/models/queries/StructuredQuery/QueryFilterValue/QueryFilterValue";
import { FilterListInput } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor/FilterListInput";
import { FilterPairInput } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor/FilterPairInput";
import { FilterScalarInput } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor/FilterScalarInput";

import classes from "./FilterValueEditor.module.css";

/** Inputs for the per-rule value editor. */
export type Props = {
  operator: StructuredQuery.FilterOperator;
  dataType: AvaDataTypeNs.T | undefined;
  value: StructuredQuery.FilterRule["value"];
  /** Called on every edit; the caller debounces. */
  onChange: (nextFilterValue: StructuredQuery.FilterRule["value"]) => void;
  /** Called on blur and on Enter so the last edit is never left pending. */
  onCommit: () => void;
};

/**
 * The value control for one filter rule, chosen by the operator's value arity:
 * a chip list for `in`, two labelled bounds for `between`, a single input for
 * everything scalar, and nothing at all for `is null`.
 */
export function FilterValueEditor({
  operator,
  dataType,
  value,
  onChange,
  onCommit,
}: Props): ReactNode {
  const { t } = useLingui();
  const spec = QueryFilterOperator.getSpec(operator);

  return match(spec?.arity ?? "scalar")
    .with("none", () => {
      return null;
    })
    .with("list", () => {
      return (
        <FilterListInput
          value={value}
          onChange={onChange}
          onCommit={onCommit}
        />
      );
    })
    .with("pair", () => {
      return (
        <FilterPairInput
          dataType={dataType}
          value={value}
          onChange={onChange}
          onCommit={onCommit}
        />
      );
    })
    .with("scalar", () => {
      const placeholder =
        operator === "matches_regex" || operator === "not_matches_regex"
          ? t`Regular expression`
          : t`Value`;
      return (
        <FilterScalarInput
          testId={
            dataType !== undefined && AvaDataType.isTemporal(dataType)
              ? "filter-value-date"
              : "filter-value-scalar"
          }
          value={QueryFilterValue.getScalar(value) ?? ""}
          placeholder={placeholder}
          ariaLabel={placeholder}
          dataType={dataType}
          className={classes.filterValueControl ?? ""}
          onValueChange={onChange}
          onCommit={onCommit}
        />
      );
    })
    .exhaustive();
}
