import { match } from "ts-pattern";

import { FilterOperator } from "@/lib/utils/filters/filters.types";

export function doesValuePassFilters(
  value: unknown,
  operator: FilterOperator,
  targetValue: unknown,
): boolean {
  return match(operator)
    .with("eq", () => {
      return value === targetValue;
    })
    .with("in", () => {
      if (Array.isArray(targetValue)) {
        return targetValue.includes(value);
      }
      return false;
    })
    .exhaustive();
}
