import { isEmptyObject } from "../../guards/isEmptyObject/isEmptyObject.ts";
import { isFiltersByOperatorObject } from "../isFiltersByOperatorObject/isFiltersByOperatorObject.ts";
import type { UnknownObject } from "../../types/common.ts";
import type { FiltersByColumn, FiltersByOperator } from "../filters.ts";

export function isFiltersByColumnObject<T extends UnknownObject>(
  filters: FiltersByColumn<T> | FiltersByOperator<T>,
): filters is FiltersByColumn<T> {
  if (isEmptyObject(filters)) {
    return true;
  }

  return !isFiltersByOperatorObject(filters);
}
