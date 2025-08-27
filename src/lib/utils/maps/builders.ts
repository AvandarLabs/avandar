import { identity } from "../misc";

/**
 * Creates a map from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param list The list of items to convert.
 * @param options The options for creating the map.
 * @param options.keyFn A function that returns the key for each item.
 * @param options.valueFn A function that returns the value for each
 * item. Defaults to the identity function.
 *
 * @returns A map with keys and values extracted from the list.
 */
export function makeMapFromList<T, K, V = T>(
  list: readonly T[],
  {
    keyFn,
    valueFn = identity as (item: T) => V,
  }: {
    keyFn: (item: T) => K;
    valueFn?: (item: T) => V;
  },
): Map<K, V> {
  const map = new Map<K, V>();
  list.forEach((item) => {
    map.set(keyFn(item), valueFn(item));
  });
  return map;
}
/**
 * Creates a map of buckets from a list. The `keyFn` extracts the bucket
 * key. The `valueFn` extracts the value to place in the bucket. Buckets hold
 * arrays of values. When keys collide, the value gets appended to the bucket's
 * array.
 *
 * @param list The list of items to convert to buckets.
 * @param config
 * @param config.keyFn A function that returns the key for each item.
 * @param config.valueFn A function that returns the value for each item.
 * @returns A map of keys to arrays of values.
 */
export function makeBucketMapFromList<T, K, V = T>(
  list: readonly T[],
  {
    keyFn,
    valueFn = identity as (item: T) => V,
  }: {
    keyFn: (item: T) => K;
    valueFn?: (item: T, key: K) => V;
  },
): Map<K, V[]> {
  const buckets = new Map<K, V[]>();
  list.forEach((item) => {
    const bucketName = keyFn(item);
    const value: V = valueFn(item, bucketName);
    const bucket: V[] = buckets.get(bucketName) ?? [];
    bucket.push(value);
    buckets.set(bucketName, bucket);
  });
  return buckets;
}

/**
 * Merges multiple bucket maps into a single bucket map. When keys collide,
 * the values from the input maps are appended to the bucket's array.
 *
 * @param inputMaps The bucket maps to merge.
 * @returns A merged bucket map.
 */
export function mergeBucketMaps<K, V>(
  ...inputMaps: ReadonlyArray<Map<K, V[]>>
): Map<K, V[]> {
  const mergedMap = new Map<K, V[]>();
  inputMaps.forEach((map) => {
    map.forEach((items, key) => {
      const existingItems = mergedMap.get(key);
      if (existingItems) {
        mergedMap.set(key, [...existingItems, ...items]);
      } else {
        mergedMap.set(key, [...items]);
      }
    });
  });
  return mergedMap;
}
