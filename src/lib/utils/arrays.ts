/**
 * Returns the difference between two lists. The equivalent of doing
 * `firstList` minus `secondList`.
 *
 * @returns A new array containing the elements that are in the first list
 * but not in the second list.
 */
export function difference<T>(
  firstList: readonly T[],
  secondList: readonly T[],
): readonly T[] {
  const secondListAsSet = new Set(secondList);
  return firstList.filter((x) => {
    return !secondListAsSet.has(x);
  });
}
