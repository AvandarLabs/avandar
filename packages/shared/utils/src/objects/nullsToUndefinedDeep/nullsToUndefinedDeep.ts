import { isNull } from "@utils/guards/isNull/isNull.ts";
import { constant } from "@utils/misc/constant/constant.ts";
import { swapDeep } from "@utils/objects/swapDeep/swapDeep.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { SwapDeep } from "@utils/types/utilities.types.ts";

/**
 * Swaps all `null` values to `undefined` in an object recursively.
 *
 * @param obj The object to swap nulls to undefined.
 * @returns The object with all nulls swapped to undefined.
 */
export function nullsToUndefinedDeep<T extends UnknownObject>(
  obj: T,
): SwapDeep<T, null, undefined> {
  return swapDeep(obj, {
    isTypeToSwap: isNull,
    swapWith: constant(undefined),
  });
}
