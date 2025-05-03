import { identity } from "../misc";

/**
 * Creates a map from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param options The options for creating the map.
 * @param options.list The list of items to convert.
 * @param options.keyFn A function that returns the key for each item.
 * @param options.valueFn A function that returns the value for each
 * item. Defaults to the identity function.
 *
 * @returns A map with keys and values extracted from the list.
 */
export function makeMapFromList<T, K, V = T>({
  list,
  keyFn,
  valueFn = identity as (item: T) => V,
}: {
  list: readonly T[];
  keyFn: (item: T) => K;
  valueFn?: (item: T) => V;
}): Map<K, V> {
  const map = new Map<K, V>();
  list.forEach((item) => {
    map.set(keyFn(item), valueFn(item));
  });
  return map;
}
