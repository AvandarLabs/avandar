import { identity } from "@/lib/utils/misc";

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
