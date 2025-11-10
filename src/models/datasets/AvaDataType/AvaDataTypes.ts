import { match } from "ts-pattern";
import { registryKeys } from "@/lib/utils/objects/misc";
import { matchLiteral } from "@/lib/utils/strings/matchLiteral";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";
import { AvaDataType } from "./AvaDataType.types";

export const AvaDataTypes = {
  /** Data types that can be handled in Avandar. */
  Types: registryKeys<AvaDataType>({
    varchar: true,
    bigint: true,
    double: true,
    time: true,
    date: true,
    timestamp: true,
    boolean: true,
  }),
  isText: (avaDataType: AvaDataType): avaDataType is "varchar" => {
    return avaDataType === "varchar";
  },
  isNumeric: (avaDataType: AvaDataType): avaDataType is "bigint" | "double" => {
    return avaDataType === "bigint" || avaDataType === "double";
  },
  toDisplayValue: (avaDataType: AvaDataType): string => {
    return matchLiteral(avaDataType, {
      varchar: "Text",
      bigint: "Number",
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
