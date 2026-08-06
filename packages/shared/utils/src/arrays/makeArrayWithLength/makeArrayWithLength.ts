/**
 * Returns a new array of the given `length` whose values are the indices
 * `0, 1, …, length - 1`. Use it instead of the `Array.from({ length })` idiom
 * when building a fixed-length array to iterate or map over.
 *
 * A `length` of `0`, a negative number, or any value that coerces to a length
 * of `0` returns an empty array. A non-integer `length` is floored (matching
 * `Array.from`'s behavior).
 *
 * @param length The length of the array to create.
 * @returns A new array `[0, 1, …, length - 1]`.
 */
export function makeArrayWithLength(length: number): number[] {
  return Array.from({ length }, (_, index) => {
    return index;
  });
}
