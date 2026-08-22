import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ReactNode } from "react";
import type { ValueEditorProps } from "react-querybuilder";

import { Group, Text } from "@mantine/core";
import clsx from "clsx";

import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";
import { QueryFilterValidation } from "$/models/queries/StructuredQuery/QueryFilterValidation/QueryFilterValidation";
import { queryFilterValidationLabel } from "@/views/DataExplorerApp/copy/queryFilterValidationLabel";
import { getFilterControlsContext } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterControlHelpers";
import { getFilterValueFromLibraryValue } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/filterTreeConversionHelpers/filterTreeConversionHelpers";
import { FilterValueEditor } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor/FilterValueEditor";
import { MatchCaseToggle } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/MatchCaseToggle";

import classes from "./FilterValueEditorControl.module.css";

type Props = ValueEditorProps;

/**
 * Value editor plus, for text operators, the Match case toggle, plus the
 * reason the rule is not being applied when there is one.
 */
export function FilterValueEditorControl({
  field,
  operator,
  value,
  handleOnChange,
  rule,
  context,
}: Props): ReactNode {
  const filterContext = getFilterControlsContext(context);
  const ruleId = rule.id ?? "";
  const dataType = filterContext.columnTypes[field];
  // react-querybuilder types `value` as `any`, so it is narrowed before every
  // downstream check runs against it.
  const filterValue = getFilterValueFromLibraryValue(value);
  const filterRule: StructuredQuery.FilterRule = {
    type: "rule",
    id: ruleId,
    columnName: field,
    ...(dataType === undefined ? {} : { columnDataType: dataType }),
    operator: QueryFilterOperator.isOperator(operator) ? operator : "=",
    value: filterValue,
    ...(filterContext.matchCaseById[ruleId] === true
      ? { matchCase: true }
      : {}),
  };
  const reason = QueryFilterValidation.validateRule(filterRule);
  const isUnfinished = !QueryFilterValidation.isRuleComplete(filterRule);

  return (
    <>
      <Group
        gap="xs"
        wrap="nowrap"
        className={clsx(
          classes.filterValueControlSlot,
          isUnfinished && classes.filterValueControlNotApplied,
        )}
      >
        <FilterValueEditor
          operator={filterRule.operator}
          dataType={dataType}
          value={filterValue}
          onChange={(nextFilterValue) => {
            handleOnChange(nextFilterValue);
          }}
          onCommit={filterContext.commitNow}
        />
        <MatchCaseToggle
          operator={filterRule.operator}
          dataType={dataType}
          matchCase={filterContext.matchCaseById[ruleId] === true}
          onChange={(nextMatchCase) => {
            filterContext.setMatchCase(ruleId, nextMatchCase);
          }}
        />
      </Group>
      {reason ? (
        <Text
          size="xs"
          c="orange.7"
          className={classes.filterValueControlMessage}
        >
          {queryFilterValidationLabel(reason)}
        </Text>
      ) : null}
    </>
  );
}
