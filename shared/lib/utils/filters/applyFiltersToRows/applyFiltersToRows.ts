import { UnknownObject } from "$/lib/types/common.ts";
import { bucketFiltersByColumn } from "$/lib/utils/filters/bucketFiltersByColumn/bucketFiltersByColumn.ts";
import { doesRowPassFilters } from "$/lib/utils/filters/doesRowPassFilters/doesRowPassFilters.ts";
import {
  FiltersByColumn,
  FiltersByOperator,
} from "$/lib/utils/filters/filters.types.ts";
import { isEmptyFiltersObject } from "$/lib/utils/filters/isEmptyFiltersObject/isEmptyFiltersObject.ts";
import { isFiltersByColumnObject } from "$/lib/utils/filters/isFiltersByColumnObject/isFiltersByColumnObject.ts";
import { isFiltersByOperatorObject } from "$/lib/utils/filters/isFiltersByOperatorObject/isFiltersByOperatorObject.ts";

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
