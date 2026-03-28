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
