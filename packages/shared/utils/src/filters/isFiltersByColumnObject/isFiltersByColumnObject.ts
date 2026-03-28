import { isEmptyObject } from "@utils/guards/isEmptyObject/isEmptyObject.ts";
import { isFiltersByOperatorObject } from "@utils/filters/isFiltersByOperatorObject/isFiltersByOperatorObject.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { FiltersByColumn, FiltersByOperator } from "@utils/filters/filters.ts";

export function isFiltersByColumnObject<T extends UnknownObject>(
  filters: FiltersByColumn<T> | FiltersByOperator<T>,
): filters is FiltersByColumn<T> {
  if (isEmptyObject(filters)) {
    return true;
  }

  return !isFiltersByOperatorObject(filters);
}
