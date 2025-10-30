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

/**
 * Splits an array into multiple arrays based on a predicate.
 * Any time an item matches or passes the predicate, we use that item as
 * the split point. This means that items passing the predicate will **not**
 * be included in the returned arrays.
 *
 * If the input array is empty, we return an empty array (i.e. 0 inner arrays).
 * If the input array is non-empty and the predicate never matches, we return
 * a singleton array containing all elements.
 *
 * @param array The array to split.
 * @param splitPredicate The predicate to use to split the array. If it's
 * a function, we split when the predicate returns true. If it's a value,
 * we split when an item matches the value.
 * @param options The options for splitting the array.
 * @param options.splitOnce If true, we only split once. This means that if
 * the predicate matches multiple times, we only split at the first match.
 * If false, we split at every match. Defaults to false.
 * @returns An array of arrays.
 */
export function splitArray<T>(
  array: readonly T[],
  splitPredicate: ((value: T) => boolean) | T,
  { splitOnce = false }: { splitOnce?: boolean } = {},
): T[][] {
  const result: T[][] = [];
  let currentArray: T[] = [];
  let allowSplitting = true;
  array.forEach((item) => {
    if (
      (
        allowSplitting &&
        typeof splitPredicate === "function" &&
        (splitPredicate as (value: T) => boolean)(item)
      ) || (item === splitPredicate)
    ) {
      result.push(currentArray);
      currentArray = [];

      if (splitOnce && allowSplitting) {
        allowSplitting = false;
      }
    } else {
      currentArray.push(item);
    }
  });
  // add the last array
  result.push(currentArray);
  return result;
}
