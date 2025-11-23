import { Paths } from "type-fest";

import { getValue, PathValue } from "@/lib/utils/objects/getValue";

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
