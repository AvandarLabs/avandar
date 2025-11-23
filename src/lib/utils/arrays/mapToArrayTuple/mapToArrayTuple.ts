/**
 * Maps an array to a tuple of two arrays. The map function returns a tuple
 * of [R1, R2] and the final return is two arrays of [R1[], R2[]].
 *
 * @param items The array to map.
 * @param callback A function that maps each element of the array to a tuple of
 * two values.
 * @returns A tuple of two arrays. An array of all the first values of the
 * return tuple and an array of all the second values.
 */
export function mapToArrayTuple<T, R1, R2>(
  items: readonly T[],
  callback: (x: T, idx: number) => readonly [R1, R2],
): [R1[], R2[]] {
  const tuples1 = [] as R1[];
  const tuples2 = [] as R2[];

  items.forEach((item, idx) => {
    const [r1, r2] = callback(item, idx);
    tuples1.push(r1);
    tuples2.push(r2);
  });

  return [tuples1, tuples2];
}
