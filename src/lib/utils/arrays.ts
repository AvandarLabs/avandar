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

/**
 * Maps an array to a tuple of two arrays. The map function returns a tuple
 * of [R1, R2] and the final return is two arrays of [R1[], R2[]].
 *
 * @param items The array to map.
 * @param callback A function that maps each element of the array to a tuple of
 * two values.
 * @returns A tuple of two arrays. An array of all the first values of the
 * return tuple and an array of all the second values.
 */
export function mapToArrayTuple<T, R1, R2>(
  items: readonly T[],
  callback: (x: T, idx: number) => readonly [R1, R2],
): [R1[], R2[]] {
  const tuples1 = [] as R1[];
  const tuples2 = [] as R2[];

  items.forEach((item, idx) => {
    const [r1, r2] = callback(item, idx);
    tuples1.push(r1);
    tuples2.push(r2);
  });

  return [tuples1, tuples2];
}
