import { ConditionalKeys } from "type-fest";

/**
 * Returns a function that checks if a value is in a set.
 *
 * @param set The set to check against.
 * @param options The options for checking the set.
 * @param options.key The object key from which we will extract the hash
 * value. This takes precedence over `hashFn`.
 * @param options.hashFn A function that returns the hash value for each item.
 * @returns A function that returns true if the value is in the set.
 */
export function isInSet<
  ItemT,
  SetT,
  HashKey extends ConditionalKeys<ItemT, SetT> | undefined = undefined,
>(
  set: Set<SetT>,
  options: { key?: HashKey; hashFn?: (item: ItemT) => SetT } = {},
): (value: ItemT) => boolean {
  return (value: ItemT): boolean => {
    const hashedValue = options.key !== undefined
      ? (value[options.key] as SetT)
      : options.hashFn !== undefined
      ? options.hashFn(value)
      : (value as unknown as SetT);
    return set.has(hashedValue);
  };
}

/**
 * Returns a function that checks if a value is not in a set.
 *
 * @param set The set to check against.
 * @param options The options for checking the set.
 * @param options.key The object key from which we will extract the hash
 * value. This takes precedence over `hashFn`.
 * @param options.hashFn A function that returns the hash value for each item.
 * @returns A function that returns true if the value is not in the set.
 */
export function isNotInSet<
  ItemT,
  SetT,
  HashKey extends ConditionalKeys<ItemT, SetT> | undefined = undefined,
>(
  set: Set<SetT>,
  options: { key?: HashKey; hashFn?: (item: ItemT) => SetT } = {},
): (value: ItemT) => boolean {
  return (value: ItemT): boolean => {
    return !isInSet(set, options)(value);
  };
}
