import { coerceDatesIn } from "../../coerceDatesIn/coerceDatesIn.ts";
import type { UnknownObject } from "../../../types/common.types.ts";

/**
 * Returns a function that coerces the specified keys into dates.
 *
 * `undefined` values are left as is and are not attempted to be coerced into
 * dates.
 *
 * @param keys The keys to coerce into dates.
 * @returns A function that coerces the specified keys into dates.
 */
export function coerceDatesInProps<T extends UnknownObject, K extends keyof T>(
  keys: readonly K[],
): (obj: T) => {
  [Key in keyof T]: Key extends K ?
    undefined extends T[Key] ?
      Date | undefined
    : Date
  : T[Key];
} {
  return (obj: T) => {
    return coerceDatesIn(obj, keys);
  };
}
