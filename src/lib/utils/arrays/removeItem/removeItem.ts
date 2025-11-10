/**
 * Removes an item from an array by index.
 *
 * This function performs an immutable operation.
 *
 * @param array The array to remove the item from.
 * @param idx The index of the item to remove.
 * @returns A new array with the item removed.
 */
export function removeItem<T>(array: readonly T[], idx: number): T[] {
  const copy = [...array];
  if (idx < 0 || idx >= array.length) {
    return array as T[];
  }

  copy.splice(idx, 1);
  return copy;
}
