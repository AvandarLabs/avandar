import { identity } from "../misc";

/**
 * Creates an object from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param options The options for creating the object.
 * @param options.list The list of items to convert.
 * @param options.keyFn A function that returns the key for each item.
 * @param options.valueFn A function that returns the value for each
 * item. Defaults to the identity function.
 *
 * @returns An object with keys and values extracted from the list.
 */
export function makeObjectFromList<
  T,
  K extends string | number = string,
  V = T,
>({
  list,
  keyFn,
  valueFn = identity as (item: T) => V,
}: {
  list: readonly T[];
  keyFn: (item: T) => K;
  valueFn?: (item: T) => V;
}): Record<K, V> {
  const obj = {} as Record<K, V>;
  list.forEach((item) => {
    obj[keyFn(item)] = valueFn(item);
  });
  return obj;
}

/**
 * Creates an object of buckets from a list. The `keyFn` is used to extract
 * the bucket name. The `valueFn` is used to extract what value to place in
 * the bucket. Buckets hold arrays of values. Whenever there is a key collision,
 * the value gets appended to that bucket's array.
 *
 * @param config
 * @param config.list The list of items to convert to buckets.
 * @param config.keyFn A function that returns the key for each item.
 * @param config.valueFn A function that returns the value for each item.
 * @returns
 */
export function makeBucketsFromList<
  T,
  K extends string | number = string,
  V = T,
>({
  list,
  keyFn,
  valueFn = identity as (item: T) => V,
}: {
  list: readonly T[];
  keyFn: (item: T) => K;
  valueFn?: (item: T) => V;
}): Record<K, V[]> {
  const buckets = {} as Record<K, V[]>;
  list.forEach((item) => {
    const bucketName = keyFn(item);
    const value = valueFn(item);
    if (!(bucketName in buckets)) {
      buckets[bucketName] = [];
    }
    buckets[bucketName].push(value);
  });
  return buckets;
}

/**
 * Creates an object from a list of keys, given a function to generate the
 * value. The keys will be the same as the given list of keys. The values
 * will come from the `valueFn` or the `defaultValue`.
 *
 * @param options The options for creating the object.
 * @param options.keys The list of keys to convert.
 * @param options.valueFn A function that returns the value for each key.
 * @param options.defaultValue The value to give each key. This is only
 * used if `valueFn` is not provided.
 *
 * @returns An object with keys and values produced from the given options.
 */
export function makeObjectFromKeys<K extends string | number, V = unknown>(
  options:
    | {
        keys: readonly K[];
        valueFn: (key: K) => V;
      }
    | {
        keys: readonly K[];
        defaultValue: V;
      },
): Record<K, V> {
  const obj = {} as Record<K, V>;
  options.keys.forEach((key) => {
    if ("valueFn" in options) {
      obj[key] = options.valueFn(key);
    } else {
      obj[key] = options.defaultValue;
    }
  });
  return obj;
}

/**
 * Creates an object from a list of [key, value] tuples.
 * @param entries The list of [key, value] tuples to convert.
 * @returns An object with keys and values extracted from the entries.
 */
export function makeObjectFromEntries<K extends string | number, V>(
  entries: ReadonlyArray<[K, V]>,
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}
