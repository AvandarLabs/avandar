import { constant } from "../higherOrderFuncs";
import { identity } from "../misc";

function toString<T extends string>(item: T): T;
function toString<T extends Exclude<unknown, string>>(item: T): string;
function toString<T>(item: T): string | T {
  return String(item);
}

/**
 * Creates an object from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param list The list of items to convert.
 * @param options The options for creating the object.
 * @param options.keyFn A function that returns the key for each item. Defaults
 * to the `toString` function. If the item is a string, it will be unchanged.
 * @param options.valueFn A function that returns the value for each
 * item. Defaults to the identity function.
 * @param options.defaultValue A default value to use for each item if no
 * valueFn is provided. If a `valueFn` is provided, it takes precedence over
 * the `defaultValue`.
 *
 * @returns An object with keys and values extracted from the list.
 */
export function makeObjectFromList<
  T,
  K extends string | number = string,
  V = T,
>(
  list: readonly T[],
  options:
    | {
        keyFn?: (item: T) => K;
        valueFn?: (item: T) => V;
      }
    | {
        keyFn?: (item: T) => K;
        defaultValue: V;
      } = {},
): Record<K, V> {
  const keyFn = (options.keyFn ?? toString) as (item: T) => K;
  const valueFn =
    "valueFn" in options && options.valueFn ? options.valueFn
    : "defaultValue" in options ? constant(options.defaultValue)
    : (identity as (item: T) => V);

  const obj = {} as Record<K, V>;
  list.forEach((item) => {
    obj[keyFn(item)] = valueFn(item);
  });
  return obj;
}

/**
 * Creates a record of buckets from a list. The `keyFn` extracts the bucket
 * name. The `valueFn` extracts the value to place in the bucket. Buckets hold
 * arrays of values. When keys collide, the value gets appended to the bucket's
 * array.
 *
 * @param list The list of items to convert to buckets.
 * @param config
 * @param config.keyFn A function that returns the key for each item.
 * @param config.valueFn A function that returns the value for each item.
 * @returns A record of keys to arrays of values.
 */
export function makeBucketRecordFromList<T, K extends string, V = T>(
  list: readonly T[],
  {
    keyFn,
    valueFn = identity as (item: T) => V,
  }: { keyFn: (item: T) => K; valueFn?: (item: T) => V },
): Record<K, V[]> {
  const buckets = {} as Record<K, V[]>;
  list.forEach((item) => {
    const bucketName = keyFn(item);
    const value: V = valueFn(item);
    const bucket: V[] = buckets[bucketName] ?? [];
    bucket.push(value);
    buckets[bucketName] = bucket;
  });
  return buckets;
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
