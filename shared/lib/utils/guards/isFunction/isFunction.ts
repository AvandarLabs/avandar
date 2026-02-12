import type { AnyFunction } from "$/lib/types/utilityTypes.ts";

/**
 * Checks if `value` is a function.
 *
 * @param value - The value to check.
 * @returns `true` if `value` is a function, `false` otherwise.
 */

export function isFunction(value: unknown): value is AnyFunction {
  return typeof value === "function";
}
