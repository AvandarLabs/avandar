import { makeObject } from "../makeObject/makeObject.ts";
import type { ConditionalKeys } from "type-fest";

/**
 * Creates a lookup from a list of objects, indexed by an object's id field.
 * The id field is assumed to be "id" unless otherwise specified.
 *
 * As opposed to `makeIdLookupMap`, the key must be a top-level key of the
 * object. We do not allow dot-notation paths. This is because the
 * type-inference of the `ConditionalKeys` type does not support paths.
 * And we need to use `ConditionalKeys` to ensure that only keys mapping
 * to valid object PropertyKeys are allowed.
 *
 * @param list The list of objects to convert.
 * @param options
 * @param options.key The key to use as the id field. Defaults to "id".
 * @returns A record of objects indexed by their id field.
 */
export function makeIdLookupRecord<
  T extends {
    id: PropertyKey;
  },
>(list: readonly T[], options?: { key?: "id" }): Record<T["id"], T>;
export function makeIdLookupRecord<
  T extends object,
  const IdKey extends ConditionalKeys<T, PropertyKey>,
>(
  list: readonly T[],
  options: {
    key: IdKey;
  },
): Record<Extract<T[IdKey], PropertyKey>, T>;
export function makeIdLookupRecord<
  T extends object,
  IdKey extends ConditionalKeys<T, PropertyKey> = "id" extends (
    ConditionalKeys<T, PropertyKey>
  ) ?
    "id"
  : never,
  OutKey extends T[IdKey] extends PropertyKey ? T[IdKey] : never =
    T[IdKey] extends PropertyKey ? T[IdKey] : never,
>(
  list: readonly T[],
  { key = "id" as IdKey }: { key?: IdKey } = {},
): Record<OutKey, T> {
  return makeObject(list, { key }) as Record<OutKey, T>;
}
