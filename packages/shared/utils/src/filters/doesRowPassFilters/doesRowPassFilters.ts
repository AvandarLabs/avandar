import { objectKeys } from "@utils/objects/objectKeys.ts";
import { doesValuePassFilters } from "@utils/filters/doesValuePassFilters/doesValuePassFilters.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { FilterOperatorRecord, FiltersByColumn } from "@utils/filters/filters.ts";

export function doesRowPassFilters<T extends UnknownObject>(
  row: T,
  filters: FiltersByColumn<T>,
): boolean {
  return objectKeys(filters).every((column) => {
    const operatorRecord: FilterOperatorRecord<T[keyof T]> | undefined =
      filters[column];

    if (!operatorRecord) {
      return true;
    }

    return objectKeys(operatorRecord).every((operator) => {
      return doesValuePassFilters(
        row[column],
        operator,
        operatorRecord[operator],
      );
    });
  });
}
