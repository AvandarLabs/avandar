/**
 * Maps over an array and applies a promise-returning function
 * to each one. The promises are awaited in parallel, no order
 * can be guaranteed.
 *
 * @param array array of items to map over
 * @param fn function to apply to each item in the array
 * @returns promise that resolves when all the promises in
 * the mapped array have resolved
 */
export async function promiseMap<T, V>(
  array: readonly T[],
  fn: (item: T) => Promise<V> | V,
): Promise<V[]> {
  return Promise.all(array.map(fn));
}

/**
 * Maps over an array and applies a promise-returning function
 * to each one sequentially. Each function is awaited before
 * the next is called. Order is guaranteed.
 *
 * @param array array of items to map over
 * @param fn function to apply to each item in the array
 * @returns promise that resolves to an array of results, in order
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
