import { registry } from "@utils/objects/registry/registry.ts";

export type DuckDBDataType =
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

export const DuckDBDataTypes = registry<DuckDBDataType>().keys(
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
