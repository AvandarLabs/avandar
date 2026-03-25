import { match } from "ts-pattern";
import type { FilterOperator } from "@utils/filters/filters.ts";

export const isSingleValueOperator = (
  operator: FilterOperator,
): operator is "eq" => {
  return match(operator)
    .with("eq", () => {
      return true;
    })
    .with("in", () => {
      return false;
    })
    .exhaustive();
};
