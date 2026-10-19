import { prop, propEq } from "@avandar/utils";
import { match } from "ts-pattern";
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
type NodeOutcome = { rules: QueryFilterGroup["rules"]; issues: BindingIssue[] };

function _getMatches({
  node,
  columns,
  clause,
}: {
  node: QueryFilterRule | LegacyQueryFilterRule;
  columns: readonly QueryColumn.T[];
  clause: "where" | "having";
}): QueryColumn.T[] {
  if ("columnId" in node) {
    return columns.filter(propEq("id", node.columnId));
  }
  const getNames = (column: QueryColumn.T): string[] => {
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

function _getBoundRule({
  node,
  column,
  clause,
}: {
  node: LegacyQueryFilterRule;
  column: QueryColumn.T;
  clause: "where" | "having";
}): QueryFilterRule {
  const { columnName: _columnName, ...rule } = node;
  const aggregation = clause === "having" ? column.aggregation : undefined;
  const columnDataType = QueryAggregationType.getResultDataType({
    aggregation,
    sourceDataType: column.baseColumn.dataType,
  });
  return { ...rule, columnId: column.id, columnDataType };
}

function _getRuleOutcome({
  node,
  columns,
  clause,
}: {
  node: QueryFilterRule | LegacyQueryFilterRule;
  columns: readonly QueryColumn.T[];
  clause: "where" | "having";
}): NodeOutcome {
  const matches = _getMatches({ node, columns, clause });
  const column = matches.length === 1 ? matches[0] : undefined;
  return column
    ? {
        rules: [
          "columnId" in node ? node : _getBoundRule({ node, column, clause }),
        ],
        issues: [],
      }
    : {
        rules: [],
        issues: [
          {
            nodeId: node.id,
            reason: matches.length > 1 ? "ambiguous" : "missing",
          },
        ],
      };
}

/** Binds legacy names once and validates existing identity-based targets. */
export function normalizeQueryFilters({
  filter,
  columns,
  clause,
}: Readonly<{
  filter: QueryFilterGroup | LegacyQueryFilterGroup;
  columns: readonly QueryColumn.T[];
  clause: "where" | "having";
}>): { filter: QueryFilterGroup; issues: BindingIssue[] } {
  const outcomes = filter.rules.map((node): NodeOutcome => {
    return match(node)
      .with({ type: "group" }, (group) => {
        const result = normalizeQueryFilters({
          filter: group,
          columns,
          clause,
        });
        return {
          rules:
            result.filter.rules.length > 0 || result.issues.length === 0
              ? [result.filter]
              : [],
          issues: result.issues,
        };
      })
      .with({ type: "rule" }, (rule) => {
        return _getRuleOutcome({ node: rule, columns, clause });
      })
      .exhaustive();
  });
  return {
    filter: { ...filter, rules: outcomes.flatMap(prop("rules")) },
    issues: outcomes.flatMap(prop("issues")),
  };
}
