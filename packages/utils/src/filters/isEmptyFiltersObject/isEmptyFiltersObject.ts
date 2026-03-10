import { isEmptyObject } from "../../guards/isEmptyObject/isEmptyObject.ts";
import { objectValues } from "../../objects/objectValues.ts";
import { isFiltersByColumnObject } from "../isFiltersByColumnObject/isFiltersByColumnObject.ts";
import { isFiltersByOperatorObject } from "../isFiltersByOperatorObject/isFiltersByOperatorObject.ts";
import type { UnknownObject } from "../../types/common.ts";
import type { FiltersByColumn, FiltersByOperator } from "../filters.ts";

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
