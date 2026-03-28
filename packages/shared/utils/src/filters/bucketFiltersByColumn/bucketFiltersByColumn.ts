import { isArray } from "@utils/guards/isArray/isArray.ts";
import { objectKeys } from "@utils/objects/objectKeys.ts";
import { isArrayValueOperator } from "@utils/filters/isArrayValueOperator/isArrayValueOperator.ts";
import { isEmptyFiltersObject } from "@utils/filters/isEmptyFiltersObject/isEmptyFiltersObject.ts";
import { isSingleValueOperator } from "@utils/filters/isSingleValueOperator/isSingleValueOperator.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type {
  FilterOperatorRecord,
  FiltersByColumn,
  FiltersByOperator,
} from "@utils/filters/filters.ts";

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
