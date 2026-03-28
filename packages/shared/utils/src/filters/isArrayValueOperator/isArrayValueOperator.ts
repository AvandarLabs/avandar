import { match } from "ts-pattern";
import type { FilterOperator } from "@utils/filters/filters.ts";

export const isArrayValueOperator = (
  operator: FilterOperator,
): operator is "in" => {
  return match(operator)
    .with("eq", () => {
      return false;
    })
    .with("in", () => {
      return true;
    })
    .exhaustive();
};
