/**
 * Returns the difference between two arrays. The equivalent of doing
 * `arrayA` minus `arrayB`.
 *
 * This also handles duplicates: duplicates from `arrayA` will be
 * removed as long as there is a single matching value in `arrayB`.
 *
 * @returns A new array containing the elements that are in `arrayA` but not in
 * `arrayB`.
 */
export function difference<T>(arrayA: readonly T[], arrayB: readonly T[]): T[] {
  const secondArrayAsSet = new Set(arrayB);
  return arrayA.filter((x) => {
    return !secondArrayAsSet.has(x);
  });
}
