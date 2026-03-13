import { isUndefined } from "../../guards/isUndefined/isUndefined.ts";
import { constant } from "../../misc/constant/constant.ts";
import { swapDeep } from "../swapDeep/swapDeep.ts";
import type { UnknownObject } from "../../types/common.ts";
import type { SwapDeep } from "../../types/utilityTypes.ts";

/**
 * Swaps all `undefined` values to `null` in an object recursively.
 *
 * @param obj The object to swap undefineds to nulls.
 * @returns The object with all undefineds swapped to nulls.
 */
export function undefinedsToNullsDeep<T extends UnknownObject>(
  obj: T,
): SwapDeep<T, undefined, null> {
  return swapDeep(obj, {
    isTypeToSwap: isUndefined,
    swapWith: constant(null),
  });
}
