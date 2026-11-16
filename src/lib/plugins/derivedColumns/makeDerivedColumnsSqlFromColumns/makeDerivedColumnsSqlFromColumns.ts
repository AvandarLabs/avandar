import { PluginError } from "@avandar/plugin-sdk";
import {
  normalizeSqlForSubquery,
  quoteSqlIdentifier,
} from "@avandar/utils/sql";
import { assertSingleSqlExpression } from "@/lib/plugins/derivedColumns/assertSingleSqlExpression/assertSingleSqlExpression";
import type { DerivedColumn } from "@avandar/plugin-sdk";

/** The names a derived column may take: lowercase snake case. */
const COLUMN_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/** The row number column the wrapper injects, which the host reserves. */
const ROW_NUMBER_COLUMN_NAME = "__ava_row";

/** A `{placeholder}` in an expression, capturing the key it names. */
const PLACEHOLDER_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

function _isStringRecord(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => {
      return typeof entry === "string";
    })
  );
}

function _isDerivedColumnShape(column: unknown): boolean {
  return (
    typeof column === "object" &&
    column !== null &&
    typeof Reflect.get(column, "name") === "string" &&
    typeof Reflect.get(column, "expression") === "string" &&
    _isStringRecord(Reflect.get(column, "inputs"))
  );
}

/**
 * Plugin code is not type-checked against the host, so `columns` can arrive
 * in any shape. Throws `PluginError("InvalidExpression")` unless it is an
 * array of objects with a string `name`, a string `expression`, and an
 * `inputs` object whose values are strings.
 */
function _assertDerivedColumnShapes(columns: unknown): void {
  if (!Array.isArray(columns)) {
    throw new PluginError(
      "InvalidExpression",
      "addColumns needs an array of columns.",
    );
  }
  columns.forEach((column, index) => {
    if (!_isDerivedColumnShape(column)) {
      throw new PluginError(
        "InvalidExpression",
        `Column ${index + 1} must be an object with a string name, a string expression, and an inputs object of column names.`,
      );
    }
  });
}

function _buildExpressionSql(
  column: DerivedColumn,
  existingColumnNames: ReadonlySet<string>,
): string {
  if (!COLUMN_NAME_PATTERN.test(column.name)) {
    throw new PluginError(
      "InvalidExpression",
      `Column name "${column.name}" must be lowercase letters, digits, and underscores, starting with a letter.`,
    );
  }
  Object.values(column.inputs).forEach((inputColumnName) => {
    if (!existingColumnNames.has(inputColumnName)) {
      throw new PluginError(
        "InvalidExpression",
        `Column "${column.name}" reads "${inputColumnName}", which this query result does not have.`,
      );
    }
  });
  const expressionSql = column.expression.replace(
    PLACEHOLDER_PATTERN,
    (_placeholder, key: string) => {
      const inputColumnName = Object.hasOwn(column.inputs, key)
        ? column.inputs[key]
        : undefined;
      if (inputColumnName === undefined) {
        throw new PluginError(
          "InvalidExpression",
          `Column "${column.name}" uses {${key}}, which its inputs do not bind.`,
        );
      }
      return quoteSqlIdentifier(inputColumnName);
    },
  );
  assertSingleSqlExpression(expressionSql);
  return expressionSql;
}

function _buildFreeName(
  name: string,
  takenNames: ReadonlySet<string>,
  suffix: number = 1,
): string {
  const candidate = suffix === 1 ? name : `${name}_${suffix}`;
  return takenNames.has(candidate.toLowerCase())
    ? _buildFreeName(name, takenNames, suffix + 1)
    : candidate;
}

function _buildAddedColumns(
  columns: readonly DerivedColumn[],
  existingColumnNames: readonly string[],
): Array<{ name: string; expressionSql: string }> {
  const existingNameSet = new Set(existingColumnNames);
  const takenNames = new Set(
    existingColumnNames.map((name) => {
      return name.toLowerCase();
    }),
  );
  return columns.map((column) => {
    const expressionSql = _buildExpressionSql(column, existingNameSet);
    // Names are lowercase, so the free name can join the lowercased set as is.
    const name = _buildFreeName(column.name, takenNames);
    takenNames.add(name);
    return { name, expressionSql };
  });
}

function _assertNoReservedColumn(existingColumnNames: readonly string[]): void {
  const hasReservedColumn = existingColumnNames.some((name) => {
    return name.toLowerCase() === ROW_NUMBER_COLUMN_NAME;
  });
  if (hasReservedColumn) {
    throw new PluginError(
      "InvalidExpression",
      `This query result already has a column named "${ROW_NUMBER_COLUMN_NAME}", which the host reserves.`,
    );
  }
}

/**
 * Makes the SQL that adds `columns` to the result of `baseSql`, plus the
 * names the columns were added under (a name already in the result, compared
 * case-insensitively, gets `_2`, then `_3`, and so on). Each `{placeholder}`
 * becomes the quoted identifier of the column its input names. A row number
 * keeps the base query's row order, which a window expression would
 * otherwise change.
 *
 * Throws `PluginError("InvalidExpression")` for `columns` that are not an
 * array of well-formed `DerivedColumn` objects, an empty list, a result with
 * a reserved `__ava_row` column, a bad name, an
 * unbound placeholder, an input naming a column not in
 * `existingColumnNames`, or an expression that is not exactly one SQL
 * expression. Used by `addColumnsForInvocation` for
 * `avandar.dataExplorer.addColumns`.
 */
export function makeDerivedColumnsSqlFromColumns(
  options: Readonly<{
    baseSql: string;
    existingColumnNames: readonly string[];
    columns: readonly DerivedColumn[];
  }>,
): Readonly<{ sql: string; columnNames: readonly string[] }> {
  const { baseSql, existingColumnNames, columns } = options;
  _assertDerivedColumnShapes(columns);
  if (columns.length === 0) {
    throw new PluginError(
      "InvalidExpression",
      "addColumns needs at least one column.",
    );
  }
  _assertNoReservedColumn(existingColumnNames);
  const addedColumns = _buildAddedColumns(columns, existingColumnNames);
  const sql = [
    "WITH ava_source AS (",
    "  SELECT *, row_number() OVER () AS __ava_row FROM (",
    normalizeSqlForSubquery(baseSql),
    "  )",
    ")",
    "SELECT * EXCLUDE (__ava_row),",
    addedColumns
      .map(({ name, expressionSql }) => {
        return `  (${expressionSql}) AS ${quoteSqlIdentifier(name)}`;
      })
      .join(",\n"),
    "FROM ava_source",
    "ORDER BY __ava_row",
  ].join("\n");
  return {
    sql,
    columnNames: addedColumns.map((addedColumn) => {
      return addedColumn.name;
    }),
  };
}
