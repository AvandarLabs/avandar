import { MantineActionElement, MantineValueEditor, QueryBuilderMantine } from "@react-querybuilder/mantine";
import { Box, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { QueryBuilder } from "react-querybuilder";
import "react-querybuilder/dist/query-builder.css";
import type {
  QueryFilterCombinator,
  QueryFilterGroup,
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";
import type { Field, RuleGroupType, RuleType, ValueEditorType } from "react-querybuilder";

type Props = {
  /**
   * The columns available to filter on. Drawn from `query.queryColumns` so
   * the user can only build filters that reference selected fields.
   */
  columns: readonly QueryColumnRead[];
  /** The current filter tree. */
  value: QueryFilterGroup;
  /** Called when the user edits the filter tree. */
  onChange: (next: QueryFilterGroup) => void;
};

type LibraryRule = RuleType & {
  field: string;
  operator: QueryFilterOperator | string;
  value: unknown;
};

type LibraryGroup = RuleGroupType<LibraryRule, QueryFilterCombinator>;

/**
 * Mapping from react-querybuilder's default operator codes to ours.
 * Unhandled operators fall through and are flagged in the form.
 */
const _OPERATOR_TO_INTERNAL: Record<string, QueryFilterOperator> = {
  "=": "=",
  "!=": "!=",
  ">": ">",
  ">=": ">=",
  "<": "<",
  "<=": "<=",
  contains: "like",
  beginsWith: "like",
  endsWith: "like",
  doesNotContain: "not_like",
  in: "in",
  notIn: "not_in",
  null: "is_null",
  notNull: "is_not_null",
  between: "between",
  notBetween: "between",
};

const _INTERNAL_TO_OPERATOR: Record<QueryFilterOperator, string> = {
  "=": "=",
  "!=": "!=",
  ">": ">",
  ">=": ">=",
  "<": "<",
  "<=": "<=",
  like: "contains",
  not_like: "doesNotContain",
  in: "in",
  not_in: "notIn",
  is_null: "null",
  is_not_null: "notNull",
  between: "between",
};

const _OPERATORS_FOR_LIBRARY = [
  { name: "=", label: "=" },
  { name: "!=", label: "!=" },
  { name: ">", label: ">" },
  { name: ">=", label: ">=" },
  { name: "<", label: "<" },
  { name: "<=", label: "<=" },
  { name: "contains", label: "contains" },
  { name: "doesNotContain", label: "does not contain" },
  { name: "in", label: "in" },
  { name: "notIn", label: "not in" },
  { name: "null", label: "is null" },
  { name: "notNull", label: "is not null" },
  { name: "between", label: "between" },
];

function _convertRuleFromInternal(rule: QueryFilterRule): LibraryRule {
  const libOperator = _INTERNAL_TO_OPERATOR[rule.operator];
  return {
    field: rule.columnName,
    operator: libOperator,
    value:
      Array.isArray(rule.value) ?
        (rule.value as ReadonlyArray<string | number>).join(",")
      : (rule.value as unknown),
  };
}

function _convertGroupFromInternal(group: QueryFilterGroup): LibraryGroup {
  return {
    combinator: group.combinator,
    rules: group.rules.map((child) => {
      if (child.type === "group") {
        return _convertGroupFromInternal(child);
      }
      return _convertRuleFromInternal(child);
    }),
  };
}

function _isGroup(value: unknown): value is LibraryGroup {
  return (
    value !== null &&
    typeof value === "object" &&
    "combinator" in (value as Record<string, unknown>) &&
    "rules" in (value as Record<string, unknown>)
  );
}

function _convertRuleToInternal(
  rule: LibraryRule,
): QueryFilterRule | undefined {
  const internalOp = _OPERATOR_TO_INTERNAL[String(rule.operator)];
  if (!internalOp) {
    return undefined;
  }
  let value: QueryFilterRule["value"] = rule.value as QueryFilterRule["value"];
  if (internalOp === "in" || internalOp === "not_in" || internalOp === "between") {
    if (Array.isArray(rule.value)) {
      value = rule.value as ReadonlyArray<string | number>;
    } else if (typeof rule.value === "string") {
      value = rule.value
        .split(",")
        .map((s) => {
          return s.trim();
        })
        .filter(Boolean);
    } else if (rule.value === undefined || rule.value === null) {
      value = [];
    }
  }
  if (internalOp === "is_null" || internalOp === "is_not_null") {
    value = null;
  }
  return {
    type: "rule",
    columnName: String(rule.field ?? ""),
    operator: internalOp,
    value,
  };
}

function _convertGroupToInternal(group: LibraryGroup): QueryFilterGroup {
  const rules: Array<QueryFilterGroup | QueryFilterRule> = [];
  group.rules.forEach((child) => {
    if (_isGroup(child)) {
      rules.push(_convertGroupToInternal(child));
      return;
    }
    const converted = _convertRuleToInternal(child as LibraryRule);
    if (converted) {
      rules.push(converted);
    }
  });
  const combinator = String(group.combinator).toUpperCase();
  return {
    type: "group",
    combinator: combinator === "OR" ? "OR" : "AND",
    rules,
  };
}

/**
 * Recursive filter UI for the manual query form. Wraps `react-querybuilder`
 * with the Mantine adapter and translates between the library's internal
 * tree shape and our `QueryFilterGroup`.
 */
export function QueryFiltersField({
  columns,
  value,
  onChange,
}: Props): JSX.Element {
  const fields: Field[] = useMemo(() => {
    return columns.map((col) => {
      return {
        name: col.baseColumn.name,
        label: col.baseColumn.name,
        valueEditorType: "text" as ValueEditorType,
      };
    });
  }, [columns]);

  const libraryQuery = useMemo(() => {
    return _convertGroupFromInternal(value);
  }, [value]);

  if (columns.length === 0) {
    return (
      <Stack gap="xs">
        <Text size="sm" c="neutral.6">
          Add columns to the query above to start defining filters.
        </Text>
      </Stack>
    );
  }

  return (
    <Box data-testid="query-filters-field">
      <QueryBuilderMantine>
        <QueryBuilder
          fields={fields}
          operators={_OPERATORS_FOR_LIBRARY}
          query={libraryQuery as RuleGroupType}
          onQueryChange={(newQuery) => {
            onChange(_convertGroupToInternal(newQuery as LibraryGroup));
          }}
          controlElements={{
            actionElement: MantineActionElement,
            valueEditor: MantineValueEditor,
          }}
        />
      </QueryBuilderMantine>
    </Box>
  );
}
