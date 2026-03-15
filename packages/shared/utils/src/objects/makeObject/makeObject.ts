import { constant } from "../../misc/constant/constant.ts";
import { identity } from "../../misc/identity.ts";
import type { ConditionalKeys } from "type-fest";

type ObjectKeyValue<
  T,
  InK extends ConditionalKeys<T, PropertyKey>,
> = Extract<T[Extract<InK, PropertyKey>], PropertyKey>;

type ObjectValue<
  T,
  ValueKey extends ConditionalKeys<T, PropertyKey>,
> = T[Extract<ValueKey, PropertyKey>];

type DefaultObjectKey<T> = [T] extends [PropertyKey] ? T : string;

/**
 * Creates an object from a list of items, given a function to extract the key
 * and a function to extract the value.
 *
 * @param list The list of items to convert.
 * @param options The options for creating the object.
 * @param options.key The object key from which we will extract the output key.
 * This takes precedence over `keyFn`.
 * @param options.keyFn A function that returns the key for each item. Defaults
 * to a `toString` cast function. If `key` is provided, then `keyFn` is ignored.
 * @param options.valueKey The object key from which we will extract the output
 * value. This takes precedence over `valueFn`.
 * @param options.valueFn A function that returns the value for each
 * item. If `valueKey` is provided then `valueFn` is ignored. If neither
 * `valueKey` nor `valueFn` is provided, then we default to using the identity
 * function.
 * @param options.defaultValue A default value to use for each item if neither
 * `valueKey` nor `valueFn` is provided.
 *
 * @returns An object with keys and values extracted from the list.
 */
export function makeObject<
  T,
  const InK extends ConditionalKeys<T, PropertyKey>,
  const ValueKey extends ConditionalKeys<T, PropertyKey>,
>(
  list: readonly T[],
  options: {
    key: InK;
    keyFn?: (item: T) => ObjectKeyValue<T, InK>;
    valueKey: ValueKey;
    valueFn?: (item: T) => ObjectValue<T, ValueKey>;
  },
): Record<ObjectKeyValue<T, InK>, ObjectValue<T, ValueKey>>;
export function makeObject<
  T,
  const InK extends ConditionalKeys<T, PropertyKey>,
  OutV = T,
>(
  list: readonly T[],
  options: {
    key: InK;
    keyFn?: (item: T) => ObjectKeyValue<T, InK>;
    valueKey?: undefined;
    valueFn?: (item: T) => OutV;
  },
): Record<ObjectKeyValue<T, InK>, OutV>;
export function makeObject<
  T,
  const InK extends ConditionalKeys<T, PropertyKey>,
  OutV,
>(
  list: readonly T[],
  options: {
    key: InK;
    keyFn?: (item: T) => ObjectKeyValue<T, InK>;
    defaultValue: OutV;
  },
): Record<ObjectKeyValue<T, InK>, OutV>;
export function makeObject<
  T,
  const OutK extends PropertyKey,
  const ValueKey extends ConditionalKeys<T, PropertyKey>,
>(
  list: readonly T[],
  options: {
    key?: undefined;
    keyFn: (item: T) => OutK;
    valueKey: ValueKey;
    valueFn?: (item: T) => ObjectValue<T, ValueKey>;
  },
): Record<OutK, ObjectValue<T, ValueKey>>;
export function makeObject<T, const OutK extends PropertyKey, OutV = T>(
  list: readonly T[],
  options: {
    key?: undefined;
    keyFn: (item: T) => OutK;
    valueKey?: undefined;
    valueFn?: (item: T) => OutV;
  },
): Record<OutK, OutV>;
export function makeObject<T, const OutK extends PropertyKey, OutV>(
  list: readonly T[],
  options: {
    key?: undefined;
    keyFn: (item: T) => OutK;
    defaultValue: OutV;
  },
): Record<OutK, OutV>;
export function makeObject<
  T,
  const ValueKey extends ConditionalKeys<T, PropertyKey>,
>(
  list: readonly T[],
  options: {
    key?: undefined;
    keyFn?: undefined;
    valueKey: ValueKey;
    valueFn?: (item: T) => ObjectValue<T, ValueKey>;
  },
): Record<DefaultObjectKey<T>, ObjectValue<T, ValueKey>>;
export function makeObject<T, OutV = T>(
  list: readonly T[],
  options: {
    key?: undefined;
    keyFn?: undefined;
    valueKey?: undefined;
    valueFn?: (item: T) => OutV;
  },
): Record<DefaultObjectKey<T>, OutV>;
export function makeObject<T, OutV>(
  list: readonly T[],
  options: {
    key?: undefined;
    keyFn?: undefined;
    defaultValue: OutV;
  },
): Record<DefaultObjectKey<T>, OutV>;
export function makeObject<
  T,
  InK extends ConditionalKeys<T, PropertyKey> | undefined,
  ValueKey extends ConditionalKeys<T, PropertyKey> | undefined,
  OutK extends undefined extends InK ? PropertyKey
  : Extract<T[Extract<InK, PropertyKey>], PropertyKey> = undefined extends InK ?
    DefaultObjectKey<T>
  : Extract<T[Extract<InK, PropertyKey>], PropertyKey>,
  OutV extends undefined extends ValueKey ? unknown
  : T[Extract<ValueKey, PropertyKey>] = undefined extends ValueKey ? T
  : T[Extract<ValueKey, PropertyKey>],
>(
  list: readonly T[],
  options:
    | {
        keyFn?: (item: T) => OutK;
        key?: InK;
        valueFn?: (item: T) => OutV;
        valueKey?: ValueKey;
      }
    | {
        keyFn?: (item: T) => OutK;
        key?: InK;
        valueKey?: undefined;
        defaultValue: OutV;
      } = {},
): Record<OutK, OutV> {
  const keyFn = (options.keyFn ??
    ((item) => {
      return String(item);
    })) as (item: T) => OutK;
  const valueFn =
    "valueFn" in options && options.valueFn ? options.valueFn
    : "defaultValue" in options ? constant(options.defaultValue)
    : (identity as (item: T) => OutV);

  const obj = {} as Record<OutK, OutV>;
  list.forEach((item) => {
    const key = (options.key ? item[options.key] : keyFn(item)) as OutK;
    const value = (
      "valueKey" in options && options.valueKey ?
        item[options.valueKey]
      : valueFn(item)) as OutV;
    if (key !== undefined && key !== null) {
      obj[key] = value;
    }
  });
  return obj;
}
