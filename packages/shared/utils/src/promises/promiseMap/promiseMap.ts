/**
 * Maps over an array and applies a promise-returning function to each item.
 * The promises are awaited in parallel; no order can be guaranteed for when
 * each callback resolves, though the returned array preserves input order.
 *
 * @param array array of items to map over
 * @param fn function to apply to each item in the array
 * @returns promise that resolves when all the promises in the mapped array
 *   have resolved
 */
export async function promiseMap<T, V>(
  array: readonly T[],
  fn: (item: T) => Promise<V> | V,
): Promise<V[]> {
  return Promise.all(array.map(fn));
}
