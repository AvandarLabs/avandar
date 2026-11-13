import { quoteSqlIdentifier, quoteSqlLiteral } from "@avandar/utils/sql";
import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import { getRawValuesViewName } from "@/clients/DuckDbClient/duckDbSqlText";

/** The most distinct values the count reads before it stops. */
const MAX_COUNTED_VALUES = 1000;

/**
 * SQL counting the distinct values of a converted column that no pair
 * labels, read from the dataset's raw-values view, as `unlabeled_count`.
 * A value an override maps to a label or empties has a result of its own
 * and is not counted; a value kept as is still has no label and is.
 * Stops at 1,000 values. Used by a converted column's code-list popover.
 */
export function buildUnlabeledValueCountSql(
  options: Readonly<{
    datasetId: string;
    columnName: string;
    conversion: ColumnConversion.T;
  }>,
): string {
  const unmatchedSql = ColumnConversion.toUnmatchedValuesSql({
    relationSql: quoteSqlIdentifier(getRawValuesViewName(options.datasetId)),
    valueSql: quoteSqlIdentifier(options.columnName),
    conversion: { ...options.conversion, overrides: [] },
    limit: MAX_COUNTED_VALUES,
  });
  const resolvedKeys = options.conversion.overrides
    .filter((override) => {
      return override.action !== "keep";
    })
    .map((override) => {
      return `lower(trim(${quoteSqlLiteral(override.value)}))`;
    });
  const filter =
    resolvedKeys.length === 0
      ? ""
      : ` WHERE ${ColumnConversion.toValueKeySql('unmatched."value"')} NOT IN (${resolvedKeys.join(", ")})`;
  return `SELECT count(*) AS unlabeled_count FROM (${unmatchedSql}) AS unmatched${filter}`;
}
