/**
 * Check if two arrays contain the equal elements, regardless of order.
 *
 * Array elements are put in a Set to determine if there is a matching item.
 * By default, the elements are placed into the Set as-is. To handle how an
 * element is hashed, you can pass a `hashFn`.
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
