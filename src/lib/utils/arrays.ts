/**
 * Returns the difference between two arrays. The equivalent of doing
 * `firstArray` minus `secondArray`.
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

/**
 * Check if two arrays contain the equal elements, regardless of order.
 *
 * @returns `true` if the arrays contain the same elements, `false` otherwise.
 */
export function areArrayContentsEqual<A>(
  firstArray: readonly A[],
  secondArray: readonly A[],
  hashFn?: (a: A) => unknown,
): boolean {
  if (Object.is(firstArray, secondArray)) {
    return true;
  }

  if (firstArray.length !== secondArray.length) {
    return false;
  }

  const firstArrayAsSet = new Set(hashFn ? firstArray.map(hashFn) : firstArray);

  // intentionally using a `for` loop so we can exit early if necessary
  for (const x of secondArray) {
    const hashedVal = hashFn ? hashFn(x) : x;
    if (!firstArrayAsSet.has(hashedVal)) {
      return false;
    }
  }

  return true;
}
