import type { UnknownObject } from "@utils/types/common.types.ts";
import type { ReplaceTypes } from "@utils/types/utilities.types.ts";
import type { ConditionalKeys } from "type-fest";

/**
 * Converts the specified keys into ISO strings.
 *
 * @param obj The object to convert dates from.
 * @param keys The keys to convert into ISO strings.
 * @returns The object with the specified keys converted into ISO strings.
 */
export function convertDatesToISOIn<
  T extends UnknownObject,
  K extends ConditionalKeys<T, Date | undefined>,
>(
  obj: T,
  keys: readonly K[],
): {
  [Key in keyof T]: Key extends K ?
    undefined extends T[Key] ?
      string | undefined
    : string
  : T[Key];
} {
  const newObj = { ...obj };
  keys.forEach((key) => {
    if (obj[key] instanceof Date) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      newObj[key] = obj[key].toISOString();
    }
  });
  return newObj as ReplaceTypes<T, { [Key in K]: string }>;
}
