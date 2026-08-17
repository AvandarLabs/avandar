import { useLingui } from "@lingui/react/macro";
import { Group, TagsInput, Text, TextInput } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { operatorSpec } from "$/models/queries/StructuredQuery/QueryFilterOperator";
import { filterValueAsList } from "$/models/queries/StructuredQuery/QueryFilterValue";
import { match } from "ts-pattern";
import classes from "./QueryFiltersField.module.css";
import type { AvaDataType as AvaDataTypeNs } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { ReactNode } from "react";

export type FilterValueEditorProps = {
  operator: QueryFilterOperator;
  dataType: AvaDataTypeNs.T | undefined;
  value: QueryFilterRule["value"];
  /** Called on every edit; the caller debounces. */
  onChange: (next: QueryFilterRule["value"]) => void;
  /** Called on blur and on Enter so the last edit is never left pending. */
  onCommit: () => void;
};

/** The HTML input type that matches a temporal column. */
function _temporalInputType(dataType: AvaDataTypeNs.T): string {
  return match(dataType)
    .with("date", () => {
      return "date";
    })
    .with("time", () => {
      return "time";
    })
    .otherwise(() => {
      return "datetime-local";
    });
}

/**
 * The value control for one filter rule, chosen by the operator's value arity
 * and the column's type: a chip list for `in`, two labelled bounds for
 * `between`, a date picker for dates, a numeric field for numbers, nothing at
 * all for `is null`.
 */
export function FilterValueEditor({
  operator,
  dataType,
  value,
  onChange,
  onCommit,
}: FilterValueEditorProps): ReactNode {
  const { t } = useLingui();
  const spec = operatorSpec(operator);
  const arity = spec?.arity ?? "scalar";

  if (arity === "none") {
    return null;
  }

  const isNumeric = dataType !== undefined && AvaDataType.isNumeric(dataType);
  const isTemporal = dataType !== undefined && AvaDataType.isTemporal(dataType);

  function scalarInput(options: {
    testId: string;
    current: string | number;
    placeholder: string;
    onValue: (next: string) => void;
  }): ReactNode {
    if (isTemporal && dataType !== undefined) {
      return (
        <TextInput
          size="sm"
          data-testid={options.testId}
          type={_temporalInputType(dataType)}
          value={String(options.current ?? "")}
          onChange={(event) => {
            options.onValue(event.currentTarget.value);
          }}
          onBlur={onCommit}
          className={classes.valueControl}
        />
      );
    }
    return (
      <TextInput
        size="sm"
        data-testid={options.testId}
        inputMode={isNumeric ? "numeric" : undefined}
        placeholder={options.placeholder}
        value={String(options.current ?? "")}
        onChange={(event) => {
          options.onValue(event.currentTarget.value);
        }}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCommit();
          }
        }}
        className={classes.valueControl}
      />
    );
  }

  if (arity === "list") {
    return (
      <TagsInput
        size="sm"
        data-testid="filter-value-list"
        placeholder={t`Add a value`}
        value={filterValueAsList(value).map((item) => {
          return String(item);
        })}
        onChange={(next) => {
          onChange(next);
        }}
        onBlur={onCommit}
        className={classes.valueControl}
      />
    );
  }

  if (arity === "pair") {
    const [lower, upper] = filterValueAsList(value, { dropEmpty: false });
    return (
      <Group gap="xs" wrap="nowrap" className={classes.valuePair}>
        {scalarInput({
          testId: "filter-value-lower",
          current: lower ?? "",
          placeholder: t`Lower bound`,
          onValue: (next) => {
            onChange([next, upper ?? ""]);
          },
        })}
        <Text size="sm" c="neutral.6">
          {t`and`}
        </Text>
        {scalarInput({
          testId: "filter-value-upper",
          current: upper ?? "",
          placeholder: t`Upper bound`,
          onValue: (next) => {
            onChange([lower ?? "", next]);
          },
        })}
      </Group>
    );
  }

  const scalarValue = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return scalarInput({
    testId: isTemporal ? "filter-value-date" : "filter-value-scalar",
    current: scalarValue as string | number,
    placeholder:
      operator === "matches_regex" || operator === "not_matches_regex" ?
        t`Regular expression`
      : t`Value`,
    onValue: onChange,
  });
}
