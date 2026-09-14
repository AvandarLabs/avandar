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
  if (array.length === 0) {
    return [];
  }

  const result: T[][] = [];
  let currentArray: T[] = [];
  let allowSplitting = true;
  const predicateIsFunction = typeof splitPredicate === "function";

  array.forEach((item) => {
    const matchesPredicate = predicateIsFunction
      ? (splitPredicate as (value: T) => boolean)(item)
      : item === splitPredicate;

    if (allowSplitting && matchesPredicate) {
      result.push(currentArray);
      currentArray = [];

      if (splitOnce && allowSplitting) {
        allowSplitting = false;
      }
    } else if (!matchesPredicate) {
      currentArray.push(item);
    }
  });
  // add the last array
  result.push(currentArray);
  return result;
}
