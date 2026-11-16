import { matchLiteral, registry } from "@avandar/utils";
import { match } from "ts-pattern";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";

/**
 * The DuckDB type each Ava type is cast to, the same names
 * `datasets__ava_data_type_to_duckdb` gives in SQL.
 */
const DUCKDB_TYPE_SQL_BY_AVA_DATA_TYPE = {
  varchar: "VARCHAR",
  bigint: "BIGINT",
  double: "DOUBLE",
  time: "TIME",
  date: "DATE",
  timestamp: "TIMESTAMP",
  boolean: "BOOLEAN",
} as const satisfies Record<AvaDataType.T, string>;

export const AvaDataTypeModule = {
  /** Data types that can be handled in Avandar. */
  Types: registry<AvaDataType.T>().keys(
    "varchar",
    "bigint",
    "double",
    "time",
    "date",
    "timestamp",
    "boolean",
  ),
  isDateOrTimestamp: (
    avaDataType: AvaDataType.T,
  ): avaDataType is "date" | "time" | "timestamp" => {
    return ["date", "time", "timestamp"].includes(avaDataType);
  },
  isText: (avaDataType: AvaDataType.T): avaDataType is "varchar" => {
    return avaDataType === "varchar";
  },
  isNumeric: (
    avaDataType: AvaDataType.T,
  ): avaDataType is "bigint" | "double" => {
    return avaDataType === "bigint" || avaDataType === "double";
  },
  toDisplayValue: (avaDataType: AvaDataType.T): string => {
    return matchLiteral(avaDataType, {
      varchar: "Text",
      // "Whole number" and "Decimal" rather than "Integer" and "Number": the
      // words a user reads for a column's type are the same everywhere they
      // appear, and "Number" told them nothing that distinguished it from
      // "Integer". Kept in step with `avaDataTypeLabel` and
      // `buildFullDataTypeLabel`.
      bigint: "Whole number",
      double: "Decimal",
      time: "Time",
      date: "Date",
      timestamp: "Timestamp",
      boolean: "Boolean",
      _otherwise: avaDataType,
    });
  },

  /**
   * The DuckDB type a value of this Ava type is cast to in SQL, for example
   * when compiled SQL casts a column to the type its dataset column says.
   */
  toDuckDbTypeSql: (
    avaDataType: AvaDataType.T,
  ): (typeof DUCKDB_TYPE_SQL_BY_AVA_DATA_TYPE)[AvaDataType.T] => {
    return DUCKDB_TYPE_SQL_BY_AVA_DATA_TYPE[avaDataType];
  },

  isTemporal: (
    avaDataType: AvaDataType.T,
  ): avaDataType is "date" | "time" | "timestamp" => {
    return (
      avaDataType === "date" ||
      avaDataType === "time" ||
      avaDataType === "timestamp"
    );
  },
  getValidQueryAggregations: (
    avaDataType: AvaDataType.T,
  ): readonly QueryAggregationType.T[] => {
    const typeSpecificAggregations = match(avaDataType)
      .with("varchar", () => {
        return ["none", "count"] as const;
      })
      .with("boolean", () => {
        return ["count"] as const;
      })
      .with("bigint", "double", () => {
        return ["sum", "avg", "count", "max", "min"] as const;
      })
      .with("date", "time", "timestamp", () => {
        return ["count"] as const;
      })
      .exhaustive();
    return ["none", "group_by", ...typeSpecificAggregations];
  },
};
