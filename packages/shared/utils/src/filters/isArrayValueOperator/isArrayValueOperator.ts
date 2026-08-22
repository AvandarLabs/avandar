import type { FilterOperator } from "@utils/filters/filters.ts";

import { match } from "ts-pattern";

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
