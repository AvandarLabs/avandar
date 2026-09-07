import type { UnknownObject } from "@utils/types/common.types.ts";

/**
 * Checks if an object has a defined shape or if it is a record or indexed
 * object.
 *
 * @example
 * IsObjectWithShape<{ a: unknown }> // true
 * IsObjectWithShape<{ [key: string]: unknown }> // false
 *
 * @param T The object to check.
 * @returns `true` if the object has a shape of a string keyed object,
 * `false` otherwise.
 */
export type IsObjectWithShape<T extends UnknownObject> = string extends keyof T
  ? false
  : number extends keyof T
    ? false
    : symbol extends keyof T
      ? false
      : true;
