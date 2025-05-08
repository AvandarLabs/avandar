import { identity } from "../misc";

/**
 * Creates an object from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param list The list of items to convert.
 * @param options The options for creating the object.
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
>(
  list: readonly T[],
  {
    keyFn,
    valueFn = identity as (item: T) => V,
  }: {
    keyFn: (item: T) => K;
    valueFn?: (item: T) => V;
  },
): Record<K, V> {
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
 * @param list The list of items to convert to buckets.
 * @param config
 * @param config.keyFn A function that returns the key for each item.
 * @param config.valueFn A function that returns the value for each item.
 * @param config.collectNullableKeys Whether to collect null and undefined
 * keys. If true, the return type will be a Map in order to allow `null`
 * and `undefined` keys.
 * @returns A record or map of buckets, where the keys are the bucket names
 * and the values are arrays of values that were placed in each bucket.
 */
export function makeBucketsFromList<
  T,
  K extends string | number = string,
  V = T,
  CollectNullableKeys extends boolean = never,
  BucketMapReturnType = [true] extends [CollectNullableKeys] ?
    Map<K | null | undefined, V[]>
  : Record<K, V[]>,
>(
  list: readonly T[],
  {
    keyFn,
    valueFn = identity as (item: T) => V,
    collectNullableKeys,
  }: {
    keyFn: [true] extends [CollectNullableKeys] ?
      (item: T) => K | null | undefined
    : (item: T) => K;
    valueFn?: (item: T) => V;
    collectNullableKeys?: CollectNullableKeys;
  },
): BucketMapReturnType {
  const buckets = {} as Record<K, V[]>;
  const nulls = [] as V[];
  const undefineds = [] as V[];

  list.forEach((item) => {
    const bucketName = keyFn(item);
    const value = valueFn(item);

    if (bucketName === null) {
      nulls.push(value);
    } else if (bucketName === undefined) {
      undefineds.push(value);
    } else {
      if (!(bucketName in buckets)) {
        buckets[bucketName] = [];
      }
      buckets[bucketName].push(value);
    }
  });

  if (!collectNullableKeys) {
    return buckets as BucketMapReturnType;
  }

  // if we need to report the `null` and `undefined` keys, then we need to
  // convert the buckets record to a Map
  const bucketMap = new Map<K | null | undefined, V[]>(
    Object.entries(buckets) as Array<[K | null | undefined, V[]]>,
  );

  if (nulls.length > 0) {
    bucketMap.set(null, nulls);
  }

  if (undefineds.length > 0) {
    bucketMap.set(undefined, undefineds);
  }

  return bucketMap as BucketMapReturnType;
}

/**
 * Creates an object from a list of keys, given a function to generate the
 * value. The keys will be the same as the given list of keys. The values
 * will come from the `valueFn` or the `defaultValue`.
 *
 * @param keys The list of keys to convert.
 * @param options The options for creating the object.
 * @param options.valueFn A function that returns the value for each key.
 * @param options.defaultValue The value to give each key. This is only
 * used if `valueFn` is not provided.
 *
 * @returns An object with keys and values produced from the given options.
 */
export function makeObjectFromKeys<K extends string | number, V = unknown>(
  keys: readonly K[],
  options:
    | {
        valueFn: (key: K) => V;
      }
    | {
        defaultValue: V;
      },
): Record<K, V> {
  const obj = {} as Record<K, V>;
  keys.forEach((key) => {
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
