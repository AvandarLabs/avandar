import type { QueryFilterRule } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import type {
  RenderFilterRuleOptions,
  SqlFragment,
} from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.types.ts";

import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator.ts";
import { QueryFilterValidation } from "$/models/queries/StructuredQuery/QueryFilterValidation/QueryFilterValidation.ts";
import { QueryFilterValue } from "$/models/queries/StructuredQuery/QueryFilterValue/QueryFilterValue.ts";
import { getFilterPredicateParts } from "$/models/queries/StructuredQuery/renderFilterRule/getFilterPredicateParts.ts";
import {
  getScalarPredicateSql,
  isScalarFilterOperator,
} from "$/models/queries/StructuredQuery/renderFilterRule/getScalarPredicateSql.ts";
import {
  getValuelessPredicateSql,
  isValuelessFilterOperator,
} from "$/models/queries/StructuredQuery/renderFilterRule/getValuelessPredicateSql.ts";
import { renderMultiValuePredicate } from "$/models/queries/StructuredQuery/renderFilterRule/renderMultiValuePredicate.ts";

export type {
  FilterPredicateParts,
  RenderFilterRuleOptions,
  SqlFragment,
} from "$/models/queries/StructuredQuery/renderFilterRule/renderFilterRule.types.ts";

/**
 * Renders one filter rule to SQL. Returns `undefined` when the rule is
 * incomplete, invalid, or its operator is unknown, which is how such rules get
 * excluded from the query instead of running as `col = ''` or failing the whole
 * statement with a conversion error.
 *
 * The predicate text itself comes from `getScalarPredicateSql`,
 * `getValuelessPredicateSql`, and `renderMultiValuePredicate`; what stays here
 * is deciding the column's effective type and whether to fold case.
 */
export function renderFilterRule(
  rule: QueryFilterRule,
  options: RenderFilterRuleOptions = {},
): SqlFragment | undefined {
  const spec = QueryFilterOperator.getSpec(rule.operator);
  if (!spec || !QueryFilterValidation.isRuleComplete(rule)) {
    return undefined;
  }

  const dataType =
    options.columnTypes?.[rule.columnName] ?? rule.columnDataType;

  // A rule that cannot be applied is left out of the SQL entirely rather than
  // handed to DuckDB, which would reject the whole query with a conversion
  // error and lose the results of every other rule. Validation runs against the
  // effective type so a live `columnTypes` override is honoured.
  const effectiveRule =
    dataType === rule.columnDataType
      ? rule
      : { ...rule, columnDataType: dataType };
  if (QueryFilterValidation.validateRule(effectiveRule) !== undefined) {
    return undefined;
  }

  // Text comparison folds case unless the rule opted into `Match case`. A
  // column whose type is unknown is treated as text, matching the SQL layer.
  const isTextColumn = dataType === undefined || AvaDataType.isText(dataType);
  const parts = getFilterPredicateParts({
    columnName: rule.columnName,
    dataType,
    foldCase: spec.supportsMatchCase && isTextColumn && rule.matchCase !== true,
  });

  const makeLiteral = (value: string | number | boolean): unknown => {
    return QueryFilterValue.makeLiteral({ value, dataType });
  };

  const scalarBinding = (): unknown[] => {
    const value = QueryFilterValue.getScalar(rule.value);
    return value === undefined ? [] : [makeLiteral(value)];
  };

  const operator = rule.operator;
  if (isScalarFilterOperator(operator)) {
    return {
      sql: getScalarPredicateSql({ operator, parts }),
      bindings: scalarBinding(),
    };
  }
  if (isValuelessFilterOperator(operator)) {
    return {
      sql: getValuelessPredicateSql({ operator, column: parts.column }),
      bindings: [],
    };
  }

  return renderMultiValuePredicate({
    operator,
    value: rule.value,
    parts,
    makeLiteral,
  });
}
