import type { SetFieldType } from "type-fest";

/**
 * Returns a function that checks if an object's property at `key` passes a
 * `predicate`.
 *
 * This function retains type safety if the predicate that is passed is a type
 * guard.
 *
 * @param key The key of the property to check.
 * @param predicate The predicate to check the property against.
 * @returns A function that returns true if the property at `key` passes the
 * `predicate`
 */
export function propPasses<T extends object, K extends keyof T, R extends T[K]>(
  key: K,
  predicate: (value: T[K]) => value is R,
): (obj: T) => obj is T & SetFieldType<T, K, R>;
export function propPasses<T extends object, K extends keyof T>(
  key: K,
  predicate: (value: T[K]) => boolean,
): (obj: T) => boolean {
  return (obj: T) => {
    return predicate(obj[key]);
  };
}
