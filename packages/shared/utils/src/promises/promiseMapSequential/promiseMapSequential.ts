/**
 * Maps over an array and applies a promise-returning function to each item
 * sequentially. Each callback is awaited before the next is called, so
 * input order is preserved both for execution and for the result array.
 *
 * @param array array of items to map over
 * @param fn function to apply to each item in the array
 * @returns promise that resolves to an array of results, in input order
 */
export async function promiseMapSequential<T, V>(
  array: readonly T[],
  fn: (item: T) => Promise<V> | V,
): Promise<V[]> {
  const results: V[] = [];
  for (const item of array) {
    results.push(await fn(item));
  }
  return results;
}
