import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  LegacyQueryFilterGroup,
  LegacyQueryFilterRule,
  QueryFilterGroup,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

type BindingIssue = {
  nodeId: string | undefined;
  reason: "missing" | "ambiguous";
};
type Options = {
  filter: QueryFilterGroup | LegacyQueryFilterGroup;
  columns: readonly QueryColumn.T[];
  clause: "where" | "having";
};

/** Binds legacy names once and validates existing identity-based targets. */
export function normalizeQueryFilters(options: Readonly<Options>): {
  filter: QueryFilterGroup;
  issues: readonly BindingIssue[];
} {
  const { filter, columns, clause } = options;
  const issues: BindingIssue[] = [];
  const rules = filter.rules.flatMap((node): QueryFilterGroup["rules"] => {
    if (node.type === "group") {
      const result = normalizeQueryFilters({ filter: node, columns, clause });
      issues.push(...result.issues);
      return result.filter.rules.length > 0 || result.issues.length === 0
        ? [result.filter]
        : [];
    }
    const matches = _getMatches(node, columns, clause);
    const column = matches.length === 1 ? matches[0] : undefined;
    if (!column) {
      issues.push({
        nodeId: node.id,
        reason: matches.length > 1 ? "ambiguous" : "missing",
      });
      return [];
    }
    if ("columnId" in node) {
      return [node];
    }
    return [_getBoundRule(node, column, clause)];
  });
  return { filter: { ...filter, rules }, issues };
}

function _getMatches(
  node: QueryFilterRule | LegacyQueryFilterRule,
  columns: readonly QueryColumn.T[],
  clause: "where" | "having",
): readonly QueryColumn.T[] {
  if ("columnId" in node) {
    return columns.filter((column) => {
      return column.id === node.columnId;
    });
  }
  const getNames = (column: QueryColumn.T): readonly string[] => {
    return clause === "where"
      ? [column.baseColumn.name]
      : [
          QueryColumn.getDerivedColumnName(column),
          QueryColumn.getDerivedColumnName({
            ...column,
            outputAlias: undefined,
          }),
        ];
  };
  const exact = columns.filter((column) => {
    return getNames(column).includes(node.columnName);
  });
  return exact.length > 0
    ? exact
    : columns.filter((column) => {
        return getNames(column).some((name) => {
          return name.toLowerCase() === node.columnName.toLowerCase();
        });
      });
}

function _getBoundRule(
  node: LegacyQueryFilterRule,
  column: QueryColumn.T,
  clause: "where" | "having",
): QueryFilterRule {
  const { columnName: _columnName, ...rule } = node;
  const aggregation = clause === "having" ? column.aggregation : undefined;
  const columnDataType = QueryAggregationType.getResultDataType(
    aggregation,
    column.baseColumn.dataType,
  );
  return { ...rule, columnId: column.id, columnDataType };
}
