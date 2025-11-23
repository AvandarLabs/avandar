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
