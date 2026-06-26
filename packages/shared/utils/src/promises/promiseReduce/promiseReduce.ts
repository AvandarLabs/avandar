/**
 * Reduces an array by applying a promise-returning function to each item
 * sequentially. Each callback is awaited before the next is called, so
 * input order is preserved.
 *
 * @param array array of items to reduce over
 * @param fn function to apply to each item; receives the running
 *   accumulator, the current item, and its index
 * @param initialValue starting accumulator value
 * @returns promise that resolves to the final accumulator value
 */
export async function promiseReduce<T, V>(
  array: readonly T[],
  fn: (acc: V, item: T, idx: number) => Promise<V> | V,
  initialValue: V,
): Promise<V> {
  let acc = initialValue;
  for (let idx = 0; idx < array.length; idx++) {
    const item = array[idx]!;
    acc = await fn(acc, item, idx);
  }
  return acc;
}
