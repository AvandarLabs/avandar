import type { UnknownObject } from "../../types/common.types.ts";
import type { ReplaceTypes } from "../../types/utilities.types.ts";

/**
 * Coerces the specified keys into dates.
 *
 * `undefined` values are left as is and are not attempted to be coerced into
 * dates.
 *
 * @param obj The object to coerce dates from.
 * @param keys The keys to coerce into dates.
 * @returns The object with the specified keys coerced into dates.
 */
export function coerceDatesIn<T extends UnknownObject, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): {
  [Key in keyof T]: Key extends K ?
    undefined extends T[Key] ?
      Date | undefined
    : Date
  : T[Key];
} {
  const newObj = { ...obj };
  keys.forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    newObj[key] =
      obj[key] === undefined ?
        undefined
      : new Date(obj[key] as unknown as string | number);
  });
  return newObj as ReplaceTypes<T, { [Key in K]: Date }>;
}
