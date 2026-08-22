import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { TagsInput } from "@mantine/core";

import { QueryFilterValue } from "$/models/queries/StructuredQuery/QueryFilterValue/QueryFilterValue";

import classes from "./FilterValueEditor.module.css";

type Props = {
  value: StructuredQuery.FilterRule["value"];
  onChange: (nextFilterValue: StructuredQuery.FilterRule["value"]) => void;
  onCommit: () => void;
};

/**
 * The chip list an `in` / `not_in` rule collects. Each chip is one value, so a
 * value containing a comma stays a single value rather than splitting in two.
 */
export function FilterListInput({
  value,
  onChange,
  onCommit,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <TagsInput
      size="sm"
      data-testid="filter-value-list"
      aria-label={t`Add a value`}
      placeholder={t`Add a value`}
      value={QueryFilterValue.getList({ value }).map(String)}
      onChange={(nextListValues) => {
        onChange(nextListValues);
      }}
      onBlur={onCommit}
      className={classes.filterValueControl ?? ""}
    />
  );
}
