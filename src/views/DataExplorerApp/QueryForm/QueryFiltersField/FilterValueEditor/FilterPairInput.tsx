import { useLingui } from "@lingui/react/macro";
import { Group, Text } from "@mantine/core";
import { QueryFilterValue } from "$/models/queries/StructuredQuery/QueryFilterValue/QueryFilterValue";
import { FilterScalarInput } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor/FilterScalarInput";
import classes from "./FilterValueEditor.module.css";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";

type Props = {
  dataType: AvaDataType.T | undefined;
  value: StructuredQuery.FilterRule["value"];
  onChange: (nextFilterValue: StructuredQuery.FilterRule["value"]) => void;
  onCommit: () => void;
};

/**
 * The two labelled bounds a `between` rule collects. Blanks are kept while
 * editing so typing the upper bound first does not discard the empty lower one.
 */
export function FilterPairInput({
  dataType,
  value,
  onChange,
  onCommit,
}: Props): ReactNode {
  const { t } = useLingui();
  const [lower, upper] = QueryFilterValue.getList({ value, dropEmpty: false });

  return (
    <Group gap="xs" wrap="nowrap" className={classes.filterValuePair}>
      <FilterScalarInput
        testId="filter-value-lower"
        value={lower ?? ""}
        placeholder={t`Lower bound`}
        ariaLabel={t`Lower bound`}
        dataType={dataType}
        className={classes.filterValueControl ?? ""}
        onValueChange={(nextBoundText) => {
          onChange([nextBoundText, upper ?? ""]);
        }}
        onCommit={onCommit}
      />
      <Text size="sm" c="neutral.6">
        {t`and`}
      </Text>
      <FilterScalarInput
        testId="filter-value-upper"
        value={upper ?? ""}
        placeholder={t`Upper bound`}
        ariaLabel={t`Upper bound`}
        dataType={dataType}
        className={classes.filterValueControl ?? ""}
        onValueChange={(nextBoundText) => {
          onChange([lower ?? "", nextBoundText]);
        }}
        onCommit={onCommit}
      />
    </Group>
  );
}
