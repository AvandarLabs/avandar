/**
 * Reads a record's own property, or undefined when the record has no such
 * key. A plain `record[key]` also finds inherited members such as
 * `constructor` or `toString`, which manifests allow as data slot ids and
 * attribute keys. Use it for every read of a record keyed by one of those.
 */
export function getOwnValue<Value>(
  record: Readonly<Record<string, Value>>,
  key: string,
): Value | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}
