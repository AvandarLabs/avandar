/**
 * Removes duplicates from an array, while preserving the order of the input
 * array. If a hash function is provided, then duplicates are determined by the
 * hash value. Otherwise, duplicates are determined by reference equality.
 *
 * In the event of hash collisions, the first item in the array will be kept.
 *
 * @param array The array to remove duplicates from.
 * @param options The options for removing duplicates.
 * @param options.hashFn A function that returns the hash value for each item.
 * If not provided, then duplicates are determined by reference equality.
 * @returns A new array with duplicates removed.
 */
export function removeDuplicates<T>(
  array: readonly T[],
  { hashFn }: { hashFn?: (item: T) => unknown },
): T[] {
  const addedItems = new Map<unknown, T>();

  // iterate over the array so we can preserve order
  const result: T[] = [];
  array.forEach((item) => {
    const hash = hashFn ? hashFn(item) : item;
    if (!addedItems.has(hash)) {
      addedItems.set(hash, item);
      result.push(item);
    }
  });
  return result;
}
