import { UnknownObject } from "../../types/common";
import { isEmptyObject } from "../guards";
import { objectValues } from "../objects/misc";
import { FiltersByColumn, isFiltersByColumnObject } from "./filtersByColumn";
import {
  FiltersByOperator,
  isFiltersByOperatorObject,
} from "./filtersByOperator";

function _isEmptyFiltersByColumnObject<T extends UnknownObject>(
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

function _isEmptyFiltersByOperatorObject<T extends UnknownObject>(
  filtersByOperator: FiltersByOperator<T> | undefined,
): boolean {
  if (!filtersByOperator || isEmptyObject(filtersByOperator)) {
    return true;
  }

  const columnFilterTuples = objectValues(filtersByOperator);
  return columnFilterTuples.every((columnFilterTuple) => {
    if (!columnFilterTuple || columnFilterTuple.length === 0) {
      // an undefined or empty array of tuples means there are no
      // filters to apply for this operator
      return true;
    }

    // if the array exists and has at least one tuple, then this filter
    // object is not empty
    return false;
  });
}

/**
 * Returns true if the filters object is empty.
 * This doesn't just check that the object is literally empty, but we also
 * check each key that is set and make sure that they aren't mapping to
 * undefined or empty arrays or empty objects.
 *
 * @param filters - The filters object to check
 * @returns true if the filters object is empty, false otherwise
 */
export function isEmptyFiltersObject<T extends UnknownObject>(
  filters: FiltersByColumn<T> | FiltersByOperator<T> | undefined,
): boolean {
  if (!filters || isEmptyObject(filters)) {
    return true;
  }

  if (isFiltersByOperatorObject(filters)) {
    return _isEmptyFiltersByOperatorObject(filters);
  }

  if (isFiltersByColumnObject(filters)) {
    return _isEmptyFiltersByColumnObject(filters);
  }

  // If it's neither, then to be safe we'll say the filters are empty
  return true;
}
