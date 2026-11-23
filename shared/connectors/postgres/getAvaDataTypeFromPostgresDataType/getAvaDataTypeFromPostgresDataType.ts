import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

/**
 * Postgres column types, as `information_schema.columns.data_type` names
 * them, that have a queryable type of their own. Every type not listed here
 * is queried as text.
 *
 * `time with time zone` is deliberately absent: DuckDB's `TIME` cast drops
 * the UTC offset without applying it, so `13:45:00+02` would silently read as
 * `13:45:00`.
 */
const AVA_DATA_TYPE_BY_POSTGRES_DATA_TYPE: Readonly<
  Record<string, AvaDataType.T>
> = {
  smallint: "bigint",
  integer: "bigint",
  bigint: "bigint",
  real: "double",
  "double precision": "double",
  numeric: "double",
  boolean: "boolean",
  date: "date",
  "timestamp without time zone": "timestamp",
  "timestamp with time zone": "timestamp",
  "time without time zone": "time",
};

/**
 * The type a Postgres column is queried as, read from the type its table
 * declares rather than guessed from its values. The edge function and the
 * browser both import it from here, so a connection reports the same type at
 * import as the one its rows are cast to at query time.
 */
export function getAvaDataTypeFromPostgresDataType(
  postgresDataType: string,
): AvaDataType.T {
  return AVA_DATA_TYPE_BY_POSTGRES_DATA_TYPE[postgresDataType] ?? "varchar";
}
