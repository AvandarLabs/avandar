import { UnknownObject } from "@/lib/types/common";
import { FiltersByColumn } from "./filtersByColumn";
import {
  ArrayValueOperator,
  FilterOperator,
  SingleValueOperator,
} from "./filterTypes";

/**
 * Helper function to create a filter for a specific column.
 *
 * @param column The column to filter by.
 * @param operator The operator to use for the filter.
 * @param value The value to filter by.
 */
export function where<T extends UnknownObject, K extends keyof T>(
  column: K,
  operator: SingleValueOperator,
  value: T[K] | undefined,
): { where: FiltersByColumn<T> };
export function where<T extends UnknownObject, K extends keyof T>(
  column: K,
  operator: ArrayValueOperator,
  value: ReadonlyArray<T[K] | undefined>,
): { where: FiltersByColumn<T> };
export function where<T extends UnknownObject, K extends keyof T>(
  column: K,
  operator: FilterOperator,
  value: T[K] | ReadonlyArray<T[K] | undefined>,
): { where: FiltersByColumn<T> } {
  return {
    where: {
      [column]: {
        [operator]: value,
      },
    } as FiltersByColumn<T>,
  };
}
