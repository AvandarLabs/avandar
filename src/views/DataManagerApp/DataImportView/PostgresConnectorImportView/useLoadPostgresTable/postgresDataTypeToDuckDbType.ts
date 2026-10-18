import type { DuckDbSniffableDataType } from "@/clients/DuckDbClient/DuckDbDataType";

/**
 * Postgres column types, as `information_schema.columns.data_type` names
 * them, that have a queryable DuckDB type of their own. Every type not listed
 * here stays text.
 *
 * `time with time zone` is deliberately absent: DuckDB's `TIME` cast drops
 * the UTC offset without applying it, so `13:45:00+02` would silently read as
 * `13:45:00`.
 */
const DUCKDB_TYPE_BY_POSTGRES_DATA_TYPE: Readonly<
  Record<string, DuckDbSniffableDataType>
> = {
  smallint: "BIGINT",
  integer: "BIGINT",
  bigint: "BIGINT",
  real: "DOUBLE",
  "double precision": "DOUBLE",
  numeric: "DOUBLE",
  boolean: "BOOLEAN",
  date: "DATE",
  "timestamp without time zone": "TIMESTAMP",
  "timestamp with time zone": "TIMESTAMP",
  "time without time zone": "TIME",
};

/**
 * Converts a Postgres column's declared type into the DuckDB type the column
 * is queried as. The `connectors` proxy sends rows as CSV text, so a Postgres
 * dataset stores this as its column type and relation loading casts the text
 * to it, instead of trusting whatever DuckDB's CSV sniff guesses from the
 * values.
 */
export function postgresDataTypeToDuckDbType(
  postgresDataType: string,
): DuckDbSniffableDataType {
  return DUCKDB_TYPE_BY_POSTGRES_DATA_TYPE[postgresDataType] ?? "VARCHAR";
}
