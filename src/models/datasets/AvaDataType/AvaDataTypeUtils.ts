import { match } from "ts-pattern";
import { AvaDataType } from "./AvaDataType.types";
import { registryKeys } from "@/lib/utils/objects/misc";
import { QueryAggregationType } from "@/models/queries/QueryAggregationType";

/**
 * Data types that can be handled in Avandar.
 */
export const AvaDataTypes = registryKeys<AvaDataType>(
  {
    varchar: true,
    bigint: true,
    double: true,
    time: true,
    date: true,
    timestamp: true,
    boolean: true,
  },
);

export const AvaDataTypeUtils = {
  isText: (avaDataType: AvaDataType): avaDataType is "varchar" => {
    return avaDataType === "varchar";
  },
  isNumeric: (avaDataType: AvaDataType): avaDataType is "bigint" | "double" => {
    return avaDataType === "bigint" || avaDataType === "double";
  },
  isTemporal: (
    avaDataType: AvaDataType,
  ): avaDataType is "date" | "time" | "timestamp" => {
    return avaDataType === "date" || avaDataType === "time" ||
      avaDataType === "timestamp";
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
