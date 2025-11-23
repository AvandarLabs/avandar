import { removeItem } from "../removeItem";

/**
 * Removes the first item from an array where the `predicate` returns true.
 *
 * This function performs an immutable operation.
 *
 * @param array The array to remove the item from.
 * @param predicate The predicate to use to find the item to remove.
 * @returns A new array with the item removed.
 */
export function removeItemWhere<T>(
  array: readonly T[],
  predicate: (value: T) => boolean,
): T[] {
  const idx = array.findIndex(predicate);
  return removeItem(array, idx);
}
