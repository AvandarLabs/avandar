import { isPlainObject } from "../../guards/isPlainObject/isPlainObject.ts";
import type { UnknownObject } from "../../types/common.types.ts";
import type { SwapDeep } from "../../types/utilities.types.ts";

/**
 * Swaps a type in an object recursively. This is a deep transformation.
 *
 * @param value The value to swap types in.
 * @param options The configuration for the swap.
 * @param options.isTypeToSwap A type guard to check if the current value is of
 * the type we want to swap.
 * @param options.swapWith A function that returns the value to swap in.
 * @returns The value with the type swapped.
 */
export function swapDeep<T, TypeToSwap, SwapWith>(
  value: T,
  options: {
    isTypeToSwap: (value: unknown) => value is TypeToSwap;
    swapWith: (value: TypeToSwap) => SwapWith;
  },
): SwapDeep<T, TypeToSwap, SwapWith> {
  type Result = SwapDeep<T, TypeToSwap, SwapWith>;

  if (options.isTypeToSwap(value)) {
    return options.swapWith(value) as Result;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      return swapDeep(item, options);
    }) as Result;
  }

  if (value instanceof Map) {
    const newEntries = [...value.entries()].map(([key, v]) => {
      return [key, swapDeep(v, options)] as const;
    }) as ReadonlyArray<[unknown, unknown]>;
    return new Map(newEntries) as Result;
  }

  if (value instanceof Set) {
    const newValues = [...value.values()].map((v) => {
      return swapDeep(v, options);
    }) as readonly unknown[];
    return new Set(newValues) as Result;
  }

  if (isPlainObject(value)) {
    const newObj: UnknownObject = {};
    Object.keys(value as UnknownObject).forEach((key) => {
      const v = value[key as keyof typeof value];
      newObj[key] = swapDeep(v, options);
    });
    return newObj as Result;
  }

  return value as Result;
}
