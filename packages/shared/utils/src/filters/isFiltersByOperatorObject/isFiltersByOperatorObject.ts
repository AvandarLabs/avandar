import { isEmptyObject } from "@utils/guards/isEmptyObject/isEmptyObject.ts";
import { objectKeys } from "@utils/objects/objectKeys.ts";
import { FILTER_TYPES_SET } from "@utils/filters/filters.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type {
  FilterOperator,
  FiltersByColumn,
  FiltersByOperator,
} from "@utils/filters/filters.ts";

export function isFiltersByOperatorObject<T extends UnknownObject>(
  filters: FiltersByOperator<T> | FiltersByColumn<T>,
): filters is FiltersByOperator<T> {
  if (isEmptyObject(filters)) {
    return true;
  }

  return objectKeys(filters).every((key) => {
    return FILTER_TYPES_SET.has(key as FilterOperator);
  });
}
