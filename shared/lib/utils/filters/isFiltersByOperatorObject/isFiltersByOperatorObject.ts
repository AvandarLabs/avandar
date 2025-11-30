import { UnknownObject } from "$/lib/types/common.ts";
import {
  FILTER_TYPES_SET,
  FilterOperator,
  FiltersByColumn,
  FiltersByOperator,
} from "$/lib/utils/filters/filters.types.ts";
import { isEmptyObject } from "$/lib/utils/guards/isEmptyObject/isEmptyObject.ts";
import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys.ts";

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
