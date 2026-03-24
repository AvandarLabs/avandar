/**
 * Creates an object from a list of [key, value] tuples.
 *
 * This function has better type inference than `Object.fromEntries` because it
 * correctly creates a record with `K` as the key type, rather than always
 * enforcing `string`.
 *
 * @param entries The list of [key, value] tuples to convert.
 * @returns An object with keys and values extracted from the entries.
 */
export function makeObjectFromEntries<K extends string | number, V>(
  entries: ReadonlyArray<[K, V]>,
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}
