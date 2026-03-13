import { isNull } from "../../guards/isNull/isNull.ts";
import { objectKeys } from "../objectKeys.ts";
import type { UnknownObject } from "../../types/common.ts";

/**
 * The result type of `excludeNullsIn`.
 */
export type ExcludeNullsIn<
  T extends UnknownObject,
  K extends keyof T = keyof T,
> = Omit<T, K> & {
  [Key in K]: Exclude<T[Key], null>;
};

/**
 * Excludes nulls from the specified keys. If no keys are
 * specified, we assume `keysToTest` is the entire object,
 * so we will exclude nulls from all keys.
 *
 * This is a shallow operation.
 *
 * @param obj The object to exclude nulls from.
 * @param keysToTest The keys to test for null values.
 * @returns A new object with nulls excluded from the
 * specified keys.
 */
export function excludeNullsIn<T extends UnknownObject, K extends keyof T>(
  obj: T,
  keysToTest: Extract<K, string> | readonly K[],
): ExcludeNullsIn<T, K> {
  const newObj = { ...obj };
  const keys =
    typeof keysToTest === "string" ? [keysToTest]
    : keysToTest.length === 0 ? objectKeys(obj)
    : keysToTest;
  keys.forEach((key) => {
    if (isNull(obj[key])) {
      delete newObj[key];
    }
  });

  return newObj as ExcludeNullsIn<T, K>;
}
