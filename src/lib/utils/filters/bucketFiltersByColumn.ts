import { UnknownObject } from "@/lib/types/common";
import { isArray } from "../guards";
import { objectKeys } from "../objects/misc";
import { FilterOperatorRecord, FiltersByColumn } from "./filtersByColumn";
import { FiltersByOperator } from "./filtersByOperator";
import { isArrayValueOperator, isSingleValueOperator } from "./filterTypes";
import { isEmptyFiltersObject } from "./isEmptyFiltersObject";

/**
 * Convert from an operator-based filter object to a column-based filter object.
 *
 * They represent the same filters, just structured differently, based on what
 * is the more intuitive way to represent a filter for a given use case.
 *
 * @param filters
 * @returns
 */
export function bucketFiltersByColumn<T extends UnknownObject>(
  filtersByOperator: FiltersByOperator<T> | undefined,
): FiltersByColumn<T> {
  const filtersByColumn: FiltersByColumn<T> = {} as FiltersByColumn<T>;

  if (!filtersByOperator || isEmptyFiltersObject(filtersByOperator)) {
    return filtersByColumn;
  }

  objectKeys(filtersByOperator).forEach((operator) => {
    const filterTuples = filtersByOperator[operator];
    if (filterTuples) {
      filterTuples.forEach(([column, value]) => {
        if (
          !(column in filtersByColumn) ||
          filtersByColumn[column] === undefined
        ) {
          filtersByColumn[column] = {} as FilterOperatorRecord<T[keyof T]>;
        }

        // since we currently don't allow for the same column to have multiple
        // values for the same operator, we will just overwrite the previous
        // value. That means only the last filter for this column on this
        // operator will be applied.
        if (isSingleValueOperator(operator) && !isArray(value)) {
          filtersByColumn[column][operator] = value;
        } else if (isArrayValueOperator(operator) && isArray(value)) {
          filtersByColumn[column][operator] = value;
        }
      });
    }
  });

  return filtersByColumn;
}
