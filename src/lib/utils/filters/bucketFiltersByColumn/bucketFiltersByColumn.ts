import { UnknownObject } from "@/lib/types/common";
import { isArray } from "@/lib/utils/guards/guards";
import { objectKeys } from "@/lib/utils/objects/misc";
import { isArrayValueOperator } from "@/lib/utils/filters/isArrayValueOperator";
import { isSingleValueOperator } from "@/lib/utils/filters/isSingleValueOperator";
import { isEmptyFiltersObject } from "@/lib/utils/filters/isEmptyFiltersObject";
import {
  FilterOperatorRecord,
  FiltersByColumn,
  FiltersByOperator,
} from "@/lib/utils/filters/filters.types";

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
