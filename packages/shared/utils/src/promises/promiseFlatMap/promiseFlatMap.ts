import { promiseMap } from "@utils/promises/promiseMap/promiseMap.ts";

/**
 * Maps over an array and applies a promise-returning function to each item.
 * Each function returns an array of results; the final result is flattened
 * one level. The promises are awaited in parallel.
 *
 * @param array array of items to map over
 * @param fn function to apply to each item in the array
 * @returns promise that resolves to the flat-mapped result
 */
export async function promiseFlatMap<T, V>(
  array: readonly T[],
  fn: (item: T) => Promise<V[]> | V[],
): Promise<V[]> {
  return (await promiseMap(array, fn)).flat();
}
