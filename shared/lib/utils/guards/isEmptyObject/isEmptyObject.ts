import { UnknownObject } from "$/lib/types/common.ts";
import { EmptyObject } from "type-fest";

/**
 * Checks if `v` is an empty object.
 *
 * @param v - The value to check. It must be narrowed to an object type already.
 * @returns `true` if `v` is an empty object, `false` otherwise.
 */
export function isEmptyObject(v: UnknownObject): v is EmptyObject {
  for (const _ in v) {
    // if there is a single key we will enter this loop and return false
    return false;
  }
  return true;
}
