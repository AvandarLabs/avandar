import { match } from "ts-pattern";
import { DatasetColumnDataType } from "@/models/datasets/DatasetColumn";

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

/**
 * This is a subset of DuckDBDataType. These are the possible data that
 * DuckDB outputs when sniffing a CSV file.
 */
export type DuckDBSniffableDataType = Extract<
  DuckDBDataType,
  "BOOLEAN" | "BIGINT" | "DOUBLE" | "TIME" | "DATE" | "TIMESTAMP" | "VARCHAR"
>;

export const DuckDBDataTypeUtils = {
  isDateOrTimestamp: (duckDBDataType: DuckDBDataType): boolean => {
    return [
      "DATE",
      "TIME",
      "TIMESTAMP",
      "TIMESTAMP_TZ",
      "TIMESTAMP WITH TIME ZONE",
    ].includes(duckDBDataType);
  },

  /**
   * Converts a DuckDB data type to a DatasetColumn data type.
   */
  toDatasetColumnDataType: (
    duckDBDataType: DuckDBDataType,
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
        .with(
          "DATE",
          "TIME",
          "TIMESTAMP",
          "TIMESTAMP_TZ",
          "TIMESTAMP WITH TIME ZONE",
          () => {
            return "date" as const;
          },
        )
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

  // TODO(jpsyx): add support for other data types with more
  // specificity. E.g. date vs. timestamp.
  fromDatasetColumnType: (
    datasetColumnType: DatasetColumnDataType,
  ): DuckDBSniffableDataType => {
    return match(datasetColumnType)
      .with("text", () => {
        return "VARCHAR" as const;
      })
      .with("number", () => {
        return "DOUBLE" as const;
      })
      .with("date", () => {
        return "TIMESTAMP" as const;
      })
      .exhaustive();
  },
};
