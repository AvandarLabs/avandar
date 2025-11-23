import { match } from "ts-pattern";

import { FilterOperator } from "@/lib/utils/filters/filters.types";

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
