import { Paths } from "type-fest";
import { identity } from "../misc";
import { getValue, PathValue } from "../objects/getValue";

/**
 * Creates a map from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param list The list of items to convert.
 * @param options The options for creating the map.
 * @param options.key The key to use as the map key. If provided, then
 * `keyFn` is ignored.
 * @param options.keyFn A function that returns the key for each item.
 * @param options.valueKey The value to use as the map value. If provided,
 * `valueFn` is ignored.
 * @param options.valueFn A function that returns the value for each
 * item. Defaults to the identity function.
 *
 * @returns A map with keys and values extracted from the list.
 */
export function makeMap<
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
    valueFn = identity as (item: T) => OutV,
  }: {
    key?: InK;
    valueKey?: ValueKey;
    keyFn?: (item: T) => OutK;
    valueFn?: (item: T) => OutV;
  },
): Map<OutK, OutV> {
  const map = new Map<OutK, OutV>();
  list.forEach((item) => {
    map.set(
      (key ? item[key] : keyFn(item)) as OutK,
      (valueKey ? item[valueKey] : valueFn(item)) as OutV,
    );
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
    valueFn = identity as (item: T) => OutV,
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

/**
 * Creates a lookup from a list of objects, indexed by an object's id field.
 * The id field is assumed to be "id" unless otherwise specified.
 *
 * The id field can be specified as a dot-notation path.
 *
 * @param list The list of objects to convert.
 * @param options
 * @param options.key The key path to use as the id field. Defaults to "id".
 * @returns A record of objects indexed by their id field.
 */
export function makeIdLookupMap<
  T extends object,
  IdKey extends [Paths<T>] extends [never] ? keyof T : Paths<T> = "id" extends (
    [Paths<T>] extends [never] ? keyof T
      : Paths<T>
  ) ? "id"
    : never,
  IdType extends IdKey extends keyof T ? T[IdKey]
    : IdKey extends Paths<T> ? PathValue<T, IdKey>
    : never = IdKey extends keyof T ? T[IdKey]
      : IdKey extends Paths<T> ? PathValue<T, IdKey>
      : never,
>(
  list: readonly T[],
  { key = "id" as IdKey }: { key?: IdKey } = {},
): Map<IdType, T> {
  const map = new Map<IdType, T>();
  for (const item of list) {
    const id = String(key).includes(".")
      ? (getValue(item, key) as IdType)
      : (item[key as keyof T] as IdType);
    map.set(id, item);
  }
  return map;
}
