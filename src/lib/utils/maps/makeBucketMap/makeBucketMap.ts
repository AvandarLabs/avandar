import { identity } from "@/lib/utils/misc";

/**
 * Creates a map of buckets from a list. The `keyFn` extracts the bucket
 * key. The `valueFn` extracts the value to place in the bucket. Buckets hold
 * arrays of values. When keys collide, the value gets appended to the bucket's
 * array.
 *
 * @param list The list of items to convert to buckets.
 * @param options The options for creating the bucket map.
 * @param options.key The key to use as the bucket key. If provided, then
 * `keyFn` is ignored.
 * @param options.keyFn A function that returns the key for each item.
 * @param options.valueFn A function that returns the value for each item.
 * @param options.valueKey The value to use as the bucket value. If provided,
 * `valueFn` is ignored.
 * @returns A map of keys to arrays of values.
 */
export function makeBucketMap<
  T,
  InK extends keyof T | undefined,
  ValueKey extends keyof T | undefined,
  OutK extends undefined extends InK ? unknown
    : T[Extract<InK, PropertyKey>] = undefined extends InK ? T
      : T[Extract<InK, PropertyKey>],
  OutV extends undefined extends ValueKey ? unknown
    : T[Extract<ValueKey, PropertyKey>] = undefined extends ValueKey ? T
      : T[Extract<ValueKey, PropertyKey>],
>(
  list: readonly T[],
  {
    key,
    valueKey,
    keyFn = identity as (item: T) => OutK,
    valueFn = identity as (item: T, key: OutK) => OutV,
  }: {
    key?: InK;
    keyFn?: (item: T) => OutK;
    valueFn?: (item: T, key: OutK) => OutV;
    valueKey?: ValueKey;
  } = {},
): Map<OutK, OutV[]> {
  const buckets = new Map<OutK, OutV[]>();
  list.forEach((item) => {
    const bucketName = (key ? item[key] : keyFn(item)) as OutK;
    const value: OutV = (
      valueKey ? item[valueKey] : valueFn(item, bucketName)
    ) as OutV;
    const bucket: OutV[] = buckets.get(bucketName) ?? [];
    bucket.push(value);
    buckets.set(bucketName, bucket);
  });
  return buckets;
}
