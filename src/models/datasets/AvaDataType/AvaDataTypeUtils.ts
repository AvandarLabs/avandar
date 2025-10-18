import { QueryAggregationType } from "@/clients/DuckDBClient/types";
import { match } from "ts-pattern";
import { AvaDataType } from "./AvaDataType.types";
import { registryKeys } from "@/lib/utils/objects/misc";

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
  isNumeric: (avaDataType: AvaDataType): avaDataType is "bigint" | "double" => {
    return avaDataType === "bigint" || avaDataType === "double";
  },
  getValidQueryAggregations: (
    avaDataType: AvaDataType,
  ): readonly QueryAggregationType[] => {
    return match(avaDataType)
      .with("varchar", () => {
        return ["count"] as const;
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
  },
};
