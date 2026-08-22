import type { DuckDbLoadParquetOptions } from "@/clients/DuckDbClient/duckDbClientOperations";

import { objectEntries, objectKeys, prop } from "@avandar/utils";

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

/**
 * Prefix of the table that stages one concept's generated individuals.
 *
 * Deliberately not a `RelationRef` prefix, for the same reason as
 * `ava_rows_`: the staging table is an intermediate of individual generation,
 * never a relation a query may name, so `RelationRef.fromTableName` must not
 * resolve it.
 */
const STAGING_INDIVIDUALS_TABLE_PREFIX = "ava_staging_individuals_";

/**
 * Names the table that individual generation writes its rows to before they
 * are upserted into Postgres.
 *
 * This table used to be named with the concept's **bare** id, which broke the
 * invariant `RelationRef.fromTableName` encodes: a bare UUID in a table name
 * always means a dataset. A concept's staging table was therefore
 * indistinguishable from a dataset's table, so the catalog held a name that
 * read back as a dataset reference for an id that is not a dataset. Every
 * later consumer of `fromTableName` trusts that invariant, so the prefix is
 * required rather than cosmetic.
 */
export function getStagingIndividualsTableName(conceptId: string): string {
  return `${STAGING_INDIVIDUALS_TABLE_PREFIX}${conceptId}`;
}

/**
 * Reports whether a DuckDB table name is an individual-generation staging
 * table.
 *
 * The SQL analyzer needs this for the same reason it needs
 * `getTableNameFromRowNumberedViewName`: it fails closed on any source name it
 * cannot account for, and `generateIndividuals` reads its own staging table
 * back (`DESCRIBE`, `SELECT count(*)`, and the paged `SELECT`) through
 * `runRawQuery`. Before the `ava_staging_individuals_` prefix existed the table
 * was named with the concept's bare id, which the analyzer resolved as a
 * dataset and therefore allowed; adding the prefix made every one of those
 * reads `uninspectable-source`, so the sync threw the moment the upsert began.
 *
 * Unlike an `ava_rows_` view, a staging table reads no dataset: it is a
 * materialized table the caller just created from relations it was already
 * authorized for, so it contributes no relation and needs no lease of its own.
 */
export function isStagingIndividualsTableName(tableName: string): boolean {
  return tableName.startsWith(STAGING_INDIVIDUALS_TABLE_PREFIX);
}

/**
 * The dataset table an `ava_rows_` view reads, or undefined for any other name.
 *
 * The inverse of `getRowNumberedViewName`, and the SQL analyzer's reason for
 * needing it is not cosmetic: the auxiliary view reads the dataset's own
 * registered parquet file, so a statement naming it is a read of that dataset
 * and needs that dataset's lease and its authorization. Without this the
 * analyzer cannot account for the name at all and refuses the statement, which
 * silently disables every `first` value picker.
 */
export function getTableNameFromRowNumberedViewName(
  viewName: string,
): string | undefined {
  return viewName.startsWith(ROW_NUMBERED_VIEW_PREFIX)
    ? viewName.slice(ROW_NUMBERED_VIEW_PREFIX.length)
    : undefined;
}

/**
 * Matches an outer table's entity key to a contributing dataset's key column,
 * comparing both as text.
 *
 * The cast is required rather than defensive. The keys arriving on the two
 * sides are not guaranteed to share a DuckDB type: a concept's spine carries
 * `individuals.external_id`, which is `text` in Postgres, while the dataset's
 * key column carries whatever its parquet file says, commonly `BIGINT`. DuckDB
 * resolves `VARCHAR = BIGINT` by casting the VARCHAR side to the number, which
 * raises a conversion error the moment one id is not numeric, so the whole
 * query fails on data that is perfectly valid. Casting both sides to VARCHAR
 * instead compares them the way Postgres stores them.
 *
 * It is also a fix, not only an enabler, for `generateIndividuals`: its
 * `external_ids` CTE is a `UNION ALL` across several datasets' key columns, so
 * that column is already VARCHAR whenever those datasets disagree, and it was
 * already being compared against a possibly numeric key column.
 *
 * Equal values always produce equal casts, so no caller loses a match it had
 * before.
 */
export function getEntityKeyComparisonSql(
  options: Readonly<{
    /** The alias the outer table carrying the entity keys is joined under. */
    externalIdsTable: string;
    externalIdColumn: string;
    /** The contributing dataset's key column, under the `dataset` alias. */
    primaryKeyColumnName: string;
  }>,
): string {
  return (
    `CAST("${options.externalIdsTable}"."${options.externalIdColumn}" AS VARCHAR)` +
    ` = CAST(dataset."${options.primaryKeyColumnName}" AS VARCHAR)`
  );
}

/** Builds the `EXCLUDE`/replacement clauses for a parquet projection. */
export function getParquetProjectionClauses(
  columnReplacements: DuckDbLoadParquetOptions["columnReplacements"],
): { excludeClause: string; replaceClause: string } {
  const projections = objectEntries(columnReplacements ?? {}).map(
    ([columnName, { alias, dataType }]) => {
      const outputName = alias ?? columnName;
      const valueExpression = dataType
        ? `TRY_CAST("${columnName}" AS ${dataType})`
        : `"${columnName}"`;
      return {
        exclusion: `"${columnName}"`,
        replacement: `${valueExpression} AS "${outputName}"`,
      };
    },
  );
  return {
    excludeClause:
      projections.length > 0
        ? `EXCLUDE (${projections.map(prop("exclusion")).join(", ")})`
        : "",
    replaceClause:
      projections.length > 0
        ? `, ${projections.map(prop("replacement")).join(", ")}`
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
