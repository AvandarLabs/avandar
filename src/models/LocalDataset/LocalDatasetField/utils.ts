import * as arrow from "apache-arrow";
import { match } from "ts-pattern";
import { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import { EntityFieldBaseType } from "@/models/EntityConfig/EntityFieldConfig/types";
import { FieldDataType } from "./types";

/*
 * Converts a dataset field data type to its equivalent Arrow data type.
 * @param dataType The field data type.
 * @returns The Arrow data type.
 */
export function getArrowDataType(dataType: FieldDataType): arrow.DataType {
  return match(dataType)
    .with("string", () => {
      return new arrow.Utf8();
    })
    .with("number", () => {
      return new arrow.Float64();
    })
    .with("date", () => {
      return new arrow.TimestampMillisecond();
    })
    .exhaustive();
}

/**
 * Converts a dataset field data type to its equivalent EntityFieldBaseType.
 * @param dataType The field data type.
 * @returns The EntityFieldBaseType.
 */
export function getEntityFieldBaseDataType(
  dataType: FieldDataType,
): EntityFieldBaseType {
  return match(dataType)
    .with("string", () => {
      return "string" as const;
    })
    .with("number", () => {
      return "number" as const;
    })
    .with("date", () => {
      return "date" as const;
    })
    .exhaustive();
}

export function getValidQueryAggregationsByType(
  dataType: FieldDataType,
): readonly QueryAggregationType[] {
  return match(dataType)
    .with("string", () => {
      return ["count"] as const;
    })
    .with("number", () => {
      return ["sum", "avg", "count", "max", "min"] as const;
    })
    .with("date", () => {
      return ["count"] as const;
    })
    .exhaustive();
}
