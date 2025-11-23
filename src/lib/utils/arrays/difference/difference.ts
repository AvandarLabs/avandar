/**
 * Returns the difference between two arrays. The equivalent of doing
 * `firstArray` minus `secondArray`.
 *
 * This also handles duplicates: duplicates from the first array will be
 * removed as long as there is a single matching value in the second array.
 *
 * @returns A new array containing the elements that are in the first list
 * but not in the second list.
 */
export function difference<T>(
  firstArray: readonly T[],
  secondArray: readonly T[],
): readonly T[] {
  const secondArrayAsSet = new Set(secondArray);
  return firstArray.filter((x) => {
    return !secondArrayAsSet.has(x);
  });
}
