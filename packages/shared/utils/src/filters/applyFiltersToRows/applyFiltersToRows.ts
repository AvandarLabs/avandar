import { bucketFiltersByColumn } from "@utils/filters/bucketFiltersByColumn/bucketFiltersByColumn.ts";
import { doesRowPassFilters } from "@utils/filters/doesRowPassFilters/doesRowPassFilters.ts";
import { isEmptyFiltersObject } from "@utils/filters/isEmptyFiltersObject/isEmptyFiltersObject.ts";
import { isFiltersByColumnObject } from "@utils/filters/isFiltersByColumnObject/isFiltersByColumnObject.ts";
import { isFiltersByOperatorObject } from "@utils/filters/isFiltersByOperatorObject/isFiltersByOperatorObject.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { FiltersByColumn, FiltersByOperator } from "@utils/filters/filters.ts";

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
