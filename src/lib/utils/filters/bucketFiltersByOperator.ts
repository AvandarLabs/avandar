import { UnknownObject } from "@/lib/types/common";
import { isArray } from "../guards";
import { objectKeys } from "../objects/misc";
import { FilterOperatorRecord, FiltersByColumn } from "./filtersByColumn";
import { FiltersByOperator } from "./filtersByOperator";
import { isArrayValueOperator, isSingleValueOperator } from "./filterTypes";
import { isEmptyFiltersObject } from "./isEmptyFiltersObject";

/**
 * Convert from a column-based filter object to an operator-based filter object.
 *
 * They represent the same filters, just structured differently, based on what
 * is the more intuitive way to represent a filter for a given use case.
 *
 * @param filters
 * @returns
 */
export function bucketFiltersByOperator<T extends UnknownObject>(
  filtersByColumn: FiltersByColumn<T> | undefined,
): FiltersByOperator<T> {
  const filtersByOperator: FiltersByOperator<T> = {} as FiltersByOperator<T>;

  if (!filtersByColumn || isEmptyFiltersObject(filtersByColumn)) {
    return filtersByOperator;
  }

  objectKeys(filtersByColumn).forEach((column) => {
    const operatorRecord: FilterOperatorRecord<T[keyof T]> | undefined =
      filtersByColumn[column];
    if (operatorRecord) {
      objectKeys(operatorRecord).forEach((operator) => {
        const value = operatorRecord[operator]!;
        if (
          !(operator in filtersByOperator) ||
          filtersByOperator[operator] === undefined
        ) {
          filtersByOperator[operator] = [];
        }

        if (isSingleValueOperator(operator) && !isArray(value)) {
          filtersByOperator[operator].push([column, value]);
        } else if (isArrayValueOperator(operator) && isArray(value)) {
          filtersByOperator[operator].push([column, value]);
        }
      });
    }
  });

  return filtersByOperator;
}
