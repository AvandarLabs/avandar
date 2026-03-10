import { isArray } from "@avandar/utils";
import type { Model } from "@avandar/models";
import type { UnknownObject } from "@avandar/utils";
import type { SetFieldType, SetRequired, Simplify } from "type-fest";

/**
 * Returns a predicate that is true if any of the predicates are true.
 *
 * @param predicates - The predicates to check.
 * @returns A predicate that is true if any of the predicates are true.
 * @param predicates
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function or<T, Predicates extends Array<(value: any) => value is any>>(
  value: T,
  ...predicates: Predicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): value is Predicates[number] extends (value: any) => value is infer R ? T & R
: never {
  return predicates.some((predicate) => {
    return predicate(value);
  });
}

/**
 * Checks if `obj` has all the properties in `properties`.
 *
 * This is useful when an object has optional properties but you want to assert
 * that these values are present.
 *
 * NOTE: this only checks for property existence. The property can exist but
 * the value can still be undefined.
 *
 * @param obj - The object to check.
 * @param properties - The properties to check.
 * @returns `true` if `obj` has all the properties in `properties`, `false`
 * otherwise.
 */
export function hasPropKeys<T extends UnknownObject, Key extends keyof T>(
  obj: T | null | undefined,
  properties: Key[],
): obj is T & SetRequired<T, Key> {
  if (obj === null || obj === undefined) {
    return false;
  }
  return properties.every((prop) => {
    return prop in obj;
  });
}

/**
 * Checks if `value` is one of the values in `values`.
 *
 * @param value - The value to check.
 * @param values - The values to check against.
 * @returns `true` if `value` is one of the values in `values`,
 * `false` otherwise.
 */
export function isOneOf<T extends string | boolean | number>(
  value: unknown,
  values: readonly T[],
): value is T {
  return values.includes(value as T);
}

/**
 * Checks if `value` is an empty array.
 *
 * @param value - The value to check.
 * @returns
 */
export function isEmptyArray<T>(
  value: readonly T[] | null | undefined,
): value is readonly T[] & readonly [] {
  return isArray(value) && value.length === 0;
}

/**
 * Checks if `value` is a model of the given type.
 *
 * @param value - The value to check.
 * @param modelType - The model type to check.
 * @returns `true` if `value` is a model of the given type, `false` otherwise.
 */
export function isOfModelType<
  M extends Model.Base<string>,
  MType extends string,
>(
  modelType: MType,
  value: M | null | undefined,
): value is Simplify<M & SetFieldType<M, "__type", MType>> {
  return (
    value !== null &&
    value !== undefined &&
    "__type" in value &&
    value.__type === modelType
  );
}
