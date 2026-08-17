import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Select, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import clsx from "clsx";
import { queryFilterOperatorLabel } from "$/copy/queryFilterOperatorLabel";
import { queryFilterValidationLabel } from "$/copy/queryFilterValidationLabel";
import {
  isFilterRuleComplete,
  validateFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilterValidation";
import classes from "./QueryFiltersField.module.css";
import { FilterValueEditor } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/FilterValueEditor";
import { MatchCaseToggle } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/MatchCaseToggle";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types";
import type {
  ActionProps,
  CombinatorSelectorProps,
  FieldSelectorProps,
  OperatorSelectorProps,
  ValueEditorProps,
} from "react-querybuilder";
import type { ReactNode } from "react";

/**
 * Everything our controls need beyond what react-querybuilder gives them,
 * passed through `QueryBuilder`'s `context` prop.
 */
export type FilterControlsContext = {
  /** Column data types keyed by column name. */
  columnTypes: Readonly<Record<string, AvaDataType.T>>;
  matchCaseById: Readonly<Record<string, boolean>>;
  setMatchCase: (ruleId: string, matchCase: boolean) => void;
  /** Flushes any pending debounced commit. */
  commitNow: () => void;
};

function _context(context: unknown): FilterControlsContext {
  return context as FilterControlsContext;
}

function _optionName(option: unknown): string {
  return option !== null && typeof option === "object" && "name" in option ?
      String((option as { name: unknown }).name)
    : "";
}

/**
 * Column picker. Renders the name from its start with an ellipsis and a
 * tooltip, because a long column name used to render as its own tail with no
 * indication that it was cut.
 */
export function FilterFieldSelector(props: FieldSelectorProps): ReactNode {
  const { t } = useLingui();
  const selected = String(props.value ?? "");
  return (
    <Tooltip label={selected} disabled={selected === ""} withinPortal>
      <Select
        size="sm"
        aria-label={t`Column`}
        placeholder={t`Column`}
        data={props.options.map((option) => {
          const name = _optionName(option);
          return { value: name, label: name };
        })}
        value={selected === "" ? null : selected}
        onChange={(next) => {
          props.handleOnChange(next ?? "");
        }}
        searchable
        comboboxProps={{
          withinPortal: true,
          position: "bottom-start",
          width: "auto",
        }}
        className={classes.fieldControl}
        classNames={{
          input: classes.truncatedInput,
          option: classes.wrappingOption,
          dropdown: classes.wideDropdown,
        }}
      />
    </Tooltip>
  );
}

/** Operator picker, labelled for the column's type. */
export function FilterOperatorSelector(
  props: OperatorSelectorProps,
): ReactNode {
  const { t } = useLingui();
  const dataType = _context(props.context).columnTypes[props.field];
  return (
    <Select
      size="sm"
      aria-label={t`Condition`}
      data={props.options.map((option) => {
        const name = _optionName(option);
        return {
          value: name,
          label: queryFilterOperatorLabel(
            name as QueryFilterOperator,
            dataType,
          ),
        };
      })}
      value={String(props.value ?? "")}
      onChange={(next) => {
        props.handleOnChange(next ?? "=");
      }}
      comboboxProps={{ withinPortal: true, position: "bottom-start" }}
      className={classes.operatorControl}
      classNames={{ option: classes.wrappingOption }}
      allowDeselect={false}
    />
  );
}

/**
 * Value editor plus, for text operators, the `Match case` toggle, plus the
 * reason the rule is not being applied when there is one.
 */
export function FilterValueEditorControl(props: ValueEditorProps): ReactNode {
  const context = _context(props.context);
  const ruleId = props.rule.id ?? "";
  const dataType = context.columnTypes[props.field];
  const rule: QueryFilterRule = {
    type: "rule",
    id: ruleId,
    columnName: props.field,
    ...(dataType === undefined ? {} : { columnDataType: dataType }),
    operator: props.operator as QueryFilterOperator,
    value: props.value,
    ...(context.matchCaseById[ruleId] === true ? { matchCase: true } : {}),
  };
  const reason = validateFilterRule(rule);
  const isUnfinished = !isFilterRuleComplete(rule);

  return (
    <>
      <div
        className={clsx(
          classes.valueSlot,
          isUnfinished && classes.ruleNotApplied,
        )}
      >
        <FilterValueEditor
          operator={rule.operator}
          dataType={dataType}
          value={props.value}
          onChange={(next) => {
            props.handleOnChange(next);
          }}
          onCommit={context.commitNow}
        />
        <MatchCaseToggle
          operator={rule.operator}
          dataType={dataType}
          matchCase={context.matchCaseById[ruleId] === true}
          onChange={(next) => {
            context.setMatchCase(ruleId, next);
          }}
        />
      </div>
      {reason ?
        <Text size="xs" c="orange.7" className={classes.ruleMessage}>
          {queryFilterValidationLabel(reason)}
        </Text>
      : null}
    </>
  );
}

/**
 * Remove buttons. A ghost icon rather than a solid blue block, so removing a
 * rule stops out-weighing the rule itself.
 */
export function FilterRemoveAction(props: ActionProps): ReactNode {
  const { t } = useLingui();
  const isGroup = "combinator" in props.ruleOrGroup;
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="md"
      aria-label={isGroup ? t`Remove group` : t`Remove condition`}
      onClick={(event) => {
        props.handleOnClick(event);
      }}
      className={classes.removeAction}
    >
      <IconTrash size={16} />
    </ActionIcon>
  );
}

/** Add buttons, de-emphasised so the conditions read louder than the chrome. */
export function FilterAddAction(props: ActionProps): ReactNode {
  return (
    <Button
      variant="light"
      size="compact-sm"
      onClick={(event) => {
        props.handleOnClick(event);
      }}
      className={classes.addAction}
    >
      {props.label}
    </Button>
  );
}

/**
 * AND / OR picker. Its options carry our own combinator values, which is what
 * makes the control display them.
 */
export function FilterCombinatorSelector(
  props: CombinatorSelectorProps,
): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      size="sm"
      aria-label={t`Combine conditions with`}
      data={props.options.map((option) => {
        const name = _optionName(option);
        const label =
          option !== null && typeof option === "object" && "label" in option ?
            String((option as { label: unknown }).label)
          : name;
        return { value: name, label };
      })}
      value={String(props.value ?? "AND")}
      onChange={(next) => {
        props.handleOnChange(next ?? "AND");
      }}
      comboboxProps={{ withinPortal: true, position: "bottom-start" }}
      className={classes.combinatorControl}
      allowDeselect={false}
    />
  );
}
