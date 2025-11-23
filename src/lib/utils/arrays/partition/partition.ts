/**
 * Partitions an array into two arrays based on a predicate.
 *
 * @param array The array to partition.
 * @param predicate The predicate to use to partition the array.
 * @param predicate.value The current array item to evaluate.
 * @param predicate.idx The index of the array item.
 * @returns A tuple of two arrays. The first array has all the items where
 * the predicate returned true, and the second array has all the
 * items where the predicate returned false.
 */
export function partition<T>(
  array: readonly T[],
  predicate: (value: T, idx: number) => boolean,
): [T[], T[]] {
  const trueItems: T[] = [];
  const falseItems: T[] = [];

  array.forEach((item, idx) => {
    if (predicate(item, idx)) {
      trueItems.push(item);
    } else {
      falseItems.push(item);
    }
  });

  return [trueItems, falseItems];
}
