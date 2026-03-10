import { registry } from "@avandar/utils";
import { matchLiteral } from "$/lib/strings/matchLiteral.ts";
import { match } from "ts-pattern";
import type { AvaDataType } from "./AvaDataType.types.ts";
import type { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";

export const AvaDataTypes = {
  /** Data types that can be handled in Avandar. */
  Types: registry<AvaDataType>().keys(
    "varchar",
    "bigint",
    "double",
    "time",
    "date",
    "timestamp",
    "boolean",
  ),
  isText: (avaDataType: AvaDataType): avaDataType is "varchar" => {
    return avaDataType === "varchar";
  },
  isNumeric: (avaDataType: AvaDataType): avaDataType is "bigint" | "double" => {
    return avaDataType === "bigint" || avaDataType === "double";
  },
  toDisplayValue: (avaDataType: AvaDataType): string => {
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
    avaDataType: AvaDataType,
  ): avaDataType is "date" | "time" | "timestamp" => {
    return (
      avaDataType === "date" ||
      avaDataType === "time" ||
      avaDataType === "timestamp"
    );
  },
  getValidQueryAggregations: (
    avaDataType: AvaDataType,
  ): readonly QueryAggregationType[] => {
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
