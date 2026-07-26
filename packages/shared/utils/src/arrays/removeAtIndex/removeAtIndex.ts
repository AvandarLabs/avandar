/**
 * Returns a new array with the item at `index` removed. The input array is
 * never mutated.
 *
 * If `index` is out of bounds (negative, or greater than or equal to the
 * array's length) no item matches, so a shallow copy of the original array is
 * returned unchanged.
 *
 * @param array The source array.
 * @param index The index of the item to remove.
 * @returns A new array without the item at `index`.
 */
export function removeAtIndex<T>(array: readonly T[], index: number): T[] {
  return array.filter((_, i) => {
    return i !== index;
  });
}
