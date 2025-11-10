import { UnknownObject } from "@/lib/types/common";
import {
  ArrayValueOperator,
  FilterOperator,
  FiltersByColumn,
  SingleValueOperator,
} from "@/lib/utils/filters/filters.types";

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
