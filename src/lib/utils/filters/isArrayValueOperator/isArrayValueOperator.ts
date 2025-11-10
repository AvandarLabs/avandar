import { match } from "ts-pattern";

import { FilterOperator } from "@/lib/utils/filters/filters.types";

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
