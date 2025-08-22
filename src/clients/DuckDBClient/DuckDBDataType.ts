import { match } from "ts-pattern";
import { DatasetColumnDataType } from "@/models/datasets/DatasetColumn";

export type DuckDBDataTypeT =
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

export const DuckDBDataType = {
  /**
   * Converts a DuckDB data type to a DatasetColumn data type.
   */
  toDatasetDataType: (
    duckDBDataType: DuckDBDataTypeT,
  ): DatasetColumnDataType => {
    return (
      match(duckDBDataType)
        .with(
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
          "HUGEINT",
          () => {
            return "number" as const;
          },
        )
        .with("DATE", "TIME", "TIMESTAMP", "TIMESTAMP_TZ", () => {
          return "date" as const;
        })
        .with("VARCHAR", "UUID", () => {
          return "text" as const;
        })
        // data types that we cannot support yet
        .with(
          "BOOLEAN",
          "INTERVAL",
          "BLOB",
          "BIT",
          "ENUM",
          "MAP",
          "STRUCT",
          "LIST",
          "UNION",
          "JSON",
          "GEOMETRY",
          () => {
            // TODO(jpsyx): we will just call these "text" for now
            // until we need to handle these differently.
            return "text" as const;
          },
        )
        .exhaustive()
    );
  },
};
