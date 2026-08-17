import { isDefined } from "@avandar/utils";
import { escapeSqlSingleQuotedLiteral } from "@/clients/DuckDbClient/duckDbSqlText";
import type { DuckDbSniffableDataType } from "@/clients/DuckDbClient/DuckDbDataType";

type BuildCastProbeSqlOptions = {
  /** Sampled values from the column, as the preview read them. */
  values: readonly unknown[];
  /** The DuckDB type the user wants the column cast to. */
  targetDataType: DuckDbSniffableDataType;
};

/** Renders one sampled value as the text DuckDB will be asked to cast. */
function _toProbeText(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

/**
 * Builds a query counting how many sampled values a cast would turn into null.
 *
 * The values are inlined as a `VALUES` list rather than read from a file,
 * because by the time the import form can offer a type change the CSV staging
 * file has been dropped and the parquet may still be transcoding. An inline
 * list needs no file and no dataset lease, and it puts the question to DuckDB
 * itself: `TRY_CAST` has enough quirks (`'7.9'` to `BIGINT` rounds to 8 rather
 * than failing, a bare date to `TIME` yields midnight) that reimplementing its
 * rules in TypeScript would drift from what the dataset's view actually does.
 *
 * Returns `undefined` when there is nothing to ask about, since a `VALUES` list
 * needs at least one row.
 */
export function buildCastProbeSql(
  options: Readonly<BuildCastProbeSqlOptions>,
): string | undefined {
  const probeTexts = options.values.map(_toProbeText).filter(isDefined);
  if (probeTexts.length === 0) {
    return undefined;
  }
  const valuesList = probeTexts
    .map((probeText) => {
      return `('${escapeSqlSingleQuotedLiteral(probeText)}')`;
    })
    .join(", ");

  return `SELECT
      COUNT(*) AS num_values,
      COUNT(*) FILTER (
        WHERE TRY_CAST(probe_value AS ${options.targetDataType}) IS NULL
      ) AS num_uncastable
    FROM (VALUES ${valuesList}) probe(probe_value)`;
}
