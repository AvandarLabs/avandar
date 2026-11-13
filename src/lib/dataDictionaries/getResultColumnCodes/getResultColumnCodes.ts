import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ProjectionDescriptor } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";

/** A projection's source table and column, when it selects one column as is. */
type PlainColumn = { table: string; column: string };

/**
 * Reads `makeSqlExpressionKeyFromColumnExpression`'s key back: the table
 * and column of a projection that selects a column with no aggregation.
 * Undefined for an aggregate, an expression, or a qualified table.
 */
function _readPlainColumn(
  projection: Pick<ProjectionDescriptor, "sqlExpressionKey">,
): PlainColumn | undefined {
  try {
    const key: unknown = JSON.parse(projection.sqlExpressionKey);
    if (!Array.isArray(key) || key[0] !== "sql" || key[3] !== "none") {
      return undefined;
    }
    const [database, schema, table] = key[1] as unknown[];
    const column = key[2];
    return database === null &&
      schema === null &&
      typeof table === "string" &&
      typeof column === "string"
      ? { table, column }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The one dataset every plain column of a query result comes from, or
 * undefined when there is none or several. Use it to look up the codes of
 * a result's columns, for example in the Data Explorer.
 */
export function getSourceDatasetIdFromProjections(
  projections: ReadonlyArray<Pick<ProjectionDescriptor, "sqlExpressionKey">>,
): Dataset.Id | undefined {
  const datasetIds = new Set(
    projections.flatMap((projection) => {
      const plain = _readPlainColumn(projection);
      const ref = plain ? RelationRef.fromTableName(plain.table) : undefined;
      return ref?.kind === "dataset" ? [ref.id] : [];
    }),
  );
  return datasetIds.size === 1 ? [...datasetIds][0] : undefined;
}

/**
 * Finds `name` among `names` the way DuckDB resolves identifiers: an exact
 * match first, then the one match that differs only in case. Undefined when
 * there is no match, or several that differ only in case.
 */
function _findNameIgnoringCase(
  name: string,
  names: Iterable<string>,
): string | undefined {
  const candidates = [...names];
  if (candidates.includes(name)) {
    return name;
  }
  const lowerName = name.toLowerCase();
  const matches = candidates.filter((candidate) => {
    return candidate.toLowerCase() === lowerName;
  });
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * The code list of each result column that is a bound dataset column
 * selected as is, keyed by the result column's own name. DuckDB matches
 * identifiers without regard to case and returns the stored spelling, so
 * `SELECT gender` finds the codes of `GENDER` and is keyed `GENDER`. A
 * column that was aggregated, computed, or selected from another dataset
 * gets none, and so does one missing from `resultColumnNames`.
 */
export function getResultColumnCodes(
  options: Readonly<{
    projections: ReadonlyArray<
      Pick<ProjectionDescriptor, "sqlExpressionKey" | "queryResultColumnName">
    >;
    datasetId: Dataset.Id;
    codesByColumnName: ReadonlyMap<string, ColumnCodes.T>;
    /** The names of the query result's columns, as the grid shows them. */
    resultColumnNames: readonly string[];
  }>,
): Map<string, ColumnCodes.T> {
  const result = new Map<string, ColumnCodes.T>();
  options.projections.forEach((projection) => {
    const plain = _readPlainColumn(projection);
    if (plain?.table !== options.datasetId) {
      return;
    }
    const codeColumnName = _findNameIgnoringCase(
      plain.column,
      options.codesByColumnName.keys(),
    );
    const codes = codeColumnName
      ? options.codesByColumnName.get(codeColumnName)
      : undefined;
    const resultColumnName = _findNameIgnoringCase(
      projection.queryResultColumnName,
      options.resultColumnNames,
    );
    if (codes && codes.pairs.length > 0 && resultColumnName) {
      result.set(resultColumnName, codes);
    }
  });
  return result;
}
