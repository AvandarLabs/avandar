import { isDefined, isNullish } from "@avandar/utils";
import { escapeSqlSingleQuotedLiteral } from "@/clients/DuckDbClient/duckDbSqlText";
import type { DuckDbSniffableDataType } from "@/clients/DuckDbClient/DuckDbDataType";

type MakeCastProbeSqlOptions = {
  /** Sampled values from the column, as the preview read them. */
  values: readonly unknown[];
  /** The DuckDB type the user wants the column cast to. */
  targetDataType: DuckDbSniffableDataType;
};

/** Renders one sampled value as the text DuckDB will be asked to cast. */
function _toProbeText(value: unknown): string | undefined {
  return (
    isNullish(value) ? undefined
    : value instanceof Date ? value.toISOString()
    : String(value)
  );
}

/**
 * Builds a query counting how many sampled values a cast would turn into null.
 *
 * The probe asks DuckDB rather than reimplementing `TRY_CAST` in TypeScript:
 * `'7.9'` to `BIGINT` rounds to 8 rather than failing, and a bare date to
 * `TIME` yields midnight, so a local checker would drift from what the
 * dataset's view actually does.
 *
 * Returns `undefined` when there is nothing to ask about.
 */
export function makeCastProbeSqlFromValues(
  options: Readonly<MakeCastProbeSqlOptions>,
): string | undefined {
  const probeTexts = options.values.map(_toProbeText).filter(isDefined);
  if (probeTexts.length === 0) {
    return undefined;
  }
  // Inlined as a VALUES list: by the time the import form offers a type change
  // the CSV staging file is gone, and the parquet may still be transcoding.
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
