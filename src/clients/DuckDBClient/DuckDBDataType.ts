import { constant } from "$/lib/utils/constant/constant";
import { match } from "ts-pattern";
import { registryKeys } from "@/lib/utils/objects/misc";
import { AvaDataType } from "@/models/datasets/AvaDataType";

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

export const DuckDBDataTypes = registryKeys<DuckDBDataType>({
  BOOLEAN: true,
  TINYINT: true,
  SMALLINT: true,
  INTEGER: true,
  BIGINT: true,
  UBIGINT: true,
  UTINYINT: true,
  USMALLINT: true,
  UINTEGER: true,
  FLOAT: true,
  DOUBLE: true,
  DECIMAL: true,
  DATE: true,
  TIME: true,
  TIMESTAMP: true,
  TIMESTAMP_TZ: true,
  "TIMESTAMP WITH TIME ZONE": true,
  INTERVAL: true,
  VARCHAR: true,
  BLOB: true,
  UUID: true,
  HUGEINT: true,
  BIT: true,
  ENUM: true,
  MAP: true,
  STRUCT: true,
  LIST: true,
  UNION: true,
  JSON: true,
  GEOMETRY: true,
});

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
   * Converts a DuckDB data type to an Avandar data type.
   */
  // TODO(jpsyx): move this to AvaDataTypeUtils and rename to
  // `fromDuckDBDataType`
  toAvaDataType: (duckDBDataType: DuckDBDataType): AvaDataType => {
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
  // `toDuckDBDataType`
  fromDatasetColumnType: (
    datasetColumnType: AvaDataType,
  ): DuckDBSniffableDataType => {
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
