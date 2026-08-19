import { objectEntries, objectKeys, prop } from "@avandar/utils";
import type { DuckDbLoadParquetOptions } from "@/clients/DuckDbClient/duckDbClientOperations";

/** Escapes a value for use inside a single-quoted SQL string literal. */
export function escapeSqlSingleQuotedLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

/**
 * Prefix of the auxiliary view that exposes a dataset's physical row order.
 *
 * Deliberately not a `RelationRef` prefix: an `ava_rows_` view is an internal
 * implementation detail of ordering, never a relation a query may name, so
 * `RelationRef.fromTableName` must not resolve it.
 */
const ROW_NUMBERED_VIEW_PREFIX = "ava_rows_";

/**
 * Names the auxiliary view that carries a dataset's `file_row_number`.
 *
 * A dataset's public view is `SELECT * FROM read_parquet(...)` without
 * `file_row_number = true`, which verifiably hides the column, and adding it
 * there would leak an internal column into every `SELECT *` in the product. So
 * ordering reads a parallel view instead. This is what gives the `first` value
 * picker a **total** order: contributing dataset, then physical row.
 */
export function getRowNumberedViewName(tableName: string): string {
  return `${ROW_NUMBERED_VIEW_PREFIX}${tableName}`;
}

/** Builds the `EXCLUDE`/replacement clauses for a parquet projection. */
export function getParquetProjectionClauses(
  columnReplacements: DuckDbLoadParquetOptions["columnReplacements"],
): { excludeClause: string; replaceClause: string } {
  const projections = objectEntries(columnReplacements ?? {}).map(
    ([columnName, { alias, dataType }]) => {
      const outputName = alias ?? columnName;
      const valueExpression =
        dataType ?
          `TRY_CAST("${columnName}" AS ${dataType})`
        : `"${columnName}"`;
      return {
        exclusion: `"${columnName}"`,
        replacement: `${valueExpression} AS "${outputName}"`,
      };
    },
  );
  return {
    excludeClause:
      projections.length > 0 ?
        `EXCLUDE (${projections.map(prop("exclusion")).join(", ")})`
      : "",
    replaceClause:
      projections.length > 0 ?
        `, ${projections.map(prop("replacement")).join(", ")}`
      : "",
  };
}

/** Substitutes `$name$` placeholders in a query with their parameters. */
export function getQueryStringFromParams(
  options: Readonly<{
    params: Record<string, string | number | bigint | undefined>;
    queryString: string;
  }>,
): string {
  return objectKeys(options.params).reduce((currentQuery, parameterName) => {
    const argumentValue = options.params[parameterName];
    if (argumentValue === undefined) {
      return currentQuery;
    }
    return currentQuery.replace(
      new RegExp(`\\$${parameterName}\\$`, "g"),
      String(argumentValue),
    );
  }, options.queryString);
}

/** Flattens dataset ID groups into one list without duplicates. */
export function mergeDuckDbDatasetIds(
  ...datasetIdGroups: readonly string[][]
): string[] {
  return Array.from(new Set(datasetIdGroups.flat()));
}
