import { identity } from "@utils/misc/identity.ts";

/**
 * Creates a record of buckets from a list. The `keyFn` extracts the bucket
 * name. The `valueFn` extracts the value to place in the bucket. Buckets hold
 * arrays of values. When keys collide, the value gets appended to the bucket's
 * array.
 *
 * @param list The list of items to convert to buckets.
 * @param options
 * @param options.key The key to use as the bucket key. If provided, then
 * `keyFn` is ignored.
 * @param options.keyFn A function that returns the key for each item. Defaults
 * to a `toString` cast function.
 * @param options.valueKey The key to use as the bucket value. If provided,
 * `valueFn` is ignored.
 * @param options.valueFn A function that returns the value for each item.
 * @returns A record of keys to arrays of values.
 */
export function makeBucketRecord<
  T,
  InK extends keyof T | undefined,
  ValueKey extends keyof T | undefined,
  OutK extends undefined extends InK ? PropertyKey
  : Extract<T[Extract<InK, PropertyKey>], PropertyKey> = undefined extends InK ?
    string
  : Extract<T[Extract<InK, PropertyKey>], PropertyKey>,
  OutV extends undefined extends ValueKey ? unknown
  : T[Extract<ValueKey, PropertyKey>] = undefined extends ValueKey ? T
  : T[Extract<ValueKey, PropertyKey>],
>(
  list: readonly T[],
  {
    key,
    valueKey,
    keyFn = ((item) => {
      return String(item);
    }) as (item: T) => OutK,
    valueFn = identity as (item: T) => OutV,
  }: {
    key?: InK;
    keyFn?: (item: T) => OutK;
    valueKey?: ValueKey;
    valueFn?: (item: T) => OutV;
  } = {},
): Record<OutK, OutV[]> {
  const buckets = {} as Record<OutK, OutV[]>;
  list.forEach((item) => {
    const bucketName = (key ? item[key] : keyFn(item)) as OutK;
    const value: OutV = (valueKey ? item[valueKey] : valueFn(item)) as OutV;
    const bucket: OutV[] = buckets[bucketName] ?? [];
    bucket.push(value);
    buckets[bucketName] = bucket;
  });
  return buckets;
}
