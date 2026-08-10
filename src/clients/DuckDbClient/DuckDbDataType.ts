import { constant } from "@avandar/utils";
import { match } from "ts-pattern";
import type { AvaDataTypeT } from "$/models/datasets/AvaDataType/AvaDataType.types";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";

/**
 * This is a subset of DuckDBDataType. These are the possible data that
 * DuckDB outputs when sniffing a CSV file.
 */
export type DuckDbSniffableDataType = Extract<
  DuckDbDataType,
  "BOOLEAN" | "BIGINT" | "DOUBLE" | "TIME" | "DATE" | "TIMESTAMP" | "VARCHAR"
>;

export const DuckDbDataTypeUtils = {
  isDateOrTimestamp: (duckDbDataType: DuckDbDataType): boolean => {
    return [
      "DATE",
      "TIME",
      "TIMESTAMP",
      "TIMESTAMP_TZ",
      "TIMESTAMP WITH TIME ZONE",
    ].includes(duckDbDataType);
  },

  /**
   * Converts a DuckDB data type to an Avandar data type.
   */
  // TODO(jpsyx): move this to AvaDataTypeUtils and rename to
  // `fromDuckDbDataType`
  toAvaDataType: (duckDbDataType: DuckDbDataType): AvaDataTypeT => {
    return (
      match(duckDbDataType)
        .with(
          "TINYINT",
          "SMALLINT",
          "INTEGER",
          "BIGINT",
          "UBIGINT",
          "UTINYINT",
          "USMALLINT",
          "UINTEGER",
          "HUGEINT",
          constant("bigint" as const),
        )
        .with("FLOAT", "DOUBLE", "DECIMAL", constant("double" as const))
        .with("TIME", constant("time" as const))
        .with("DATE", constant("date" as const))
        .with(
          "TIMESTAMP",
          "TIMESTAMP_TZ",
          "TIMESTAMP WITH TIME ZONE",
          constant("timestamp" as const),
        )
        .with("VARCHAR", "UUID", constant("varchar" as const))
        .with("BOOLEAN", constant("boolean" as const))
        // data types that we cannot support yet
        .with(
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
            return "varchar" as const;
          },
        )
        .exhaustive()
    );
  },

  // TODO(jpsyx): move this to AvaDataTypeUtils and rename to
  // `toDuckDbDataType`
  fromDatasetColumnType: (
    datasetColumnType: AvaDataTypeT,
  ): DuckDbSniffableDataType => {
    return match(datasetColumnType)
      .with("varchar", constant("VARCHAR" as const))
      .with("bigint", constant("BIGINT" as const))
      .with("double", constant("DOUBLE" as const))
      .with("time", constant("TIME" as const))
      .with("date", constant("DATE" as const))
      .with("timestamp", constant("TIMESTAMP" as const))
      .with("boolean", constant("BOOLEAN" as const))
      .exhaustive();
  },
};
