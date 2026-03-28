import { isEmptyObject } from "@utils/guards/isEmptyObject/isEmptyObject.ts";
import { objectValues } from "@utils/objects/objectValues.ts";
import { isFiltersByColumnObject } from "@utils/filters/isFiltersByColumnObject/isFiltersByColumnObject.ts";
import { isFiltersByOperatorObject } from "@utils/filters/isFiltersByOperatorObject/isFiltersByOperatorObject.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { FiltersByColumn, FiltersByOperator } from "@utils/filters/filters.ts";

function isEmptyFiltersByColumnObject<T extends UnknownObject>(
  filtersByColumn: FiltersByColumn<T> | undefined,
): boolean {
  if (!filtersByColumn || isEmptyObject(filtersByColumn)) {
    return true;
  }

  const operatorRecords = objectValues(filtersByColumn);
  return operatorRecords.every((operatorRecord) => {
    return operatorRecord === undefined ? true : isEmptyObject(operatorRecord);
  });
}

function isEmptyFiltersByOperatorObject<T extends UnknownObject>(
  filtersByOperator: FiltersByOperator<T> | undefined,
): boolean {
  if (!filtersByOperator || isEmptyObject(filtersByOperator)) {
    return true;
  }

  const columnFilterTuples = objectValues(filtersByOperator);
  return columnFilterTuples.every((columnFilterTuple) => {
    if (!columnFilterTuple || columnFilterTuple.length === 0) {
      return true;
    }
    return false;
  });
}

export function isEmptyFiltersObject<T extends UnknownObject>(
  filters: FiltersByColumn<T> | FiltersByOperator<T> | undefined,
): boolean {
  if (!filters || isEmptyObject(filters)) {
    return true;
  }

  if (isFiltersByOperatorObject(filters)) {
    return isEmptyFiltersByOperatorObject(filters);
  }

  if (isFiltersByColumnObject(filters)) {
    return isEmptyFiltersByColumnObject(filters);
  }

  return true;
}
