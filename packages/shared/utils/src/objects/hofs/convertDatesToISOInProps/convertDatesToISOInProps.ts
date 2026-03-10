import { convertDatesToISOIn } from "../../convertDatesToISOIn/convertDatesToISOIn.ts";
import type { UnknownObject } from "../../../types/common.ts";
import type { ConditionalKeys } from "type-fest";

/**
 * Returns a function that converts the specified keys into ISO strings.
 *
 * @param keys The keys to convert into ISO strings.
 * @returns A function that converts the specified keys into ISO strings.
 */
export function convertDatesToISOInProps<
  T extends UnknownObject,
  K extends ConditionalKeys<T, Date | undefined>,
>(
  keys: readonly K[],
): (obj: T) => {
  [Key in keyof T]: Key extends K ?
    undefined extends T[Key] ?
      string | undefined
    : string
  : T[Key];
} {
  return (obj: T) => {
    return convertDatesToISOIn(obj, keys);
  };
}
