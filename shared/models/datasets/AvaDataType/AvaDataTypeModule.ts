import { registry } from "@utils/objects/registry/registry.ts";
import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral.ts";
import { match } from "ts-pattern";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.ts";

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
      bigint: "Integer",
      double: "Number",
      time: "Time",
      date: "Date",
      timestamp: "Timestamp",
      boolean: "Boolean",
      _otherwise: avaDataType,
    });
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
