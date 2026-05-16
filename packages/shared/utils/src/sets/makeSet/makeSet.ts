/**
 * Creates a set from a list of items, given a function to extract the hash
 * value.
 *
 * @param list The list of items to convert.
 * @param options The options for creating the set.
 * @param options.hashKey The object key from which we will extract the hash
 * value. This takes precedence over `hashFn`.
 * @param options.hashFn A function that returns the hash value for each item.
 * @returns A set of hash values extracted from the list.
 */
export function makeSet<
  T,
  HashKey extends keyof T | undefined,
  HashV extends undefined extends HashKey ? unknown
  : T[Extract<HashKey, PropertyKey>] = undefined extends HashKey ? T
  : T[Extract<HashKey, PropertyKey>],
>(
  list: readonly T[],
  options: { key?: HashKey; hashFn?: (item: T) => HashV } = {},
): Set<HashV> {
  const { hashFn, key } = options;
  if (hashFn === undefined && key === undefined) {
    return new Set(list as unknown as HashV[]);
  }
  const outputSet = new Set<HashV>();
  for (const item of list) {
    const hashValue =
      key ? (item[key] as HashV)
      : hashFn ? hashFn(item)
      : (item as unknown as HashV);
    outputSet.add(hashValue);
  }
  return outputSet;
}
