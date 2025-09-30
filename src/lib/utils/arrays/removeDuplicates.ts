import { makeMap } from "../maps/builders";

export function removeDuplicates<T>(
  array: readonly T[],
  { hashFn }: { hashFn?: (item: T) => unknown },
): T[] {
  if (hashFn) {
    const hashedItems = makeMap(array, { keyFn: hashFn });
    return [...hashedItems.values()] as T[];
  }

  // if there's no hash function, we can just dump into a set and
  // return as an array
  return [...new Set(array)];
}
