import { isPlainObject } from "@avandar/utils";
import { Parser } from "node-sql-parser";
import { uuid } from "$/lib/uuid.ts";
import { buildSqlExpressionKey } from "$/models/queries/QueryColumnBindings/buildSqlExpressionKey.ts";
import {
  columnRefName,
  identifierToString,
  matchAggregation,
} from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlAstReaders.ts";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { ProjectionDescriptor } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

type Source = {
  table: string;
  database?: string;
  schema?: string;
  alias?: string;
};

function _getQualifier(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : isPlainObject(value) && typeof value.value === "string"
      ? value.value
      : undefined;
}

function _getColumn(
  node: unknown,
  source: Readonly<Source>,
): string | undefined {
  if (!isPlainObject(node) || node.collate || node.array_index) {
    return undefined;
  }
  const schema = _getQualifier(node.schema);
  if (
    schema &&
    (source.alias || schema !== (source.schema ?? source.database))
  ) {
    return undefined;
  }
  const qualifier = _getQualifier(node.table);
  if (qualifier && qualifier !== (source.alias ?? source.table)) {
    return undefined;
  }
  return node.type === "star" ? "*" : columnRefName(node);
}

function _createDescriptor(
  source: Readonly<Source>,
  column: string,
  outputName: string,
  aggregation?: QueryAggregationType.T,
): ProjectionDescriptor {
  const key = buildSqlExpressionKey({ ...source, column, aggregation });
  return {
    id: uuid<QueryColumn.Id>(),
    identity: "sql",
    expressionKey: key,
    sqlExpressionKey: key,
    outputName,
  };
}

function _getProjection(
  item: unknown,
  source: Readonly<Source>,
): ProjectionDescriptor | undefined {
  if (!isPlainObject(item) || !isPlainObject(item.expr)) {
    return undefined;
  }
  const expression = item.expr;
  const alias = identifierToString(item.as);
  const column = _getColumn(expression, source);
  if (column && column !== "*") {
    return _createDescriptor(source, column, alias ?? column);
  }
  if (
    expression.type !== "aggr_func" ||
    expression.over ||
    expression.filter ||
    !isPlainObject(expression.args)
  ) {
    return undefined;
  }
  const args = expression.args;
  const aggregation =
    typeof expression.name === "string"
      ? matchAggregation(expression.name)
      : undefined;
  const argument = _getColumn(args.expr, source);
  if (
    !aggregation ||
    !argument ||
    argument === "*" ||
    args.distinct ||
    args.orderby ||
    args.separator
  ) {
    return undefined;
  }
  return _createDescriptor(
    source,
    argument,
    alias ?? `${aggregation}(${argument})`,
    aggregation,
  );
}

function _hasNestedSelect(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some(_hasNestedSelect);
  }
  return (
    isPlainObject(node) &&
    (node.type === "select" || Object.values(node).some(_hasNestedSelect))
  );
}

function _getSelect(sql: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = new Parser().astify(sql, {
      database: "postgresql",
    });
    const ast: unknown =
      Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
    if (
      !isPlainObject(ast) ||
      ast.type !== "select" ||
      ast.with ||
      ast._next ||
      ast.set_op ||
      ast.window ||
      (isPlainObject(ast.distinct) && ast.distinct.type)
    ) {
      return undefined;
    }
    return Object.values(ast).some(_hasNestedSelect) ? undefined : ast;
  } catch {
    return undefined;
  }
}

function _getSource(
  ast: Readonly<Record<string, unknown>>,
): Source | undefined {
  if (!Array.isArray(ast.from) || ast.from.length !== 1) {
    return undefined;
  }
  const table: unknown = ast.from[0];
  if (
    !isPlainObject(table) ||
    typeof table.table !== "string" ||
    table.expr ||
    table.join
  ) {
    return undefined;
  }
  return {
    table: table.table,
    database: typeof table.db === "string" ? table.db : undefined,
    schema: typeof table.schema === "string" ? table.schema : undefined,
    alias: typeof table.as === "string" ? table.as : undefined,
  };
}

function _hasSupportedGrouping(
  groupby: unknown,
  source: Readonly<Source>,
): boolean {
  if (!groupby) {
    return true;
  }
  return (
    isPlainObject(groupby) &&
    Array.isArray(groupby.columns) &&
    groupby.columns.every((column: unknown) => {
      const name = _getColumn(column, source);
      return name !== undefined && name !== "*";
    })
  );
}

/** Describes only supported single-source SQL, never ordinal output lineage. */
export function describeSqlProjections(
  options: Readonly<{ sql: string; columns: readonly QueryResult.Column[] }>,
): ProjectionDescriptor[] {
  const ast = _getSelect(options.sql);
  const source = ast ? _getSource(ast) : undefined;
  if (
    !ast ||
    !source ||
    !Array.isArray(ast.columns) ||
    !_hasSupportedGrouping(ast.groupby, source)
  ) {
    return [];
  }
  const first: unknown = ast.columns[0];
  if (
    ast.columns.length === 1 &&
    isPlainObject(first) &&
    !first.as &&
    _getColumn(first.expr, source) === "*"
  ) {
    return options.columns.map((column) => {
      return _createDescriptor(source, column.name, column.name);
    });
  }
  const projections = ast.columns.map((item: unknown) => {
    return _getProjection(item, source);
  });
  return projections.every((projection) => {
    return projection !== undefined;
  })
    ? projections
    : [];
}
