import { UnknownObject } from "@/lib/types/common";
import { objectKeys } from "@/lib/utils/objects/misc";
import {
  FilterOperatorRecord,
  FiltersByColumn,
} from "@/lib/utils/filters/filters.types";
import { doesValuePassFilters } from "@/lib/utils/filters/doesValuePassFilters";

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
