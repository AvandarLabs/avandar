import { UnknownObject } from "@/lib/types/common";
import { bucketFiltersByColumn } from "@/lib/utils/filters/bucketFiltersByColumn";
import { doesRowPassFilters } from "@/lib/utils/filters/doesRowPassFilters";
import { isFiltersByColumnObject } from "@/lib/utils/filters/isFiltersByColumnObject";
import { isFiltersByOperatorObject } from "@/lib/utils/filters/isFiltersByOperatorObject";
import { isEmptyFiltersObject } from "@/lib/utils/filters/isEmptyFiltersObject";
import {
  FiltersByColumn,
  FiltersByOperator,
} from "@/lib/utils/filters/filters.types";

function applyColumnFilters<T extends UnknownObject>(
  data: T[],
  filters: FiltersByColumn<T>,
): T[] {
  if (isEmptyFiltersObject(filters)) {
    return data;
  }
  return data.filter((item) => {
    return doesRowPassFilters(item, filters);
  });
}

function applyOperatorFilters<T extends UnknownObject>(
  data: T[],
  filters: FiltersByOperator<T>,
): T[] {
  if (isEmptyFiltersObject(filters)) {
    return data;
  }
  const filtersByColumn = bucketFiltersByColumn(filters);
  return applyColumnFilters(data, filtersByColumn);
}

export function applyFiltersToRows<
  T extends UnknownObject,
  Filters extends FiltersByOperator<T> | FiltersByColumn<T>,
>(data: T[], filters: Filters): T[] {
  if (isFiltersByOperatorObject(filters)) {
    return applyOperatorFilters(data, filters);
  }

  if (isFiltersByColumnObject(filters)) {
    return applyColumnFilters(data, filters);
  }

  return data;
}
