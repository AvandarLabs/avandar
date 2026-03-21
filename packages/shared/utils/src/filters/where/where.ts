import type { UnknownObject } from "../../types/common.types.ts";
import type {
  ArrayValueOperator,
  FilterOperator,
  FiltersByColumn,
  SingleValueOperator,
} from "../filters.ts";

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
