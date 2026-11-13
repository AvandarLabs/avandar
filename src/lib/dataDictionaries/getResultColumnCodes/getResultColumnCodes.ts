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
export function getSourceDatasetId(
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
 * The code list of each result column that is a bound dataset column
 * selected as is, by result column name. A column that was aggregated,
 * computed, or renamed from another dataset gets none.
 */
export function getResultColumnCodes(
  options: Readonly<{
    projections: ReadonlyArray<
      Pick<ProjectionDescriptor, "sqlExpressionKey" | "queryResultColumnName">
    >;
    datasetId: Dataset.Id;
    codesByColumnName: ReadonlyMap<string, ColumnCodes.T>;
  }>,
): Map<string, ColumnCodes.T> {
  const result = new Map<string, ColumnCodes.T>();
  options.projections.forEach((projection) => {
    const plain = _readPlainColumn(projection);
    const codes = plain
      ? options.codesByColumnName.get(plain.column)
      : undefined;
    if (plain?.table === options.datasetId && codes && codes.pairs.length > 0) {
      result.set(projection.queryResultColumnName, codes);
    }
  });
  return result;
}
