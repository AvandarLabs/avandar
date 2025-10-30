import { splitArray } from "@/lib/utils/arrays/misc";

const REST_KEY = "...";

function _isKeyExcluded(
  key: string,
  options: {
    excludeKeySet: Set<string>;
    excludeKeysPattern: RegExp | string | undefined;
  },
): boolean {
  const { excludeKeySet, excludeKeysPattern } = options;
  const isInExcludeKeySet = excludeKeySet.has(key);
  const isExcludedByKeyPattern =
    excludeKeysPattern instanceof RegExp ? excludeKeysPattern.test(key)
    : excludeKeysPattern !== undefined ? key.startsWith(excludeKeysPattern)
    : false;
  return isInExcludeKeySet || isExcludedByKeyPattern;
}

/**
 * Returns a new array with the keys in the order specified by the `includeKeys`
 * and `excludeKeys` parameters.
 *
 * @param allKeys The keys to order.
 * @param includeKeys The keys to include in the order.
 * @param excludeKeys The keys to exclude from the order.
 * @param excludeKeysPattern The pattern to exclude keys from the order.
 */
export function getOrderedKeys<T extends string>({
  allKeys,
  includeKeys = [],
  excludeKeys = [],
  excludeKeysPattern,
}: {
  allKeys: readonly T[];
  includeKeys?: ReadonlyArray<T | typeof REST_KEY>;
  excludeKeys?: readonly T[];
  excludeKeysPattern?: RegExp | string;
}): T[] {
  const allKeysSet = new Set(allKeys);
  const excludeKeySet = new Set(excludeKeys);
  const [head = [], tail = []] = splitArray(
    includeKeys.length === 0 ? allKeys : includeKeys,
    REST_KEY,
    {
      splitOnce: true,
    },
  ) as T[][];

  const hasRestKey = includeKeys.includes(REST_KEY);
  const unorderedKeys = new Set(hasRestKey ? allKeys : (includeKeys as T[]));
  head.forEach((key) => {
    unorderedKeys.delete(key);
  });
  tail.forEach((key) => {
    unorderedKeys.delete(key);
  });

  const orderedKeys = [...head, ...unorderedKeys, ...tail];
  const finalKeys: T[] = [];
  const addedKeys = new Set<T>(); // used to avoid duplicate inclusions
  orderedKeys.forEach((key) => {
    // we check again that the key is in `allKeysSet` to ensure that we don't
    // include nonexistent keys that the user may have passed into `includeKeys`
    if (
      allKeysSet.has(key) &&
      !_isKeyExcluded(key, { excludeKeySet, excludeKeysPattern }) &&
      !addedKeys.has(key)
    ) {
      addedKeys.add(key);
      finalKeys.push(key);
    }
  });
  return finalKeys;
}
