import { UnknownObject } from "@/lib/types/common";
import { isEmptyObject } from "@/lib/utils/guards/guards";
import { isFiltersByOperatorObject } from "@/lib/utils/filters/isFiltersByOperatorObject";
import {
  FiltersByColumn,
  FiltersByOperator,
} from "@/lib/utils/filters/filters.types";

export function isFiltersByColumnObject<T extends UnknownObject>(
  filters: FiltersByColumn<T> | FiltersByOperator<T>,
): filters is FiltersByColumn<T> {
  if (isEmptyObject(filters)) {
    return true;
  }

  return !isFiltersByOperatorObject(filters);
}
