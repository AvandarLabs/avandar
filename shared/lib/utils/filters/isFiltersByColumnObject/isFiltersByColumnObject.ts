import { UnknownObject } from "$/lib/types/common.ts";
import {
  FiltersByColumn,
  FiltersByOperator,
} from "$/lib/utils/filters/filters.types.ts";
import { isFiltersByOperatorObject } from "$/lib/utils/filters/isFiltersByOperatorObject/isFiltersByOperatorObject.ts";
import { isEmptyObject } from "$/lib/utils/guards/isEmptyObject/isEmptyObject.ts";

export function isFiltersByColumnObject<T extends UnknownObject>(
  filters: FiltersByColumn<T> | FiltersByOperator<T>,
): filters is FiltersByColumn<T> {
  if (isEmptyObject(filters)) {
    return true;
  }

  return !isFiltersByOperatorObject(filters);
}
