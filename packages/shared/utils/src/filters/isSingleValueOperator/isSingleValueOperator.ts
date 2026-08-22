import type { FilterOperator } from "@utils/filters/filters.ts";

import { match } from "ts-pattern";

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
