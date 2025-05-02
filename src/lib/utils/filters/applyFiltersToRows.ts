import { match } from "ts-pattern";
import { UnknownObject } from "@/lib/types/common";
import { objectKeys } from "../objects/misc";
import { bucketFiltersByColumn } from "./bucketFiltersByColumn";
import {
  FilterOperatorRecord,
  FiltersByColumn,
  isFiltersByColumnObject,
} from "./filtersByColumn";
import {
  FiltersByOperator,
  isFiltersByOperatorObject,
} from "./filtersByOperator";
import { FilterOperator } from "./filterTypes";
import { isEmptyFiltersObject } from "./isEmptyFiltersObject";

export function doesValuePassFilters(
  value: unknown,
  operator: FilterOperator,
  targetValue: unknown,
): boolean {
  return match(operator)
    .with("eq", () => {
      return value === targetValue;
    })
    .with("in", () => {
      if (Array.isArray(targetValue)) {
        return targetValue.includes(value);
      }
      return false;
    })
    .exhaustive();
}

export function doesRowPassFilters<T extends UnknownObject>(
  row: T,
  filters: FiltersByColumn<T>,
): boolean {
  // NOTE: `every` returns true on an empty array. This is desired.
  // If the filters object is empty, then the row should pass.
  return objectKeys(filters).every((column) => {
    const operatorRecord: FilterOperatorRecord<T[keyof T]> | undefined =
      filters[column];

    if (!operatorRecord) {
      // if there is no filter, then this row automatically passes
      return true;
    }

    // every operator must pass for the row to pass
    return objectKeys(operatorRecord).every((operator) => {
      return doesValuePassFilters(
        row[column],
        operator,
        operatorRecord[operator],
      );
    });
  });
}

function _applyFiltersByColumn<T extends UnknownObject>(
  data: T[],
  filters: FiltersByColumn<T>,
): T[] {
  if (isEmptyFiltersObject(filters)) {
    return data;
  }

  const filteredData = data.filter((item) => {
    return doesRowPassFilters(item, filters);
  });

  return filteredData;
}

function _applyFiltersByOperator<T extends UnknownObject>(
  data: T[],
  filters: FiltersByOperator<T>,
): T[] {
  if (isEmptyFiltersObject(filters)) {
    return data;
  }

  // convert to a canonical column-based filter object
  const filtersByColumn = bucketFiltersByColumn(filters);
  return _applyFiltersByColumn(data, filtersByColumn);
}

export function applyFiltersToRows<
  T extends UnknownObject,
  Filters extends FiltersByOperator<T> | FiltersByColumn<T>,
>(data: T[], filters: Filters): T[] {
  if (isFiltersByOperatorObject(filters)) {
    return _applyFiltersByOperator(data, filters);
  }

  if (isFiltersByColumnObject(filters)) {
    return _applyFiltersByColumn(data, filters);
  }

  return data;
}
