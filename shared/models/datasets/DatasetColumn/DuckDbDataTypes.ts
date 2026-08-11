import { registry } from "@avandar/utils";

export type DuckDbDataType =
  | "BOOLEAN"
  | "TINYINT"
  | "SMALLINT"
  | "INTEGER"
  | "BIGINT"
  | "UBIGINT"
  | "UTINYINT"
  | "USMALLINT"
  | "UINTEGER"
  | "FLOAT"
  | "DOUBLE"
  | "DECIMAL"
  | "DATE"
  | "TIME"
  | "TIMESTAMP"
  | "TIMESTAMP_TZ"
  | "TIMESTAMP WITH TIME ZONE"
  | "INTERVAL"
  | "VARCHAR"
  | "BLOB"
  | "UUID"
  | "HUGEINT"
  | "BIT"
  | "ENUM"
  | "MAP"
  | "STRUCT"
  | "LIST"
  | "UNION"
  | "JSON"
  | "GEOMETRY";

export const DuckDbDataTypes = registry<DuckDbDataType>().keys(
  "BOOLEAN",
  "TINYINT",
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "UBIGINT",
  "UTINYINT",
  "USMALLINT",
  "UINTEGER",
  "FLOAT",
  "DOUBLE",
  "DECIMAL",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMP_TZ",
  "TIMESTAMP WITH TIME ZONE",
  "INTERVAL",
  "VARCHAR",
  "BLOB",
  "UUID",
  "HUGEINT",
  "BIT",
  "ENUM",
  "MAP",
  "STRUCT",
  "LIST",
  "UNION",
  "JSON",
  "GEOMETRY",
);
